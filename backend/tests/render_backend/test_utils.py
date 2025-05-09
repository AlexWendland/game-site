from unittest.mock import patch

from games_backend.utils import GAME_NAME_LENGTH, _random_game_name, non_matching_game_name


def test_random_game_name_works():
    random_name = _random_game_name()
    assert len(random_name) == GAME_NAME_LENGTH
    assert isinstance(random_name, str)


def test_game_state_generates_non_conflicting_game():
    """
    Test that the game state generates a non conflicting game name.
    """
    with patch("games_backend.utils._random_game_name") as mock_new_game_name:
        mock_new_game_name.side_effect = ["AAAAA", "BBBBB", "CCCCC"]
        game = non_matching_game_name({"AAAAA", "BBBBB"})
        assert game == "CCCCC"
