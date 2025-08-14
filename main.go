package main

import (
	"fmt"

	"Chat2/internal/provider"
	"Chat2/internal/ui"

	tea "github.com/charmbracelet/bubbletea"
)

func main() {
	fmt.Println("🚀 Starting OpenCode CLI Phase 2: Real AI Integration")
	fmt.Println("=======================================================")
	fmt.Println("Phase 2 Features:")
	fmt.Println("✅ Real AI API integration (OpenRouter)")
	fmt.Println("✅ Multiple provider support")
	fmt.Println("✅ Streaming responses")
	fmt.Println("✅ Provider switching (Tab key)")
	fmt.Println("✅ Environment variable configuration")
	fmt.Println("✅ Enhanced error handling")
	fmt.Println("✅ Real-time status indicators")
	fmt.Println("=======================================================")
	fmt.Println("Setup Instructions:")
	fmt.Println("1. Set OPENROUTER_API_KEY environment variable")
	fmt.Println("2. Or create .env file with this key")
	fmt.Println("=======================================================")
	fmt.Println("Press Ctrl+C to exit at any time\n")

	program := tea.NewProgram(ui.InitialModel(), tea.WithAltScreen())
	provider.GlobalProgram = program

	if _, err := program.Run(); err != nil {
		fmt.Printf("Error: %v\n", err)
	}
}
