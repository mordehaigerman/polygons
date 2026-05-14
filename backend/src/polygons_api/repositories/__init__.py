"""Data access layer.

The ``PolygonRepository`` protocol (a frozen dataclass of typed callables) is
the contract; concrete implementations live in :mod:`memory` and
:mod:`sqlalchemy`.
"""

from polygons_api.repositories.protocols import PolygonRepository

__all__ = ["PolygonRepository"]
