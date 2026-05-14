"""Pure geometry/naming validation tests."""

from __future__ import annotations

import math

import pytest

from polygons_api.domain.errors import InvalidGeometry, InvalidName
from polygons_api.domain.models import Point
from polygons_api.services.geometry import to_name, to_points


def test_to_name_strips_and_returns() -> None:
    assert to_name("  P1  ") == "P1"


def test_to_name_accepts_at_limit() -> None:
    name = "x" * 100
    assert to_name(name) == name


def test_to_name_rejects_empty() -> None:
    with pytest.raises(InvalidName):
        to_name("   ")


def test_to_name_rejects_too_long() -> None:
    with pytest.raises(InvalidName):
        to_name("x" * 101)


def test_to_points_valid_triangle() -> None:
    result = to_points([(0.0, 0.0), (1.0, 0.0), (0.5, 1.0)])
    assert result == (
        Point(x=0.0, y=0.0),
        Point(x=1.0, y=0.0),
        Point(x=0.5, y=1.0),
    )


def test_to_points_rejects_too_few() -> None:
    with pytest.raises(InvalidGeometry):
        to_points([(0.0, 0.0), (1.0, 1.0)])


@pytest.mark.parametrize("bad", [math.inf, -math.inf, math.nan])
def test_to_points_rejects_non_finite(bad: float) -> None:
    with pytest.raises(InvalidGeometry):
        to_points([(0.0, 0.0), (1.0, 1.0), (bad, 2.0)])


def test_to_points_rejects_wrong_arity() -> None:
    with pytest.raises(InvalidGeometry):
        to_points([(0.0, 0.0, 0.0), (1.0, 1.0), (2.0, 0.0)])  # type: ignore[list-item]
