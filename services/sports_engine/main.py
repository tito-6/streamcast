import os
import re
import json
import redis
import httpx
import random
from bs4 import BeautifulSoup, NavigableString, Tag
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, Dict, Any, List
from dotenv import load_dotenv
from datetime import datetime, timedelta, timezone
import asyncio

from livescore_com_api import fetch_livescore_com_scores

# Load Env
load_dotenv(".env.local")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Redis Setup
class MockRedis:
    def __init__(self): self.data = {}
    def get(self, key): return self.data.get(key)
    def set(self, key, value, ex=None): self.data[key] = value; return True
    def flushdb(self):
        self.data.clear()
        return True

try:
    redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
    redis_client.ping()
except:
    redis_client = MockRedis()

# --- Config ---
# Using Flashscore Mobi for all as it is more reliable for scraping without heavy blocking for now
FLASHSCORE_MOBI = "https://www.flashscore.mobi"
HEADERS_MOBI = {
    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1",
    # Prefer English labels on Mobi (standings + scrape); UI translates chrome client-side.
    "Accept-Language": "en-GB,en-US;q=0.9,en;q=0.9",
}

# Livescore.in uses the same Flashscore Ninja feed API (project 58 on livescore.in pages).
NINJA_HOST = os.getenv("FLASHSCORE_NINJA_HOST", "https://50.flashscore.ninja").rstrip("/")
NINJA_PROJECT_ID = os.getenv("FLASHSCORE_PROJECT_ID", "58")
NINJA_FEED_GEO = os.getenv("FLASHSCORE_FEED_GEO", "en-int")
NINJA_FSIGN = os.getenv("FLASHSCORE_FSIGN", "SW9D1eZo")
# Ninja text locale: international English. Turkish/geo slugs in ZL may still look like /tr/... but titles are EN.
NINJA_REFERER = os.getenv("FLASHSCORE_NINJA_REFERER", "https://www.livescore.in/").strip() or "https://www.livescore.in/"

# Sport id in feed path f_{id}_{dayOffset}_3_{geo}_1 (same numbering as Flashscore ecosystem).
NINJA_SPORT_IDS: Dict[str, int] = {
    "football": 1,
    "tennis": 2,
    "basketball": 3,
    "hockey": 4,
    "american-football": 5,
    "baseball": 6,
    "handball": 7,
    "volleyball": 12,
    "cricket": 13,
    "mma": 28,
}

# Flashscore.mobi uses a URL path per sport; ?s= is a *view* (1=all, 2=live, 3=finished), not sport id.
MOBI_SPORT_PATHS: Dict[str, str] = {
    "football": "",
    "tennis": "/tennis",
    "basketball": "/basketball",
    "hockey": "/hockey",
    "american-football": "/american-football",
    "baseball": "/baseball",
    "handball": "/handball",
    "volleyball": "/volleyball",
    "cricket": "/cricket",
    "mma": "/mma",
}

# Esports has no dedicated mobi section (404); return empty until a separate source exists.
MOBI_UNSUPPORTED_SPORTS = frozenset({"esports"})

SPORTS_ENGINE_CONFIG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sports_engine_config.json")

DEFAULT_SPORTS_ENGINE_CONFIG: Dict[str, Any] = {
    "mode": "live",
    "maintenance": False,
    "scores_provider": "flashscore",
    "livescore_com_country_code": "GB",
    "livescore_com_page_url": "https://www.livescore.com/en/football/live/",
}

def load_sports_engine_config() -> Dict[str, Any]:
    cfg = dict(DEFAULT_SPORTS_ENGINE_CONFIG)
    try:
        if os.path.exists(SPORTS_ENGINE_CONFIG_FILE):
            with open(SPORTS_ENGINE_CONFIG_FILE, "r", encoding="utf-8") as f:
                stored = json.load(f)
            if isinstance(stored, dict):
                cfg.update(stored)
    except Exception as e:
        print(f"sports_engine_config load error: {e}")
    return cfg


