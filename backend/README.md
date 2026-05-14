# Backend

FastAPI + SQLAlchemy 2.0 (async) + SQLite, OpenAPI 3.1 spec. See the top-level [README](../README.md) for the full picture; this file documents only backend-specific details.

## Run locally

Requires Python 3.12+ and Poetry 2. For Docker (the image targets Python 3.14), see the top-level README's `make docker-up`.

```bash
poetry install
poetry run uvicorn polygons_api.main:app --reload --port 8000
```

- Swagger UI: http://localhost:8000/docs
- OpenAPI JSON: http://localhost:8000/openapi.json
- Health: http://localhost:8000/health (no artificial delay)

The default `DATABASE_URL` is relative to the current directory, so run uvicorn from this `backend/` directory (or override the env var).

## Environment

| Variable        | Default                                  | Description                                             |
| --------------- | ---------------------------------------- | ------------------------------------------------------- |
| `DATABASE_URL`  | `sqlite+aiosqlite:///./data/polygons.db` | SQLAlchemy async URL                                    |
| `SLEEP_SECONDS` | `5.0`                                    | Artificial delay applied to polygon routes              |
| `DEBUG`         | `false`                                  | Development mode: permissive CORS + SQLAlchemy SQL echo |

## Migrations

Alembic lives in [`alembic/`](alembic). For developer convenience the app runs `create_all` on startup; production should disable that and use `alembic upgrade head` in CI/CD instead.

## Tests

```bash
poetry run pytest
```

The integration tests use an in-memory aiosqlite engine and override `artificial_delay` to zero.

## OpenAPI

Regenerate both `backend/openapi.yaml` and the matching `frontend/src/api/schema.d.ts` in one step from the repo root:

```bash
make api-spec
```

Backend-only (mirrors what `make api-spec` runs for this side; the `tmp + mv` avoids leaving a half-written file if the script errors):

```bash
poetry run python scripts/export_openapi.py > openapi.yaml.tmp && mv openapi.yaml.tmp openapi.yaml
```

`openapi.yaml` is committed; CI fails if it drifts from the live spec.
