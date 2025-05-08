def check_tic_tac_toe_winner(board: list[int | None]) -> list[int]:
    """
    Check if there is a winner in the Tic Tac Toe game.
    :param board: The current state of the board.
    :return: A list of winning lines.
    """
    if len(board) != 9:
        raise ValueError("Board must have 9 elements.")
    winning_lines = [
        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 8],
        [0, 3, 6],
        [1, 4, 7],
        [2, 5, 8],
        [0, 4, 8],
        [2, 4, 6],
    ]
    for line in winning_lines:
        if board[line[0]] is not None and all(board[i] == board[line[0]] for i in line):
            return line
    return []
