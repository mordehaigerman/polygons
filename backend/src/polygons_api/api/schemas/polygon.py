"""Wire DTOs for the polygons resource.

``PolygonIn`` uses ``pydantic.dataclasses.dataclass`` so the wire-level
constraints (name length, vertex count) appear in the OpenAPI spec and are
enforced before the request reaches a handler. Service-layer checks in
:mod:`polygons_api.services.geometry` still cover anything Pydantic can't —
whitespace-only names (which pass ``min_length``), non-finite numbers (which
JSON can't carry anyway), and any future geometry rules.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Annotated

from pydantic import Field
from pydantic.dataclasses import dataclass as pydantic_dataclass

from polygons_api.domain.models import Polygon
from polygons_api.services.geometry import MIN_POINTS, NAME_MAX_LEN


@pydantic_dataclass(frozen=True, slots=True, kw_only=True)
class PolygonIn:
    name: Annotated[str, Field(min_length=1, max_length=NAME_MAX_LEN)]
    points: Annotated[list[tuple[float, float]], Field(min_length=MIN_POINTS)]


@pydantic_dataclass(frozen=True, slots=True, kw_only=True)
class PolygonRenameIn:
    name: Annotated[str, Field(min_length=1, max_length=NAME_MAX_LEN)]


@dataclass(frozen=True, slots=True, kw_only=True)
class PolygonOut:
    id: int
    name: str
    points: list[tuple[float, float]]


def to_polygon_out(polygon: Polygon) -> PolygonOut:
    return PolygonOut(
        id=polygon.id,
        name=polygon.name,
        points=[(p.x, p.y) for p in polygon.points],
    )
