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


def test_make_move_success():
    """
    Test making a successful move.
    """
    game = ultimate_models.GameState()
    game.players[1] = "Alice"
    game.players[2] = "Bob"
    with set_game_state({"G1234": game}):
        api_functions.make_move("G1234", 1, "Alice", 4)
        api_functions.make_move("G1234", 2, "Bob", 3)
        api_functions.make_move("G1234", 1, "Alice", 5)
        # Move should now be stored
        assert len(game.board_history) == 4
        assert game.current_board == [None, None, None, 2, 1, 1, None, None, None]


def test_make_move_wrong_turn():
    """
    Test making a move when it's not the player's turn.
    """
    game = ultimate_models.GameState()
    game.players[1] = "Alice"
    game.players[2] = "Bob"
    with set_game_state({"G4321": game}):
        with pytest.raises(ValueError, match="not the current player"):
            api_functions.make_move("G4321", 2, "Bob", 2)


def test_make_move_wrong_identity():
    """
    Test making a move with the wrong player name.
    """
    game = ultimate_models.GameState()
    game.players[1] = "Alice"
    with set_game_state({"G5678": game}):
        with pytest.raises(ValueError, match="not the player for game"):
            api_functions.make_move("G5678", 1, "Bob", 2)


def test_make_move_taken_spot():
    """
    Test making a move in a spot that's already taken.
    """
    game = ultimate_models.GameState()
    game.players[1] = "Alice"
    game.players[2] = "Bob"
    game.add_board([1, None, None, None, None, None, None, None, None])
    game.add_board([1, 2, None, None, None, None, None, None, None])
    with set_game_state({"GTOKN": game}):
        with pytest.raises(ValueError, match="Move 1 is already taken"):
            api_functions.make_move("GTOKN", 1, "Alice", 1)
