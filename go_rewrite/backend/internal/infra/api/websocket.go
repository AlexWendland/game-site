package api

import (
	"net/http"
	"strings"

	"github.com/AlexWendland/games-site/internal/app"
	"github.com/coder/websocket"
)

// WebSocketHandler handles WebSocket connections using a registry
type WebSocketHandler struct {
	registry    *app.Registry
	authService interface {
		ValidateToken(token string) (userID string, err error)
	}
}

// NewWebSocketHandler creates a new WebSocket handler
func NewWebSocketHandler(registry *app.Registry, authService interface {
	ValidateToken(token string) (userID string, err error)
}) *WebSocketHandler {
	return &WebSocketHandler{
		registry:    registry,
		authService: authService,
	}
}

// ServeHTTP handles incoming WebSocket connections
// Expects URL pattern: /game/{game_id}/ws?token=xxx
func (h *WebSocketHandler) ServeHTTP(writer http.ResponseWriter, request *http.Request) {
	// Extract game_id from URL path: /game/{game_id}/ws
	gameID := extractGameID(request.URL.Path)
	if gameID == "" {
		http.Error(writer, "Invalid game ID", http.StatusBadRequest)
		return
	}

	// Authenticate user via token
	token := request.URL.Query().Get("token")
	if token == "" {
		http.Error(writer, "Missing authentication token", http.StatusUnauthorized)
		return
	}

	_, err := h.authService.ValidateToken(token)
	if err != nil {
		http.Error(writer, "Invalid or expired token", http.StatusUnauthorized)
		return
	}

	// Get game session
	_, err = h.registry.Get(gameID)
	if err != nil {
		http.Error(writer, "Game not found", http.StatusNotFound)
		return
	}

	// Accept WebSocket connection
	conn, err := websocket.Accept(writer, request, nil)
	if err != nil {
		return
	}

	// TODO: Implement proper read/write loops with authenticated userID
	// For now, just close the connection
	conn.Close(websocket.StatusNormalClosure, "Auth implemented, game logic TODO")
}

// extractGameID parses the game ID from the URL path
// Expected format: /game/{game_id}/ws
func extractGameID(path string) string {
	// Remove leading/trailing slashes
	path = strings.Trim(path, "/")

	// Split by '/'
	parts := strings.Split(path, "/")

	// Expected: ["game", "{game_id}", "ws"]
	if len(parts) >= 2 && parts[0] == "game" {
		return parts[1]
	}

	return ""
}

// TODO: Implement WebSocket loops when game logic is ready
// readLoop reads messages from the WebSocket and processes game actions
// func (h *WebSocketHandler) readLoop(ctx context.Context, conn *websocket.Conn, gameSession *app.GameSession) {
// 	for {
// 		_, msg, err := conn.Read(ctx)
// 		if err != nil {
// 			return
// 		}
// 		// Parse and handle game messages
// 		_ = msg
// 	}
// }

// writeLoop writes game state updates to the WebSocket
// func (h *WebSocketHandler) writeLoop(ctx context.Context, conn *websocket.Conn, gameSession *app.GameSession) {
// 	for {
// 		select {
// 		case <-ctx.Done():
// 			return
// 		}
// 	}
// }
