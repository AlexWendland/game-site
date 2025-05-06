import enum
from typing import Annotated, Any

import pydantic
from annotated_types import Ge, Le

# -------------------------------------
# Response Models
# -------------------------------------


class ResponseType(enum.Enum):
    SIMPLE = "simple"
    ERROR = "error"
    GAME_STATE = "game_state"
    SESSION_STATE = "session_state"


class ResponseParameters(pydantic.BaseModel):
    """
    A base class for all response parameters.
    """


class Response(pydantic.BaseModel):
    message_type: ResponseType
    # Implementations should implement there own parameters.


class SimpleResponseParameters(ResponseParameters):
    message: str


class SimpleResponse(Response):
    message_type: ResponseType = pydantic.Field(default=ResponseType.SIMPLE, init=False)
    parameters: SimpleResponseParameters


class ErrorResponseParameters(ResponseParameters):
    error_message: str


class ErrorResponse(Response):
    message_type: ResponseType = pydantic.Field(default=ResponseType.ERROR, init=False)
    parameters: ErrorResponseParameters


class GameStateResponseParameters(ResponseParameters):
    """
    A model representing game state parameters. This will be extended by each of the games.
    """


class GameStateResponse(Response):
    message_type: ResponseType = pydantic.Field(default=ResponseType.GAME_STATE, init=False)
    parameters: GameStateResponseParameters


class SessionStateResponseParameters(ResponseParameters):
    player_positions: dict[int, str | None]
    user_position: int | None


class SessionStateResponse(ResponseParameters):
    message_type: ResponseType = pydantic.Field(default=ResponseType.SESSION_STATE, init=False)
    parameters: SessionStateResponseParameters


# -------------------------------------
# Request Models
# -------------------------------------


class GameTypes(enum.Enum):
    """
    An enum representing the different game types.
    """

    TICTACTOE = "tictactoe"


class NewGameRequest(pydantic.BaseModel):
    """
    A request to make a new game.
    """

    game_name: GameTypes
    paramters: dict[str, Any] = pydantic.Field(default_factory=dict)


class GameParameters(pydantic.BaseModel):
    """
    A model representing game parameters.
    """


class WebsocketRequestType(enum.Enum):
    SESSION = "session"
    GAME = "game"


class WebSocketRequest(pydantic.BaseModel):
    request_type: WebsocketRequestType
    function_name: str
    parameters: dict[str, Any]


# -------------------------------------
# Legacy Models
# -------------------------------------


class PlayerUpdate(pydantic.BaseModel):
    """
    A model representing a player update.
    """

    player_name: str
    player_position: Annotated[int, Ge(1), Le(2)]

    @pydantic.field_validator("player_name", mode="before")
    @classmethod
    def player_name_needs_to_be_not_be_empty(cls, player_name: str) -> str:
        """
        Validate that the player value is not None.
        """
        if len(player_name) == 0:
            raise ValueError("Player name cannot be zero length.")
        return player_name


class Move(PlayerUpdate):
    """
    A model representing a move.
    """

    move: Annotated[int, Ge(0)]


class UserAction(pydantic.BaseModel):
    """
    A model representing a user action.
    """

    action_type: str
    action_name: str
    parameters: dict[str, Any]


class StateUpdate(pydantic.BaseModel):
    players: dict[int, str]
    game_state: dict[str, Any]
