package api

import (
	"bufio"
	"context"
	"log"
	"log/slog"
	"net"
	"net/http"
	"time"

	"github.com/AlexWendland/games-site/backend/internal"
	"github.com/AlexWendland/games-site/backend/internal/auth"
	"github.com/google/uuid"
)

// contextKey is a custom type for context keys to avoid collisions
type contextKey string

const loggerKey contextKey = "logger"

// GetLogger retrieves the logger from the request context.
// Handlers can use this to get a logger with request-specific context.
func GetLogger(r *http.Request) *slog.Logger {
	if logger, ok := r.Context().Value(loggerKey).(*slog.Logger); ok {
		return logger
	}
	// Fallback to default logger if not found
	return slog.Default()
}

// responseWriter wraps http.ResponseWriter to capture the status code
type responseWriter struct {
	http.ResponseWriter
	statusCode int
	written    bool
}

func (rw *responseWriter) WriteHeader(code int) {
	if !rw.written {
		rw.statusCode = code
		rw.written = true
		rw.ResponseWriter.WriteHeader(code)
	}
}

func (rw *responseWriter) Write(b []byte) (int, error) {
	if !rw.written {
		rw.WriteHeader(http.StatusOK)
	}
	return rw.ResponseWriter.Write(b)
}

// Hijack implements http.Hijacker interface for WebSocket upgrades
func (rw *responseWriter) Hijack() (net.Conn, *bufio.ReadWriter, error) {
	if hijacker, ok := rw.ResponseWriter.(http.Hijacker); ok {
		return hijacker.Hijack()
	}
	return nil, nil, http.ErrNotSupported
}

// loggingMiddleware logs each request with method, path, status, duration, and request ID
func loggingMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		requestID := uuid.New().String()[:8] // Use first 8 chars for brevity
		logger := slog.With(
			"request_id", requestID,
			"method", r.Method,
			"path", r.URL.Path,
		)
		ctx := context.WithValue(r.Context(), loggerKey, logger)
		r = r.WithContext(ctx)
		wrapped := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}

		logger.Info("Request started")

		next(wrapped, r)

		duration := time.Since(start)
		logger.Info("Request completed",
			"status", wrapped.statusCode,
			"duration_ms", duration.Milliseconds(),
		)
	}
}

// corsMiddleware adds CORS headers to allow requests from the Next.js dev server.
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

// Server wraps the HTTP server configuration.
type Server struct {
	addr        string
	registry    *internal.Registry
	authService *auth.Service
	staticPath  string
	production  bool
}

// NewServer creates a new HTTP server.
func NewServer(addr string, registry *internal.Registry, authService *auth.Service, staticPath string, production bool) *Server {
	return &Server{
		addr:        addr,
		registry:    registry,
		authService: authService,
		staticPath:  staticPath,
		production:  production,
	}
}

// Run starts the HTTP server (blocking).
func (s *Server) Run() error {
	// Helper function to apply middleware (logging + optional CORS)
	withMiddleware := func(handler http.HandlerFunc) http.HandlerFunc {
		// Apply logging middleware first
		wrapped := loggingMiddleware(handler)
		// Then optionally apply CORS in non-production
		if !s.production {
			wrapped = corsMiddleware(wrapped)
		}
		return wrapped
	}

	// Auth endpoints - /auth/*
	authHandler := NewAuthHandler(s.authService)
	http.HandleFunc("/auth/", withMiddleware(authHandler.ServeHTTP))

	// REST API - /api/*
	restHandler := NewRESTHandler(s.registry, s.authService)
	http.HandleFunc("/api/", withMiddleware(restHandler.ServeHTTP))

	// WebSocket - /ws/*
	wsHandler := NewWebSocketHandler(s.registry, s.authService, s.production)
	http.HandleFunc("/ws/", withMiddleware(wsHandler.ServeHTTP))

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

	// Note: ReadTimeout and WriteTimeout are NOT set because of WebSocket connections
	server := &http.Server{
		Addr:        s.addr,
		Handler:     nil, // Uses DefaultServeMux
		IdleTimeout: 60 * time.Second,
	}

	return server.ListenAndServe()
}
