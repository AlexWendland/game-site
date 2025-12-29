package protocol

// Common protocol types shared across all games

// MessageType identifies the type of message
type MessageType string

const (
	MessageTypeSessionState MessageType = "session_state"
	MessageTypeGameState    MessageType = "game_state"
	MessageTypeError        MessageType = "error"
	MessageTypeSimple       MessageType = "simple"
	MessageTypeAIState      MessageType = "ai_state"
)

// IsValid checks if the MessageType is one of the defined constants
func (m MessageType) IsValid() bool {
	switch m {
	case MessageTypeSessionState, MessageTypeGameState, MessageTypeError, MessageTypeSimple, MessageTypeAIState:
		return true
	default:
		return false
	}
}

// RequestType identifies the type of request
type RequestType string

const (
	RequestTypeSession RequestType = "session"
	RequestTypeGame    RequestType = "game"
	RequestTypeAI      RequestType = "ai"
)

// IsValid checks if the RequestType is one of the defined constants
func (r RequestType) IsValid() bool {
	switch r {
	case RequestTypeSession, RequestTypeGame, RequestTypeAI:
		return true
	default:
		return false
	}
}

// Request represents a WebSocket request from the client
type Request struct {
	RequestType  RequestType            `json:"request_type"`
	FunctionName string                 `json:"function_name"`
	Parameters   map[string]interface{} `json:"parameters"`
}

// Response is the base response type
type Response struct {
	MessageType MessageType `json:"message_type"`
	Parameters  interface{} `json:"parameters"`
}

// ErrorResponse represents an error message
type ErrorResponse struct {
	MessageType MessageType     `json:"message_type"`
	Parameters  ErrorParameters `json:"parameters"`
}

type ErrorParameters struct {
	ErrorMessage string `json:"error_message"`
}

// SimpleResponse represents a simple text message
type SimpleResponse struct {
	MessageType MessageType      `json:"message_type"`
	Parameters  SimpleParameters `json:"parameters"`
}

type SimpleParameters struct {
	Message string `json:"message"`
}

// PlayerInfo contains information about a player
type PlayerInfo struct {
	UserID      string `json:"user_id"` // For AI this is the AI type.
	DisplayName string `json:"display_name"`
	IsAI        bool   `json:"is_ai"`
}

// SessionStateResponse represents the session/lobby state
type SessionStateResponse struct {
	MessageType MessageType            `json:"message_type"`
	Parameters  SessionStateParameters `json:"parameters"`
}

type SessionStateParameters struct {
	PlayerPositions map[int]*PlayerInfo `json:"player_positions"` // position -> player info (nil if empty)
}

// GameStateResponse is the base for game-specific states
// Each game should embed this or define their own
type GameStateResponse struct {
	MessageType MessageType `json:"message_type"`
	Parameters  interface{} `json:"parameters"` // Game-specific
}
