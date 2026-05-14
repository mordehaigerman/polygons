"""Polygons HTTP surface.

production: add JWT/OAuth middleware before this router and per-row ownership
on the model -- the take-home runs unauthenticated by design.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, status

from polygons_api.api.deps import artificial_delay, get_polygon_repo
from polygons_api.api.schemas.error import NotFoundEnvelope
from polygons_api.api.schemas.polygon import (
    PolygonIn,
    PolygonOut,
    PolygonRenameIn,
    to_polygon_out,
)
from polygons_api.repositories.protocols import PolygonRepository
from polygons_api.services import polygon_service

router = APIRouter(
    prefix="/api/polygons",
    tags=["polygons"],
    dependencies=[Depends(artificial_delay)],
)


@router.get(
    "",
    response_model=list[PolygonOut],
    operation_id="listPolygons",
    summary="List polygons",
)
async def list_polygons_route(
    repo: PolygonRepository = Depends(get_polygon_repo),
) -> list[PolygonOut]:
    polygons = await polygon_service.list_polygons(repo)
    return [to_polygon_out(p) for p in polygons]


@router.post(
    "",
    response_model=PolygonOut,
    status_code=status.HTTP_201_CREATED,
    operation_id="createPolygon",
    summary="Create a polygon",
)
async def create_polygon_route(
    payload: PolygonIn,
    repo: PolygonRepository = Depends(get_polygon_repo),
) -> PolygonOut:
    polygon = await polygon_service.create_polygon(repo, name=payload.name, points=payload.points)
    return to_polygon_out(polygon)


@router.patch(
    "/{polygon_id}",
    response_model=PolygonOut,
    operation_id="renamePolygon",
    summary="Rename a polygon",
    responses={
        status.HTTP_404_NOT_FOUND: {"model": NotFoundEnvelope, "description": "Polygon not found"},
    },
)
async def rename_polygon_route(
    polygon_id: int,
    payload: PolygonRenameIn,
    repo: PolygonRepository = Depends(get_polygon_repo),
) -> PolygonOut:
    polygon = await polygon_service.rename_polygon(repo, polygon_id, name=payload.name)
    return to_polygon_out(polygon)


@router.delete(
    "/{polygon_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="deletePolygon",
    summary="Delete a polygon",
    responses={
        status.HTTP_404_NOT_FOUND: {"model": NotFoundEnvelope, "description": "Polygon not found"},
    },
)
async def delete_polygon_route(
    polygon_id: int,
    repo: PolygonRepository = Depends(get_polygon_repo),
) -> None:
    await polygon_service.delete_polygon(repo, polygon_id)
