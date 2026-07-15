"""
Google-style live scores provider (v2 API).

Provider chain:
  1. google  - attempt to parse the Google Search sports onebox (server-side HTML).
               Google usually serves a JS challenge to datacenter IPs, in which case
               this returns None and we fall through.
  2. engine  - Flashscore Ninja feed (logos, all sports) enriched with the
               flashscore.mobi scrape (real live-minute text) merged by team names.

The output schema is a normalized, Google-like structure:

{
  "competitions": [
    {
      "id": str,
      "name": str,
      "country": str,
      "logo": str,
      "flag": str,            # ISO2 country code when known
      "standings_ids": {"ze": str, "zc": str},
      "matches": [
        {
          "id": str,
          "status": "LIVE" | "FINISHED" | "UPCOMING",
          "status_text": str,   # e.g. "67'", "HT", "FT", "19:00"
          "minute": str,        # live minute when known, else ""
          "start_time": str,    # HH:MM UTC when known
          "start_ts": int,      # unix seconds when known, else 0
          "home": {"name": str, "logo": str, "score": int|None},
          "away": {"name": str, "logo": str, "score": int|None},
        }
      ]
    }
  ]
}
"""

import os
import re
import unicodedata
from typing import Any, Dict, List, Optional

import httpx
from bs4 import BeautifulSoup

GOOGLE_SCRAPE_ENABLED = (os.getenv("GOOGLE_SCORES_ENABLED", "1").strip() != "0")

_GOOGLE_QUERIES: Dict[str, str] = {
    "football": "football matches",
    "basketball": "basketball games",
    "tennis": "tennis matches",
    "hockey": "ice hockey games",
    "american-football": "nfl games",
    "baseball": "mlb games",
    "handball": "handball matches",
    "volleyball": "volleyball matches",
    "cricket": "cricket matches",
    "mma": "mma fights",
}

_GOOGLE_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

# Pre-consent cookie so google.com does not redirect EU traffic to the consent wall.
_GOOGLE_COOKIES = {"CONSENT": "YES+cb.20240101-00-p0.en+FX+000", "SOCS": "CAESHAgBEhJnd3NfMjAyNDAxMDEtMF9SQzIaAmVuIAEaBgiA_LyaBg"}


def _clean(s: str) -> str:
    return " ".join((s or "").split()).strip()


def _team_key(name: str) -> str:
    """Normalized key for merging the same match across data sources."""
    n = re.sub(r"\([^)]*\)", "", name or "")  # drop country suffixes like "(Jpn)"
    n = unicodedata.normalize("NFKD", n.lower())
    n = "".join(c for c in n if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]", "", n)


async def fetch_google_onebox(sport: str, date_word: str, lang: str = "en") -> Optional[List[Dict[str, Any]]]:
    """
    Best-effort parse of the Google sports onebox. Returns None when Google
    serves the JS challenge / consent page or the onebox is absent.
    """
    if not GOOGLE_SCRAPE_ENABLED:
        return None
    base_q = _GOOGLE_QUERIES.get(sport.lower())
    if not base_q:
        return None
    q = f"{base_q} {date_word}".strip()
    url = "https://www.google.com/search"
    params = {"q": q, "hl": lang if lang in ("en", "ar", "tr") else "en", "num": "10"}
    try:
        async with httpx.AsyncClient(cookies=_GOOGLE_COOKIES, follow_redirects=True) as client:
            resp = await client.get(url, params=params, headers=_GOOGLE_HEADERS, timeout=10.0)
    except Exception as e:
        print(f"google onebox fetch error: {e}")
        return None
    if resp.status_code != 200:
        return None
    html = resp.text
    # JS challenge / consent wall markers -> no server-rendered results.
    if "enablejs" in html or "consent.google.com" in html or len(html) < 20000:
        return None
    return _parse_google_onebox_html(html)


def _parse_google_onebox_html(html: str) -> Optional[List[Dict[str, Any]]]:
    """
    Parse the server-rendered sports onebox (imso / imspo markup).
    Google markup changes frequently; return None whenever nothing parses so
    the caller falls back to the engine provider.
    """
    soup = BeautifulSoup(html, "html.parser")
    tables = soup.select("[class*=imspo_mt], [class*=imso-hov], [class*=imso_mh]")
    if not tables:
        return None

    matches: List[Dict[str, Any]] = []
    for node in soup.select("[class*=imspo_mt__mtc-no], [class*=imspo_mt__match]"):
        teams = node.select("[class*=imspo_mt__tt-w], [class*=imso_mh__tm-nm]")
        scores = node.select("[class*=imspo_mt__t-sc], [class*=imso_mh__l-tm-sc], [class*=imso_mh__r-tm-sc]")
        status_el = node.select_one("[class*=imspo_mt__cmd], [class*=imspo_mt__pm-inf], [class*=imso_mh__ft-mtch]")
        logos = [img.get("src") or "" for img in node.select("img")]
        if len(teams) < 2:
            continue
        home_name = _clean(teams[0].get_text(" "))
        away_name = _clean(teams[1].get_text(" "))
        if not home_name or not away_name:
            continue
        sh = _clean(scores[0].get_text()) if len(scores) > 0 else ""
        sa = _clean(scores[1].get_text()) if len(scores) > 1 else ""
        status_text = _clean(status_el.get_text(" ")) if status_el else ""
        low = status_text.lower()
        if re.search(r"\blive\b|[0-9]+'", low):
            status = "LIVE"
        elif re.search(r"\bft\b|\bfinal\b|\bended\b", low):
            status = "FINISHED"
        else:
            status = "UPCOMING"
        matches.append(
            {
                "id": f"g-{_team_key(home_name)}-{_team_key(away_name)}",
                "status": status,
                "status_text": status_text,
                "minute": status_text if status == "LIVE" else "",
                "start_time": "",
                "start_ts": 0,
                "home": {"name": home_name, "logo": logos[0] if len(logos) > 0 else "", "score": int(sh) if sh.isdigit() else None},
                "away": {"name": away_name, "logo": logos[1] if len(logos) > 1 else "", "score": int(sa) if sa.isdigit() else None},
            }
        )

    if not matches:
        return None
    return [
        {
            "id": "google-results",
            "name": "Matches",
            "country": "",
            "logo": "",
            "flag": "",
            "standings_ids": {"ze": "", "zc": ""},
            "matches": matches,
        }
    ]


