package main

import (
	"fmt"

	"Chat2/internal/api"
	"Chat2/internal/app"
)

func main() {
	fmt.Printf("Starting PUKU CLI...\n")

	// Initialize SDK client
	fmt.Printf("Connecting to PukuCode server...\n")
	if err := api.InitSDKClient(); err != nil {
		fmt.Printf("⚠️  Warning: Could not connect to PukuCode server: %v\n", err)
		fmt.Printf("Make sure PukuCode server is running: cd packages/pukucode && bun run dev\n")
		fmt.Printf("Continuing with direct API mode...\n\n")
	} else {
		session := api.GetCurrentSession()
		fmt.Printf("✅ Connected to PukuCode server\n")
		fmt.Printf("📝 Session created: %s\n\n", session.ID)
	}

	// Initialize app
	application := app.New()
	fmt.Printf("App initialized successfully\n")

	fmt.Printf("Starting TUI program...\n")
	if err := application.Start(); err != nil {
		fmt.Printf("Error running program: %v\n", err)
	}

	fmt.Printf("Program ended.\n")
}
