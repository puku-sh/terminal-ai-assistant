package views

import (
	"fmt"
	"strings"

	"Chat2/internal/themes"
	"Chat2/internal/types"
	"Chat2/internal/ui"

	"github.com/charmbracelet/lipgloss"
)

func (m *MainView) View() string {
	// Get container dimensions with responsive handling
	width := m.width
	height := m.height

	if width == 0 {
		width = 70
	}
	if height == 0 {
		height = 24
	}

	containerWidth := width - 10
	minWidth := 80
	if containerWidth < minWidth-4 {
		containerWidth = minWidth - 4
	}

	// Only show size warning for very small terminals
	minHeight := 14
	if width > 0 && height > 0 && (width < minWidth || height < minHeight) {
		theme := themes.GetCurrentTheme()
		return lipgloss.NewStyle().
			Foreground(lipgloss.Color(theme.Error)).
			Bold(true).
			Render(fmt.Sprintf("Terminal too small (%dx%d). Please resize to at least 80x24.", width, height))
	}

	// Chat mode vs Landing mode layout - based on state and user message count
	hasUserMessages := false
	for _, msg := range m.session.GetMessages() {
		if strings.HasPrefix(msg, "You:") {
			hasUserMessages = true
			break
		}
	}

	// Calculate layout dimensions - sidebar takes 30% of width when visible
	sidebarWidth := 0
	mainContentWidth := containerWidth

	// Only show sidebar if not in active chat mode
	showSidebarInCurrentState := m.showSidebar && !(m.state == types.StateChat || (hasUserMessages && m.state != types.StateHelp && m.state != types.StateFileBrowser && m.state != types.StateExitConfirm))

	if showSidebarInCurrentState {
		sidebarWidth = int(float64(containerWidth) * 0.3)
		mainContentWidth = containerWidth - sidebarWidth - 2
	}

	var mainView string
	switch m.state {
	case types.StateHelp:
		mainView = m.renderHelpView(mainContentWidth)
	case types.StateFileBrowser:
		mainView = m.renderFileBrowserView(mainContentWidth)
	case types.StateChat:
		mainView = m.renderChatView(mainContentWidth)
	case types.StateExitConfirm:
		mainView = m.renderExitConfirmView(mainContentWidth)
	default:
		if hasUserMessages {
			mainView = m.renderChatView(mainContentWidth)
		} else {
			mainView = m.renderLandingView(mainContentWidth)
		}
	}

	// Add sidebar to the layout if visible
	if showSidebarInCurrentState {
		sidebarView := m.sidebar.View(sidebarWidth, height)
		mainView = lipgloss.JoinHorizontal(lipgloss.Top, mainView, "  ", sidebarView)
	}

	// Add enhanced status bar at the bottom
	statusBar := m.renderEnhancedStatusBar(width)

	// Calculate available height for content vs fixed bottom elements
	statusBarHeight := 1
	inputAreaHeight := 3
	availableHeight := height - statusBarHeight - inputAreaHeight - 2

	// If we have a chat view, make sure input area sticks to bottom
	if m.state == types.StateChat || (hasUserMessages && m.state != types.StateHelp && m.state != types.StateFileBrowser && m.state != types.StateExitConfirm) {
		contentHeight := availableHeight
		if contentHeight < 5 {
			contentHeight = 5
		}

		// Render input area separately for chat mode
		inputArea := m.renderInputArea(width - 4)

		// Ensure main content takes available space, input area at bottom
		paddedMainView := lipgloss.NewStyle().
			Height(contentHeight).
			Align(lipgloss.Top).
			Render(mainView)

		return paddedMainView + "\n" + inputArea + "\n" + statusBar
	}

	return mainView + "\n" + statusBar
}

func (m *MainView) renderLandingView(containerWidth int) string {
	styles := ui.GetStyles()
	theme := themes.GetCurrentTheme()
	var sections []string

	// Welcome section with animated icon
	welcomeText := m.getAnimatedIcon() + " Welcome to PUKU CLI"
	centeredWelcome := styles.WelcomeBox.Width(30).Render(welcomeText)
	sections = append(sections, centeredWelcome)

	// ASCII Title with version and gradient styling
	asciiTitle := ui.GeneratePUKUASCII()
	version := lipgloss.NewStyle().
		Foreground(lipgloss.Color(theme.DimText)).
		Italic(true).
		Render("V.0.0.1")

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

	// Feature description card
	featureCard := m.renderFeatureCard(containerWidth - 8)
	sections = append(sections, featureCard)

	// Tips section
	if m.showCommands {
		tipsCard := m.renderTipsCard(containerWidth - 8)
		sections = append(sections, tipsCard)
	}

	// Combine all sections
	content := strings.Join(sections, "\n\n")

	// Input area
	inputArea := m.renderInputArea(containerWidth - 4)

	// Final container
	mainContent := styles.Container.Width(containerWidth).Render(content)

	return mainContent + "\n" + inputArea
}

