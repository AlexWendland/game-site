package tictactoe

import (
	"testing"
)

func TestCheckWinner(t *testing.T) {
	tests := []struct {
		name     string
		board    [9]int
		expected *[3]int
	}{
		{
			name: "player 0 wins - top row",
			board: [9]int{
				0, 0, 0,
				1, 1, -1,
				-1, -1, -1,
			},
			expected: intArrPtr([3]int{0, 1, 2}),
		},
		{
			name: "player 1 wins - middle column",
			board: [9]int{
				0, 1, 0,
				-1, 1, -1,
				-1, 1, -1,
			},
			expected: intArrPtr([3]int{1, 4, 7}),
		},
		{
			name: "player 0 wins - diagonal",
			board: [9]int{
				0, 1, 1,
				-1, 0, -1,
				1, -1, 0,
			},
			expected: intArrPtr([3]int{0, 4, 8}),
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
			result := CheckWinner(tt.board)

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

// Helper function to create int pointer
func intArrPtr(arr [3]int) *[3]int {
	return &arr
}
