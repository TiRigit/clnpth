"""Mistral API client for idiomatic translation review.

Mistral Large (Paris, EU) reviews DeepL translations for natural phrasing,
cultural accuracy, and idiomatic quality. Returns improved text + feedback.
"""

import json
import httpx
from config import settings

REVIEW_PROMPT = """Du bist ein professioneller Übersetzer-Reviewer.
Prüfe die folgende maschinelle Übersetzung auf:
1. Idiomatische Korrektheit (natürlicher Sprachfluss)
2. Kulturelle Angemessenheit
3. Fachterminologie
4. HTML-Tag-Integrität

Originaltext (Deutsch):
{original}

Maschinelle Übersetzung ({lang}):
{translation}

Antworte ausschließlich als JSON:
{{
  "improved": "verbesserte Übersetzung (oder original falls gut)",
  "changes": ["Liste der Änderungen mit Begründung"],
  "quality_score": 0-100,
  "needs_revision": true/false
}}"""


async def review_translation(
    original: str,
    translation: str,
    target_lang: str,
) -> dict | None:
    """Review a DeepL translation with Mistral Large. Returns review result or None."""
    if not settings.mistral_api_key:
        return None

    lang_names = {"en": "Englisch", "es": "Spanisch", "fr": "Französisch"}
    lang_name = lang_names.get(target_lang, target_lang)

    prompt = REVIEW_PROMPT.format(
        original=original,
        translation=translation,
        lang=lang_name,
    )

    async with httpx.AsyncClient(timeout=60) as client:
        try:
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


async def review_article_translation(
    original_titel: str,
    original_lead: str,
    original_body: str,
    translated_titel: str,
    translated_lead: str,
    translated_body: str,
    target_lang: str,
) -> dict[str, dict | None]:
    """Review all article fields. Returns dict with titel/lead/body review results."""
    titel_review = await review_translation(original_titel, translated_titel, target_lang)
    lead_review = await review_translation(original_lead, translated_lead, target_lang)
    body_review = await review_translation(original_body, translated_body, target_lang)

    return {
        "titel": titel_review,
        "lead": lead_review,
        "body": body_review,
    }
