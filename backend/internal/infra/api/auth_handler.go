package api

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"strings"

	"github.com/AlexWendland/games-site/internal/infra/auth"
	"github.com/AlexWendland/games-site/protocol"
)

// AuthHandler handles authentication HTTP requests
type AuthHandler struct {
	authService *auth.Service
}

// NewAuthHandler creates a new auth handler
func NewAuthHandler(authService *auth.Service) *AuthHandler {
	return &AuthHandler{
		authService: authService,
	}
}

// ServeHTTP routes auth requests to the appropriate handler
func (h *AuthHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path

	// Check for ws-token path with game_id parameter
	if strings.HasPrefix(path, "/auth/ws-token/") {
		h.HandleWSToken(w, r)
		return
	}

	switch path {
	case "/auth/register":
		h.HandleRegister(w, r)
	case "/auth/login":
		h.HandleLogin(w, r)
	case "/auth/logout":
		h.HandleLogout(w, r)
	case "/auth/me":
		h.HandleMe(w, r)
	default:
		http.Error(w, "Not found", http.StatusNotFound)
	}
}

// HandleRegister handles user registration
func (h *AuthHandler) HandleRegister(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req protocol.RegisterRequestParams
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(protocol.ErrorResponse{
			MessageType: protocol.MessageTypeError,
			Parameters:  protocol.ErrorParameters{ErrorMessage: "Invalid request body"},
		})
		return
	}

	userID, err := h.authService.Register(req.Username, req.Password)
	token, _, err := h.authService.Login(req.Username, req.Password)

	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(protocol.ErrorResponse{
			MessageType: protocol.MessageTypeError,
			Parameters:  protocol.ErrorParameters{ErrorMessage: err.Error()},
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(protocol.Response{
		MessageType: protocol.MessageTypeSimple,
		Parameters: protocol.AuthResponseParams{
			Token:  token,
			UserID: userID,
		},
	})
}

// HandleLogin handles user login
func (h *AuthHandler) HandleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req protocol.LoginRequestParams
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(protocol.ErrorResponse{
			MessageType: protocol.MessageTypeError,
			Parameters:  protocol.ErrorParameters{ErrorMessage: "Invalid request body"},
		})
		return
	}

	token, userID, err := h.authService.Login(req.Username, req.Password)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(protocol.ErrorResponse{
			MessageType: protocol.MessageTypeError,
			Parameters:  protocol.ErrorParameters{ErrorMessage: "Invalid credentials"},
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(protocol.Response{
		MessageType: protocol.MessageTypeSimple,
		Parameters: protocol.AuthResponseParams{
			Token:  token,
			UserID: userID,
		},
	})
}

// HandleLogout handles user logout
func (h *AuthHandler) HandleLogout(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	token := r.Header.Get("Authorization")
	if token == "" {
		http.Error(w, "No token provided", http.StatusBadRequest)
		return
	}

	h.authService.Logout(token)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(protocol.SimpleResponse{
		MessageType: protocol.MessageTypeSimple,
		Parameters:  protocol.SimpleParameters{Message: "logged out"},
	})
}

// HandleMe returns current user info
func (h *AuthHandler) HandleMe(w http.ResponseWriter, r *http.Request) {
	token := r.Header.Get("Authorization")
	if token == "" {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(protocol.ErrorResponse{
			MessageType: protocol.MessageTypeError,
			Parameters:  protocol.ErrorParameters{ErrorMessage: "No token provided"},
		})
		return
	}

	userID, err := h.authService.ValidateToken(token)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(protocol.ErrorResponse{
			MessageType: protocol.MessageTypeError,
			Parameters:  protocol.ErrorParameters{ErrorMessage: "Invalid token"},
		})
		return
	}

	user, err := h.authService.GetUser(userID)
	if err != nil {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(protocol.ErrorResponse{
			MessageType: protocol.MessageTypeError,
			Parameters:  protocol.ErrorParameters{ErrorMessage: "User not found"},
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(protocol.Response{
		MessageType: protocol.MessageTypeSimple,
		Parameters: protocol.UserInfoResponseParams{
			UserID:   user.ID,
			Username: user.Username,
		},
	})
}

// HandleWSToken generates a short-lived WebSocket token
// POST /auth/ws-token/{game_id}
// Authorization: Bearer <token>
func (h *AuthHandler) HandleWSToken(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Extract game_id from URL path: /auth/ws-token/{game_id}
	gameID := extractGameIDFromWSTokenPath(r.URL.Path)
	if gameID == "" {
		slog.Debug("WS token request rejected - missing game_id in path")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(protocol.ErrorResponse{
			MessageType: protocol.MessageTypeError,
			Parameters:  protocol.ErrorParameters{ErrorMessage: "Missing game_id in URL path"},
		})
		return
	}

	// Extract and validate main auth token from Authorization header
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		slog.Debug("WS token request rejected - missing authorization header", "game_id", gameID)
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(protocol.ErrorResponse{
			MessageType: protocol.MessageTypeError,
			Parameters:  protocol.ErrorParameters{ErrorMessage: "Missing authorization token"},
		})
		return
	}

	var token string
	if strings.HasPrefix(authHeader, "Bearer ") {
		token = strings.TrimPrefix(authHeader, "Bearer ")
	} else {
		slog.Debug("WS token request rejected - invalid authorization header format", "game_id", gameID)
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(protocol.ErrorResponse{
			MessageType: protocol.MessageTypeError,
			Parameters:  protocol.ErrorParameters{ErrorMessage: "Invalid authorization header format"},
		})
		return
	}

	userID, err := h.authService.ValidateToken(token)
	if err != nil {
		slog.Debug("WS token request rejected - invalid auth token",
			"game_id", gameID,
			"error", err.Error())
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(protocol.ErrorResponse{
			MessageType: protocol.MessageTypeError,
			Parameters:  protocol.ErrorParameters{ErrorMessage: "Invalid or expired token"},
		})
		return
	}

	// Generate WebSocket token
	wsToken, err := h.authService.GenerateWSToken(userID, gameID)
	if err != nil {
		slog.Error("Failed to generate WS token",
			"user_id", userID,
			"game_id", gameID,
			"error", err.Error())
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(protocol.ErrorResponse{
			MessageType: protocol.MessageTypeError,
			Parameters:  protocol.ErrorParameters{ErrorMessage: "Failed to generate WebSocket token"},
		})
		return
	}

	slog.Info("WebSocket token generated",
		"user_id", userID,
		"game_id", gameID)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(protocol.Response{
		MessageType: protocol.MessageTypeSimple,
		Parameters: protocol.WSTokenResponseParams{
			WSToken: wsToken,
		},
	})
}

// extractGameIDFromWSTokenPath extracts game ID from paths like /auth/ws-token/{game_id}
func extractGameIDFromWSTokenPath(path string) string {
	path = strings.Trim(path, "/")
	parts := strings.Split(path, "/")

	// Expected: ["auth", "ws-token", "{game_id}"]
	if len(parts) >= 3 && parts[0] == "auth" && parts[1] == "ws-token" {
		return parts[2]
	}

	return ""
}
