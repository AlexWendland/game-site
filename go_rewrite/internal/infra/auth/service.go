package auth

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"sync"

	"golang.org/x/crypto/bcrypt"
)

// Service handles user authentication
type Service struct {
	users    map[string]*User   // username → User
	sessions map[string]string  // token → userID
	mu       sync.RWMutex
}

// User represents a registered user
type User struct {
	ID           string
	Username     string
	PasswordHash string
}

// NewService creates a new auth service
func NewService() *Service {
	return &Service{
		users:    make(map[string]*User),
		sessions: make(map[string]string),
	}
}

// Register creates a new user account
func (s *Service) Register(username, password string) (token, userID string, err error) {
	if username == "" || password == "" {
		return "", "", fmt.Errorf("username and password required")
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	// Check if username already exists
	if _, exists := s.users[username]; exists {
		return "", "", fmt.Errorf("username already taken")
	}

	// Hash password
	passwordHash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", "", fmt.Errorf("failed to hash password: %w", err)
	}

	// Create user
	userID = generateID()
	user := &User{
		ID:           userID,
		Username:     username,
		PasswordHash: string(passwordHash),
	}
	s.users[username] = user

	// Generate session token
	token = generateToken()
	s.sessions[token] = userID

	return token, userID, nil
}

// Login authenticates a user and returns a session token
func (s *Service) Login(username, password string) (token, userID string, err error) {
	s.mu.RLock()
	user, exists := s.users[username]
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
	token = generateToken()
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

	for _, user := range s.users {
		if user.ID == userID {
			return user, nil
		}
	}

	return nil, fmt.Errorf("user not found")
}

// generateToken creates a random session token
func generateToken() string {
	bytes := make([]byte, 32)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)
}

// generateID creates a random user ID
func generateID() string {
	bytes := make([]byte, 16)
	rand.Read(bytes)
	return "user-" + hex.EncodeToString(bytes)
}
