package types

import (
	"strings"

	"github.com/charmbracelet/bubbles/textinput"
	tea "github.com/charmbracelet/bubbletea"
)

type (
	ResponseMsg     string
	StreamCharMsg   string
	StreamEndMsg    struct{}
	ErrorMsg        string
	ProviderSetMsg  string
	ConfigLoadedMsg struct{}
	AnimationMsg    struct{}
)

type State int

const (
	StateLanding State = iota
	StateActive
	StateChat
	StateHelp
	StateFileBrowser
	StateExitConfirm
)

type AIProvider struct {
	Name    string
	APIKey  string
	BaseURL string
	Model   string
}

// UIModel interface defines the contract for UI models
type UIModel interface {
	tea.Model
	
	// Message management
	AddMessage(string)
	ClearMessages()
	GetMessages() []string
	
	// Provider management
	GetCurrentProvider() string
	GetAvailableProviders() []string
	SwitchProvider() tea.Cmd
	
	// State management
	GetState() State
	SetState(State)
	GetPreviousState() State
	SetPreviousState(State)
	
	// Theme management
	GetCurrentTheme() string
	SetCurrentTheme(string)
	
	// File browser
	GetFileBrowserPath() string
	SetFileBrowserPath(string)
}

// Legacy model struct for compatibility
type Model struct {
	TextInput          textinput.Model
	Messages           []string
	Loading            bool
	Streaming          bool
	CurrentResponse    strings.Builder
	CurrentProvider    string
	AvailableProviders []string
	Err                error
	Width              int
	Height             int
	APIKeys            map[string]string
	ShowProviders      bool
}

type TeaMsg = tea.Msg
type TeaModel = tea.Model
type TeaCmd = tea.Cmd

// Global program state for streaming responses
var globalProgram *tea.Program

func SetGlobalProgram(program *tea.Program) {
	globalProgram = program
}

func GetGlobalProgram() *tea.Program {
	return globalProgram
}
