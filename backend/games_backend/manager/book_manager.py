from games_backend import models
from games_backend.app_logger import logger
from games_backend.manager.db_manager import DBManager
from games_backend.manager.game_manager import GameManager
from games_backend.utils import non_matching_game_name


class BookManager:
    """
    Manages the games, it does this by keeping in memory active games and off loading into a database ones that
    are no longer active.
    """

    def __init__(self, db_manager: DBManager):
        self._game_cache: dict[str, GameManager] = {}
        self._db_manager = db_manager
        self._closed = False

    def add_game(self, game_id: str, game_manager: GameManager):
        if game_id in self._game_cache:
            raise KeyError(f"Game ID to be added {game_id} already exists.")
        self._game_cache[game_id] = game_manager
        logger.info(f"Created game {game_id}.")

    async def remove_game(self, game_id: str):
        if game_id in self._game_cache:
            manager = self._game_cache.pop(game_id)
            await manager.close_game()
            logger.info(f"Closed game {game_id}.")
        await self._db_manager.delete_game(game_id)

    async def get_game(self, game_id: str) -> GameManager:
        if game_id in self._game_cache:
            return self._game_cache[game_id]
        game = await self._db_manager.get_game(game_id)
        self._game_cache[game_id] = GameManager.from_game_and_id(game_id, game)
        await self._db_manager.delete_game(game_id)
        return self._game_cache[game_id]

    async def get_all_game_ids(self) -> set[str]:
        return set(self._game_cache.keys()) | await self._db_manager.get_all_game_ids()

    async def get_free_game_id(self) -> str:
        return non_matching_game_name(await self.get_all_game_ids())

    async def get_game_metadata(self, game_id: str) -> models.GameMetadataUnion:
        game = await self.get_game(game_id)
        return game.get_metadata()

    async def get_game_models(self, game_id: str) -> dict[str, str]:
        game = await self.get_game(game_id)
        return game.get_game_models()

    async def audit_games(self):
        logger.info("Auditing games.")
        inactive_games = [
            (game_id, game_manager) for game_id, game_manager in self._game_cache.items() if not game_manager.is_active
        ]
        logger.info(f"Found {len(inactive_games)} to save to the db.")
        for game_id, game_manager in inactive_games:
            await self._db_manager.save_game(game_id, game_manager.get_game())
            del self._game_cache[game_id]

    async def graceful_close(self):
        for game_id, game_manager in self._game_cache.items():
            await self._db_manager.save_game(game_id, game_manager.get_game())
        # Save the games before trying to disconnect the client to maximise the chance we have saved all the
        # data.
        for game_manager in self._game_cache.values():
            await game_manager.close_game()
        self._closed = True

    @property
    def is_closed(self) -> bool:
        return self._closed
