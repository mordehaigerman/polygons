"""Conversions between ORM rows and domain models."""

from __future__ import annotations

import json
from collections.abc import Iterable

from polygons_api.domain.models import Point, Polygon
from polygons_api.repositories.sqlalchemy.models import PolygonRow


def row_to_domain(row: PolygonRow) -> Polygon:
    raw: list[list[float]] = json.loads(row.points_json)
    return Polygon(
        id=row.id,
        name=row.name,
        points=tuple(Point(x=float(x), y=float(y)) for x, y in raw),
    )


def points_to_json(points: Iterable[Point]) -> str:
    return json.dumps([[p.x, p.y] for p in points])
