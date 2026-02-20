"""Load and render YAML prompt templates with LRU cache."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import TYPE_CHECKING

import yaml

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

PROMPTS_DIR = Path(__file__).resolve().parent.parent / "prompts"


@lru_cache(maxsize=32)
def load_prompt(name: str) -> dict:
    """Load a prompt YAML file by name. Raises FileNotFoundError if missing."""
    path = PROMPTS_DIR / f"{name}.yaml"
    if not path.exists():
        raise FileNotFoundError(f"Prompt template '{name}' not found at {path}")
    with open(path) as f:
        return yaml.safe_load(f)


def render_prompt(name: str, **kwargs: str) -> str:
    """Load a prompt template and render it with the given variables."""
    data = load_prompt(name)
    template = data["template"]
    return template.format(**kwargs)


async def load_tonality_summary(db: AsyncSession, top_n: int = 5) -> str:
    """Load top-N tonality traits sorted by weight as a comma-separated string."""
    from sqlalchemy import select
    from db.models import TonalityProfil

    result = await db.execute(
        select(TonalityProfil.merkmal, TonalityProfil.wert)
        .order_by(TonalityProfil.gewichtung.desc())
        .limit(top_n)
    )
    rows = result.all()
    if not rows:
        return "keine Tonalitaet definiert"
    return ", ".join(f"{r.merkmal}: {r.wert}" for r in rows)


async def render_prompt_with_context(
    name: str,
    artikel: object,
    db: AsyncSession,
    **extra: str,
) -> str:
    """Render a prompt template with standard article variables auto-filled.

    Extracts {titel}, {lead}, {body}, {kategorie}, {sprache} from the artikel
    object and loads {tonalitaet} from the TonalityProfil table.
    Extra kwargs override auto-filled values.
    """
    # Standard-Variablen aus Artikel-Objekt extrahieren
    context: dict[str, str] = {
        "titel": getattr(artikel, "titel", "") or "",
        "lead": getattr(artikel, "lead", "") or "",
        "body": getattr(artikel, "body", "") or "",
        "kategorie": getattr(artikel, "kategorie", "") or "",
        "sprache": "de",
    }

    # Tonalitaet aus DB laden
    context["tonalitaet"] = await load_tonality_summary(db)

    # Explizite Overrides anwenden
    context.update(extra)

    data = load_prompt(name)
    template = data["template"]
    return template.format(**context)
