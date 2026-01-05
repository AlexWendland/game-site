package tictactoe

//
// import (
//	"log/slog"
//
//	"github.com/AlexWendland/games-site/backend/internal/utils"
//	pb "github.com/AlexWendland/games-site/backend/proto"
//	"google.golang.org/protobuf/encoding/protojson"
// )
//
// // TicTacToeSession is a game session that handles TicTacToe-specific messages.
// // It implements the domain.Session interface.
// type TicTacToeSession struct {
//	gameID        string
//	game          *TicTacToeGame
//	playerMapping utils.PlayerMapping
//	actionChan    chan domain.ActionMessage
//	quit          chan struct{}
//	done          chan struct{}
//	outgoingChan  chan domain.StateMessage
//	logger        *slog.Logger
// }
//
// // NewTicTacToeSession creates a new TicTacToe session.
// func NewTicTacToeSession(gameID string, game *TicTacToeGame, playerMapping domain.PlayerMapping, logger *slog.Logger) *TicTacToeSession {
//	return &TicTacToeSession{
//		gameID:        gameID,
//		game:          game,
//		playerMapping: playerMapping,
//		actionChan:    make(chan domain.ActionMessage, 16),
//		quit:          make(chan struct{}, 1),
//		done:          make(chan struct{}, 1),
//		outgoingChan:  make(chan domain.StateMessage, 16),
//		logger:        logger,
//	}
// }
//
// // ActionChannel returns the action channel for this session.
// func (s *TicTacToeSession) ActionChannel() chan<- domain.ActionMessage {
//	return s.actionChan
// }
//
// // OutgoingChannel returns the outgoing message channel for this session.
// func (s *TicTacToeSession) OutgoingChannel() <-chan domain.StateMessage {
//	return s.outgoingChan
// }
//
// // Run starts the session's event loop (should be run in a goroutine).
// func (s *TicTacToeSession) Run() {
//	defer close(s.done)
//	s.logger.Info("TicTacToe session started")
//
//	for {
//		select {
//		case action := <-s.actionChan:
//			s.handleAction(action)
//
//		case <-s.quit:
//			s.logger.Info("TicTacToe session shutting down")
//			return
//		}
//	}
// }
//
// // Shutdown gracefully stops the session.
// func (s *TicTacToeSession) Shutdown() {
//	close(s.quit)
//	<-s.done // Wait for goroutine to finish
// }
//
// // GetMetadata returns the game metadata.
// func (s *TicTacToeSession) GetMetadata() any {
//	return s.game.GetMetadata()
// }
//
// // AITypes returns all valid AI types for this game.
// func (s *TicTacToeSession) AITypes() map[string]string {
//	return s.game.AITypes()
// }
//
// // handleAction processes a player action by unmarshaling the protobuf message
// // and routing it to the appropriate handler.
// func (s *TicTacToeSession) handleAction(action domain.ActionMessage) {
//	s.logger.Debug("Action received", "player_id", action.PlayerID)
//
//	// Unmarshal to TicTacToe-specific protobuf message
//	clientMsg := &pb.ClientTicTacToeWebsocketMessage{}
//	if err := protojson.Unmarshal(action.RawJSON, clientMsg); err != nil {
//		s.logger.Warn("Failed to unmarshal client message",
//			"player_id", action.PlayerID,
//			"error", err.Error())
//		s.sendError(action.PlayerID, "Invalid message format")
//		return
//	}
//
//	// Type-safe routing based on oneof variant
//	switch m := clientMsg.Message.(type) {
//	case *pb.ClientTicTacToeWebsocketMessage_MakeMove:
//		s.handleMakeMove(action.PlayerID, m.MakeMove)
//
//	case *pb.ClientTicTacToeWebsocketMessage_SetPlayerPosition:
//		s.handleSetPlayerPosition(action.PlayerID, m.SetPlayerPosition)
//
//	case *pb.ClientTicTacToeWebsocketMessage_LeavePlayerPosition:
//		s.handleLeavePlayerPosition(action.PlayerID, m.LeavePlayerPosition)
//
//	case *pb.ClientTicTacToeWebsocketMessage_AddAiPlayer:
//		s.handleAddAIPlayer(action.PlayerID, m.AddAiPlayer)
//
//	case *pb.ClientTicTacToeWebsocketMessage_RemoveAiPlayer:
//		s.handleRemoveAIPlayer(action.PlayerID, m.RemoveAiPlayer)
//
//	default:
//		s.logger.Warn("Unknown message type", "player_id", action.PlayerID)
//		s.sendError(action.PlayerID, "Unknown message type")
//	}
// }
//
// // handleMakeMove processes a make move request.
// func (s *TicTacToeSession) handleMakeMove(playerID string, req *pb.MakeMoveRequest) {
//	s.logger.Debug("Handling make move", "player_id", playerID, "position", req.Position)
//
//	// Translate userID to position
//	position, ok := s.playerMapping.GetPlayerPosition(playerID)
//	if !ok {
//		s.logger.Debug("Player not in playing position", "player_id", playerID)
//		s.sendError(playerID, "You are not in a playing position")
//		return
//	}
//
//	// Let the game handle the move (pass position as int directly)
//	if errResp := s.game.makeMove(position, int(req.Position)); errResp != nil {
//		s.logger.Debug("Move failed", "player_id", playerID, "error", errResp.Parameters.ErrorMessage)
//		s.sendErrorResponse(playerID, errResp.Parameters.ErrorMessage)
//		return
//	}
//
//	s.logger.Debug("Move successful", "player_id", playerID)
//
//	// Broadcast game state to all players
//	s.broadcastGameState()
// }
//
// // handleSetPlayerPosition processes a set player position request.
// func (s *TicTacToeSession) handleSetPlayerPosition(playerID string, req *pb.SetPlayerPositionRequest) {
//	s.logger.Debug("Handling set player position", "player_id", playerID, "position", req.Position)
//
//	// TODO: Delegate to player mapping with protobuf message
//	// For now, send error
//	s.sendError(playerID, "Set player position not yet implemented with protobuf")
// }
//
// // handleLeavePlayerPosition processes a leave player position request.
// func (s *TicTacToeSession) handleLeavePlayerPosition(playerID string, req *pb.LeavePlayerPositionRequest) {
//	s.logger.Debug("Handling leave player position", "player_id", playerID)
//
//	// TODO: Delegate to player mapping with protobuf message
//	s.sendError(playerID, "Leave player position not yet implemented with protobuf")
// }
//
// // handleAddAIPlayer processes an add AI player request.
// func (s *TicTacToeSession) handleAddAIPlayer(playerID string, req *pb.TicTacToeAddAIPlayerInPositionRequest) {
//	s.logger.Debug("Handling add AI player",
//		"player_id", playerID,
//		"position", req.Position,
//		"model", req.Model)
//
//	// TODO: Delegate to player mapping and validate AI type
//	s.sendError(playerID, "Add AI player not yet implemented with protobuf")
// }
//
// // handleRemoveAIPlayer processes a remove AI player request.
// func (s *TicTacToeSession) handleRemoveAIPlayer(playerID string, req *pb.RemoveAIPlayerInPositionRequest) {
//	s.logger.Debug("Handling remove AI player", "player_id", playerID, "position", req.Position)
//
//	// TODO: Delegate to player mapping
//	s.sendError(playerID, "Remove AI player not yet implemented with protobuf")
// }
//
// // broadcastGameState sends the current game state to all players.
// func (s *TicTacToeSession) broadcastGameState() {
//	// Create protobuf game state message
//	serverMsg := &pb.ServerTicTacToeWebsocketMessage{
//		Message: &pb.ServerTicTacToeWebsocketMessage_GameState{
//			GameState: &pb.TicTacToeGameState{
//				Board:       s.game.board[:],
//				Winner:      s.game.winner,
//				WinningLine: s.game.winningLine,
//			},
//		},
//	}
//
//	// Marshal to JSON
//	jsonData, err := protojson.Marshal(serverMsg)
//	if err != nil {
//		s.logger.Error("Failed to marshal game state", "error", err.Error())
//		return
//	}
//
//	// Broadcast to all players
//	s.outgoingChan <- domain.StateMessage{
//		PlayerID: "", // Empty = broadcast
//		RawJSON:  jsonData,
//	}
// }
//
// // sendError sends an error message to a specific player.
// func (s *TicTacToeSession) sendError(playerID string, errorMessage string) {
//	s.sendErrorResponse(playerID, errorMessage)
// }
//
// // sendErrorResponse sends an error message to a specific player.
// func (s *TicTacToeSession) sendErrorResponse(playerID string, errorMessage string) {
//	serverMsg := &pb.ServerTicTacToeWebsocketMessage{
//		Message: &pb.ServerTicTacToeWebsocketMessage_Error{
//			Error: &pb.ErrorResponse{
//				ErrorMessage: errorMessage,
//			},
//		},
//	}
//
//	jsonData, err := protojson.Marshal(serverMsg)
//	if err != nil {
//		s.logger.Error("Failed to marshal error response", "error", err.Error())
//		return
//	}
//
//	s.outgoingChan <- domain.StateMessage{
//		PlayerID: playerID,
//		RawJSON:  jsonData,
//	}
// }