def save_sports_engine_config(partial: Dict[str, Any]) -> Dict[str, Any]:
    cur = load_sports_engine_config()
    cur.update(partial)
    with open(SPORTS_ENGINE_CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(cur, f, indent=2)
    return cur


# --- Data Fetchers ---

def build_flashscore_url(sport_key: str, day_offset: int) -> Optional[str]:
    if sport_key in MOBI_UNSUPPORTED_SPORTS:
        return None
    path = MOBI_SPORT_PATHS.get(sport_key)
    if path is None:
        return None
    base = FLASHSCORE_MOBI.rstrip("/")
    if path == "":
        return f"{base}/?d={day_offset}&s=1"
    return f"{base}{path}/?d={day_offset}&s=1"


async def fetch_flashscore_scrape(sport: str, day_offset: int):
    """Scrape one sport from Flashscore Mobi (path-based URLs, s=1 = all games)."""
    sport_key = sport.lower()
    url = build_flashscore_url(sport_key, day_offset)
    if not url:
        return []
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(url, headers=HEADERS_MOBI, timeout=12.0, follow_redirects=True)
            if resp.status_code == 200:
                return parse_flashscore_html(resp.text)
        except Exception as e:
            print(f"Flashscore Error: {e}")
    return []

def generate_odds():
    """Generate synthetic odds for demonstration"""
    # 1 / X / 2
    o1 = round(random.uniform(1.1, 4.0), 2)
    ox = round(random.uniform(2.5, 4.5), 2)
    o2 = round(random.uniform(1.1, 4.0), 2)
    return {"1": o1, "X": ox, "2": o2}


def parse_score_pair(score: str) -> tuple:
    """Parse Flashscore score text (e.g. 1:0, 54:41, 77:84ot, -:-) into two ints."""
    s = (score or "").strip()
    if not s or s in ("-", "-:-", ":-"):
        return 0, 0
    m = re.match(r"^(\d+)\s*:\s*(\d+)", s)
    if m:
        return int(m.group(1)), int(m.group(2))
    if "-" in s and ":" not in s.split("-", 1)[0]:
        sp = re.split(r"\s*-\s*", s, maxsplit=1)
        if len(sp) == 2:
            try:
                return int(sp[0].strip()), int(sp[1].strip())
            except ValueError:
                pass
    return 0, 0


def parse_flashscore_html(html: str):
    soup = BeautifulSoup(html, "html.parser")
    main_div = soup.find("div", id="score-data")
    if not main_div:
        return []

    groups = []
    current_group = None

    for el in main_div.children:
        if not isinstance(el, Tag):
            continue

        if el.name == "h4":
            raw_txt = el.get_text(strip=True)
            txt = raw_txt.replace("Standings", "").replace("Draw", "").strip()

            parts = txt.split(":", 1)
            country = parts[0].strip() if len(parts) > 1 else "World"
            league = parts[1].strip() if len(parts) > 1 else txt

            if "israel" in country.lower():
                current_group = None
                continue

            current_group = {
                "id": str(hash(txt)),
                "group_title": txt,
                "country": country,
                "league": league,
                "logo": "",
                "country_flag_code": "",
                "items": [],
            }
            groups.append(current_group)

        elif el.name == "span" and current_group is not None:
            try:
                time_status = el.get_text(strip=True)

                teams_chunks: List[str] = []
                score_node = None
                node = el.next_sibling

                while node is not None:
                    if isinstance(node, Tag):
                        if node.name == "a" and "/match/" in (node.get("href") or ""):
                            score_node = node
                            break
                        if node.name == "br":
                            break
                    elif isinstance(node, NavigableString):
                        chunk = str(node)
                        if chunk.strip():
                            teams_chunks.append(chunk)
                    node = node.next_sibling

                if not score_node:
                    continue

                teams_str = "".join(teams_chunks).strip()
                teams_str = " ".join(teams_str.split())
                if not teams_str or " - " not in teams_str:
                    continue

                hparts = teams_str.split(" - ", 1)
                home, away = hparts[0].strip(), hparts[1].strip()

                score = score_node.get_text(strip=True)
                cl = score_node.get("class", []) or []
                cl_set = set(cl) if isinstance(cl, list) else {str(cl)}

                status = "UPCOMING"
                if "live" in cl_set:
                    status = "LIVE"
                elif "fin" in cl_set:
                    status = "FINISHED"
                elif "sched" in cl_set:
                    status = "UPCOMING"

                score_home, score_away = parse_score_pair(score)

                href = score_node.get("href", "")
                mid = re.search(r"/match/([^/?#]+)", href or "")
                match_id = mid.group(1) if mid else ""

                odds = generate_odds()

                current_group["items"].append(
                    {
                        "id": match_id or str(hash(teams_str + time_status)),
                        "time": time_status,
                        "status": status,
                        "home": home,
                        "away": away,
                        "score": score,
                        "home_logo": "",
                        "away_logo": "",
                        "score_home": score_home,
                        "score_away": score_away,
                        "odds": odds,
                    }
                )
            except Exception as ex:
                print(f"parse_flashscore row skip: {ex}")
                continue

    return groups


def _ninja_feed_geo_effective() -> str:
    """Use en-int for feed text unless GEO is explicitly set and not Turkish."""
    g = (NINJA_FEED_GEO or "en-int").strip().lower()
    if g.startswith("tr"):
        return "en-int"
    return (NINJA_FEED_GEO or "en-int").strip() or "en-int"


def _format_unix_hhmm(ts: str) -> str:
    try:
        sec = int(str(ts).strip())
        dt = datetime.fromtimestamp(sec, tz=timezone.utc)
        return dt.strftime("%H:%M")
    except (TypeError, ValueError, OSError):
        return ""


# Team / league images on Flashscore CDN (filename from feed OA, OB, OAJ, …)
FLASHSCORE_IMG_DATA = "https://static.flashscore.com/res/image/data"


def _fs_data_image_url(filename: str) -> str:
    fn = (filename or "").strip()
    if not fn or not fn.endswith(".png"):
        return ""
    return f"{FLASHSCORE_IMG_DATA}/{fn}"


# Livescore.in / Flashscore use Turkish URL slugs in ZL (e.g. /tr/futbol/almanya/bundesliga/).
# Index 2 is usually the country/region slug. Tennis uses tour slugs → no ISO flag.
_ZL_NON_COUNTRY_SLUGS = frozenset(
    {
        "atp-tek",
        "wta-tek",
        "atp-cift",
        "wta-cift",
        "itf-erkek",
        "itf-kadin",
        "challenger-tek",
        "challenger-cift",
        "utr-women",
        "utr-men",
        "dunya",
        "avrupa",
        "asya",
        "afrika",
        "guney-amerika",
        "kuzey-orta-amerika",
        "avustralya-okyanusya",
        "olimpiyat-oyunlar",
    }
)

ZL_SLUG_TO_ISO2: Dict[str, str] = {
    "abd": "US",
    "almanya": "DE",
    "ispanya": "ES",
    "italya": "IT",
    "ingiltere": "GB",
    "turkiye": "TR",
    "fransa": "FR",
    "hollanda": "NL",
    "portekiz": "PT",
    "belcika": "BE",
    "avusturya": "AT",
    "isvec": "SE",
    "norvec": "NO",
    "danimarka": "DK",
    "finlandiya": "FI",
    "isvicre": "CH",
    "polonya": "PL",
    "cek-cumhuriyeti": "CZ",
    "slovakya": "SK",
    "macaristan": "HU",
    "romanya": "RO",
    "bulgaristan": "BG",
    "h-rvatistan": "HR",
    "hirvatistan": "HR",
    "slovenya": "SI",
    "s-rbistan": "RS",
    "sirbistan": "RS",
    "bosna-hersek": "BA",
    "ukrayna": "UA",
    "rusya": "RU",
    "yunananistan": "GR",
    "irlanda": "IE",
    "iskocya": "GB",
    "galler": "GB",
    "kuzey-irlanda": "GB",
    "brezilya": "BR",
    "arjantin": "AR",
    "uruguay": "UY",
    "kolombiya": "CO",
    "sili": "CL",
    "ekvador": "EC",
    "venezuela": "VE",
    "paraguay": "PY",
    "peru": "PE",
    "meksika": "MX",
    "kanada": "CA",
    "japonya": "JP",
    "guney-kore": "KR",
    "cin": "CN",
    "hong-kong": "HK",
    "tayvan": "TW",
    "avustralya": "AU",
    "yeni-zelanda": "NZ",
    "endonesya": "ID",
    "tayland": "TH",
    "vietnam": "VN",
    "malezya": "MY",
    "singapur": "SG",
    "filipinler": "PH",
    "hindistan": "IN",
    "iran": "IR",
    "irak": "IQ",
    "israil": "IL",
    "filistin": "PS",
    "suudi-arabistan": "SA",
    "bae": "AE",
    "katar": "QA",
    "kuveyt": "KW",
    "bahrain": "BH",
    "bahreyn": "BH",
    "umman": "OM",
    "urdun": "JO",
    "lubnan": "LB",
    "m-s-r": "EG",
    "fas": "MA",
    "cezayir": "DZ",
    "tunus": "TN",
    "nijerya": "NG",
    "guney-afrika": "ZA",
    "senegal": "SN",
    "kenya": "KE",
    "kamerun": "CM",
    "gana": "GH",
    "angola": "AO",
    "ruanda": "RW",
    "uganda": "UG",
    "ozbekistan": "UZ",
    "kazakistan": "KZ",
    "estonya": "EE",
    "letonya": "LV",
    "litvanya": "LT",
    "belarus": "BY",
    "beyaz-rusya": "BY",
    "arnavutluk": "AL",
    "kosova": "XK",
    "karadag": "ME",
    "moldova": "MD",
    "faroe-adalar": "FO",
    "izlanda": "IS",
    "malta": "MT",
    "kibris": "CY",
    "guney-k-br-s": "CY",
    "andorra": "AD",
    "lihtenstayn": "LI",
    "luksemburg": "LU",
    "san-marino": "SM",
    "vatican": "VA",
    "azerbaycan": "AZ",
    "ermenistan": "AM",
    "gurcistan": "GE",
}

_ZY_TO_ISO2: Dict[str, str] = {
    "ABD": "US",
    "TUR": "TR",
    "ING": "GB",
    "BUY": "DE",
    "ALM": "DE",
    "ISP": "ES",
    "ITA": "IT",
    "FRA": "FR",
    "HOL": "NL",
    "POR": "PT",
    "BEL": "BE",
    "CEK": "CZ",
    "POL": "PL",
    "RUS": "RU",
    "UKR": "UA",
    "BRE": "BR",
    "ARG": "AR",
    "JAP": "JP",
    "CHN": "CN",
    "KOR": "KR",
    "AUS": "AU",
    "KAN": "CA",
    "MEX": "MX",
}


def _country_flag_iso_from_zl(zl: str) -> str:
    if not zl:
        return ""
    parts = [p for p in zl.strip("/").split("/") if p]
    if len(parts) < 3:
        return ""
    slug = parts[2].lower()
    if slug in _ZL_NON_COUNTRY_SLUGS:
        return ""
    return ZL_SLUG_TO_ISO2.get(slug, "")


def _country_flag_iso_from_zy(zy: str) -> str:
    z = (zy or "").strip().upper()
    return _ZY_TO_ISO2.get(z, "")


def parse_livescore_ninja_feed(text: str) -> List[Dict[str, Any]]:
    """
    Parse Flashscore Ninja x/feed body (UTF-8, items split by ¬, key÷value).
    League rows: ~ZA÷COUNTRY: League name. Match rows: ~AA÷matchId then flat key÷value fields.
    """
    if not text or len(text) < 50:
        return []

    sep = "\u00ac"
    div = "\u00f7"
    groups: List[Dict[str, Any]] = []
    current_group: Optional[Dict[str, Any]] = None

    chunks = text.split(sep)
    i = 0
    while i < len(chunks):
        item = chunks[i]
        i += 1
        if div not in item:
            continue
        key, _, val = item.partition(div)
        val = val.strip()

        if key == "~ZA":
            title = val
            if "israel" in title.lower():
                current_group = None
                while i < len(chunks):
                    it_skip = chunks[i]
                    if div not in it_skip:
                        i += 1
                        continue
                    ks = it_skip.partition(div)[0]
                    if ks.startswith("~"):
                        break
                    i += 1
                continue

            parts = title.split(":", 1)
            country = parts[0].strip() if len(parts) > 1 else "World"
            league = parts[1].strip() if len(parts) > 1 else title

            league_logo_url = ""
            zl_path = ""
            zy_code = ""
            zee_id = ""
            ze_id = ""
            zc_id = ""
            while i < len(chunks):
                it_meta = chunks[i]
                if div not in it_meta:
                    i += 1
                    continue
                mk, _, mv = it_meta.partition(div)
                if mk.startswith("~"):
                    break
                i += 1
                if mk == "OAJ":
                    league_logo_url = _fs_data_image_url(mv)
                elif mk == "ZL":
                    zl_path = mv.strip()
                elif mk == "ZY":
                    zy_code = mv.strip()
                elif mk == "ZEE":
                    zee_id = mv.strip()
                elif mk == "ZE":
                    ze_id = mv.strip()
                elif mk == "ZC":
                    zc_id = mv.strip()

            flag_iso = _country_flag_iso_from_zl(zl_path) or _country_flag_iso_from_zy(zy_code)

            current_group = {
                "id": str(hash(title)),
                "group_title": title,
                "country": country,
                "league": league,
                "logo": league_logo_url,
                "country_flag_code": flag_iso,
                "tournament_id": zee_id,
                "ze": ze_id,
                "zc": zc_id,
                "items": [],
            }
            groups.append(current_group)
            continue

        if key == "~AA":
            if current_group is None:
                mid = val.strip()
                while i < len(chunks):
                    it2 = chunks[i]
                    if div not in it2:
                        i += 1
                        continue
                    k2 = it2.partition(div)[0]
                    if k2.startswith("~"):
                        break
                    i += 1
                continue

            mid = val.strip()
            fields: Dict[str, str] = {}
            while i < len(chunks):
                it2 = chunks[i]
                if div not in it2:
                    i += 1
                    continue
                k2, _, v2 = it2.partition(div)
                if k2.startswith("~"):
                    break
                fields[k2] = v2
                i += 1

            ab = fields.get("AB", "")
            if ab == "1":
                status = "UPCOMING"
            elif ab == "2":
                status = "FINISHED"
            elif ab == "3":
                status = "LIVE"
            else:
                status = "UPCOMING"

            ag = (fields.get("AG") or "").strip()
            ah = (fields.get("AH") or "").strip()
            if status == "UPCOMING":
                score_txt = "-:-"
            elif ag == "" and ah == "":
                score_txt = "-:-"
            else:
                score_txt = f"{ag or '-'}:{ah or '-'}"

            score_home, score_away = parse_score_pair(score_txt.replace("−", "-"))

            if status == "LIVE":
                time_disp = ""
            else:
                time_disp = _format_unix_hhmm(fields.get("AD", ""))

            odds = generate_odds()
            home_logo = _fs_data_image_url(fields.get("OA", ""))
            away_logo = _fs_data_image_url(fields.get("OB", ""))
            current_group["items"].append(
                {
                    "id": mid,
                    "time": time_disp,
                    "status": status,
                    "home": fields.get("AE", "Home").strip(),
                    "away": fields.get("AF", "Away").strip(),
                    "score": score_txt,
                    "home_logo": home_logo,
                    "away_logo": away_logo,
                    "score_home": score_home,
                    "score_away": score_away,
                    "odds": odds,
                }
            )

    return [g for g in groups if g.get("items")]


_STANDINGS_PAIR_ID_RE = re.compile(r"^[A-Za-z0-9]{6,14}$")


def parse_standings_mobi_html(html: str) -> Dict[str, Any]:
    """Parse Flashscore.mobi /standings/{ZE}/{ZC}/ HTML into structured sections."""
    soup = BeautifulSoup(html, "html.parser")
    title = ""
    h3 = soup.find("h3")
    if h3:
        title = h3.get_text(" ", strip=True)
    table = soup.find("table")
    if not table:
        return {"page_title": title or "", "sections": [], "error": "no_table"}

    sections: List[Dict[str, Any]] = []
    current: List[Dict[str, Any]] = []
    section_key = 0

    def _cell_int(x: str) -> int:
        try:
            return int(x)
        except (TypeError, ValueError):
            return 0

    for tr in table.find_all("tr"):
        cells = tr.find_all(["th", "td"])
        if not cells:
            continue
        if all(c.name == "th" for c in cells):
            if current:
                sections.append({"key": section_key, "label": "", "rows": current})
                section_key += 1
                current = []
            continue
        tds = [c.get_text(strip=True) for c in cells]
        if len(tds) < 8:
            continue
        rank_s, team, mp, w, d, l, g_str, pts = (
            tds[0],
            tds[1],
            tds[2],
            tds[3],
            tds[4],
            tds[5],
            tds[6],
            tds[7],
        )
        try:
            rank = int(re.sub(r"[^\d]", "", rank_s) or "0")
        except ValueError:
            rank = 0
        gf, ga = 0, 0
        if ":" in g_str:
            gp, _, gr = g_str.partition(":")
            try:
                gf = int(gp.strip())
                ga = int(gr.strip())
            except ValueError:
                pass
        gd = gf - ga
        current.append(
            {
                "rank": rank,
                "team": team,
                "played": _cell_int(mp),
                "won": _cell_int(w),
                "drawn": _cell_int(d),
                "lost": _cell_int(l),
                "goals_for": gf,
                "goals_against": ga,
                "goals_str": g_str,
                "goal_diff": gd,
                "points": _cell_int(pts),
                "form": [],
            }
        )
    if current:
        sections.append({"key": section_key, "label": "", "rows": current})
    return {"page_title": title, "sections": sections}


async def fetch_livescore_ninja(sport_key: str, day_offset: int, _lang: str) -> List[Dict[str, Any]]:
    sid = NINJA_SPORT_IDS.get(sport_key)
    if sid is None:
        return []

    geo = _ninja_feed_geo_effective()
    feed = f"f_{sid}_{day_offset}_3_{geo}_1"
    url = f"{NINJA_HOST}/{NINJA_PROJECT_ID}/x/feed/{feed}"
    # Always English referer + Accept-Language so league/team strings match en-int feed (lang param unused for upstream).
    headers = {
        "x-fsign": NINJA_FSIGN,
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        ),
        "Referer": NINJA_REFERER,
        "Origin": "https://www.livescore.in",
        "Accept": "*/*",
        "Accept-Language": "en-GB,en-US;q=0.9,en;q=0.9",
    }

    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(url, headers=headers, timeout=25.0, follow_redirects=True)
            if resp.status_code != 200:
                print(f"Ninja feed HTTP {resp.status_code} for {url}")
                return []
            body = resp.text.strip()
            if len(body) < 50 or body in ("0", "1"):
                return []
            return parse_livescore_ninja_feed(resp.text)
        except Exception as e:
            print(f"Livescore ninja fetch error: {e}")
            return []


