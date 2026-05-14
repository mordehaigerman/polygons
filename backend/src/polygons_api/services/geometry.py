"""Reusable geometry / naming validation steps.

The wire DTOs in ``api/schemas`` describe shapes only; every field-level rule
lives here so the architecture has a single answer to "what makes a polygon
valid".
"""

from __future__ import annotations

import math
from collections.abc import Sequence

from polygons_api.domain.errors import InvalidGeometry, InvalidName
from polygons_api.domain.models import Point

NAME_MAX_LEN = 100
MIN_POINTS = 3


def to_name(raw: str) -> str:
    """Strip and validate a polygon name; raises :class:`InvalidName`."""

    name = raw.strip()
    if not name:
        raise InvalidName("name must not be empty")
    if len(name) > NAME_MAX_LEN:
        raise InvalidName(f"name must be at most {NAME_MAX_LEN} characters")
    return name


def to_points(raw: Sequence[Sequence[float]]) -> tuple[Point, ...]:
    """Validate the raw point list and convert to domain points.

    Raises :class:`InvalidGeometry` if the polygon has fewer than three vertices
    or any non-finite coordinate.
    """

    if len(raw) < MIN_POINTS:
        raise InvalidGeometry(f"polygon must have at least {MIN_POINTS} vertices")
    points: list[Point] = []
    for index, pair in enumerate(raw):
        if len(pair) != 2:
            raise InvalidGeometry(f"point {index} must have exactly 2 coordinates")
        x, y = float(pair[0]), float(pair[1])
        if not (math.isfinite(x) and math.isfinite(y)):
            raise InvalidGeometry(f"point {index} has non-finite coordinates")
        points.append(Point(x=x, y=y))
    return tuple(points)
