package internal

import (
	"log/slog"

	"github.com/AlexWendland/games-site/backend/proto"
)

// GameExecutor is a games interface with the API. Each game needs to implement this to be registered.
type GameExecutor interface {
	// ActionChannel returns a write-only channel for sending player actions
	ActionChannel() chan<- TaggedMessage

	// Register a user as a subscriber to the game.
	// Returns a connection ID and a channel for receiving messages.
	Register(logger *slog.Logger, userID string) (string, <-chan TaggedMessage, error)

	// Unregister a specific connection for a user.
	Unregister(logger *slog.Logger, userID string, connID string) error

	Run(logger *slog.Logger)

	Shutdown()

	GetMetadata() proto.GameMetadataResponse

	GameType() string
}
