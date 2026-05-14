.DEFAULT_GOAL := help

.PHONY: help install backend-install frontend-install dev backend-dev frontend-dev \
        test backend-test frontend-test typecheck backend-typecheck frontend-typecheck \
        lint format check api-spec docker-up docker-down clean distclean

help:
	@echo "Targets:"
	@echo "  install         Install backend (Poetry) and frontend (Yarn) dependencies"
	@echo "  dev             Run backend-dev and frontend-dev in parallel"
	@echo "  backend-dev     Run the FastAPI backend at http://localhost:8000"
	@echo "  frontend-dev    Run the Vite dev server at http://localhost:5173"
	@echo "  test            Run backend and frontend test suites"
	@echo "  typecheck       Run pyright (backend) and tsc --noEmit (frontend)"
	@echo "  lint            Run ruff (backend) and eslint (frontend)"
	@echo "  format          Run ruff format + ruff check --fix (backend) and eslint --fix (frontend)"
	@echo "  check           Run lint, typecheck, test, and ruff format --check (full CI parity)"
	@echo "  api-spec        Regenerate backend/openapi.yaml and frontend/src/api/schema.d.ts"
	@echo "  docker-up       docker compose up --build (backend only, foreground)"
	@echo "  docker-down     docker compose down"
	@echo "  clean           Remove caches, build outputs, and the local SQLite DB"
	@echo "  distclean       clean + remove node_modules and .venv"

install: backend-install frontend-install

backend-install:
	cd backend && poetry install

frontend-install:
	cd frontend && yarn install

dev:
	$(MAKE) -j2 backend-dev frontend-dev

backend-dev:
	cd backend && poetry run uvicorn polygons_api.main:app --reload --host 0.0.0.0 --port 8000

frontend-dev:
	cd frontend && yarn dev

test: backend-test frontend-test

backend-test:
	cd backend && poetry run pytest

frontend-test:
	cd frontend && yarn test --run

typecheck: backend-typecheck frontend-typecheck

backend-typecheck:
	cd backend && poetry run pyright

frontend-typecheck:
	cd frontend && yarn typecheck

lint:
	cd backend && poetry run ruff check .
	cd frontend && yarn lint

format:
	cd backend && poetry run ruff format . && poetry run ruff check --fix .
	cd frontend && yarn format

check: lint typecheck test
	cd backend && poetry run ruff format --check .

api-spec:
	cd backend && poetry run python scripts/export_openapi.py > openapi.yaml.tmp && mv openapi.yaml.tmp openapi.yaml
	cd frontend && yarn generate:api

docker-up:
	docker compose up --build

docker-down:
	docker compose down

clean:
	find backend -type d \( -name __pycache__ -o -name .pytest_cache -o -name .ruff_cache \) -exec rm -rf {} + 2>/dev/null || true
	rm -rf frontend/dist
	rm -f frontend/.yarn/install-state.gz
	rm -f backend/data/polygons.db backend/data/polygons.db-journal backend/data/polygons.db-wal backend/data/polygons.db-shm

distclean: clean
	rm -rf backend/.venv frontend/node_modules
