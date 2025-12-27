package api

import (
	"encoding/json"
	"net/http"

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

	token, userID, err := h.authService.Register(req.Username, req.Password)
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
