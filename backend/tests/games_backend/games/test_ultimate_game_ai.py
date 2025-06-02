import pytest

from games_backend.games.ultimate import (
    UltimateGameStateParameters,
    UltimateGameStateResponse,
    UltimateRandomAI,
    UltimateTacticianAI,
)


@pytest.fixture
def empty_game_state_response():
    """Fixture for an empty UltimateGameStateResponse."""
    return UltimateGameStateResponse(
        parameters=UltimateGameStateParameters(
            moves=[None] * 81,
            sector_to_play=[None],
            sectors_owned=[None] * 9,
            winner=None,
            winning_line=[],
        )
    )


def test_ultimate_random_ai_makes_valid_move(empty_game_state_response):
    ai = UltimateRandomAI(position=0, name="bot")
    request = ai.update_game_state(empty_game_state_response)
    assert request is not None
    assert request.function_name == "make_move"
    assert "position" in request.parameters
    assert 0 <= request.parameters["position"] < 81
    assert empty_game_state_response.parameters.moves[request.parameters["position"]] is None


def test_ultimate_tactician_ai_makes_valid_move(empty_game_state_response):
    ai = UltimateTacticianAI(position=0, name="bot")
    request = ai.update_game_state(empty_game_state_response)
    assert request is not None
    assert request.function_name == "make_move"
    assert "position" in request.parameters
    assert 0 <= request.parameters["position"] < 81
    assert empty_game_state_response.parameters.moves[request.parameters["position"]] is None
