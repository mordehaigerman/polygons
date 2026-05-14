# syntax=docker/dockerfile:1.7

# ---- Builder ----------------------------------------------------------------
FROM python:3.14-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    POETRY_VERSION=2.1.1 \
    POETRY_VIRTUALENVS_CREATE=false \
    POETRY_NO_INTERACTION=1

# build-essential is a fallback for any dependency that ships only an sdist
# for Python 3.14 (uvloop, httptools, pyyaml C ext). Drop once 3.14 wheels
# are universal on PyPI.
RUN apt-get update \
    && apt-get install --no-install-recommends -y build-essential \
    && rm -rf /var/lib/apt/lists/*

RUN pip install "poetry==${POETRY_VERSION}"

WORKDIR /app

COPY pyproject.toml poetry.lock ./
RUN python -m venv /opt/venv \
    && /opt/venv/bin/pip install --no-cache-dir --upgrade pip
ENV PATH="/opt/venv/bin:${PATH}"

# Install dependencies into the venv (without the project itself).
RUN poetry install --only main --no-root

# Now bring in the source and install the project so the package metadata is wired.
COPY src ./src
COPY alembic ./alembic
COPY alembic.ini ./
RUN poetry install --only main

# ---- Runtime ----------------------------------------------------------------
FROM python:3.14-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:${PATH}" \
    DATABASE_URL="sqlite+aiosqlite:////app/data/polygons.db" \
    SLEEP_SECONDS=5

WORKDIR /app

# Non-root user for production hygiene.
RUN groupadd --system app && useradd --system --gid app --home /app app

COPY --from=builder /opt/venv /opt/venv
COPY --from=builder /app/src /app/src
COPY --from=builder /app/alembic /app/alembic
COPY --from=builder /app/alembic.ini /app/alembic.ini

RUN mkdir -p /app/data && chown -R app:app /app
USER app

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=5 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health').close()"

CMD ["uvicorn", "polygons_api.main:app", "--host", "0.0.0.0", "--port", "8000"]
