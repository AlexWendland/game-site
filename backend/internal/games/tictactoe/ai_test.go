package tictactoe

import (
	"testing"
)

func TestRandomStrategy(t *testing.T) {
	tests := []struct {
		name     string
		board    [9]int
		position int
	}{
		{
			name:     "empty board",
			board:    [9]int{-1, -1, -1, -1, -1, -1, -1, -1, -1},
			position: 0,
		},
		{
			name:     "one move made",
			board:    [9]int{0, -1, -1, -1, -1, -1, -1, -1, -1},
			position: 1,
		},
		{
			name:     "almost full board",
			board:    [9]int{0, 1, 0, 1, 0, 1, 0, 1, -1},
			position: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			move := randomStrategy(tt.board, tt.position)

			// Check that the move is valid (empty square)
			if tt.board[move] != -1 {
				t.Errorf("randomStrategy returned occupied position %d", move)
			}

			// Check that the move is in range
			if move < 0 || move >= 9 {
				t.Errorf("randomStrategy returned out of range position %d", move)
			}
		})
	}
}

func TestBlockStrategy(t *testing.T) {
	tests := []struct {
		name          string
		board         [9]int
		position      int
		expectedMoves []int // Any of these moves would be valid
		description   string
	}{
		{
			name: "take winning move",
			board: [9]int{
				0, 0, -1, // Player 0 can win at position 2
				1, 1, -1,
				-1, -1, -1,
			},
			position:      0,
			expectedMoves: []int{2},
			description:   "Should take winning move at position 2",
		},
		{
			name: "block opponent winning move",
			board: [9]int{
				1, 1, -1, // Player 1 can win at position 2
				0, -1, -1,
				-1, -1, -1,
			},
			position:      0,
			expectedMoves: []int{2},
			description:   "Should block opponent's winning move at position 2",
		},
		{
			name: "block opponent column win",
			board: [9]int{
				1, 0, -1,
				1, -1, -1,
				-1, -1, -1, // Player 1 can win at position 6
			},
			position:      0,
			expectedMoves: []int{6},
			description:   "Should block opponent's column win at position 6",
		},
		{
			name: "block opponent diagonal win",
			board: [9]int{
				1, -1, 0,
				-1, 1, -1,
				-1, -1, -1, // Player 1 can win at position 8
			},
			position:      0,
			expectedMoves: []int{8},
			description:   "Should block opponent's diagonal win at position 8",
		},
		{
			name: "take win over block",
			board: [9]int{
				0, 0, -1, // Player 0 can win at position 2
				1, 1, -1, // Player 1 can win at position 5
				-1, -1, -1,
			},
			position:      0,
			expectedMoves: []int{2},
			description:   "Should prioritize winning over blocking",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			move := blockStrategy(tt.board, tt.position)

			// Check if move is one of the expected moves
			valid := false
			for _, expectedMove := range tt.expectedMoves {
				if move == expectedMove {
					valid = true
					break
				}
			}

			if !valid {
				t.Errorf("%s: got move %d, expected one of %v", tt.description, move, tt.expectedMoves)
			}

			// Verify the move is legal
			if tt.board[move] != -1 {
				t.Errorf("blockStrategy returned occupied position %d", move)
			}
		})
	}
}

