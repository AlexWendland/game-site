import abc
from typing import override

from games_backend.manager.game_manager import GameManager


class DBManager(abc.ABC):
    @abc.abstractmethod
    async def save_game(self, game_id: str, game_manager: GameManager) -> None: ...

    @abc.abstractmethod
    async def get_game(self, game_id: str) -> GameManager: ...


class ImMemoryDBManager(DBManager):
    def __init__(self):
        self._games = {}

    @override
    async def save_game(self, game_id: str, game_manager: GameManager) -> None:
        self._games = {game_id: game_manager}

    @override
    async def get_game(self, game_id: str) -> GameManager:
        # This will raise key error if it does not exist.
        return self._games[game_id]


class RedisDBManager(DBManager):
    """
    To be made!
    """

    def __init__(self):
        self._games = {}

    @override
    async def save_game(self, game_id: str, game_manager: GameManager) -> None:
        self._games = {game_id: game_manager}

    @override
    async def get_game(self, game_id: str) -> GameManager:
        # This will raise key error if it does not exist.
        return self._games[game_id]
