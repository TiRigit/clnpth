"""Self-learning strategy for tonality profiles and topic rankings.

Updates profiles based on editor feedback and supervisor evaluations.
Tracks approval rates per topic to optimize future article generation.
"""

from datetime import datetime

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import SupervisorLog, TonalityProfil, ThemenRanking, RedaktionsLog


async def update_tonality_profile(db: AsyncSession, tonality_tags: list[str]):
    """Update tonality profile weights based on approved article tags.

    Tags from approved articles increase weight, building a learned style guide.
    """
    for tag in tonality_tags:
        result = await db.execute(
            select(TonalityProfil).where(TonalityProfil.merkmal == tag)
        )
        profil = result.scalar_one_or_none()

        if profil:
            profil.belege += 1
            # Increase weight slightly with each confirmation (cap at 1.0)
            profil.gewichtung = min(1.0, profil.gewichtung + 0.02)
        else:
            profil = TonalityProfil(
                merkmal=tag,
                wert="bestätigt durch Redakteur",
                gewichtung=0.5,
                belege=1,
            )
            db.add(profil)


async def decay_unused_tags(db: AsyncSession, active_tags: list[str]):
    """Slightly reduce weight of tags NOT seen in recent approvals."""
    result = await db.execute(
        select(TonalityProfil).where(TonalityProfil.merkmal.notin_(active_tags))
    )
    for profil in result.scalars():
        profil.gewichtung = max(0.1, profil.gewichtung - 0.005)


async def update_themen_ranking(
    db: AsyncSession,
    kategorie: str | None,
    approved: bool,
):
    """Update topic ranking after article decision."""
    if not kategorie:
        return

    result = await db.execute(
        select(ThemenRanking).where(ThemenRanking.kategorie == kategorie)
    )
    ranking = result.scalar_one_or_none()

    if not ranking:
        ranking = ThemenRanking(
            thema=kategorie,
            kategorie=kategorie,
            artikel_count=0,
            freigabe_rate=0.0,
        )
        db.add(ranking)

    ranking.artikel_count += 1
    ranking.letzter_artikel = datetime.utcnow()

    # Recalculate approval rate
    if approved:
        # Weighted moving average (new approval counts more for recent trend)
        old_rate = ranking.freigabe_rate or 0.0
        ranking.freigabe_rate = old_rate * 0.8 + 1.0 * 0.2
    else:
        old_rate = ranking.freigabe_rate or 0.0
        ranking.freigabe_rate = old_rate * 0.8 + 0.0 * 0.2


async def track_deviation(db: AsyncSession, supervisor_log_id: int):
    """Track when editor deviates from supervisor recommendation.

    High deviation rates signal the supervisor model needs recalibration.
    """
    result = await db.execute(
        select(SupervisorLog).where(SupervisorLog.id == supervisor_log_id)
    )
    sv = result.scalar_one_or_none()
    if not sv or not sv.redakteur_entscheidung:
        return

    sv.abweichung = sv.supervisor_empfehlung != sv.redakteur_entscheidung


async def process_editor_decision(
    db: AsyncSession,
    artikel_id: int,
    entscheidung: str,
    feedback: str | None = None,
):
    """Process an editor's decision: update learning systems.

    Called after approve/revise/reject to update:
    - Supervisor log with editor decision
    - Tonality profile (on approval)
    - Topic ranking
    - Deviation tracking
    """
    # Get latest supervisor log
    result = await db.execute(
        select(SupervisorLog)
        .where(SupervisorLog.artikel_id == artikel_id)
        .order_by(SupervisorLog.erstellt_am.desc())
        .limit(1)
    )
    sv = result.scalar_one_or_none()

    if sv:
        sv.redakteur_entscheidung = entscheidung
        sv.redakteur_feedback = feedback
        sv.abweichung = sv.supervisor_empfehlung != entscheidung

        # On approval: reinforce tonality tags
        if entscheidung == "freigeben" and sv.tonality_tags:
            await update_tonality_profile(db, sv.tonality_tags)
            await decay_unused_tags(db, sv.tonality_tags)

    # Get article for category
    art_result = await db.execute(
        select(RedaktionsLog).where(RedaktionsLog.id == artikel_id)
    )
    artikel = art_result.scalar_one_or_none()

    if artikel:
        await update_themen_ranking(
            db,
            kategorie=artikel.kategorie,
            approved=(entscheidung == "freigeben"),
        )


async def get_deviation_stats(db: AsyncSession) -> dict:
    """Get overall deviation statistics for the supervisor dashboard."""
    total = await db.execute(
        select(func.count(SupervisorLog.id)).where(
            SupervisorLog.redakteur_entscheidung.isnot(None)
        )
    )
    total_count = total.scalar() or 0

    deviations = await db.execute(
        select(func.count(SupervisorLog.id)).where(
            SupervisorLog.abweichung.is_(True)
        )
    )
    deviation_count = deviations.scalar() or 0

    return {
        "total_decisions": total_count,
        "deviations": deviation_count,
        "deviation_rate": (deviation_count / total_count * 100) if total_count > 0 else 0,
    }
