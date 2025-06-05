import pytest

from games_backend.games.topological_connect_four.geometry import (
    band_geometry,
    invert_geometry,
    klein_geometry,
    mobius_geometry,
    no_geometry,
    sphere_geometry,
    toric_geometry,
)


@pytest.mark.parametrize(
    ["row", "column", "expected"],
    [
        (0, 0, (0, 0)),
        (4, 4, (4, 4)),
        (-1, 0, None),
        (0, -1, None),
        (5, 0, None),
        (0, 5, None),
        (-2, 7, None),
    ],
)
def test_no_geometry_get_coordinates(row: int, column: int, expected: tuple[int, int] | None):
    assert no_geometry(5, row, column) == expected


@pytest.mark.parametrize(
    ["row", "column", "expected"],
    [
        (0, 0, (0, 0)),
        (4, 4, (4, 4)),
        (0, -1, (0, 4)),
        (-1, 0, None),
        (0, 5, (0, 0)),
        (5, 0, None),
        (-2, 7, None),
    ],
)
def test_band_board_get_coordinates(row: int, column: int, expected: tuple[int, int] | None):
    assert band_geometry(5, row, column) == expected


@pytest.mark.parametrize(
    ["row", "column", "expected"],
    [
        (0, 0, (0, 0)),
        (4, 4, (4, 4)),
        (0, -1, (0, 4)),
        (-1, 0, (4, 0)),
        (5, 0, (0, 0)),
        (0, 5, (0, 0)),
        (-2, 7, (3, 2)),
    ],
)
def test_toric_get_coordinates(row: int, column: int, expected: tuple[int, int]):
    assert toric_geometry(5, row, column) == expected


@pytest.mark.parametrize(
    ["row", "column", "expected"],
    [
        (0, 0, (0, 0)),
        (4, 4, (4, 4)),
        (0, -1, (4, 4)),
        (0, -6, (0, 4)),
        (-1, 0, None),
        (0, 5, (4, 0)),
        (0, 10, (0, 0)),
        (5, 0, None),
        (-2, 7, None),
    ],
)
def test_mobius_get_coordinates(row: int, column: int, expected: tuple[int, int]):
    assert mobius_geometry(5, row, column) == expected


@pytest.mark.parametrize(
    ["row", "column", "expected"],
    [
        (0, 0, (0, 0)),
        (4, 4, (4, 4)),
        (0, -1, (4, 4)),
        (0, -6, (0, 4)),
        (-1, 0, (4, 0)),
        (0, 5, (4, 0)),
        (0, 10, (0, 0)),
        (5, 0, (0, 0)),
        (-2, 7, (1, 2)),
    ],
)
def test_klein_get_coordinates(row: int, column: int, expected: tuple[int, int]):
    assert klein_geometry(5, row, column) == expected


@pytest.mark.parametrize(
    ["row", "column", "expected"],
    [
        (0, 0, (0, 0)),
        (4, 4, (4, 4)),
        (0, -1, (4, 4)),
        (0, -6, (0, 4)),
        (-1, 0, (4, 4)),
        (0, 5, (4, 0)),
        (0, 10, (0, 0)),
        (5, 0, (0, 4)),
        (-2, 7, (1, 2)),
    ],
)
def test_invert_get_coordinates(row: int, column: int, expected: tuple[int, int]):
    assert invert_geometry(5, row, column) == expected


@pytest.mark.parametrize(
    ["row", "column", "expected"],
    [
        (0, 0, (0, 0)),
        (4, 4, (4, 4)),
        (0, -1, (0, 0)),
        (0, -6, (0, 4)),
        (-1, 0, (0, 0)),
        (0, 5, (4, 0)),
        (0, 10, (0, 0)),
        (5, 0, (0, 4)),
        (-2, 7, (1, 2)),
    ],
)
def test_sphere_get_coordinates(row: int, column: int, expected: tuple[int, int]):
    assert sphere_geometry(5, row, column) == expected
