import httpx
from config import settings


async def trigger_article_generation(
    artikel_id: int,
    trigger_typ: str,
    text: str,
    kategorie: str | None,
    sprachen: dict[str, bool],
    urls: list[str],
    bild_typ: str | None,
) -> bool:
    """Triggers n8n webhook to start article generation pipeline."""
    payload = {
        "artikel_id": artikel_id,
        "trigger_typ": trigger_typ,
        "text": text,
        "kategorie": kategorie,
        "sprachen": sprachen,
        "urls": urls,
        "bild_typ": bild_typ,
        "callback_url": "http://localhost:8000/api/webhook/n8n",
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{settings.n8n_url}/webhook/clnpth-generate",
                json=payload,
            )
            return resp.status_code in (200, 201)
    except httpx.RequestError:
        # n8n not available — article stays in 'generating' status
        return False
