import enum
from typing import Any, final

import pydantic

from games_backend import models


@final
class QuantumGameState(enum.Enum):
    TARGET_PLAYER = "target_player"
    RESPONSE = "response"
    CLAIM_WIN = "claim_win"
    FINISHED = "finished"


class QuantumActionOutcome(enum.Enum):
    SUCCESS = "success"
    WON = "won"
    CONTRADICTION_CONTINUE = "contradiction_continue"
    CONTRADICTION_REVERTED = "contradiction_reverted"


class QuantumLogEntry(pydantic.BaseModel):
    player: int
    function_call: str
    parameters: dict[str, Any]
    outcome: QuantumActionOutcome
    move_number: int


class QuantumHandState(pydantic.BaseModel):
    total_cards: int
    suits: dict[int, int]
    does_not_have_suit: set[int]


class QuantumGameStateParameters(models.GameStateResponseParameters):
    # State from game
    game_log: list[QuantumLogEntry]
    hint_levels: dict[int, models.QuantumHintLevel]
    suit_names: dict[int, str | None]
    contradiction_count: dict[int, int]

    # State from logic
    history: list[dict[int, QuantumHandState]]
    winner: int | None
    game_state: QuantumGameState
    current_player: int
    move_number: int
    current_target_player: int | None
    current_target_suit: int | None
    current_hands: dict[int, QuantumHandState]
    available_moves: list[bool | int]
    players_are_out: list[int]


class QuantumGameStateResponse(models.GameStateResponse):
    message_type: models.ResponseType = pydantic.Field(default=models.ResponseType.GAME_STATE, init=False)
    parameters: QuantumGameStateParameters
