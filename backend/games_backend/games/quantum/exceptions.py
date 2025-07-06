from typing import final


@final
class ContradictionError(Exception):
    """Raised when a contradiction is found in the game state."""

    def __init__(self, message: str, player: int | None = None, suit: int | None = None, **kwargs):
        super().__init__(message)
        self.message = message
        self.player = player
        self.suit = suit
        # Store any additional metadata
        for key, value in kwargs.items():
            setattr(self, key, value)
