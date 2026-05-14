"""SQLAlchemy ORM rows.

The ``DeclarativeBase`` class is the one class we are required to write -- it
is part of SQLAlchemy's mapping protocol. Everything else stays in module-level
functions and frozen dataclasses.
"""

from __future__ import annotations

from sqlalchemy import Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """Declarative base for ORM rows."""


class PolygonRow(Base):
    __tablename__ = "polygons"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str]
    # production: store points in PostgreSQL JSONB for indexing, or PostGIS
    # ``geometry(Polygon, 4326)`` for spatial queries. JSON text keeps the
    # take-home portable.
    points_json: Mapped[str] = mapped_column(Text)
