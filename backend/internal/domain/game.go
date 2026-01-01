package domain

import "github.com/AlexWendland/games-site/protocol"

// Game is the core interface that all games must implement.
type Game interface {
	// HandleAction processes a player action from the protocol request
	// Returns a protocol.Response (usually ErrorResponse) if the action is invalid
	// Returns nil if the action was processed successfully
	HandleAction(playerPosition int, message protocol.Request) *protocol.ErrorResponse

	// GetStateForAll returns state updates for all players (or a broadcast)
	// Used after an action is processed to update all clients
	GetStateForAll() []StateMessage

	// IsComplete returns true if the game has ended
	IsComplete() bool

	// GameType returns the type identifier for this game
	GameType() string

	// Gets all the valid AI Types.
	AITypes() map[string]string

	// Gets the game Metadata (game-specific type, will be JSON encoded by API)
	GetMetadata() any
}
