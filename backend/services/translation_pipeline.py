"""Translation pipeline: DeepL (structure) → Mistral (idiomatics).

Runs asynchronously per language. Updates DB + broadcasts via WebSocket.
"""

import asyncio
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import ArtikelArchiv, ArtikelUebersetzung, RedaktionsLog
from services.deepl_client import translate_article
from services.mistral_client import review_article_translation
from ws import manager


async def run_translation_pipeline(
    artikel_id: int,
    languages: list[str],
    session_factory,
):
    """Run DeepL + Mistral review for each language. Non-blocking background task."""
    async with session_factory() as db:
        # Load article content
        result = await db.execute(
            select(ArtikelArchiv).where(ArtikelArchiv.redaktions_log_id == artikel_id)
        )
        archiv = result.scalar_one_or_none()
        if not archiv or not archiv.body:
            return

        # Update article status
        log_result = await db.execute(
            select(RedaktionsLog).where(RedaktionsLog.id == artikel_id)
        )
        log = log_result.scalar_one_or_none()
        if log:
            log.status = "translating"
            log.aktualisiert_am = datetime.utcnow()

        await db.commit()

        await manager.broadcast("article:updated", {
            "id": artikel_id, "status": "translating",
        })

    # Translate each language concurrently
    async def translate_lang(lang: str):
        # Step 1: DeepL
        deepl_result = await translate_article(
            titel=archiv.titel,
            lead=archiv.lead or "",
            body=archiv.body,
            target_lang=lang,
        )

        async with session_factory() as db:
            # Upsert translation record
            result = await db.execute(
                select(ArtikelUebersetzung).where(
                    ArtikelUebersetzung.artikel_id == artikel_id,
                    ArtikelUebersetzung.sprache == lang,
                )
            )
            trans = result.scalar_one_or_none()
            if not trans:
                trans = ArtikelUebersetzung(artikel_id=artikel_id, sprache=lang)
                db.add(trans)

            if deepl_result["titel"]:
                trans.titel = deepl_result["titel"]
            if deepl_result["lead"]:
                trans.lead = deepl_result["lead"]
            if deepl_result["body"]:
                trans.body = deepl_result["body"]
            trans.status = "deepl_done"

            await db.commit()

        await manager.broadcast("translation:updated", {
            "artikel_id": artikel_id, "sprache": lang, "status": "deepl_done",
        })

        # Step 2: Mistral review (if API key configured)
        if deepl_result["body"]:
            review = await review_article_translation(
                original_titel=archiv.titel,
                original_lead=archiv.lead or "",
                original_body=archiv.body,
                translated_titel=deepl_result["titel"] or "",
                translated_lead=deepl_result["lead"] or "",
                translated_body=deepl_result["body"],
                target_lang=lang,
            )

            async with session_factory() as db:
                result = await db.execute(
                    select(ArtikelUebersetzung).where(
                        ArtikelUebersetzung.artikel_id == artikel_id,
                        ArtikelUebersetzung.sprache == lang,
                    )
                )
                trans = result.scalar_one_or_none()
                if trans and review.get("body"):
                    body_review = review["body"]
                    if body_review and body_review.get("improved"):
                        trans.body = body_review["improved"]
                    if review.get("titel") and review["titel"].get("improved"):
                        trans.titel = review["titel"]["improved"]
                    if review.get("lead") and review["lead"].get("improved"):
                        trans.lead = review["lead"]["improved"]
                    trans.status = "reviewed"
                    await db.commit()

            await manager.broadcast("translation:updated", {
                "artikel_id": artikel_id, "sprache": lang, "status": "reviewed",
            })

    # Run all languages concurrently
    await asyncio.gather(
        *(translate_lang(lang) for lang in languages),
        return_exceptions=True,
    )

    # Update article status to review (all translations done)
    async with session_factory() as db:
        log_result = await db.execute(
            select(RedaktionsLog).where(RedaktionsLog.id == artikel_id)
        )
        log = log_result.scalar_one_or_none()
        if log and log.status == "translating":
            log.status = "review"
            log.aktualisiert_am = datetime.utcnow()
            await db.commit()

    await manager.broadcast("article:updated", {
        "id": artikel_id, "status": "review",
    })
