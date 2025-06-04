import random
from abc import ABC, abstractmethod
from typing import Any, Self, override

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


class UltimateGameLogic:
    def __init__(self) -> None:
        self._moves: list[int | None] = [None] * 81
        self._sector_to_play: list[int | None] = [None]
        self._winning_sector_move: list[int | None] = [None] * 9
        self._move_number: int = 0
        self._winner: int | None = None
        self._winning_line: list[int] = []

    @property
    def moves(self) -> list[int | None]:
        return self._moves

    @property
    def sector_to_play(self) -> list[int | None]:
        return self._sector_to_play

    @property
    def winning_sector_move(self) -> list[int | None]:
        return self._winning_sector_move

    @property
    def winner(self) -> int | None:
        return self._winner

    @property
    def winning_line(self) -> list[int]:
        return self._winning_line

    @property
    def is_over(self) -> bool:
        return self._winner is not None or len(self.get_available_moves()) == 0

    @classmethod
    def create_from_moves(cls, moves: list[int | None]) -> Self:
        if len(moves) != 81:
            raise ValueError("Moves must be a list of 81 elements.")
        instance = cls()
        for i in range(max([val for val in moves + [-1] if val is not None]) + 1):
            instance.make_move(i % 2, moves.index(i))
        return instance

    def make_move(self, player_position: int, move: int) -> None:
        logger.info(f"Player {player_position} wants to move to position {move}")
        if self._move_number % 2 != player_position:
            logger.info(f"Player {player_position} is not the current player.")
            raise ValueError(f"Player {player_position} is not the current player.")
        if self._moves[move] is not None:
            logger.info(f"Position {move} is already taken.")
            raise ValueError(f"Position {move} is already taken.")
        if self._sector_to_play[-1] is not None and self._sector_to_play[-1] != move // 9:
            logger.info(f"Position {move} is not in sector {self._sector_to_play[-1]} - the current sector to play in.")
            raise ValueError(
                f"Position {move} is not in sector {self._sector_to_play[-1]} - the current sector to play in."
            )
        if self._winning_sector_move[move // 9] is not None:
            logger.info(f"Position {move} is in a sector that was already won.")
            raise ValueError(f"Position {move} is in a sector that was already won.")
        logger.info(f"Player {player_position} moves to position {move}")
        self._moves[move] = self._move_number
        self._check_sector_winner(move)
        self._update_winner()
        self._move_number += 1
        sector_to_play = move % 9
        self._sector_to_play.append(sector_to_play if self._is_sector_playable(sector_to_play) else None)
        return None

    def undo_last_move(self) -> None:
        self._move_number -= 1
        self._moves = [None if square is None or square >= self._move_number else square for square in self._moves]
        _ = self._sector_to_play.pop()
        self._winning_sector_move = [
            None if square is None or square >= self._move_number else square for square in self._winning_sector_move
        ]
        self._update_winner()

    @property
    def board_hash(self) -> str:
        return (
            "".join(str(square % 2) if square is not None else "-" for square in self._moves)
            + "|"
            + str(self._sector_to_play[-1])
        )

    def get_available_moves(self) -> list[int]:
        if self._sector_to_play[-1] is not None:
            start = self._sector_to_play[-1] * 9
            end = start + 9
            return [i for i in range(start, end) if self._moves[i] is None]
        return [i for i, square in enumerate(self._moves) if square is None and self._is_sector_playable(i // 9)]

    def print_board(self) -> None:
        print("+" + "-" * 23 + "+")
        for i in range(9):
            row = "|"
            for j in range(9):
                if j % 3 == 0 and j != 0:
                    row += " |"
                square_index = (i // 3) * 27 + (i % 3) * 3 + (j // 3) * 9 + (j % 3)
                if self._moves[square_index] is None:
                    row += " -"
                elif self._moves[square_index] % 2 == 0:
                    row += " X"
                else:
                    row += " O"
            row += " |"
            print(row)
            if i % 3 == 2:
                print("+" + "-" * 23 + "+")
        print("High-level board:", self._get_high_level_board())
        print("Current player:", self._move_number % 2)
        print("Winner:", self._winner)
        print("Winning line:", self._winning_line)
        print("Moves:", self._moves)
        print("Sector to play:", self._sector_to_play[-1])

    def _is_sector_playable(self, sector: int) -> bool:
        return self._winning_sector_move[sector] is None and any(
            square is None for square in self._get_sector_board(sector)
        )

    def _check_sector_winner(self, move: int) -> None:
        sector = move // 9
        if check_tic_tac_toe_winner(self._get_sector_board(sector)):
            self._winning_sector_move[sector] = self._move_number

    def _update_winner(self) -> None:
        self._winning_line = check_tic_tac_toe_winner(self._get_high_level_board())
        if self._winning_line:
            self._winner = self._move_number % 2
        else:
            self._winner = None
            self._winning_line = []

    def _get_sector_board(self, sector: int) -> list[int | None]:
        if sector < 0 or sector >= 9:
            raise ValueError(f"Invalid sector {sector}. Must be between 0 and 8.")
        start = sector * 9
        end = start + 9
        return [None if square is None else square % 2 for square in self._moves[start:end]]

    def _get_high_level_board(self) -> list[int | None]:
        return [None if square is None else square % 2 for square in self._winning_sector_move]


class UltimateGame(game_base.GameBase):
    def __init__(self) -> None:
        self._logic: UltimateGameLogic = UltimateGameLogic()

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
        try:
            self._logic.make_move(player_position, move)
        except ValueError as e:
            logger.info(f"Player {player_position} made an invalid move: {e}")
            return models.ErrorResponse(parameters=models.ErrorResponseParameters(error_message=f"Invalid move: {e}"))

    @override
    def get_game_state_response(self, position: int | None) -> UltimateGameStateResponse:
        """
        Get the model to pass the game parameters.
        """
        return UltimateGameStateResponse(
            parameters=UltimateGameStateParameters(
                moves=self._logic.moves,
                sector_to_play=self._logic.sector_to_play,
                sectors_owned=self._logic.winning_sector_move,
                winner=self._logic.winner,
                winning_line=self._logic.winning_line,
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
            # Currently not computationally tractable - need to be smarter!
            # UltimateMiniMaxAI.get_ai_type(): UltimateMiniMaxAI,
        }

    @override
    def get_metadata(self) -> models.UltimateGameMetadata:
        return models.UltimateGameMetadata(
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

    @override
    @classmethod
    def get_ai_user_name(cls) -> str:
        return "Easy"

    @override
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

    @override
    @classmethod
    def get_ai_user_name(cls) -> str:
        return "Medium"

    @override
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


class UltimateMiniMaxAI(UltimateAI):
    @override
    @classmethod
    def get_ai_type(cls) -> str:
        return "minimax"

    @override
    @classmethod
    def get_ai_user_name(cls) -> str:
        return "Hard"

    @override
    def make_move(self) -> int:
        game_logic = UltimateGameLogic.create_from_moves(self._moves)
        moves = get_minimax_moves(game_logic, self.current_player)
        return random.choice(moves)


MINIMAX_SCORE_CACHE: dict[str, int] = {}


def get_minimax_moves(game_logic: UltimateGameLogic, player_to_play: int) -> list[int]:
    if game_logic.is_over:
        return []

    best_score = -2
    best_moves = []

    for move in game_logic.get_available_moves():
        game_logic.make_move(player_to_play, move)
        score = (-1 if player_to_play == 1 else 1) * get_minimax_score(game_logic, (player_to_play + 1) % 2)
        if score > best_score:
            best_score = score
            best_moves = [move]
        elif score == best_score:
            best_moves.append(move)
        game_logic.undo_last_move()

    return best_moves


def get_minimax_score(game_logic: UltimateGameLogic, player_to_play: int) -> int:
    if game_logic.board_hash in MINIMAX_SCORE_CACHE:
        return MINIMAX_SCORE_CACHE[game_logic.board_hash]

    if game_logic.is_over:
        if game_logic.winner is None:
            MINIMAX_SCORE_CACHE[game_logic.board_hash] = 0
            return 0
        score = 1 if game_logic.winner == 0 else -1
        MINIMAX_SCORE_CACHE[game_logic.board_hash] = score
        return score

    best_score = -2 if player_to_play == 0 else 2  # Scores are only between -1 and 1
    comparison = max if player_to_play == 0 else min

    for move in game_logic.get_available_moves():
        game_logic.make_move(player_to_play, move)
        score = get_minimax_score(game_logic, (player_to_play + 1) % 2)
        game_logic.undo_last_move()
        best_score = comparison(best_score, score)

    MINIMAX_SCORE_CACHE[game_logic.board_hash] = best_score
    return best_score
