package api

import (
	"log"
	"net/http"

	"github.com/AlexWendland/games-site/internal/app"
	"github.com/AlexWendland/games-site/internal/infra/auth"
)

// corsMiddleware adds CORS headers to allow requests from the Next.js dev server
func corsMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Allow requests from Next.js dev server
		w.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Allow-Credentials", "true")

		// Handle preflight requests
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next(w, r)
	}
}

// Server wraps the HTTP server configuration
type Server struct {
	addr        string
	registry    *app.Registry
	authService *auth.Service
	staticPath  string
	production  bool
}

// NewServer creates a new HTTP server
func NewServer(addr string, registry *app.Registry, authService *auth.Service, staticPath string, production bool) *Server {
	return &Server{
		addr:        addr,
		registry:    registry,
		authService: authService,
		staticPath:  staticPath,
		production:  production,
	}
}

// Run starts the HTTP server (blocking)
func (s *Server) Run() error {
	// Helper function to conditionally apply CORS middleware
	maybeWithCORS := func(handler http.HandlerFunc) http.HandlerFunc {
		if s.production {
			return handler
		}
		return corsMiddleware(handler)
	}

	// Auth endpoints (with CORS in dev mode)
	authHandler := NewAuthHandler(s.authService)
	http.HandleFunc("/auth/register", maybeWithCORS(authHandler.HandleRegister))
	http.HandleFunc("/auth/login", maybeWithCORS(authHandler.HandleLogin))
	http.HandleFunc("/auth/logout", maybeWithCORS(authHandler.HandleLogout))
	http.HandleFunc("/auth/me", maybeWithCORS(authHandler.HandleMe))

	// WebSocket handler - matches /game/{game_id}/ws
	wsHandler := NewWebSocketHandler(s.registry, s.authService)
	http.HandleFunc("/game/", maybeWithCORS(func(w http.ResponseWriter, r *http.Request) {
		wsHandler.ServeHTTP(w, r)
	}))

	// Static file server (only in production mode)
	if s.staticPath != "" {
		fs := http.FileServer(http.Dir(s.staticPath))
		http.Handle("/", fs)
		log.Printf("Serving static files from %s", s.staticPath)
	}

	log.Printf("Server starting on %s", s.addr)
	if !s.production {
		log.Printf("CORS enabled for: http://localhost:3000")
	}
	log.Printf("Auth endpoints: /auth/{register,login,logout,me}")
	log.Printf("WebSocket endpoint: /game/{game_id}/ws")

	return http.ListenAndServe(s.addr, nil)
}
