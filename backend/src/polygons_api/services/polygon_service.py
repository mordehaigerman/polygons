"""Use cases for the polygons resource.

Each function takes the :class:`PolygonRepository` bundle explicitly. There is
intentionally no ``PolygonService`` class -- behaviour is just functions over
data.
"""

from __future__ import annotations

from collections.abc import Sequence

from polygons_api.domain.models import Polygon, PolygonDraft
from polygons_api.repositories.protocols import PolygonRepository
from polygons_api.services.geometry import to_name, to_points


async def list_polygons(repo: PolygonRepository) -> list[Polygon]:
    """Return every polygon currently stored."""

    return await repo.list_all()


async def create_polygon(
    repo: PolygonRepository,
    *,
    name: str,
    points: Sequence[Sequence[float]],
) -> Polygon:
    """Validate and persist a new polygon.

    Raises :class:`InvalidName` if the name is empty/whitespace or exceeds
    ``NAME_MAX_LEN``, or :class:`InvalidGeometry` if the polygon has fewer
    than ``MIN_POINTS`` vertices or any non-finite coordinate.
    """

    draft = PolygonDraft(name=to_name(name), points=to_points(points))
    return await repo.add(draft)


async def rename_polygon(
    repo: PolygonRepository,
    polygon_id: int,
    *,
    name: str,
) -> Polygon:
    """Validate the new name and update the polygon's display name.

    Raises :class:`PolygonNotFound` if no polygon with that id exists, or
    :class:`InvalidName` if the name is empty/whitespace or exceeds
    ``NAME_MAX_LEN``.
    """

    return await repo.rename(polygon_id, to_name(name))


async def delete_polygon(repo: PolygonRepository, polygon_id: int) -> None:
    """Remove the polygon identified by ``polygon_id``.

    Raises :class:`PolygonNotFound` if no polygon with that id exists.
    """

    await repo.delete(polygon_id)
