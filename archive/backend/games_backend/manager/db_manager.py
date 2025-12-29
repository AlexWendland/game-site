import abc
from typing import override

from games_backend.app_logger import logger
from games_backend.game_base import GameBase


class DBManager(abc.ABC):
    @abc.abstractmethod
    async def save_game(self, game_id: str, game: GameBase) -> None: ...

    @abc.abstractmethod
    async def get_game(self, game_id: str) -> GameBase: ...

    @abc.abstractmethod
    async def delete_game(self, game_id: str) -> None: ...

    @abc.abstractmethod
    async def get_all_game_ids(self) -> set[str]: ...


class InMemoryDBManager(DBManager):
    def __init__(self):
        self._games: dict[str, GameBase] = {}

    @override
    async def save_game(self, game_id: str, game: GameBase) -> None:
        logger.info(f"Saving game {game_id} to in memory DB.")
        self._games[game_id] = game

    @override
    async def get_game(self, game_id: str) -> GameBase:
        logger.info(f"Retrieving {game_id} from in memory DB.")
        # This will raise key error if it does not exist.
        return self._games[game_id]

    @override
    async def delete_game(self, game_id: str) -> None:
        logger.info(f"Deleting {game_id} from in memory DB.")
        if game_id not in self._games:
            return
        _ = self._games.pop(game_id)

    @override
    async def get_all_game_ids(self) -> set[str]:
        return set(self._games.keys())


# TODO: Make redis db manager
