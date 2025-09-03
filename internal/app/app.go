package app

import (
	"Chat2/internal/config"
	"Chat2/internal/types"
	"Chat2/internal/ui/views"
	
	tea "github.com/charmbracelet/bubbletea"
)

type App struct {
	model    *views.MainView
	program  *tea.Program
	apiKeys  map[string]string
}

func New() *App {
	apiKeys := config.LoadAPIKeys()
	model := views.NewMainView(apiKeys)
	
	return &App{
		model:   model,
		apiKeys: apiKeys,
	}
}

func (a *App) Start() error {
	a.program = tea.NewProgram(a.model, tea.WithAltScreen())
	
	// Set global program for streaming responses
	types.SetGlobalProgram(a.program)
	
	_, err := a.program.Run()
	return err
}

func (a *App) GetProgram() *tea.Program {
	return a.program
}