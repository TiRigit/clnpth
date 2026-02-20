from fastapi import APIRouter, Depends, HTTPException

from db.schemas import RssParseRequest, RssParseResponse
from services.feature_flags import require_feature
from services.rss_client import parse_feed

router = APIRouter(prefix="/api/rss", tags=["rss"])


@router.post(
    "/parse",
    response_model=RssParseResponse,
    dependencies=[Depends(require_feature("rss"))],
)
async def rss_parse(body: RssParseRequest):
    try:
        result = parse_feed(body.url)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        raise HTTPException(status_code=502, detail="Feed konnte nicht geladen werden")
