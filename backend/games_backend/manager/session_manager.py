from typing import Any

import pydantic
from fastapi import WebSocket

from games_backend import models
from games_backend.app_logger import logger


class SetPlayerParameters(pydantic.BaseModel):
    player_name: str


class SetPlayerPositionParameters(pydantic.BaseModel):
    new_position: int


class SessionManager:
    def __init__(self, max_players: int):
        self._max_players = max_players
        self._player_names: dict[WebSocket, str] = {}
        self._position_to_player: dict[int, WebSocket | None] = {i: None for i in range(max_players)}
        self._player_to_position: dict[WebSocket, int | None] = {}

    def get_client_position(self, client: WebSocket) -> int | None:
        self._check_client(client)
        return self._player_to_position.get(client)

    def add_client(self, client: WebSocket, name: str = "UNKNOWN"):
        self._player_names[client] = name
        self._player_to_position[client] = None

    def remove_client(self, client: WebSocket):
        self._check_client(client)
        self._remove_client_from_position(client)
        del self._player_names[client]
        del self._player_to_position[client]

    def get_session_state_response_for_client(self, client: WebSocket) -> models.SessionStateResponse:
        self._check_client(client)
        return models.SessionStateResponse(
            parameters=models.SessionStateResponseParameters(
                player_positions=self._get_positions(),
                user_position=self._player_to_position.get(client),
            )
        )

    def handle_function_call(
        self, client: WebSocket, function_name: str, function_parameters: dict[str, Any]
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
                logger.info(f"Setting client {client.client} player name to {parsed_parameters.player_name}.")
                self._set_client_name(client, parsed_parameters.player_name)
                logger.info(f"Client {client.client} player name is now {self._player_names[client]}.")
            case "set_player_position":
                try:
                    parsed_parameters = SetPlayerPositionParameters.model_validate(function_parameters)
                except pydantic.ValidationError as error:
                    return models.ErrorResponse(
                        parameters=models.ErrorResponseParameters(
                            error_message=f"Parameter validation failed for set_player_position: {error}"
                        )
                    )
                logger.info(f"Setting client {client.client} player position to {parsed_parameters.new_position}.")
                try:
                    self._move_client_position(client, parsed_parameters.new_position)
                except ValueError as e:
                    return models.ErrorResponse(parameters=models.ErrorResponseParameters(error_message=str(e)))
            case "leave_player_position":
                logger.info(f"Client {client.client} leaving position.")
                self._remove_client_from_position(client)
            case _:
                logger.info(f"Client {client.client} requested unknow function {function_name}.")
                return models.ErrorResponse(
                    parameters=models.ErrorResponseParameters(error_message=f"Function {function_name} not supported.")
                )

    def _get_positions(self) -> dict[int, str | None]:
        return {
            pos: self._player_names.get(client) if client else None for pos, client in self._position_to_player.items()
        }

    def _set_client_name(self, client: WebSocket, name: str):
        self._check_client(client)
        self._player_names[client] = name

    def _move_client_position(self, client: WebSocket, new_position: int):
        self._check_client(client)
        if new_position < 0 or new_position >= self._max_players:
            raise ValueError(f"Position {new_position} is out of bounds.")
        if self._position_to_player[new_position] is not None:
            raise ValueError(f"Position {new_position} is already taken.")
        self._remove_client_from_position(client)
        self._position_to_player[new_position] = client
        self._player_to_position[client] = new_position

    def _check_client(self, client: WebSocket):
        if client not in self._player_names:
            raise ValueError(f"Client {client} not in session.")

    def _remove_client_from_position(self, client: WebSocket):
        position = self._player_to_position.get(client)
        if position is not None:
            self._position_to_player[position] = None
        self._player_to_position[client] = None
