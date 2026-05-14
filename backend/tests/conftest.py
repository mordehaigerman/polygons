"""Shared test fixtures.

Each test gets a fresh in-memory aiosqlite engine. The artificial delay is
overridden to zero so the suite is fast.
"""

from __future__ import annotations

from collections.abc import AsyncIterator

import pytest_asyncio
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from polygons_api.api.deps import artificial_delay
from polygons_api.core.config import Settings
from polygons_api.infra.db import create_schema
from polygons_api.main import create_app


@pytest_asyncio.fixture
async def app() -> AsyncIterator[FastAPI]:
    settings = Settings(
        database_url="sqlite+aiosqlite:///:memory:",
        sleep_seconds=0.0,
        debug=False,
    )
    fastapi_app = create_app(settings)
    # ASGITransport doesn't fire FastAPI's lifespan, so do the work it would
    # normally do (schema creation; eventual dispose in the finally below).
    await create_schema(fastapi_app.state.engine)

    # Settings flow through ``app.state.settings`` via ``create_app`` above, so
    # ``get_settings`` doesn't need a dependency override. The artificial delay
    # still needs to be zeroed because it has its own dep, not a setting.
    fastapi_app.dependency_overrides[artificial_delay] = lambda: None

    try:
        yield fastapi_app
    finally:
        await fastapi_app.state.engine.dispose()


@pytest_asyncio.fixture
async def client(app: FastAPI) -> AsyncIterator[AsyncClient]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac
