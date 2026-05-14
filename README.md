# Polygons

A small fullstack app for managing polygons drawn on an image.

- **Backend**: Python 3.12+ with FastAPI + SQLAlchemy 2.0 (async) + SQLite, OpenAPI 3.1 as the typed contract.
- **Frontend**: React 19 + TypeScript 5 + Vite 7 + TanStack Query + Tailwind v4; canvas drawing, optimistic UI to mask the backend's built-in 5-second artificial delay.
- **Architecture**: layered `api -> services -> repositories -> domain`. Functional style: module-level functions for behavior, frozen dataclasses for data, no classes of our own except the SQLAlchemy ORM row.

## Quickstart

### Prerequisites

- Python 3.12+ (the Docker image targets 3.14) + [Poetry 2](https://python-poetry.org/)
- Node.js 22+ (CI runs Node 24) with [Corepack](https://nodejs.org/api/corepack.html) enabled (`corepack enable`). The project pins **Yarn 4** via the `packageManager` field in `frontend/package.json`.
- (Optional) Docker + Docker Compose for the backend container

### Run locally

```bash
make install           # installs backend (Poetry) + frontend (Yarn)

make backend-dev       # http://localhost:8000  (Swagger UI at http://localhost:8000/docs)
make frontend-dev      # http://localhost:5173  (Vite proxies /api -> :8000)
```

Open `http://localhost:5173` in a browser. Each polygon mutation waits 5 seconds on the server by default (`SLEEP_SECONDS`); the UI hides that wait with optimistic updates.

### Run the backend in Docker

```bash
make docker-up         # docker compose up --build
```

The SQLite database file is persisted to `./backend/data/polygons.db` via a bind mount.

### Tests

```bash
make test              # backend (pytest) + frontend (vitest)
make lint              # ruff + eslint
```

The frontend uses **ESLint v9 (flat config)** with `@stylistic/eslint-plugin` for formatting and `eslint-plugin-react` + `eslint-plugin-react-hooks` for React-specific rules — one tool covers both style and correctness.

### Regenerate the OpenAPI spec + frontend types

```bash
make api-spec          # writes backend/openapi.yaml + frontend/src/api/schema.d.ts
```

CI fails if either file is out of date.

## Architecture notes

```
backend/src/polygons_api/
  api/          routers + plain @dataclass DTOs + DI wiring + HTTP error mapping
  services/     module-level async functions (no service class), all validation lives here
  repositories/ PolygonRepository protocol (frozen dataclass of typed callables) + SQLAlchemy and in-memory implementations
  domain/       frozen dataclasses Point, PolygonDraft, Polygon + domain errors
  infra/        async engine + session factory + artificial sleep
  core/         Settings dataclass + load_settings()
```

Dependency arrows always point inward: `api -> services -> repositories -> domain`. The `PolygonRepository` is a frozen dataclass of typed callables, so swapping SQLAlchemy for anything else is a `build()` factory change with no ripple through services or routers.

The full OpenAPI 3.1 spec is committed at [`backend/openapi.yaml`](backend/openapi.yaml) and the frontend's API client is typed against it via [`openapi-typescript`](https://github.com/openapi-ts/openapi-typescript). Any contract drift breaks compilation in CI.

## Production considerations

Every dev-only shortcut is annotated with a one-line `# production:` comment at its decision site. The full list:

- **Persistence**: SQLite -> PostgreSQL via `asyncpg`. The Repository protocol + `DATABASE_URL` make this a config-only swap.
- **Geometry storage**: JSON text column -> PostgreSQL `JSONB` for indexing, or PostGIS `geometry(Polygon, 4326)` for spatial queries.
- **Schema management**: Alembic migrations gated in CI/CD; remove the dev-only `create_all` fallback.
- **Latency**: drop the artificial 5-second delay; the optimistic UI degrades gracefully.
- **Authentication / Authorization**: JWT or OAuth middleware before the polygon routes, plus per-row ownership on the model.
- **CORS**: same-origin behind a reverse proxy, or an explicit allow-list from env; no permissive defaults.
- **Concurrency**: Postgres replaces SQLite to support concurrent writers cleanly.
- **Observability**: structured JSON logs + OpenTelemetry traces + `/metrics` for Prometheus.
- **Rate limiting**: token bucket at the upstream proxy (NGINX or Envoy) or as ASGI middleware.
- **Validation expressiveness**: wire DTOs are plain dataclasses today, so the OpenAPI spec describes shapes only; switch to Pydantic `BaseModel` with `Field(...)` constraints when richer client-side validation matters.
- **Deployment**: containerize the frontend too (NGINX serving the Vite build) and deploy both behind one ingress. This repo ships a Docker setup for the backend only, so the frontend runs via Vite locally or your own static hosting.

## Out of scope

- Authentication / Authorization, multi-user, polygon drag / resize, self-intersection detection, undo / redo, API versioning prefix.

The UI also adds a few conveniences on top of the core flows: hover-highlighting from either the canvas or the sidebar, double-click rename on a row (`PATCH /api/polygons/{id}`), an optional "tap canvas to start drawing" mode, a refresh-image button, and offline-friendly caching of the polygon list + background image in `localStorage`.
