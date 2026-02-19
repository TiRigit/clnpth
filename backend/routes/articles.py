from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from db.models import RedaktionsLog, ArtikelArchiv, ArtikelUebersetzung, SupervisorLog
from db.session import get_db
from db.schemas import (
    ArticleCreate, ArticleApprove, ArticleRevise,
    ArticleListItem, ArticleDetail, TranslationResponse,
    SupervisorResponse, QueueStats,
)
from services.n8n_client import trigger_article_generation
from ws import manager

router = APIRouter(prefix="/api/articles", tags=["articles"])


@router.post("/", response_model=ArticleListItem, status_code=201)
async def create_article(article: ArticleCreate, db: AsyncSession = Depends(get_db)):
    row = RedaktionsLog(
        titel=article.text[:120] if article.text else "Neuer Artikel",
        trigger_typ=article.trigger_typ,
        status="generating",
        kategorie=article.kategorie,
        sprachen=article.sprachen,
        kontext_quellen={"urls": article.urls} if article.urls else None,
    )
    db.add(row)
    await db.flush()

    # Trigger n8n pipeline (non-blocking — failure is OK)
    await trigger_article_generation(
        artikel_id=row.id,
        trigger_typ=article.trigger_typ,
        text=article.text,
        kategorie=article.kategorie,
        sprachen=article.sprachen,
        urls=article.urls,
        bild_typ=article.bild_typ,
    )

    await manager.broadcast("article:created", {
        "id": row.id, "titel": row.titel, "status": row.status,
    })

    return row


@router.get("/", response_model=list[ArticleListItem])
async def list_articles(
    status: str | None = None,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    q = select(RedaktionsLog).order_by(RedaktionsLog.erstellt_am.desc())
    if status:
        q = q.where(RedaktionsLog.status == status)
    q = q.limit(limit).offset(offset)
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/stats", response_model=QueueStats)
async def queue_stats(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(RedaktionsLog.status, func.count(RedaktionsLog.id))
        .group_by(RedaktionsLog.status)
    )
    counts = dict(result.all())
    return QueueStats(
        total=sum(counts.values()),
        generating=counts.get("generating", 0),
        translating=counts.get("translating", 0),
        review=counts.get("review", 0),
        published=counts.get("published", 0),
        rejected=counts.get("rejected", 0),
    )


@router.get("/{article_id}", response_model=ArticleDetail)
async def get_article(article_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(RedaktionsLog)
        .where(RedaktionsLog.id == article_id)
        .options(
            selectinload(RedaktionsLog.archiv_eintrag),
            selectinload(RedaktionsLog.uebersetzungen),
            selectinload(RedaktionsLog.supervisor_logs),
        )
    )
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Artikel nicht gefunden")

    archiv = row.archiv_eintrag
    latest_sv = row.supervisor_logs[-1] if row.supervisor_logs else None

    return ArticleDetail(
        id=row.id,
        titel=row.titel,
        status=row.status,
        kategorie=row.kategorie,
        sprachen=row.sprachen,
        trigger_typ=row.trigger_typ,
        erstellt_am=row.erstellt_am,
        aktualisiert_am=row.aktualisiert_am,
        lead=archiv.lead if archiv else None,
        body=archiv.body if archiv else None,
        quellen=archiv.quellen if archiv else None,
        seo_titel=archiv.seo_titel if archiv else None,
        seo_description=archiv.seo_description if archiv else None,
        bild_url=archiv.bild_url if archiv else None,
        bild_prompt=archiv.bild_prompt if archiv else None,
        translations=[
            TranslationResponse.model_validate(t) for t in row.uebersetzungen
        ],
        supervisor=SupervisorResponse.model_validate(latest_sv) if latest_sv else None,
    )


@router.patch("/{article_id}/approve", response_model=ArticleListItem)
async def approve_article(
    article_id: int,
    body: ArticleApprove,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(RedaktionsLog).where(RedaktionsLog.id == article_id)
    )
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Artikel nicht gefunden")
    if row.status not in ("review", "generating"):
        raise HTTPException(status_code=400, detail=f"Artikel im Status '{row.status}' kann nicht freigegeben werden")

    row.status = "published"
    row.aktualisiert_am = datetime.utcnow()

    # Log supervisor decision
    latest_sv = await db.execute(
        select(SupervisorLog)
        .where(SupervisorLog.artikel_id == article_id)
        .order_by(SupervisorLog.erstellt_am.desc())
        .limit(1)
    )
    sv = latest_sv.scalar_one_or_none()
    if sv:
        sv.redakteur_entscheidung = "freigeben"
        sv.redakteur_feedback = body.feedback
        sv.abweichung = sv.supervisor_empfehlung != "freigeben"

    await manager.broadcast("article:approved", {
        "id": row.id, "titel": row.titel,
    })

    return row


@router.patch("/{article_id}/revise", response_model=ArticleListItem)
async def revise_article(
    article_id: int,
    body: ArticleRevise,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(RedaktionsLog).where(RedaktionsLog.id == article_id)
    )
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Artikel nicht gefunden")

    row.status = "generating"
    row.aktualisiert_am = datetime.utcnow()

    # Log supervisor decision
    latest_sv = await db.execute(
        select(SupervisorLog)
        .where(SupervisorLog.artikel_id == article_id)
        .order_by(SupervisorLog.erstellt_am.desc())
        .limit(1)
    )
    sv = latest_sv.scalar_one_or_none()
    if sv:
        sv.redakteur_entscheidung = "ueberarbeiten"
        sv.redakteur_feedback = body.feedback
        sv.abweichung = sv.supervisor_empfehlung != "ueberarbeiten"

    # Re-trigger n8n with feedback
    await trigger_article_generation(
        artikel_id=row.id,
        trigger_typ=row.trigger_typ,
        text=body.feedback or "",
        kategorie=row.kategorie,
        sprachen=row.sprachen or {},
        urls=[],
        bild_typ=None,
    )

    await manager.broadcast("article:revised", {
        "id": row.id, "titel": row.titel,
    })

    return row