func TestMinimaxStrategy(t *testing.T) {
	tests := []struct {
		name          string
		board         [9]int
		position      int
		expectedMoves []int // Any of these moves would be optimal
		description   string
	}{
		{
			name:          "empty board should play corner or center",
			board:         [9]int{-1, -1, -1, -1, -1, -1, -1, -1, -1},
			position:      0,
			expectedMoves: []int{0, 2, 4, 6, 8},
			description:   "First move should be corner or center",
		},
		{
			name: "take winning move",
			board: [9]int{
				0, 0, -1, // Can win at position 2
				1, 1, -1,
				-1, -1, -1,
			},
			position:      0,
			expectedMoves: []int{2},
			description:   "Should take immediate win",
		},
		{
			name: "block opponent win",
			board: [9]int{
				1, 1, -1, // Must block at position 2
				0, -1, -1,
				1, -1, 0,
			},
			position:      0,
			expectedMoves: []int{2},
			description:   "Should block opponent's winning move",
		},
		{
			name: "create fork opportunity",
			board: [9]int{
				0, 1, -1,
				-1, 0, -1,
				-1, -1, 1,
			},
			position:      0,
			expectedMoves: []int{3, 6}, // These create winning forks
			description:   "Should create a fork",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			move := minimaxStrategy(tt.board, tt.position)

			// Check if move is one of the expected moves
			valid := false
			for _, expectedMove := range tt.expectedMoves {
				if move == expectedMove {
					valid = true
					break
				}
			}

			if !valid {
				t.Errorf("%s: got move %d, expected one of %v", tt.description, move, tt.expectedMoves)
			}

			// Verify the move is legal
			if tt.board[move] != -1 {
				t.Errorf("minimaxStrategy returned occupied position %d", move)
			}
		})
	}
}

func TestGetAvailableMoves(t *testing.T) {
	tests := []struct {
		name     string
		board    [9]int
		expected []int
	}{
		{
			name:     "empty board",
			board:    [9]int{-1, -1, -1, -1, -1, -1, -1, -1, -1},
			expected: []int{0, 1, 2, 3, 4, 5, 6, 7, 8},
		},
		{
			name:     "full board",
			board:    [9]int{0, 1, 0, 1, 0, 1, 0, 1, 0},
			expected: []int{},
		},
		{
			name:     "one empty square",
			board:    [9]int{0, 1, 0, 1, 0, 1, 0, 1, -1},
			expected: []int{8},
		},
		{
			name:     "multiple empty squares",
			board:    [9]int{0, -1, 0, -1, 0, 1, 0, 1, -1},
			expected: []int{1, 3, 8},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := getAvailableMoves(tt.board)

			if len(result) != len(tt.expected) {
				t.Errorf("expected %d available moves, got %d", len(tt.expected), len(result))
				return
			}

			for i, move := range result {
				if move != tt.expected[i] {
					t.Errorf("expected move %d at index %d, got %d", tt.expected[i], i, move)
				}
			}
		})
	}
}

func TestGetWinningMoves(t *testing.T) {
	tests := []struct {
		name     string
		board    [9]int
		position int
		expected []int
	}{
		{
			name: "row win available",
			board: [9]int{
				0, 0, -1,
				1, 1, -1,
				-1, -1, -1,
			},
			position: 0,
			expected: []int{2},
		},
		{
			name: "column win available",
			board: [9]int{
				0, 1, -1,
				0, 1, -1,
				-1, -1, -1,
			},
			position: 0,
			expected: []int{6},
		},
		{
			name: "diagonal win available",
			board: [9]int{
				0, 1, -1,
				-1, 0, -1,
				-1, -1, -1,
			},
			position: 0,
			expected: []int{8},
		},
		{
			name: "multiple winning moves",
			board: [9]int{
				0, 0, -1,
				-1, 0, -1,
				-1, -1, -1,
			},
			position: 0,
			expected: []int{2, 7, 8},
		},
		{
			name: "no winning moves",
			board: [9]int{
				0, 1, -1,
				-1, -1, -1,
				-1, -1, -1,
			},
			position: 0,
			expected: []int{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := getWinningMoves(tt.board, tt.position)

			if len(result) != len(tt.expected) {
				t.Errorf("expected %d winning moves, got %d: %v", len(tt.expected), len(result), result)
				return
			}

			// Check if all expected moves are present
			for _, expectedMove := range tt.expected {
				found := false
				for _, move := range result {
					if move == expectedMove {
						found = true
						break
					}
				}
				if !found {
					t.Errorf("expected winning move %d not found in result %v", expectedMove, result)
				}
			}
		})
	}
}

