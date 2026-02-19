"""WordPress REST API client for article publication.

Publishes articles + translations via WP REST API v2.
Supports featured image upload and SEO metadata (Yoast/RankMath compatible).
Authentication via Application Passwords (WP 5.6+).
"""

import base64
from pathlib import Path

import httpx
from config import settings


def _auth_header() -> dict[str, str]:
    """Build Basic Auth header from WP Application Password."""
    if not settings.wp_user or not settings.wp_app_password:
        return {}
    credentials = base64.b64encode(
        f"{settings.wp_user}:{settings.wp_app_password}".encode()
    ).decode()
    return {"Authorization": f"Basic {credentials}"}


def _is_configured() -> bool:
    return bool(settings.wp_url and settings.wp_user and settings.wp_app_password)


async def publish_post(
    title: str,
    content: str,
    excerpt: str = "",
    status: str = "draft",
    categories: list[int] | None = None,
    tags: list[int] | None = None,
    featured_media: int | None = None,
    meta: dict | None = None,
    lang: str | None = None,
) -> dict | None:
    """Create a WordPress post. Returns WP post data or None on failure."""
    if not _is_configured():
        return None

    payload: dict = {
        "title": title,
        "content": content,
        "excerpt": excerpt,
        "status": status,
    }
    if categories:
        payload["categories"] = categories
    if tags:
        payload["tags"] = tags
    if featured_media:
        payload["featured_media"] = featured_media
    if meta:
        payload["meta"] = meta
    # WPML/Polylang language parameter
    if lang:
        payload["lang"] = lang

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{settings.wp_url}/posts",
                headers={**_auth_header(), "Content-Type": "application/json"},
                json=payload,
            )
            resp.raise_for_status()
            return resp.json()
    except Exception:
        return None


async def update_post(
    post_id: int,
    title: str | None = None,
    content: str | None = None,
    excerpt: str | None = None,
    status: str | None = None,
    meta: dict | None = None,
) -> dict | None:
    """Update an existing WordPress post."""
    if not _is_configured():
        return None

    payload: dict = {}
    if title is not None:
        payload["title"] = title
    if content is not None:
        payload["content"] = content
    if excerpt is not None:
        payload["excerpt"] = excerpt
    if status is not None:
        payload["status"] = status
    if meta is not None:
        payload["meta"] = meta

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{settings.wp_url}/posts/{post_id}",
                headers={**_auth_header(), "Content-Type": "application/json"},
                json=payload,
            )
            resp.raise_for_status()
            return resp.json()
    except Exception:
        return None


async def upload_media(
    image_path: str,
    alt_text: str = "",
    caption: str = "",
) -> dict | None:
    """Upload an image to WordPress media library. Returns media data or None."""
    if not _is_configured():
        return None

    filepath = Path(image_path)
    if not filepath.exists():
        return None

    content_type = "image/png" if filepath.suffix == ".png" else "image/jpeg"

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                f"{settings.wp_url}/media",
                headers={
                    **_auth_header(),
                    "Content-Disposition": f'attachment; filename="{filepath.name}"',
                    "Content-Type": content_type,
                },
                content=filepath.read_bytes(),
            )
            resp.raise_for_status()
            media = resp.json()

            # Set alt text if provided
            if alt_text and media.get("id"):
                await client.post(
                    f"{settings.wp_url}/media/{media['id']}",
                    headers={**_auth_header(), "Content-Type": "application/json"},
                    json={"alt_text": alt_text, "caption": caption},
                )

            return media
    except Exception:
        return None


async def get_categories() -> list[dict]:
    """Fetch WordPress categories."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"{settings.wp_url}/categories",
                headers=_auth_header(),
                params={"per_page": 100},
            )
            resp.raise_for_status()
            return resp.json()
    except Exception:
        return []


async def check_connection() -> bool:
    """Verify WordPress REST API is reachable and authenticated."""
    if not _is_configured():
        return False
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(
                f"{settings.wp_url}/users/me",
                headers=_auth_header(),
            )
            return resp.status_code == 200
    except Exception:
        return False
