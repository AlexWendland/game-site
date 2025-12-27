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

// SessionStateResponse represents the session/lobby state
type SessionStateResponse struct {
	MessageType MessageType            `json:"message_type"`
	Parameters  SessionStateParameters `json:"parameters"`
}

type SessionStateParameters struct {
	PlayerPositions map[int]*string `json:"player_positions"` // position -> player name (nil if empty)
	UserPosition    *int            `json:"user_position"`    // nil if spectator
}

// AIStateResponse represents AI players in the game
type AIStateResponse struct {
	MessageType MessageType       `json:"message_type"`
	Parameters  AIStateParameters `json:"parameters"`
}

type AIStateParameters struct {
	AIPlayers map[int]string `json:"ai_players"` // position -> ai_type
}

// GameStateResponse is the base for game-specific states
// Each game should embed this or define their own
type GameStateResponse struct {
	MessageType MessageType `json:"message_type"`
	Parameters  interface{} `json:"parameters"` // Game-specific
}
