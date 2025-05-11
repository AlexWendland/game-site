from games_backend import models
from games_backend.app_logger import logger
from games_backend.manager.game_manager import GameManager
from games_backend.utils import non_matching_game_name


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