# --- API Endpoints ---


@app.get("/")
async def engine_health():
    return {"status": "ok", "service": "streamcast_sports_engine"}


@app.get("/api/config")
async def api_sports_engine_config_get():
    return load_sports_engine_config()


@app.post("/api/admin/config")
async def api_sports_engine_config_post(request: Request):
    body = await request.json()
    if not isinstance(body, dict):
        return {"error": "invalid_json"}
    return save_sports_engine_config(body)


@app.post("/api/admin/clear-cache")
async def api_sports_engine_clear_cache():
    try:
        redis_client.flushdb()
    except Exception as e:
        print(f"Redis flushdb: {e}")
    return {"ok": True}


@app.get("/api/scores")
async def get_scores(sport: str = "football", date: str = "today", lang: str = "en"):
    # 1. Resolve Date
    target_dt = datetime.now()
    if date == "yesterday":
        target_dt -= timedelta(days=1)
    elif date == "tomorrow":
        target_dt += timedelta(days=1)
    elif date != "today":
        try:
            target_dt = datetime.strptime(date, "%Y-%m-%d")
        except Exception:
            pass

    date_str_iso = target_dt.strftime("%Y-%m-%d")
    sk = sport.lower()
    delta = (target_dt.date() - datetime.now().date()).days

    cfg = load_sports_engine_config()
    provider = (cfg.get("scores_provider") or "flashscore").strip().lower()
    ls_cc = (cfg.get("livescore_com_country_code") or "GB").strip().upper()[:4] or "GB"

    if cfg.get("maintenance"):
        return {
            "date": date_str_iso,
            "sport": sport,
            "all_leagues": [],
            "pinned": [],
            "notice": "MAINTENANCE",
            "scores_provider": provider,
        }

    if cfg.get("mode") == "mock":
        return {
            "date": date_str_iso,
            "sport": sport,
            "all_leagues": [],
            "pinned": [],
            "notice": "MOCK_MODE",
            "scores_provider": provider,
        }

    result_data: List[Dict[str, Any]] = []
    notice: Optional[str] = None

    if provider == "livescore_com" and sk == "football":
        result_data = await fetch_livescore_com_scores(target_dt, ls_cc)
        if not result_data:
            notice = "LIVESCORE_COM_EMPTY"
        for g in result_data:
            for it in g.get("items") or []:
                it["odds"] = generate_odds()
    elif provider == "livescore_com":
        if sk in MOBI_UNSUPPORTED_SPORTS:
            result_data = []
            notice = "ESPORTS_NOT_AVAILABLE_ON_MOBI"
        elif sk not in NINJA_SPORT_IDS:
            result_data = []
            notice = "UNKNOWN_SPORT"
        else:
            notice = "LIVESCORE_COM_FOOTBALL_ONLY"
            result_data = await fetch_livescore_ninja(sk, delta, lang)
            if not result_data:
                result_data = await fetch_flashscore_scrape(sk, delta)
    elif sk in MOBI_UNSUPPORTED_SPORTS:
        result_data = []
        notice = "ESPORTS_NOT_AVAILABLE_ON_MOBI"
    elif sk not in NINJA_SPORT_IDS:
        result_data = []
        notice = "UNKNOWN_SPORT"
    else:
        result_data = await fetch_livescore_ninja(sk, delta, lang)
        if not result_data:
            result_data = await fetch_flashscore_scrape(sk, delta)

    resp: Dict[str, Any] = {
        "date": date_str_iso,
        "sport": sport,
        "all_leagues": result_data,
        "pinned": [l for l in result_data if l.get("items") and len(l["items"]) > 0][:5],
        "scores_provider": provider,
    }
    if provider == "livescore_com":
        resp["livescore_com_country_code"] = ls_cc
        resp["livescore_com_page_url"] = cfg.get("livescore_com_page_url") or DEFAULT_SPORTS_ENGINE_CONFIG["livescore_com_page_url"]
    if notice:
        resp["notice"] = notice
    return resp


