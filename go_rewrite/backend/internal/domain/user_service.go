package domain

// UserService provides user information for the application layer
// This interface is defined in domain but implemented in infra
type UserService interface {
	// GetDisplayName returns the display name for a given userID
	// Returns an error if the user is not found
	GetDisplayName(userID string) (string, error)
}
