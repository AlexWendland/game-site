package tictactoe

import (
	"fmt"
	"log/slog"
	"sync"

	"github.com/AlexWendland/games-site/backend/internal"
	"github.com/AlexWendland/games-site/backend/internal/utils"
	"github.com/AlexWendland/games-site/backend/proto"
	"github.com/google/uuid"
	"google.golang.org/protobuf/encoding/protojson"
)

type TicTacToeSession struct {
	game          *TicTacToeGame
	playerMapping *utils.PlayerPositionMapping
	actionChan    chan internal.TaggedMessage
	outgoingChan  chan internal.TaggedMessage
	quit          chan struct{}
	done          chan struct{}
	// Map from connectionID (userID:connID) to output channel
	userChannels map[string]chan internal.TaggedMessage
	userMutex    sync.Mutex
	aiModels     map[string]TicTacToeAI
}

func NewTicTacToeSession(gameID string, game *TicTacToeGame, playerMapping *utils.PlayerPositionMapping) *TicTacToeSession {
	return &TicTacToeSession{
		game:          game,
		playerMapping: playerMapping,
		actionChan:    make(chan internal.TaggedMessage, 16),
		quit:          make(chan struct{}, 1),
		done:          make(chan struct{}, 1),
		outgoingChan:  make(chan internal.TaggedMessage, 16),
		userChannels:  make(map[string]chan internal.TaggedMessage),
		aiModels:      make(map[string]TicTacToeAI),
	}
}

func (s *TicTacToeSession) ActionChannel() chan<- internal.TaggedMessage {
	return s.actionChan
}

// generateConnectionID creates a unique connection ID for a user
// Must be called while holding userMutex
func (s *TicTacToeSession) generateConnectionID(userID string) string {
	for {
		connID := uuid.New().String()[:8]
		connectionKey := fmt.Sprintf("%s:%s", userID, connID)
		if _, exists := s.userChannels[connectionKey]; !exists {
			return connID
		}
	}
}

func (s *TicTacToeSession) Register(logger *slog.Logger, userID string) (string, <-chan internal.TaggedMessage, error) {
	s.userMutex.Lock()
	defer s.userMutex.Unlock()

	// Generate unique connection ID
	connID := s.generateConnectionID(userID)
	connectionKey := fmt.Sprintf("%s:%s", userID, connID)

	logger.Debug("Registering connection", "user_id", userID, "connection_id", connID)

	outputChannel := make(chan internal.TaggedMessage, 16)
	s.userChannels[connectionKey] = outputChannel
	s.playerMapping.MarkConnected(logger, userID)
	s.broadcastGameState(logger)
	logger.Info("User connected", "user_id", userID, "connection_id", connID)
	return connID, outputChannel, nil
}

func (s *TicTacToeSession) Unregister(logger *slog.Logger, userID string, connID string) error {
	s.userMutex.Lock()
	defer s.userMutex.Unlock()

	connectionKey := fmt.Sprintf("%s:%s", userID, connID)
	outputChannel, exists := s.userChannels[connectionKey]
	if !exists {
		return nil
	}
	close(outputChannel)
	delete(s.userChannels, connectionKey)

	// Only mark disconnected if this was the last connection for this user
	hasOtherConnections := false
	for key := range s.userChannels {
		if len(key) > len(userID) && key[:len(userID)] == userID && key[len(userID)] == ':' {
			hasOtherConnections = true
			break
		}
	}

	if !hasOtherConnections {
		s.playerMapping.MarkDisconnected(logger, userID)
	}

	logger.Info("User disconnected", "user_id", userID, "connection_id", connID)
	return nil
}

