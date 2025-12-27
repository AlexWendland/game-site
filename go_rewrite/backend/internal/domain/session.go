package domain

import "github.com/AlexWendland/games-site/protocol"

// ActionMessage represents an action from a player
// Wraps the protocol.Request with player context
type ActionMessage struct {
	PlayerID string           // Which player sent this action
	Request  protocol.Request // The protocol request (function name + parameters)
}

// StateMessage represents a state update to send to player(s)
// Wraps the protocol.Response with routing information
type StateMessage struct {
	PlayerID string            // Which player to send to ("" = broadcast to all)
	Response protocol.Response // The protocol response
}
