"""DeepL API client for structural translation (DE → EN/ES/FR).

DeepL is EU-based (Cologne) and handles HTML tag preservation natively.
"""

import httpx
from config import settings

# DeepL language codes (target)
LANG_MAP = {
    "en": "EN-US",
    "es": "ES",
    "fr": "FR",
}


async def translate_text(
    text: str,
    target_lang: str,
    source_lang: str = "DE",
    tag_handling: str = "html",
) -> str | None:
    """Translate text via DeepL API. Returns translated text or None on failure."""
    if not settings.deepl_api_key:
        return None

    deepl_target = LANG_MAP.get(target_lang, target_lang.upper())

    async with httpx.AsyncClient(timeout=30) as client:
        try:
            resp = await client.post(
                f"{settings.deepl_api_url}/translate",
                headers={"Authorization": f"DeepL-Auth-Key {settings.deepl_api_key}"},
                data={
                    "text": text,
                    "source_lang": source_lang,
                    "target_lang": deepl_target,
                    "tag_handling": tag_handling,
                    "split_sentences": "nonewlines",
                },
            )
            resp.raise_for_status()
            result = resp.json()
            return result["translations"][0]["text"]
        except Exception:
            return None


async def translate_article(
    titel: str,
    lead: str,
    body: str,
    target_lang: str,
) -> dict[str, str | None]:
    """Translate all article fields to target language."""
    titel_t = await translate_text(titel, target_lang, tag_handling="")
    lead_t = await translate_text(lead, target_lang, tag_handling="")
    body_t = await translate_text(body, target_lang, tag_handling="html")

    return {
        "titel": titel_t,
        "lead": lead_t,
        "body": body_t,
    }
