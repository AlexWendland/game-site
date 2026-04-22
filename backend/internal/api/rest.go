package api

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"strings"

	"github.com/AlexWendland/games-site/backend/internal"
	"github.com/AlexWendland/games-site/backend/internal/auth"
	"github.com/AlexWendland/games-site/backend/internal/games/tictactoe"
	"github.com/AlexWendland/games-site/backend/internal/utils"
	"github.com/AlexWendland/games-site/backend/proto"
	"google.golang.org/protobuf/encoding/protojson"
)

// writeJSON sends a JSON response with the given status code and payload.
func writeJSON(logger *slog.Logger, w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		logger.Error("Failed to encode response", "error", err)
	}
}

type RESTHandler struct {
	registry    *internal.Registry
	authService *auth.Service
}

func NewRESTHandler(registry *internal.Registry, authService *auth.Service) *RESTHandler {
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
	logger := GetLogger(r).With("game_type", "tictactoe")

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	logger.Info("Creating new TicTacToe game")

	// Create game and player mapping
	game := tictactoe.NewTicTacToeGame(logger)
	playerMapping := utils.NewPlayerPositionMapping(2, h.authService)

	// Create TicTacToe session (without gameID yet)
	session := tictactoe.NewTicTacToeSession("", game, &playerMapping)

	// Register the session (registry generates and returns gameID)
	gameID, err := h.registry.Register(session)
	if err != nil {
		logger.Error("Failed to register game session", "error", err.Error())
		http.Error(w, "Failed to create game", http.StatusInternalServerError)
		return
	}

	// Update logger with gameID
	logger = logger.With("game_id", gameID)

	// Start the session's event loop
	go session.Run(logger)

	logger.Info("Game created successfully")

	// Return gameID as CreateTicTacToeGameResponse using protobuf
	response := &proto.CreateTicTacToeGameResponse{
		GameId: gameID,
	}

	jsonData, err := protojson.Marshal(response)
	if err != nil {
		logger.Error("Failed to marshal response", "error", err.Error())
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	if _, err := w.Write(jsonData); err != nil {
		logger.Error("Failed to write response", "error", err.Error())
	}
}

// HandleGameMetadata returns metadata for a specific game
// GET /api/game/{game_id}/metadata.
func (h *RESTHandler) HandleGameMetadata(w http.ResponseWriter, r *http.Request) {
	logger := GetLogger(r)
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	gameID := extractGameIDFromPath(r.URL.Path, "/metadata")
	logger = logger.With("game_id", gameID)
	if gameID == "" {
		http.Error(w, "Invalid game ID", http.StatusBadRequest)
		logger.Debug("Invalid game ID")
		return
	}

	session, err := h.registry.Get(gameID)
	if err != nil {
		http.Error(w, "Game not found", http.StatusNotFound)
		logger.Debug("Game not found")
		return
	}

	metadata := session.GetMetadata()

	// Use protojson to properly handle protobuf naming conventions
	jsonData, err := protojson.Marshal(&metadata)
	if err != nil {
		logger.Error("Failed to marshal metadata", "error", err.Error())
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	if _, err := w.Write(jsonData); err != nil {
		logger.Error("Failed to write response", "error", err.Error())
	}
}

// HandleGameModels returns available AI models for a specific game
// GET /api/game/{game_id}/models.
func (h *RESTHandler) HandleGameModels(w http.ResponseWriter, r *http.Request) {
	logger := GetLogger(r)
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	gameID := extractGameIDFromPath(r.URL.Path, "/models")
	logger = logger.With("game_id", gameID)
	if gameID == "" {
		http.Error(w, "Invalid game ID", http.StatusBadRequest)
		logger.Debug("Invalid game ID")
		return
	}

	session, err := h.registry.Get(gameID)
	if err != nil {
		http.Error(w, "Game not found", http.StatusNotFound)
		logger.Debug("Game not found")
		return
	}

	// TODO: De-jankify this.
	// Return models based on game type
	var models map[string]string
	switch session.GameType() {
	case "tictactoe":
		models = map[string]string{
			"easy":   "Easy",
			"medium": "Medium",
			"hard":   "Hard",
		}
	default:
		models = map[string]string{}
	}

	writeJSON(logger, w, models)
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
