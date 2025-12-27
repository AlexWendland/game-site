package main

import (
	"flag"
	"log"

	"github.com/AlexWendland/games-site/internal/app"
	"github.com/AlexWendland/games-site/internal/infra/api"
	"github.com/AlexWendland/games-site/internal/infra/auth"
)

func main() {
	// Parse command-line flags
	prod := flag.Bool("prod", false, "run in production mode (serves static files from ./frontend/dist)")
	flag.Parse()

	// Create session registry
	registry := app.NewRegistry()

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
		log.Println("Start Next.js dev server separately: cd frontend && npm run dev")
	}

	// Create and start HTTP server
	server := api.NewServer(":8080", registry, authService, staticPath, *prod)
	log.Fatal(server.Run())
}
