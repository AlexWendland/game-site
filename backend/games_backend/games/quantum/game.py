import random
from abc import ABC, abstractmethod
from typing import Any, override

import pydantic

from games_backend import game_base, models
from games_backend.ai_base import GameAI
from games_backend.app_logger import logger
from games_backend.games.quantum.logic import ContradictionError, QuantumLogic
from games_backend.games.quantum.models import (
    QuantumActionOutcome,
    QuantumGameState,
    QuantumGameStateParameters,
    QuantumGameStateResponse,
    QuantumLogEntry,
)


class TargetPlayerParameters(pydantic.BaseModel):
    targeted_player: int
    suit: int


class RespondToTargetParameters(pydantic.BaseModel):
    response: bool


class ClaimOwnSuitParameters(pydantic.BaseModel):
    suit: int


class ClaimAllSuitsDeterminedParameters(pydantic.BaseModel):
    suit_allocation: dict[int, dict[int, int]]


class SetHintLevelParameters(pydantic.BaseModel):
    hint_level: models.QuantumHintLevel


class SetSuitNameParameters(pydantic.BaseModel):
    suit_name: str

    @pydantic.field_validator("suit_name")
    def validate_suit_name(cls, value: str) -> str:
        value = value.strip()
        if len(value) == 0 or len(value) > 20:
            raise ValueError("Suit name must be a non-empty string with a maximum length of 20 characters.")
        return value


