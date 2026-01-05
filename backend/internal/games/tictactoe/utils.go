package tictactoe

// WinningLines defines all possible winning combinations in Tic Tac Toe.
var WinningLines = [][3]int{
	{0, 1, 2}, // Top row
	{3, 4, 5}, // Middle row
	{6, 7, 8}, // Bottom row
	{0, 3, 6}, // Left column
	{1, 4, 7}, // Middle column
	{2, 5, 8}, // Right column
	{0, 4, 8}, // Diagonal top-left to bottom-right
	{2, 4, 6}, // Diagonal top-right to bottom-left
}

// CheckWinner checks if there's a winner on the board
// Board contains move numbers (-1 for empty, 0+ for move number)
// Returns the winning line positions if there's a winner, nil otherwise.
func CheckWinner(board [9]int) []int {
	for _, line := range WinningLines {
		// Check if all three positions are occupied
		// #nosec G602 -- line is always [3]int with valid indices 0-2
		if board[line[0]] == -1 || board[line[1]] == -1 || board[line[2]] == -1 {
			continue
		}

		// Check if all three positions belong to the same player
		// Player determined by move_number % 2
		// #nosec G602 -- line is always [3]int with valid indices 0-2
		player0 := board[line[0]] % 2
		// #nosec G602 -- line is always [3]int with valid indices 0-2
		player1 := board[line[1]] % 2
		// #nosec G602 -- line is always [3]int with valid indices 0-2
		player2 := board[line[2]] % 2

		if player0 == player1 && player1 == player2 {
			return []int{line[0], line[1], line[2]}
		}
	}

	return nil
}