@app.get("/api/standings")
async def get_standings(ze: str, zc: str):
    """
    League table from Flashscore Mobi (same ecosystem as Livescore.in Ninja feed).
    IDs come from feed fields ZE and ZC on each league block.
    """
    ze_s = (ze or "").strip()
    zc_s = (zc or "").strip()
    if not _STANDINGS_PAIR_ID_RE.match(ze_s) or not _STANDINGS_PAIR_ID_RE.match(zc_s):
        return {"error": "invalid_ids", "page_title": "", "sections": []}

    url = f"{FLASHSCORE_MOBI.rstrip('/')}/standings/{ze_s}/{zc_s}/"
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(url, headers=HEADERS_MOBI, timeout=18.0, follow_redirects=True)
            if resp.status_code != 200:
                return {
                    "error": "upstream_http",
                    "status": resp.status_code,
                    "page_title": "",
                    "sections": [],
                }
            return parse_standings_mobi_html(resp.text)
        except Exception as e:
            return {"error": str(e), "page_title": "", "sections": []}


# --- CMS / News Endpoint (Synced from Production) ---
@app.get("/api/posts")
async def get_posts():
    """
    Returns latest news posts (Synced from Production).
    """
    try:
        if os.path.exists("production_posts.json"):
            with open("production_posts.json", "r", encoding="utf-8") as f:
                data = json.load(f)
            return data
    except Exception as e:
        print(f"Error loading posts: {e}")
    
    # Fallback to empty if file missing
    return {"data": []}

