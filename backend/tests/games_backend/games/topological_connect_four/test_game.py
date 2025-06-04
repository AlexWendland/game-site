import pytest

from games_backend import models
from games_backend.games.topological_connect_four.game import (
    TopologicalGame,
    TopologicalGameStateResponse,
)


@pytest.fixture
def game() -> TopologicalGame:
    return TopologicalGame(
        max_players=2,
        gravity=models.GravitySetting.BOTTOM,
        geometry=models.Geometry.NO_GEOMETRY,
        board_size=4,
    )


def test_get_max_players(game: TopologicalGame):
    assert game.get_max_players() == 2


def test_metadata(game: TopologicalGame):
    metadata = game.get_metadata()
    assert metadata.game_type == models.GameType.TOPOLOGICAL
    assert metadata.max_players == 2
    assert metadata.parameters.board_size == 4
    assert metadata.parameters.gravity == models.GravitySetting.BOTTOM
    assert metadata.parameters.geometry == models.Geometry.NO_GEOMETRY


def test_get_game_state_response(game: TopologicalGame):
    state = game.get_game_state_response(position=None)
    assert isinstance(state, TopologicalGameStateResponse)
    assert state.parameters.moves == [[None] * 4] * 4
    assert state.parameters.available_moves == [(0, column) for column in range(4)]
    assert state.parameters.winner is None
    assert state.parameters.winning_line == []


def test_handle_valid_move(game: TopologicalGame):
    response = game.handle_function_call(
        player_position=0,
        function_name="make_move",
        function_parameters={"row": 0, "column": 0},
    )
    assert response is None


def test_handle_invalid_function_name(game: TopologicalGame):
    response = game.handle_function_call(
        player_position=0,
        function_name="unknown_function",
        function_parameters={},
    )
    assert isinstance(response, models.ErrorResponse)
    assert "Function unknown_function not supported" in response.parameters.error_message


def test_handle_invalid_parameters(game: TopologicalGame):
    response = game.handle_function_call(
        player_position=0,
        function_name="make_move",
        function_parameters={"row": "hello", "column": 0},
    )
    assert isinstance(response, models.ErrorResponse)
    assert "Invalid parameters" in response.parameters.error_message


def test_handle_invalid_move(game: TopologicalGame):
    response = game.handle_function_call(
        player_position=1,
        function_name="make_move",
        function_parameters={"row": 0, "column": 0},
    )
    assert isinstance(response, models.ErrorResponse)
    assert "Invalid move" in response.parameters.error_message


def test_get_game_ai(game: TopologicalGame):
    ai_dict = game.get_game_ai_named()
    assert "random" in ai_dict
    assert ai_dict["random"] == "Easy"


def test_random_ais_game_is_copied(game: TopologicalGame):
    ai = game.get_game_ai()["random"](name="Test AI", position=0)
    response = game.handle_function_call(
        player_position=0,
        function_name="make_move",
        function_parameters={"row": 0, "column": 0},
    )
    assert response is None
    assert game._logic.get_player_in_position(0, 0) == 0
    assert ai._logic.get_player_in_position(0, 0) is None


def test_random_ais_game_can_make_move(game: TopologicalGame):
    first_ai = game.get_game_ai()["random"](name="Test AI 1", position=0)
    second_ai = game.get_game_ai()["random"](name="Test AI 2", position=1)

    # Move 1
    first_ai_move = first_ai.update_game_state(game.get_game_state_response(0))
    second_ai_move = second_ai.update_game_state(game.get_game_state_response(1))
    assert first_ai_move is not None
    assert second_ai_move is None

    response = game.handle_function_call(
        player_position=0, function_name=first_ai_move.function_name, function_parameters=first_ai_move.parameters
    )
    assert response is None

    # Move 2
    first_ai_move = first_ai.update_game_state(game.get_game_state_response(0))
    second_ai_move = second_ai.update_game_state(game.get_game_state_response(1))
    assert first_ai_move is None
    assert second_ai_move is not None

    response = game.handle_function_call(
        player_position=1, function_name=second_ai_move.function_name, function_parameters=second_ai_move.parameters
    )
    assert response is None

    # Move 3
    first_ai_move = first_ai.update_game_state(game.get_game_state_response(0))
    second_ai_move = second_ai.update_game_state(game.get_game_state_response(1))
    assert first_ai_move is not None
    assert second_ai_move is None

    response = game.handle_function_call(
        player_position=0, function_name=first_ai_move.function_name, function_parameters=first_ai_move.parameters
    )
    assert response is None
