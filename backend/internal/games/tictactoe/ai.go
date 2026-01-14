package tictactoe

import (
	"log/slog"
	"math/rand"

	"github.com/AlexWendland/games-site/backend/internal"
	"github.com/AlexWendland/games-site/backend/proto"
	"google.golang.org/protobuf/encoding/protojson"
)

// MoveStrategy is a function that takes a board and current player position, and returns a move
type MoveStrategy func(board [9]int, playerPosition int) int

type TicTacToeAI interface {
	Run(logger *slog.Logger)
	Stop()
}

type baseAI struct {
	userID     string
	position   int
	inputChan  <-chan internal.TaggedMessage
	actionChan chan<- internal.TaggedMessage
	strategy   MoveStrategy
	stopChan   chan struct{}
	done       chan struct{}
}

// NewTicTacToeAI creates a new AI player with the specified strategy
func NewTicTacToeAI(
	userID string,
	model proto.TicTacToeModel,
	position int32,
	inputChan <-chan internal.TaggedMessage,
	actionChan chan<- internal.TaggedMessage,
) TicTacToeAI {
	var strategy MoveStrategy
	switch model {
	case proto.TicTacToeModel_TIC_TAC_TOE_MODEL_EASY:
		strategy = randomStrategy
	case proto.TicTacToeModel_TIC_TAC_TOE_MODEL_MEDIUM:
		strategy = blockStrategy
	case proto.TicTacToeModel_TIC_TAC_TOE_MODEL_HARD:
		strategy = minimaxStrategy
	default:
		strategy = randomStrategy
	}

	return &baseAI{
		userID:     userID,
		position:   int(position),
		inputChan:  inputChan,
		actionChan: actionChan,
		strategy:   strategy,
		stopChan:   make(chan struct{}),
		done:       make(chan struct{}),
	}
}

// Run starts the AI's event loop (should be called in a goroutine)
func (ai *baseAI) Run(logger *slog.Logger) {
	defer close(ai.done)
	defer logger.Info("AI stopped", "user_id", ai.userID)

	logger.Info("TicTacToe AI started", "user_id", ai.userID, "position", ai.position)

	for {
		select {
		case msg := <-ai.inputChan:
			ai.handleMessage(logger, msg)
		case <-ai.stopChan:
			logger.Debug("AI received stop signal", "user_id", ai.userID)
			return
		}
	}
}

// Stop gracefully stops the AI
func (ai *baseAI) Stop() {
	close(ai.stopChan)
	<-ai.done // Wait for Run to complete
}

// handleMessage processes incoming messages and decides whether to make a move
func (ai *baseAI) handleMessage(logger *slog.Logger, msg internal.TaggedMessage) {
	serverMsg := &proto.ServerTicTacToeWebsocketMessage{}
	if err := protojson.Unmarshal(msg.RawMessage, serverMsg); err != nil {
		logger.Warn("Failed to unmarshal server message", "error", err.Error())
		return
	}

	gameStateMsg, ok := serverMsg.Message.(*proto.ServerTicTacToeWebsocketMessage_GameState)
	if !ok {
		return
	}

	gameState := gameStateMsg.GameState

	// Convert protobuf int32 board to int board
	board := [9]int{}
	for i, v := range gameState.Board {
		board[i] = int(v)
	}

	if gameState.Winner != nil {
		logger.Debug("Game over, AI not making a move", "user_id", ai.userID)
		return
	}

	currentPlayer := ai.getCurrentPlayer(board)
	if currentPlayer != ai.position {
		logger.Debug("Not AI's turn", "user_id", ai.userID, "current_player", currentPlayer, "ai_position", ai.position)
		return
	}

	// Normalize board: convert move numbers to player positions (0 or 1)
	for i := 0; i < 9; i++ {
		if board[i] != -1 {
			// #nosec G602 -- i is bounded by loop (0-8), board is [9]int
			board[i] %= 2
		}
	}

	move := ai.strategy(board, ai.position)
	logger.Info("AI making move", "user_id", ai.userID, "position", move)

	ai.sendMove(logger, move)
}

func (ai *baseAI) getCurrentPlayer(board [9]int) int {
	maxPlayer := -1
	for _, cell := range board {
		if cell > maxPlayer {
			maxPlayer = cell
		}
	}
	return (maxPlayer + 1) % 2
}

// sendMove sends a move action to the game
func (ai *baseAI) sendMove(logger *slog.Logger, position int) {
	clientMsg := &proto.ClientTicTacToeWebsocketMessage{
		Message: &proto.ClientTicTacToeWebsocketMessage_MakeMove{
			MakeMove: &proto.MakeMoveRequest{
				// #nosec G115 -- position is 0-8 (board index), safe conversion to int32
				Position: int32(position),
			},
		},
	}

	jsonData, err := protojson.Marshal(clientMsg)
	if err != nil {
		logger.Error("Failed to marshal move request", "error", err.Error())
		return
	}

	ai.actionChan <- internal.TaggedMessage{
		UserID:     ai.userID,
		RawMessage: jsonData,
		Logger:     logger,
	}
}

// ==========================================================================
// Strategy implementations
// ==========================================================================

// randomStrategy picks a random available move
func randomStrategy(board [9]int, playerPosition int) int {
	availableMoves := getAvailableMoves(board)
	if len(availableMoves) == 0 {
		return 0
	}
	// #nosec G404 -- weak random acceptable for game AI (not cryptographic use)
	return availableMoves[rand.Intn(len(availableMoves))]
}

