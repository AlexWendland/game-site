package internal

import "log/slog"

// This is the raw message passed over the Websocket with a userID tagged to it.
type TaggedMessage struct {
	UserID     string // Which player sent this or who it is intended for ("" = broadcast to all)
	RawMessage []byte // Raw message from WebSocket
	Logger     *slog.Logger
}
