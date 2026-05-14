"""Frozen dataclasses for the polygon domain. No behavior, no framework imports."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True, kw_only=True)
class Point:
    x: float
    y: float


@dataclass(frozen=True, slots=True, kw_only=True)
class PolygonDraft:
    name: str
    points: tuple[Point, ...]


@dataclass(frozen=True, slots=True, kw_only=True)
class Polygon:
    id: int
    name: str
    points: tuple[Point, ...]
