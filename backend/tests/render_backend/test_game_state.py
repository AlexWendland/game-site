from unittest.mock import patch

from render_backend.ultimate import game_state
from render_backend.ultimate.constants import GAME_NAME_LENGTH


def test_random_game_name_works():
    random_name = game_state.random_game_name()
    assert len(random_name) == GAME_NAME_LENGTH
    assert isinstance(random_name, str)


def test_game_state_generates_non_conflicting_game():
    """
    Test that the game state generates a non conflicting game name.
    """
    with patch("render_backend.ultimate.game_state.random_game_name") as mock_new_game_name:
        mock_new_game_name.side_effect = ["AAAAA", "BBBBB", "CCCCC"]
        game = game_state.non_matching_game_name(["AAAAA", "BBBBB"])
        assert game == "CCCCC"
