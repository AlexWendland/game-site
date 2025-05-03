import contextlib
from typing import Any

import pytest

from render_backend.ultimate import api_functions, ultimate_models


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


def test_get_game_state():
    """
    Test that the get_game_state function returns the correct game state.
    """
    with set_game_state({"AAAAA": ultimate_models.GameState()}):
        game_state = api_functions.get_game_state("AAAAA")
        assert isinstance(game_state, ultimate_models.GameState)
        with pytest.raises(KeyError):
            api_functions.get_game_state("BBBBB")


def test_set_player():
    """
    Test setting a player in the game state.
    """
    game = ultimate_models.GameState()
    with set_game_state({"ABCDE": game}):
        assert game.players[1] is None

        api_functions.set_player("ABCDE", 1, "Alice")
        assert game.players[1] == "Alice"

        api_functions.set_player("ABCDE", 1, "Alice")
        assert game.players[1] == "Alice"

        with pytest.raises(ValueError):
            api_functions.set_player("ABCDE", 1, "Bob")


def test_unset_player():
    """
    Test unsetting a player in the game state.
    """
    game = ultimate_models.GameState(players={1: "Alice", 2: None})
    with set_game_state({"XYZ12": game}):
        # Unset with correct name
        api_functions.unset_player("XYZ12", 1, "Alice")
        assert game.players[1] is None

        # Unset with wrong name should do nothing
        game.players[1] = "Alice"
        api_functions.unset_player("XYZ12", 1, "Bob")
        assert game.players[1] == "Alice"
