package views

import (
	"strings"

	"Chat2/internal/api"
	"Chat2/internal/types"

	tea "github.com/charmbracelet/bubbletea"
)

func (m *MainView) handleKeyInput(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	// Global key handlers that work in all states
	switch msg.Type {
	case tea.KeyCtrlC:
		return m, tea.Quit

	case tea.KeyEsc:
		// Escape key: return to previous state if in help/file browser
		if m.state == types.StateHelp || m.state == types.StateFileBrowser {
			m.state = m.previousState
			return m, nil
		}
		// Show exit confirmation dialog
		if m.state != types.StateExitConfirm {
			m.previousState = m.state
			m.state = types.StateExitConfirm
			return m, nil
		}
		// If already in exit confirm, cancel and go back
		m.state = m.previousState
		return m, nil

	// Help system - ? key (only if there's no text before it)
	case tea.KeyRunes:
		if len(msg.Runes) > 0 && msg.Runes[0] == '?' {
			// Only show help if the input field is empty before typing '?'
			inputValue := strings.TrimSpace(m.input.Value())
			if inputValue == "" && m.state != types.StateHelp {
				m.previousState = m.state
				m.state = types.StateHelp
				m.input.SetValue("") // Clear the '?' character
				return m, nil
			}
		}
	}

	// State-specific key handlers
	switch m.state {
	case types.StateHelp:
		return m.handleHelpKeys(msg)
	case types.StateFileBrowser:
		return m.handleFileBrowserKeys(msg)
	case types.StateExitConfirm:
		return m.handleExitConfirmKeys(msg)
	default:
		return m.handleDefaultKeys(msg)
	}
}

func (m *MainView) handleDefaultKeys(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.Type {
	case tea.KeyTab:
		if len(m.availableProviders) > 1 {
			return m, m.SwitchProvider()
		}

	case tea.KeyCtrlP:
		m.showProviders = !m.showProviders
		m.sidebar.SetShowProviders(m.showProviders)
		return m, nil

	case tea.KeyEnter:
		if !m.loading && !m.streaming && strings.TrimSpace(m.input.Value()) != "" {
			message := strings.TrimSpace(m.input.Value())

			// Check if it's a command
			if strings.HasPrefix(message, "/") {
				return m.commands.Execute(message)
			}

			if len(m.availableProviders) == 0 {
				m.session.AddMessage("❌ No AI provider configured. Please set up API keys.")
				return m, nil
			}

			m.session.AddUserMessage(message)
			m.input.SetValue("")
			m.streaming = true
			m.currentResponse.Reset()

			// Transition to active state on first message
			if m.state == types.StateLanding {
				m.state = types.StateChat
				m.showCommands = false
				m.showSidebar = true
				m.sidebar.SetVisible(true)
			}

			return m, api.SendToAI(message, m.currentProvider, m.apiKeys)
		}
	}

	// Update text input for default states
	var cmd tea.Cmd
	m.input, cmd = m.input.Update(msg)
	return m, cmd
}

func (m *MainView) handleHelpKeys(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	// In help mode, most keys just return to previous state
	switch msg.Type {
	case tea.KeyEnter, tea.KeySpace:
		m.state = m.previousState
		return m, nil
	}
	return m, nil
}

func (m *MainView) handleFileBrowserKeys(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	// File browser navigation (to be implemented)
	switch msg.Type {
	case tea.KeyEnter:
		m.state = m.previousState
		return m, nil
	}
	return m, nil
}

func (m *MainView) handleExitConfirmKeys(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.Type {
	case tea.KeyLeft, tea.KeyRight:
		// Toggle between Yes (0) and No (1)
		m.exitToggleSelected = (m.exitToggleSelected + 1) % 2
		return m, nil
	case tea.KeyRunes:
		if len(msg.Runes) > 0 {
			switch strings.ToLower(string(msg.Runes[0])) {
			case "y":
				m.exitToggleSelected = 0
				return m, tea.Quit
			case "n":
				m.exitToggleSelected = 1
				m.state = m.previousState
				return m, nil
			}
		}
	case tea.KeyEnter:
		if m.exitToggleSelected == 0 {
			// Yes selected - exit
			return m, tea.Quit
		} else {
			// No selected - go back
			m.state = m.previousState
			return m, nil
		}
	}
	return m, nil
}