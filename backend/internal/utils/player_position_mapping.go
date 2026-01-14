package utils

import (
	"crypto/rand"
	"fmt"
	"log/slog"
	"math/big"
	"strings"
	"time"

	"github.com/AlexWendland/games-site/backend/internal"
	"github.com/AlexWendland/games-site/backend/internal/constants"
	"github.com/AlexWendland/games-site/backend/proto"
)

type PlayerSlot struct {
	UserID      string
	DisplayName string
	Connected   bool
	LastSeen    time.Time
	IsAI        bool
	AIType      string
}

type PlayerPositionMapping struct {
	maxPlayers  int
	slots       map[int]*PlayerSlot  // position -> slot info
	userToPos   map[string]int       // userID -> position (for fast lookup)
	userService internal.UserService // For looking up display names
}

// NewPlayerPositionMapping creates a new position-based player mapping.
func NewPlayerPositionMapping(maxPlayers int, userService internal.UserService) PlayerPositionMapping {
	return PlayerPositionMapping{
		maxPlayers:  maxPlayers,
		slots:       make(map[int]*PlayerSlot),
		userToPos:   make(map[string]int),
		userService: userService,
	}
}

// GetPlayerPosition returns the position for a given userID.
func (m *PlayerPositionMapping) GetPlayerPosition(userID string) (int, bool) {
	pos, ok := m.userToPos[userID]
	return pos, ok
}

// GetPlayerAtPosition returns the userID at a given position.
func (m *PlayerPositionMapping) GetPlayerAtPosition(position int) (string, bool) {
	slot, ok := m.slots[position]
	if !ok {
		return "", false
	}
	return slot.UserID, true
}

func (m *PlayerPositionMapping) AddPlayer(logger *slog.Logger, userID string, aiType string, position int) error {
	logger = logger.With("position", position, "aiType", aiType)
	isAI := aiType != ""

	if position < 0 || position >= m.maxPlayers {
		logger.Error("invalid position", "max_players", m.maxPlayers-1)
		return fmt.Errorf("invalid position %d (must be 0-%d)", position, m.maxPlayers-1)
	}

	if currentSlot, ok := m.slots[position]; ok {
		if currentSlot.UserID != userID {
			logger.Error("position is already occupied")
			return fmt.Errorf("position %d is already occupied", position)
		}
		return nil // Already in this position, no-op
	}

	if existingPos, ok := m.userToPos[userID]; ok {
		if err := m.RemovePosition(logger, userID, existingPos); err != nil {
			logger.Warn("Failed to remove player from existing position", "error", err.Error())
		}
	}

	var displayName string

	if isAI {
		displayName = m.generateAIName()
	} else {
		// Get display name for the user
		var err error
		displayName, err = m.userService.GetDisplayName(userID)

		if err != nil {
			displayName = userID
		}
	}

	m.slots[position] = &PlayerSlot{
		UserID:      userID,
		DisplayName: displayName,
		Connected:   true,
		LastSeen:    time.Now(),
		IsAI:        isAI,
		AIType:      aiType,
	}
	m.userToPos[userID] = position
	logger.Debug("added player to position", "user_id", userID)
	return nil
}

// There are 3 situations where a user can remove a position:
// 1. The user is in that position.
// 2. There is a disconnected user in that position.
// 3. There is an AI in that position.
func (m *PlayerPositionMapping) RemovePosition(logger *slog.Logger, userID string, position int) error {
	userToRemove, ok := m.slots[position]
	if !ok {
		logger.Debug("No user in position", "position", position)
		return nil // Nothing to remove
	}
	if userToRemove.UserID != userID && !userToRemove.IsAI && userToRemove.Connected {
		logger.Debug("User is not able to remove user from position", "requesting_user_id", userID, "user_to_remove", userToRemove.UserID, "position", position)
		return fmt.Errorf("user %s is not able to remove user %s from position %d", userID, userToRemove.UserID, position)
	}

	delete(m.slots, position)
	delete(m.userToPos, userToRemove.UserID)
	return nil
}

// generateAIName generates a random AI name following the pattern "AI-{name}"
// Uses names from the constants list, avoiding names already in use.
func (m *PlayerPositionMapping) generateAIName() string {
	const aiPrefix = "AI-"

	// Collect all used names (strip "AI-" prefix from existing AI names)
	usedNames := make(map[string]bool)
	for _, slot := range m.slots {
		if slot.IsAI && strings.HasPrefix(slot.DisplayName, aiPrefix) {
			name := strings.TrimPrefix(slot.DisplayName, aiPrefix)
			usedNames[name] = true
		}
	}

	// Find available names
	var availableNames []string
	for _, name := range constants.AINames {
		if !usedNames[name] {
			availableNames = append(availableNames, name)
		}
	}

	// If no available names, default to "alfred"
	if len(availableNames) == 0 {
		availableNames = append(availableNames, "alfred")
	}

	// Pick a random available name
	n, err := rand.Int(rand.Reader, big.NewInt(int64(len(availableNames))))
	if err != nil {
		// Fallback to first available name if random generation fails
		return aiPrefix + availableNames[0]
	}
	randomName := availableNames[n.Int64()]
	return aiPrefix + randomName
}

// MarkConnected marks a player as connected.
func (m *PlayerPositionMapping) MarkConnected(logger *slog.Logger, userID string) {
	if pos, ok := m.userToPos[userID]; ok {
		if slot := m.slots[pos]; slot != nil {
			slot.Connected = true
			slot.LastSeen = time.Now()
		}
	}
}

// MarkDisconnected marks a player as disconnected.
//nolint:nestif // Nested structure required for map lookup, nil check, and AI vs player handling
func (m *PlayerPositionMapping) MarkDisconnected(logger *slog.Logger, userID string) {
	if pos, ok := m.userToPos[userID]; ok {
		if slot := m.slots[pos]; slot != nil {
			if slot.IsAI {
				if err := m.RemovePosition(logger, userID, pos); err != nil {
					logger.Warn("Failed to remove AI on disconnect", "error", err.Error())
				}
			} else {
				slot.Connected = false
				slot.LastSeen = time.Now()
			}
		}
	}
}

func (m *PlayerPositionMapping) ToProto() *proto.PositionSessionStateResponse {
	// Convert PlayerSlots to proto.PlayerInfo
	playerPositions := make(map[int32]*proto.PlayerInfo)
	for position, slot := range m.slots {
		// #nosec G115 -- position is 0-1 (maxPlayers), safe conversion to int32
		playerPositions[int32(position)] = &proto.PlayerInfo{
			UserId:      slot.UserID,
			DisplayName: slot.DisplayName,
			IsAi:        slot.IsAI,
		}
	}
	return &proto.PositionSessionStateResponse{
		PlayerPositions: playerPositions,
	}
}
