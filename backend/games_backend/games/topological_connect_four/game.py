import copy
import random
from abc import ABC, abstractmethod
from typing import Any, override

import pydantic

from games_backend import game_base, models
from games_backend.ai_base import GameAI
from games_backend.app_logger import logger
from games_backend.games.topological_connect_four.exceptions import GameException
from games_backend.games.topological_connect_four.geometry import GEOMETRY_MAP
from games_backend.games.topological_connect_four.gravity import GRAVITY_MAP
from games_backend.games.topological_connect_four.logic import TopologicalLogic


class TopologicalGameStateParameters(models.GameStateResponseParameters):
    moves: list[list[int | None]]
    winner: int | None
    winning_line: list[tuple[int, int]]
    available_moves: list[tuple[int, int]]
    current_move: int


class TopologicalGameStateResponse(models.GameStateResponse):
    message_type: models.ResponseType = pydantic.Field(default=models.ResponseType.GAME_STATE, init=False)
    parameters: TopologicalGameStateParameters


class MakeMoveParameters(pydantic.BaseModel):
    row: int
    column: int


class TopologicalGame(game_base.GameBase):
    def __init__(
        self, max_players: int, gravity: models.GravitySetting, geometry: models.Geometry, board_size: int = 8
    ) -> None:
        self._max_players: int = max_players
        self._gravity: models.GravitySetting = gravity
        self._geometry: models.Geometry = geometry
        self._board_size: int = board_size

        self._logic: TopologicalLogic = TopologicalLogic(
            number_of_players=max_players,
            board_size=board_size,
            geometry=GEOMETRY_MAP[geometry],
            gravity=GRAVITY_MAP[gravity],
        )

    @override
    def handle_function_call(
        self, player_position: int, function_name: str, function_parameters: dict[str, Any]
    ) -> models.ErrorResponse | None:
        """
        Get the model to pass the game parameters.
        """
        if function_name != "make_move":
            logger.info(f"Player {player_position} requested unknown function {function_name}.")
            return models.ErrorResponse(
                parameters=models.ErrorResponseParameters(error_message=f"Function {function_name} not supported.")
            )
        try:
            parsed_move_parameters = MakeMoveParameters(**function_parameters)
        except pydantic.ValidationError as game_exception:
            logger.info(f"Player {player_position} provided invalid parameters: {game_exception}")
            return models.ErrorResponse(
                parameters=models.ErrorResponseParameters(error_message=f"Invalid parameters: {game_exception}")
            )
        try:
            return self._logic.make_move(player_position, parsed_move_parameters.row, parsed_move_parameters.column)
        except GameException as game_exception:
            logger.info(f"Player {player_position} made an invalid move: {game_exception}")
            return models.ErrorResponse(
                parameters=models.ErrorResponseParameters(error_message=f"Invalid move: {game_exception}")
            )

    @override
    def get_game_state_response(self, position: int | None) -> TopologicalGameStateResponse:
        """
        Get the model to pass the game parameters.
        """
        return TopologicalGameStateResponse(
            parameters=TopologicalGameStateParameters(
                moves=self._logic.moves,
                winner=self._logic.winner,
                winning_line=self._logic.winning_line,
                available_moves=self._logic.get_available_moves(),
                current_move=self._logic.current_move,
            )
        )

    @override
    def get_max_players(self) -> int:
        return self._max_players

    @override
    def get_game_ai(self) -> dict[str, type[GameAI]]:
        return {
            TopologicalRandomAI.get_ai_type(): prefill_game_ai(TopologicalRandomAI, game_logic=self._logic),
        }

    @override
    def get_metadata(self) -> models.TopologicalGameMetadata:
        return models.TopologicalGameMetadata(
            max_players=self._max_players,
            parameters=models.TopologicalGameParameters(
                board_size=self._board_size,
                gravity=self._gravity,
                geometry=self._geometry,
            ),
        )


def prefill_game_ai(cls, game_logic: TopologicalLogic):
    class_name = f"{cls.__name__}WithPrefill"

    def __init__(self, position: int, name: str):
        super(new_cls, self).__init__(position=position, name=name, game_logic=copy.deepcopy(game_logic))

    new_cls = type(
        class_name,
        (cls,),
        {
            "__init__": __init__,
            "__module__": cls.__module__,
            "__doc__": cls.__doc__,
        },
    )
    return new_cls


class TopologicalAI(GameAI, ABC):
    def __init__(self, position: int, name: str, game_logic: TopologicalLogic) -> None:
        self._logic: TopologicalLogic = game_logic
        super().__init__(position, name)

    @override
    def update_game_state(self, game_state: TopologicalGameStateResponse) -> None | models.WebSocketRequest:
        self._logic.reset_game_state(game_state.parameters.moves)
        if self._logic.game_over or self._logic.current_player != self.position:
            return None
        row, column = self.make_move()
        return models.WebSocketRequest(
            request_type=models.WebSocketRequestType.GAME,
            function_name="make_move",
            parameters={"row": row, "column": column},
        )

    @abstractmethod
    def make_move(self) -> tuple[int, int]: ...


class TopologicalRandomAI(TopologicalAI):
    """
    Completely random AI.
    """

    @override
    @classmethod
    def get_ai_type(cls) -> str:
        return "random"

    @override
    @classmethod
    def get_ai_user_name(cls) -> str:
        return "Easy"

    @override
    def make_move(self) -> tuple[int, int]:
        available_moves = self._logic.get_available_moves()
        if not available_moves:
            raise ValueError("No available moves left.")
        return random.choice(available_moves)
