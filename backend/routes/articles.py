import hashlib
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from db.models import RedaktionsLog, ArtikelArchiv, ArtikelUebersetzung, SupervisorLog
from db.session import get_db
from services.learning_strategy import process_editor_decision
from db.schemas import (
    ArticleCreate, ArticleApprove, ArticleRevise,
    ArticleListItem, ArticleDetail, TranslationResponse,
    SupervisorResponse, QueueStats,
    BulkArticleCreate, BulkArticleResponse,
    TopicItem,
)
from services.feature_flags import require_feature
from services.n8n_client import trigger_article_generation
from ws import manager


def compute_content_hash(trigger_typ: str, text: str, urls: list[str]) -> str:
    """Compute SHA-256 hash for duplicate detection."""
    raw = f"{trigger_typ}:{text}:{sorted(urls)}"
    return hashlib.sha256(raw.encode()).hexdigest()

router = APIRouter(prefix="/api/articles", tags=["articles"])


@router.post("/", response_model=ArticleListItem, status_code=201)
async def create_article(article: ArticleCreate, db: AsyncSession = Depends(get_db)):
    # Duplikat-Erkennung
    content_hash = compute_content_hash(article.trigger_typ, article.text, article.urls)
    existing = await db.execute(
        select(RedaktionsLog)
        .where(
            RedaktionsLog.content_hash == content_hash,
            RedaktionsLog.status.notin_(["failed", "cancelled"]),
        )
    )
    duplicate = existing.scalar_one_or_none()
    if duplicate:
        raise HTTPException(
            status_code=409,
            detail=f"Duplikat erkannt: Artikel #{duplicate.id} ('{duplicate.titel}')",
        )

    # kontext_quellen mit optionalem tone_of_voice aufbauen
    kontext: dict = {}
    if article.urls:
        kontext["urls"] = article.urls
    if article.tone_of_voice:
        kontext["tone_of_voice"] = article.tone_of_voice

    row = RedaktionsLog(
        titel=article.text[:120] if article.text else "Neuer Artikel",
        trigger_typ=article.trigger_typ,
        status="generating",
        kategorie=article.kategorie,
        sprachen=article.sprachen,
        kontext_quellen=kontext or None,
        content_hash=content_hash,
        timeout_at=datetime.utcnow() + timedelta(minutes=10),
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
        tone_of_voice=article.tone_of_voice,
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
        failed=counts.get("failed", 0),
        timeout=counts.get("timeout", 0),
        paused=counts.get("paused", 0),
        cancelled=counts.get("cancelled", 0),
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

    # Update learning systems (tonality profile, topic ranking, deviation tracking)
    await process_editor_decision(db, article_id, "freigeben", body.feedback)

    # Generate embedding for approved article
    archiv_result = await db.execute(
        select(ArtikelArchiv).where(ArtikelArchiv.redaktions_log_id == article_id)
    )
    archiv = archiv_result.scalar_one_or_none()
    if archiv and not archiv.embedding:
        from services.embedding_client import generate_embedding, build_article_text
        text = build_article_text(row.titel, archiv.lead, archiv.body)
        embedding = await generate_embedding(text)
        if embedding:
            archiv.embedding = embedding

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

    # Update learning systems
    await process_editor_decision(db, article_id, "ueberarbeiten", body.feedback)

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


@router.patch("/{article_id}/cancel", response_model=ArticleListItem)
async def cancel_article(article_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(RedaktionsLog).where(RedaktionsLog.id == article_id)
    )
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Artikel nicht gefunden")
    if row.status not in ("generating", "paused"):
        raise HTTPException(status_code=400, detail=f"Artikel im Status '{row.status}' kann nicht abgebrochen werden")

    row.status = "cancelled"
    row.aktualisiert_am = datetime.utcnow()

    await manager.broadcast("article:cancelled", {"id": row.id, "titel": row.titel})
    return row


@router.patch("/{article_id}/retry", response_model=ArticleListItem)
async def retry_article(article_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(RedaktionsLog).where(RedaktionsLog.id == article_id)
    )
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Artikel nicht gefunden")
    if row.status not in ("failed", "timeout", "cancelled"):
        raise HTTPException(status_code=400, detail=f"Artikel im Status '{row.status}' kann nicht wiederholt werden")

    row.status = "generating"
    row.retry_count = 0
    row.last_error = None
    row.timeout_at = datetime.utcnow() + timedelta(minutes=10)
    row.aktualisiert_am = datetime.utcnow()

    await trigger_article_generation(
        artikel_id=row.id,
        trigger_typ=row.trigger_typ,
        text="",
        kategorie=row.kategorie,
        sprachen=row.sprachen or {},
        urls=[],
        bild_typ=None,
    )

    await manager.broadcast("article:retry", {"id": row.id, "titel": row.titel})
    return row


@router.get(
    "/{article_id}/related",
    dependencies=[Depends(require_feature("crosslinking"))],
)
async def related_articles(
    article_id: int,
    limit: int = 5,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ArtikelArchiv).where(ArtikelArchiv.redaktions_log_id == article_id)
    )
    archiv = result.scalar_one_or_none()
    if not archiv or archiv.embedding is None:
        raise HTTPException(status_code=400, detail="Artikel hat kein Embedding")

    from services.crosslinking import find_related_articles
    related = await find_related_articles(db, list(archiv.embedding), article_id, limit)
    return related


