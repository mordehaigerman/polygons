"""In-memory ``PolygonRepository`` for unit tests and early dev.

State is held in a closed-over dict; the public surface is the
``PolygonRepository`` bundle returned by :func:`build`.
"""

from __future__ import annotations

import itertools

from polygons_api.domain.errors import PolygonNotFound
from polygons_api.domain.models import Polygon, PolygonDraft
from polygons_api.repositories.protocols import PolygonRepository


def build() -> PolygonRepository:
    state: dict[int, Polygon] = {}
    counter = itertools.count(1)

    async def list_all() -> list[Polygon]:
        return sorted(state.values(), key=lambda p: p.id)

    async def add(draft: PolygonDraft) -> Polygon:
        polygon = Polygon(id=next(counter), name=draft.name, points=draft.points)
        state[polygon.id] = polygon
        return polygon

    async def rename(polygon_id: int, name: str) -> Polygon:
        existing = state.get(polygon_id)
        if existing is None:
            raise PolygonNotFound(polygon_id)
        renamed = Polygon(id=existing.id, name=name, points=existing.points)
        state[polygon_id] = renamed
        return renamed

    async def delete(polygon_id: int) -> None:
        if state.pop(polygon_id, None) is None:
            raise PolygonNotFound(polygon_id)

    return PolygonRepository(list_all=list_all, add=add, rename=rename, delete=delete)
