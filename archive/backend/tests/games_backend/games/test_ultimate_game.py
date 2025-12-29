import pytest

from games_backend import models
from games_backend.games.ultimate import (
    UltimateGame,
    UltimateGameStateResponse,
)


@pytest.fixture
def ultimate_game_interface():
    """Fixture for UltimateGame, focusing on its interface."""
    return UltimateGame()


def test_ultimate_game_handle_valid_first_move(ultimate_game_interface):
    """Test that UltimateGame correctly processes a valid first move."""
    response = ultimate_game_interface.handle_function_call(
        player_position=0, function_name="make_move", function_parameters={"position": 0}
    )
    assert response is None
    state = ultimate_game_interface.get_game_state_response(position=0)
    assert state.parameters.moves[0] == 0
    assert state.parameters.sector_to_play[-1] == 0
    assert ultimate_game_interface._logic.moves[0] == 0


def test_ultimate_game_reject_invalid_function_name(ultimate_game_interface):
    response = ultimate_game_interface.handle_function_call(0, "invalid_func", {})
    assert isinstance(response, models.ErrorResponse)
    assert "not supported" in response.parameters.error_message


def test_ultimate_game_reject_invalid_move_parameters(ultimate_game_interface):
    response = ultimate_game_interface.handle_function_call(0, "make_move", {"pos": 0})
    assert isinstance(response, models.ErrorResponse)
    assert "Invalid parameters" in response.parameters.error_message


def test_ultimate_game_handles_logic_value_error_for_out_of_turn(ultimate_game_interface):
    response = ultimate_game_interface.handle_function_call(1, "make_move", {"position": 0})
    assert isinstance(response, models.ErrorResponse)
    assert "not the current player" in response.parameters.error_message


def test_ultimate_game_handles_logic_value_error_for_position_taken(ultimate_game_interface):
    ultimate_game_interface.handle_function_call(0, "make_move", {"position": 0})
    response = ultimate_game_interface.handle_function_call(1, "make_move", {"position": 0})
    assert isinstance(response, models.ErrorResponse)
    assert "already taken" in response.parameters.error_message


def test_ultimate_game_handles_logic_value_error_for_wrong_sector(ultimate_game_interface):
    ultimate_game_interface.handle_function_call(0, "make_move", {"position": 0})
    response = ultimate_game_interface.handle_function_call(1, "make_move", {"position": 20})
    assert isinstance(response, models.ErrorResponse)
    assert "not in sector" in response.parameters.error_message


def test_ultimate_game_handles_logic_value_error_for_won_sector(ultimate_game_interface):
    # Let player 0 win 0'th sector
    ultimate_game_interface.handle_function_call(0, "make_move", {"position": 2})
    ultimate_game_interface.handle_function_call(1, "make_move", {"position": 18})
    ultimate_game_interface.handle_function_call(0, "make_move", {"position": 1})
    ultimate_game_interface.handle_function_call(1, "make_move", {"position": 9})
    ultimate_game_interface.handle_function_call(0, "make_move", {"position": 0})

    response = ultimate_game_interface.handle_function_call(1, "make_move", {"position": 3})
    assert isinstance(response, models.ErrorResponse)
    assert "already won" in response.parameters.error_message


def test_ultimate_game_get_game_state_response_accuracy(ultimate_game_interface):
    ultimate_game_interface.handle_function_call(0, "make_move", {"position": 5})
    ultimate_game_interface.handle_function_call(1, "make_move", {"position": 45})  # Player 1, pos 45 (sector 5)

    state = ultimate_game_interface.get_game_state_response(position=0)

    assert isinstance(state, UltimateGameStateResponse)
    assert state.parameters.moves == ultimate_game_interface._logic.moves
    assert state.parameters.sector_to_play == ultimate_game_interface._logic.sector_to_play
    assert state.parameters.sectors_owned == ultimate_game_interface._logic.winning_sector_move
    assert state.parameters.winner == ultimate_game_interface._logic.winner
    assert state.parameters.winning_line == ultimate_game_interface._logic.winning_line
