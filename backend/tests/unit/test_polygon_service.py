"""Service-level tests against the in-memory repository."""

from __future__ import annotations

import pytest

from polygons_api.domain.errors import InvalidGeometry, InvalidName, PolygonNotFound
from polygons_api.repositories import memory
from polygons_api.repositories.protocols import PolygonRepository
from polygons_api.services import polygon_service

VALID_POINTS = [(0.0, 0.0), (1.0, 0.0), (0.5, 1.0)]


@pytest.fixture
def repo() -> PolygonRepository:
    return memory.build()


async def test_list_polygons_empty(repo: PolygonRepository) -> None:
    assert await polygon_service.list_polygons(repo) == []


async def test_create_polygon_assigns_id_and_persists(repo: PolygonRepository) -> None:
    created = await polygon_service.create_polygon(
        repo,
        name="P1",
        points=VALID_POINTS,
    )
    assert created.id == 1
    assert created.name == "P1"
    listed = await polygon_service.list_polygons(repo)
    assert listed == [created]


async def test_create_polygon_strips_name(repo: PolygonRepository) -> None:
    created = await polygon_service.create_polygon(
        repo,
        name="   P2   ",
        points=VALID_POINTS,
    )
    assert created.name == "P2"


async def test_create_polygon_rejects_empty_name(repo: PolygonRepository) -> None:
    with pytest.raises(InvalidName):
        await polygon_service.create_polygon(repo, name="   ", points=VALID_POINTS)


async def test_create_polygon_rejects_too_few_points(repo: PolygonRepository) -> None:
    with pytest.raises(InvalidGeometry):
        await polygon_service.create_polygon(repo, name="bad", points=[(0.0, 0.0), (1.0, 1.0)])


async def test_rename_polygon_updates_name(repo: PolygonRepository) -> None:
    p = await polygon_service.create_polygon(repo, name="old", points=VALID_POINTS)
    renamed = await polygon_service.rename_polygon(repo, p.id, name="new")
    assert renamed.id == p.id
    assert renamed.name == "new"
    assert renamed.points == p.points


async def test_rename_polygon_strips_name(repo: PolygonRepository) -> None:
    p = await polygon_service.create_polygon(repo, name="old", points=VALID_POINTS)
    renamed = await polygon_service.rename_polygon(repo, p.id, name="   trimmed   ")
    assert renamed.name == "trimmed"


async def test_rename_polygon_rejects_empty_name(repo: PolygonRepository) -> None:
    p = await polygon_service.create_polygon(repo, name="old", points=VALID_POINTS)
    with pytest.raises(InvalidName):
        await polygon_service.rename_polygon(repo, p.id, name="   ")


async def test_rename_unknown_polygon_raises(repo: PolygonRepository) -> None:
    with pytest.raises(PolygonNotFound):
        await polygon_service.rename_polygon(repo, 999, name="x")


async def test_delete_polygon_removes(repo: PolygonRepository) -> None:
    p = await polygon_service.create_polygon(repo, name="P", points=VALID_POINTS)
    await polygon_service.delete_polygon(repo, p.id)
    assert await polygon_service.list_polygons(repo) == []


async def test_delete_unknown_polygon_raises(repo: PolygonRepository) -> None:
    with pytest.raises(PolygonNotFound):
        await polygon_service.delete_polygon(repo, 999)
