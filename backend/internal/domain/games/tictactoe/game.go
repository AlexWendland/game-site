package tictactoe

import (
	"fmt"
	"log/slog"

	"github.com/AlexWendland/games-site/internal/domain"
	"github.com/AlexWendland/games-site/protocol"
)

type TicTacToeGame struct {
	board       [9]int // Move numbers (-1 = empty, 0+ = move number)
	moveNumber  int
	winner      *int
	winningLine []int // Positions of winning line
	logger      *slog.Logger
}

func NewTicTacToeGame(logger *slog.Logger) *TicTacToeGame {
	game := &TicTacToeGame{
		moveNumber:  0,
		winner:      nil,
		winningLine: []int{},
		logger:      logger,
	}

	// Initialize board with -1 (empty)
	for i := range game.board {
		game.board[i] = -1
	}

	logger.Info("TicTacToe game initialized")

	return game
}

// HandleAction processes a player action
func (g *TicTacToeGame) HandleAction(playerPosition int, message protocol.Request) *protocol.ErrorResponse {
	g.logger.Debug("Handling action",
		"player_position", playerPosition,
		"function", message.FunctionName)

	if message.FunctionName != "make_move" {
		g.logger.Warn("Unsupported function called",
			"function", message.FunctionName,
			"player_position", playerPosition)
		return &protocol.ErrorResponse{
			MessageType: protocol.MessageTypeError,
			Parameters: protocol.ErrorParameters{
				ErrorMessage: fmt.Sprintf("Function %s not supported", message.FunctionName),
			},
		}
	}

	// Extract move position from parameters
	positionParam, ok := message.Parameters["position"]
	if !ok {
		g.logger.Debug("Missing position parameter", "player_position", playerPosition)
		return &protocol.ErrorResponse{
			MessageType: protocol.MessageTypeError,
			Parameters: protocol.ErrorParameters{
				ErrorMessage: "Missing position parameter",
			},
		}
	}

	// Handle JSON number (float64)
	var position int
	switch v := positionParam.(type) {
	case float64:
		position = int(v)
	case int:
		position = v
	default:
		g.logger.Debug("Invalid position parameter type",
			"player_position", playerPosition,
			"type", fmt.Sprintf("%T", positionParam))
		return &protocol.ErrorResponse{
			MessageType: protocol.MessageTypeError,
			Parameters: protocol.ErrorParameters{
				ErrorMessage: "Invalid position parameter type",
			},
		}
	}

	return g.makeMove(playerPosition, position)
}

// makeMove performs the actual move
func (g *TicTacToeGame) makeMove(playerPosition int, position int) *protocol.ErrorResponse {
	g.logger.Debug("Attempting move",
		"player_position", playerPosition,
		"board_position", position,
		"move_number", g.moveNumber)

	// Validate position
	if position < 0 || position > 8 {
		g.logger.Debug("Invalid position - out of range",
			"position", position,
			"player_position", playerPosition)
		return &protocol.ErrorResponse{
			MessageType: protocol.MessageTypeError,
			Parameters: protocol.ErrorParameters{
				ErrorMessage: fmt.Sprintf("Position %d out of range (must be 0-8)", position),
			},
		}
	}

	// Check if game is already over
	if g.winner != nil {
		g.logger.Debug("Move rejected - game already over",
			"winner", *g.winner,
			"player_position", playerPosition)
		return &protocol.ErrorResponse{
			MessageType: protocol.MessageTypeError,
			Parameters: protocol.ErrorParameters{
				ErrorMessage: fmt.Sprintf("Game already has a winner: player %d", *g.winner),
			},
		}
	}

	// Check if it's this player's turn
	currentPlayer := g.moveNumber % 2
	if currentPlayer != playerPosition {
		g.logger.Debug("Move rejected - not player's turn",
			"player_position", playerPosition,
			"current_player", currentPlayer)
		return &protocol.ErrorResponse{
			MessageType: protocol.MessageTypeError,
			Parameters: protocol.ErrorParameters{
				ErrorMessage: fmt.Sprintf("Player %d is not the current player", playerPosition),
			},
		}
	}

	// Check if position is already taken
	if g.board[position] != -1 {
		g.logger.Debug("Move rejected - position taken",
			"position", position,
			"player_position", playerPosition)
		return &protocol.ErrorResponse{
			MessageType: protocol.MessageTypeError,
			Parameters: protocol.ErrorParameters{
				ErrorMessage: fmt.Sprintf("Position %d is already taken", position),
			},
		}
	}

	// Make the move
	g.board[position] = g.moveNumber
	g.moveNumber++

	g.logger.Info("Move made",
		"player_position", playerPosition,
		"board_position", position,
		"move_number", g.moveNumber-1)

	// Check for winner
	g.checkWinner()

	return nil
}

// checkWinner checks if there's a winner and updates game state
func (g *TicTacToeGame) checkWinner() {
	winningLine := CheckWinner(g.board)
	if winningLine != nil {
		g.winningLine = winningLine
		// Determine winner from first position in winning line
		winnerPosition := g.board[winningLine[0]] % 2
		g.winner = &winnerPosition
		g.logger.Info("Game won",
			"winner_position", winnerPosition,
			"winning_line", winningLine)
	}
}

// GetStateForAll returns game state for all players
func (g *TicTacToeGame) GetStateForAll() []domain.StateMessage {
	return []domain.StateMessage{
		{
			PlayerID: "", // Broadcast to all
			Response: protocol.Response{
				MessageType: protocol.MessageTypeGameState,
				Parameters: protocol.TicTacToeGameStateParameters{
					Board:       g.board,
					Winner:      g.winner,
					WinningLine: g.winningLine,
				},
			},
		},
	}
}

// IsComplete returns true if the game has ended
func (g *TicTacToeGame) IsComplete() bool {
	// Game is complete if there's a winner or board is full
	if g.winner != nil {
		return true
	}

	// Check if board is full
	for _, cell := range g.board {
		if cell == -1 {
			return false
		}
	}

	return true
}

// GameType returns the game type identifier
func (g *TicTacToeGame) GameType() string {
	return "tictactoe"
}

// AITypes returns all valid AI types for this game
func (g *TicTacToeGame) AITypes() map[string]string {
	// TODO: Implement AI types when AI is added
	return map[string]string{
		"random":     "Easy",
		"blocker":    "Medium",
		"unbeatable": "Hard",
	}
}

// GetMetadata returns the game metadata
func (g *TicTacToeGame) GetMetadata() any {
	return protocol.TicTacToeMetadata{
		GameType:   "tictactoe",
		MaxPlayers: 2,
		Parameters: nil,
	}
}
