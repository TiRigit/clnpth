from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from fastapi.responses import FileResponse
from pathlib import Path
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from db.models import ArtikelArchiv
from db.session import get_db, async_session
from services import comfyui_client, runpod_client
from services.image_pipeline import run_image_pipeline

router = APIRouter(prefix="/api/articles/{article_id}/image", tags=["images"])


class ImageTrigger(BaseModel):
    prompt: str
    image_type: str = "illustration"  # illustration, infographic, photo, animation


class ImageStatus(BaseModel):
    artikel_id: int
    bild_url: str | None
    bild_prompt: str | None
    status: str  # pending, generating, ready, failed


@router.post("/trigger")
async def trigger_image_generation(
    article_id: int,
    payload: ImageTrigger,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Trigger image generation for an article."""
    result = await db.execute(
        select(ArtikelArchiv).where(ArtikelArchiv.redaktions_log_id == article_id)
    )
    archiv = result.scalar_one_or_none()
    if not archiv:
        raise HTTPException(status_code=404, detail="Artikel-Archiv nicht gefunden")

    if payload.image_type not in ("illustration", "infographic", "photo", "animation"):
        raise HTTPException(status_code=400, detail="Ungueltiger Bildtyp")

    # Save prompt to DB
    archiv.bild_prompt = payload.prompt
    archiv.bild_url = None  # Reset previous image

    # Check availability
    local_available = await comfyui_client.is_available()
    runpod_available = await runpod_client.is_configured()

    if not local_available and not runpod_available:
        raise HTTPException(
            status_code=503,
            detail="Weder lokales ComfyUI noch RunPod verfuegbar"
        )

    # Start pipeline in background
    background_tasks.add_task(
        run_image_pipeline,
        artikel_id=article_id,
        prompt=payload.prompt,
        image_type=payload.image_type,
        session_factory=async_session,
    )

    return {
        "ok": True,
        "artikel_id": article_id,
        "backend": "comfyui" if local_available else "runpod",
    }


@router.get("/status", response_model=ImageStatus)
async def get_image_status(
    article_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get current image generation status for an article."""
    result = await db.execute(
        select(ArtikelArchiv).where(ArtikelArchiv.redaktions_log_id == article_id)
    )
    archiv = result.scalar_one_or_none()
    if not archiv:
        raise HTTPException(status_code=404, detail="Artikel-Archiv nicht gefunden")

    if archiv.bild_url:
        status = "ready"
    elif archiv.bild_prompt:
        status = "generating"
    else:
        status = "pending"

    return ImageStatus(
        artikel_id=article_id,
        bild_url=archiv.bild_url,
        bild_prompt=archiv.bild_prompt,
        status=status,
    )


@router.get("/backends")
async def list_backends():
    """Check which image generation backends are available."""
    return {
        "comfyui": await comfyui_client.is_available(),
        "runpod": await runpod_client.is_configured(),
    }