@router.post(
    "/bulk",
    response_model=BulkArticleResponse,
    status_code=201,
    dependencies=[Depends(require_feature("bulk_input"))],
)
async def bulk_create_articles(
    payload: BulkArticleCreate,
    db: AsyncSession = Depends(get_db),
):
    if len(payload.topics) > 50:
        raise HTTPException(status_code=400, detail="Maximal 50 Themen pro Bulk-Request")
    if not payload.topics:
        raise HTTPException(status_code=400, detail="Mindestens ein Thema erforderlich")

    # Normalize: str → TopicItem
    items: list[TopicItem] = []
    for t in payload.topics:
        if isinstance(t, str):
            items.append(TopicItem(topic=t))
        else:
            items.append(t)

    articles = []
    for item in items:
        # Duplikat-Erkennung (ueberspringen statt abbrechen)
        content_hash = compute_content_hash("prompt", item.topic, [])
        existing = await db.execute(
            select(RedaktionsLog)
            .where(
                RedaktionsLog.content_hash == content_hash,
                RedaktionsLog.status.notin_(["failed", "cancelled"]),
            )
        )
        if existing.scalar_one_or_none():
            continue

        # kontext_quellen mit Keywords, additional_prompt, tone_of_voice
        kontext: dict = {}
        if item.keywords:
            kontext["keywords"] = item.keywords
        if item.additional_prompt:
            kontext["additional_prompt"] = item.additional_prompt
        if payload.tone_of_voice:
            kontext["tone_of_voice"] = payload.tone_of_voice

        row = RedaktionsLog(
            titel=item.topic[:120],
            trigger_typ="prompt",
            status="generating",
            kategorie=payload.kategorie,
            sprachen=payload.sprachen,
            kontext_quellen=kontext or None,
            content_hash=content_hash,
            timeout_at=datetime.utcnow() + timedelta(minutes=10),
        )
        db.add(row)
        await db.flush()

        await trigger_article_generation(
            artikel_id=row.id,
            trigger_typ="prompt",
            text=item.topic,
            kategorie=payload.kategorie,
            sprachen=payload.sprachen,
            urls=[],
            bild_typ=payload.bild_typ,
            keywords=item.keywords or None,
            additional_prompt=item.additional_prompt,
            tone_of_voice=payload.tone_of_voice,
        )
        articles.append(row)

    await manager.broadcast("articles:bulk_created", {"count": len(articles)})
    return BulkArticleResponse(created=len(articles), articles=articles)
