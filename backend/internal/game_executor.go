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
	Register(logger *slog.Logger, userID string) (<-chan TaggedMessage, error)

	Unregister(logger *slog.Logger, userID string) error

	Run(logger *slog.Logger)

	Shutdown()

	GetMetadata() proto.GameMetadataResponse

	GameType() string
}
