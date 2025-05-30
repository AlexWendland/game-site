import random
from abc import ABC, abstractmethod
from typing import Any, override

import pydantic

from games_backend import game_base, models
from games_backend.ai_base import GameAI
from games_backend.app_logger import logger
from games_backend.games.utils import check_tic_tac_toe_winner


class TicTacToeGameStateParameters(models.GameStateResponseParameters):
    history: list[list[int | None]]
    winner: int | None
    winning_line: list[int] = pydantic.Field(default_factory=list)


class TicTacToeGameStateResponse(models.GameStateResponse):
    message_type: models.ResponseType = pydantic.Field(default=models.ResponseType.GAME_STATE, init=False)
    parameters: TicTacToeGameStateParameters


class MakeMoveParameters(pydantic.BaseModel):
    position: int


class TicTacToeGame(game_base.GameBase):
    def __init__(self) -> None:
        self._history: list[list[int | None]] = [[None] * 9]
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
        logger.info(f"Player {player_position} wants to move to {move}")
        if self._move_number % 2 != player_position:
            logger.info(f"Player {player_position} is not the current player.")
            return models.ErrorResponse(
                parameters=models.ErrorResponseParameters(
                    error_message=f"Player {player_position} is not the current player."
                )
            )
        if self._history[-1][move] is not None:
            logger.info(f"Move {move} is already taken.")
            return models.ErrorResponse(
                parameters=models.ErrorResponseParameters(error_message=f"Move {move} is already taken.")
            )
        if self._winner is not None:
            logger.info(f"Game already has a winner: {self._winner}.")
            return models.ErrorResponse(
                parameters=models.ErrorResponseParameters(error_message=f"Game already has a winner: {self._winner}.")
            )
        logger.info(f"Player {player_position} moves to {move}")
        new_board = self._history[-1].copy()
        new_board[move] = player_position
        self._history.append(new_board)
        self._move_number += 1
        self._check_winner()
        return None

    def _check_winner(self) -> None:
        """
        Check if there is a winner.
        """
        self._winning_line = check_tic_tac_toe_winner(self._history[-1])
        if self._winning_line:
            self._winner = self._history[-1][self._winning_line[0]]
            logger.info(f"Player {self._winner} won.")
            return

    @override
    def get_game_state_response(self, position: int | None) -> TicTacToeGameStateResponse:
        """
        Get the model to pass the game parameters.
        """
        return TicTacToeGameStateResponse(
            parameters=TicTacToeGameStateParameters(
                history=self._history, winner=self._winner, winning_line=self._winning_line
            )
        )

    @override
    def get_max_players(self) -> int:
        """
        Get the maximum number of players.
        """
        return 2

    @override
    def get_game_ai(self) -> dict[str, type[GameAI]]:
        return {
            TicTacToeRandomAI.get_ai_type(): TicTacToeRandomAI,
            TicTacToeBlockAI.get_ai_type(): TicTacToeBlockAI,
        }

    @override
    def get_metadata(self) -> models.GameMetadata:
        return models.GameMetadata(
            game_type=models.GameType.TICTACTOE,
            max_players=2,
            parameters=models.GameParameters(),
        )


class TicTacToeAI(GameAI, ABC):
    def __init__(self, position: int, name: str):
        self._board: list[None | int] = [None] * 9
        super().__init__(position, name)

    @property
    def move_number(self) -> int:
        return sum(state is not None for state in self._board)

    @property
    def current_player(self) -> int:
        return self.move_number % 2

    @property
    def game_over(self) -> bool:
        return self.move_number >= 9 or len(check_tic_tac_toe_winner(self._board)) != 0

    @override
    def update_game_state(self, game_state: TicTacToeGameStateResponse) -> None | models.WebSocketRequest:
        self._board = game_state.parameters.history[-1]
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
        return [i for i, state in enumerate(self._board) if state is None]

    @property
    def opponents_winning_moves(self) -> list[int]:
        winning_moves = []
        for move in self.available_moves:
            board = self._board.copy()
            board[move] = (self.current_player + 1) % 2
            if check_tic_tac_toe_winner(board):
                winning_moves.append(move)
        return winning_moves

    @property
    def winning_moves(self) -> list[int]:
        winning_moves = []
        for move in self.available_moves:
            board = self._board.copy()
            board[move] = self.current_player
            if check_tic_tac_toe_winner(board):
                winning_moves.append(move)
        return winning_moves


class TicTacToeRandomAI(TicTacToeAI):
    @override
    def make_move(self) -> int:
        return random.choice(self.available_moves)

    @override
    @classmethod
    def get_ai_type(cls) -> str:
        return "random"


class TicTacToeBlockAI(TicTacToeAI):
    @override
    def make_move(self) -> int:
        if self.opponents_winning_moves:
            return random.choice(self.opponents_winning_moves)
        if self.winning_moves:
            return random.choice(self.winning_moves)
        return random.choice(self.available_moves)

    @override
    @classmethod
    def get_ai_type(cls) -> str:
        return "blocker"
