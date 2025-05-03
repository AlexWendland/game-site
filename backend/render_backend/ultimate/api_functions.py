import logging

from render_backend.ultimate import game_state, ultimate_models

GAMES: dict[str, ultimate_models.GameState] = {}

logger = logging.getLogger(__name__)

def make_new_game() -> str:
    new_game = game_state.non_matching_game_name(set(GAMES.keys()))
    GAMES[new_game] = ultimate_models.GameState()
    return new_game


def get_game_state(game_name: str) -> ultimate_models.GameState:
    """
    Get the game state for a given game name.
    """
    return GAMES[game_name]


def set_player(game_name: str, player_position: int, player_name: str) -> None:
    """
    Set the player value for a given game name.
    """
    logger.info(f"Setting player {player_name} for game {game_name} at position {player_position}")
    current_player = GAMES[game_name].players[player_position]
    if current_player is not None and current_player != player_name:
        logger.info(f"Player {player_name} is already set for game {game_name} ({current_player}.")
        raise ValueError(f"Player {player_name} is already set for game {game_name}.")
    GAMES[game_name].players[player_position] = player_name


def unset_player(game_name: str, player_position: int, player_name: str) -> None:
    """
    Unset the player value for a given game name.
    """
    logger.info(
        f"Unsetting player {player_name} for game {game_name} at position " +
        f"{player_position}, current player is {GAMES[game_name].players[player_position]}."
    )
    if player_name == GAMES[game_name].players[player_position]:
        GAMES[game_name].players[player_position] = None
