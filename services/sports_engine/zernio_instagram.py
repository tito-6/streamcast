"""
Live Instagram preview backed by the Zernio API (read-only) + IG public profile.

Data sources:
  GET  zernio /v1/accounts                                  -> connected account (id, username, avatar)
  GET  zernio /v1/posts?source=external&platform=instagram  -> full external post history (paginated)
  GET  zernio /v1/analytics?source=external                 -> real likes/comments/views/shares/saves
                                                               + freshly-signed media URLs (paginated)
  GET  zernio /v1/accounts/{id}/instagram/stories           -> currently-active stories
  GET  zernio /v1/inbox/comments/{postId}?accountId=...     -> comments for one post
  POST zernio /v1/posts/sync-external                       -> on-demand refresh of latest posts
  GET  i.instagram.com web_profile_info                     -> bio, bio links, real counts (public API)

Media: Instagram CDN URLs are signed and expire. /api/instagram/media proxies
and disk-caches the bytes on first fetch, so posts keep rendering after the
signed URL dies.

Configuration (env, .env.local):
  ZERNIO_API_KEY        required for live data
  ZERNIO_IG_ACCOUNT_ID  optional; auto-resolved from /v1/accounts when omitted

Everything is cached in-process for ~2 hours (comments 30 min) per product
requirement: the page mirrors the IG account with a 2-hour refresh rate.
"""

import os
import time
import hashlib
import asyncio
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse

import httpx
from fastapi import APIRouter
from fastapi.responses import Response

ZERNIO_BASE = os.getenv("ZERNIO_API_BASE", "https://zernio.com/api/v1").rstrip("/")

REFRESH_TTL = 2 * 3600          # profile / posts / stories: 2 hours
COMMENTS_TTL = 1800             # comments: 30 minutes

MEDIA_CACHE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ig_media_cache")
MEDIA_ALLOWED_SUFFIXES = (".cdninstagram.com", ".fbcdn.net")
MEDIA_MAX_BYTES = 80 * 1024 * 1024  # 80 MB cap (reels)

router = APIRouter()

_cache: Dict[str, Any] = {}
_cache_lock = asyncio.Lock()


def _api_key() -> str:
    return (os.getenv("ZERNIO_API_KEY") or "").strip()


def _configured_account_id() -> str:
    return (os.getenv("ZERNIO_IG_ACCOUNT_ID") or "").strip()


def _cache_get(key: str):
    ent = _cache.get(key)
    if not ent:
        return None
    exp, val = ent
    if time.time() > exp:
        _cache.pop(key, None)
        return None
    return val


def _cache_set(key: str, val, ttl: float):
    _cache[key] = (time.time() + ttl, val)


async def _zget(path: str, params: Optional[Dict[str, Any]] = None) -> Optional[Any]:
    key = _api_key()
    if not key:
        return None
    headers = {"Authorization": f"Bearer {key}", "Accept": "application/json"}
    url = f"{ZERNIO_BASE}{path}"
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, params=params or {}, headers=headers, timeout=30.0)
        if resp.status_code != 200:
            print(f"zernio GET {path} -> HTTP {resp.status_code}: {resp.text[:300]}")
            return None
        return resp.json()
    except Exception as e:
        print(f"zernio GET {path} error: {e}")
        return None


async def _zpost(path: str, payload: Optional[Dict[str, Any]] = None) -> Optional[Any]:
    key = _api_key()
    if not key:
        return None
    headers = {"Authorization": f"Bearer {key}", "Accept": "application/json"}
    url = f"{ZERNIO_BASE}{path}"
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, json=payload or {}, headers=headers, timeout=60.0)
        if resp.status_code not in (200, 201, 202):
            print(f"zernio POST {path} -> HTTP {resp.status_code}: {resp.text[:300]}")
            return None
        return resp.json()
    except Exception as e:
        print(f"zernio POST {path} error: {e}")
        return None


# ---------------------------------------------------------------------------
# Instagram public profile (bio, bio link, real counts)
# ---------------------------------------------------------------------------

_IG_PUBLIC_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
    ),
    "x-ig-app-id": "936619743392459",
    "Accept": "application/json",
}


_PROFILE_DISK_CACHE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ig_profile_cache.json")


def _profile_disk_load(username: str) -> Optional[Dict[str, Any]]:
    try:
        import json
        with open(_PROFILE_DISK_CACHE, "r", encoding="utf-8") as f:
            allp = json.load(f)
        return allp.get(username)
    except Exception:
        return None


