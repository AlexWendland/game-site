package app

import (
	"fmt"
	"sync"

	"github.com/AlexWendland/games-site/internal/domain"
)

// Registry manages multiple game sessions by ID
// Thread-safe for concurrent access from HTTP handlers
type Registry struct {
	sessions map[string]*GameSession
	mu       sync.RWMutex
}

// NewRegistry creates a new session registry
func NewRegistry() *Registry {
	return &Registry{
		sessions: make(map[string]*GameSession),
	}
}

// Retrieves an existing game session (returns error if not found)
func (r *Registry) Get(gameID string) (*GameSession, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	session, exists := r.sessions[gameID]
	if !exists {
		return nil, fmt.Errorf("session %s not found", gameID)
	}

	return session, nil
}

// Creates a new game session with the given ID and game
// Returns error if session already exists
// Automatically starts the session's event loop
func (r *Registry) Create(gameID string, game domain.Game) (*GameSession, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.sessions[gameID]; exists {
		return nil, fmt.Errorf("session %s already exists", gameID)
	}

	session := NewGameSession(gameID, game)
	go session.Run()

	r.sessions[gameID] = session
	return session, nil
}

func (r *Registry) Remove(gameID string) {
	r.mu.Lock()
	defer r.mu.Unlock()

	game, err := r.Get(gameID)

	if err != nil {
		return
	}

	game.Shutdown()
	delete(r.sessions, gameID)
}
