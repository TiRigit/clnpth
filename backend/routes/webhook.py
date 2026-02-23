from datetime import datetime

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from db.models import RedaktionsLog, ArtikelArchiv, ArtikelUebersetzung, SupervisorLog
from db.session import get_db
from db.schemas import N8nCallback
from ws import manager

router = APIRouter(prefix="/api/webhook", tags=["webhook"])


def verify_webhook_token(x_webhook_token: str = Header(None)):
    """Validates the x-webhook-token header against the configured token."""
    expected = settings.n8n_webhook_token
    if not expected:
        return  # No token configured — skip validation (dev mode)
    if x_webhook_token != expected:
        raise HTTPException(status_code=401, detail="Invalid or missing webhook token")


@router.post("/n8n")
async def n8n_callback(
    payload: N8nCallback,
    db: AsyncSession = Depends(get_db),
    _token: None = Depends(verify_webhook_token),
):
    """Receives callbacks from n8n after each pipeline step."""
    result = await db.execute(
        select(RedaktionsLog).where(RedaktionsLog.id == payload.artikel_id)
    )
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Artikel nicht gefunden")

    # Update status
    row.status = payload.status
    row.aktualisiert_am = datetime.utcnow()

    # Update title if provided
    if payload.titel:
        row.titel = payload.titel

    # Upsert article archive content
    if payload.body or payload.lead:
        result = await db.execute(
            select(ArtikelArchiv).where(ArtikelArchiv.redaktions_log_id == row.id)
        )
        archiv = result.scalar_one_or_none()
        if not archiv:
            archiv = ArtikelArchiv(redaktions_log_id=row.id, titel=row.titel)
            db.add(archiv)
        if payload.titel:
            archiv.titel = payload.titel
        if payload.lead:
            archiv.lead = payload.lead
        if payload.body:
            archiv.body = payload.body
        if payload.quellen:
            archiv.quellen = payload.quellen
        if payload.seo_titel:
            archiv.seo_titel = payload.seo_titel
        if payload.seo_description:
            archiv.seo_description = payload.seo_description
        if payload.bild_prompt:
            archiv.bild_prompt = payload.bild_prompt

    # Upsert translations
    if payload.translations:
        for lang, data in payload.translations.items():
            result = await db.execute(
                select(ArtikelUebersetzung).where(
                    ArtikelUebersetzung.artikel_id == row.id,
                    ArtikelUebersetzung.sprache == lang,
                )
            )
            trans = result.scalar_one_or_none()
            if not trans:
                trans = ArtikelUebersetzung(artikel_id=row.id, sprache=lang)
                db.add(trans)
            trans.titel = data.get("titel", trans.titel)
            trans.lead = data.get("lead", trans.lead)
            trans.body = data.get("body", trans.body)
            trans.status = data.get("status", trans.status)

    # Upsert supervisor result
    if payload.supervisor:
        sv = SupervisorLog(
            artikel_id=row.id,
            supervisor_empfehlung=payload.supervisor.get("empfehlung"),
            supervisor_begruendung=payload.supervisor.get("begruendung"),
            supervisor_score=payload.supervisor.get("score"),
            tonality_tags=payload.supervisor.get("tonality_tags"),
        )
        db.add(sv)

    # Broadcast status update via WebSocket
    await manager.broadcast("article:updated", {
        "id": row.id,
        "titel": row.titel,
        "status": row.status,
    })

    return {"ok": True, "artikel_id": row.id, "status": row.status}