# --- Settings & Instagram ---
SETTINGS_FILE = "settings.json"

@app.get("/api/settings")
async def get_settings():
    if os.path.exists(SETTINGS_FILE):
        with open(SETTINGS_FILE, "r") as f:
            return json.load(f)
    return {
        "siteName": "StreamCast Platform",
        "adminEmail": "admin@streamcast.com",
        "maintenanceMode": False,
        "allowRegistration": True,
        "instagram_username": "event_01s"
    }

@app.post("/api/settings")
async def save_settings(request: Request):
    data = await request.json()
    with open(SETTINGS_FILE, "w") as f:
        json.dump(data, f)
    return {"status": "saved"}

@app.get("/api/instagram")
async def get_instagram():
    # Load username from settings
    username = "event_01s"
    if os.path.exists(SETTINGS_FILE):
        with open(SETTINGS_FILE, "r") as f:
            username = json.load(f).get("instagram_username", "event_01s")

    # Return mock data for the frontend to render
    # In a real scenario, this would use the Instagram Basic Display API
    return {
        "data": [
            {
                "id": "1",
                "media_url": "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=400&q=80",
                "caption": f"Follow us @{username} for live updates! ⚽🔥 #football #live",
                "permalink": f"https://instagram.com/{username}"
            },
            {
                "id": "2",
                "media_url": "https://images.unsplash.com/photo-1541252260730-0412e8e2108e?auto=format&fit=crop&w=400&q=80",
                "caption": "Championship finals details announced! 🏆",
                "permalink": f"https://instagram.com/{username}"
            },
            {
                "id": "3",
                "media_url": "https://images.unsplash.com/photo-1579952363873-27f3bde9be2d?auto=format&fit=crop&w=400&q=80",
                "caption": "Who is your player of the match? 🌟",
                "permalink": f"https://instagram.com/{username}"
            }
        ]
    }

