import asyncio
import time

from fastapi import WebSocket

from render_backend import game_base, models
from render_backend.app_logger import logger


class GameManager:
    def __init__(self, game_id: str, game: game_base.GameBase):
        self._game_id = game_id
        self._clients: list[WebSocket] = []
        self._lock = asyncio.Lock()
        self._game = game
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
            message = models.SimpleResponse(
                parameters=models.SimpleResponseParameters(
                    message=f"Client {client.client} connected."
                )
            )
        )
        try:
            while not self._is_closed:
                message_text = await client.receive_text()
                logger.info(f"Client {client.client} messaged with {message_text} ({type(message_text)}).")
                await self._handle_message(client, message_text)
        except Exception as e:
            logger.exception(f"Error while handling message from client {client.client}: {e}")
            logger.info(f"Client {client.client} closed connection.")

        await self._disconnect(client)

    async def _connect(self, client: WebSocket):
        await client.accept()
        logger.info(f"Client {client} joined game {self._game_id}.")
        async with self._lock:
            self._clients.append(client)

    async def _disconnect(self, client: WebSocket):
        async with self._lock:
            if client in self._clients:
                try:
                    await client.close()
                except Exception:
                    pass
                logger.info(f"Client {client} left game {self._game_id}")
                self._clients.remove(client)

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


    async def _handle_message(self, client: WebSocket, message: str):
        time.sleep(1)
        await client.send_text(f"ping {self._game_id}")

class BookManager:
    def __init__(self):
        self._live_games: dict[str, GameManager] = {}

    def add_game(self, game_id: str, game_manager: GameManager):
        if game_id in self._live_games:
            raise ValueError(f"Game ID to be added {game_id} already exists.")
        self._live_games[game_id] = game_manager
        logger.info(f"Created game {game_id}.")

    async def remove_game(self, game_id: str):
        if game_id in self._live_games:
            raise ValueError(f"Game ID to be added {game_id} already exists.")
        await self._live_games[game_id].close_game()
        _ = self._live_games.pop(game_id)
        logger.info(f"Closed game {game_id}.")

    def get_game(self, game_id: str) -> GameManager:
        if game_id not in self._live_games:
            raise ValueError(f"Game ID {game_id} does not exist.")
        return self._live_games[game_id]

    def get_all_game_ids(self) -> set[str]:
        return set(self._live_games)

