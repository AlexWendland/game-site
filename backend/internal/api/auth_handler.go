package api

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/AlexWendland/games-site/backend/internal/auth"
	"github.com/AlexWendland/games-site/backend/proto"
)

// AuthHandler handles authentication HTTP requests.
type AuthHandler struct {
	authService *auth.Service
}

// NewAuthHandler creates a new auth handler.
func NewAuthHandler(authService *auth.Service) *AuthHandler {
	return &AuthHandler{
		authService: authService,
	}
}

// ServeHTTP routes auth requests to the appropriate handler.
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

// HandleRegister handles user registration.
func (h *AuthHandler) HandleRegister(w http.ResponseWriter, r *http.Request) {
	logger := GetLogger(r)

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req proto.RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	logger = logger.With("username", req.Username)

	userID, err := h.authService.Register(req.Username, req.Password)
	if err != nil {
		logger.Warn("Registration failed", "error", err.Error())
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	logger = logger.With("user_id", userID)

	token, _, err := h.authService.Login(req.Username, req.Password)
	if err != nil {
		logger.Error("Auto-login after registration failed", "error", err.Error())
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	logger.Info("User registered successfully")

	writeJSON(logger, w, &proto.AuthResponse{
		Token:  token,
		UserId: userID,
	})
}

// HandleLogin handles user login.
func (h *AuthHandler) HandleLogin(w http.ResponseWriter, r *http.Request) {
	logger := GetLogger(r)

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req proto.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	logger = logger.With("username", req.Username)

	token, userID, err := h.authService.Login(req.Username, req.Password)
	if err != nil {
		logger.Warn("Login failed", "error", err.Error())
		http.Error(w, "Invalid credentials", http.StatusUnauthorized)
		return
	}

	logger = logger.With("user_id", userID)
	logger.Info("User logged in successfully")

	writeJSON(logger, w, &proto.AuthResponse{
		Token:  token,
		UserId: userID,
	})
}

// HandleLogout handles user logout.
func (h *AuthHandler) HandleLogout(w http.ResponseWriter, r *http.Request) {
	logger := GetLogger(r)

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	token := r.Header.Get("Authorization")
	if token == "" {
		http.Error(w, "No token provided", http.StatusBadRequest)
		return
	}

	if err := h.authService.Logout(token); err != nil {
		logger.Error("Failed to logout", "error", err)
	} else {
		logger.Info("User logged out successfully")
	}

	writeJSON(logger, w, &proto.SimpleResponse{
		Message: "logged out",
	})
}

// HandleMe returns current user info.
func (h *AuthHandler) HandleMe(w http.ResponseWriter, r *http.Request) {
	logger := GetLogger(r)

	token := r.Header.Get("Authorization")
	if token == "" {
		http.Error(w, "No token provided", http.StatusUnauthorized)
		return
	}

	userID, err := h.authService.ValidateToken(token)
	if err != nil {
		logger.Debug("Token validation failed", "error", err.Error())
		http.Error(w, "Invalid token", http.StatusUnauthorized)
		return
	}

	logger = logger.With("user_id", userID)

	user, err := h.authService.GetUser(userID)
	if err != nil {
		logger.Warn("User not found", "error", err.Error())
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	logger.Debug("User info retrieved", "username", user.Username)

	writeJSON(logger, w, &proto.UserInfoResponse{
		UserId:   user.ID,
		Username: user.Username,
	})
}

// HandleWSToken generates a short-lived WebSocket token
// POST /auth/ws-token/{game_id}
// Authorization: Bearer <token>.
func (h *AuthHandler) HandleWSToken(w http.ResponseWriter, r *http.Request) {
	logger := GetLogger(r)

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Extract game_id from URL path: /auth/ws-token/{game_id}
	gameID := extractGameIDFromWSTokenPath(r.URL.Path)
	if gameID == "" {
		logger.Debug("WS token request rejected - missing game_id in path")
		http.Error(w, "Missing game_id in URL path", http.StatusBadRequest)
		return
	}

	// Add game_id to logger context
	logger = logger.With("game_id", gameID)

	// Extract and validate main auth token from Authorization header
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		logger.Debug("WS token request rejected - missing authorization header")
		http.Error(w, "Missing authorization token", http.StatusUnauthorized)
		return
	}

	if !strings.HasPrefix(authHeader, "Bearer ") {
		logger.Debug("WS token request rejected - invalid authorization header format")
		http.Error(w, "Invalid authorization header format", http.StatusUnauthorized)
		return
	}
	token := strings.TrimPrefix(authHeader, "Bearer ")
	userID, err := h.authService.ValidateToken(token)
	if err != nil {
		logger.Debug("WS token request rejected - invalid auth token", "error", err.Error())
		http.Error(w, "Invalid or expired token", http.StatusUnauthorized)
		return
	}

	// Add user_id to logger context
	logger = logger.With("user_id", userID)

	// Generate WebSocket token
	wsToken, err := h.authService.GenerateWSToken(userID, gameID)
	if err != nil {
		logger.Error("Failed to generate WS token", "error", err.Error())
		http.Error(w, "Failed to generate WebSocket token", http.StatusInternalServerError)
		return
	}

	logger.Info("WebSocket token generated")

	writeJSON(logger, w, &proto.WSTokenResponse{
		WsToken: wsToken,
	})
}

// extractGameIDFromWSTokenPath extracts game ID from paths like /auth/ws-token/{game_id}.
func extractGameIDFromWSTokenPath(path string) string {
	path = strings.Trim(path, "/")
	parts := strings.Split(path, "/")

	// Expected: ["auth", "ws-token", "{game_id}"]
	if len(parts) >= 3 && parts[0] == "auth" && parts[1] == "ws-token" {
		return parts[2]
	}

	return ""
}
