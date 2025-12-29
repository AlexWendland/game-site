import pytest

from games_backend.games.topological_connect_four.gravity import (
    _check_direction,
    any_side_gravity,
    bottom_gravity,
    no_gravity,
)


@pytest.fixture
def test_board() -> list[list[int | None]]:
    """
    Board that looks like the following
    3| - - - -
    2| 2 1 - -
    1| - - - 1
    0| - - 1 -
       -------
       0 1 2 3
    """
    return [
        [None, None, 1, None],
        [None, None, None, 1],
        [2, 1, None, None],
        [None, None, None, None],
    ]


@pytest.mark.parametrize(
    ["column", "row", "column_delta", "row_delta", "expected"],
    [
        (2, 2, -1, 0, True),
        (2, 2, 1, 0, False),
        (2, 2, 0, -1, False),
        (2, 2, 0, 1, False),
        (2, 1, -1, 0, False),
        (2, 1, 1, 0, True),
        (2, 1, 0, -1, True),
        (2, 1, 0, 1, False),
        (1, 3, 0, -1, False),
        (1, 3, 0, 1, True),
    ],
)
def test_check_direction(
    test_board: list[list[int | None]], column: int, row: int, column_delta: int, row_delta: int, expected: bool
):
    assert _check_direction(test_board, row, column, column_delta, row_delta, 4) == expected


@pytest.mark.parametrize(
    ["column", "row", "expected"],
    [
        (0, 2, False),
        (2, 0, False),
        (2, 2, False),
        (0, 0, True),
        (2, 1, True),
        (1, 1, False),
        (1, 3, False),
    ],
)
def test_bottom_gravity(test_board: list[list[int | None]], column: int, row: int, expected: bool):
    assert bottom_gravity(test_board, row, column) == expected


@pytest.mark.parametrize(
    ["column", "row", "expected"],
    [
        (0, 2, False),
        (2, 0, False),
        (2, 2, True),
        (0, 0, True),
        (2, 1, True),
        (1, 1, False),
        (1, 3, True),
    ],
)
def test_all_sides_gravity(test_board: list[list[int | None]], column: int, row: int, expected: bool):
    assert any_side_gravity(test_board, row, column) == expected


@pytest.mark.parametrize(
    ["column", "row", "expected"],
    [
        (0, 2, False),
        (2, 0, False),
        (2, 2, True),
        (0, 0, True),
        (2, 1, True),
        (1, 1, True),
        (1, 3, True),
    ],
)
def test_no_gravity(test_board: list[list[int | None]], column: int, row: int, expected: bool):
    assert no_gravity(test_board, row, column) == expected
