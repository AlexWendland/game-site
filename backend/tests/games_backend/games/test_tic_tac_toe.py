import pytest

from games_backend.games.tictactoe import (
    get_minimax_moves,
    get_minimax_score,
    hash_board,
    hash_square,
    unhash_board,
    unhash_square,
)


@pytest.mark.parametrize("square", [None, 0, 1])
def test_hash_square_roundtrip(square: int | None):
    hashed = hash_square(square)
    assert isinstance(hashed, int)
    unhashed = unhash_square(hashed)
    assert unhashed == square


@pytest.mark.parametrize(
    "board",
    [
        [None] * 9,
        [0] * 9,
        [1] * 9,
        [0, 1, None, 1, 0, None, 0, 1, None],
    ],
)
def test_hash_board_roundtrip(board: list[int | None]):
    hashed = hash_board(board)
    restored = unhash_board(hashed)
    assert restored == board


@pytest.mark.parametrize(
    "board,player,expected",
    [
        ([0, 0, 0, None, 1, None, 1, None, None], 1, 1),
        ([1, 1, 1, 0, 0, None, 0, None, None], 0, -1),
        ([0, 0, None, 1, 0, None, 1, None, None], 1, 1),
        ([None, None, None, None, 0, None, None, None, None], 1, 0),
        ([None, 1, None, None, 0, None, None, None, None], 0, 1),
    ],
    ids=["0 has won", "1 has won", "0 has forked", "opening move", "0 can win"],
)
def test_minimax_score(board: list[int | None], player: int, expected: int):
    board_hash = hash_board(board)
    assert get_minimax_score(board_hash, player) == expected


@pytest.mark.parametrize(
    "board,player,expected",
    [
        ([0, 0, None, 1, 1, None, None, None, None], 0, [2]),
        ([0, None, None, 1, 1, None, None, None, 0], 0, [5]),
        ([None, None, None, None, 0, None, None, None, None], 1, [0, 2, 6, 8]),
        ([None, 1, None, None, 0, None, None, None, None], 0, [0, 2, 3, 5, 6, 8]),
    ],
    ids=[
        "0 can win",
        "0 has to block",
        "1 must play in the corner",
        "0 can play anywhere other than bottom center to win",
    ],
)
def test_minimax_situations(board: list[int | None], player: int, expected: list[int]):
    assert get_minimax_moves(board, player) == expected