// Run starts the session's event loop (should be run in a goroutine).
func (s *TicTacToeSession) Run(logger *slog.Logger) {
	defer close(s.done)
	logger.Info("TicTacToe session started")

	// Start FanOut goroutine - it will also listen to s.quit
	fanOutDone := make(chan struct{})
	go func() {
		defer close(fanOutDone)
		s.fanOut(logger)
	}()

	for {
		select {
		case action := <-s.actionChan:
			s.handleAction(action)

		case <-s.quit:
			logger.Info("TicTacToe session shutting down")
			<-fanOutDone // Wait for FanOut to finish before returning
			logger.Debug("FanOut goroutine finished")
			return
		}
	}
}

// FanOut listens to outgoingChan and routes messages to user channels.
// If userID is blank, broadcasts to all users.
// If userID is set, sends to that specific user.
func (s *TicTacToeSession) fanOut(logger *slog.Logger) {
	logger.Debug("FanOut goroutine started")
	for {
		select {
		case <-s.quit:
			logger.Debug("FanOut stopping - quit signal received")
			return
		case msg := <-s.outgoingChan:
			messageLogger := msg.Logger
			if messageLogger == nil {
				messageLogger = logger
			}
			if msg.UserID == "" {
				// Broadcast to all users
				s.userMutex.Lock()
				for userID, ch := range s.userChannels {
					select {
					case ch <- msg:
						messageLogger.Debug("Broadcast message sent", "receiving_user_id", userID)
					default:
						messageLogger.Warn("Broadcast message dropped - channel full", "receiving_user_id", userID)
					}
				}
				s.userMutex.Unlock()
			} else {
				// Send to specific user (all their connections)
				s.userMutex.Lock()
				sentToAny := false
				// Find all connections for this user
				for connKey, ch := range s.userChannels {
					if len(connKey) > len(msg.UserID) && connKey[:len(msg.UserID)] == msg.UserID && connKey[len(msg.UserID)] == ':' {
						select {
						case ch <- msg:
							messageLogger.Debug("Message sent to user connection", "receiving_user_id", msg.UserID, "connection_key", connKey)
							sentToAny = true
						default:
							messageLogger.Warn("Message dropped - channel full", "receiving_user_id", msg.UserID, "connection_key", connKey)
						}
					}
				}
				s.userMutex.Unlock()

				if !sentToAny {
					messageLogger.Warn("User not registered", "receiving_user_id", msg.UserID)
				}
			}
		}
	}
}

// Shutdown gracefully stops the session.
func (s *TicTacToeSession) Shutdown() {
	// Stop all AI players first
	for _, ai := range s.aiModels {
		ai.Stop()
	}
	close(s.quit)
	<-s.done // Wait for goroutine to finish
}

// GetMetadata returns the game metadata.
func (s *TicTacToeSession) GetMetadata() proto.GameMetadataResponse {
	return proto.GameMetadataResponse{
		Metadata: &proto.GameMetadataResponse_TicTacToeMetadata{
			TicTacToeMetadata: &proto.TicTacToeMetadata{},
		},
	}
}

// handleAction processes a player action by unmarshaling the protobuf message
// and routing it to the appropriate handler.
func (s *TicTacToeSession) handleAction(action internal.TaggedMessage) {
	logger := action.Logger
	logger.Debug("Action received")

	// Unmarshal to TicTacToe-specific protobuf message
	clientMsg := &proto.ClientTicTacToeWebsocketMessage{}
	if err := protojson.Unmarshal(action.RawMessage, clientMsg); err != nil {
		logger.Warn("Failed to unmarshal client message",
			"error", err.Error())
		s.sendErrorResponse(logger, action.UserID, "Invalid message format")
		return
	}

	// Type-safe routing based on oneof variant
	switch m := clientMsg.Message.(type) {
	case *proto.ClientTicTacToeWebsocketMessage_MakeMove:
		s.handleMakeMove(logger, action.UserID, m.MakeMove)

	case *proto.ClientTicTacToeWebsocketMessage_SetPlayerPosition:
		s.handleSetPlayerPosition(logger, action.UserID, m.SetPlayerPosition)

	case *proto.ClientTicTacToeWebsocketMessage_RemovePlayerPosition:
		s.handleRemovePlayerPosition(logger, action.UserID, m.RemovePlayerPosition)

	case *proto.ClientTicTacToeWebsocketMessage_AddAiPlayer:
		s.handleAddAIPlayer(logger, action.UserID, m.AddAiPlayer)

	default:
		logger.Warn("Unknown message type")
		s.sendErrorResponse(logger, action.UserID, "Unknown message type")
	}
}