def _profile_disk_save(username: str, prof: Dict[str, Any]) -> None:
    try:
        import json
        allp = {}
        if os.path.isfile(_PROFILE_DISK_CACHE):
            with open(_PROFILE_DISK_CACHE, "r", encoding="utf-8") as f:
                allp = json.load(f)
        allp[username] = prof
        with open(_PROFILE_DISK_CACHE, "w", encoding="utf-8") as f:
            json.dump(allp, f, ensure_ascii=False)
    except Exception as e:
        print(f"ig profile disk cache write error: {e}")


async def fetch_ig_public_profile(username: str) -> Optional[Dict[str, Any]]:
    """
    Bio, bio links and real counts from Instagram's public web profile API.
    Instagram rate-limits datacenter IPs, so the last good response is
    persisted to disk and served whenever the live call fails.
    """
    if not username:
        return None
    ck = f"ig_pub:{username}"
    cached = _cache_get(ck)
    if cached is not None:
        return cached or None

    url = "https://i.instagram.com/api/v1/users/web_profile_info/"
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, params={"username": username}, headers=_IG_PUBLIC_HEADERS, timeout=15.0)
        data = resp.json() if resp.status_code == 200 else None
        if resp.status_code != 200:
            print(f"ig public profile HTTP {resp.status_code}")
    except Exception as e:
        print(f"ig public profile error: {e}")
        data = None

    user = ((data or {}).get("data") or {}).get("user") or {}
    out = None
    if user:
        links = []
        for bl in user.get("bio_links") or []:
            if isinstance(bl, dict) and bl.get("url"):
                links.append({"title": bl.get("title") or "", "url": bl.get("url")})
        out = {
            "biography": user.get("biography") or "",
            "bio_links": links,
            "followers": ((user.get("edge_followed_by") or {}).get("count")) or 0,
            "following": ((user.get("edge_follow") or {}).get("count")) or 0,
            "media_count": ((user.get("edge_owner_to_timeline_media") or {}).get("count")) or 0,
            "avatar_hd": user.get("profile_pic_url_hd") or user.get("profile_pic_url") or "",
            "is_verified": bool(user.get("is_verified")),
            "full_name": user.get("full_name") or "",
        }

    if out:
        _profile_disk_save(username, out)
        _cache_set(ck, out, REFRESH_TTL)
        return out

    # Live call failed (rate limit etc.): serve the last good copy and retry in 10 min.
    stale = _profile_disk_load(username)
    _cache_set(ck, stale or {}, 600)
    return stale


# ---------------------------------------------------------------------------
# Zernio account / posts / analytics
# ---------------------------------------------------------------------------

async def resolve_account() -> Optional[Dict[str, Any]]:
    """Find the connected Instagram account (profile info incl. avatar/followers)."""
    cached = _cache_get("ig_account")
    if cached is not None:
        return cached or None

    data = await _zget("/accounts")
    if not data:
        return None
    accounts = data.get("accounts") or data.get("data") or data if isinstance(data, list) else (data.get("accounts") or data.get("data") or [])
    if isinstance(accounts, dict):
        accounts = accounts.get("accounts") or []

    wanted_id = _configured_account_id()
    ig = None
    for acc in accounts:
        if acc.get("platform") != "instagram":
            continue
        if wanted_id and str(acc.get("_id")) != wanted_id:
            continue
        if acc.get("isActive") is False:
            continue
        ig = acc
        break

    _cache_set("ig_account", ig or {}, REFRESH_TTL)
    return ig


