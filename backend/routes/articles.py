from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/articles", tags=["articles"])


class ArticleCreate(BaseModel):
    trigger_typ: str
    text: str
    kategorie: str | None = None
    sprachen: dict[str, bool] = {"de": True, "en": True, "es": True, "fr": True}
    urls: list[str] = []
    bild_typ: str | None = None


class ArticleResponse(BaseModel):
    id: int
    titel: str
    status: str
    kategorie: str | None
    sprachen: dict


@router.post("/", response_model=ArticleResponse, status_code=201)
async def create_article(article: ArticleCreate):
    # TODO: Implement with DB + n8n trigger
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.get("/")
async def list_articles(status: str | None = None, limit: int = 20):
    # TODO: Implement
    return []


@router.get("/{article_id}")
async def get_article(article_id: int):
    # TODO: Implement
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.patch("/{article_id}/approve")
async def approve_article(article_id: int, feedback: str | None = None):
    # TODO: Implement
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.patch("/{article_id}/revise")
async def revise_article(article_id: int, feedback: str | None = None):
    # TODO: Implement
    raise HTTPException(status_code=501, detail="Not implemented yet")
