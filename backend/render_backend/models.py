from typing import Annotated

import pydantic
from annotated_types import Ge, Le


class SimpleResponse(pydantic.BaseModel):
    """
    A simple response model that can be used to return a message.
    """

    message: str

class PlayerUpdate(pydantic.BaseModel):
    """
    A model representing a player update.
    """

    player_name: str
    player_position: Annotated[int, Ge(0), Le(2)]

    @pydantic.field_validator("player_name", mode="before")
    @classmethod
    def player_name_needs_to_be_not_be_empty(cls, player_name: str) -> str:
        """
        Validate that the player value is not None.
        """
        if len(player_name) == 0:
            raise ValueError("Player name cannot be zero length.")
        return player_name
