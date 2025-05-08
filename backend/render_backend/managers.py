import asyncio
from typing import Any

import pydantic
from fastapi import WebSocket

from render_backend import game_base, models
from render_backend.app_logger import logger
from render_backend.utils import non_matching_game_name


class SetPlayerParameters(pydantic.BaseModel):
    player_name: str


class SetPlayerPositionParameters(pydantic.BaseModel):
    new_position: int


class SessionManager:
    def __init__(self, max_players: int):
        self._max_players = max_players
        self._player_names: dict[WebSocket, str] = {}
        self._position_to_player: dict[int, WebSocket | None] = {
            i: None for i in range(max_players)
        }
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

    def get_session_state_response_for_client(
        self, client: WebSocket
    ) -> models.SessionStateResponse:
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
                logger.info(
                    f"Setting client {client.client} player name to {parsed_parameters.player_name}."
                )
                self._set_client_name(client, parsed_parameters.player_name)
                logger.info(
                    f"Client {client.client} player name is now {self._player_names[client]}."
                )
            case "set_player_position":
                try:
                    parsed_parameters = SetPlayerPositionParameters.model_validate(
                        function_parameters
                    )
                except pydantic.ValidationError as error:
                    return models.ErrorResponse(
                        parameters=models.ErrorResponseParameters(
                            error_message=f"Parameter validation failed for set_player_position: {error}"
                        )
                    )
                logger.info(
                    f"Setting client {client.client} player position to {parsed_parameters.new_position}."
                )
                try:
                    self._move_client_position(client, parsed_parameters.new_position)
                except ValueError as e:
                    return models.ErrorResponse(
                        parameters=models.ErrorResponseParameters(error_message=str(e))
                    )
            case "leave_player_position":
                logger.info(f"Client {client.client} leaving position.")
                self._remove_client_from_position(client)
            case _:
                logger.info(f"Client {client.client} requested unknow function {function_name}.")
                return models.ErrorResponse(
                    parameters=models.ErrorResponseParameters(
                        error_message=f"Function {function_name} not supported."
                    )
                )

    def _get_positions(self) -> dict[int, str | None]:
        return {
            pos: self._player_names.get(client) if client else None
            for pos, client in self._position_to_player.items()
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


class GameManager:
    def __init__(self, game_id: str, game: game_base.GameBase, session: SessionManager):
        self._game_id = game_id
        self._clients: list[WebSocket] = []
        self._lock = asyncio.Lock()
        self._game = game
        self._session = session
        self._is_closed = False

    @property
    def is_closed(self):
        return self._is_closed

    async def close_game(self):
        if self._is_closed:
            return
        async with self._lock:
            for client in self._clients:
                await self._disconnect(client)
        self._is_closed = True

    async def handle_connection(self, client: WebSocket):
        if self._is_closed:
            raise ValueError(f"Game ({self._game_id}) is closed can not add new clients.")
        await self._connect(client)
        await self._message_client(
            client=client,
            message=models.SimpleResponse(
                parameters=models.SimpleResponseParameters(
                    message=f"Client {client.client} connected."
                )
            ),
        )
        await self._update_client_state(client)
        try:
            while not self._is_closed:
                message_text = await client.receive_text()
                logger.info(
                    f"Client {client.client} messaged with {message_text} ({type(message_text)})."
                )
                await self._handle_message(client, message_text)
        except Exception as e:
            logger.exception(f"Error while handling message from client {client.client}: {e}")
            logger.info(f"Client {client.client} closed connection.")

        await self._disconnect(client)

    def get_metadata(self) -> models.GameMetadata:
        return self._game.get_metadata()

    async def _connect(self, client: WebSocket):
        await client.accept()
        logger.info(f"Client {client} joined game {self._game_id}.")
        async with self._lock:
            self._clients.append(client)
            self._session.add_client(client)

    async def _disconnect(self, client: WebSocket):
        async with self._lock:
            if client in self._clients:
                try:
                    await client.close()
                except Exception:
                    pass
                logger.info(f"Client {client} left game {self._game_id}")
                self._clients.remove(client)
                self._session.remove_client(client)

    async def _message_client(self, client: WebSocket, message: models.Response):
        disconnect = False
        async with self._lock:
            try:
                if client in self._clients:
                    await client.send_json(message.model_dump_json())
                else:
                    logger.info("Tried to send message to {client} not in game.")
            except Exception:
                disconnect = True
        if disconnect:
            await self._disconnect(client)

    async def _update_client_state(self, client: WebSocket):
        session_state = self._session.get_session_state_response_for_client(client)
        await self._message_client(client, session_state)
        game_position = self._session.get_client_position(client)
        game_state = self._game.get_game_state_response(game_position)
        await self._message_client(client, game_state)

    async def _broadcast(self, message: models.Response):
        to_disconnect: list[WebSocket] = []
        async with self._lock:
            for client in self._clients:
                try:
                    await client.send_json(message.model_dump_json())
                except Exception:
                    to_disconnect.append(client)
        for client in to_disconnect:
            await self._disconnect(client)

    async def _broadcast_session_state(self):
        to_disconnect: list[WebSocket] = []
        async with self._lock:
            for client in self._clients:
                try:
                    message = self._session.get_session_state_response_for_client(client)
                    await client.send_json(message.model_dump_json())
                except Exception:
                    to_disconnect.append(client)
        for client in to_disconnect:
            await self._disconnect(client)

    async def _broadcast_game_state(self):
        to_disconnect: list[WebSocket] = []
        async with self._lock:
            for client in self._clients:
                try:
                    game_position = self._session.get_client_position(client)
                    message = self._game.get_game_state_response(game_position)
                    await client.send_json(message.model_dump_json())
                except Exception:
                    to_disconnect.append(client)
        for client in to_disconnect:
            await self._disconnect(client)

    async def _handle_message(self, client: WebSocket, message: str):
        try:
            parsed_message = models.WebSocketRequest.model_validate_json(message)
        except pydantic.ValidationError as error:
            logger.exception("Could not parse message")
            await self._message_client(
                client=client,
                message=models.ErrorResponse(
                    parameters=models.ErrorResponseParameters(
                        error_message=f"Invalid message: {error}"
                    )
                ),
            )
            return
        match parsed_message.request_type:
            case models.WebsocketRequestType.SESSION:
                response = self._session.handle_function_call(
                    client=client,
                    function_name=parsed_message.function_name,
                    function_parameters=parsed_message.parameters,
                )
                if response:
                    await self._message_client(client, response)
                else:
                    await self._broadcast_session_state()
            case models.WebsocketRequestType.GAME:
                position = self._session.get_client_position(client)
                if position is None:
                    return
                response = self._game.handle_function_call(
                    player_position=position,
                    function_name=parsed_message.function_name,
                    function_parameters=parsed_message.parameters,
                )
                if response:
                    await self._message_client(client, response)
                else:
                    await self._broadcast_game_state()


class BookManager:
    def __init__(self):
        self._live_games: dict[str, GameManager] = {}

    def add_game(self, game_id: str, game_manager: GameManager):
        if game_id in self._live_games:
            raise KeyError(f"Game ID to be added {game_id} already exists.")
        self._live_games[game_id] = game_manager
        logger.info(f"Created game {game_id}.")

    async def remove_game(self, game_id: str):
        if game_id not in self._live_games:
            return
        manager = self._live_games.pop(game_id)
        await manager.close_game()
        logger.info(f"Closed game {game_id}.")

    def get_game(self, game_id: str) -> GameManager:
        if game_id not in self._live_games:
            raise KeyError(f"Game ID {game_id} does not exist.")
        return self._live_games[game_id]

    def get_all_game_ids(self) -> set[str]:
        return set(self._live_games.keys())

    def get_free_game_id(self) -> str:
        return non_matching_game_name(self.get_all_game_ids())

    def get_game_metadata(self, game_id: str) -> models.GameMetadata:
        return self.get_game(game_id).get_metadata()
