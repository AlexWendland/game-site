from abc import ABC, abstractmethod
from typing import override

from games_backend.models import GameStateResponse, Response, ResponseType, SessionStateResponse, WebSocketRequest


class GameAI(ABC):
    def __init__(self, position: int, name: str):
        self._position: int | None = position
        self._name: str = name

    @property
    def name(self) -> str:
        return self._name

    def handle_message(self, message: Response) -> None | WebSocketRequest:
        if message.message_type == ResponseType.SESSION_STATE:
            return self.update_session_state(message)
        elif message.message_type == ResponseType.GAME_STATE:
            return self.update_game_state(message)

    def update_session_state(self, session_message: SessionStateResponse):
        self._position = session_message.parameters.user_position

    @classmethod
    @abstractmethod
    def get_ai_type(cls) -> str: ...

    @classmethod
    @abstractmethod
    def get_ai_user_name(cls) -> str: ...

    @property
    def position(self) -> int | None:
        return self._position

    @abstractmethod
    def update_game_state(self, game_state: GameStateResponse) -> None | WebSocketRequest: ...

    @override
    def __eq__(self, other: object) -> bool:
        if not isinstance(other, type(self)):
            return False
        return self.position == other.position and type(self).get_ai_type() == type(other).get_ai_type()

    @override
    def __hash__(self) -> int:
        return hash((self.position, type(self).get_ai_type()))

    @override
    def __repr__(self) -> str:
        return f"{type(self).__name__}(position={self.position})"
