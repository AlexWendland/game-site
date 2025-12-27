package protocol

// TicTacToe protocol definitions
// These define the exact JSON structure sent over WebSocket

// TicTacToeGameStateResponse is sent from server to client
type TicTacToeGameStateResponse struct {
	MessageType MessageType                  `json:"message_type"`
	Parameters  TicTacToeGameStateParameters `json:"parameters"`
}

type TicTacToeGameStateParameters struct {
	History     [][]*int `json:"history"`      // Board history (9 squares, nil = empty, 0/1 = player)
	Winner      *int     `json:"winner"`       // nil if no winner yet
	WinningLine []int    `json:"winning_line"` // Empty if no winner
}

// TicTacToeMakeMoveRequest is sent from client to server
// Sent as part of Request with FunctionName="make_move"
type TicTacToeMakeMoveRequest struct {
	Position int `json:"position"` // 0-8 board position
}

// TicTacToeMetadata describes the game configuration
type TicTacToeMetadata struct {
	GameType   string `json:"game_type"`
	MaxPlayers int    `json:"max_players"`
}
