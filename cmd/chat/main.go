package main

import (
	"fmt"

	"Chat2/internal/provider"
	"Chat2/internal/ui"

	tea "github.com/charmbracelet/bubbletea"
)

func main() {

	program := tea.NewProgram(ui.InitialModel(), tea.WithAltScreen())
	provider.GlobalProgram = program

	if _, err := program.Run(); err != nil {
		fmt.Printf("Error: %v\n", err)
	}
}
