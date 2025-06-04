from functools import partial
from typing import Callable, final

from games_backend.games.topological_connect_four.exceptions import GameException
from games_backend.games.topological_connect_four.geometry import GeometryFunction
from games_backend.games.topological_connect_four.gravity import GravityFunction


@final
class TopologicalLogic:
    def __init__(self, geometry: GeometryFunction, gravity: GravityFunction, number_of_players: int, board_size: int):
        """
        NOTE: All functions should be row first, then column.
        """
        self._number_of_players: int = number_of_players
        self._board_size: int = board_size
        self._moves: list[list[int | None]] = [[None] * board_size for _ in range(board_size)]
        self._winning_length: int = 4  # The number of positions in a winning line.
        self._move_number: int = 0
        self._winner: int | None = None
        self._winning_line: list[tuple[int, int]] = []

        self._normalise_coordinates: Callable[[int, int], tuple[int, int] | None] = partial(geometry, self._board_size)
        self._valid_move: Callable[[int, int], bool] = partial(gravity, self._moves)

    def make_move(self, player: int, row: int, column: int):
        if self.game_over:
            raise GameException("The game has finished so there are no legal moves.")
        if player != self.current_player:
            raise GameException(f"It is not player {player} go, it is currently player {self.current_player}'s go.")
        coordinates = self._normalise_coordinates(row, column)
        if coordinates is None:
            raise GameException(
                f"Move ({row=}, {column=}) is not valid for this geometry board size of size {self._board_size}."
            )
        row, column = coordinates
        if self._moves[row][column] is not None:
            raise GameException(f"Move ({row=}, {column=}) is already taken.")
        if not self._valid_move(row, column):
            raise GameException(f"Move ({row=}, {column=}) is not valid for this boards gravity.")
        self._moves[row][column] = self._move_number
        self._check_winner(row, column)
        self._move_number += 1

    def undo_last_move(self) -> None:
        if self._move_number == 0:
            raise GameException("There are no moves to undo.")
        self._move_number -= 1
        self._moves = [
            [None if square is None or square >= self._move_number else square for square in row] for row in self._moves
        ]
        self._winner = None
        self._winning_line = []

    def reset_game_state(self, moves: list[list[int | None]]) -> None:
        if len(moves) != self._board_size or any(len(row) != self._board_size for row in moves):
            raise GameException("The move state is not valid shape.")
        move_sequence = self._get_move_sequence(moves)
        self.restart_game()
        for row, column in move_sequence:
            self.make_move(self.current_player, row, column)

    def _get_move_sequence(self, moves: list[list[int | None]]) -> list[tuple[int, int]]:
        last_move_number = max(max(value or -1 for value in row) for row in moves)
        if last_move_number < 0:
            return []
        move_locations: dict[int, tuple[int, int]] = {}
        for row in range(self._board_size):
            for column in range(self._board_size):
                if (move_number := moves[row][column]) is not None:
                    if move_number < 0:
                        raise GameException("Move numbers cannot be negative.")
                    if move_number in move_locations:
                        raise GameException(f"Move number {moves[row][column]} appears multiple times.")
                    move_locations[move_number] = (row, column)
        move_sequence: list[tuple[int, int]] = []
        for move_number in range(last_move_number + 1):
            if move_number not in move_locations:
                raise GameException(f"Move number {move_number} is missing.")
            move_sequence.append(move_locations[move_number])
        return move_sequence

    def restart_game(self) -> None:
        self._move_number = 0
        self._moves = [[None] * self._board_size for _ in range(self._board_size)]
        self._winner = None
        self._winning_line = []

    def get_available_moves(self) -> list[tuple[int, int]]:
        """
        Returns a list of valid moves. These are row first then column.
        """
        moves: list[tuple[int, int]] = []
        for column in range(self._board_size):
            for row in range(self._board_size):
                if self._valid_move(row, column):
                    moves.append((row, column))
        return moves

    @property
    def current_player(self) -> int:
        return self._move_number % self._number_of_players

    @property
    def current_move(self) -> int:
        return self._move_number

    def get_player_in_position(self, row: int, column: int) -> int | None:
        coordinates = self._normalise_coordinates(row, column)
        if coordinates is None:
            return None
        position = self._moves[coordinates[0]][coordinates[1]]
        return None if position is None else position % self._number_of_players

    @property
    def game_over(self) -> bool:
        return self._winner is not None or len(self.get_available_moves()) == 0

    @property
    def winner(self) -> int | None:
        return self._winner

    @property
    def winning_line(self) -> list[tuple[int, int]]:
        return self._winning_line

    @property
    def number_of_players(self) -> int:
        return self._number_of_players

    @property
    def board_size(self) -> int:
        return self._board_size

    @property
    def moves(self) -> list[list[int | None]]:
        return self._moves.copy()

    def _check_winner(self, row: int, column: int):
        found_winner = any(
            [
                self._check_winner_on_line(row, column, 1, 0),  # Vertical
                self._check_winner_on_line(row, column, 0, 1),  # Horizontal
                self._check_winner_on_line(row, column, 1, 1),  # Diagonal /
                self._check_winner_on_line(row, column, 1, -1),  # Diagonal \
            ]
        )
        if not found_winner:
            self._winner = None
            self._winning_line = []

    def _check_winner_on_line(self, row: int, column: int, row_delta: int, column_delta: int) -> bool:
        """
        To check for a winner in a given direction just go out in those directions to find how many in a row that player
        has.

        Returns a boolean to speed up checking all directions.
        """
        if (coordinate := self._normalise_coordinates(row, column)) is None:
            return False
        positions: list[tuple[int, int]] = [coordinate]
        row = coordinate[0]
        column = coordinate[1]

        current_row = row
        current_column = column
        while True:
            coordinate = self._normalise_coordinates(current_row + row_delta, current_column + column_delta)
            if coordinate is None:
                break
            current_row = coordinate[0]
            current_column = coordinate[1]
            if self.get_player_in_position(current_row, current_column) != self.current_player:
                break
            if (current_row, current_column) in positions:
                # Avoid infinite loop if the same position is added twice.
                break
            positions.append((current_row, current_column))

        current_row = row
        current_column = column
        while True:
            coordinate = self._normalise_coordinates(current_row - row_delta, current_column - column_delta)
            if coordinate is None:
                break
            current_row = coordinate[0]
            current_column = coordinate[1]
            if self.get_player_in_position(current_row, current_column) != self.current_player:
                break
            if (current_row, current_column) in positions:
                # Avoid infinite loop if the same position is added twice.
                break
            positions.append((current_row, current_column))

        if len(positions) >= self._winning_length:
            self._winner = self.current_player
            self._winning_line = positions
            return True
        return False
