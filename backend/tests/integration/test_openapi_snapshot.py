"""Fail fast if the live OpenAPI spec drifts from the committed file.

Forces every API change to update ``backend/openapi.yaml`` (and the
``frontend/src/api/schema.d.ts`` it drives) in the same PR.
"""

from __future__ import annotations

import difflib
from pathlib import Path

import pytest

from polygons_api.openapi_export import openapi_yaml

SPEC_PATH = Path(__file__).resolve().parents[2] / "openapi.yaml"


def test_openapi_matches_committed_snapshot() -> None:
    live = openapi_yaml()
    committed = SPEC_PATH.read_text()
    if live == committed:
        return
    diff = "\n".join(
        difflib.unified_diff(
            committed.splitlines(),
            live.splitlines(),
            fromfile="committed openapi.yaml",
            tofile="live spec",
            lineterm="",
        )
    )
    pytest.fail(f"OpenAPI drift detected. Regenerate with: make api-spec\n\n{diff}")
