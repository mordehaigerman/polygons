"""Print the OpenAPI 3.1 spec for the polygons API to stdout as YAML.

Used by ``make api-spec`` and by CI to regenerate ``backend/openapi.yaml``.
"""

from __future__ import annotations

import sys

from polygons_api.openapi_export import openapi_yaml


def main() -> None:
    sys.stdout.write(openapi_yaml())


if __name__ == "__main__":
    main()
