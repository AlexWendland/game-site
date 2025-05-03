import contextlib
from typing import Any

from render_backend.ultimate import api_functions


@contextlib.contextmanager
def set_game_state(new_state: dict[str, Any]):
    """
    Mock the game state to return a specific state.
    """
    original_game_state = api_functions.GAMES.copy()
    api_functions.GAMES.update(new_state)
    yield
    api_functions.GAMES = original_game_state

def test_make_new_game():
    """
    Test that the make_new_game function generates a new game name.
    """
    with set_game_state({}):
        game_name = api_functions.make_new_game()
        assert game_name in api_functions.GAMES
        second_game_name = api_functions.make_new_game()
        assert game_name != second_game_name
        assert second_game_name in api_functions.GAMES
        assert len(api_functions.GAMES) == 2
