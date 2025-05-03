from render_backend.ultimate.game_state import non_matching_game_name

GAMES = {}

def make_new_game() -> str:
    new_game = non_matching_game_name(set(GAMES.keys()))
    GAMES[new_game] = {}
    return new_game
