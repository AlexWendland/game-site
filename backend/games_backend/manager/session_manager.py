from typing import Any

import pydantic

from games_backend import models
from games_backend.app_logger import logger


class SetPlayerParameters(pydantic.BaseModel):
    player_name: str


class SetPlayerPositionParameters(pydantic.BaseModel):
    new_position: int


class SessionManager:
    def __init__(self, max_players: int):
        self._max_players = max_players
        self._player_names: dict[str, str] = {}
        self._position_to_player: dict[int, str | None] = {i: None for i in range(max_players)}
        self._player_to_position: dict[str, int | None] = {}

    def get_client_position(self, client_id: str) -> int | None:
        self._check_client(client_id)
        return self._player_to_position.get(client_id)

    def add_client(self, client_id: str, name: str = "UNKNOWN"):
        self._player_names[client_id] = name
        self._player_to_position[client_id] = None

    def remove_client(self, client_id: str):
        self._check_client(client_id)
        self._remove_client_from_position(client_id)
        del self._player_names[client_id]
        del self._player_to_position[client_id]

    def get_session_state_response_for_client(self, client_id: str) -> models.SessionStateResponse:
        self._check_client(client_id)
        return models.SessionStateResponse(
            parameters=models.SessionStateResponseParameters(
                player_positions=self._get_positions(),
                user_position=self._player_to_position.get(client_id),
            )
        )

    def handle_function_call(
        self, client_id: str, function_name: str, function_parameters: dict[str, Any]
    ) -> models.ErrorResponse | None:
        match function_name:
            case "set_player_name":
                try:
                    parsed_parameters = SetPlayerParameters.model_validate(function_parameters)
                except pydantic.ValidationError as error:
                    return models.ErrorResponse(
                        parameters=models.ErrorResponseParameters(
                            error_message=f"Parameter validation failed for set_player_name: {error}"
                        )
                    )
                logger.info(f"Setting client {client_id} player name to {parsed_parameters.player_name}.")
                self._set_client_name(client_id, parsed_parameters.player_name)
                logger.info(f"Client {client_id} player name is now {self._player_names[client_id]}.")
            case "set_player_position":
                try:
                    parsed_parameters = SetPlayerPositionParameters.model_validate(function_parameters)
                except pydantic.ValidationError as error:
                    return models.ErrorResponse(
                        parameters=models.ErrorResponseParameters(
                            error_message=f"Parameter validation failed for set_player_position: {error}"
                        )
                    )
                logger.info(f"Setting client {client_id} player position to {parsed_parameters.new_position}.")
                try:
                    self._move_client_position(client_id, parsed_parameters.new_position)
                except ValueError as e:
                    return models.ErrorResponse(parameters=models.ErrorResponseParameters(error_message=str(e)))
            case "leave_player_position":
                logger.info(f"Client {client_id} leaving position.")
                self._remove_client_from_position(client_id)
            case _:
                logger.info(f"Client {client_id} requested unknow function {function_name}.")
                return models.ErrorResponse(
                    parameters=models.ErrorResponseParameters(error_message=f"Function {function_name} not supported.")
                )

    def _get_positions(self) -> dict[int, str | None]:
        return {
            pos: self._player_names.get(client_id) if client_id else None
            for pos, client_id in self._position_to_player.items()
        }

    def _set_client_name(self, client_id: str, name: str):
        self._check_client(client_id)
        self._player_names[client_id] = name

    def _move_client_position(self, client_id: str, new_position: int):
        self._check_client(client_id)
        if new_position < 0 or new_position >= self._max_players:
            raise ValueError(f"Position {new_position} is out of bounds.")
        if self._position_to_player[new_position] is not None:
            raise ValueError(f"Position {new_position} is already taken.")
        self._remove_client_from_position(client_id)
        self._position_to_player[new_position] = client_id
        self._player_to_position[client_id] = new_position

    def _check_client(self, client_id: str):
        if client_id not in self._player_names:
            raise ValueError(f"Client {client_id} not in session.")

    def _remove_client_from_position(self, client_id: str):
        position = self._player_to_position.get(client_id)
        if position is not None:
            self._position_to_player[position] = None
        self._player_to_position[client_id] = None
