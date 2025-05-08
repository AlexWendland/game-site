from typing import Any, override

import pydantic

from render_backend import game_base, models
from render_backend.app_logger import logger
from render_backend.games.utils import check_tic_tac_toe_winner


class UltimateGameStateParameters(models.GameStateResponseParameters):
    moves: list[int | None]
    sector_to_play: list[int | None]
    sectors_owned: list[int | None]
    winner: int | None
    winning_line: list[int] = pydantic.Field(default_factory=list)


class UltimateGameStateResponse(models.GameStateResponse):
    message_type: models.ResponseType = pydantic.Field(
        default=models.ResponseType.GAME_STATE, init=False
    )
    parameters: UltimateGameStateParameters


class MakeMoveParameters(pydantic.BaseModel):
    position: int


class UltimateGame(game_base.GameBase):
    def __init__(self) -> None:
        self._moves: list[int | None] = [None] * 81
        self._current_board: list[int | None] = [None] * 81
        self._sector_to_play: list[int | None] = [None] * 81
        self._sectors_owned: list[int | None] = [None] * 9
        self._current_sectors: list[int | None] = [None] * 9
        self._move_number = 0
        self._winner = None
        self._winning_line: list[int] = []

    @override
    def handle_function_call(
        self, player_position: int, function_name: str, function_parameters: dict[str, Any]
    ) -> models.ErrorResponse | None:
        """
        Get the model to pass the game parameters.
        """
        if function_name != "make_move":
            logger.info(f"Player {player_position} requested unknow function {function_name}.")
            return models.ErrorResponse(
                parameters=models.ErrorResponseParameters(
                    error_message=f"Function {function_name} not supported."
                )
            )
        try:
            parsed_move_parameters = MakeMoveParameters(**function_parameters)
        except pydantic.ValidationError as e:
            logger.info(f"Player {player_position} provided invalid parameters: {e}")
            return models.ErrorResponse(
                parameters=models.ErrorResponseParameters(error_message=f"Invalid parameters: {e}")
            )
        move = parsed_move_parameters.position
        return self._make_move(player_position, move)

    def _make_move(self, player_position: int, move: int) -> models.ErrorResponse | None:
        """
        Make a move for the player.
        """
        logger.info(f"Player {player_position} wants to move to {move}")
        if self._move_number % 2 != player_position:
            logger.info(f"Player {player_position} is not the current player.")
            return models.ErrorResponse(
                parameters=models.ErrorResponseParameters(
                    error_message=f"Player {player_position} is not the current player."
                )
            )
        if self._moves[move] is not None:
            logger.info(f"Move {move} is already taken.")
            return models.ErrorResponse(
                parameters=models.ErrorResponseParameters(
                    error_message=f"Move {move} is already taken."
                )
            )
        if (
            self._sector_to_play[self._move_number] is not None
            and self._sector_to_play[self._move_number] != move // 9
        ):
            logger.info(
                f"Move {move} is not in sector {self._sector_to_play[self._move_number]} - the current sector to play in."
            )
            return models.ErrorResponse(
                parameters=models.ErrorResponseParameters(
                    error_message=f"Move {move} is not in sector {self._sector_to_play[self._move_number]} - the current sector to play in."
                )
            )
        if self._current_sectors[move // 9] is not None:
            logger.info(f"Move {move} is in a sector that was already won.")
            return models.ErrorResponse(
                parameters=models.ErrorResponseParameters(
                    error_message=f"Move {move} is in a sector that was already won."
                )
            )
        logger.info(f"Player {player_position} moves to {move}")
        self._moves[move] = self._move_number
        self._current_board[move] = self._move_number % 2
        self._check_sector_winner(move)
        self._check_winner()
        self._move_number += 1
        sector_to_play = move % 9
        self._sector_to_play[self._move_number] = (
            sector_to_play if self._current_sectors[sector_to_play] is None else None
        )
        return None

    def _check_sector_winner(self, move: int) -> None:
        sector = move // 9
        sector_board = self._current_board[sector * 9 : (sector + 1) * 9]
        if check_tic_tac_toe_winner(sector_board):
            self._sectors_owned[sector] = move
            self._current_sectors[sector] = move % 2

    def _check_winner(self) -> None:
        self._winning_line = check_tic_tac_toe_winner(self._current_sectors)
        if self._winning_line:
            self._winner = self._current_sectors[self._winning_line[0]]

    @override
    def get_game_state_response(self, position: int | None) -> UltimateGameStateResponse:
        """
        Get the model to pass the game parameters.
        """
        return UltimateGameStateResponse(
            parameters=UltimateGameStateParameters(
                moves=self._moves,
                sector_to_play=self._sector_to_play,
                sectors_owned=self._sectors_owned,
                winner=self._winner,
                winning_line=self._winning_line,
            )
        )

    @override
    def get_max_players(self) -> int:
        """
        Get the maximum number of players.
        """
        return 2

    @override
    def get_metadata(self) -> models.GameMetadata:
        return models.GameMetadata(
            game_type=models.GameType.ULTIMATE,
            max_players=2,
            parameters=models.GameParameters(),
        )
