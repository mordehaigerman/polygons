"""End-to-end API tests through httpx.AsyncClient + ASGITransport."""

from __future__ import annotations

from httpx import AsyncClient

VALID_POINTS = [[0.0, 0.0], [1.0, 0.0], [0.5, 1.0]]


async def test_health_returns_ok(client: AsyncClient) -> None:
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"ok": True}


async def test_list_polygons_initially_empty(client: AsyncClient) -> None:
    response = await client.get("/api/polygons")
    assert response.status_code == 200
    assert response.json() == []


async def test_create_then_list(client: AsyncClient) -> None:
    create = await client.post("/api/polygons", json={"name": "P1", "points": VALID_POINTS})
    assert create.status_code == 201, create.text
    body = create.json()
    assert body["name"] == "P1"
    assert body["points"] == VALID_POINTS
    assert isinstance(body["id"], int)

    listed = await client.get("/api/polygons")
    assert listed.status_code == 200
    assert listed.json() == [body]


async def test_create_rejects_empty_name(client: AsyncClient) -> None:
    response = await client.post("/api/polygons", json={"name": "   ", "points": VALID_POINTS})
    assert response.status_code == 422
    body = response.json()
    assert body["error"] == "invalid_name"


async def test_create_rejects_too_long_name(client: AsyncClient) -> None:
    response = await client.post(
        "/api/polygons",
        json={"name": "x" * 101, "points": VALID_POINTS},
    )
    assert response.status_code == 422
    # Pydantic's max_length=NAME_MAX_LEN catches this before the service layer.
    body = response.json()
    assert any("name" in err["loc"] for err in body["detail"])


async def test_create_rejects_too_few_points(client: AsyncClient) -> None:
    response = await client.post(
        "/api/polygons",
        json={"name": "P", "points": [[0.0, 0.0], [1.0, 1.0]]},
    )
    assert response.status_code == 422
    # Pydantic's min_length=3 catches this at request parsing, so the response
    # is FastAPI's HTTPValidationError shape rather than the custom envelope.
    body = response.json()
    assert any("points" in err["loc"] for err in body["detail"])


async def test_create_rejects_non_numeric_point(client: AsyncClient) -> None:
    # JSON itself cannot carry inf/NaN, so non-finite floats are unreachable
    # over HTTP. Type mismatch is what we can actually exercise here; finite-
    # number validation is covered at the service layer in unit tests.
    response = await client.post(
        "/api/polygons",
        json={"name": "P", "points": [[0.0, 0.0], [1.0, 1.0], ["bad", 2.0]]},
    )
    assert response.status_code == 422


async def test_rename_updates_name(client: AsyncClient) -> None:
    create = await client.post("/api/polygons", json={"name": "old", "points": VALID_POINTS})
    polygon_id = create.json()["id"]

    rename = await client.patch(f"/api/polygons/{polygon_id}", json={"name": "new"})
    assert rename.status_code == 200, rename.text
    body = rename.json()
    assert body["id"] == polygon_id
    assert body["name"] == "new"
    assert body["points"] == VALID_POINTS


async def test_rename_strips_name(client: AsyncClient) -> None:
    create = await client.post("/api/polygons", json={"name": "old", "points": VALID_POINTS})
    polygon_id = create.json()["id"]

    rename = await client.patch(f"/api/polygons/{polygon_id}", json={"name": "   trimmed   "})
    assert rename.status_code == 200
    assert rename.json()["name"] == "trimmed"


async def test_rename_rejects_empty_name(client: AsyncClient) -> None:
    create = await client.post("/api/polygons", json={"name": "old", "points": VALID_POINTS})
    polygon_id = create.json()["id"]

    rename = await client.patch(f"/api/polygons/{polygon_id}", json={"name": "   "})
    assert rename.status_code == 422
    body = rename.json()
    assert body["error"] == "invalid_name"


async def test_rename_unknown_returns_404(client: AsyncClient) -> None:
    response = await client.patch("/api/polygons/9999", json={"name": "x"})
    assert response.status_code == 404
    body = response.json()
    assert body["error"] == "polygon_not_found"
    assert body["id"] == 9999


async def test_delete_removes_polygon(client: AsyncClient) -> None:
    create = await client.post("/api/polygons", json={"name": "P", "points": VALID_POINTS})
    polygon_id = create.json()["id"]

    delete = await client.delete(f"/api/polygons/{polygon_id}")
    assert delete.status_code == 204

    listed = await client.get("/api/polygons")
    assert listed.json() == []


async def test_delete_unknown_returns_404(client: AsyncClient) -> None:
    response = await client.delete("/api/polygons/9999")
    assert response.status_code == 404
    body = response.json()
    assert body["error"] == "polygon_not_found"
    assert body["id"] == 9999


async def test_delete_with_non_integer_id_returns_422(client: AsyncClient) -> None:
    response = await client.delete("/api/polygons/not-a-number")
    assert response.status_code == 422
