package internal

// GameExecutor is a games interface with the API. Each game needs to implement this to be registered.
type GameExecutor interface {
	// ActionChannel returns a write-only channel for sending player actions
	ActionChannel() chan<- TaggedMessage

	// OutgoingChannel returns a read-only channel for receiving state updates
	OutgoingChannel() <-chan TaggedMessage

	// Run starts the session's event loop (should be run in a goroutine).
	Run()

	Shutdown()

	// TODO: Think about how this should work.
	// GetMetadata() Any

	// TODO: Think about how this should work.
	// AITypes() map[string]string
}
