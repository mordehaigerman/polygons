"""Application settings.

No ``pydantic-settings`` dependency: a plain frozen dataclass plus a free
``load_settings()`` reading ``os.environ`` is enough for the surface we need.
"""

from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True, slots=True, kw_only=True)
class Settings:
    database_url: str
    # production: drop the artificial delay; the optimistic UI degrades gracefully.
    sleep_seconds: float
    debug: bool


def _as_bool(raw: str | None) -> bool:
    return (raw or "").strip().lower() in {"1", "true", "yes", "on"}


def load_settings() -> Settings:
    return Settings(
        database_url=os.environ.get("DATABASE_URL", "sqlite+aiosqlite:///./data/polygons.db"),
        sleep_seconds=float(os.environ.get("SLEEP_SECONDS", "5.0")),
        debug=_as_bool(os.environ.get("DEBUG")),
    )
