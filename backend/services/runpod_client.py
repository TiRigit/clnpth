"""RunPod Serverless API client — cloud GPU fallback for ComfyUI.

Used when local ComfyUI is not available. Sends the same workflow JSON
to a RunPod serverless endpoint running ComfyUI.
"""

import asyncio

import httpx
from config import settings
from services.comfyui_client import build_workflow


async def is_configured() -> bool:
    """Check if RunPod credentials are set."""
    return bool(settings.runpod_api_key and settings.runpod_endpoint_id)


async def queue_prompt(prompt: str, image_type: str = "illustration") -> dict | None:
    """Queue image generation on RunPod. Returns {job_id} or None."""
    if not await is_configured():
        return None

    workflow_data = build_workflow(prompt, image_type)

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"https://api.runpod.ai/v2/{settings.runpod_endpoint_id}/run",
                headers={"Authorization": f"Bearer {settings.runpod_api_key}"},
                json={"input": {"workflow": workflow_data["prompt"]}},
            )
            resp.raise_for_status()
            result = resp.json()
            return {"job_id": result["id"]}
    except Exception:
        return None


async def poll_status(job_id: str, timeout: int = 600) -> dict | None:
    """Poll RunPod job status. Returns {status, output} or None."""
    if not await is_configured():
        return None

    elapsed = 0
    interval = 5

    async with httpx.AsyncClient(timeout=10) as client:
        while elapsed < timeout:
            try:
                resp = await client.get(
                    f"https://api.runpod.ai/v2/{settings.runpod_endpoint_id}/status/{job_id}",
                    headers={"Authorization": f"Bearer {settings.runpod_api_key}"},
                )
                if resp.status_code == 200:
                    data = resp.json()
                    status = data.get("status")
                    if status == "COMPLETED":
                        return {"status": "completed", "output": data.get("output")}
                    if status in ("FAILED", "CANCELLED"):
                        return {"status": "failed", "output": None}
            except Exception:
                pass

            await asyncio.sleep(interval)
            elapsed += interval

    return {"status": "timeout", "output": None}


async def get_image_from_output(output: dict) -> bytes | None:
    """Download image from RunPod output (expects base64 or URL)."""
    if not output:
        return None

    image_url = None
    # RunPod ComfyUI endpoints typically return image URLs or base64
    if isinstance(output, dict):
        image_url = output.get("image_url") or output.get("url")
    elif isinstance(output, list) and output:
        image_url = output[0].get("image_url") or output[0].get("url")

    if image_url:
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.get(image_url)
                if resp.status_code == 200:
                    return resp.content
        except Exception:
            pass

    # Handle base64 output
    import base64
    b64_data = None
    if isinstance(output, dict):
        b64_data = output.get("image_base64") or output.get("base64")
    elif isinstance(output, list) and output:
        b64_data = output[0].get("image_base64") or output[0].get("base64")

    if b64_data:
        try:
            return base64.b64decode(b64_data)
        except Exception:
            pass

    return None
