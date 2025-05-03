import pydantic


def default_board() -> list[None | int]:
    return [None] * 9


def default_players() -> dict[int, None | str]:
    return {
        1: None,
        2: None,
    }


class GameState(pydantic.BaseModel):
    """
    A model representing the game state.
    """

    board: list[None | int] = pydantic.Field(default_factory=default_board)
    players: dict[int, None | str] = pydantic.Field(default_factory=default_players)
    move_number: int = 0
    current_player: int = 0