# ---------------------------------------------------------------------------
# Engine provider normalization (ninja feed + mobi live minutes)
# ---------------------------------------------------------------------------

_LIVE_MINUTE_RE = re.compile(r"^\s*(\d{1,3}(?:\+\d{1,2})?)'?\s*$")
_STATUS_WORDS = {
    "halftime": "HT",
    "half time": "HT",
    "ht": "HT",
    "break": "Break",
    "pen": "Pens",
    "penalties": "Pens",
    "et": "ET",
    "extra time": "ET",
    "after et": "AET",
    "after pen.": "Pens",
}


def _mobi_live_status_text(raw_time: str) -> str:
    """Convert flashscore.mobi live time text into a compact badge (e.g. 67' / HT)."""
    t = _clean(raw_time)
    if not t:
        return ""
    m = _LIVE_MINUTE_RE.match(t)
    if m:
        return f"{m.group(1)}'"
    return _STATUS_WORDS.get(t.lower(), t)


def build_live_minute_index(mobi_groups: List[Dict[str, Any]]) -> Dict[str, str]:
    """Index of live minute text by normalized 'home|away' key from the mobi scrape."""
    idx: Dict[str, str] = {}
    for g in mobi_groups or []:
        for it in g.get("items") or []:
            if it.get("status") != "LIVE":
                continue
            key = f"{_team_key(it.get('home', ''))}|{_team_key(it.get('away', ''))}"
            txt = _mobi_live_status_text(it.get("time", ""))
            if key and txt:
                idx[key] = txt
    return idx


def _lookup_minute(idx: Dict[str, str], home: str, away: str) -> str:
    """Exact key match first, then substring match (sources abbreviate names differently)."""
    hk, ak = _team_key(home), _team_key(away)
    if not hk or not ak:
        return ""
    exact = idx.get(f"{hk}|{ak}")
    if exact:
        return exact
    for k, v in idx.items():
        ih, _, ia = k.partition("|")
        if not ih or not ia:
            continue
        if (hk in ih or ih in hk) and (ak in ia or ia in ak):
            return v
    return ""


def normalize_engine_groups(
    groups: List[Dict[str, Any]],
    live_minutes: Optional[Dict[str, str]] = None,
) -> List[Dict[str, Any]]:
    """Convert v1 engine groups (ninja/mobi parse output) into the v2 schema."""
    live_minutes = live_minutes or {}
    competitions: List[Dict[str, Any]] = []
    for g in groups or []:
        matches: List[Dict[str, Any]] = []
        for it in g.get("items") or []:
            status = it.get("status") or "UPCOMING"
            score_h = it.get("score_home")
            score_a = it.get("score_away")
            has_score = status in ("LIVE", "FINISHED")
            key = f"{_team_key(it.get('home', ''))}|{_team_key(it.get('away', ''))}"
            minute = _lookup_minute(live_minutes, it.get("home", ""), it.get("away", "")) if status == "LIVE" else ""
            if status == "LIVE":
                status_text = minute or "LIVE"
            elif status == "FINISHED":
                status_text = "FT"
            else:
                status_text = it.get("time") or ""
            matches.append(
                {
                    "id": it.get("id") or key,
                    "status": status,
                    "status_text": status_text,
                    "minute": minute,
                    "start_time": it.get("time") or "",
                    "start_ts": int(it.get("start_ts") or 0),
                    "home": {
                        "name": it.get("home") or "",
                        "logo": it.get("home_logo") or "",
                        "score": score_h if has_score else None,
                    },
                    "away": {
                        "name": it.get("away") or "",
                        "logo": it.get("away_logo") or "",
                        "score": score_a if has_score else None,
                    },
                }
            )
        if not matches:
            continue
        competitions.append(
            {
                "id": str(g.get("id") or g.get("group_title") or len(competitions)),
                "name": g.get("league") or g.get("group_title") or "",
                "country": g.get("country") or "",
                "logo": g.get("logo") or "",
                "flag": g.get("country_flag_code") or "",
                "standings_ids": {"ze": g.get("ze") or "", "zc": g.get("zc") or ""},
                "matches": matches,
            }
        )
    return competitions


def summarize(competitions: List[Dict[str, Any]]) -> Dict[str, int]:
    total = live = finished = upcoming = 0
    for c in competitions:
        for m in c.get("matches") or []:
            total += 1
            s = m.get("status")
            if s == "LIVE":
                live += 1
            elif s == "FINISHED":
                finished += 1
            else:
                upcoming += 1
    return {"total": total, "live": live, "finished": finished, "upcoming": upcoming}