// blockStrategy tries to win, then blocks opponent's winning moves, then random
func blockStrategy(board [9]int, playerPosition int) int {
	// First, check if we can win
	if winningMoves := getWinningMoves(board, playerPosition); len(winningMoves) > 0 {
		// #nosec G404 -- weak random acceptable for game AI (not cryptographic use)
		return winningMoves[rand.Intn(len(winningMoves))]
	}

	// Then, check if we need to block opponent
	opponentPosition := (playerPosition + 1) % 2
	if blockingMoves := getWinningMoves(board, opponentPosition); len(blockingMoves) > 0 {
		// #nosec G404 -- weak random acceptable for game AI (not cryptographic use)
		return blockingMoves[rand.Intn(len(blockingMoves))]
	}

	// Otherwise, pick randomly
	return randomStrategy(board, playerPosition)
}

func minimaxStrategy(board [9]int, playerPosition int) int {
	availableMoves := getAvailableMoves(board)

	// If it's the first move, pick center or a corner
	if len(availableMoves) == 9 {
		corners := []int{0, 2, 4, 6, 8}
		// #nosec G404 -- weak random acceptable for game AI (not cryptographic use)
		randIndex := rand.Intn(len(corners))
		return corners[randIndex] // #nosec G602 -- corners has 5 elements, randIndex is 0-4, always in bounds
	}

	bestMoves := getMinimaxMoves(board, playerPosition)
	if len(bestMoves) == 0 {
		return randomStrategy(board, playerPosition)
	}
	// #nosec G404 -- weak random acceptable for game AI (not cryptographic use)
	return bestMoves[rand.Intn(len(bestMoves))]
}

// ==========================================================================
// Helper functions
// ==========================================================================

// getAvailableMoves returns all empty positions on the board
func getAvailableMoves(board [9]int) []int {
	moves := []int{}
	for i, cell := range board {
		if cell == -1 {
			moves = append(moves, i)
		}
	}
	return moves
}

// getWinningMoves returns all moves that would result in a win for the given player
func getWinningMoves(board [9]int, playerPosition int) []int {
	winningMoves := []int{}
	availableMoves := getAvailableMoves(board)

	for _, move := range availableMoves {
		// Try the move
		testBoard := board
		testBoard[move] = playerPosition

		// Check if it wins
		if winner := checkWinner(testBoard); winner != nil && *winner == playerPosition {
			winningMoves = append(winningMoves, move)
		}
	}

	return winningMoves
}

// checkWinner checks if there's a winner on the board
func checkWinner(board [9]int) *int {
	winningLine := CheckWinner(board)
	if winningLine != nil {
		winner := board[winningLine[0]]
		return &winner
	}
	return nil
}

// ==========================================================================
// Minimax algorithm with memoization
// ==========================================================================

var minimaxCache = make(map[int]int)

func getMinimaxMoves(board [9]int, playerPosition int) []int {
	boardHash := hashBoard(board)
	var bestScore int
	var compareFunc func(int, int) bool

	if playerPosition == 0 {
		// Player 0 wants to maximize
		bestScore = -1000000
		compareFunc = func(a, b int) bool { return a > b }
	} else {
		// Player 1 wants to minimize
		bestScore = 1000000
		compareFunc = func(a, b int) bool { return a < b }
	}

	bestMoves := []int{}

	for move := 0; move < 9; move++ {
		if board[move] == -1 {
			// Try the move
			newBoardHash := boardHash + (pow3(move) * hashSquare(playerPosition))
			score := getMinimaxScore(newBoardHash, (playerPosition+1)%2)

			if compareFunc(score, bestScore) {
				bestScore = score
				bestMoves = []int{move}
			} else if score == bestScore {
				bestMoves = append(bestMoves, move)
			}
		}
	}

	return bestMoves
}

func getMinimaxScore(boardHash int, playerToPlay int) int {
	if score, exists := minimaxCache[boardHash]; exists {
		return score
	}

	board := unhashBoard(boardHash)

	if winningLine := CheckWinner(board); winningLine != nil {
		winner := board[winningLine[0]]
		var score int
		if winner == 0 {
			score = 1
		} else {
			score = -1
		}
		minimaxCache[boardHash] = score
		return score
	}

	allFilled := true
	for _, cell := range board {
		if cell == -1 {
			allFilled = false
			break
		}
	}
	if allFilled {
		minimaxCache[boardHash] = 0
		return 0
	}

	var bestScore int
	//nolint:nestif // Minimax algorithm requires nested logic for maximize/minimize
	if playerToPlay == 0 {
		bestScore = -1000000
		for move := 0; move < 9; move++ {
			if board[move] == -1 {
				newBoardHash := boardHash + (pow3(move) * hashSquare(playerToPlay))
				score := getMinimaxScore(newBoardHash, (playerToPlay+1)%2)
				if score > bestScore {
					bestScore = score
				}
			}
		}
	} else {
		bestScore = 1000000
		for move := 0; move < 9; move++ {
			if board[move] == -1 {
				newBoardHash := boardHash + (pow3(move) * hashSquare(playerToPlay))
				score := getMinimaxScore(newBoardHash, (playerToPlay+1)%2)
				if score < bestScore {
					bestScore = score
				}
			}
		}
	}

	minimaxCache[boardHash] = bestScore
	return bestScore
}

// ==========================================================================
// Board hashing functions for minimax memoization
// ==========================================================================

func hashSquare(square int) int {
	return square + 1
}

func unhashSquare(squareHash int) int {
	return squareHash - 1
}

func hashBoard(board [9]int) int {
	hash := 0
	for i, square := range board {
		hash += hashSquare(square) * pow3(i)
	}
	return hash
}

func unhashBoard(boardHash int) [9]int {
	var board [9]int
	for i := 0; i < 9; i++ {
		board[i] = unhashSquare(boardHash % 3)
		boardHash /= 3
	}
	return board
}

func pow3(n int) int {
	result := 1
	for i := 0; i < n; i++ {
		result *= 3
	}
	return result
}