// handleMakeMove processes a make move request.
func (s *TicTacToeSession) handleMakeMove(logger *slog.Logger, userID string, req *proto.MakeMoveRequest) {
	logger.Debug("Handling make move", "position", req.Position)

	// Translate userID to position
	position, ok := s.playerMapping.GetPlayerPosition(userID)
	if !ok {
		logger.Debug("Player not in playing position")
		s.sendErrorResponse(logger, userID, "You are not in a playing position")
		return
	}

	// Let the game handle the move (pass position as int directly)
	if err := s.game.makeMove(logger, position, int(req.Position)); err != nil {
		logger.Debug("Move failed", "error", err.Error())
		s.sendErrorResponse(logger, userID, err.Error())
		return
	}

	logger.Debug("Move successful")
	s.broadcastGameState(logger)
}

// handleSetPlayerPosition processes a set player position request.
func (s *TicTacToeSession) handleSetPlayerPosition(logger *slog.Logger, userID string, req *proto.SetPlayerPositionRequest) {
	logger.Debug("Handling set player position", "position", req.Position)
	err := s.playerMapping.AddPlayer(logger, userID, "", int(req.Position))
	if err != nil {
		s.sendErrorResponse(logger, userID, err.Error())
		return
	}
	s.broadcastGameState(logger)
}

func (s *TicTacToeSession) handleRemovePlayerPosition(logger *slog.Logger, userID string, req *proto.RemovePlayerPositionRequest) {
	logger.Debug("Handling leave player position")

	// Get the player at the position to remove
	playerAtPosition, exists := s.playerMapping.GetPlayerAtPosition(int(req.Position))
	if !exists {
		s.sendErrorResponse(logger, userID, "No player at that position")
		return
	}

	err := s.playerMapping.RemovePosition(logger, userID, int(req.Position))
	if err != nil {
		s.sendErrorResponse(logger, userID, err.Error())
		return
	}

	// If the player was an AI, stop and clean it up
	if ai, isAI := s.aiModels[playerAtPosition]; isAI {
		logger.Info("Stopping AI player", "ai_user_id", playerAtPosition)
		ai.Stop()
		delete(s.aiModels, playerAtPosition)
		for key := range s.userChannels {
			if len(key) > len(playerAtPosition) && key[:len(playerAtPosition)] == playerAtPosition && key[len(userID)] == ':' {
				connID := key[len(playerAtPosition)+1:]
				if err := s.Unregister(logger, playerAtPosition, connID); err != nil {
					logger.Warn("Failed to unregister AI player", "error", err.Error())
				}
			}
		}
	}

	s.broadcastGameState(logger)
}

// handleAddAIPlayer processes an add AI player request.
func (s *TicTacToeSession) handleAddAIPlayer(logger *slog.Logger, userID string, req *proto.TicTacToeAddAIPlayerInPositionRequest) {
	logger.Debug("Handling add AI player",
		"position", req.Position,
		"model", req.Model)

	aiUserID := s.generateAIUserID(req.Model.String())
	err := s.playerMapping.AddPlayer(logger, aiUserID, req.Model.String(), int(req.Position))
	if err != nil {
		logger.Error("Failed to add AI player to position", "error", err.Error())
		s.sendErrorResponse(logger, userID, err.Error())
		return
	}
	_, outputChannel, err := s.Register(logger, aiUserID)
	if err != nil {
		// We should never hit this path.
		logger.Error("Failed to register AI user", "error", err.Error())
		if removeErr := s.playerMapping.RemovePosition(logger, aiUserID, int(req.Position)); removeErr != nil {
			logger.Warn("Failed to cleanup AI player position", "error", removeErr.Error())
		}
		s.sendErrorResponse(logger, userID, err.Error())
		return
	}

	// Create and start AI in a goroutine
	gameAI := NewTicTacToeAI(aiUserID, req.Model, req.Position, outputChannel, s.actionChan)
	s.aiModels[aiUserID] = gameAI
	go gameAI.Run(logger)

	s.broadcastGameState(logger)
}

