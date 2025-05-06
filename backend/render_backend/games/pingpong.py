from typing import Any, override

from render_backend import game_base, models


class PingPongGame(game_base.GameBase):
    @override
    def handle_function_call(
        self, player_position: int, function_name: str, function_parameters: dict[str, Any]
    ) -> models.ErrorResponse | None:
        """
        Get the model to pass the game parameters.
        """
        return None

    @override
    def get_game_state_response(self, position: int | None) -> models.GameStateResponse:
        """
        Get the model to pass the game parameters.
        """
        return models.GameStateResponse(parameters=models.GameStateResponseParameters())

    @override
    def get_max_players(self) -> int:
        """
        Get the maximum number of players.
        """
        return 2
