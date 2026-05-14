"""Module-level async repository functions plus a ``build(session)`` factory.

The free functions take an :class:`AsyncSession` as their first argument. The
:func:`build` factory binds the session via ``functools.partial`` and returns
a :class:`PolygonRepository` callable bundle suitable for injection.
"""

from __future__ import annotations

from functools import partial

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from polygons_api.domain.errors import PolygonNotFound
from polygons_api.domain.models import Polygon, PolygonDraft
from polygons_api.repositories.mappers import points_to_json, row_to_domain
from polygons_api.repositories.protocols import PolygonRepository
from polygons_api.repositories.sqlalchemy.models import PolygonRow


async def list_all(session: AsyncSession) -> list[Polygon]:
    result = await session.scalars(select(PolygonRow).order_by(PolygonRow.id))
    return [row_to_domain(row) for row in result]


async def add(session: AsyncSession, draft: PolygonDraft) -> Polygon:
    row = PolygonRow(name=draft.name, points_json=points_to_json(draft.points))
    session.add(row)
    await session.flush()
    return row_to_domain(row)


async def rename(session: AsyncSession, polygon_id: int, name: str) -> Polygon:
    row = await session.get(PolygonRow, polygon_id)
    if row is None:
        raise PolygonNotFound(polygon_id)
    row.name = name
    await session.flush()
    return row_to_domain(row)


async def delete(session: AsyncSession, polygon_id: int) -> None:
    row = await session.get(PolygonRow, polygon_id)
    if row is None:
        raise PolygonNotFound(polygon_id)
    await session.delete(row)


def build(session: AsyncSession) -> PolygonRepository:
    return PolygonRepository(
        list_all=partial(list_all, session),
        add=partial(add, session),
        rename=partial(rename, session),
        delete=partial(delete, session),
    )
