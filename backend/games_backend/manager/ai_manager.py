from collections.abc import Awaitable
from typing import Any, Callable, Self

import pydantic

from games_backend import models
from games_backend.ai_base import GameAI
from games_backend.app_logger import logger


class AddAIParameters(pydantic.BaseModel):
    ai_model: str
    position: int


class RemoveAIParameters(pydantic.BaseModel):
    position: int


class AIManager:
    def __init__(
        self,
        game_models: dict[str, type[GameAI]],
        add_ai: Callable[[GameAI], Awaitable[str]],
        act_as_ai: Callable[[str, models.WebSocketRequest], Awaitable[None]],
        remove_ai: Callable[[str], Awaitable[None]],
    ) -> None:
        self._game_models: dict[str, type[GameAI]] = game_models
        self._ai_instances: dict[str, GameAI] = {}
        self._add_ai_to_game: Callable[[GameAI], Awaitable[str]] = add_ai
        self._act_as_ai: Callable[[str, models.WebSocketRequest], Awaitable[None]] = act_as_ai
        self._remove_ai: Callable[[str], Awaitable[None]] = remove_ai

    @classmethod
    async def from_serialised_manager(
        cls,
        game_models: dict[str, type[GameAI]],
        add_ai: Callable[[GameAI], Awaitable[str]],
        act_as_ai: Callable[[str, models.WebSocketRequest], Awaitable[None]],
        remove_ai: Callable[[str], Awaitable[None]],
        serialise_manager: dict[int, str],
    ) -> Self:
        manager = cls(game_models=game_models, add_ai=add_ai, act_as_ai=act_as_ai, remove_ai=remove_ai)
        for position, ai_model in serialise_manager.items():
            if ai_model not in game_models:
                logger.warning(f"Skipping invalid AI type {ai_model} at position {position}.")
                continue
            await manager._add_ai(ai_model, position)
        return manager

    def serialise_manager(self) -> dict[int, str]:
        return {
            ai_instance.position: type(ai_instance).get_ai_type()
            for ai_instance in self._ai_instances.values()
            if ai_instance.position is not None
        }

    async def handle_function_call(
        self, requester_client_id: str, function_name: str, function_parameters: dict[str, Any]
    ) -> models.ErrorResponse | None:
        match function_name:
            case "add_ai":
                try:
                    parsed_parameters = AddAIParameters.model_validate(function_parameters)
                except pydantic.ValidationError as error:
                    return models.ErrorResponse(
                        parameters=models.ErrorResponseParameters(
                            error_message=f"Parameter validation failed for add_ai: {error}"
                        )
                    )
                logger.info(
                    f"Client {requester_client_id} adding AI of model "
                    + f"{parsed_parameters.ai_model} to position {parsed_parameters.position}."
                )
                if parsed_parameters.ai_model not in self._game_models:
                    return models.ErrorResponse(
                        parameters=models.ErrorResponseParameters(
                            error_message=f"AI model {parsed_parameters.ai_model} not found."
                        )
                    )
                return await self._add_ai(parsed_parameters.ai_model, parsed_parameters.position)
            case "remove_ai":
                try:
                    parsed_parameters = RemoveAIParameters.model_validate(function_parameters)
                except pydantic.ValidationError as error:
                    return models.ErrorResponse(
                        parameters=models.ErrorResponseParameters(
                            error_message=f"Parameter validation failed for remove_ai: {error}"
                        )
                    )
                logger.info(f"Client {requester_client_id} is removing AI in position {parsed_parameters.position}.")
                for ai_id, ai_instance in list(self._ai_instances.items()):
                    if ai_instance.position == parsed_parameters.position:
                        await self._remove_ai(ai_id)
                        del self._ai_instances[ai_id]
                        logger.info(f"AI {ai_id} removed from position {parsed_parameters.position}.")
                        return
                return models.ErrorResponse(
                    parameters=models.ErrorResponseParameters(
                        error_message=f"No AI found in position {parsed_parameters.position}."
                    )
                )
            case _:
                logger.info(f"Client {requester_client_id} requested unknow function {function_name}.")
                return models.ErrorResponse(
                    parameters=models.ErrorResponseParameters(error_message=f"Function {function_name} not supported.")
                )

    async def _add_ai(self, ai_model: str, position: int) -> models.ErrorResponse | None:
        ai_instance = self._game_models[ai_model](position=position)
        ai_id = await self._add_ai_to_game(ai_instance)
        await self._act_as_ai(
            ai_id,
            models.WebSocketRequest(
                request_type=models.WebSocketRequestType.SESSION,
                function_name="set_player_name",
                parameters={"player_name": "AI-alfred"},
            ),
        )
        await self._act_as_ai(
            ai_id,
            models.WebSocketRequest(
                request_type=models.WebSocketRequestType.SESSION,
                function_name="set_player_position",
                parameters={"new_position": position},
            ),
        )
        if ai_instance.position is None:
            await self._remove_ai(ai_id)
            return models.ErrorResponse(
                parameters=models.ErrorResponseParameters(
                    error_message=f"AI instance {ai_id} did not set its position."
                )
            )
        self._ai_instances[ai_id] = ai_instance
        await self._act_as_ai(
            ai_id,
            models.WebSocketRequest(
                request_type=models.WebSocketRequestType.GAME, function_name="get_game_state", parameters={}
            ),
        )
