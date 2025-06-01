import pytest

from games_backend import models
from games_backend.games.ultimate import (
    UltimateGame,
    UltimateGameStateParameters,
    UltimateGameStateResponse,
    UltimateRandomAI,
    UltimateTacticianAI,
)


@pytest.fixture
def game():
    return UltimateGame()


def test_make_valid_first_move(game):
    response = game.handle_function_call(
        player_position=0, function_name="make_move", function_parameters={"position": 0}
    )
    assert response is None
    state = game.get_game_state_response(position=0)
    assert state.parameters.moves[0] == 0
    assert state.parameters.sector_to_play[-1] == 0


def test_reject_invalid_function_name(game):
    response = game.handle_function_call(0, "invalid_func", {})
    assert isinstance(response, models.ErrorResponse)
    assert "not supported" in response.parameters.error_message


def test_reject_move_out_of_turn(game):
    # Player 1 tries to move first, but it's Player 0's turn
    response = game.handle_function_call(1, "make_move", {"position": 0})
    assert isinstance(response, models.ErrorResponse)
    assert "not the current player" in response.parameters.error_message


def test_reject_move_on_taken_position(game):
    game.handle_function_call(0, "make_move", {"position": 0})
    response = game.handle_function_call(1, "make_move", {"position": 0})
    assert isinstance(response, models.ErrorResponse)
    assert "already taken" in response.parameters.error_message


def test_reject_move_in_wrong_sector(game):
    game.handle_function_call(0, "make_move", {"position": 0})  # Sends to sector 0
    response = game.handle_function_call(1, "make_move", {"position": 20})  # sector 2
    assert isinstance(response, models.ErrorResponse)
    assert "not in sector" in response.parameters.error_message


def test_reject_move_in_won_sector(game):
    # Force sector 0 to be won
    for i in [0, 1, 2]:
        game._current_board[i] = 0
    game._current_sectors[0] = 0
    game._sector_to_play = [None]
    response = game.handle_function_call(0, "make_move", {"position": 3})
    assert isinstance(response, models.ErrorResponse)
    assert "already won" in response.parameters.error_message


def test_won_sectors_lead_to_playing_anywhere(game):
    # Force sector 0 to be won
    for i in [0, 1, 2]:
        game._current_board[i] = 0
    game._current_sectors[0] = 0
    game._sector_to_play = [None]
    response = game.handle_function_call(0, "make_move", {"position": 9})
    assert response is None
    assert game._sector_to_play[-1] is None


def test_drawn_sectors_lead_to_playing_anywhere(game):
    # Force sector 0 to be drawn
    for i in range(9):
        game._current_board[i] = i % 2
    game._sector_to_play = [None]
    response = game.handle_function_call(0, "make_move", {"position": 9})
    assert response is None
    assert game._sector_to_play[-1] is None


def test_ai_random_makes_valid_move():
    ai = UltimateRandomAI(position=0, name="bot")
    game_state = _create_game_state_with_empty_board()
    request = ai.update_game_state(game_state)
    assert request is not None
    assert request.function_name == "make_move"
    assert 0 <= request.parameters["position"] < 81


def test_ai_tactician_makes_valid_move():
    ai = UltimateTacticianAI(position=0, name="bot")
    game_state = _create_game_state_with_empty_board()
    request = ai.update_game_state(game_state)
    assert request is not None
    assert request.function_name == "make_move"
    assert 0 <= request.parameters["position"] < 81


def _create_game_state_with_empty_board():
    return UltimateGameStateResponse(
        parameters=UltimateGameStateParameters(
            moves=[None] * 81,
            sector_to_play=[None],
            sectors_owned=[None] * 9,
            winner=None,
            winning_line=[],
        )
    )
