"""Queue watchdog — checks for timed-out articles and retries them."""

import asyncio
import logging
from datetime import datetime

from sqlalchemy import select, and_

from db.models import RedaktionsLog
from db.session import async_session
from services.n8n_client import trigger_article_generation
from ws import manager

logger = logging.getLogger(__name__)


async def check_timeouts() -> int:
    """Find timed-out articles and retry or mark as timeout. Returns count processed."""
    count = 0
    async with async_session() as db:
        result = await db.execute(
            select(RedaktionsLog).where(
                and_(
                    RedaktionsLog.status == "generating",
                    RedaktionsLog.timeout_at != None,  # noqa: E711
                    RedaktionsLog.timeout_at < datetime.utcnow(),
                )
            )
        )
        rows = result.scalars().all()

        for row in rows:
            count += 1
            if row.retry_count < row.max_retries:
                row.retry_count += 1
                row.last_error = f"Timeout (attempt {row.retry_count}/{row.max_retries})"
                row.timeout_at = datetime(
                    *datetime.utcnow().timetuple()[:5],
                    second=datetime.utcnow().second,
                )
                # Add 10 more minutes
                from datetime import timedelta
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
                await manager.broadcast("article:retry", {
                    "id": row.id, "titel": row.titel, "retry": row.retry_count,
                })
                logger.info("Retrying article %d (attempt %d)", row.id, row.retry_count)
            else:
                row.status = "timeout"
                row.last_error = f"Max retries ({row.max_retries}) exceeded"
                row.aktualisiert_am = datetime.utcnow()
                await manager.broadcast("article:timeout", {
                    "id": row.id, "titel": row.titel,
                })
                logger.warning("Article %d timed out after %d retries", row.id, row.max_retries)

        await db.commit()
    return count


async def watchdog_loop(interval: int = 60) -> None:
    """Run check_timeouts periodically."""
    while True:
        try:
            processed = await check_timeouts()
            if processed > 0:
                logger.info("Watchdog processed %d timed-out articles", processed)
        except Exception:
            logger.exception("Watchdog error")
        await asyncio.sleep(interval)
