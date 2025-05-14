import random
import re
import string

from fastapi import HTTPException

from games_backend.app_logger import logger

GAME_NAME_LENGTH = 5


def is_game_id_valid(game_id: str) -> bool:
    """
    Validate that the game ID is exactly 5 capital letters. E.g. "ABCDE".
    """
    return bool(re.fullmatch(r"[A-Z]{5}", game_id))


def non_matching_game_name(curent_games: set[str]) -> str:
    """
    Generates a new game name that is not in the current set of games.
    """
    while (this_game := _random_game_name()) in curent_games:
        pass
    return this_game


def _random_game_name() -> str:
    """
    Generates a new game name randomly.
    """
    return "".join([random.choice(string.ascii_uppercase) for _ in range(GAME_NAME_LENGTH)])


async def validated_game_name(game_name: str) -> str:
    if not is_game_id_valid(game_name):
        logger.info(f"Invalid game requested: {game_name}")
        raise HTTPException(status_code=400, detail=f"Game name {game_name} is not valid")
    return game_name
