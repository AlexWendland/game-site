import random
from abc import ABC, abstractmethod
from typing import Any, override

import pydantic

from games_backend import game_base, models
from games_backend.ai_base import GameAI
from games_backend.app_logger import logger
from games_backend.games.utils import check_tic_tac_toe_winner


class UltimateGameStateParameters(models.GameStateResponseParameters):
    moves: list[int | None]
    sector_to_play: list[int | None]
    sectors_owned: list[int | None]
    winner: int | None
    winning_line: list[int]


class UltimateGameStateResponse(models.GameStateResponse):
    message_type: models.ResponseType = pydantic.Field(default=models.ResponseType.GAME_STATE, init=False)
    parameters: UltimateGameStateParameters


class MakeMoveParameters(pydantic.BaseModel):
    position: int


class UltimateGame(game_base.GameBase):
    def __init__(self) -> None:
        self._moves: list[int | None] = [None] * 81
        self._current_board: list[int | None] = [None] * 81
        self._sector_to_play: list[int | None] = [None]
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
            logger.info(f"Player {player_position} requested unknown function {function_name}.")
            return models.ErrorResponse(
                parameters=models.ErrorResponseParameters(error_message=f"Function {function_name} not supported.")
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
        logger.info(f"Player {player_position} wants to move to position {move}")
        if self._move_number % 2 != player_position:
            logger.info(f"Player {player_position} is not the current player.")
            return models.ErrorResponse(
                parameters=models.ErrorResponseParameters(
                    error_message=f"Player {player_position} is not the current player."
                )
            )
        if self._current_board[move] is not None:
            logger.info(f"Position {move} is already taken.")
            return models.ErrorResponse(
                parameters=models.ErrorResponseParameters(error_message=f"Position {move} is already taken.")
            )
        if self._sector_to_play[-1] is not None and self._sector_to_play[-1] != move // 9:
            logger.info(f"Position {move} is not in sector {self._sector_to_play[-1]} - the current sector to play in.")
            return models.ErrorResponse(
                parameters=models.ErrorResponseParameters(
                    error_message=(
                        f"Move {move} is not in sector {self._sector_to_play[-1]} - the current sector to" + " play in."
                    )
                )
            )
        if self._current_sectors[move // 9] is not None:
            logger.info(f"Position {move} is in a sector that was already won.")
            return models.ErrorResponse(
                parameters=models.ErrorResponseParameters(
                    error_message=f"Position {move} is in a sector that was already won."
                )
            )
        logger.info(f"Player {player_position} moves to position {move}")
        self._moves[move] = self._move_number
        self._current_board[move] = self._move_number % 2
        self._check_sector_winner(move)
        self._check_winner()
        self._move_number += 1
        sector_to_play = move % 9
        self._sector_to_play.append(sector_to_play if self._current_sectors[sector_to_play] is None else None)
        return None

    def _check_sector_winner(self, move: int) -> None:
        sector = move // 9
        sector_board = self._current_board[sector * 9 : (sector + 1) * 9]
        if check_tic_tac_toe_winner(sector_board):
            self._sectors_owned[sector] = self._move_number
            self._current_sectors[sector] = self._move_number % 2

    def _check_winner(self) -> None:
        self._winning_line = check_tic_tac_toe_winner(self._current_sectors)
        if self._winning_line:
            self._winner = self._move_number % 2

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
    def get_game_ai(self) -> dict[str, type[game_base.GameAI]]:
        """
        Mapping from model names to their classes.
        """
        return {
            UltimateRandomAI.get_ai_type(): UltimateRandomAI,
            UltimateTacticianAI.get_ai_type(): UltimateTacticianAI,
        }

    @override
    def get_metadata(self) -> models.GameMetadata:
        return models.GameMetadata(
            game_type=models.GameType.ULTIMATE,
            max_players=2,
            parameters=models.GameParameters(),
        )


class UltimateAI(GameAI, ABC):
    def __init__(self, position: int, name: str):
        self._moves: list[None | int] = [None] * 81
        self._sector_to_play: int | None = None
        self._sectors_owned: list[None | int] = [None] * 9
        self._winner: int | None = None
        super().__init__(position, name)

    @property
    def move_number(self) -> int:
        return sum(state is not None for state in self._moves)

    @property
    def current_player(self) -> int:
        return self.move_number % 2

    @property
    def game_over(self) -> bool:
        return self._winner is not None

    @property
    def opponent(self) -> int:
        return (self.current_player + 1) % 2

    @property
    def board(self) -> list[None | int]:
        return [move % 2 if move is not None else None for move in self._moves]

    @override
    def update_game_state(self, game_state: UltimateGameStateResponse) -> None | models.WebSocketRequest:
        self._moves: list[None | int] = game_state.parameters.moves
        self._sector_to_play: int | None = game_state.parameters.sector_to_play[-1]
        self._sectors_owned: list[None | int] = game_state.parameters.sectors_owned
        self._winner: int | None = game_state.parameters.winner
        if self._position == self.current_player:
            if self.game_over:
                return None
            move = self.make_move()
            return models.WebSocketRequest(
                request_type=models.WebSocketRequestType.GAME,
                function_name="make_move",
                parameters={"position": move},
            )

    @abstractmethod
    def make_move(self) -> int: ...

    @property
    def available_moves(self) -> list[int]:
        if self._sector_to_play is not None:
            start = self._sector_to_play * 9
            end = start + 9
            return [i for i in range(start, end) if self._moves[i] is None]
        return [i for i, state in enumerate(self._moves) if state is None]

    def get_winning_moves_in_sector(self, sector: int, player: int) -> list[int]:
        start = sector * 9
        end = start + 9
        board = [move % 2 if move is not None else None for move in self._moves[start:end]]
        available_moves = [i for i, move in enumerate(board) if move is None]
        winning_moves: list[int] = []
        for move in available_moves:
            board_copy = board.copy()
            board_copy[move] = player
            if check_tic_tac_toe_winner(board_copy):
                winning_moves.append(move + start)
        return winning_moves

    def get_winning_sectors(self, player: int) -> list[int]:
        winning_sectors: list[int] = []
        available_sectors = [i for i, sector in enumerate(self._sectors_owned) if sector is None]
        for sector in available_sectors:
            sector_copy = self._sectors_owned.copy()
            sector_copy[sector] = player
            if check_tic_tac_toe_winner(sector_copy):
                winning_sectors.append(sector)
        return winning_sectors


class UltimateRandomAI(UltimateAI):
    """
    Completely random AI.
    """

    @override
    @classmethod
    def get_ai_type(cls) -> str:
        return "random"

    def make_move(self) -> int:
        available_moves = self.available_moves
        if not available_moves:
            raise ValueError("No available moves left.")
        return random.choice(available_moves)


class UltimateTacticianAI(UltimateAI):
    """
    Tactician AI that tries to win or block the opponent.
    """

    @override
    @classmethod
    def get_ai_type(cls) -> str:
        return "tactician"

    def make_move(self) -> int:
        available_moves = self.available_moves
        if not available_moves:
            raise ValueError("No available moves left.")

        if self._sector_to_play is not None:
            winning_moves = self.get_winning_moves_in_sector(self._sector_to_play, self.current_player)
            if winning_moves:
                return random.choice(winning_moves)

            opponent_winning_moves = self.get_winning_moves_in_sector(self._sector_to_play, self.opponent)
            if opponent_winning_moves:
                return random.choice(opponent_winning_moves)

            return random.choice(available_moves)

        winning_sectors = self.get_winning_sectors(self.current_player)

        winning_moves: list[int] = []

        for sector in winning_sectors:
            winning_moves += self.get_winning_moves_in_sector(sector, self.current_player)

        if winning_moves:
            return random.choice(winning_moves)

        opponent_winning_sectors = self.get_winning_sectors(self.opponent)

        opponent_winning_moves: list[int] = []

        for sector in opponent_winning_sectors:
            opponent_winning_moves += self.get_winning_moves_in_sector(sector, self.opponent)

        if opponent_winning_moves:
            return random.choice(opponent_winning_moves)

        return random.choice(available_moves)
