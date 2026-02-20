"""Supervisor agent using Mistral Large (EU, Paris).

Evaluates article quality, tonality, factual consistency.
Returns score, recommendation, reasoning, and tonality tags.
"""

import json

import httpx
from config import settings
from services.prompt_loader import render_prompt


async def evaluate_article(
    titel: str,
    lead: str,
    body: str,
    kategorie: str | None = None,
    tonality_profile: str = "Noch kein Profil definiert.",
) -> dict | None:
    """Evaluate article quality via Mistral Large. Returns evaluation dict or None."""
    if not settings.mistral_api_key:
        return None

    prompt = render_prompt(
        "evaluation",
        titel=titel,
        lead=lead,
        body=body,
        kategorie=kategorie or "Allgemein",
        tonality_context="Sachlich, informativ, zugänglich.",
        tonality_profile=tonality_profile,
    )

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
                    "temperature": 0.1,
                    "response_format": {"type": "json_object"},
                },
            )
            resp.raise_for_status()
            content = resp.json()["choices"][0]["message"]["content"]
            return json.loads(content)
    except Exception:
        return None


async def build_tonality_context(profile_entries: list[dict]) -> str:
    """Build tonality context string from DB profile entries."""
    if not profile_entries:
        return "Noch kein Profil definiert. Verwende Standardwerte: sachlich, informativ, zugänglich."

    lines = []
    for entry in sorted(profile_entries, key=lambda e: e.get("gewichtung", 0), reverse=True):
        merkmal = entry["merkmal"]
        wert = entry.get("wert", "")
        gewichtung = entry.get("gewichtung", 0.5)
        lines.append(f"- {merkmal}: {wert} (Gewicht: {gewichtung:.1f}, Belege: {entry.get('belege', 0)})")

    return "\n".join(lines)