# --- AI Chat Agent ---
async def get_gemini_key():
    """Fetch API Key from Go Backend Settings"""
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get("http://localhost:8080/api/settings", timeout=2.0)
            if resp.status_code == 200:
                settings = resp.json().get("data", {})
                return settings.get("gemini_api_key")
    except Exception as e:
        print(f"Error fetching Gemini key from API: {e}")
    return os.getenv("GEMINI_API_KEY")

@app.post("/api/chat")
async def chat_agent(request: Request):
    try:
        body = await request.json()
        user_msg = body.get("message", "")
        history_raw = body.get("history", [])
        
        import google.generativeai as genai
        GENAI_KEY = await get_gemini_key()
        
        if not GENAI_KEY: 
            return {"response": "I'm offline right now (No Key)."}
        
        genai.configure(api_key=GENAI_KEY)
        
        # DEBUG: Check what models are actually seen by this Key
        valid_model_name = 'gemini-pro'
        try:
            available = []
            for m in genai.list_models():
                if 'generateContent' in m.supported_generation_methods:
                    available.append(m.name)
            
            print(f"DEBUG - Available Models: {available}")
            
            # Smart selection
            if 'models/gemini-1.5-flash' in available: 
                valid_model_name = 'gemini-1.5-flash'
            elif 'models/gemini-pro' in available:
                valid_model_name = 'gemini-pro'
            elif available:
                valid_model_name = available[0].split('/')[-1] # Take first available
                
        except Exception as e:
            print(f"DEBUG - ListModels Failed: {e}. Defaulting to gemini-pro")

        system_rules = """
        You are 'Athena', the elite AI sports analyst.
        Your personality: Sharp, knowledgeable, slightly witty, and professional.
        RULES:
        1. Talk ONLY about sports.
        2. Keep answers concise usually (2-3 sentences).
        3. ALWAYS reply in the SAME LANGUAGE as the user's message (e.g., if asked in Arabic, reply in Arabic).
        """
        
        print(f"DEBUG - Using Model: {valid_model_name}")
        model = genai.GenerativeModel(valid_model_name)

        # Convert History
        formatted_history = []
        
        # Inject System Prompt as a fake first turn
        formatted_history.append({"role": "user", "parts": [system_rules]})
        formatted_history.append({"role": "model", "parts": ["Understood. I am Athena."]})
        
        for turn in history_raw:
            role = turn['role']
            if role == 'assistant': role = 'model'
            formatted_history.append({
                "role": role,
                "parts": [turn['content']]
            })
            
        chat = model.start_chat(history=formatted_history)
        
        response = chat.send_message(user_msg)
        return {"response": response.text}
        
    except Exception as e:
        print(f"Chat Error: {e}")
        return {"response": f"Tactical Error: {str(e)}"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)

