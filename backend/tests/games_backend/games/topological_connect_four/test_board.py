import pytest

from games_backend.games.topological_connect_four.board import (
    NOT_A_POSITION,
    BandTopologicalBoard,
    NoGeometryTopologicalBoard,
    ToricTopologicalBoard,
)
from games_backend.games.topological_connect_four.exceptions import GameException
from games_backend.games.topological_connect_four.models import Player


@pytest.mark.parametrize("size", [1, 4, 11])
def test_initialisation(size: int):
    board = NoGeometryTopologicalBoard(size=size)
    assert len(board._state) == size
    for row in board._state:
        assert len(row) == size
    assert board._size == size
    assert board._state[0][0] == Player.NO_PLAYER


@pytest.fixture
def test_board():
    board = NoGeometryTopologicalBoard(size=5)
    board.set_position(0, 0, Player.ONE)
    board.set_position(0, 1, Player.TWO)
    board.set_position(2, 0, Player.ONE)
    return board


@pytest.mark.parametrize(
    ["column", "row", "expected"],
    [
        (0, 0, (0, 0)),
        (4, 4, (4, 4)),
        (-1, 0, NOT_A_POSITION),
        (0, -1, NOT_A_POSITION),
        (5, 0, NOT_A_POSITION),
        (0, 5, NOT_A_POSITION),
        (7, -2, NOT_A_POSITION),
    ],
)
def test_no_geometry_get_coordinates(test_board, column, row, expected):
    assert test_board._get_coordinates(column, row) == expected


@pytest.mark.parametrize(["column", "row"], [(-1, 0), (0, -1), (5, 0), (0, 5), (7, -2)])
def test_normalise_coordinates(test_board, column, row):
    with pytest.raises(GameException):
        test_board.normalise_coordinates(column, row)


@pytest.mark.parametrize(
    ["column", "row", "player"],
    [
        (0, 0, Player.ONE),
        (0, 1, Player.TWO),
        (2, 2, Player.NO_PLAYER),
        (-1, -1, NOT_A_POSITION),
    ],
)
def test_get_position(test_board, column, row, player):
    assert test_board.get_position(column, row) == player


@pytest.mark.parametrize(["column", "row"], [(0, 0), (0, 1), (2, 0)])
def test_set_coordinate_safe_fails(test_board, column, row):
    with pytest.raises(GameException):
        test_board.set_position_safe(column, row, Player.FOUR)


@pytest.mark.parametrize(
    ["column", "row", "expected"],
    [
        (0, 0, (0, 0)),
        (4, 4, (4, 4)),
        (-1, 0, (4, 0)),
        (0, -1, NOT_A_POSITION),
        (5, 0, (0, 0)),
        (0, 5, NOT_A_POSITION),
        (7, -2, NOT_A_POSITION),
    ],
)
def test_band_board_get_coordinates(column, row, expected):
    board = BandTopologicalBoard(size=5)
    assert board._get_coordinates(column, row) == expected


@pytest.mark.parametrize(
    ["column", "row", "expected"],
    [
        (0, 0, (0, 0)),
        (4, 4, (4, 4)),
        (-1, 0, (4, 0)),
        (0, -1, (0, 4)),
        (5, 0, (0, 0)),
        (0, 5, (0, 0)),
        (7, -2, (2, 3)),
    ],
)
def test_toric_get_coordinates(column, row, expected):
    board = ToricTopologicalBoard(size=5)
    assert board._get_coordinates(column, row) == expected
