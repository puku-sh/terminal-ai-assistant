package ui

import (
	"fmt"
	"strings"

	"Chat2/internal/provider"
)

func (m *Model) View() string {
	var b strings.Builder

	providerInfo := ProviderStyle.Render(strings.ToUpper(m.CurrentProvider))
	title := TitleStyle.Render("🚀 OpenCode Phase 2: AI Integration") + " " + providerInfo
	b.WriteString(title + "\n\n")

	if m.ShowProviders {
		b.WriteString(m.renderProviderList() + "\n")
	}

	messageArea := m.renderMessages()
	b.WriteString(messageArea)

	if m.Streaming && m.CurrentResponse.Len() > 0 {
		streamingText := "AI: " + m.CurrentResponse.String() + "▎"
		streaming := StreamingStyle.Width(m.Width - 4).Render(streamingText)
		b.WriteString(streaming + "\n")
	}

	b.WriteString("\n")
	input := InputStyle.Width(m.Width - 4).Render(m.TextInput.View())
	b.WriteString(input + "\n\n")

	help := HelpStyle.Render("Enter: Send • Tab: Switch Provider • Ctrl+P: Show Providers • Ctrl+C: Quit")
	b.WriteString(help + "\n")

	status := fmt.Sprintf("Provider: %s | Available: %v | Streaming: %v",
		strings.ToUpper(m.CurrentProvider), len(m.AvailableProviders), m.Streaming)
	statusStyled := HelpStyle.Render(status)
	b.WriteString(statusStyled)

	return b.String()
}

func (m *Model) renderProviderList() string {
	var b strings.Builder
	b.WriteString("Available Providers:\n")

	for _, providerName := range m.AvailableProviders {
		status := "⚪"
		if providerName == m.CurrentProvider {
			status = "🟢"
		}
		b.WriteString(fmt.Sprintf("%s %s (%s)\n", status, provider.Providers[providerName].Name, providerName))
	}

	return ProviderListStyle.Width(m.Width - 4).Render(b.String())
}

func (m *Model) renderMessages() string {
	var b strings.Builder

	start := 0
	maxMessages := 8
	if len(m.Messages) > maxMessages {
		start = len(m.Messages) - maxMessages
	}

	for i := start; i < len(m.Messages); i++ {
		msg := m.Messages[i]
		width := m.Width - 4
		if width < 30 {
			width = 30
		}

		if strings.HasPrefix(msg, "You:") {
			styled := UserMessageStyle.Width(width).Render(msg)
			b.WriteString(styled + "\n")
		} else if strings.HasPrefix(msg, "AI:") {
			styled := AIMessageStyle.Width(width).Render(msg)
			b.WriteString(styled + "\n")
		} else if strings.HasPrefix(msg, "❌") {
			styled := ErrorStyle.Render(msg)
			b.WriteString(styled + "\n")
		} else {
			b.WriteString(msg + "\n")
		}
	}

	return b.String()
}
