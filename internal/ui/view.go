package ui

import (
	"fmt"
	"strings"

	"Chat2/internal/provider"
)

func (m *Model) View() string {
	styles := GetStyles()
	
	// Get container dimensions
	containerWidth := m.Width - 4
	if containerWidth < 60 {
		containerWidth = 60
	}
	
	var sections []string
	
	// Welcome box
	welcomeText := "🌟 Welcome to PUKU CLI"
	welcome := styles.WelcomeBox.Width(containerWidth-4).Render(welcomeText)
	sections = append(sections, welcome)
	
	// ASCII Title with version
	asciiTitle := GeneratePUKUASCII()
	version := styles.Version.Render("V.0.0.1")
	
	// Combine title and version
	titleLines := strings.Split(asciiTitle, "\n")
	if len(titleLines) > 0 {
		spacing := containerWidth - len(stripANSI(titleLines[0])) - len("V.0.0.1") - 4
		if spacing < 0 {
			spacing = 2
		}
		titleLines[0] += strings.Repeat(" ", spacing) + version
	}
	titleWithVersion := strings.Join(titleLines, "\n")
	sections = append(sections, titleWithVersion)
	
	// Command menu (if enabled)
	if m.ShowCommands {
		sections = append(sections, m.renderCommandMenu(containerWidth-4))
	}
	
	// Messages area
	if len(m.Messages) > 0 {
		sections = append(sections, m.renderMessages(containerWidth-4))
	}
	
	// Streaming response
	if m.Streaming && m.CurrentResponse.Len() > 0 {
		streamingText := "AI: " + m.CurrentResponse.String() + "▎"
		streaming := styles.StreamingMessage.Width(containerWidth-4).Render(streamingText)
		sections = append(sections, streaming)
	}
	
	// Combine all sections
	content := strings.Join(sections, "\n\n")
	
	// Input area
	inputArea := m.renderInputArea(containerWidth-4)
	
	// Final container
	mainContent := styles.Container.Width(containerWidth).Render(content)
	
	return mainContent + "\n" + inputArea
}

func (m *Model) renderCommandMenu(width int) string {
	styles := GetStyles()
	var b strings.Builder
	
	for _, cmd := range Commands {
		commandLine := fmt.Sprintf("%s %s", 
			styles.CommandItem.Render(cmd.Name), 
			styles.CommandDescription.Render(cmd.Description))
		b.WriteString(commandLine + "\n")
	}
	
	return styles.CommandMenu.Width(width).Render(b.String())
}

func (m *Model) renderMessages(width int) string {
	styles := GetStyles()
	var b strings.Builder

	start := 0
	maxMessages := 6
	if len(m.Messages) > maxMessages {
		start = len(m.Messages) - maxMessages
	}

	for i := start; i < len(m.Messages); i++ {
		msg := m.Messages[i]
		
		if strings.HasPrefix(msg, "You:") {
			styled := styles.UserMessage.Width(width).Render(msg)
			b.WriteString(styled + "\n")
		} else if strings.HasPrefix(msg, "AI:") {
			styled := styles.AIMessage.Width(width).Render(msg)
			b.WriteString(styled + "\n")
		} else if strings.HasPrefix(msg, "❌") {
			styled := styles.Error.Render(msg)
			b.WriteString(styled + "\n")
		} else if strings.HasPrefix(msg, "🎉") || strings.HasPrefix(msg, "🔗") || strings.HasPrefix(msg, "📁") || strings.HasPrefix(msg, "📋") || strings.HasPrefix(msg, "🎨") {
			styled := styles.Success.Render(msg)
			b.WriteString(styled + "\n")
		} else {
			styled := styles.Dim.Render(msg)
			b.WriteString(styled + "\n")
		}
	}

	return b.String()
}

func (m *Model) renderInputArea(width int) string {
	styles := GetStyles()
	
	// Create input with placeholder if empty
	inputValue := m.TextInput.Value()
	if inputValue == "" && !m.TextInput.Focused() {
		inputValue = styles.InputPlaceholder.Render(m.TextInput.Placeholder)
	} else {
		inputValue = styles.InputField.Render(inputValue)
	}
	
	// Add icons on the right
	icons := styles.InputIcons.Render("📎  ⊞")
	
	// Calculate spacing
	inputText := "> " + inputValue
	padding := width - len(stripANSI(inputText)) - 4 // 4 chars for icons
	if padding < 0 {
		padding = 0
	}
	
	inputLine := inputText + strings.Repeat(" ", padding) + icons
	
	return styles.InputContainer.Width(width+4).Render(inputLine)
}

func (m *Model) renderProviderList(width int) string {
	styles := GetStyles()
	var b strings.Builder
	b.WriteString("Available Providers:\n")

	for _, providerName := range m.AvailableProviders {
		status := "⚪"
		if providerName == m.CurrentProvider {
			status = "🟢"
		}
		b.WriteString(fmt.Sprintf("%s %s (%s)\n", status, provider.Providers[providerName].Name, providerName))
	}

	return styles.Container.Width(width).Render(b.String())
}

// Helper function to strip ANSI codes for length calculation
func stripANSI(s string) string {
	// Simple approach: count runes instead of trying to strip ANSI
	runes := []rune(s)
	visibleCount := 0
	inEscape := false
	
	for i, r := range runes {
		if r == '\x1b' && i+1 < len(runes) && runes[i+1] == '[' {
			inEscape = true
			continue
		}
		if inEscape {
			if r == 'm' {
				inEscape = false
			}
			continue
		}
		visibleCount++
	}
	
	return strings.Repeat("x", visibleCount)
}