def _shape_profile(acc: Dict[str, Any], pub: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    stats = acc.get("accountStats") or {}
    pub = pub or {}
    username = (acc.get("username") or "").lstrip("@")
    return {
        "account_id": acc.get("_id") or "",
        "username": username,
        "display_name": pub.get("full_name") or acc.get("displayName") or acc.get("username") or "",
        "avatar": pub.get("avatar_hd") or acc.get("profilePicture") or "",
        "profile_url": acc.get("profileUrl") or (f"https://www.instagram.com/{username}/" if username else ""),
        "bio": pub.get("biography") or "",
        "bio_links": pub.get("bio_links") or [],
        "is_verified": bool(pub.get("is_verified")),
        "followers": pub.get("followers") or acc.get("followersCount") or acc.get("currentFollowers") or 0,
        "following": pub.get("following") or stats.get("followingCount") or 0,
        "media_count": pub.get("media_count") or stats.get("mediaCount") or 0,
    }


def _shape_post(p: Dict[str, Any]) -> Dict[str, Any]:
    analytics = p.get("analytics") or {}
    # /v1/posts items nest the IG ids inside platforms[]; /v1/analytics has them top-level.
    plat: Dict[str, Any] = {}
    for entry in p.get("platforms") or []:
        if isinstance(entry, dict) and entry.get("platform") == "instagram":
            plat = entry
            break
    ig_id = str(p.get("platformPostId") or plat.get("platformPostId") or "")
    media_type = (p.get("mediaType") or "").lower()
    permalink = p.get("platformPostUrl") or plat.get("platformPostUrl") or ""
    published_at = p.get("publishedAt") or plat.get("publishedAt") or p.get("scheduledFor") or p.get("createdAt") or ""
    is_reel = "/reel" in permalink or media_type == "video"
    media_items = []
    for mi in p.get("mediaItems") or []:
        if isinstance(mi, dict):
            media_items.append(
                {
                    "type": (mi.get("type") or mi.get("mediaType") or "").lower(),
                    "url": mi.get("url") or mi.get("mediaUrl") or "",
                    "thumbnail": mi.get("thumbnailUrl") or mi.get("thumbnail") or "",
                }
            )
    if not media_type and media_items:
        media_type = media_items[0]["type"] or ""
        if len(media_items) > 1:
            media_type = "carousel"
    return {
        "id": ig_id or str(p.get("_id") or ""),
        "caption": p.get("content") or "",
        "permalink": permalink,
        "published_at": published_at,
        "media_type": media_type or ("video" if is_reel else "image"),
        "is_video": is_reel,
        "is_carousel": media_type == "carousel" or len(media_items) > 1,
        "media_url": p.get("mediaUrl") or (media_items[0]["url"] if media_items else ""),
        "thumbnail_url": p.get("thumbnailUrl") or (media_items[0]["thumbnail"] if media_items else ""),
        "media_items": media_items,
        "likes": analytics.get("likes") or 0,
        "comments": analytics.get("comments") or 0,
        "views": analytics.get("views") or analytics.get("impressions") or 0,
        "shares": analytics.get("shares") or 0,
        "saves": analytics.get("saves") or 0,
    }


async def sync_external_posts(account_id: str) -> None:
    """Ask Zernio to re-sync the latest IG posts (throttled to the refresh TTL)."""
    if _cache_get("ig_synced"):
        return
    _cache_set("ig_synced", True, REFRESH_TTL)
    await _zpost("/posts/sync-external", {"accountId": account_id, "platform": "instagram"})


async def fetch_analytics_index(account_id: str) -> Dict[str, Dict[str, Any]]:
    """
    Per-post analytics (likes/comments/views/shares/saves) + freshly-signed
    media URLs from /v1/analytics, keyed by the IG post id. Max lookback 365d.
    """
    cached = _cache_get("ig_analytics")
    if cached is not None:
        return cached

    from_date = (datetime.utcnow() - timedelta(days=365)).strftime("%Y-%m-%d")
    index: Dict[str, Dict[str, Any]] = {}
    page = 1
    while page <= 20:
        data = await _zget(
            "/analytics",
            {
                "platform": "instagram",
                "source": "external",
                "accountId": account_id,
                "fromDate": from_date,
                "limit": 100,
                "page": page,
                "sortBy": "date",
                "order": "desc",
            },
        )
        posts = (data or {}).get("posts") or []
        if not posts:
            break
        for p in posts:
            if not isinstance(p, dict):
                continue
            pid = ""
            for plat in p.get("platforms") or []:
                if isinstance(plat, dict) and plat.get("platformPostId"):
                    pid = str(plat["platformPostId"])
                    break
            if not pid:
                pid = str(p.get("_id") or "")
            if not pid:
                continue
            index[pid] = {
                "analytics": p.get("analytics") or {},
                "thumbnailUrl": p.get("thumbnailUrl") or "",
                "mediaItems": p.get("mediaItems") or [],
                "mediaType": p.get("mediaType") or "",
                "zid": str(p.get("_id") or ""),
            }
        pagination = (data or {}).get("pagination") or {}
        if page >= int(pagination.get("pages") or 1):
            break
        page += 1

    _cache_set("ig_analytics", index, REFRESH_TTL)
    return index


async def fetch_external_posts(account_id: str, max_posts: int = 1000) -> List[Dict[str, Any]]:
    """Full external post history merged with per-post analytics + fresh media."""
    cached = _cache_get("ig_posts")
    if cached is not None:
        return cached

    await sync_external_posts(account_id)

    analytics_index = await fetch_analytics_index(account_id)

    page_size = 100
    posts_raw: List[Dict[str, Any]] = []
    seen_ids: set = set()
    for page in range(1, (max_posts // page_size) + 2):
        data = await _zget(
            "/posts",
            {
                "source": "external",
                "platform": "instagram",
                "accountId": account_id,
                "limit": page_size,
                "page": page,
            },
        )
        batch: List[Dict[str, Any]] = []
        if isinstance(data, dict):
            batch = data.get("posts") or data.get("data") or []
        elif isinstance(data, list):
            batch = data
        if not batch:
            break
        new = 0
        for p in batch:
            if not isinstance(p, dict):
                continue
            pid = str(p.get("platformPostId") or p.get("_id") or "")
            if pid in seen_ids:
                continue
            seen_ids.add(pid)
            posts_raw.append(p)
            new += 1
        if new == 0 or len(batch) < page_size or len(posts_raw) >= max_posts:
            break

    shaped: List[Dict[str, Any]] = []
    for p in posts_raw:
        sp = _shape_post(p)
        extra = analytics_index.get(sp["id"])
        if extra:
            an = extra["analytics"]
            sp["likes"] = an.get("likes") or sp["likes"]
            sp["comments"] = an.get("comments") or sp["comments"]
            sp["views"] = an.get("views") or an.get("impressions") or sp["views"]
            sp["shares"] = an.get("shares") or sp["shares"]
            sp["saves"] = an.get("saves") or sp["saves"]
            # Freshly-signed media beats stale /posts URLs.
            if extra["thumbnailUrl"]:
                sp["thumbnail_url"] = extra["thumbnailUrl"]
            fresh_items = []
            for mi in extra["mediaItems"]:
                if isinstance(mi, dict) and (mi.get("url") or mi.get("thumbnail")):
                    fresh_items.append(
                        {
                            "type": (mi.get("type") or "").lower(),
                            "url": mi.get("url") or "",
                            "thumbnail": mi.get("thumbnail") or mi.get("url") or "",
                        }
                    )
            if fresh_items:
                sp["media_items"] = fresh_items
                sp["media_url"] = fresh_items[0]["url"] or sp["media_url"]
                if not extra["thumbnailUrl"]:
                    sp["thumbnail_url"] = fresh_items[0]["thumbnail"] or sp["thumbnail_url"]
            if extra["mediaType"]:
                sp["media_type"] = extra["mediaType"].lower()
                sp["is_video"] = sp["media_type"] == "video" or sp["is_video"]
                sp["is_carousel"] = sp["media_type"] == "carousel" or len(sp["media_items"]) > 1
        shaped.append(sp)

    shaped = [p for p in shaped if p["media_url"] or p["thumbnail_url"]]
    shaped.sort(key=lambda p: p.get("published_at") or "", reverse=True)
    _cache_set("ig_posts", shaped, REFRESH_TTL)
    return shaped


async def fetch_stories(account_id: str) -> List[Dict[str, Any]]:
    cached = _cache_get("ig_stories")
    if cached is not None:
        return cached
    data = await _zget(f"/accounts/{account_id}/instagram/stories")
    stories_raw = (data or {}).get("data") or []
    shaped = []
    for s in stories_raw:
        if not isinstance(s, dict):
            continue
        shaped.append(
            {
                "id": s.get("id") or "",
                "media_type": (s.get("mediaType") or "").lower(),
                "media_url": s.get("mediaUrl") or "",
                "thumbnail_url": s.get("thumbnailUrl") or s.get("mediaUrl") or "",
                "permalink": s.get("permalink") or "",
                "timestamp": s.get("timestamp") or "",
            }
        )
    shaped = [s for s in shaped if s["media_url"] or s["thumbnail_url"]]
    _cache_set("ig_stories", shaped, REFRESH_TTL)
    return shaped


# ---------------------------------------------------------------------------
# Media proxy with disk cache (signed IG CDN URLs expire; cached bytes don't)
# ---------------------------------------------------------------------------

def _media_cache_key(url: str) -> str:
    """Key on scheme-less host+path only: signatures rotate, the path is stable."""
    p = urlparse(url)
    return hashlib.sha1(f"{p.netloc}{p.path}".encode()).hexdigest()


def _sniff_content_type(head: bytes) -> str:
    if head[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    if head[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    if head[4:12] in (b"ftypheic", b"ftypheix", b"ftypmif1"):
        return "image/heic"
    if head[4:8] == b"ftyp":
        return "video/mp4"
    if head[:6] in (b"GIF87a", b"GIF89a"):
        return "image/gif"
    if head[:4] == b"RIFF" and head[8:12] == b"WEBP":
        return "image/webp"
    return "application/octet-stream"


@router.get("/api/instagram/media")
async def instagram_media(u: str):
    """Proxy + disk-cache an Instagram CDN asset so it survives URL expiry."""
    host = urlparse(u).netloc.lower()
    if not host or not any(host.endswith(sfx) for sfx in MEDIA_ALLOWED_SUFFIXES):
        return Response(status_code=400)

    os.makedirs(MEDIA_CACHE_DIR, exist_ok=True)
    key = _media_cache_key(u)
    path = os.path.join(MEDIA_CACHE_DIR, key)

    if os.path.isfile(path) and os.path.getsize(path) > 0:
        with open(path, "rb") as f:
            body = f.read()
        return Response(
            content=body,
            media_type=_sniff_content_type(body[:16]),
            headers={"Cache-Control": "public, max-age=86400, stale-while-revalidate=604800"},
        )

    try:
        async with httpx.AsyncClient(follow_redirects=True) as client:
            resp = await client.get(u, timeout=30.0, headers={"User-Agent": _IG_PUBLIC_HEADERS["User-Agent"]})
    except Exception:
        return Response(status_code=502)
    if resp.status_code != 200 or not resp.content or len(resp.content) > MEDIA_MAX_BYTES:
        return Response(status_code=404)

    body = resp.content
    try:
        tmp = f"{path}.tmp-{os.getpid()}"
        with open(tmp, "wb") as f:
            f.write(body)
        os.replace(tmp, path)
    except Exception as e:
        print(f"ig media cache write error: {e}")

    return Response(
        content=body,
        media_type=resp.headers.get("content-type") or _sniff_content_type(body[:16]),
        headers={"Cache-Control": "public, max-age=86400, stale-while-revalidate=604800"},
    )


# ---------------------------------------------------------------------------
# API endpoints
# ---------------------------------------------------------------------------

@router.get("/api/instagram/live")
async def instagram_live_bundle():
    """Everything the homepage section needs in one call."""
    if not _api_key():
        return {"configured": False, "reason": "ZERNIO_API_KEY not set", "profile": None, "stories": [], "posts": []}

    acc = await resolve_account()
    if not acc:
        return {"configured": False, "reason": "no connected Instagram account on Zernio", "profile": None, "stories": [], "posts": []}

    account_id = str(acc.get("_id"))
    username = (acc.get("username") or "").lstrip("@")
    posts, stories, pub = await asyncio.gather(
        fetch_external_posts(account_id),
        fetch_stories(account_id),
        fetch_ig_public_profile(username),
    )
    return {
        "configured": True,
        "profile": _shape_profile(acc, pub),
        "stories": stories,
        "posts": posts,
    }


@router.get("/api/instagram/comments/{post_id}")
async def instagram_post_comments(post_id: str, limit: int = 25):
    if not _api_key():
        return {"configured": False, "comments": []}
    acc = await resolve_account()
    if not acc:
        return {"configured": False, "comments": []}

    cache_key = f"ig_comments:{post_id}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return {"configured": True, "comments": cached}

    data = await _zget(
        f"/inbox/comments/{post_id}",
        {"accountId": str(acc.get("_id")), "limit": max(1, min(limit, 100))},
    )
    comments_raw = (data or {}).get("comments") or []
    shaped = []
    for c in comments_raw:
        if not isinstance(c, dict):
            continue
        frm = c.get("from") or {}
        shaped.append(
            {
                "id": c.get("id") or "",
                "text": c.get("message") or "",
                "created_at": c.get("createdTime") or "",
                "likes": c.get("likeCount") or 0,
                "author": {
                    "username": frm.get("username") or frm.get("name") or "",
                    "avatar": frm.get("picture") or "",
                    "is_owner": bool(frm.get("isOwner")),
                },
                "replies": [
                    {
                        "id": (r or {}).get("id") or "",
                        "text": (r or {}).get("message") or "",
                        "author": {
                            "username": ((r or {}).get("from") or {}).get("username") or "",
                            "avatar": ((r or {}).get("from") or {}).get("picture") or "",
                            "is_owner": bool(((r or {}).get("from") or {}).get("isOwner")),
                        },
                    }
                    for r in (c.get("replies") or [])
                    if isinstance(r, dict)
                ],
            }
        )
    _cache_set(cache_key, shaped, COMMENTS_TTL)
    return {"configured": True, "comments": shaped}


@router.post("/api/instagram/refresh")
async def instagram_refresh():
    """Clear caches so the next bundle call re-fetches from Zernio."""
    for k in list(_cache.keys()):
        if k.startswith("ig_"):
            _cache.pop(k, None)
    return {"ok": True}
