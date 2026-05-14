"""FastAPI dependency wiring.

These are the only functions that know which concrete implementation backs the
:class:`PolygonRepository` -- swap them out in tests via
``app.dependency_overrides``.
"""

from __future__ import annotations

from collections.abc import AsyncIterator

from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from polygons_api.core.config import Settings
from polygons_api.infra.db import session_scope
from polygons_api.infra.sleep import sleep_for
from polygons_api.repositories.protocols import PolygonRepository
from polygons_api.repositories.sqlalchemy import polygon_repo as sa_polygon_repo


def get_settings(request: Request) -> Settings:
    settings = getattr(request.app.state, "settings", None)
    if settings is None:
        raise RuntimeError("settings missing from app.state")
    return settings


def get_session_factory(request: Request) -> async_sessionmaker[AsyncSession]:
    factory = getattr(request.app.state, "session_factory", None)
    if factory is None:
        raise RuntimeError("session_factory missing from app.state")
    return factory


async def get_session(
    factory: async_sessionmaker[AsyncSession] = Depends(get_session_factory),
) -> AsyncIterator[AsyncSession]:
    async for session in session_scope(factory):
        yield session


def get_polygon_repo(
    session: AsyncSession = Depends(get_session),
) -> PolygonRepository:
    return sa_polygon_repo.build(session)


async def artificial_delay(
    settings: Settings = Depends(get_settings),
) -> None:
    await sleep_for(settings.sleep_seconds)
