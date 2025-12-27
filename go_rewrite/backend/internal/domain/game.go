package domain

import "github.com/AlexWendland/games-site/protocol"

// Game is the core interface that all games must implement
type Game interface {
	// HandleAction processes a player action from the protocol request
	// Returns a protocol.Response (usually ErrorResponse) if the action is invalid
	// Returns nil if the action was processed successfully
	HandleAction(msg ActionMessage) *protocol.ErrorResponse

	// GetStateForPlayer returns the game state as visible to a specific player
	// Returns different protocol responses for different players (e.g., hide opponent's cards)
	GetStateForPlayer(playerID string) protocol.Response

	// GetStateForAll returns state updates for all players (or a broadcast)
	// Used after an action is processed to update all clients
	GetStateForAll() []StateMessage

	// MaxPlayers returns the maximum number of players for this game
	MaxPlayers() int

	// IsComplete returns true if the game has ended
	IsComplete() bool

	// GameType returns the type identifier for this game
	GameType() string
}
