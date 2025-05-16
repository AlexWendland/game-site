import asyncio
import uuid
from typing import Self

import pydantic
from fastapi import WebSocket

from games_backend import game_base, models
from games_backend.app_logger import logger
from games_backend.manager.session_manager import SessionManager


class GameManager:
    def __init__(self, game_id: str, game: game_base.GameBase, session: SessionManager):
        self._game_id = game_id
        self._id_to_endpoint: dict[str, WebSocket] = {}
        self._endpoint_to_id: dict[WebSocket, str] = {}
        self._lock = asyncio.Lock()
        self._game = game
        self._session = session
        self._is_closed = False

    @property
    def is_closed(self) -> bool:
        return self._is_closed

    @property
    def is_active(self) -> bool:
        return len(self._endpoint_to_id) > 0

    async def close_game(self):
        if self._is_closed:
            return
        async with self._lock:
            for client_id in self._endpoint_to_id.values():
                await self._disconnect(client_id)
        self._is_closed = True

    async def handle_connection(self, client: WebSocket):
        if self._is_closed:
            raise ValueError(f"Game ({self._game_id}) is closed can not add new clients.")
        client_id = await self._connect_human(client)
        await self._message_client_locked(
            client_id=client_id,
            message=models.SimpleResponse(
                parameters=models.SimpleResponseParameters(message=f"Client {client_id} connected.")
            ),
        )
        await self._update_client_state(client_id)
        try:
            while not self._is_closed:
                message_text = await client.receive_text()
                logger.info(f"Client {client_id} messaged with {message_text} ({type(message_text)}).")
                await self._handle_message(client_id, message_text)
        except Exception:
            logger.exception(f"Error while handling message from client {client_id}.")

        logger.info(f"Client {client_id} closed connection.")
        await self._disconnect(client_id)

    def get_metadata(self) -> models.GameMetadata:
        return self._game.get_metadata()

    def get_game(self) -> game_base.GameBase:
        return self._game

    @classmethod
    def from_game_and_id(cls, game_id: str, game: game_base.GameBase) -> Self:
        session = SessionManager(game.get_max_players())
        return cls(game_id=game_id, game=game, session=session)


    async def _connect_human(self, client: WebSocket) -> str:
        await client.accept()
        client_id = str(uuid.uuid4())
        logger.info(f"Client {client} ({client_id}) joined game {self._game_id}.")
        async with self._lock:
            self._endpoint_to_id[client] = client_id
            self._id_to_endpoint[client_id] = client
            self._session.add_client(client_id)
        return client_id

    async def _disconnect(self, client_id: str):
        client = self._id_to_endpoint.get(client_id)
        async with self._lock:
            if isinstance(client, WebSocket):
                try:
                    await client.close()
                except Exception:
                    pass
                logger.info(f"Client {client} ({client_id}) left game {self._game_id}")
                del self._endpoint_to_id[client]
                del self._id_to_endpoint[client_id]
                self._session.remove_client(client_id)
            # Add AI disconnect here

    async def _message_client_locked(self, client_id: str, message: models.Response):
        disconnect = False
        async with self._lock:
            disconnect = await self._message_client(client_id, message)
        if disconnect:
            await self._disconnect(client_id)

    async def _message_client(self, client_id: str, message: models.Response) -> bool:
        client = self._id_to_endpoint.get(client_id)
        if isinstance(client, WebSocket):
            try:
                await client.send_json(message.model_dump_json())
            except Exception:
                return True
        # Add AI messaging here
        return False


    async def _update_client_state(self, client_id: str):
        session_state = self._session.get_session_state_response_for_client(client_id)
        await self._message_client_locked(client_id, session_state)
        game_position = self._session.get_client_position(client_id)
        game_state = self._game.get_game_state_response(game_position)
        await self._message_client_locked(client_id, game_state)

    async def _broadcast_session_state(self):
        to_disconnect: list[str] = []
        async with self._lock:
            for client_id in self._endpoint_to_id.values():
                message = self._session.get_session_state_response_for_client(client_id)
                if await self._message_client(client_id, message):
                    to_disconnect.append(client_id)
        for client_id in to_disconnect:
            await self._disconnect(client_id)

    async def _broadcast_game_state(self):
        to_disconnect: list[str] = []
        async with self._lock:
            for client_id in self._id_to_endpoint:
                game_position = self._session.get_client_position(client_id)
                message = self._game.get_game_state_response(game_position)
                if await self._message_client(client_id, message):
                    to_disconnect.append(client_id)
        for client_id in to_disconnect:
            await self._disconnect(client_id)

    async def _handle_message(self, client_id: str, message: str):
        try:
            parsed_message = models.WebSocketRequest.model_validate_json(message)
        except pydantic.ValidationError as error:
            logger.exception("Could not parse message")
            await self._message_client_locked(
                client_id=client_id,
                message=models.ErrorResponse(
                    parameters=models.ErrorResponseParameters(error_message=f"Invalid message: {error}")
                ),
            )
            return
        match parsed_message.request_type:
            case models.WebsocketRequestType.SESSION:
                response = self._session.handle_function_call(
                    client_id=client_id,
                    function_name=parsed_message.function_name,
                    function_parameters=parsed_message.parameters,
                )
                if response:
                    await self._message_client_locked(client_id, response)
                else:
                    await self._broadcast_session_state()
            case models.WebsocketRequestType.GAME:
                position = self._session.get_client_position(client_id)
                if position is None:
                    return
                response = self._game.handle_function_call(
                    player_position=position,
                    function_name=parsed_message.function_name,
                    function_parameters=parsed_message.parameters,
                )
                if response:
                    await self._message_client_locked(client_id, response)
                else:
                    await self._broadcast_game_state()
