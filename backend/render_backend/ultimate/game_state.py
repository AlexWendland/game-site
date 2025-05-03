import random
import string

from render_backend.ultimate.constants import GAME_NAME_LENGTH


def random_game_name() -> str:
    """
    Generates a new game name randomly.
    """
    return ''.join([random.choice(string.ascii_uppercase) for _ in range(GAME_NAME_LENGTH)])

def non_matching_game_name(curent_games: set[str]) -> str:
    """
    Generates a new game name that is not in the current set of games.
    """
    while (this_game := random_game_name()) in curent_games:
        pass
    return this_game
