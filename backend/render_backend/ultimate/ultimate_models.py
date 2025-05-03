import pydantic


class GameState(pydantic.BaseModel):
    """
    A model representing the game state.
    """
    board: dict[int, int] = pydantic.Field(default_factory=dict)
    players: dict[int, str] = pydantic.Field(default_factory=dict)
    move_number: int = 0
    current_player: int = 0
