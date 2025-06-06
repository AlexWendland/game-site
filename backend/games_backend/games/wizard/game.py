from typing import Any, override

import pydantic

from games_backend import game_base, models
from games_backend.ai_base import GameAI
from games_backend.app_logger import logger
from games_backend.games.exceptions import GameException
from games_backend.games.wizard.logic import WizardLogic
from games_backend.games.wizard.models import (
    WizardGameStateResponse,
)


class PlayCardParameters(pydantic.BaseModel):
    card: pydantic.NonNegativeInt


class MakeBidParameters(pydantic.BaseModel):
    bid: pydantic.NonNegativeInt
    set_suit: int = 5


class WizardGame(game_base.GameBase):
    def __init__(self, number_of_players: int, can_see_old_rounds: bool = False) -> None:
        self._number_of_players: int = number_of_players
        self._can_see_old_rounds: bool = can_see_old_rounds

        self._logic: WizardLogic = WizardLogic(
            number_of_players=number_of_players,
        )

    @override
    def handle_function_call(
        self, player_position: int, function_name: str, function_parameters: dict[str, Any]
    ) -> models.ErrorResponse | None:
        """
        Get the model to pass the game parameters.
        """
        match function_name:
            case "make_bid":
                try:
                    parsed_bid_parameters = MakeBidParameters(**function_parameters)
                except pydantic.ValidationError as game_exception:
                    logger.info(f"Player {player_position} provided invalid parameters: {game_exception}")
                    return models.ErrorResponse(
                        parameters=models.ErrorResponseParameters(error_message=f"Invalid parameters: {game_exception}")
                    )
                try:
                    return self._logic.set_player_bid(
                        player_position, bid=parsed_bid_parameters.bid, set_suit=parsed_bid_parameters.set_suit
                    )
                except GameException as game_exception:
                    logger.info(f"Player {player_position} made an invalid move: {game_exception}")
                    return models.ErrorResponse(
                        parameters=models.ErrorResponseParameters(error_message=f"Invalid move: {game_exception}")
                    )
            case "play_card":
                try:
                    parsed_play_parameters = PlayCardParameters(**function_parameters)
                except pydantic.ValidationError as game_exception:
                    logger.info(f"Player {player_position} provided invalid parameters: {game_exception}")
                    return models.ErrorResponse(
                        parameters=models.ErrorResponseParameters(error_message=f"Invalid parameters: {game_exception}")
                    )
                try:
                    return self._logic.play_card(player_position, card=parsed_play_parameters.card)
                except GameException as game_exception:
                    logger.info(f"Player {player_position} made an invalid move: {game_exception}")
                    return models.ErrorResponse(
                        parameters=models.ErrorResponseParameters(error_message=f"Invalid move: {game_exception}")
                    )
            case _:
                logger.info(f"Player {player_position} requested unknown function {function_name}.")
                return models.ErrorResponse(
                    parameters=models.ErrorResponseParameters(error_message=f"Function {function_name} not supported.")
                )

    @override
    def get_game_state_response(self, position: int | None) -> WizardGameStateResponse:
        parameters = self._logic.get_game_state(position, self._can_see_old_rounds)
        return WizardGameStateResponse(
            parameters=parameters,
        )

    @override
    def get_max_players(self) -> int:
        return self._number_of_players

    @override
    def get_game_ai(self) -> dict[str, type[GameAI]]:
        return {}

    @override
    def get_metadata(self) -> models.WizardGameMetadata:
        return models.WizardGameMetadata(
            max_players=self._number_of_players,
            parameters=models.WizardGameParameters(
                can_see_old_rounds=self._can_see_old_rounds,
            ),
        )
