"""Generate embeddings via Mistral API for pgVector storage."""

import httpx
from config import settings


def build_article_text(titel: str, lead: str | None, body: str | None) -> str:
    """Combine article fields into a single text for embedding."""
    parts = [titel]
    if lead:
        parts.append(lead)
    if body:
        # Truncate body to avoid token limits (~ first 2000 chars)
        parts.append(body[:2000])
    return "\n\n".join(parts)


async def generate_embedding(text: str) -> list[float] | None:
    """Generate a 1024-dim embedding via Mistral API. Returns vector or None."""
    if not settings.mistral_api_key:
        return None

    async with httpx.AsyncClient(timeout=30) as client:
        try:
            resp = await client.post(
                "https://api.mistral.ai/v1/embeddings",
                headers={
                    "Authorization": f"Bearer {settings.mistral_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "mistral-embed",
                    "input": [text],
                },
            )
            resp.raise_for_status()
            data = resp.json()
            return data["data"][0]["embedding"]
        except Exception:
            return None
