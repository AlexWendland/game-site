package protocol

// Auth protocol types for login/register
// Follows same pattern as game protocol: separate request params and response params

// Auth request parameters (sent as JSON body to HTTP endpoints)
type RegisterRequestParams struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type LoginRequestParams struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// Auth response parameters
type AuthResponseParams struct {
	Token  string `json:"token"`
	UserID string `json:"user_id"`
}

type WSTokenResponseParams struct {
	WSToken string `json:"ws_token"`
}

type UserInfoResponseParams struct {
	UserID   string `json:"user_id"`
	Username string `json:"username"`
}
