"""Map domain errors to HTTP responses with a consistent JSON envelope."""

from __future__ import annotations

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse

from polygons_api.domain.errors import (
    InvalidGeometry,
    InvalidName,
    PolygonNotFound,
)


def _envelope(*, error: str, detail: str, **extra: object) -> dict[str, object]:
    body: dict[str, object] = {"error": error, "detail": detail}
    body.update(extra)
    return body


async def _polygon_not_found(_: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, PolygonNotFound)
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content=_envelope(error="polygon_not_found", detail=str(exc), id=exc.polygon_id),
    )


async def _invalid_geometry(_: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, InvalidGeometry)
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        content=_envelope(error="invalid_geometry", detail=str(exc)),
    )


async def _invalid_name(_: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, InvalidName)
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        content=_envelope(error="invalid_name", detail=str(exc)),
    )


def install_error_handlers(app: FastAPI) -> None:
    app.add_exception_handler(PolygonNotFound, _polygon_not_found)
    app.add_exception_handler(InvalidGeometry, _invalid_geometry)
    app.add_exception_handler(InvalidName, _invalid_name)
