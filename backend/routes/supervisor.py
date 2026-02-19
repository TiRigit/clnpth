from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import (
    SupervisorLog, TonalityProfil, ThemenRanking,
    RedaktionsLog, ArtikelArchiv,
)
from db.session import get_db, async_session
from db.schemas import SupervisorResponse
from services.supervisor_agent import evaluate_article, build_tonality_context
from services.learning_strategy import process_editor_decision, get_deviation_stats
from ws import manager

router = APIRouter(prefix="/api/supervisor", tags=["supervisor"])


class EvaluationTrigger(BaseModel):
    artikel_id: int


class TonalityUpdate(BaseModel):
    merkmal: str
    wert: str
    gewichtung: float = 0.5


# ── Dashboard data ──

@router.get("/dashboard")
async def supervisor_dashboard(db: AsyncSession = Depends(get_db)):
    """Full supervisor dashboard data: profile, stats, recent decisions."""
    # Tonality profile
    profile_result = await db.execute(
        select(TonalityProfil).order_by(TonalityProfil.gewichtung.desc())
    )
    profile = [
        {
            "id": p.id,
            "merkmal": p.merkmal,
            "wert": p.wert,
            "gewichtung": p.gewichtung,
            "belege": p.belege,
        }
        for p in profile_result.scalars()
    ]

    # Topic ranking
    ranking_result = await db.execute(
        select(ThemenRanking).order_by(ThemenRanking.artikel_count.desc()).limit(20)
    )
    rankings = [
        {
            "id": r.id,
            "thema": r.thema,
            "kategorie": r.kategorie,
            "artikel_count": r.artikel_count,
            "freigabe_rate": r.freigabe_rate,
            "letzter_artikel": r.letzter_artikel.isoformat() if r.letzter_artikel else None,
        }
        for r in ranking_result.scalars()
    ]

    # Recent decisions
    decisions_result = await db.execute(
        select(SupervisorLog)
        .order_by(SupervisorLog.erstellt_am.desc())
        .limit(20)
    )
    decisions = []
    for sv in decisions_result.scalars():
        decisions.append({
            "id": sv.id,
            "artikel_id": sv.artikel_id,
            "empfehlung": sv.supervisor_empfehlung,
            "score": sv.supervisor_score,
            "redakteur_entscheidung": sv.redakteur_entscheidung,
            "abweichung": sv.abweichung,
            "erstellt_am": sv.erstellt_am.isoformat() if sv.erstellt_am else None,
        })

    # Deviation stats
    dev_stats = await get_deviation_stats(db)

    return {
        "tonality_profile": profile,
        "themen_ranking": rankings,
        "recent_decisions": decisions,
        "deviation_stats": dev_stats,
    }


@router.get("/decisions", response_model=list[SupervisorResponse])
async def list_decisions(
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    """List supervisor decisions with pagination."""
    result = await db.execute(
        select(SupervisorLog)
        .order_by(SupervisorLog.erstellt_am.desc())
        .limit(limit)
        .offset(offset)
    )
    return result.scalars().all()


@router.post("/evaluate")
async def trigger_evaluation(
    payload: EvaluationTrigger,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Trigger supervisor evaluation for an article."""
    # Load article content
    archiv_result = await db.execute(
        select(ArtikelArchiv).where(
            ArtikelArchiv.redaktions_log_id == payload.artikel_id
        )
    )
    archiv = archiv_result.scalar_one_or_none()
    if not archiv or not archiv.body:
        raise HTTPException(status_code=400, detail="Artikel hat noch keinen Inhalt")

    art_result = await db.execute(
        select(RedaktionsLog).where(RedaktionsLog.id == payload.artikel_id)
    )
    artikel = art_result.scalar_one_or_none()
    if not artikel:
        raise HTTPException(status_code=404, detail="Artikel nicht gefunden")

    # Build tonality context from DB
    profile_result = await db.execute(
        select(TonalityProfil).order_by(TonalityProfil.gewichtung.desc())
    )
    profile_entries = [
        {"merkmal": p.merkmal, "wert": p.wert, "gewichtung": p.gewichtung, "belege": p.belege}
        for p in profile_result.scalars()
    ]
    tonality_context = await build_tonality_context(profile_entries)

    # Run evaluation in background
    async def _evaluate():
        result = await evaluate_article(
            titel=archiv.titel,
            lead=archiv.lead or "",
            body=archiv.body,
            kategorie=artikel.kategorie,
            tonality_profile=tonality_context,
        )
        if result:
            async with async_session() as session:
                sv = SupervisorLog(
                    artikel_id=payload.artikel_id,
                    supervisor_empfehlung=result.get("empfehlung"),
                    supervisor_begruendung=result.get("begruendung"),
                    supervisor_score=result.get("score"),
                    tonality_tags=result.get("tonality_tags"),
                )
                session.add(sv)
                await session.commit()

            await manager.broadcast("supervisor:evaluated", {
                "artikel_id": payload.artikel_id,
                "score": result.get("score"),
                "empfehlung": result.get("empfehlung"),
            })

    background_tasks.add_task(_evaluate)

    return {"ok": True, "artikel_id": payload.artikel_id}


# ── Tonality profile management ──

@router.get("/tonality")
async def get_tonality_profile(db: AsyncSession = Depends(get_db)):
    """Get the current tonality profile."""
    result = await db.execute(
        select(TonalityProfil).order_by(TonalityProfil.gewichtung.desc())
    )
    return [
        {
            "id": p.id,
            "merkmal": p.merkmal,
            "wert": p.wert,
            "gewichtung": p.gewichtung,
            "belege": p.belege,
        }
        for p in result.scalars()
    ]


@router.post("/tonality")
async def add_tonality_entry(
    payload: TonalityUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Manually add or update a tonality profile entry."""
    result = await db.execute(
        select(TonalityProfil).where(TonalityProfil.merkmal == payload.merkmal)
    )
    entry = result.scalar_one_or_none()

    if entry:
        entry.wert = payload.wert
        entry.gewichtung = payload.gewichtung
    else:
        entry = TonalityProfil(
            merkmal=payload.merkmal,
            wert=payload.wert,
            gewichtung=payload.gewichtung,
            belege=0,
        )
        db.add(entry)

    return {"ok": True, "merkmal": payload.merkmal}


@router.delete("/tonality/{entry_id}")
async def delete_tonality_entry(
    entry_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Remove a tonality profile entry."""
    result = await db.execute(
        select(TonalityProfil).where(TonalityProfil.id == entry_id)
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Eintrag nicht gefunden")

    await db.delete(entry)
    return {"ok": True}


# ── Topic ranking ──

@router.get("/topics")
async def get_topic_ranking(db: AsyncSession = Depends(get_db)):
    """Get topic ranking sorted by article count."""
    result = await db.execute(
        select(ThemenRanking).order_by(ThemenRanking.artikel_count.desc())
    )
    return [
        {
            "id": r.id,
            "thema": r.thema,
            "kategorie": r.kategorie,
            "artikel_count": r.artikel_count,
            "freigabe_rate": r.freigabe_rate,
            "letzter_artikel": r.letzter_artikel.isoformat() if r.letzter_artikel else None,
        }
        for r in result.scalars()
    ]


# ── Deviation stats ──

@router.get("/deviations")
async def deviation_statistics(db: AsyncSession = Depends(get_db)):
    """Get deviation statistics between supervisor and editor decisions."""
    return await get_deviation_stats(db)
