import re


def is_game_id_valid(game_id: str) -> bool:
    """
    Validate that the game ID is exactly 5 capital letters. E.g. "ABCDE".
    """
    return bool(re.fullmatch(r"[A-Z]{5}", game_id))