func (m *MainView) renderChatView(containerWidth int) string {
	styles := ui.GetStyles()
	var sections []string

	// Show quick commands in chat mode
	if m.showCommands {
		commandCard := m.renderQuickCommands(containerWidth - 8)
		sections = append(sections, commandCard)
	}

	// Chat messages area
	if len(m.session.GetMessages()) > 0 {
		sections = append(sections, m.renderMessages(containerWidth-4))
	}

	// Streaming response
	if m.streaming && m.currentResponse.Len() > 0 {
		theme := themes.GetCurrentTheme()
		streamingText := m.getAnimatedIcon() + " " + m.currentResponse.String() + "▎"

		streamingBoxStyle := lipgloss.NewStyle().
			Foreground(lipgloss.Color(theme.Text)).
			Background(lipgloss.Color(theme.InputBackground)).
			Padding(1, 2).
			BorderLeft(true).
			BorderStyle(lipgloss.ThickBorder()).
			Width(containerWidth - 6).
			MarginLeft(1)

		streaming := streamingBoxStyle.Render(streamingText)
		sections = append(sections, streaming)
	}

	// Combine all sections
	content := strings.Join(sections, "\n\n")

	// Final container
	mainContent := styles.Container.Width(containerWidth).Render(content)

	return mainContent
}

func (m *MainView) renderMessages(width int) string {
	var b strings.Builder
	messages := m.session.GetMessages()

	start := 0
	maxMessages := 10
	if len(messages) > maxMessages {
		start = len(messages) - maxMessages
	}

	for i := start; i < len(messages); i++ {
		msg := messages[i]

		if strings.HasPrefix(msg, "You:") {
			// User messages
			theme := themes.GetCurrentTheme()
			userText := strings.TrimPrefix(msg, "You: ")

			userBoxStyle := lipgloss.NewStyle().
				Foreground(lipgloss.Color(theme.Text)).
				Background(lipgloss.Color(theme.InputBackground)).
				Padding(1, 2).
				BorderLeft(true).
				BorderStyle(lipgloss.ThickBorder()).
				BorderForeground(lipgloss.Color(theme.Success)).
				Width(width - 6).
				MarginLeft(1)

			styledUser := userBoxStyle.Render(userText)

			rightAlignedUser := lipgloss.NewStyle().
				Width(width).
				Render(styledUser)

			b.WriteString(rightAlignedUser + "\n\n")

		} else if strings.HasPrefix(msg, "AI:") {
			// AI responses
			theme := themes.GetCurrentTheme()
			responseText := strings.TrimPrefix(msg, "AI: ")

			responseWithIcon := m.getAnimatedIcon() + " " + responseText

			boxStyle := lipgloss.NewStyle().
				Foreground(lipgloss.Color(theme.Text)).
				Background(lipgloss.Color(theme.InputBackground)).
				Padding(1, 2).
				BorderLeft(true).
				BorderStyle(lipgloss.ThickBorder()).
				BorderForeground(lipgloss.Color(theme.Primary)).
				Width(width - 6).
				MarginLeft(1)

			styledResponse := boxStyle.Render(responseWithIcon)
			b.WriteString(styledResponse + "\n\n")

		} else if strings.HasPrefix(msg, "❌") {
			theme := themes.GetCurrentTheme()
			errorStyle := lipgloss.NewStyle().
				Foreground(lipgloss.Color(theme.Error)).
				Bold(true)
			styled := errorStyle.Render(msg)
			b.WriteString(styled + "\n")
		} else if strings.HasPrefix(msg, "🎉") || strings.HasPrefix(msg, "🔗") || strings.HasPrefix(msg, "📁") || strings.HasPrefix(msg, "📋") || strings.HasPrefix(msg, "🎨") {
			theme := themes.GetCurrentTheme()
			successStyle := lipgloss.NewStyle().
				Foreground(lipgloss.Color(theme.Success)).
				Bold(true)
			styled := successStyle.Render(msg)
			b.WriteString(styled + "\n")
		} else {
			theme := themes.GetCurrentTheme()
			dimStyle := lipgloss.NewStyle().
				Foreground(lipgloss.Color(theme.DimText))
			styled := dimStyle.Render(msg)
			b.WriteString(styled + "\n")
		}
	}

	return b.String()
}

// Additional rendering helper methods would go here...
// (renderInputArea, renderFeatureCard, renderTipsCard, etc.)