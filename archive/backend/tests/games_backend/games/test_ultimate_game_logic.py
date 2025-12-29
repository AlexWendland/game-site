import pytest

from games_backend.games.ultimate import UltimateGameLogic


@pytest.fixture
def game_logic():
    return UltimateGameLogic()


def test_logic_make_valid_first_move(game_logic):
    game_logic.make_move(0, 0)
    assert game_logic.moves[0] == 0
    assert game_logic.sector_to_play[-1] == 0
    assert game_logic._move_number == 1
    assert game_logic.winner is None
    assert not game_logic.winning_line


def test_logic_make_move_player_turn_alternates(game_logic):
    game_logic.make_move(0, 0)
    game_logic.make_move(1, 1)
    assert game_logic.moves[0] == 0
    assert game_logic.moves[1] == 1
    assert game_logic._move_number == 2


def test_logic_reject_move_out_of_turn(game_logic):
    with pytest.raises(ValueError, match="not the current player"):
        game_logic.make_move(1, 0)


def test_logic_reject_move_on_taken_position(game_logic):
    game_logic.make_move(0, 0)
    with pytest.raises(ValueError, match="already taken"):
        game_logic.make_move(1, 0)


def test_logic_reject_move_in_wrong_sector(game_logic):
    game_logic.make_move(0, 0)
    with pytest.raises(ValueError, match="not in sector"):
        game_logic.make_move(1, 20)


def test_logic_reject_move_in_won_sector(game_logic):
    game_logic.make_move(0, 2)
    game_logic.make_move(1, 18)
    game_logic.make_move(0, 1)
    game_logic.make_move(1, 9)
    game_logic.make_move(0, 0)

    with pytest.raises(ValueError, match="already won"):
        game_logic.make_move(1, 3)


def test_logic_sector_win_condition(game_logic):
    game_logic.make_move(0, 2)
    game_logic.make_move(1, 18)
    game_logic.make_move(0, 1)
    game_logic.make_move(1, 9)
    game_logic.make_move(0, 0)
    assert game_logic.winning_sector_move[0] == 4
    assert game_logic.winner is None


def test_logic_game_win_condition(game_logic):
    # 0 Wins sector 0
    game_logic.make_move(0, 2)
    game_logic.make_move(1, 18)
    game_logic.make_move(0, 1)
    game_logic.make_move(1, 9)
    game_logic.make_move(0, 0)

    # 0 Wins sector 1
    game_logic.make_move(1, 28)
    game_logic.make_move(0, 14)
    game_logic.make_move(1, 46)
    game_logic.make_move(0, 13)
    game_logic.make_move(1, 37)
    game_logic.make_move(0, 12)

    # 0 Wins sector 2
    game_logic.make_move(1, 29)
    game_logic.make_move(0, 23)
    game_logic.make_move(1, 47)
    game_logic.make_move(0, 22)
    game_logic.make_move(1, 38)
    game_logic.make_move(0, 21)

    assert game_logic.winner == 0  # Player 0 should be the winner
    assert game_logic.winning_line == [0, 1, 2]


def test_logic_sector_to_play_updates_correctly(game_logic):
    game_logic.make_move(0, 5)
    assert game_logic.sector_to_play[-1] == 5
    game_logic.make_move(1, 45)
    assert game_logic.sector_to_play[-1] == 0


def test_logic_sector_to_play_none_when_target_sector_won(game_logic):
    # Player 0 wins sector 0
    game_logic.make_move(0, 2)
    game_logic.make_move(1, 18)
    game_logic.make_move(0, 1)
    game_logic.make_move(1, 9)
    game_logic.make_move(0, 0)

    game_logic.make_move(1, 27)

    assert game_logic.sector_to_play[-1] is None


def test_logic_sector_to_play_none_when_target_sector_drawn(game_logic):
    # Fill sector 0 with moves from both players, ensuring no winner
    game_logic._moves = [None] * 81
    for i in range(9):
        game_logic._moves[i] = i
    game_logic._move_number = 9

    game_logic.make_move(1, 9)

    assert game_logic.sector_to_play[-1] is None


def test_logic_get_sector_board_returns_correct_player_values(game_logic):
    game_logic._moves[0] = 0  # Player 0
    game_logic._moves[1] = 1  # Player 1
    game_logic._moves[2] = 2  # Player 0
    expected_board = [0, 1, 0, None, None, None, None, None, None]
    assert game_logic._get_sector_board(0) == expected_board


def test_logic_get_high_level_board_returns_correct_player_values(game_logic):
    game_logic._winning_sector_move[0] = 0  # Player 0 won sector 0
    game_logic._winning_sector_move[1] = 1  # Player 1 won sector 1
    expected_board = [0, 1, None, None, None, None, None, None, None]
    assert game_logic._get_high_level_board() == expected_board


def test_logic_get_available_moves_initial_state(game_logic):
    assert game_logic.get_available_moves() == [i for i in range(81)]


def test_logic_get_available_moves_specific_sector(game_logic):
    game_logic.make_move(0, 0)
    assert game_logic.get_available_moves() == [i for i in range(1, 9)]


def test_logic_get_available_moves_target_sector_won(game_logic):
    # Player 0 wins sector 0
    game_logic.make_move(0, 2)
    game_logic.make_move(1, 18)
    game_logic.make_move(0, 1)
    game_logic.make_move(1, 9)
    game_logic.make_move(0, 0)

    assert game_logic.get_available_moves() == [i for i in range(9, 81) if i not in [9, 18]]
