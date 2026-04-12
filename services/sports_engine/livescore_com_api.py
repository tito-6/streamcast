"""
LiveScore.com public JSON API (same source as https://www.livescore.com/en/football/...).
Uses prod-public-api.livescore.com — English labels when countryCode is GB (or US, etc.).
See: https://www.livescore.com/en/football/live/
"""
from __future__ import annotations

import hashlib
import re
from datetime import datetime
from typing import Any, Dict, List

import httpx

LIVESCORE_PROD_API = "https://prod-public-api.livescore.com/v1/api/app"

HEADERS_LIVESCORE = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json",
    "Accept-Language": "en-GB,en-US;q=0.9,en;q=0.9",
}


def _eps_to_status(eps: Any) -> str:
    """Map LiveScore Eps to LIVE / FINISHED / UPCOMING."""
    e = str(eps or "").strip().upper()
    if e in ("NS", "POSTP", "CANC", "ABD", "AWD", "WO", "DELAYED", ""):
        return "UPCOMING"
    if e in ("FT", "AET", "AP", "PEN", "AOT"):
        return "FINISHED"
    if e in ("3", "LIVE"):
        return "LIVE"
    if e == "2":
        return "FINISHED"
    if e == "1":
        return "UPCOMING"
    if e == "HT" or (e.endswith("'") and e[:-1].strip().isdigit()):
        return "LIVE"
    if re.match(r"^\d+$", e):
        return "LIVE"
    return "UPCOMING"


def _team_name(team_field: Any) -> str:
    if isinstance(team_field, list) and team_field:
        t0 = team_field[0]
        if isinstance(t0, dict):
            return (t0.get("Nm") or t0.get("Name") or "").strip()
    if isinstance(team_field, dict):
        return (team_field.get("Nm") or team_field.get("Name") or "").strip()
    return ""


def _team_logo(team_field: Any) -> str:
    if isinstance(team_field, list) and team_field:
        t0 = team_field[0]
        if isinstance(t0, dict):
            img = (t0.get("Img") or t0.get("imageUrl") or "").strip()
            if img.startswith("http"):
                return img
    return ""


def _parse_score_tr(tr: Any) -> int:
    try:
        if tr is None or tr == "":
            return 0
        return int(tr)
    except (TypeError, ValueError):
        return 0


def _esd_to_time(esd: Any) -> str:
    """Kickoff / clock display from Esd (often YYYYMMDDHHmmss as int)."""
    try:
        raw = int(esd)
        s = str(raw)
        if len(s) >= 14:
            hh, mm = int(s[8:10]), int(s[10:12])
            return f"{hh:02d}:{mm:02d}"
        if len(s) >= 4:
            return s[-4:-2] + ":" + s[-2:]
    except (TypeError, ValueError):
        pass
    return ""


def _groups_from_livescore_json(data: Dict[str, Any]) -> List[Dict[str, Any]]:
    stages = data.get("Stages") or data.get("stages") or []
    groups: List[Dict[str, Any]] = []

    for stage in stages:
        if not isinstance(stage, dict):
            continue
        country = (stage.get("Cnm") or stage.get("country") or "World").strip()
        league = (stage.get("Snm") or stage.get("Competition") or "Football").strip()
        title = f"{country}: {league}"
        events = stage.get("Events") or stage.get("events") or []
        if not isinstance(events, list):
            continue

        items: List[Dict[str, Any]] = []
        for ev in events:
            if not isinstance(ev, dict):
                continue
            home = _team_name(ev.get("T1"))
            away = _team_name(ev.get("T2"))
            if not home or not away:
                continue
            mid = str(ev.get("Eid") or ev.get("id") or hashlib.md5(f"{home}{away}{title}".encode()).hexdigest()[:12])
            st = _eps_to_status(ev.get("Eps"))
            sh = _parse_score_tr(ev.get("Tr1"))
            sa = _parse_score_tr(ev.get("Tr2"))
            if st == "UPCOMING":
                score_txt = "-:-"
            else:
                score_txt = f"{sh}:{sa}"
            time_disp = _esd_to_time(ev.get("Esd"))
            if st == "LIVE":
                eps = str(ev.get("Eps") or "").strip()
                time_disp = eps if eps and eps not in ("3", "LIVE") else time_disp

            items.append(
                {
                    "id": mid,
                    "time": time_disp,
                    "status": st,
                    "home": home,
                    "away": away,
                    "score": score_txt,
                    "home_logo": _team_logo(ev.get("T1")),
                    "away_logo": _team_logo(ev.get("T2")),
                    "score_home": sh,
                    "score_away": sa,
                }
            )

        if items:
            gid = str(hash(title) & 0x7FFFFFFF)
            groups.append(
                {
                    "id": gid,
                    "group_title": title,
                    "country": country,
                    "league": league,
                    "logo": "",
                    "country_flag_code": "",
                    "ze": "",
                    "zc": "",
                    "tournament_id": "",
                    "items": items,
                }
            )

    return groups


async def fetch_livescore_com_scores(
    target_dt: datetime,
    country_code: str = "GB",
) -> List[Dict[str, Any]]:
    """
    Fetch one calendar day of soccer from LiveScore prod API (English when countryCode=GB).
    """
    cc = (country_code or "GB").strip().upper()[:4] or "GB"
    ymd = target_dt.strftime("%Y%m%d")
    url = f"{LIVESCORE_PROD_API}/date/soccer/{ymd}/3?MD=1&countryCode={cc}"

    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(url, headers=HEADERS_LIVESCORE, timeout=25.0, follow_redirects=True)
            if resp.status_code != 200:
                print(f"LiveScore.com API HTTP {resp.status_code} for {url}")
                return []
            data = resp.json()
            if not isinstance(data, dict):
                return []
            return _groups_from_livescore_json(data)
        except Exception as e:
            print(f"LiveScore.com API error: {e}")
            return []
