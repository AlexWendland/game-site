package protocol

// Ultimate TicTacToe protocol definitions

// UltimateGameStateResponse is sent from server to client
type UltimateGameStateResponse struct {
	MessageType MessageType                 `json:"message_type"`
	Parameters  UltimateGameStateParameters `json:"parameters"`
}

type UltimateGameStateParameters struct {
	Moves        []*int `json:"moves"`          // 81 squares (9x9 board)
	SectorToPlay []*int `json:"sector_to_play"` // Which sector(s) can be played
	SectorsOwned []*int `json:"sectors_owned"`  // 9 sectors, owner per sector
	Winner       *int   `json:"winner"`         // nil if no winner
	WinningLine  []int  `json:"winning_line"`   // Empty if no winner
}

// UltimateMakeMoveRequest is sent from client to server
type UltimateMakeMoveRequest struct {
	Position int `json:"position"` // 0-80 board position
}

// UltimateMetadata describes the game configuration
type UltimateMetadata struct {
	GameType   string `json:"game_type"`
	MaxPlayers int    `json:"max_players"`
}
