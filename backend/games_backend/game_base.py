import abc
from typing import Any

from games_backend import models
from games_backend.ai_base import GameAI


class GameBase(abc.ABC):
    """
    Abstract base class for game implementations.
    """

    @abc.abstractmethod
    def handle_function_call(
        self, player_position: int, function_name: str, function_parameters: dict[str, Any]
    ) -> models.ErrorResponse | None:
        """
        Get the model to pass the game parameters.
        """

    @abc.abstractmethod
    def get_game_state_response(self, position: int | None) -> models.GameStateResponse:
        """
        Get the game state as seen by the provided position.
        """

    @abc.abstractmethod
    def get_max_players(self) -> int:
        """
        Get the maximum number of players for this game.
        """

    @abc.abstractmethod
    def get_game_ai(cls) -> dict[str, type[GameAI]]:
        """
        Mapping from model names to their classes.
        """

    def get_game_ai_named(self) -> dict[str, str]:
        """
        Mapping from model keys to their user friendly names.
        """
        ai_models = self.get_game_ai()
        return {model.get_ai_type(): model.get_ai_user_name() for model in ai_models.values()}

    @abc.abstractmethod
    def get_metadata(self) -> models.GameMetadata:
        """
        Get the maximum number of players for this game.
        """
