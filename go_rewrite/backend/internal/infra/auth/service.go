package auth

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"sync"
	"time"

	"golang.org/x/crypto/bcrypt"
)

// Service handles user authentication
type Service struct {
	usersByUsername map[string]*User        // username → User
	usersByID       map[string]*User        // userID → User
	sessions        map[string]string       // token → userID
	wsTokens        map[string]*WSTokenData // wsToken → WSTokenData
	mu              sync.RWMutex
}

// User represents a registered user
type User struct {
	ID           string
	Username     string
	PasswordHash string
}

// WSTokenData represents a WebSocket token with metadata
type WSTokenData struct {
	UserID    string
	GameID    string
	ExpiresAt time.Time
	Used      bool
}

// NewService creates a new auth service
func NewService() *Service {
	return &Service{
		usersByUsername: make(map[string]*User),
		usersByID:       make(map[string]*User),
		sessions:        make(map[string]string),
		wsTokens:        make(map[string]*WSTokenData),
	}
}

// Register creates a new user account
func (s *Service) Register(username, password string) (userID string, err error) {
	if username == "" || password == "" {
		return "", fmt.Errorf("username and password required")
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	// Check if username already exists
	if _, exists := s.usersByUsername[username]; exists {
		return "", fmt.Errorf("username already taken")
	}

	// Hash password
	passwordHash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", fmt.Errorf("failed to hash password: %w", err)
	}

	// Create user
	exists := true
	for exists {
		userID = generateID()
		_, exists = s.usersByID[userID]
	}
	user := &User{
		ID:           userID,
		Username:     username,
		PasswordHash: string(passwordHash),
	}
	s.usersByUsername[username] = user
	s.usersByID[userID] = user

	return userID, nil
}

// Login authenticates a user and returns a session token
func (s *Service) Login(username, password string) (token, userID string, err error) {
	s.mu.RLock()
	user, exists := s.usersByUsername[username]
	s.mu.RUnlock()

	if !exists {
		return "", "", fmt.Errorf("invalid credentials")
	}

	// Verify password
	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password))
	if err != nil {
		return "", "", fmt.Errorf("invalid credentials")
	}

	// Generate session token
	s.mu.Lock()
	exists = true
	for exists {
		token = generateToken()
		_, exists = s.sessions[token]
	}
	s.sessions[token] = user.ID
	s.mu.Unlock()

	return token, user.ID, nil
}

// ValidateToken checks if a token is valid and returns the associated userID
func (s *Service) ValidateToken(token string) (userID string, err error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	userID, exists := s.sessions[token]
	if !exists {
		return "", fmt.Errorf("invalid or expired token")
	}

	return userID, nil
}

// Logout invalidates a session token
func (s *Service) Logout(token string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	delete(s.sessions, token)
	return nil
}

// GetUser returns user info by userID
func (s *Service) GetUser(userID string) (*User, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	user, exists := s.usersByID[userID]
	if !exists {
		return nil, fmt.Errorf("user not found")
	}

	return user, nil
}

// GetDisplayName returns the display name for a userID
// This implements the domain.UserService interface
// For now, we use the username as the display name
func (s *Service) GetDisplayName(userID string) (string, error) {
	user, err := s.GetUser(userID)
	if err != nil {
		return "", err
	}

	// TODO: When we add a DisplayName field to User, return that instead
	return user.Username, nil
}

// GenerateWSToken creates a short-lived WebSocket token for a specific user and game
// The token expires in 10 seconds and is single-use
func (s *Service) GenerateWSToken(userID, gameID string) (string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Verify user exists
	if _, exists := s.usersByID[userID]; !exists {
		return "", fmt.Errorf("user not found")
	}

	// Generate unique token
	var token string
	exists := true
	for exists {
		token = "ws-" + generateToken()
		currentToken, exists := s.wsTokens[token]
		if exists {
			if currentToken.Used || currentToken.ExpiresAt.Before(time.Now()) {
				// Token expired so delete it
				delete(s.wsTokens, token)
				exists = false
			}
		}
	}

	// Store token with 10 second expiry
	s.wsTokens[token] = &WSTokenData{
		UserID:    userID,
		GameID:    gameID,
		ExpiresAt: time.Now().Add(10 * time.Second),
		Used:      false,
	}

	return token, nil
}

// ValidateWSToken validates a WebSocket token for a specific game
// The token is consumed (single-use) and deleted after validation
// Returns the userID if valid, or an error if invalid/expired/wrong game
func (s *Service) ValidateWSToken(token string, expectedGameID string) (userID string, err error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	wsToken, exists := s.wsTokens[token]
	if !exists {
		return "", fmt.Errorf("invalid or expired WebSocket token")
	}

	// Check if already used
	if wsToken.Used {
		delete(s.wsTokens, token)
		return "", fmt.Errorf("WebSocket token already used")
	}

	// Check if expired
	if time.Now().After(wsToken.ExpiresAt) {
		delete(s.wsTokens, token)
		return "", fmt.Errorf("WebSocket token expired")
	}

	// Verify game_id matches
	if wsToken.GameID != expectedGameID {
		delete(s.wsTokens, token)
		return "", fmt.Errorf("WebSocket token is for game %s, not %s", wsToken.GameID, expectedGameID)
	}

	// Mark as used and delete the token
	wsToken.Used = true
	defer delete(s.wsTokens, token)

	return wsToken.UserID, nil
}

func generateToken() string {
	bytes := make([]byte, 32)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)
}

func generateID() string {
	bytes := make([]byte, 16)
	rand.Read(bytes)
	return "user-" + hex.EncodeToString(bytes)
}
