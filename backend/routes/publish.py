from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import RedaktionsLog, ArtikelArchiv, ArtikelUebersetzung
from db.session import get_db, async_session
from services import wordpress_client
from ws import manager

router = APIRouter(prefix="/api/articles/{article_id}/publish", tags=["publish"])


class PublishOptions(BaseModel):
    wp_status: str = "draft"  # draft, publish, pending
    languages: list[str] | None = None  # None = all approved translations
    upload_image: bool = True


@router.post("/")
async def publish_to_wordpress(
    article_id: int,
    options: PublishOptions,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Publish article + translations to WordPress."""
    # Verify WordPress connection
    if not await wordpress_client.check_connection():
        raise HTTPException(status_code=503, detail="WordPress nicht erreichbar oder nicht konfiguriert")

    # Load article
    result = await db.execute(
        select(RedaktionsLog).where(RedaktionsLog.id == article_id)
    )
    artikel = result.scalar_one_or_none()
    if not artikel:
        raise HTTPException(status_code=404, detail="Artikel nicht gefunden")

    archiv_result = await db.execute(
        select(ArtikelArchiv).where(ArtikelArchiv.redaktions_log_id == article_id)
    )
    archiv = archiv_result.scalar_one_or_none()
    if not archiv or not archiv.body:
        raise HTTPException(status_code=400, detail="Artikel hat noch keinen Inhalt")

    # Start publishing in background
    background_tasks.add_task(
        _publish_pipeline,
        artikel_id=article_id,
        wp_status=options.wp_status,
        languages=options.languages,
        upload_image=options.upload_image,
        session_factory=async_session,
    )

    return {"ok": True, "artikel_id": article_id, "wp_status": options.wp_status}


async def _publish_pipeline(
    artikel_id: int,
    wp_status: str,
    languages: list[str] | None,
    upload_image: bool,
    session_factory,
):
    """Background task: publish article + translations to WordPress."""
    async with session_factory() as db:
        # Load data
        result = await db.execute(
            select(RedaktionsLog).where(RedaktionsLog.id == artikel_id)
        )
        artikel = result.scalar_one_or_none()

        archiv_result = await db.execute(
            select(ArtikelArchiv).where(ArtikelArchiv.redaktions_log_id == artikel_id)
        )
        archiv = archiv_result.scalar_one_or_none()

        if not artikel or not archiv:
            return

        # Upload featured image if available
        media_id = None
        if upload_image and archiv.bild_url:
            # Convert URL path to filesystem path
            img_path = archiv.bild_url.lstrip("/")
            media = await wordpress_client.upload_media(
                image_path=img_path,
                alt_text=archiv.titel,
                caption=f"Generiert für: {archiv.titel}",
            )
            if media:
                media_id = media.get("id")

        # Build SEO meta (Yoast/RankMath compatible)
        seo_meta = {}
        if archiv.seo_titel:
            seo_meta["_yoast_wpseo_title"] = archiv.seo_titel
        if archiv.seo_description:
            seo_meta["_yoast_wpseo_metadesc"] = archiv.seo_description

        # Publish German (main) article
        wp_post = await wordpress_client.publish_post(
            title=archiv.titel,
            content=archiv.body,
            excerpt=archiv.lead or "",
            status=wp_status,
            featured_media=media_id,
            meta=seo_meta if seo_meta else None,
            lang="de",
        )

        if wp_post:
            archiv.wp_post_id = wp_post["id"]
            await db.commit()

            await manager.broadcast("article:published", {
                "artikel_id": artikel_id,
                "wp_post_id": wp_post["id"],
                "wp_url": wp_post.get("link"),
                "lang": "de",
            })

        # Publish translations
        trans_result = await db.execute(
            select(ArtikelUebersetzung).where(
                ArtikelUebersetzung.artikel_id == artikel_id
            )
        )
        for trans in trans_result.scalars():
            if languages and trans.sprache not in languages:
                continue
            if not trans.body:
                continue

            wp_trans = await wordpress_client.publish_post(
                title=trans.titel or archiv.titel,
                content=trans.body,
                excerpt=trans.lead or "",
                status=wp_status,
                featured_media=media_id,
                lang=trans.sprache,
            )

            if wp_trans:
                trans.wp_post_id = wp_trans["id"]
                await db.commit()

                await manager.broadcast("article:published", {
                    "artikel_id": artikel_id,
                    "wp_post_id": wp_trans["id"],
                    "lang": trans.sprache,
                })

    await manager.broadcast("publish:complete", {
        "artikel_id": artikel_id,
    })


@router.get("/status")
async def publish_status(
    article_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get WordPress publication status for an article."""
    archiv_result = await db.execute(
        select(ArtikelArchiv).where(ArtikelArchiv.redaktions_log_id == article_id)
    )
    archiv = archiv_result.scalar_one_or_none()

    trans_result = await db.execute(
        select(ArtikelUebersetzung).where(
            ArtikelUebersetzung.artikel_id == article_id
        )
    )

    publications = {}
    if archiv and archiv.wp_post_id:
        publications["de"] = {"wp_post_id": archiv.wp_post_id}

    for trans in trans_result.scalars():
        if trans.wp_post_id:
            publications[trans.sprache] = {"wp_post_id": trans.wp_post_id}

    return {
        "artikel_id": article_id,
        "published": bool(publications),
        "publications": publications,
    }


@router.get("/wp-check")
async def wordpress_check():
    """Check WordPress connection status."""
    connected = await wordpress_client.check_connection()
    categories = await wordpress_client.get_categories() if connected else []
    return {
        "connected": connected,
        "wp_url": settings.wp_url if connected else None,
        "categories": [{"id": c["id"], "name": c["name"]} for c in categories],
    }


# Import settings at module level for wp-check endpoint
from config import settings
