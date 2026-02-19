"""Image generation pipeline: ComfyUI (local) → RunPod (cloud fallback).

Generates images, saves to local storage, updates DB + WebSocket.
"""

import os
import uuid
from datetime import datetime
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from db.models import ArtikelArchiv
from services import comfyui_client, runpod_client
from ws import manager


def _ensure_storage_dir() -> Path:
    """Ensure image storage directory exists."""
    path = Path(settings.image_storage_path)
    path.mkdir(parents=True, exist_ok=True)
    return path


async def _save_image(image_bytes: bytes, artikel_id: int) -> str:
    """Save image to local storage. Returns relative URL path."""
    storage = _ensure_storage_dir()
    filename = f"{artikel_id}_{uuid.uuid4().hex[:8]}.png"
    filepath = storage / filename
    filepath.write_bytes(image_bytes)
    return f"/static/images/{filename}"


async def run_image_pipeline(
    artikel_id: int,
    prompt: str,
    image_type: str,
    session_factory,
):
    """Generate image via ComfyUI (local) or RunPod (fallback). Background task."""
    await manager.broadcast("image:generating", {
        "artikel_id": artikel_id, "status": "generating",
    })

    image_bytes: bytes | None = None

    # Strategy 1: Local ComfyUI
    if await comfyui_client.is_available():
        result = await comfyui_client.queue_prompt(prompt, image_type)
        if result:
            status = await comfyui_client.poll_status(result["prompt_id"])
            if status == "completed":
                image_bytes = await comfyui_client.get_image(result["prompt_id"])

    # Strategy 2: RunPod fallback
    if image_bytes is None and await runpod_client.is_configured():
        result = await runpod_client.queue_prompt(prompt, image_type)
        if result:
            status_result = await runpod_client.poll_status(result["job_id"])
            if status_result and status_result["status"] == "completed":
                image_bytes = await runpod_client.get_image_from_output(
                    status_result["output"]
                )

    # Save result
    if image_bytes:
        image_url = await _save_image(image_bytes, artikel_id)

        async with session_factory() as db:
            result = await db.execute(
                select(ArtikelArchiv).where(
                    ArtikelArchiv.redaktions_log_id == artikel_id
                )
            )
            archiv = result.scalar_one_or_none()
            if archiv:
                archiv.bild_url = image_url
                archiv.bild_prompt = prompt
                await db.commit()

        await manager.broadcast("image:ready", {
            "artikel_id": artikel_id,
            "status": "ready",
            "bild_url": image_url,
        })
    else:
        await manager.broadcast("image:failed", {
            "artikel_id": artikel_id, "status": "failed",
        })
