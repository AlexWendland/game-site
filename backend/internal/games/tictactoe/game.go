package tictactoe

import (
	"fmt"
	"log/slog"
)

type TicTacToeGame struct {
	board       [9]int // Move numbers (-1 = empty, 0+ = move number)
	moveNumber  int
	winner      *int
	winningLine *[3]int // Positions of winning line
}

func NewTicTacToeGame(logger *slog.Logger) *TicTacToeGame {
	game := &TicTacToeGame{
		moveNumber:  0,
		winner:      nil,
		winningLine: nil,
	}

	// Initialize board with -1 (empty)
	for i := range game.board {
		game.board[i] = -1
	}

	logger.Info("TicTacToe game initialized")

	return game
}

// makeMove performs the actual move.
func (g *TicTacToeGame) makeMove(logger *slog.Logger, playerPosition int, position int) error {
	logger = logger.With("player_position", playerPosition, "board_position", position, "move_number", g.moveNumber)
	logger.Debug("Attempting move")

	if position < 0 || position > 8 {
		logger.Debug("Invalid position - out of range")
		return fmt.Errorf("position %d out of range (must be 0-8)", position)
	}

	if g.winner != nil {
		logger.Debug("Move rejected - game already over",
			"winner", *g.winner)
		return fmt.Errorf("game already has a winner: player %d", *g.winner)
	}

	currentPlayer := g.moveNumber % 2
	if currentPlayer != playerPosition {
		logger.Debug("Move rejected - not player's turn",
			"current_player", currentPlayer)
		return fmt.Errorf("player %d is not the current player", playerPosition)
	}

	if g.board[position] != -1 {
		logger.Debug("Move rejected - position taken")
		return fmt.Errorf("position %d is already taken", position)
	}

	g.board[position] = g.moveNumber
	g.moveNumber++

	logger.Info("Move made")

	g.checkWinner(logger)
	return nil
}

// checkWinner checks if there's a winner and updates game state.
func (g *TicTacToeGame) checkWinner(logger *slog.Logger) {
	winningLine := CheckWinner(g.board)
	if winningLine != nil {
		g.winningLine = winningLine
		// Determine winner from first position in winning line
		winnerPosition := g.board[winningLine[0]] % 2
		g.winner = &winnerPosition
		logger.Info("Game won",
			"winner_position", winnerPosition,
			"winning_line", winningLine)
	}
}
