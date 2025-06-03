from enum import Enum

from pydantic import BaseModel


class GravitySetting(Enum):
    NONE = 1
    BOTTOM = 2
    EDGE = 3


class Topology(Enum):
    NO_GEOMETRY = 1
    TORUS = 2
    BAND = 3


# TODO: Make this less hard coded
class Player(Enum):
    NO_PLAYER = 0
    ONE = 1
    TWO = 2
    THREE = 3
    FOUR = 4
    FIVE = 5
    SIZE = 6
    SEVEN = 7
    EIGHT = 8

    @classmethod
    def from_value(cls, value: int):
        # TODO: Make this less hacky.
        for player in cls:
            if player.value == value:
                return player
        raise KeyError(f"Player {value} not available")


class GameState(BaseModel):
    # TODO: Add validation for board size
    board_size: int = 8
    topology: Topology
    gravity: GravitySetting
