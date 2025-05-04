import pydantic


def starting_history() -> list[list[None | int]]:
    return [[None] * 9]


def starting_players() -> dict[int, None | str]:
    return {
        1: None,
        2: None,
    }


class GameState(pydantic.BaseModel):
    """
    A model representing the game state.
    """

    board_history: list[list[None | int]] = pydantic.Field(default_factory=starting_history)
    players: dict[int, None | str] = pydantic.Field(default_factory=starting_players)

    @property
    def current_board(self) -> list[None | int]:
        """
        Get the current board.
        """
        return self.board_history[-1]

    @property
    def move_number(self) -> int:
        """
        Get the current move number.
        """
        return len([x for x in self.current_board if x is not None])

    @property
    def current_player(self) -> int:
        """
        Get the current player.
        """
        return self.move_number % 2 + 1

    def add_board(self, new_board: list[None | int]) -> None:
        """
        Add a new board to the history.
        """
        self.board_history.append(new_board)
