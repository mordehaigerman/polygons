"""Async SQLAlchemy engine, session factory, and schema bootstrap.

production: swap SQLite for PostgreSQL by setting ``DATABASE_URL`` to
``postgresql+asyncpg://...``. The Repository protocol + this module are the
only files that know which engine is in play; services and controllers stay
unchanged.

production: replace the on-startup ``create_schema`` call with Alembic
migrations gated in CI/CD. The schema-on-startup fallback is here purely so
``poetry run uvicorn ...`` is one command for the reviewer.
"""

from __future__ import annotations

from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from polygons_api.repositories.sqlalchemy.models import Base


def build_engine(database_url: str, *, echo: bool = False) -> AsyncEngine:
    # ``check_same_thread`` is a SQLite quirk; harmless for other dialects
    # because the connect_args are dialect-aware via SQLAlchemy.
    connect_args: dict[str, object] = {}
    if database_url.startswith("sqlite"):
        connect_args["check_same_thread"] = False
    return create_async_engine(database_url, echo=echo, connect_args=connect_args, future=True)


def build_session_factory(engine: AsyncEngine) -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def create_schema(engine: AsyncEngine) -> None:
    """Create tables if they do not exist. Used at app startup for dev/demo."""

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def session_scope(
    session_factory: async_sessionmaker[AsyncSession],
) -> AsyncIterator[AsyncSession]:
    """Yield an ``AsyncSession`` wrapped in a transaction.

    Commit on success, rollback on exception. Designed to be the body of a
    FastAPI dependency.
    """

    async with session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
