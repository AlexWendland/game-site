import pytest

from games_backend.games.topological_connect_four.exceptions import GameException
from games_backend.games.topological_connect_four.geometry import (
    no_geometry,
)
from games_backend.games.topological_connect_four.gravity import (
    bottom_gravity,
    no_gravity,
)
from games_backend.games.topological_connect_four.logic import TopologicalLogic


@pytest.fixture
def classic_logic():
    """
    A 8×8 bottom gravity, no‐wrapping (i.e. classic connect 4) with 2 players.
    """
    return TopologicalLogic(geometry=no_geometry, gravity=bottom_gravity, number_of_players=2, board_size=8)


def test_initial_state(classic_logic: TopologicalLogic):
    assert classic_logic.winner is None
    assert classic_logic.get_available_moves() == [(0, column) for column in range(8)]
    assert classic_logic.current_player == 0

    for column in range(3):
        for row in range(3):
            assert classic_logic.get_player_in_position(row, column) is None


def test_make_move_and_turn_cycle(classic_logic: TopologicalLogic):
    classic_logic.make_move(player=0, column=0, row=0)
    assert classic_logic.get_player_in_position(0, 0) == 0
    assert classic_logic.current_player == 1
    assert classic_logic.get_available_moves() == [(1, 0)] + [(0, column) for column in range(1, 8)]

    classic_logic.make_move(player=1, row=1, column=0)
    assert classic_logic.get_player_in_position(1, 0) == 1
    assert classic_logic.current_player == 0
    assert classic_logic.get_available_moves() == [(2, 0)] + [(0, column) for column in range(1, 8)]


def test_wrong_player_too_early(classic_logic: TopologicalLogic):
    with pytest.raises(GameException, match="not player 1 go"):
        classic_logic.make_move(player=1, row=0, column=0)


def test_play_in_location_off_board(classic_logic: TopologicalLogic):
    with pytest.raises(GameException, match=r"Move \(row=0, column=-1\) is not valid for this geometry"):
        classic_logic.make_move(player=0, row=0, column=-1)


def test_play_in_location_without_gravity(classic_logic: TopologicalLogic):
    with pytest.raises(GameException, match=r"Move \(row=2, column=0\) is not valid for this boards gravity"):
        classic_logic.make_move(player=0, row=2, column=0)


def test_cannot_move_to_occupied_tile(classic_logic: TopologicalLogic):
    classic_logic.make_move(player=0, row=0, column=0)
    with pytest.raises(GameException, match=r"Move \(row=0, column=0\) is already taken"):
        classic_logic.make_move(player=1, column=0, row=0)


def test_game_winner(classic_logic: TopologicalLogic):
    for column in range(3):
        classic_logic.make_move(player=0, row=0, column=column)
        classic_logic.make_move(player=1, row=1, column=column)

    # Right after the fourth move, winner must be set:
    assert classic_logic.winner is None

    classic_logic.make_move(player=0, row=0, column=3)

    assert classic_logic.winner == 0
    assert sorted(classic_logic.winning_line, key=lambda x: x[1]) == [(0, 0), (0, 1), (0, 2), (0, 3)]

    with pytest.raises(GameException, match="The game has finished"):
        classic_logic.make_move(player=1, column=3, row=1)


def test_invalid_after_fill_entire_board():
    """
    If the board fills up with no winner, make_move should raise as soon as get_available_moves() == [].
    """
    logic = TopologicalLogic(geometry=no_geometry, gravity=no_gravity, number_of_players=2, board_size=2)
    for column in range(2):
        for row in range(2):
            logic.make_move(player=logic.current_player, column=column, row=row)

    assert logic.get_available_moves() == []
    with pytest.raises(GameException, match=r"The game has finished so there are no legal moves."):
        logic.make_move(player=logic.current_player, column=0, row=0)


@pytest.mark.parametrize(
    "moves,winning_line",
    [
        ([(0, 0), (1, 1), (2, 2), (3, 3)], [(0, 0), (1, 1), (2, 2), (3, 3)]),
        ([(3, 0), (2, 1), (1, 2), (0, 3)], [(3, 0), (2, 1), (1, 2), (0, 3)]),
        ([(0, 0), (0, 1), (0, 2), (0, 3)], [(0, 0), (0, 1), (0, 2), (0, 3)]),
        ([(0, 0), (1, 0), (2, 0), (3, 0)], [(0, 0), (1, 0), (2, 0), (3, 0)]),
    ],
)
def test_winning_directions(moves: list[tuple[int, int]], winning_line: list[tuple[int, int]]):
    """
    With a 4×4 single‐player board, place 4 tokens along a diagonal and check winner.
    """
    logic = TopologicalLogic(geometry=no_geometry, gravity=no_gravity, number_of_players=1, board_size=4)
    for row, column in moves:
        logic.make_move(player=0, row=row, column=column)

    assert logic.winner == 0
    assert sorted(logic.winning_line, key=lambda x: x[0] * 10 + x[1]) == sorted(
        winning_line, key=lambda x: x[0] * 10 + x[1]
    )


