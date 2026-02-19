import asyncio
from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import RedaktionsLog, ArtikelArchiv, ArtikelUebersetzung
from db.session import get_db, async_session
from db.schemas import TranslationResponse
from services.translation_pipeline import run_translation_pipeline
from ws import manager

router = APIRouter(prefix="/api/articles/{article_id}/translations", tags=["translations"])


class TranslationTrigger(BaseModel):
    languages: list[str] | None = None  # None = all active languages


class TranslationEdit(BaseModel):
    titel: str | None = None
    lead: str | None = None
    body: str | None = None


@router.post("/trigger")
async def trigger_translations(
    article_id: int,
    payload: TranslationTrigger,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Trigger DeepL + Mistral translation pipeline for specified languages."""
    result = await db.execute(
        select(RedaktionsLog).where(RedaktionsLog.id == article_id)
    )
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Artikel nicht gefunden")

    # Check article has content
    archiv_result = await db.execute(
        select(ArtikelArchiv).where(ArtikelArchiv.redaktions_log_id == article_id)
    )
    archiv = archiv_result.scalar_one_or_none()
    if not archiv or not archiv.body:
        raise HTTPException(status_code=400, detail="Artikel hat noch keinen Inhalt")

    # Determine languages to translate
    if payload.languages:
        languages = [l for l in payload.languages if l != "de"]
    elif row.sprachen:
        languages = [l for l, active in row.sprachen.items() if active and l != "de"]
    else:
        languages = ["en", "es", "fr"]

    if not languages:
        raise HTTPException(status_code=400, detail="Keine Zielsprachen angegeben")

    # Start pipeline in background
    background_tasks.add_task(
        run_translation_pipeline,
        artikel_id=article_id,
        languages=languages,
        session_factory=async_session,
    )

    return {"ok": True, "artikel_id": article_id, "languages": languages}


@router.get("/", response_model=list[TranslationResponse])
async def list_translations(
    article_id: int,
    db: AsyncSession = Depends(get_db),
):
    """List all translations for an article."""
    result = await db.execute(
        select(ArtikelUebersetzung)
        .where(ArtikelUebersetzung.artikel_id == article_id)
        .order_by(ArtikelUebersetzung.sprache)
    )
    return result.scalars().all()


@router.get("/{lang}", response_model=TranslationResponse)
async def get_translation(
    article_id: int,
    lang: str,
    db: AsyncSession = Depends(get_db),
):
    """Get a specific translation."""
    result = await db.execute(
        select(ArtikelUebersetzung).where(
            ArtikelUebersetzung.artikel_id == article_id,
            ArtikelUebersetzung.sprache == lang,
        )
    )
    trans = result.scalar_one_or_none()
    if not trans:
        raise HTTPException(status_code=404, detail=f"Übersetzung '{lang}' nicht gefunden")
    return trans


@router.patch("/{lang}", response_model=TranslationResponse)
async def edit_translation(
    article_id: int,
    lang: str,
    payload: TranslationEdit,
    db: AsyncSession = Depends(get_db),
):
    """Manually edit a translation (reviewer corrections)."""
    result = await db.execute(
        select(ArtikelUebersetzung).where(
            ArtikelUebersetzung.artikel_id == article_id,
            ArtikelUebersetzung.sprache == lang,
        )
    )
    trans = result.scalar_one_or_none()
    if not trans:
        raise HTTPException(status_code=404, detail=f"Übersetzung '{lang}' nicht gefunden")

    if payload.titel is not None:
        trans.titel = payload.titel
    if payload.lead is not None:
        trans.lead = payload.lead
    if payload.body is not None:
        trans.body = payload.body
    trans.status = "approved"

    await manager.broadcast("translation:updated", {
        "artikel_id": article_id, "sprache": lang, "status": "approved",
    })

    return trans


@router.post("/{lang}/approve")
async def approve_translation(
    article_id: int,
    lang: str,
    db: AsyncSession = Depends(get_db),
):
    """Approve a translation without changes."""
    result = await db.execute(
        select(ArtikelUebersetzung).where(
            ArtikelUebersetzung.artikel_id == article_id,
            ArtikelUebersetzung.sprache == lang,
        )
    )
    trans = result.scalar_one_or_none()
    if not trans:
        raise HTTPException(status_code=404, detail=f"Übersetzung '{lang}' nicht gefunden")

    trans.status = "approved"

    await manager.broadcast("translation:updated", {
        "artikel_id": article_id, "sprache": lang, "status": "approved",
    })

    return {"ok": True, "sprache": lang, "status": "approved"}
