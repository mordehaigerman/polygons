"""Serialize the OpenAPI spec to YAML.

Shared by ``scripts/export_openapi.py`` (used by ``make api-spec``) and the
snapshot test in ``tests/integration/test_openapi_snapshot.py``. Centralizing
the dump options here keeps the regenerated file and the test in lock-step.
"""

from __future__ import annotations

import yaml

from polygons_api.main import create_app


class _IndentedDumper(yaml.SafeDumper):
    """PyYAML dumper that indents block sequences under their parent key.

    By default PyYAML emits "indentless" sequences (``- ok`` flush with the
    parent key). Overriding ``increase_indent`` to always indent keeps array
    elements visually nested, which is the convention OpenAPI consumers tend
    to read.
    """

    def increase_indent(self, flow: bool = False, indentless: bool = False) -> None:
        super().increase_indent(flow=flow, indentless=False)


def openapi_yaml() -> str:
    """Return the OpenAPI 3.1 spec serialized as deterministic YAML.

    ``sort_keys=True`` pins key order so the snapshot test isn't flaky;
    ``default_flow_style=False`` keeps block style for readable diffs;
    ``_IndentedDumper`` nests array elements under their key for legibility.
    """

    return yaml.dump(
        create_app().openapi(),
        Dumper=_IndentedDumper,
        sort_keys=True,
        default_flow_style=False,
    )