// broadcastGameState sends the current game state to all players.
func (s *TicTacToeSession) broadcastGameState(logger *slog.Logger) {
	// Convert board from []int to []int32
	board32 := make([]int32, 9)
	for i, v := range s.game.board {
		// #nosec G115 -- board values are move numbers (0-8), safe conversion
		board32[i] = int32(v)
	}

	// Convert winner from *int to *int32
	var winner32 *int32
	if s.game.winner != nil {
		// #nosec G115 -- winner is player position (0-1), safe conversion
		w := int32(*s.game.winner)
		winner32 = &w
	}

	// Convert winning line from *[3]int to []int32
	var winningLine32 []int32
	if s.game.winningLine != nil {
		// #nosec G115 -- winning line contains board positions (0-8), safe conversion
		winningLine32 = []int32{
			int32(s.game.winningLine[0]),
			int32(s.game.winningLine[1]),
			int32(s.game.winningLine[2]),
		}
	}

	serverMsg := &proto.ServerTicTacToeWebsocketMessage{
		Message: &proto.ServerTicTacToeWebsocketMessage_GameState{
			GameState: &proto.TicTacToeGameState{
				Board:       board32,
				Winner:      winner32,
				WinningLine: winningLine32,
			},
		},
	}

	jsonData, err := protojson.Marshal(serverMsg)
	if err != nil {
		logger.Error("Failed to marshal game state", "error", err.Error())
		return
	}
	s.outgoingChan <- internal.TaggedMessage{
		UserID:     "", // Empty = broadcast
		RawMessage: jsonData,
		Logger:     logger,
	}

	serverMsg = &proto.ServerTicTacToeWebsocketMessage{
		Message: &proto.ServerTicTacToeWebsocketMessage_SessionState{
			SessionState: s.playerMapping.ToProto(),
		},
	}

	jsonData, err = protojson.Marshal(serverMsg)
	if err != nil {
		logger.Error("Failed to marshal session state", "error", err.Error())
		return
	}
	s.outgoingChan <- internal.TaggedMessage{
		UserID:     "", // Empty = broadcast
		RawMessage: jsonData,
		Logger:     logger,
	}
}

// sendErrorResponse sends an error message to a specific player.
func (s *TicTacToeSession) sendErrorResponse(logger *slog.Logger, userID string, errorMessage string) {
	serverMsg := &proto.ServerTicTacToeWebsocketMessage{
		Message: &proto.ServerTicTacToeWebsocketMessage_Error{
			Error: &proto.ErrorResponse{
				ErrorMessage: errorMessage,
			},
		},
	}

	jsonData, err := protojson.Marshal(serverMsg)
	if err != nil {
		logger.Error("Failed to marshal error response", "error", err.Error())
		return
	}

	s.outgoingChan <- internal.TaggedMessage{
		UserID:     userID,
		RawMessage: jsonData,
		Logger:     logger,
	}
}

func (s *TicTacToeSession) GameType() string {
	return "tictactoe"
}

func (s *TicTacToeSession) generateAIUserID(aiType string) string {
	for {
		name := fmt.Sprintf("AI-%s-%s", aiType, uuid.New().String()[:8])
		if _, exists := s.playerMapping.GetPlayerPosition(name); !exists {
			return name
		}
	}
}
