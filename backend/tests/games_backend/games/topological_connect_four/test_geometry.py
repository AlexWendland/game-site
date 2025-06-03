import pytest

from games_backend.games.topological_connect_four.geometry import band_geometry, no_geometry, toric_geometry


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
