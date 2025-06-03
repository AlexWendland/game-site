import pytest

from games_backend.games.topological_connect_four.board import NoGeometryTopologicalBoard
from games_backend.games.topological_connect_four.gravity import (
    any_side_gravity,
    bottom_gravity,
    check_direction,
    no_gravity,
)
from games_backend.games.topological_connect_four.models import Player


@pytest.fixture
def test_board():
    """
    Board that looks like the following
    3| - - - -
    2| 2 1 - -
    1| - - - 1
    0| - - 1 -
       -------
       0 1 2 3
    """
    test_board = NoGeometryTopologicalBoard(size=4)
    test_board.set_position(0, 2, Player.TWO)
    test_board.set_position(1, 2, Player.ONE)
    test_board.set_position(2, 0, Player.ONE)
    test_board.set_position(3, 1, Player.ONE)
    return test_board


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
def test_check_direction(test_board, column, row, column_delta, row_delta, expected):
    assert check_direction(test_board, column, row, column_delta, row_delta) == expected


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
def test_bottom_gravity(test_board, column, row, expected):
    assert bottom_gravity(test_board, column, row) == expected


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
def test_all_sides_gravity(test_board, column, row, expected):
    assert any_side_gravity(test_board, column, row) == expected


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
def test_no_gravity(test_board, column, row, expected):
    assert no_gravity(test_board, column, row) == expected
