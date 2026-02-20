from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient


# Mock n8n for all tests in this module (no real HTTP calls)
@pytest.fixture(autouse=True)
def mock_n8n():
    with patch("routes.articles.trigger_article_generation", new_callable=AsyncMock, return_value=True):
        yield


@pytest.fixture(autouse=True)
def mock_learning():
    with patch("routes.articles.process_editor_decision", new_callable=AsyncMock):
        yield


# ── Create ──────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_create_article(client: AsyncClient):
    resp = await client.post("/api/articles/", json={
        "trigger_typ": "prompt",
        "text": "Test-Artikel zum Thema KI",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["status"] == "generating"
    assert data["trigger_typ"] == "prompt"
    assert "id" in data


@pytest.mark.asyncio
async def test_create_article_with_options(client: AsyncClient):
    resp = await client.post("/api/articles/", json={
        "trigger_typ": "url",
        "text": "https://example.com/article",
        "kategorie": "technologie",
        "sprachen": {"de": True, "en": True, "es": False, "fr": False},
        "urls": ["https://example.com/article"],
        "bild_typ": "illustration",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["kategorie"] == "technologie"


@pytest.mark.asyncio
async def test_create_article_title_truncation(client: AsyncClient):
    """Title should be truncated to 120 chars from text."""
    long_text = "A" * 200
    resp = await client.post("/api/articles/", json={
        "trigger_typ": "prompt",
        "text": long_text,
    })
    assert resp.status_code == 201
    assert len(resp.json()["titel"]) == 120


# ── List ────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_list_articles_empty(client: AsyncClient):
    resp = await client.get("/api/articles/")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_list_articles_after_create(client: AsyncClient):
    await client.post("/api/articles/", json={
        "trigger_typ": "prompt", "text": "Artikel 1",
    })
    await client.post("/api/articles/", json={
        "trigger_typ": "prompt", "text": "Artikel 2",
    })
    resp = await client.get("/api/articles/")
    assert resp.status_code == 200
    # At least 2 articles (DB may have more from other tests)
    assert len(resp.json()) >= 2


@pytest.mark.asyncio
async def test_list_articles_filter_status(client: AsyncClient):
    await client.post("/api/articles/", json={
        "trigger_typ": "prompt", "text": "Filter-Test",
    })
    resp = await client.get("/api/articles/", params={"status": "generating"})
    assert resp.status_code == 200
    for item in resp.json():
        assert item["status"] == "generating"


@pytest.mark.asyncio
async def test_list_articles_pagination(client: AsyncClient):
    resp = await client.get("/api/articles/", params={"limit": 1, "offset": 0})
    assert resp.status_code == 200
    assert len(resp.json()) <= 1


# ── Detail ──────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_article_detail(client: AsyncClient):
    create = await client.post("/api/articles/", json={
        "trigger_typ": "prompt", "text": "Detail-Test",
    })
    article_id = create.json()["id"]

    resp = await client.get(f"/api/articles/{article_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == article_id
    assert data["translations"] == []
    assert data["supervisor"] is None


@pytest.mark.asyncio
async def test_get_article_not_found(client: AsyncClient):
    resp = await client.get("/api/articles/999999")
    assert resp.status_code == 404


# ── Stats ───────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_queue_stats(client: AsyncClient):
    resp = await client.get("/api/articles/stats")
    assert resp.status_code == 200
    data = resp.json()
    assert "total" in data
    assert "generating" in data
    assert "published" in data


@pytest.mark.asyncio
async def test_queue_stats_after_create(client: AsyncClient):
    await client.post("/api/articles/", json={
        "trigger_typ": "prompt", "text": "Stats-Test",
    })
    resp = await client.get("/api/articles/stats")
    data = resp.json()
    assert data["total"] >= 1
    assert data["generating"] >= 1


# ── Approve ─────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_approve_article_in_review(client: AsyncClient, db_session):
    """Approve works for articles in 'review' status."""
    from db.models import RedaktionsLog
    row = RedaktionsLog(
        titel="Review-Artikel", trigger_typ="prompt", status="review",
        kategorie=None, sprachen={"de": True},
    )
    db_session.add(row)
    await db_session.flush()

    resp = await client.patch(f"/api/articles/{row.id}/approve", json={})
    assert resp.status_code == 200
    assert resp.json()["status"] == "published"


@pytest.mark.asyncio
async def test_approve_article_wrong_status(client: AsyncClient, db_session):
    """Cannot approve articles that are not in review/generating."""
    from db.models import RedaktionsLog
    row = RedaktionsLog(
        titel="Failed-Artikel", trigger_typ="prompt", status="failed",
        kategorie=None, sprachen={"de": True},
    )
    db_session.add(row)
    await db_session.flush()

    resp = await client.patch(f"/api/articles/{row.id}/approve", json={})
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_approve_nonexistent(client: AsyncClient):
    resp = await client.patch("/api/articles/999999/approve", json={})
    assert resp.status_code == 404


# ── Revise ──────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_revise_article(client: AsyncClient, db_session):
    from db.models import RedaktionsLog
    row = RedaktionsLog(
        titel="Revise-Artikel", trigger_typ="prompt", status="review",
        kategorie=None, sprachen={"de": True},
    )
    db_session.add(row)
    await db_session.flush()

    resp = await client.patch(f"/api/articles/{row.id}/revise", json={
        "feedback": "Mehr Details zu KI-Ethik",
    })
    assert resp.status_code == 200
    assert resp.json()["status"] == "generating"


# ── Cancel ──────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_cancel_generating_article(client: AsyncClient, db_session):
    from db.models import RedaktionsLog
    row = RedaktionsLog(
        titel="Cancel-Test", trigger_typ="prompt", status="generating",
        kategorie=None, sprachen={"de": True},
    )
    db_session.add(row)
    await db_session.flush()

    resp = await client.patch(f"/api/articles/{row.id}/cancel")
    assert resp.status_code == 200
    assert resp.json()["status"] == "cancelled"


@pytest.mark.asyncio
async def test_cancel_wrong_status(client: AsyncClient, db_session):
    from db.models import RedaktionsLog
    row = RedaktionsLog(
        titel="Published-Artikel", trigger_typ="prompt", status="published",
        kategorie=None, sprachen={"de": True},
    )
    db_session.add(row)
    await db_session.flush()

    resp = await client.patch(f"/api/articles/{row.id}/cancel")
    assert resp.status_code == 400


# ── Retry ───────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_retry_failed_article(client: AsyncClient, db_session):
    from db.models import RedaktionsLog
    row = RedaktionsLog(
        titel="Failed-Artikel", trigger_typ="prompt", status="failed",
        kategorie=None, sprachen={"de": True},
    )
    db_session.add(row)
    await db_session.flush()

    resp = await client.patch(f"/api/articles/{row.id}/retry")
    assert resp.status_code == 200
    assert resp.json()["status"] == "generating"


@pytest.mark.asyncio
async def test_retry_timeout_article(client: AsyncClient, db_session):
    from db.models import RedaktionsLog
    row = RedaktionsLog(
        titel="Timeout-Artikel", trigger_typ="prompt", status="timeout",
        kategorie=None, sprachen={"de": True},
    )
    db_session.add(row)
    await db_session.flush()

    resp = await client.patch(f"/api/articles/{row.id}/retry")
    assert resp.status_code == 200
    assert resp.json()["status"] == "generating"


@pytest.mark.asyncio
async def test_retry_wrong_status(client: AsyncClient, db_session):
    from db.models import RedaktionsLog
    row = RedaktionsLog(
        titel="Review-Artikel", trigger_typ="prompt", status="review",
        kategorie=None, sprachen={"de": True},
    )
    db_session.add(row)
    await db_session.flush()

    resp = await client.patch(f"/api/articles/{row.id}/retry")
    assert resp.status_code == 400
