import abc
from typing import Any

from render_backend import models


class Game(abc.ABC):
    """
    Abstract base class for game implementations.
    """

    @abc.abstractmethod
    def call_function(
        self, function_name: str, function_parameters: dict[str, Any]
    ) -> models.ErrorResponse | None:
        """
        Get the model to pass the game parameters.
        """
        pass
