package views

import (
	"fmt"
	"strings"
	"time"

	"Chat2/internal/api"
	"Chat2/internal/chat"
	"Chat2/internal/commands"
	"Chat2/internal/types"
	"Chat2/internal/ui/components"

	tea "github.com/charmbracelet/bubbletea"
)

type MainView struct {
	// Core components
	input    *components.InputComponent
	sidebar  *components.SidebarComponent
	session  *chat.Session
	commands *commands.Registry

	// State
	state           types.State
	previousState   types.State
	loading         bool
	streaming       bool
	currentResponse strings.Builder

	// Provider and theme management
	currentProvider    string
	availableProviders []string
	apiKeys            map[string]string
	currentTheme       string

	// UI state
	width              int
	height             int
	showProviders      bool
	showCommands       bool
	showSidebar        bool
	showAnimatedAscii  bool
	animationFrame     int
	animatedIconFrame  int

	// File browser state
	fileBrowserPath  string
	fileBrowserItems []string

	// Exit confirmation
	exitConfirm        bool
	exitToggleSelected int
}

func NewMainView(apiKeys map[string]string) *MainView {
	var availableProviders []string
	for name := range api.Providers {
		if key, exists := apiKeys[name]; exists && key != "" {
			availableProviders = append(availableProviders, name)
		}
	}

	currentProvider := "openrouter"
	if len(availableProviders) > 0 {
		currentProvider = availableProviders[0]
	}

	session := chat.NewSession(currentProvider)
	
	mv := &MainView{
		input:              components.NewInputComponent("Write something that i don't know..."),
		sidebar:            components.NewSidebarComponent(),
		session:            session,
		state:              types.StateLanding,
		currentProvider:    currentProvider,
		availableProviders: availableProviders,
		apiKeys:            apiKeys,
		currentTheme:       "puku",
		showCommands:       true,
		showSidebar:        false,
		showAnimatedAscii:  true,
		width:              80,
		height:             24,
		exitToggleSelected: 1,
		animatedIconFrame:  0,
	}

	mv.commands = commands.NewRegistry(mv)
	
	// Configure sidebar
	mv.sidebar.SetCurrentProvider(currentProvider)
	mv.sidebar.SetCurrentTheme(mv.currentTheme)
	mv.sidebar.SetAvailableProviders(availableProviders)

	return mv
}

func (m *MainView) Init() tea.Cmd {
	return tea.Batch(
		m.input.Focus(),
		tea.Cmd(func() tea.Msg {
			return types.ConfigLoadedMsg{}
		}),
		tea.Tick(time.Millisecond*150, func(time.Time) tea.Msg {
			return types.AnimationMsg{}
		}),
	)
}

func (m *MainView) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	var cmd tea.Cmd

	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		return m, nil

	case types.ConfigLoadedMsg:
		if len(m.availableProviders) == 0 {
			m.session.AddMessage("⚠️  No API keys found. Please set OPENROUTER_API_KEY environment variable.")
		} else {
			m.session.AddMessage(fmt.Sprintf("🎉 Ready! Using %s. Press Tab to switch providers.", strings.ToUpper(m.currentProvider)))
		}
		return m, nil

	case tea.KeyMsg:
		return m.handleKeyInput(msg)

	case types.StreamCharMsg:
		m.currentResponse.WriteString(string(msg))
		return m, nil

	case types.StreamEndMsg:
		if m.currentResponse.Len() > 0 {
			response := m.currentResponse.String()
			m.session.AddAIResponse(response)
		}
		m.currentResponse.Reset()
		m.streaming = false
		return m, nil

	case types.ResponseMsg:
		m.session.AddAIResponse(string(msg))
		m.loading = false
		m.streaming = false
		return m, nil

	case types.ErrorMsg:
		m.session.AddErrorMessage(string(msg))
		m.loading = false
		m.streaming = false
		return m, nil

	case types.ProviderSetMsg:
		m.currentProvider = string(msg)
		m.session.SetProvider(m.currentProvider)
		m.sidebar.SetCurrentProvider(m.currentProvider)
		return m, nil

	case types.AnimationMsg:
		m.animationFrame++
		m.animatedIconFrame++
		return m, tea.Tick(time.Millisecond*150, func(time.Time) tea.Msg {
			return types.AnimationMsg{}
		})
	}

	m.input, cmd = m.input.Update(msg)
	return m, cmd
}

// Implement UIModel interface
func (m *MainView) AddMessage(message string) {
	m.session.AddMessage(message)
}

func (m *MainView) ClearMessages() {
	m.session.Clear()
}

func (m *MainView) GetMessages() []string {
	return m.session.GetMessages()
}

func (m *MainView) GetCurrentProvider() string {
	return m.currentProvider
}

func (m *MainView) GetAvailableProviders() []string {
	return m.availableProviders
}

func (m *MainView) SwitchProvider() tea.Cmd {
	if len(m.availableProviders) <= 1 {
		return nil
	}

	currentIndex := 0
	for i, provider := range m.availableProviders {
		if provider == m.currentProvider {
			currentIndex = i
			break
		}
	}

	nextIndex := (currentIndex + 1) % len(m.availableProviders)
	nextProvider := m.availableProviders[nextIndex]

	return func() tea.Msg {
		return types.ProviderSetMsg(nextProvider)
	}
}

func (m *MainView) GetState() types.State {
	return m.state
}

func (m *MainView) SetState(state types.State) {
	m.state = state
}

func (m *MainView) GetPreviousState() types.State {
	return m.previousState
}

func (m *MainView) SetPreviousState(state types.State) {
	m.previousState = state
}

func (m *MainView) GetCurrentTheme() string {
	return m.currentTheme
}

func (m *MainView) SetCurrentTheme(theme string) {
	m.currentTheme = theme
	m.sidebar.SetCurrentTheme(theme)
}

func (m *MainView) GetFileBrowserPath() string {
	return m.fileBrowserPath
}

func (m *MainView) SetFileBrowserPath(path string) {
	m.fileBrowserPath = path
}