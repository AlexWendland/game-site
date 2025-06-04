import enum
from typing import Annotated, Any, Literal

import pydantic

# -------------------------------------
# Response Models
# -------------------------------------


class ResponseType(enum.Enum):
    SIMPLE = "simple"
    ERROR = "error"
    GAME_STATE = "game_state"
    SESSION_STATE = "session_state"
    AI_PLAYERS = "ai_players"
    MODEL = "model"


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
    # Implementations should implement there own parameters.


class SessionStateResponseParameters(ResponseParameters):
    player_positions: dict[int, str | None]
    user_position: int | None


class SessionStateResponse(Response):
    message_type: ResponseType = pydantic.Field(default=ResponseType.SESSION_STATE, init=False)
    parameters: SessionStateResponseParameters


class AIStateResponseParameters(ResponseParameters):
    ai_players: dict[int, str]


class AIStateResponse(Response):
    message_type: ResponseType = pydantic.Field(default=ResponseType.AI_PLAYERS, init=False)
    parameters: AIStateResponseParameters


class GameParameters(pydantic.BaseModel):
    """
    Custom game specific information can be provided here.
    """


class GravitySetting(enum.Enum):
    NONE = "none"
    BOTTOM = "bottom"
    EDGE = "edge"


class Geometry(enum.Enum):
    NO_GEOMETRY = "no_geometry"
    TORUS = "torus"
    BAND = "band"


class TopologicalGameParameters(GameParameters):
    board_size: int = pydantic.Field(default=8, ge=4, le=8)
    gravity: GravitySetting
    geometry: Geometry


class GameType(enum.Enum):
    """
    When adding a new game type, try to make it match the path name in the frontend.
    """

    TICTACTOE = "tictactoe"
    ULTIMATE = "ultimate"
    TOPOLOGICAL = "topological"


class GameMetadata(pydantic.BaseModel):
    # game_type: Literal[GameType]
    max_players: int
    # parameters: GameParameters
    # Add custom parameters here.


class TicTacToeGameMetadata(GameMetadata):
    game_type: Literal[GameType.TICTACTOE] = GameType.TICTACTOE
    max_players: int
    parameters: GameParameters


class UltimateGameMetadata(GameMetadata):
    game_type: Literal[GameType.ULTIMATE] = GameType.ULTIMATE
    max_players: int
    parameters: GameParameters


class TopologicalGameMetadata(GameMetadata):
    game_type: Literal[GameType.TOPOLOGICAL] = GameType.TOPOLOGICAL
    max_players: int
    parameters: TopologicalGameParameters


GameMetadataUnion = Annotated[
    TicTacToeGameMetadata | UltimateGameMetadata | TopologicalGameMetadata, pydantic.Field(discriminator="game_type")
]


class ModelResponseParameters(ResponseParameters):
    models: dict[str, str]


class ModelResponse(Response):
    message_type: ResponseType = pydantic.Field(default=ResponseType.MODEL, init=False)
    parameters: ModelResponseParameters


# -------------------------------------
# Request Models
# -------------------------------------


class WebSocketRequestType(enum.Enum):
    SESSION = "session"
    GAME = "game"
    AI = "ai"


class WebSocketRequest(pydantic.BaseModel):
    request_type: WebSocketRequestType
    function_name: str
    parameters: dict[str, Any]


class TopologicalNewGameRequest(pydantic.BaseModel):
    number_of_players: int = pydantic.Field(default=2, ge=2, le=8)
    board_size: int = pydantic.Field(default=8, ge=4, le=8)
    gravity: GravitySetting
    geometry: Geometry
