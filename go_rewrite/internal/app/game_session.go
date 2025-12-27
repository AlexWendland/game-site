package app

import (
	"log"

	"github.com/AlexWendland/games-site/internal/domain"
	"github.com/AlexWendland/games-site/protocol"
)

// GameSession is an actor that manages a single game instance
// It owns the game state and processes actions sequentially via channels
type GameSession struct {
	gameID       string
	game         domain.Game
	actionChan   chan domain.ActionMessage
	quit         chan struct{}
	done         chan struct{}
	outgoingChan chan domain.StateMessage
}

// NewGameSession creates a new game session
func NewGameSession(gameID string, game domain.Game) *GameSession {
	return &GameSession{
		gameID:       gameID,
		game:         game,
		actionChan:   make(chan domain.ActionMessage, 16),
		quit:         make(chan struct{}, 1),
		done:         make(chan struct{}, 1),
		outgoingChan: make(chan domain.StateMessage, 16),
	}
}

// Run starts the game session's event loop (should be run in a goroutine)
// This is the single-owner actor pattern - only this goroutine touches game state
func (s *GameSession) Run() {
	defer close(s.done)

	log.Printf("[Session %s] Game session started for %s", s.gameID, s.game.GameType())

	for {
		select {
		case action := <-s.actionChan:
			s.handleAction(action)

		case <-s.quit:
			log.Printf("[Session %s] Game session shutting down", s.gameID)
			return
		}
	}
}

// handleAction processes a player action
func (s *GameSession) handleAction(msg domain.ActionMessage) {
	log.Printf("[Session %s] Action from player %s: %s", s.gameID, msg.PlayerID, msg.Request.FunctionName)

	// Let the game handle the action
	errResponse := s.game.HandleAction(msg)

	if errResponse != nil {
		// Send error only to the player who sent the invalid action
		s.outgoingChan <- domain.StateMessage{
			PlayerID: msg.PlayerID,
			Response: protocol.Response{
				MessageType: protocol.MessageTypeError,
				Parameters:  errResponse.Parameters,
			},
		}
		return
	}

	for _, stateMsg := range s.game.GetStateForAll() {
		s.outgoingChan <- stateMsg
	}
}

// ActionChannel returns the channel for sending actions to this session
func (s *GameSession) ActionChannel() chan<- domain.ActionMessage {
	return s.actionChan
}

// Shutdown gracefully stops the game session
func (s *GameSession) Shutdown() {
	close(s.quit)
	<-s.done // Wait for goroutine to finish
}
