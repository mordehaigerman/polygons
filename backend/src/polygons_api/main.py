"""FastAPI app factory.

Wires routers, error handlers, CORS (debug-only), and the DB lifespan.
"""

from __future__ import annotations

import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.engine import make_url

from polygons_api.api.errors import install_error_handlers
from polygons_api.api.routers import health, polygons
from polygons_api.core.config import Settings, load_settings
from polygons_api.infra.db import (
    build_engine,
    build_session_factory,
    create_schema,
)

logger = logging.getLogger("polygons_api")


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or load_settings()
    engine = build_engine(settings.database_url, echo=settings.debug)
    session_factory = build_session_factory(engine)

    @asynccontextmanager
    async def lifespan(_app: FastAPI) -> AsyncGenerator[None, None]:
        # production: rely on Alembic migrations in CI/CD instead of
        # ``create_all`` on startup. This keeps ``poetry run uvicorn`` a single
        # command for the reviewer.
        await create_schema(engine)
        logger.info(
            "schema ensured at %s",
            make_url(settings.database_url).render_as_string(hide_password=True),
        )
        yield
        await engine.dispose()

    app = FastAPI(
        title="Polygons API",
        version="0.1.0",
        summary="Manage polygons drawn over an image.",
        lifespan=lifespan,
    )
    app.state.settings = settings
    app.state.engine = engine
    app.state.session_factory = session_factory

    # production: same-origin behind a reverse proxy, or an explicit allow-list
    # from env. Permissive CORS only when DEBUG=True so ``yarn dev`` can talk
    # to ``uvicorn`` directly during development.
    if settings.debug:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_methods=["*"],
            allow_headers=["*"],
        )

    install_error_handlers(app)
    app.include_router(health.router)
    app.include_router(polygons.router)
    return app


app = create_app()
