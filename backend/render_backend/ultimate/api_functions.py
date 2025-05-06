from render_backend.app_logger import logger
from render_backend.ultimate import game_state, ultimate_models

GAMES: dict[str, ultimate_models.GameState] = {}


def make_new_game() -> str:
    new_game = game_state.non_matching_game_name(set(GAMES.keys()))
    GAMES[new_game] = ultimate_models.GameState()
    return new_game


def get_game_state(game_name: str) -> ultimate_models.GameState:
    """
    Get the game state for a given game name.
    """
    return GAMES[game_name]


def make_move(game_name: str, player_position: int, player_name: str, move: int) -> None:
    """
    Make a move for a given game name.
    """
    logger.info(f"Making move {move} for game {game_name} at position {player_position}")
    current_game = GAMES[game_name]
    if current_game.current_player != player_position:
        logger.info(
            f"Player {player_name} is not the current player for game {game_name} "
            + f"({current_game.current_player})."
        )
        raise ValueError(f"Player {player_name} is not the current player for game {game_name}.")
    if current_game.players[player_position] != player_name:
        logger.info(
            f"Player {player_name} is not the player for game {game_name} "
            + f"({current_game.players[player_position]})."
        )
        raise ValueError(f"Player {player_name} is not the player for game {game_name}.")
    new_board = current_game.current_board.copy()
    if new_board[move] is not None:
        logger.info(f"Move {move} is already taken for game {game_name}.")
        raise ValueError(f"Move {move} is already taken for game {game_name}.")
    new_board[move] = player_position
    current_game.add_board(new_board)
