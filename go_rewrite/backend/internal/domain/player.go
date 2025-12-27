package domain

// Player represents a player in the session
type Player interface {
	ID() string
	Name() string
	IsAI() bool
}

// HumanPlayer represents a human player
type HumanPlayer struct {
	PlayerID   string
	PlayerName string
}

func (h *HumanPlayer) ID() string   { return h.PlayerID }
func (h *HumanPlayer) Name() string { return h.PlayerName }
func (h *HumanPlayer) IsAI() bool   { return false }

// AIPlayer represents an AI player
type AIPlayer struct {
	PlayerID   string
	PlayerName string
	AIType     string
}

func (a *AIPlayer) ID() string   { return a.PlayerID }
func (a *AIPlayer) Name() string { return a.PlayerName }
func (a *AIPlayer) IsAI() bool   { return true }
