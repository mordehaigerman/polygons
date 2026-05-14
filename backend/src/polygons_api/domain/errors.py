"""Domain errors raised by services and repositories.

These are mapped to HTTP statuses by ``api.errors``; the domain itself stays
HTTP-agnostic.
"""

from __future__ import annotations


class DomainError(Exception):
    """Base class for all domain-level errors."""


class PolygonNotFound(DomainError):
    """Raised by the repository when a polygon id does not exist."""

    def __init__(self, polygon_id: int) -> None:
        super().__init__(f"polygon {polygon_id} not found")
        self.polygon_id = polygon_id


class InvalidGeometry(DomainError):
    """Raised by the geometry validator when point data is unusable."""


class InvalidName(DomainError):
    """Raised by the name validator when a polygon name fails the rules."""
