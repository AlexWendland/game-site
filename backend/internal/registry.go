package internal

import (
	"crypto/rand"
	"fmt"
	"sync"

	"github.com/AlexWendland/games-site/backend/internal/constants"
)

// Registry manages multiple game sessions by ID
// Thread-safe for concurrent access from HTTP handlers.
type Registry struct {
	sessions map[string]GameExecutor
	mu       sync.RWMutex
}

// NewRegistry creates a new session registry.
func NewRegistry() *Registry {
	return &Registry{
		sessions: make(map[string]GameExecutor),
	}
}

// Get retrieves an existing game session (returns error if not found).
func (r *Registry) Get(gameID string) (GameExecutor, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	session, exists := r.sessions[gameID]
	if !exists {
		return nil, fmt.Errorf("session %s not found", gameID)
	}

	return session, nil
}

// Register adds a session to the registry.
func (r *Registry) Register(executor GameExecutor) (string, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	gameID, err := r.generateUniqueGameID()
	if err != nil {
		return "", err
	}

	r.sessions[gameID] = executor
	return gameID, nil
}

// The game with gameID will be removed and shutdown.
func (r *Registry) Remove(gameID string) {
	r.mu.Lock()
	defer r.mu.Unlock()

	game, err := r.Get(gameID)

	if err != nil {
		return
	}
	delete(r.sessions, gameID)
	go game.Shutdown()
}

// Internal: generateUniqueGameID generates a unique game ID
// This is NOT thread-safe, so should be called from another function holding the lock.
func (r *Registry) generateUniqueGameID() (string, error) {
	iteration := 0
	for {
		bytes := make([]byte, constants.IDLength)
		if _, err := rand.Read(bytes); err != nil {
			return "", fmt.Errorf("failed to generate random bytes: %w", err)
		}

		gameID := make([]byte, constants.IDLength)
		for i := 0; i < constants.IDLength; i++ {
			gameID[i] = constants.ValidGameLetters[int(bytes[i])%len(constants.ValidGameLetters)]
		}

		id := string(gameID)

		if _, exists := r.sessions[id]; !exists {
			return id, nil
		}
		iteration++
		if iteration > 1000 {
			return "", fmt.Errorf("failed to generate unique game ID after 1000 attempts")
		}
	}
}
