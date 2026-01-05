package main

import (
	"flag"
	"log"
	"log/slog"

	"github.com/AlexWendland/games-site/backend/internal"
	"github.com/AlexWendland/games-site/backend/internal/api"
	"github.com/AlexWendland/games-site/backend/internal/auth"
)

func main() {
	// Parse command-line flags
	prod := flag.Bool("prod", false, "run in production mode (serves static files from ./frontend/dist)")
	flag.Parse()

	// Create session registry
	registry := internal.NewRegistry()

	// Create auth service
	authService := auth.NewService()

	// Determine static path based on mode
	var staticPath string
	if *prod {
		staticPath = "./frontend/dist"
		log.Println("Running in production mode - serving static files from", staticPath)
	} else {
		staticPath = ""
		log.Println("Running in development mode - static files NOT served")
	}

	// Set up logging
	log.SetFlags(log.Ldate | log.Ltime | log.Llongfile)
	if !*prod {
		slog.SetLogLoggerLevel(slog.LevelDebug)
	}

	// Create and start HTTP server
	server := api.NewServer(":8080", registry, authService, staticPath, *prod)
	log.Fatal(server.Run())
}
