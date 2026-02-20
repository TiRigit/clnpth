import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import RedaktionsLog, ArtikelArchiv, ArtikelUebersetzung, SupervisorLog


async def _create_article(db: AsyncSession, status: str = "generating") -> RedaktionsLog:
    row = RedaktionsLog(
        titel="Webhook-Test", trigger_typ="prompt", status=status,
        kategorie="technologie", sprachen={"de": True, "en": True},
    )
    db.add(row)
    await db.flush()
    return row


# ── Basic callback ──────────────────────────────────────────


@pytest.mark.asyncio
async def test_webhook_updates_status(client: AsyncClient, db_session: AsyncSession):
    row = await _create_article(db_session)

    resp = await client.post("/api/webhook/n8n", json={
        "artikel_id": row.id,
        "status": "review",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "review"
    assert data["artikel_id"] == row.id


@pytest.mark.asyncio
async def test_webhook_updates_title(client: AsyncClient, db_session: AsyncSession):
    row = await _create_article(db_session)

    resp = await client.post("/api/webhook/n8n", json={
        "artikel_id": row.id,
        "status": "review",
        "titel": "Neuer Titel von n8n",
    })
    assert resp.status_code == 200
    assert resp.json()["ok"] is True


@pytest.mark.asyncio
async def test_webhook_nonexistent_article(client: AsyncClient):
    resp = await client.post("/api/webhook/n8n", json={
        "artikel_id": 999999,
        "status": "review",
    })
    assert resp.status_code == 404


# ── Article archive upsert ──────────────────────────────────


@pytest.mark.asyncio
async def test_webhook_creates_archive(client: AsyncClient, db_session: AsyncSession):
    row = await _create_article(db_session)

    resp = await client.post("/api/webhook/n8n", json={
        "artikel_id": row.id,
        "status": "review",
        "titel": "KI in der Medizin",
        "lead": "Kurzfassung des Artikels",
        "body": "<p>Langer Artikeltext</p>",
        "quellen": ["https://example.com"],
        "seo_titel": "KI Medizin 2026",
        "seo_description": "Alles ueber KI in der Medizin",
        "bild_prompt": "futuristic hospital with AI",
    })
    assert resp.status_code == 200

    from sqlalchemy import select
    result = await db_session.execute(
        select(ArtikelArchiv).where(ArtikelArchiv.redaktions_log_id == row.id)
    )
    archiv = result.scalar_one()
    assert archiv.lead == "Kurzfassung des Artikels"
    assert archiv.body == "<p>Langer Artikeltext</p>"
    assert archiv.seo_titel == "KI Medizin 2026"
    assert archiv.bild_prompt == "futuristic hospital with AI"


@pytest.mark.asyncio
async def test_webhook_updates_existing_archive(client: AsyncClient, db_session: AsyncSession):
    row = await _create_article(db_session)

    # First callback creates archive
    await client.post("/api/webhook/n8n", json={
        "artikel_id": row.id,
        "status": "generating",
        "lead": "Version 1",
        "body": "Body v1",
    })

    # Second callback updates archive
    await client.post("/api/webhook/n8n", json={
        "artikel_id": row.id,
        "status": "review",
        "lead": "Version 2",
        "body": "Body v2",
    })

    from sqlalchemy import select
    result = await db_session.execute(
        select(ArtikelArchiv).where(ArtikelArchiv.redaktions_log_id == row.id)
    )
    archiv = result.scalar_one()
    assert archiv.lead == "Version 2"
    assert archiv.body == "Body v2"


# ── Translation upsert ──────────────────────────────────────


@pytest.mark.asyncio
async def test_webhook_creates_translations(client: AsyncClient, db_session: AsyncSession):
    row = await _create_article(db_session)

    resp = await client.post("/api/webhook/n8n", json={
        "artikel_id": row.id,
        "status": "review",
        "translations": {
            "en": {
                "titel": "AI in Medicine",
                "lead": "Short summary",
                "body": "<p>Long article</p>",
                "status": "deepl_done",
            },
            "fr": {
                "titel": "IA en medecine",
                "lead": "Resume court",
                "body": "<p>Article long</p>",
                "status": "deepl_done",
            },
        },
    })
    assert resp.status_code == 200

    from sqlalchemy import select
    result = await db_session.execute(
        select(ArtikelUebersetzung).where(ArtikelUebersetzung.artikel_id == row.id)
    )
    translations = result.scalars().all()
    assert len(translations) == 2
    langs = {t.sprache for t in translations}
    assert langs == {"en", "fr"}


@pytest.mark.asyncio
async def test_webhook_updates_existing_translation(client: AsyncClient, db_session: AsyncSession):
    row = await _create_article(db_session)

    # Create translation
    await client.post("/api/webhook/n8n", json={
        "artikel_id": row.id,
        "status": "generating",
        "translations": {
            "en": {"titel": "Version 1", "status": "deepl_done"},
        },
    })

    # Update translation
    await client.post("/api/webhook/n8n", json={
        "artikel_id": row.id,
        "status": "review",
        "translations": {
            "en": {"titel": "Version 2", "status": "reviewed"},
        },
    })

    from sqlalchemy import select
    result = await db_session.execute(
        select(ArtikelUebersetzung).where(
            ArtikelUebersetzung.artikel_id == row.id,
            ArtikelUebersetzung.sprache == "en",
        )
    )
    trans = result.scalar_one()
    assert trans.titel == "Version 2"
    assert trans.status == "reviewed"


# ── Supervisor upsert ───────────────────────────────────────


@pytest.mark.asyncio
async def test_webhook_creates_supervisor_log(client: AsyncClient, db_session: AsyncSession):
    row = await _create_article(db_session)

    resp = await client.post("/api/webhook/n8n", json={
        "artikel_id": row.id,
        "status": "review",
        "supervisor": {
            "empfehlung": "freigeben",
            "begruendung": "Gut geschrieben, informativ",
            "score": 85,
            "tonality_tags": ["sachlich", "informativ"],
        },
    })
    assert resp.status_code == 200

    from sqlalchemy import select
    result = await db_session.execute(
        select(SupervisorLog).where(SupervisorLog.artikel_id == row.id)
    )
    sv = result.scalar_one()
    assert sv.supervisor_empfehlung == "freigeben"
    assert sv.supervisor_score == 85
    assert sv.tonality_tags == ["sachlich", "informativ"]


# ── Full pipeline callback ──────────────────────────────────


@pytest.mark.asyncio
async def test_webhook_full_callback(client: AsyncClient, db_session: AsyncSession):
    """Simulate a complete n8n callback with all fields."""
    row = await _create_article(db_session)

    resp = await client.post("/api/webhook/n8n", json={
        "artikel_id": row.id,
        "status": "review",
        "titel": "Vollstaendiger Artikel",
        "lead": "Teaser-Text",
        "body": "<p>Artikelinhalt</p>",
        "quellen": ["https://quelle1.de", "https://quelle2.de"],
        "seo_titel": "SEO Titel",
        "seo_description": "Meta-Beschreibung",
        "bild_prompt": "abstract tech illustration",
        "translations": {
            "en": {"titel": "Complete Article", "lead": "Teaser", "body": "<p>Content</p>", "status": "deepl_done"},
        },
        "supervisor": {
            "empfehlung": "freigeben",
            "begruendung": "Sehr gut",
            "score": 90,
            "tonality_tags": ["professionell"],
        },
    })
    assert resp.status_code == 200

    await db_session.refresh(row)
    assert row.status == "review"
    assert row.titel == "Vollstaendiger Artikel"
