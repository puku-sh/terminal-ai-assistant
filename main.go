package main

import (
	"fmt"

	"Chat2/internal/app"
)

func main() {
	fmt.Printf("Starting PUKU CLI...\n")
	
	// Initialize app
	application := app.New()
	fmt.Printf("App initialized successfully\n")
	
	fmt.Printf("Starting TUI program...\n")
	if err := application.Start(); err != nil {
		fmt.Printf("Error running program: %v\n", err)
	}
	
	fmt.Printf("Program ended.\n")
}