class QuantumGame(game_base.GameBase):
    def __init__(self, number_of_players: int, max_hint_level: models.QuantumHintLevel) -> None:
        self._number_of_players: int = number_of_players
        self._max_hint_level: models.QuantumHintLevel = max_hint_level
        self._logic: QuantumLogic = QuantumLogic(number_of_players)
        self._player_hint_levels: dict[int, models.QuantumHintLevel] = {
            i: models.QuantumHintLevel.NONE for i in range(number_of_players)
        }
        self._player_suit_names: dict[int, str | None] = {i: None for i in range(number_of_players)}
        self._contradiction_count: dict[int, int] = {i: 0 for i in range(number_of_players)}
        self._game_log: list[QuantumLogEntry] = []

    @override
    def handle_function_call(
        self, player_position: int, function_name: str, function_parameters: dict[str, Any]
    ) -> models.ErrorResponse | None:
        """Handle player actions in the quantum go fish game."""
        if self._player_suit_names[player_position] is None and function_name != "set_suit_name":
            logger.info(f"Player {player_position} tried to call {function_name} without setting suit name.")
            return models.ErrorResponse(
                parameters=models.ErrorResponseParameters(error_message="Suit name must be set before making moves.")
            )

        match function_name:
            case "set_suit_name":
                try:
                    parsed_parameters = SetSuitNameParameters(**function_parameters)
                except pydantic.ValidationError as e:
                    logger.info(f"Player {player_position} provided invalid parameters: {e}")
                    return models.ErrorResponse(
                        parameters=models.ErrorResponseParameters(error_message=f"Invalid parameters: {e}")
                    )
                if self._player_suit_names[player_position] is not None:
                    logger.info(f"Player {player_position} tried to set suit name again: {parsed_parameters.suit_name}")
                    return models.ErrorResponse(
                        parameters=models.ErrorResponseParameters(error_message="Suit name already set.")
                    )
                if parsed_parameters.suit_name in self._player_suit_names.values():
                    logger.info(
                        f"Player {player_position} tried to set a duplicate suit name: {parsed_parameters.suit_name}"
                    )
                    return models.ErrorResponse(
                        parameters=models.ErrorResponseParameters(error_message="Suit name already taken.")
                    )
                self._player_suit_names[player_position] = parsed_parameters.suit_name
                self._game_log.append(
                    QuantumLogEntry(
                        player=player_position,
                        function_call=function_name,
                        parameters=function_parameters,
                        outcome=QuantumActionOutcome.SUCCESS,
                        move_number=0,
                    )
                )
            case "set_hint_level":
                try:
                    parsed_parameters = SetHintLevelParameters(**function_parameters)
                except pydantic.ValidationError as e:
                    logger.info(f"Player {player_position} provided invalid parameters: {e}")
                    return models.ErrorResponse(
                        parameters=models.ErrorResponseParameters(error_message=f"Invalid parameters: {e}")
                    )
                if parsed_parameters.hint_level.value > self._max_hint_level.value:
                    logger.info(
                        f"Player {player_position} tried to set an invalid hint level: {parsed_parameters.hint_level}"
                    )
                    return models.ErrorResponse(
                        parameters=models.ErrorResponseParameters(error_message="Invalid hint level.")
                    )
                if parsed_parameters.hint_level.value < self._player_hint_levels[player_position].value:
                    logger.info(
                        f"Player {player_position} tried to set a lower hint level than current: "
                        + f"{parsed_parameters.hint_level}"
                    )
                    return models.ErrorResponse(
                        parameters=models.ErrorResponseParameters(error_message="Cannot lower hint level.")
                    )
                self._player_hint_levels[player_position] = parsed_parameters.hint_level
            case "target_player":
                try:
                    parsed_parameters = TargetPlayerParameters(**function_parameters)
                except pydantic.ValidationError as e:
                    logger.info(f"Player {player_position} provided invalid parameters: {e}")
                    return models.ErrorResponse(
                        parameters=models.ErrorResponseParameters(error_message=f"Invalid parameters: {e}")
                    )
                try:
                    self._logic.target_player(
                        player_position, parsed_parameters.targeted_player, parsed_parameters.suit
                    )
                    self._game_log.append(
                        QuantumLogEntry(
                            player=player_position,
                            function_call=function_name,
                            parameters=function_parameters,
                            outcome=QuantumActionOutcome.SUCCESS,
                            move_number=self._logic.move_number,
                        )
                    )
                    return None
                except ValueError as e:
                    logger.info(f"Player {player_position} made an invalid move: {e}")
                    return models.ErrorResponse(
                        parameters=models.ErrorResponseParameters(error_message=f"Invalid move: {e}")
                    )
                except ContradictionError as e:
                    logger.info(f"Player {player_position} made a contradictory move: {e}")
                    self._contradiction_count[player_position] += 1
                    self._game_log.append(
                        QuantumLogEntry(
                            player=player_position,
                            function_call=function_name,
                            parameters=function_parameters,
                            outcome=QuantumActionOutcome.CONTRADICTION_REVERTED,
                            move_number=self._logic.move_number,
                        )
                    )
                    return None

            case "respond_to_target":
                try:
                    parsed_parameters = RespondToTargetParameters(**function_parameters)
                except pydantic.ValidationError as e:
                    logger.info(f"Player {player_position} provided invalid parameters: {e}")
                    return models.ErrorResponse(
                        parameters=models.ErrorResponseParameters(error_message=f"Invalid parameters: {e}")
                    )
                try:
                    self._logic.respond_to_target(player_position, parsed_parameters.response)
                    self._game_log.append(
                        QuantumLogEntry(
                            player=player_position,
                            function_call=function_name,
                            parameters=function_parameters,
                            outcome=QuantumActionOutcome.SUCCESS,
                            move_number=self._logic.move_number,
                        )
                    )
                    return None
                except ValueError as e:
                    logger.info(f"Player {player_position} made an invalid move: {e}")
                    return models.ErrorResponse(
                        parameters=models.ErrorResponseParameters(error_message=f"Invalid move: {e}")
                    )
                except ContradictionError as e:
                    logger.info(f"Player {player_position} made a contradictory move: {e}")
                    self._contradiction_count[player_position] += 1
                    self._game_log.append(
                        QuantumLogEntry(
                            player=player_position,
                            function_call=function_name,
                            parameters=function_parameters,
                            outcome=QuantumActionOutcome.CONTRADICTION_REVERTED,
                            move_number=self._logic.move_number,
                        )
                    )
                    return None

            case "claim_no_win":
                try:
                    self._logic.claim_no_win(player_position)
                    return None
                except ValueError as e:
                    logger.info(f"Player {player_position} made an invalid move: {e}")
                    return models.ErrorResponse(
                        parameters=models.ErrorResponseParameters(error_message=f"Invalid move: {e}")
                    )

            case "claim_own_suit":
                try:
                    parsed_parameters = ClaimOwnSuitParameters(**function_parameters)
                except pydantic.ValidationError as e:
                    logger.info(f"Player {player_position} provided invalid parameters: {e}")
                    return models.ErrorResponse(
                        parameters=models.ErrorResponseParameters(error_message=f"Invalid parameters: {e}")
                    )
                try:
                    self._logic.claim_own_a_suit(player_position, parsed_parameters.suit)
                    self._game_log.append(
                        QuantumLogEntry(
                            player=player_position,
                            function_call=function_name,
                            parameters=function_parameters,
                            outcome=QuantumActionOutcome.WON,
                            move_number=self._logic.move_number,
                        )
                    )
                    return None
                except ValueError as e:
                    logger.info(f"Player {player_position} made an invalid move: {e}")
                    return models.ErrorResponse(
                        parameters=models.ErrorResponseParameters(error_message=f"Invalid move: {e}")
                    )
                except ContradictionError as e:
                    logger.info(f"Player {player_position} made a contradictory move: {e}")
                    self._contradiction_count[player_position] += 1
                    self._game_log.append(
                        QuantumLogEntry(
                            player=player_position,
                            function_call=function_name,
                            parameters=function_parameters,
                            outcome=QuantumActionOutcome.CONTRADICTION_CONTINUE,
                            move_number=self._logic.move_number,
                        )
                    )
                    return None

            case "claim_all_suits_determined":
                try:
                    parsed_parameters = ClaimAllSuitsDeterminedParameters(**function_parameters)
                except pydantic.ValidationError as e:
                    logger.info(f"Player {player_position} provided invalid parameters: {e}")
                    return models.ErrorResponse(
                        parameters=models.ErrorResponseParameters(error_message=f"Invalid parameters: {e}")
                    )
                try:
                    self._logic.claim_all_suits_determined(player_position, parsed_parameters.suit_allocation)
                    self._game_log.append(
                        QuantumLogEntry(
                            player=player_position,
                            function_call=function_name,
                            parameters=function_parameters,
                            outcome=QuantumActionOutcome.WON,
                            move_number=self._logic.move_number,
                        )
                    )
                    return None
                except ValueError as e:
                    logger.info(f"Player {player_position} made an invalid move: {e}")
                    return models.ErrorResponse(
                        parameters=models.ErrorResponseParameters(error_message=f"Invalid move: {e}")
                    )
                except ContradictionError as e:
                    logger.info(f"Player {player_position} made a contradictory move: {e}")
                    self._contradiction_count[player_position] += 1
                    self._game_log.append(
                        QuantumLogEntry(
                            player=player_position,
                            function_call=function_name,
                            parameters=function_parameters,
                            outcome=QuantumActionOutcome.CONTRADICTION_CONTINUE,
                            move_number=self._logic.move_number,
                        )
                    )
                    return None

            case _:
                logger.info(f"Player {player_position} requested unknown function {function_name}.")
                return models.ErrorResponse(
                    parameters=models.ErrorResponseParameters(error_message=f"Function {function_name} not supported.")
                )

    @override
    def get_game_state_response(self, position: int | None) -> QuantumGameStateResponse:
        """Get the current game state for the specified player position."""
        parameters = QuantumGameStateParameters(
            game_log=self._game_log,
            suit_names=self._player_suit_names,
            hint_levels=self._player_hint_levels,
            **self._logic.get_partial_state(
                self._player_hint_levels.get(position, models.QuantumHintLevel.NONE)
                if position is not None
                else models.QuantumHintLevel.NONE
            ),
        )
        return QuantumGameStateResponse(parameters=parameters)

    @override
    def get_max_players(self) -> int:
        return self._number_of_players

    @override
    def get_game_ai(self) -> dict[str, type[GameAI]]:
        return {
            QuantumRandomAI.get_ai_type(): QuantumRandomAI,
        }

    @override
    def get_metadata(self) -> models.GameMetadataUnion:
        return models.QuantumGameMetadata(
            max_players=self._number_of_players,
            parameters=models.QuantumGameParameters(
                max_hint_level=self._max_hint_level,
            ),
        )


