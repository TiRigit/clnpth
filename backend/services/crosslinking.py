"""Semantic crosslinking via pgVector cosine similarity."""

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import ArtikelArchiv, RedaktionsLog


async def find_related_articles(
    db: AsyncSession,
    embedding: list[float],
    exclude_id: int,
    limit: int = 5,
    threshold: float = 0.3,
) -> list[dict]:
    """Find related articles by cosine similarity. Returns list of {id, titel, similarity}."""
    # pgVector cosine distance: 1 - cosine_similarity
    # We want similarity > threshold, so distance < 1 - threshold
    max_distance = 1 - threshold

    result = await db.execute(
        text("""
            SELECT
                a.redaktions_log_id AS id,
                r.titel,
                1 - (a.embedding <=> :embedding::vector) AS similarity
            FROM clnpth.artikel_archiv a
            JOIN clnpth.redaktions_log r ON r.id = a.redaktions_log_id
            WHERE a.embedding IS NOT NULL
              AND a.redaktions_log_id != :exclude_id
              AND (a.embedding <=> :embedding::vector) < :max_distance
            ORDER BY a.embedding <=> :embedding::vector
            LIMIT :limit
        """),
        {
            "embedding": str(embedding),
            "exclude_id": exclude_id,
            "max_distance": max_distance,
            "limit": limit,
        },
    )

    return [
        {"id": row.id, "titel": row.titel, "similarity": round(row.similarity, 3)}
        for row in result.fetchall()
    ]
