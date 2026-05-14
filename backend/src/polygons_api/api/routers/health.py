"""Liveness probe; intentionally bypasses the artificial delay."""

from __future__ import annotations

from fastapi import APIRouter

from polygons_api.api.schemas.health import Health

router = APIRouter(tags=["health"])


@router.get(
    "/health",
    response_model=Health,
    operation_id="health",
    summary="Liveness probe",
)
async def health_route() -> Health:
    return Health(ok=True)