def test_undo_last_move(classic_logic: TopologicalLogic):
    classic_logic.make_move(player=0, row=0, column=0)
    classic_logic.make_move(player=1, row=1, column=0)
    assert classic_logic.get_player_in_position(0, 0) == 0
    assert classic_logic.get_player_in_position(1, 0) == 1

    classic_logic.undo_last_move()
    assert classic_logic.get_player_in_position(1, 0) is None
    assert classic_logic.current_player == 1

    classic_logic.undo_last_move()
    assert classic_logic.get_player_in_position(0, 0) is None
    assert classic_logic.current_player == 0

    with pytest.raises(GameException, match="no moves to undo"):
        classic_logic.undo_last_move()


def test_undo_last_move_resets_winner(classic_logic: TopologicalLogic):
    for column in range(3):
        classic_logic.make_move(player=0, row=0, column=column)
        classic_logic.make_move(player=1, row=1, column=column)
    classic_logic.make_move(player=0, row=0, column=3)

    assert classic_logic.winner == 0
    assert len(classic_logic.winning_line) > 0

    classic_logic.undo_last_move()

    assert classic_logic.winner is None
    assert classic_logic.winning_line == []


def test_restart_game_resets_state(classic_logic: TopologicalLogic):
    classic_logic.make_move(player=0, row=0, column=0)
    classic_logic.make_move(player=1, row=1, column=0)

    classic_logic.restart_game()

    assert all(cell is None for row in classic_logic.moves for cell in row)
    assert classic_logic.current_player == 0
    assert classic_logic.winner is None
    assert classic_logic.winning_line == []


def test_reset_game_state_rebuilds_correctly():
    logic = TopologicalLogic(geometry=no_geometry, gravity=no_gravity, number_of_players=2, board_size=5)
    moves: list[list[int | None]] = [
        [0, 2, None, None, None],
        [3, None, None, None, None],
        [1, None, None, None, None],
        [None, None, None, None, None],
        [None, None, None, None, None],
    ]
    logic.reset_game_state(moves)
    assert logic.moves == moves
    assert logic.current_player == 0  # 4 moves made

    assert logic.get_player_in_position(0, 0) == 0
    assert logic.get_player_in_position(1, 0) == 1
    assert logic.get_player_in_position(2, 0) == 1
    assert logic.get_player_in_position(0, 1) == 0

    logic.make_move(player=0, row=0, column=2)
    logic.make_move(player=1, row=3, column=0)
    logic.make_move(player=0, row=0, column=3)

    assert logic.winner == 0
    assert len(logic.winning_line) >= 4

    logic.reset_game_state(moves)
    assert logic.winner is None
    assert logic.winning_line == []


@pytest.mark.parametrize(
    "shape, match",
    [
        ([[0, 1, 2], [3, 4, 5], [6, 7]], "move state is not valid shape"),
        ([[0, 1, 2], [3, 4, 5]], "move state is not valid shape"),
        ([[0, 1, 2], [3, 4, 5], [6, 7, 8], [9, 10, 11]], "move state is not valid shape"),
        ([[0, 1, 2], [3, 4, 5], [6, 7, 8, 9]], "move state is not valid shape"),
        (
            [
                [0, -1, None],
                [1, None, None],
                [2, None, None],
            ],
            "cannot be negative",
        ),
        (
            [
                [0, 0, None],
                [1, None, None],
                [2, None, None],
            ],
            "appears multiple times",
        ),
        (
            [
                [0, 3, None],
                [None, None, None],
                [2, None, None],
            ],
            "Move number 1 is missing",
        ),
    ],
)
def test_reset_game_state_invalid(shape: list[list[int | None]], match: str):
    logic = TopologicalLogic(geometry=no_geometry, gravity=no_gravity, number_of_players=2, board_size=3)
    with pytest.raises(GameException, match=match):
        logic.reset_game_state(shape)
