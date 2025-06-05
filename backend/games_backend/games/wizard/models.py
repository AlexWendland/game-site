import enum

import pydantic

from games_backend import models


class RoundPhase(enum.Enum):
    BIDDING = "bidding"
    TRICK = "trick"
    ROUND_OVER = "round_over"


class RoundResult(pydantic.BaseModel):
    bid: int
    tricks_won: int
    score: int


class TrickRecord(pydantic.BaseModel):
    cards_played: dict[int, int]
    leading_player: int
    leading_suit: int
    winner: int


class RoundRecord(pydantic.BaseModel):
    bids: dict[int, int]
    tricks_won: dict[int, int]


class WizardGameStateParameters(models.GameStateResponseParameters):
    # Global state
    score_sheet: dict[int, dict[int, RoundResult]]
    winners: list[int]
    scores: dict[int, int]
    round_number: int

    # Round state
    round_state: RoundPhase
    visible_cards: dict[int, list[int]]
    round_bids: dict[int, int]
    trick_count: dict[int, int]
    trick_records: dict[int, TrickRecord]
    trump_card: int
    trump_suit: int
    trump_to_be_set: bool

    # Trick state
    playable_cards: list[int]
    valid_bids: list[int]
    current_player: int
    current_trick: dict[int, int | None]
    max_round_number: int


class WizardGameStateResponse(models.GameStateResponse):
    message_type: models.ResponseType = pydantic.Field(default=models.ResponseType.GAME_STATE, init=False)
    parameters: WizardGameStateParameters
