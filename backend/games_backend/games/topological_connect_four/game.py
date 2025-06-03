from functools import partial

from games_backend.games.topological_connect_four.board import NOT_A_POSITION, TopologicalBoard
from games_backend.games.topological_connect_four.exceptions import GameException
from games_backend.games.topological_connect_four.gravity import ValidationFunction
from games_backend.games.topological_connect_four.models import Player


def longest_line(board: TopologicalBoard, column: int, row: int, column_delta: int, row_delta: int) -> int:
    """
    Helper function to work out the longest line for the player in the initial position.

    This tracks the normalised positions check for looping back on itself. We only allow
    one position on the board to count for 1 in the line length.
    """
    current_player = board.get_position(column, row)
    if current_player == NOT_A_POSITION or current_player == Player.NO_PLAYER:
        raise GameException(f"No player at ({column}, {row}) or not a position")
    positions = [board.normalise_coordinates(column, row)]
    current_column, current_row = column, row
    while True:
        current_column += column_delta
        current_row += row_delta
        if board.get_position(current_column, current_row) != current_player:
            break
        # We need to check the position is correct before normalising coordinates.
        current_column, current_row = board.normalise_coordinates(current_column, current_row)
        if (current_column, current_row) in positions:
            break
        positions.append((current_column, current_row))
    current_column, current_row = column, row
    while True:
        current_column -= column_delta
        current_row -= row_delta
        if board.get_position(current_column, current_row) != current_player:
            break
        # We need to check the position is correct before normalising coordinates.
        current_column, current_row = board.normalise_coordinates(current_column, current_row)
        if (current_column, current_row) in positions:
            break
        positions.append((current_column, current_row))
    return len(positions)


def has_position_won(board: TopologicalBoard, column: int, row: int, win_length: int = 4):
    return any(
        [
            longest_line(board, column, row, 1, 0) >= win_length,
            longest_line(board, column, row, 0, 1) >= win_length,
            longest_line(board, column, row, 1, 1) >= win_length,
            longest_line(board, column, row, 1, -1) >= win_length,
        ]
    )


class TopologicalLogic:
    def __init__(self, board: TopologicalBoard, gravity: ValidationFunction, number_of_players: int):
        if number_of_players < 2:
            raise ValueError(f"You can not have a game with {number_of_players} you need at least 2")
        self._number_of_players = number_of_players
        # TODO: Would be good to add a copy function here.
        self._board = board
        self._next_player = Player.ONE
        self._finished = False
        self.valid_move = partial(gravity, self._board)
        self.has_position_won = partial(has_position_won, self._board)

    def _progress_next_player(self):
        # Player numbers are 1 indexed but modulus is 0 indexed.
        next_player_number = self._next_player.value % self._number_of_players
        self._next_player = Player.from_value(next_player_number + 1)

    def make_move(self, player: Player, column: int, row: int):
        if self._finished:
            raise GameException("The game has finished no legal move")
        if player != self._next_player:
            raise GameException(f"It is not player {player} go, it is currently player {self._next_player}'s go.")
        if not self.valid_move(column, row):
            raise GameException(f"Move ({column}, {row}) is not valid.")
        self._board.set_position_safe(column, row, player)
        if self.has_position_won(column, row):
            self._finished = True
        else:
            self._progress_next_player()

    def get_available_moves(self) -> list[tuple[int, int]]:
        moves = []
        for column in range(self._board.get_size()):
            for row in range(self._board.get_size()):
                if self.valid_move(column, row):
                    moves.append((column, row))
        return moves

    def __str__(self):
        representation = str(self._board) + "\n ---\n"
        if self._finished:
            representation += f"Player {self._next_player.value} has won!\n"
        else:
            representation += f"Next player to move is {self._next_player.value}.\n"
        representation += " ---"
        return representation
