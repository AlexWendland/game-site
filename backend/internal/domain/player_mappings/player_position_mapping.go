package player_mapping

import (
	"crypto/rand"
	"fmt"
	"math/big"
	"strings"
	"time"

	"github.com/AlexWendland/games-site/internal/constants"
	"github.com/AlexWendland/games-site/internal/domain"
	"github.com/AlexWendland/games-site/protocol"
)

type PlayerSlot struct {
	UserID      string
	DisplayName string
	Connected   bool
	LastSeen    time.Time
	IsAI        bool
	AIType      string
}

// PlayerPositionMapping implements domain.PlayerMapping for position-based games.
type PlayerPositionMapping struct {
	maxPlayers  int
	slots       map[int]*PlayerSlot // position -> slot info
	userToPos   map[string]int      // userID -> position (for fast lookup)
	userService domain.UserService  // For looking up display names
}

// NewPlayerPositionMapping creates a new position-based player mapping.
func NewPlayerPositionMapping(maxPlayers int, userService domain.UserService) domain.PlayerMapping {
	return &PlayerPositionMapping{
		maxPlayers:  maxPlayers,
		slots:       make(map[int]*PlayerSlot),
		userToPos:   make(map[string]int),
		userService: userService,
	}
}

// HandleSessionEvent processes session-related requests.
func (m *PlayerPositionMapping) HandleSessionEvent(userID string, request protocol.Request) error {
	switch request.FunctionName {
	case "join_position":
		position, ok := request.Parameters["position"].(float64) // JSON numbers are float64
		if !ok {
			return fmt.Errorf("missing or invalid position parameter")
		}
		return m.joinPosition(userID, int(position))

	case "leave_position":
		return m.leavePosition(userID)

	case "add_ai":
		position, ok := request.Parameters["position"].(float64)
		if !ok {
			return fmt.Errorf("missing or invalid position parameter")
		}
		aiType, ok := request.Parameters["ai_type"].(string)
		if !ok {
			return fmt.Errorf("missing or invalid ai_type parameter")
		}
		return m.addAI(int(position), aiType)

	case "remove_ai":
		position, ok := request.Parameters["position"].(float64)
		if !ok {
			return fmt.Errorf("missing or invalid position parameter")
		}
		return m.removeAI(int(position))

	default:
		return fmt.Errorf("unknown session function: %s", request.FunctionName)
	}
}

// GetPlayerPosition returns the position for a given userID.
func (m *PlayerPositionMapping) GetPlayerPosition(userID string) (int, bool) {
	pos, ok := m.userToPos[userID]
	return pos, ok
}

// GetSessionStateForPlayer returns session state with the user's position filled in.
func (m *PlayerPositionMapping) GetSessionStateForPlayer(userID string) protocol.SessionStateResponse {
	state := m.buildSessionState()
	return state
}

// GetSessionStateForAll returns session state for broadcast (no specific user position).
func (m *PlayerPositionMapping) GetSessionStateForAll() []domain.StateMessage {
	state := m.buildSessionState()
	return []domain.StateMessage{
		{
			PlayerID: "", // Broadcast to all
			Response: protocol.Response{
				MessageType: state.MessageType,
				Parameters:  state.Parameters,
			},
		},
	}
}

// buildSessionState constructs the session state from current slots.
func (m *PlayerPositionMapping) buildSessionState() protocol.SessionStateResponse {
	playerPositions := make(map[int]*protocol.PlayerInfo)

	// Fill in all positions (0 to maxPlayers-1)
	for pos := 0; pos < m.maxPlayers; pos++ {
		if slot, ok := m.slots[pos]; ok {
			// For AI players, UserID is the AI type
			userID := slot.UserID
			if slot.IsAI {
				userID = slot.AIType
			}

			playerPositions[pos] = &protocol.PlayerInfo{
				UserID:      userID,
				DisplayName: slot.DisplayName,
				IsAI:        slot.IsAI,
			}
		} else {
			// Position is empty
			playerPositions[pos] = nil
		}
	}

	return protocol.SessionStateResponse{
		MessageType: protocol.MessageTypeSessionState,
		Parameters: protocol.SessionStateParameters{
			PlayerPositions: playerPositions,
		},
	}
}

