from typing import Any, override

from render_backend import game_base, models


class PingPongGame(game_base.GameBase):
    @override
    def call_function(
        self, function_name: str, function_parameters: dict[str, Any]
    ) -> models.ErrorResponse | None:
        """
        Get the model to pass the game parameters.
        """
        return None
