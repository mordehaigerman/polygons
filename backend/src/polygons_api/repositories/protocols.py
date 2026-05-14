"""Repository contract expressed as a record of typed callables.

A class with methods would also work, but we prefer keeping behavior in
module-level functions and bundling the callables through a frozen dataclass
factory. Tests and other implementations construct a ``PolygonRepository``
directly with stub callables instead of subclassing.
"""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from dataclasses import dataclass

from polygons_api.domain.models import Polygon, PolygonDraft

ListAll = Callable[[], Awaitable[list[Polygon]]]
Add = Callable[[PolygonDraft], Awaitable[Polygon]]
Rename = Callable[[int, str], Awaitable[Polygon]]
Delete = Callable[[int], Awaitable[None]]


@dataclass(frozen=True, slots=True, kw_only=True)
class PolygonRepository:
    list_all: ListAll
    add: Add
    rename: Rename
    delete: Delete