// joinPosition adds a player to a specific position.
func (m *PlayerPositionMapping) joinPosition(userID string, position int) error {
	// Validate position
	if position < 0 || position >= m.maxPlayers {
		return fmt.Errorf("invalid position %d (must be 0-%d)", position, m.maxPlayers-1)
	}

	// Check if user is already in a position
	if existingPos, ok := m.userToPos[userID]; ok {
		if existingPos == position {
			return nil // Already in this position, no-op
		}
		return fmt.Errorf("user already in position %d", existingPos)
	}

	// Check if position is already occupied
	if _, ok := m.slots[position]; ok {
		return fmt.Errorf("position %d is already occupied", position)
	}

	// Get display name for the user
	displayName, err := m.userService.GetDisplayName(userID)
	if err != nil {
		// Fallback to userID if we can't get display name
		displayName = userID
	}

	// Add player to position
	m.slots[position] = &PlayerSlot{
		UserID:      userID,
		DisplayName: displayName,
		Connected:   true,
		LastSeen:    time.Now(),
		IsAI:        false,
		AIType:      "",
	}
	m.userToPos[userID] = position

	return nil
}

// leavePosition removes a player from their position.
func (m *PlayerPositionMapping) leavePosition(userID string) error {
	// Check if user has a position
	position, ok := m.userToPos[userID]
	if !ok {
		return fmt.Errorf("user is not in any position")
	}

	// Remove from both maps
	delete(m.slots, position)
	delete(m.userToPos, userID)

	return nil
}

// addAI adds an AI player to a specific position.
func (m *PlayerPositionMapping) addAI(position int, aiType string) error {
	// Validate position
	if position < 0 || position >= m.maxPlayers {
		return fmt.Errorf("invalid position %d (must be 0-%d)", position, m.maxPlayers-1)
	}

	// Check if position is already occupied
	if _, ok := m.slots[position]; ok {
		return fmt.Errorf("position %d is already occupied", position)
	}

	// Generate AI userID and display name
	aiUserID := fmt.Sprintf("ai_%s_%d", aiType, position)
	aiDisplayName := m.generateAIName()

	// Add AI to position
	m.slots[position] = &PlayerSlot{
		UserID:      aiUserID,
		DisplayName: aiDisplayName,
		Connected:   true,
		LastSeen:    time.Now(),
		IsAI:        true,
		AIType:      aiType,
	}
	m.userToPos[aiUserID] = position

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

// removeAI removes an AI player from a specific position.
func (m *PlayerPositionMapping) removeAI(position int) error {
	// Validate position
	if position < 0 || position >= m.maxPlayers {
		return fmt.Errorf("invalid position %d (must be 0-%d)", position, m.maxPlayers-1)
	}

	// Check if position is occupied by an AI
	slot, ok := m.slots[position]
	if !ok {
		return fmt.Errorf("position %d is not occupied", position)
	}
	if !slot.IsAI {
		return fmt.Errorf("position %d is occupied by a human player, not AI", position)
	}

	// Remove from both maps
	delete(m.userToPos, slot.UserID)
	delete(m.slots, position)

	return nil
}

// MarkConnected marks a player as connected.
func (m *PlayerPositionMapping) MarkConnected(userID string) {
	if pos, ok := m.userToPos[userID]; ok {
		if slot := m.slots[pos]; slot != nil {
			slot.Connected = true
			slot.LastSeen = time.Now()
		}
	}
}

// MarkDisconnected marks a player as disconnected.
func (m *PlayerPositionMapping) MarkDisconnected(userID string) {
	if pos, ok := m.userToPos[userID]; ok {
		if slot := m.slots[pos]; slot != nil {
			slot.Connected = false
			slot.LastSeen = time.Now()
		}
	}
}
