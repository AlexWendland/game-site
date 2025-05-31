import asyncio
import uuid
from typing import Self, final

import pydantic
from fastapi import WebSocket

from games_backend import game_base, models
from games_backend.ai_base import GameAI
from games_backend.app_logger import logger
from games_backend.manager.ai_manager import AIManager
from games_backend.manager.session_manager import SessionManager

Player = WebSocket | GameAI


@final
class GameManager:
    def __init__(self, game_id: str, game: game_base.GameBase, session: SessionManager):
        self._game_id = game_id
        self._id_to_player: dict[str, Player] = {}
        self._player_to_id: dict[Player, str] = {}
        self._player_lock = asyncio.Lock()
        self._game = game
        self._session = session
        self._is_closed = False

        self._action_bus: list[tuple[str, models.WebSocketRequest]] = []
        self._action_lock = asyncio.Lock()

    def _set_ai_manager(self, ai_manager: AIManager):
        self._ai_manager: AIManager = ai_manager

    @property
    def is_closed(self) -> bool:
        return self._is_closed

    @property
    def is_active(self) -> bool:
        return len(self._player_to_id) > 0

    async def close_game(self):
        if self._is_closed:
            return
        async with self._player_lock:
            for client_id in self._player_to_id.values():
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
            logger.error(f"Error while handling message from client {client_id}.")

        logger.info(f"Client {client_id} closed connection.")
        await self._disconnect(client_id)

    def get_metadata(self) -> models.GameMetadata:
        return self._game.get_metadata()

    def get_game(self) -> game_base.GameBase:
        return self._game

    @classmethod
    def from_game_and_id(cls, game_id: str, game: game_base.GameBase) -> Self:
        session = SessionManager(game.get_max_players())
        manager = cls(game_id=game_id, game=game, session=session)
        ai_manager = AIManager(
            game_models=type(game).get_game_ai(),
            add_ai=manager._connect_ai,
            act_as_ai=manager._action_message,
            remove_ai=manager._disconnect,
        )
        manager._set_ai_manager(ai_manager)
        return manager

    async def _connect_human(self, client: WebSocket) -> str:
        await client.accept()
        client_id = str(uuid.uuid4())
        logger.info(f"Client {client} ({client_id}) joined game {self._game_id}.")
        async with self._player_lock:
            self._player_to_id[client] = client_id
            self._id_to_player[client_id] = client
            self._session.add_client(client_id)
        return client_id

    async def _connect_ai(self, client: GameAI) -> str:
        client_id = str(uuid.uuid4())
        logger.info(f"Client {client} ({client_id}) joined game {self._game_id}.")
        async with self._player_lock:
            self._player_to_id[client] = client_id
            self._id_to_player[client_id] = client
            self._session.add_client(client_id)
        return client_id

    async def _disconnect(self, client_id: str):
        client = self._id_to_player.get(client_id)
        if client is None:
            return
        async with self._player_lock:
            if isinstance(client, WebSocket):
                try:
                    await client.close()
                except Exception:
                    pass
            logger.info(f"Client {client_id} left game {self._game_id}")
            del self._player_to_id[client]
            del self._id_to_player[client_id]
            self._session.remove_client(client_id)
        await self._broadcast_session_state()
        await self._broadcast_ai_state()

    async def _message_client_locked(self, client_id: str, message: models.Response):
        disconnect = False
        async with self._player_lock:
            disconnect = await self._message_client(client_id, message)
        if disconnect:
            await self._disconnect(client_id)

    async def _message_client(self, client_id: str, message: models.Response) -> bool:
        client = self._id_to_player.get(client_id)
        if isinstance(client, WebSocket):
            try:
                await client.send_json(message.model_dump_json())
            except Exception:
                return True
        elif isinstance(client, GameAI):
            result = client.handle_message(message)
            if result is not None:
                async with self._action_lock:
                    self._action_bus.append((client_id, result))
        return False

    async def _update_client_state(self, client_id: str):
        session_state = self._session.get_session_state_response_for_client(client_id)
        await self._message_client_locked(client_id, session_state)
        game_position = self._session.get_client_position(client_id)
        game_state = self._game.get_game_state_response(game_position)
        await self._message_client_locked(client_id, game_state)

    async def _broadcast_session_state(self):
        to_disconnect: list[str] = []
        async with self._player_lock:
            for client_id in self._player_to_id.values():
                message = self._session.get_session_state_response_for_client(client_id)
                if await self._message_client(client_id, message):
                    to_disconnect.append(client_id)
        for client_id in to_disconnect:
            await self._disconnect(client_id)

    async def _broadcast_game_state(self):
        to_disconnect: list[str] = []
        async with self._player_lock:
            for client_id in self._id_to_player:
                game_position = self._session.get_client_position(client_id)
                message = self._game.get_game_state_response(game_position)
                if await self._message_client(client_id, message):
                    to_disconnect.append(client_id)
        for client_id in to_disconnect:
            await self._disconnect(client_id)

    async def _broadcast_ai_state(self):
        to_disconnect: list[str] = []
        ai_players = self._ai_manager.get_ai_players()
        message = models.AIStateResponse(parameters=models.AIStateResponseParameters(ai_players=ai_players))
        async with self._player_lock:
            for client_id in self._id_to_player:
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
        asyncio.create_task(self._action_message(client_id, parsed_message))

    async def _action_message(self, client_id: str, parsed_message: models.WebSocketRequest):
        match parsed_message.request_type:
            case models.WebSocketRequestType.SESSION:
                response = self._session.handle_function_call(
                    client_id=client_id,
                    function_name=parsed_message.function_name,
                    function_parameters=parsed_message.parameters,
                )
                if response:
                    await self._message_client_locked(client_id, response)
                else:
                    await self._broadcast_session_state()
            case models.WebSocketRequestType.GAME:
                if parsed_message.function_name == "get_game_state":
                    response = None
                else:
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
            case models.WebSocketRequestType.AI:
                response = await self._ai_manager.handle_function_call(
                    requester_client_id=client_id,
                    function_name=parsed_message.function_name,
                    function_parameters=parsed_message.parameters,
                )
                if response:
                    await self._message_client_locked(client_id, response)
                else:
                    await self._broadcast_ai_state()

        async with self._action_lock:
            while len(self._action_bus) != 0:
                action_client_id, action_message = self._action_bus.pop(0)
                asyncio.create_task(self._action_message(action_client_id, action_message))
