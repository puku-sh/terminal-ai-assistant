package ui

import (
	"fmt"
	"strings"

	"Chat2/internal/config"
	"Chat2/internal/provider"
	"Chat2/internal/types"

	"github.com/charmbracelet/bubbles/textinput"
	tea "github.com/charmbracelet/bubbletea"
)

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

func InitialModel() *Model {
	ti := textinput.New()
	ti.Placeholder = "Type your message here..."
	ti.Focus()
	ti.CharLimit = 1000
	ti.Width = 60

	apiKeys := config.LoadAPIKeys()

	var available []string
	for name := range provider.Providers {
		if key, exists := apiKeys[name]; exists && key != "" {
			available = append(available, name)
		}
	}

	currentProvider := "openrouter"
	if len(available) > 0 {
		currentProvider = available[0]
	}

	return &Model{
		TextInput:          ti,
		Messages:           []string{},
		Loading:            false,
		Streaming:          false,
		CurrentProvider:    currentProvider,
		AvailableProviders: available,
		APIKeys:            apiKeys,
		ShowProviders:      false,
	}
}

func (m *Model) Init() tea.Cmd {
	return tea.Batch(textinput.Blink, tea.Cmd(func() tea.Msg {
		return types.ConfigLoadedMsg{}
	}))
}

func (m *Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {

	var cmd tea.Cmd

	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.Width = msg.Width
		m.Height = msg.Height
		return m, nil

	case types.ConfigLoadedMsg:
		if len(m.AvailableProviders) == 0 {
			m.Messages = append(m.Messages, "⚠️  No API keys found. Please set OPENROUTER_API_KEY environment variable.")
		} else {
			m.Messages = append(m.Messages, fmt.Sprintf("🎉 Ready! Using %s. Press Tab to switch providers.", strings.ToUpper(m.CurrentProvider)))
		}
		return m, nil

	case tea.KeyMsg:
		switch msg.Type {
		case tea.KeyCtrlC, tea.KeyEsc:
			return m, tea.Quit

		case tea.KeyTab:
			if len(m.AvailableProviders) > 1 {
				return m, m.switchProvider()
			}

		case tea.KeyCtrlP:
			m.ShowProviders = !m.ShowProviders
			return m, nil

		case tea.KeyEnter:
			if !m.Loading && !m.Streaming && strings.TrimSpace(m.TextInput.Value()) != "" {
				message := strings.TrimSpace(m.TextInput.Value())

				if len(m.AvailableProviders) == 0 {
					m.Messages = append(m.Messages, "❌ No AI provider configured. Please set up API keys.")
					return m, nil
				}

				m.Messages = append(m.Messages, "You: "+message)
				m.TextInput.SetValue("")
				m.Streaming = true
				m.CurrentResponse.Reset()

				return m, provider.SendToAI(message, m.CurrentProvider, m.APIKeys)
			}
		}

	case types.StreamCharMsg:
		m.CurrentResponse.WriteString(string(msg))
		return m, nil

	case types.StreamEndMsg:
		if m.CurrentResponse.Len() > 0 {
			response := m.CurrentResponse.String()
			m.Messages = append(m.Messages, "AI: "+response)
		}
		m.CurrentResponse.Reset()
		m.Streaming = false
		return m, nil

	case types.ResponseMsg:
		m.Messages = append(m.Messages, "AI: "+string(msg))
		m.Loading = false
		m.Streaming = false
		return m, nil

	case types.ErrorMsg:
		m.Messages = append(m.Messages, "❌ Error: "+string(msg))
		m.Loading = false
		m.Streaming = false
		return m, nil

	case types.ProviderSetMsg:
		m.CurrentProvider = string(msg)
		m.Messages = append(m.Messages, fmt.Sprintf("🔄 Switched to %s", strings.ToUpper(m.CurrentProvider)))
		return m, nil
	}

	m.TextInput, cmd = m.TextInput.Update(msg)
	return m, cmd
}

func (m *Model) switchProvider() tea.Cmd {
	if len(m.AvailableProviders) <= 1 {
		return nil
	}

	currentIndex := 0
	for i, provider := range m.AvailableProviders {
		if provider == m.CurrentProvider {
			currentIndex = i
			break
		}
	}

	nextIndex := (currentIndex + 1) % len(m.AvailableProviders)
	nextProvider := m.AvailableProviders[nextIndex]

	return func() tea.Msg {
		return types.ProviderSetMsg(nextProvider)
	}
}
