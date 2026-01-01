package domain

import "github.com/AlexWendland/games-site/protocol"

// PlayerMapping handles the session-level player management
// It translates between userIDs and game positions, manages AI players,
// and handles session events like joining, leaving, and swapping positions.
type PlayerMapping interface {
	// HandleSessionEvent processes session-related requests (join, leave, add AI, etc.)
	// Returns an error if the request is invalid or cannot be processed
	HandleSessionEvent(userID string, request protocol.Request) error

	// GetPlayerPosition translates a userID to their game position
	// Returns (position, true) if the user is in a playing position
	// Returns (0, false) if the user is not in a position (spectator or not present)
	GetPlayerPosition(userID string) (int, bool)

	// GetSessionStateForPlayer returns the session state for a specific user
	// Includes their position in UserPosition field
	GetSessionStateForPlayer(userID string) protocol.SessionStateResponse

	// GetSessionStateForAll returns the session state for broadcast
	// UserPosition will be nil in the response
	GetSessionStateForAll() []StateMessage

	MarkConnected(userID string)
	MarkDisconnected(userID string)
}
