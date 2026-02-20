"""Generate social media snippets via Mistral API."""

import json

import httpx
from config import settings
from services.prompt_loader import render_prompt


async def generate_social_snippets(
    titel: str,
    lead: str,
    body: str,
    url: str = "",
) -> list[dict] | None:
    """Generate Twitter/LinkedIn/Instagram/Facebook snippets. Returns list of platform dicts or None."""
    if not settings.mistral_api_key:
        return None

    body_excerpt = body[:1000] if body else ""
    prompt = render_prompt("social", titel=titel, lead=lead, body_excerpt=body_excerpt, url=url)

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                "https://api.mistral.ai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.mistral_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": settings.mistral_model,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.3,
                    "response_format": {"type": "json_object"},
                },
            )
            resp.raise_for_status()
            content = resp.json()["choices"][0]["message"]["content"]
            data = json.loads(content)

            snippets = []
            for platform in ("twitter", "linkedin", "instagram", "facebook"):
                if platform in data:
                    snippets.append({
                        "platform": platform,
                        "text": data[platform].get("text", ""),
                        "hashtags": data[platform].get("hashtags", []),
                    })
            return snippets
    except Exception:
        return None
