import asyncio

import pydantic
from fastapi import WebSocket

from games_backend import game_base, models
from games_backend.app_logger import logger
from games_backend.manager.session_manager import SessionManager


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
                parameters=models.SimpleResponseParameters(message=f"Client {client.client} connected.")
            ),
        )
        await self._update_client_state(client)
        try:
            while not self._is_closed:
                message_text = await client.receive_text()
                logger.info(f"Client {client.client} messaged with {message_text} ({type(message_text)}).")
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
                    parameters=models.ErrorResponseParameters(error_message=f"Invalid message: {error}")
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
