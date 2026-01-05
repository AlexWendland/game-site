package api

import (
	"context"
	"log/slog"
	"net/http"
	"strings"

	"github.com/AlexWendland/games-site/backend/internal"
	"github.com/coder/websocket"
)

// WebSocketHandler handles WebSocket connections using a registry.
type WebSocketHandler struct {
	registry         *internal.Registry
	tokenAuthService internal.TokenAuthService
	production       bool
}

// NewWebSocketHandler creates a new WebSocket handler.
func NewWebSocketHandler(registry *internal.Registry, tokenAuthService internal.TokenAuthService, production bool) *WebSocketHandler {
	return &WebSocketHandler{
		registry:         registry,
		tokenAuthService: tokenAuthService,
		production:       production,
	}
}

// ServeHTTP handles incoming WebSocket connections
// Expects URL pattern: /ws/game/{game_id}?token=xxx
// Token can be either a WebSocket token (from /auth/ws-token) or a regular auth token (legacy).
func (h *WebSocketHandler) ServeHTTP(writer http.ResponseWriter, request *http.Request) {
	gameID := extractGameID(request.URL.Path)
	if gameID == "" {
		slog.Debug("WebSocket connection rejected - invalid game ID", "url", request.URL.String())
		http.Error(writer, "Invalid game ID", http.StatusBadRequest)
		return
	}

	token := request.URL.Query().Get("token")
	if token == "" {
		slog.Debug("WebSocket connection rejected - missing token",
			"game_id", gameID,
			"url", request.URL.String())
		http.Error(writer, "Missing authentication token", http.StatusUnauthorized)
		return
	}

	userID, err := h.tokenAuthService.ValidateWSToken(token, gameID)
	if err != nil {
		slog.Debug("WebSocket connection rejected - invalid WS token",
			"game_id", gameID,
			"error", err.Error())
		http.Error(writer, "Invalid or expired WebSocket token", http.StatusUnauthorized)
		return
	}

	slog.Debug("WebSocket token validated successfully",
		"game_id", gameID,
		"user_id", userID)

	gameSession, err := h.registry.Get(gameID)
	if err != nil {
		slog.Debug("WebSocket connection rejected - game not found",
			"game_id", gameID,
			"user_id", userID)
		http.Error(writer, "Game not found", http.StatusNotFound)
		return
	}

	logger := slog.With(
		"game_id", gameID,
		"user_id", userID,
		"component", "websocket",
	)

	// Configure WebSocket accept options
	// In development, skip origin verification to allow localhost:3000
	// In production, enforce strict origin checking
	acceptOptions := &websocket.AcceptOptions{
		InsecureSkipVerify: !h.production,
	}
	conn, err := websocket.Accept(writer, request, acceptOptions)
	if err != nil {
		logger.Error("Failed to accept WebSocket connection", "error", err.Error())
		return
	}
	defer func() {
		if err := conn.Close(websocket.StatusNormalClosure, "Connection closed"); err != nil {
			logger.Debug("Error closing WebSocket connection", "error", err.Error())
		}
	}()

	logger.Info("WebSocket connection established")

	// Child context of the request context for the read/write loops
	ctx, cancel := context.WithCancel(request.Context())
	defer cancel()

	go h.readLoop(ctx, conn, gameSession, userID, logger)
	h.writeLoop(ctx, conn, gameSession, userID, logger)

	logger.Info("WebSocket connection closed")
}

// extractGameID parses the game ID from the URL path
// Expected format: /ws/game/{game_id}.
func extractGameID(path string) string {
	// Remove leading/trailing slashes
	path = strings.Trim(path, "/")

	// Split by '/'
	parts := strings.Split(path, "/")

	// Expected: ["ws", "game", "{game_id}"]
	if len(parts) >= 3 && parts[0] == "ws" && parts[1] == "game" {
		return parts[2]
	}

	return ""
}

func (h *WebSocketHandler) readLoop(ctx context.Context, conn *websocket.Conn, gameExecutor internal.GameExecutor, userID string, logger *slog.Logger) {
	logger.Debug("Read loop started")
	for {
		// Read raw message from WebSocket
		_, msg, err := conn.Read(ctx)

		if err != nil {
			logger.Debug("Read loop ended", "error", err.Error())
			return
		}

		logger.Debug("WebSocket message received", "raw_message", string(msg))

		gameExecutor.ActionChannel() <- internal.TaggedMessage{
			UserID:     userID,
			RawMessage: msg,
		}
	}
}

func (h *WebSocketHandler) writeLoop(ctx context.Context, conn *websocket.Conn, gameExecutor internal.GameExecutor, userID string, logger *slog.Logger) {
	logger.Debug("Write loop started")
	for {
		select {
		case <-ctx.Done():
			logger.Debug("Write loop ended - context done")
			return
		case stateMsg := <-gameExecutor.OutgoingChannel():
			logger.Debug("State message received from game session",
				"target_player_id", stateMsg.UserID)

			if stateMsg.UserID == "" || stateMsg.UserID == userID {
				logger.Debug("Sending message to WebSocket client",
					"message", string(stateMsg.RawMessage))

				// Send raw message directly to WebSocket
				if err := conn.Write(ctx, websocket.MessageText, stateMsg.RawMessage); err != nil {
					logger.Debug("Write loop ended - write error", "error", err.Error())
					return
				}

				logger.Debug("Message sent successfully")
			} else {
				logger.Debug("Skipping message - not for this user",
					"target_player_id", stateMsg.UserID)
			}
		}
	}
}
