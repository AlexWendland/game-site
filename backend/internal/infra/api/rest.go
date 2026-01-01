package api

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"strings"

	"github.com/AlexWendland/games-site/internal/app"
	"github.com/AlexWendland/games-site/internal/domain/games/tictactoe"
	player_mapping "github.com/AlexWendland/games-site/internal/domain/player_mappings"
	"github.com/AlexWendland/games-site/internal/infra/auth"
	"github.com/AlexWendland/games-site/protocol"
)

type RESTHandler struct {
	registry    *app.Registry
	authService *auth.Service
}

func NewRESTHandler(registry *app.Registry, authService *auth.Service) *RESTHandler {
	return &RESTHandler{
		registry:    registry,
		authService: authService,
	}
}

// ServeHTTP routes REST API requests to the appropriate handler.
func (h *RESTHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Validate authentication token
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		http.Error(w, "Missing authorization token", http.StatusUnauthorized)
		return
	}

	var token string
	if strings.HasPrefix(authHeader, "Bearer ") {
		token = strings.TrimPrefix(authHeader, "Bearer ")
	} else {
		http.Error(w, "Invalid authorization header", http.StatusUnauthorized)
		return
	}

	_, err := h.authService.ValidateToken(token)
	if err != nil {
		http.Error(w, "Invalid or expired token", http.StatusUnauthorized)
		return
	}

	path := r.URL.Path

	// Route based on path
	switch {
	case path == "/api/new_game/tictactoe":
		h.HandleNewTicTacToe(w, r)
	case strings.HasSuffix(path, "/metadata"):
		h.HandleGameMetadata(w, r)
	case strings.HasSuffix(path, "/models"):
		h.HandleGameModels(w, r)
	default:
		http.Error(w, "Not found", http.StatusNotFound)
	}
}

// HandleNewTicTacToe creates a new Tic Tac Toe game
// POST /api/new_game/tictactoe.
func (h *RESTHandler) HandleNewTicTacToe(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	gameID := h.registry.GenerateUniqueGameID()

	// Create a logger with session context
	logger := slog.With(
		"session_id", gameID,
		"game_type", "tictactoe",
	)

	logger.Info("Creating new game")

	game := tictactoe.NewTicTacToeGame(logger)
	playerMapping := player_mapping.NewPlayerPositionMapping(2, h.authService)

	_, err := h.registry.Create(gameID, game, playerMapping, logger)
	if err != nil {
		logger.Error("Failed to create game", "error", err.Error())
		http.Error(w, "Failed to create game", http.StatusInternalServerError)
		return
	}

	logger.Info("Game created successfully")

	response := protocol.SimpleResponse{
		MessageType: protocol.MessageTypeSimple,
		Parameters: protocol.SimpleParameters{
			Message: gameID,
		},
	}
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(response); err != nil {
		slog.Error("Failed to encode response", "error", err)
	}
}

// HandleGameMetadata returns metadata for a specific game
// GET /api/game/{game_id}/metadata.
func (h *RESTHandler) HandleGameMetadata(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	gameID := extractGameIDFromPath(r.URL.Path, "/metadata")
	if gameID == "" {
		http.Error(w, "Invalid game ID", http.StatusBadRequest)
		return
	}

	session, err := h.registry.Get(gameID)
	if err != nil {
		http.Error(w, "Game not found", http.StatusNotFound)
		return
	}

	metadata := session.GetMetadata()
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(metadata); err != nil {
		slog.Error("Failed to encode metadata", "error", err)
	}
}

// HandleGameModels returns available AI models for a specific game
// GET /api/game/{game_id}/models.
func (h *RESTHandler) HandleGameModels(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	gameID := extractGameIDFromPath(r.URL.Path, "/models")
	if gameID == "" {
		http.Error(w, "Invalid game ID", http.StatusBadRequest)
		return
	}

	session, err := h.registry.Get(gameID)
	if err != nil {
		http.Error(w, "Game not found", http.StatusNotFound)
		return
	}

	aiTypes := session.AITypes()
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(aiTypes); err != nil {
		slog.Error("Failed to encode AI types", "error", err)
	}
}

// extractGameIDFromPath extracts game ID from paths like /api/game/{game_id}/metadata.
func extractGameIDFromPath(path string, suffix string) string {
	path = strings.TrimSuffix(path, suffix)
	path = strings.Trim(path, "/")
	parts := strings.Split(path, "/")

	// Expected: ["api", "game", "{game_id}"]
	if len(parts) >= 3 && parts[0] == "api" && parts[1] == "game" {
		return parts[2]
	}

	return ""
}
