"""
Live Instagram preview backed by the Zernio API (read-only).

Uses only fetch endpoints:
  GET /v1/accounts                                    -> profile (username, avatar, followers)
  GET /v1/posts?source=external&platform=instagram    -> real posts/reels published on IG
  GET /v1/accounts/{id}/instagram/stories             -> currently-active stories
  GET /v1/inbox/comments/{postId}?accountId=...       -> comments for one post
  POST /v1/posts/sync-external                        -> on-demand refresh of latest posts

Configuration (env, .env.local):
  ZERNIO_API_KEY        required for live data
  ZERNIO_IG_ACCOUNT_ID  optional; auto-resolved from /v1/accounts when omitted

All responses are cached in-process with short TTLs so the public site never
hammers Zernio (feed 5 min, stories 5 min, profile 15 min, comments 2 min).
"""

import os
import time
import asyncio
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter

ZERNIO_BASE = os.getenv("ZERNIO_API_BASE", "https://zernio.com/api/v1").rstrip("/")

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
            resp = await client.get(url, params=params or {}, headers=headers, timeout=20.0)
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

    _cache_set("ig_account", ig or {}, 900)
    return ig


def _shape_profile(acc: Dict[str, Any]) -> Dict[str, Any]:
    stats = acc.get("accountStats") or {}
    return {
        "account_id": acc.get("_id") or "",
        "username": (acc.get("username") or "").lstrip("@"),
        "display_name": acc.get("displayName") or acc.get("username") or "",
        "avatar": acc.get("profilePicture") or "",
        "profile_url": acc.get("profileUrl") or (f"https://www.instagram.com/{(acc.get('username') or '').lstrip('@')}/" if acc.get("username") else ""),
        "followers": acc.get("followersCount") or acc.get("currentFollowers") or 0,
        "following": stats.get("followingCount") or 0,
        "media_count": stats.get("mediaCount") or 0,
    }


def _shape_post(p: Dict[str, Any]) -> Dict[str, Any]:
    analytics = p.get("analytics") or {}
    media_type = (p.get("mediaType") or "").lower()
    permalink = p.get("platformPostUrl") or ""
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
    return {
        "id": p.get("platformPostId") or p.get("_id") or "",
        "caption": p.get("content") or "",
        "permalink": permalink,
        "published_at": p.get("publishedAt") or "",
        "media_type": media_type or ("video" if is_reel else "image"),
        "is_video": is_reel,
        "is_carousel": media_type == "carousel" or len(media_items) > 1,
        "media_url": p.get("mediaUrl") or (media_items[0]["url"] if media_items else ""),
        "thumbnail_url": p.get("thumbnailUrl") or (media_items[0]["thumbnail"] if media_items else ""),
        "media_items": media_items,
        "likes": analytics.get("likes") or 0,
        "comments": analytics.get("comments") or 0,
        "views": analytics.get("views") or 0,
    }


async def sync_external_posts(account_id: str) -> None:
    """Ask Zernio to re-sync the latest IG posts (rate-limited to once per hour)."""
    if _cache_get("ig_synced"):
        return
    _cache_set("ig_synced", True, 3600)
    await _zpost("/posts/sync-external", {"accountId": account_id, "platform": "instagram"})


async def fetch_external_posts(account_id: str, max_posts: int = 500) -> List[Dict[str, Any]]:
    """Fetch the FULL external post history, paginating until Zernio runs out."""
    cached = _cache_get("ig_posts")
    if cached is not None:
        return cached

    await sync_external_posts(account_id)

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
        # Stop on a short/duplicate-only page (last page reached).
        if new == 0 or len(batch) < page_size or len(posts_raw) >= max_posts:
            break

    shaped = [_shape_post(p) for p in posts_raw]
    shaped = [p for p in shaped if p["media_url"] or p["thumbnail_url"]]
    shaped.sort(key=lambda p: p.get("published_at") or "", reverse=True)
    _cache_set("ig_posts", shaped, 300)
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
    _cache_set("ig_stories", shaped, 300)
    return shaped


@router.get("/api/instagram/live")
async def instagram_live_bundle():
    """Everything the homepage section needs in one call."""
    if not _api_key():
        return {"configured": False, "reason": "ZERNIO_API_KEY not set", "profile": None, "stories": [], "posts": []}

    acc = await resolve_account()
    if not acc:
        return {"configured": False, "reason": "no connected Instagram account on Zernio", "profile": None, "stories": [], "posts": []}

    account_id = str(acc.get("_id"))
    posts, stories = await asyncio.gather(
        fetch_external_posts(account_id),
        fetch_stories(account_id),
    )
    return {
        "configured": True,
        "profile": _shape_profile(acc),
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
    _cache_set(cache_key, shaped, 120)
    return {"configured": True, "comments": shaped}


@router.post("/api/instagram/refresh")
async def instagram_refresh():
    """Clear caches so the next bundle call re-fetches from Zernio."""
    for k in list(_cache.keys()):
        if k.startswith("ig_"):
            _cache.pop(k, None)
    return {"ok": True}
