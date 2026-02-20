from fastapi import APIRouter, Depends, HTTPException

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from db.models import RedaktionsLog, ArtikelArchiv, SocialSnippet
from db.session import get_db
from db.schemas import SocialSnippetResponse
from services.feature_flags import require_feature
from services.social_generator import generate_social_snippets

router = APIRouter(prefix="/api/articles", tags=["social"])


@router.post(
    "/{article_id}/social/generate",
    response_model=list[SocialSnippetResponse],
    dependencies=[Depends(require_feature("social"))],
)
async def generate_social(article_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(RedaktionsLog)
        .where(RedaktionsLog.id == article_id)
        .options(selectinload(RedaktionsLog.archiv_eintrag))
    )
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Artikel nicht gefunden")

    archiv = row.archiv_eintrag
    if not archiv:
        raise HTTPException(status_code=400, detail="Artikel hat noch keinen Archiv-Eintrag")

    snippets = await generate_social_snippets(
        titel=row.titel,
        lead=archiv.lead or "",
        body=archiv.body or "",
    )
    if not snippets:
        raise HTTPException(status_code=502, detail="Social-Snippet-Generierung fehlgeschlagen")

    created = []
    for s in snippets:
        snippet = SocialSnippet(
            artikel_id=article_id,
            platform=s["platform"],
            text=s["text"],
            hashtags=s["hashtags"],
        )
        db.add(snippet)
        await db.flush()
        created.append(snippet)

    return created


@router.get(
    "/{article_id}/social/",
    response_model=list[SocialSnippetResponse],
    dependencies=[Depends(require_feature("social"))],
)
async def get_social(article_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(SocialSnippet)
        .where(SocialSnippet.artikel_id == article_id)
        .order_by(SocialSnippet.erstellt_am.desc())
    )
    return result.scalars().all()
