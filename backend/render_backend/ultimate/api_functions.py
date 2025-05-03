from render_backend.ultimate import game_state, ultimate_models

GAMES: dict[str, ultimate_models.GameState] = {}

def make_new_game() -> str:
    new_game = game_state.non_matching_game_name(set(GAMES.keys()))
    GAMES[new_game] = ultimate_models.GameState
    return new_game

def get_game_state(game_name: str) -> dict:
    """
    Get the game state for a given game name.
    """
    return GAMES[game_name]
