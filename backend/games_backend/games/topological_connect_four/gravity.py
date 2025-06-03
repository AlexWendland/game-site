from typing import Callable

from games_backend import models
from games_backend.games.topological_connect_four.exceptions import GameException

GravityFunction = Callable[[list[list[int | None]], int, int], bool]


def _get_board_size(board: list[list[int | None]]) -> int:
    return len(board)


def _valid_position(row: int, column: int, board_size: int) -> bool:
    if (0 <= column < board_size) and (0 <= row < board_size):
        return True
    return False


def no_gravity(board: list[list[int | None]], row: int, column: int) -> bool:
    if not _valid_position(row, column, _get_board_size(board)):
        raise GameException(f"Position ({row=}, {column=}) is not valid for the board size {_get_board_size(board)}")
    return board[row][column] is None


def _check_direction(
    board: list[list[int | None]],
    row: int,
    column: int,
    column_delta: int,
    row_delta: int,
    board_size: int,
) -> bool:
    column += column_delta
    row += row_delta
    while (0 <= column < board_size) and (0 <= row < board_size):
        if board[row][column] is None:
            return False
        column += column_delta
        row += row_delta
    return True


def bottom_gravity(board: list[list[int | None]], row: int, column: int) -> bool:
    board_size = _get_board_size(board)
    if not _valid_position(row, column, board_size):
        raise GameException(f"Position ({row=}, {column=}) is not valid for the board size {board_size}")
    if board[row][column] is not None:
        return False
    return _check_direction(board, row, column, 0, -1, board_size)


def any_side_gravity(board: list[list[int | None]], row: int, column: int) -> bool:
    board_size = _get_board_size(board)
    if not _valid_position(row, column, board_size):
        raise GameException(f"Position ({row=}, {column=}) is not valid for the board size {board_size}")
    if board[row][column] is not None:
        return False
    return any(
        [
            _check_direction(board, row, column, 1, 0, board_size),
            _check_direction(board, row, column, -1, 0, board_size),
            _check_direction(board, row, column, 0, 1, board_size),
            _check_direction(board, row, column, 0, -1, board_size),
        ]
    )


GRAVITY_MAP: dict[models.GravitySetting, GravityFunction] = {
    models.GravitySetting.NONE: no_gravity,
    models.GravitySetting.BOTTOM: bottom_gravity,
    models.GravitySetting.EDGE: any_side_gravity,
}
