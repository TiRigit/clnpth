from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


# ── Request schemas ──────────────────────────────────────────

class ArticleCreate(BaseModel):
    trigger_typ: str
    text: str
    kategorie: str | None = None
    sprachen: dict[str, bool] = {"de": True, "en": True, "es": True, "fr": True}
    urls: list[str] = []
    bild_typ: str | None = None


class ArticleApprove(BaseModel):
    feedback: str | None = None


class ArticleRevise(BaseModel):
    feedback: str | None = None


class SupervisorUpdate(BaseModel):
    artikel_id: int
    empfehlung: str  # freigeben, ueberarbeiten, ablehnen
    begruendung: str
    score: int
    tonality_tags: list[str] = []


class N8nCallback(BaseModel):
    artikel_id: int
    status: str
    titel: str | None = None
    lead: str | None = None
    body: str | None = None
    quellen: list[Any] | None = None
    seo_titel: str | None = None
    seo_description: str | None = None
    bild_prompt: str | None = None
    translations: dict[str, dict] | None = None
    supervisor: dict | None = None


# ── Response schemas ─────────────────────────────────────────

class ArticleListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    titel: str
    status: str
    kategorie: str | None
    sprachen: dict | None
    trigger_typ: str
    erstellt_am: datetime
    aktualisiert_am: datetime


class TranslationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    sprache: str
    titel: str | None
    lead: str | None
    body: str | None
    status: str


class SupervisorResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    supervisor_empfehlung: str | None
    supervisor_begruendung: str | None
    supervisor_score: int | None
    tonality_tags: list | None
    redakteur_entscheidung: str | None
    redakteur_feedback: str | None
    abweichung: bool


class ArticleDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    titel: str
    status: str
    kategorie: str | None
    sprachen: dict | None
    trigger_typ: str
    erstellt_am: datetime
    aktualisiert_am: datetime
    # Joined data
    lead: str | None = None
    body: str | None = None
    quellen: list | None = None
    seo_titel: str | None = None
    seo_description: str | None = None
    bild_url: str | None = None
    bild_prompt: str | None = None
    translations: list[TranslationResponse] = []
    supervisor: SupervisorResponse | None = None


class QueueStats(BaseModel):
    total: int
    generating: int
    translating: int
    review: int
    published: int
    rejected: int
