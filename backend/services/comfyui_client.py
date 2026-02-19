"""ComfyUI API client for local image generation.

Connects to ComfyUI (localhost:8188) to queue workflows,
poll status, and download generated images.
"""

import asyncio
import json
import uuid

import httpx
from config import settings

# Base workflow templates per image type
WORKFLOW_TEMPLATES: dict[str, dict] = {
    "illustration": {
        "checkpoint": "sd_xl_base_1.0.safetensors",
        "width": 1024,
        "height": 1024,
        "steps": 30,
        "cfg": 7.5,
        "sampler": "euler_ancestral",
        "style_prefix": "digital illustration, editorial style, ",
    },
    "infographic": {
        "checkpoint": "sd_xl_base_1.0.safetensors",
        "width": 1024,
        "height": 1536,
        "steps": 30,
        "cfg": 7.0,
        "sampler": "euler",
        "style_prefix": "clean infographic, data visualization, minimal design, ",
    },
    "photo": {
        "checkpoint": "sd_xl_base_1.0.safetensors",
        "width": 1024,
        "height": 768,
        "steps": 35,
        "cfg": 7.5,
        "sampler": "dpmpp_2m",
        "style_prefix": "photorealistic, editorial photography, ",
    },
    "animation": {
        "checkpoint": "sd_xl_base_1.0.safetensors",
        "width": 1024,
        "height": 1024,
        "steps": 25,
        "cfg": 7.0,
        "sampler": "euler_ancestral",
        "style_prefix": "animated style, motion graphics, ",
    },
}

NEGATIVE_PROMPT = (
    "watermark, text, logo, signature, blurry, low quality, "
    "deformed, ugly, duplicate, mutilated"
)


def build_workflow(prompt: str, image_type: str = "illustration") -> dict:
    """Build a ComfyUI API workflow JSON from a prompt and image type."""
    template = WORKFLOW_TEMPLATES.get(image_type, WORKFLOW_TEMPLATES["illustration"])
    full_prompt = template["style_prefix"] + prompt
    client_id = str(uuid.uuid4())

    # Standard SDXL txt2img workflow for ComfyUI API format
    workflow = {
        "3": {
            "class_type": "KSampler",
            "inputs": {
                "seed": hash(prompt) % (2**32),
                "steps": template["steps"],
                "cfg": template["cfg"],
                "sampler_name": template["sampler"],
                "scheduler": "normal",
                "denoise": 1.0,
                "model": ["4", 0],
                "positive": ["6", 0],
                "negative": ["7", 0],
                "latent_image": ["5", 0],
            },
        },
        "4": {
            "class_type": "CheckpointLoaderSimple",
            "inputs": {"ckpt_name": template["checkpoint"]},
        },
        "5": {
            "class_type": "EmptyLatentImage",
            "inputs": {
                "width": template["width"],
                "height": template["height"],
                "batch_size": 1,
            },
        },
        "6": {
            "class_type": "CLIPTextEncode",
            "inputs": {"text": full_prompt, "clip": ["4", 1]},
        },
        "7": {
            "class_type": "CLIPTextEncode",
            "inputs": {"text": NEGATIVE_PROMPT, "clip": ["4", 1]},
        },
        "8": {
            "class_type": "VAEDecode",
            "inputs": {"samples": ["3", 0], "vae": ["4", 2]},
        },
        "9": {
            "class_type": "SaveImage",
            "inputs": {"filename_prefix": f"clnpth_{client_id[:8]}", "images": ["8", 0]},
        },
    }

    return {"prompt": workflow, "client_id": client_id}


async def is_available() -> bool:
    """Check if ComfyUI is reachable."""
    try:
        async with httpx.AsyncClient(timeout=3) as client:
            resp = await client.get(f"{settings.comfyui_url}/system_stats")
            return resp.status_code == 200
    except Exception:
        return False


async def queue_prompt(prompt: str, image_type: str = "illustration") -> dict | None:
    """Queue an image generation workflow. Returns {prompt_id, client_id} or None."""
    workflow_data = build_workflow(prompt, image_type)

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                f"{settings.comfyui_url}/prompt",
                json=workflow_data,
            )
            resp.raise_for_status()
            result = resp.json()
            return {
                "prompt_id": result["prompt_id"],
                "client_id": workflow_data["client_id"],
            }
    except Exception:
        return None


async def poll_status(prompt_id: str, timeout: int = 300) -> str:
    """Poll ComfyUI for generation status. Returns 'completed', 'failed', or 'timeout'."""
    elapsed = 0
    interval = 2

    async with httpx.AsyncClient(timeout=10) as client:
        while elapsed < timeout:
            try:
                resp = await client.get(f"{settings.comfyui_url}/history/{prompt_id}")
                if resp.status_code == 200:
                    data = resp.json()
                    if prompt_id in data:
                        status = data[prompt_id].get("status", {})
                        if status.get("completed", False):
                            return "completed"
                        if status.get("status_str") == "error":
                            return "failed"
            except Exception:
                pass

            await asyncio.sleep(interval)
            elapsed += interval

    return "timeout"


async def get_image(prompt_id: str) -> bytes | None:
    """Download the generated image for a completed prompt."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(f"{settings.comfyui_url}/history/{prompt_id}")
            if resp.status_code != 200:
                return None

            data = resp.json()
            if prompt_id not in data:
                return None

            outputs = data[prompt_id].get("outputs", {})
            # Find the SaveImage node output
            for node_output in outputs.values():
                images = node_output.get("images", [])
                if images:
                    img_info = images[0]
                    img_resp = await client.get(
                        f"{settings.comfyui_url}/view",
                        params={
                            "filename": img_info["filename"],
                            "subfolder": img_info.get("subfolder", ""),
                            "type": img_info.get("type", "output"),
                        },
                    )
                    if img_resp.status_code == 200:
                        return img_resp.content

            return None
    except Exception:
        return None
