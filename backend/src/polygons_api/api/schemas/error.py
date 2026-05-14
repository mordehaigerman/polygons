"""Wire DTOs for backend error responses, documented in OpenAPI.

The actual response payloads are assembled in :mod:`polygons_api.api.errors`;
the dataclasses here exist solely to give the spec a named schema that typed
clients can discriminate against.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True, kw_only=True)
class NotFoundEnvelope:
    """Envelope returned with HTTP 404 when a polygon id does not exist."""

    error: str
    detail: str
    id: int