SUIT_NAMES = [
    "Scruples",
    "Ducks",
    "Squids",
    "Unicorns",
    "Loaves",
    "Holes",
    "Balloons",
    "Pizzas",
    "Kittens",
    "Robots",
    "Dragons",
    "Pimples",
]


class QuantumAI(GameAI, ABC):
    def __init__(self, position: int, name: str):
        self._state: QuantumGameStateParameters | None = None
        super().__init__(position, name)

    def _make_random_suit_name(self) -> str:
        """Generate a random suit name."""
        return random.choice(SUIT_NAMES)

    @property
    def number_for_players(self) -> int:
        if self._state is None:
            return 0
        return len(self._state.suit_names)

    @override
    def update_game_state(self, game_state: QuantumGameStateResponse) -> None | models.WebSocketRequest:
        self._state = game_state.parameters
        if self._state.winner is not None:
            return None
        if self._position is None:
            return None
        if self._state.suit_names.get(self._position, None) is None:
            return models.WebSocketRequest(
                request_type=models.WebSocketRequestType.GAME,
                function_name="set_suit_name",
                parameters={"suit_name": self._make_random_suit_name()},
            )
        if self._state.game_state == QuantumGameState.TARGET_PLAYER and self._state.current_player == self._position:
            target = self.target_player()
            return models.WebSocketRequest(
                request_type=models.WebSocketRequestType.GAME,
                function_name="target_player",
                parameters={
                    "targeted_player": target[0],
                    "suit": target[1],
                },
            )
        if self._state.game_state == QuantumGameState.RESPONSE and self._state.current_player == self._position:
            return models.WebSocketRequest(
                request_type=models.WebSocketRequestType.GAME,
                function_name="respond_to_target",
                parameters={"response": self.respond_to_target()},
            )
        if self._state.game_state == QuantumGameState.CLAIM_WIN and self._state.current_player == self._position:
            claim = self.decide_if_to_claim_victory()
            if claim is None:
                return models.WebSocketRequest(
                    request_type=models.WebSocketRequestType.GAME,
                    function_name="claim_no_win",
                    parameters={},
                )
            elif isinstance(claim, int):
                return models.WebSocketRequest(
                    request_type=models.WebSocketRequestType.GAME,
                    function_name="claim_own_suit",
                    parameters={"suit": claim},
                )
            return models.WebSocketRequest(
                request_type=models.WebSocketRequestType.GAME,
                function_name="claim_all_suits_determined",
                parameters={"suit_allocation": claim},
            )

    @abstractmethod
    def target_player(self) -> tuple[int, int]:
        """Select a player and suit to target."""

    @abstractmethod
    def respond_to_target(self) -> bool:
        """Decide whether to respond to a target or not."""

    @abstractmethod
    def decide_if_to_claim_victory(self) -> None | int | dict[int, dict[int, int]]:
        """Decided whether to claim a win or not."""


class QuantumRandomAI(QuantumAI):
    """Random AI for quantum go fish - makes random valid moves."""

    @override
    def target_player(self) -> tuple[int, int]:
        return random.choice(range(self.number_for_players)), random.choice(self._state.available_moves)

    @override
    def respond_to_target(self) -> bool:
        return random.choice(self._state.available_moves)

    @override
    def decide_if_to_claim_victory(self) -> None | int | dict[int, dict[int, int]]:
        return None

    @override
    @classmethod
    def get_ai_type(cls) -> str:
        return "random"

    @override
    @classmethod
    def get_ai_user_name(cls) -> str:
        return "Easy"
