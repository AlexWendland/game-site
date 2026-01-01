package app

import (
	"log/slog"

	"github.com/AlexWendland/games-site/internal/domain"
	"github.com/AlexWendland/games-site/protocol"
)

// GameSession is an actor that manages a single game instance
// It owns the game state and processes actions sequentially via channels.
type GameSession struct {
	gameID        string
	game          domain.Game
	playerMapping domain.PlayerMapping
	actionChan    chan domain.ActionMessage // Used to send actions to the game
	quit          chan struct{}             // Used to abort the game
	done          chan struct{}             // Used to notify others the game is done
	outgoingChan  chan domain.StateMessage  // Used to send updates to game participants
	logger        *slog.Logger
}

// NewGameSession creates a new game session.
func NewGameSession(gameID string, game domain.Game, playerMapping domain.PlayerMapping, logger *slog.Logger) *GameSession {
	return &GameSession{
		gameID:        gameID,
		game:          game,
		playerMapping: playerMapping,
		actionChan:    make(chan domain.ActionMessage, 16),
		quit:          make(chan struct{}, 1),
		done:          make(chan struct{}, 1),
		outgoingChan:  make(chan domain.StateMessage, 16),
		logger:        logger,
	}
}

// Run starts the game session's event loop (should be run in a goroutine)
// This is the single-owner actor pattern - only this goroutine touches game state.
func (s *GameSession) Run() {
	// Close the done channel when the game session is over.
	defer close(s.done)

	s.logger.Info("Game session started")

	for {
		select {
		case action := <-s.actionChan:
			s.handleAction(action)

		case <-s.quit:
			s.logger.Info("Game session shutting down")
			return
		}
	}
}

// handleAction processes a player action.
func (s *GameSession) handleAction(msg domain.ActionMessage) {
	s.logger.Debug("Action received",
		"player_id", msg.PlayerID,
		"request_type", msg.Request.RequestType,
		"function", msg.Request.FunctionName)

	switch msg.Request.RequestType {
	case protocol.RequestTypeSession:
		s.handleSessionMessage(msg)

	case protocol.RequestTypeAI:
		s.handleAIMessage(msg)

	case protocol.RequestTypeGame:
		s.handleGameMessage(msg)

	default:
		s.logger.Warn("Unknown request type",
			"request_type", msg.Request.RequestType,
			"player_id", msg.PlayerID)
		s.sendError(msg.PlayerID, "Unknown request type")
	}
}

// handleSessionMessage processes session-related messages (join, leave, etc.)
func (s *GameSession) handleSessionMessage(msg domain.ActionMessage) {
	s.logger.Debug("Handling session message",
		"player_id", msg.PlayerID,
		"function", msg.Request.FunctionName)

	// Delegate to player mapping
	if err := s.playerMapping.HandleSessionEvent(msg.PlayerID, msg.Request); err != nil {
		s.logger.Debug("Session event failed",
			"player_id", msg.PlayerID,
			"error", err.Error())
		s.sendError(msg.PlayerID, err.Error())
		return
	}

	s.logger.Info("Session event processed",
		"player_id", msg.PlayerID,
		"function", msg.Request.FunctionName)

	// Broadcast updated session state to everyone
	for _, stateMsg := range s.playerMapping.GetSessionStateForAll() {
		s.outgoingChan <- stateMsg
	}
}

// handleAIMessage processes AI-related messages (add AI, remove AI, etc.)
func (s *GameSession) handleAIMessage(msg domain.ActionMessage) {
	s.logger.Debug("Handling AI message",
		"player_id", msg.PlayerID,
		"function", msg.Request.FunctionName)

	AIType, ok := msg.Request.Parameters["ai_type"].(string)

	if !ok {
		s.logger.Debug("Missing or invalid ai_type parameter", "player_id", msg.PlayerID)
		s.sendError(msg.PlayerID, "Missing or invalid ai_type parameter")
		return
	}

	if _, exists := s.game.AITypes()[AIType]; !exists {
		s.logger.Debug("AI type not supported",
			"player_id", msg.PlayerID,
			"ai_type", AIType)
		s.sendError(msg.PlayerID, "AI type not supported")
		return
	}

	// For now, delegate to player mapping (AI players are treated as special positions)
	if err := s.playerMapping.HandleSessionEvent(msg.PlayerID, msg.Request); err != nil {
		s.logger.Debug("AI event failed",
			"player_id", msg.PlayerID,
			"error", err.Error())
		s.sendError(msg.PlayerID, err.Error())
		return
	}

	s.logger.Info("AI added",
		"player_id", msg.PlayerID,
		"ai_type", AIType)

	// At this point we know the position is free and AI type is valid.
	// TODO: Start AI goroutine for the new AI player

	// Broadcast updated session state to everyone
	for _, stateMsg := range s.playerMapping.GetSessionStateForAll() {
		s.outgoingChan <- stateMsg
	}
}

// handleGameMessage processes game-related messages (moves, actions, etc.)
func (s *GameSession) handleGameMessage(msg domain.ActionMessage) {
	s.logger.Debug("Handling game message",
		"player_id", msg.PlayerID,
		"function", msg.Request.FunctionName)

	// Translate userID to position
	position, ok := s.playerMapping.GetPlayerPosition(msg.PlayerID)
	if !ok {
		s.logger.Debug("Player not in playing position", "player_id", msg.PlayerID)
		s.sendError(msg.PlayerID, "You are not in a playing position")
		return
	}

	// Let the game handle the action
	errResponse := s.game.HandleAction(position, msg.Request)

	if errResponse != nil {
		s.logger.Debug("Game action failed",
			"player_id", msg.PlayerID,
			"position", position,
			"error", errResponse.Parameters)
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

	s.logger.Debug("Game action successful",
		"player_id", msg.PlayerID,
		"position", position)

	// Broadcast game state to all players
	for _, stateMsg := range s.game.GetStateForAll() {
		s.outgoingChan <- stateMsg
	}
}

// sendError sends an error message to a specific player.
func (s *GameSession) sendError(playerID string, errorMessage string) {
	s.logger.Debug("Sending error to player",
		"player_id", playerID,
		"error_message", errorMessage)

	s.outgoingChan <- domain.StateMessage{
		PlayerID: playerID,
		Response: protocol.Response{
			MessageType: protocol.MessageTypeError,
			Parameters: protocol.ErrorParameters{
				ErrorMessage: errorMessage,
			},
		},
	}
}

func (s *GameSession) ActionChannel() chan<- domain.ActionMessage {
	return s.actionChan
}

func (s *GameSession) OutgoingChannel() <-chan domain.StateMessage {
	return s.outgoingChan
}

func (s *GameSession) Shutdown() {
	close(s.quit)
	<-s.done // Wait for goroutine to finish
}

// GetMetadata returns the game metadata.
func (s *GameSession) GetMetadata() any {
	return s.game.GetMetadata()
}

// AITypes returns all valid AI types as a list.
func (s *GameSession) AITypes() map[string]string {
	return s.game.AITypes()
}