func TestCheckWinnerHelper(t *testing.T) {
	tests := []struct {
		name     string
		board    [9]int
		expected *int
	}{
		{
			name: "player 0 wins - top row",
			board: [9]int{
				0, 0, 0,
				1, 1, -1,
				-1, -1, -1,
			},
			expected: intPtr(0),
		},
		{
			name: "player 1 wins - middle column",
			board: [9]int{
				0, 1, 0,
				-1, 1, -1,
				-1, 1, -1,
			},
			expected: intPtr(1),
		},
		{
			name: "player 0 wins - diagonal",
			board: [9]int{
				0, 1, 1,
				-1, 0, -1,
				1, -1, 0,
			},
			expected: intPtr(0),
		},
		{
			name: "no winner",
			board: [9]int{
				0, 1, 0,
				1, 0, 1,
				1, 0, 1,
			},
			expected: nil,
		},
		{
			name: "empty board",
			board: [9]int{
				-1, -1, -1,
				-1, -1, -1,
				-1, -1, -1,
			},
			expected: nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := checkWinner(tt.board)

			if tt.expected == nil {
				if result != nil {
					t.Errorf("expected no winner, got winner %d", *result)
				}
			} else {
				if result == nil {
					t.Errorf("expected winner %d, got no winner", *tt.expected)
				} else if *result != *tt.expected {
					t.Errorf("expected winner %d, got %d", *tt.expected, *result)
				}
			}
		})
	}
}

func TestGetCurrentPlayer(t *testing.T) {
	ai := &baseAI{position: 0}

	tests := []struct {
		name     string
		board    [9]int
		expected int
	}{
		{
			name:     "empty board - player 0 moves first",
			board:    [9]int{-1, -1, -1, -1, -1, -1, -1, -1, -1},
			expected: 0,
		},
		{
			name:     "after first move - player 1's turn",
			board:    [9]int{0, -1, -1, -1, -1, -1, -1, -1, -1},
			expected: 1,
		},
		{
			name:     "after second move - player 0's turn",
			board:    [9]int{0, 1, -1, -1, -1, -1, -1, -1, -1},
			expected: 0,
		},
		{
			name:     "after several moves - player 1's turn",
			board:    [9]int{0, 1, 2, 3, 4, -1, -1, -1, -1},
			expected: 1,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ai.getCurrentPlayer(tt.board)
			if result != tt.expected {
				t.Errorf("expected player %d, got %d", tt.expected, result)
			}
		})
	}
}

func TestHashAndUnhashBoard(t *testing.T) {
	tests := []struct {
		name  string
		board [9]int
	}{
		{
			name:  "empty board",
			board: [9]int{-1, -1, -1, -1, -1, -1, -1, -1, -1},
		},
		{
			name:  "full board",
			board: [9]int{0, 1, 0, 1, 0, 1, 0, 1, 0},
		},
		{
			name:  "mixed board",
			board: [9]int{0, -1, 1, -1, 0, -1, 1, -1, 0},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			hash := hashBoard(tt.board)
			result := unhashBoard(hash)

			for i := 0; i < 9; i++ {
				if result[i] != tt.board[i] {
					t.Errorf("board mismatch at position %d: expected %d, got %d", i, tt.board[i], result[i])
				}
			}
		})
	}
}

func TestMinimaxOptimality(t *testing.T) {
	// Test that minimax never loses
	t.Run("minimax should not lose from empty board", func(t *testing.T) {
		board := [9]int{-1, -1, -1, -1, -1, -1, -1, -1, -1}

		// Simulate a game where minimax plays first
		currentPlayer := 0
		for {
			availableMoves := getAvailableMoves(board)
			if len(availableMoves) == 0 {
				break
			}

			// Both players use minimax (optimal play)
			move := minimaxStrategy(board, currentPlayer)

			// Make the move
			board[move] = currentPlayer

			// Check for winner
			winner := checkWinner(board)
			if winner != nil {
				// Game should end in a draw when both play optimally
				t.Errorf("Game ended with a winner (%d), but should be a draw when both play optimally", *winner)
				return
			}

			currentPlayer = (currentPlayer + 1) % 2
		}

		// If we get here, the game was a draw (which is correct)
	})
}

// Helper function to create int pointer
func intPtr(i int) *int {
	return &i
}
