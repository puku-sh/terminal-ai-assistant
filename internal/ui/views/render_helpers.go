package views

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"Chat2/internal/themes"
	"Chat2/internal/ui"

	"github.com/charmbracelet/lipgloss"
)

func (m *MainView) renderInputArea(width int) string {
	theme := themes.GetCurrentTheme()

	// Directory path and provider info
	projectPath := getCurrentProjectPath()
	modelName := "Anthropic Claude"
	if len(m.availableProviders) > 0 {
		modelName = strings.ToUpper(m.currentProvider)
	}

	// Create boxed elements
	pathText := "📁 " + projectPath
	modelText := "🧠 " + modelName

	pathElement := lipgloss.NewStyle().
		Foreground(lipgloss.Color(theme.DimText)).
		Background(lipgloss.Color(theme.Background)).
		Border(lipgloss.RoundedBorder()).
		BorderForeground(lipgloss.Color(theme.Border)).
		Padding(0).
		Render(pathText)

	modelElement := lipgloss.NewStyle().
		Foreground(lipgloss.Color(theme.DimText)).
		Background(lipgloss.Color(theme.Background)).
		Border(lipgloss.RoundedBorder()).
		BorderForeground(lipgloss.Color(theme.Border)).
		Padding(0).
		Render(modelText)

	// Create header line
	headerLine := lipgloss.JoinHorizontal(lipgloss.Top,
		pathElement,
		strings.Repeat(" ", 2),
		modelElement)

	// Get input field view
	inputView := m.input.View()

	// Combine header and input
	inputContent := headerLine + "\n\n" + inputView

	// Create input container
	inputBoxStyle := lipgloss.NewStyle().
		Background(lipgloss.Color(theme.InputBackground)).
		Foreground(lipgloss.Color(theme.Text)).
		Padding(0, 1).
		Border(lipgloss.RoundedBorder()).
		BorderForeground(lipgloss.Color(theme.Border)).
		Width(width - 4).
		MarginLeft(2)

	return inputBoxStyle.Render(inputContent)
}

func (m *MainView) renderFeatureCard(width int) string {
	description := m.getAnimatedIcon() + " Effortless, Intuitive, Lightning-fast AI CLI."

	theme := themes.GetCurrentTheme()
	highlightStyle := lipgloss.NewStyle().
		BorderForeground(lipgloss.Color(theme.Border)).
		Background(lipgloss.Color(theme.Highlight)).
		Foreground(lipgloss.Color(theme.Background)).
		Padding(0, 1)

	keywords := []string{"Effortless", "Intuitive", "Lightning-fast"}

	highlightedDesc := description
	for _, keyword := range keywords {
		highlightedDesc = strings.ReplaceAll(highlightedDesc, keyword, highlightStyle.Render(keyword))
	}

	cardStyle := lipgloss.NewStyle().
		Border(lipgloss.RoundedBorder()).
		BorderForeground(lipgloss.Color(theme.Border)).
		Background(lipgloss.Color(theme.InputBackground)).
		Foreground(lipgloss.Color(theme.Text)).
		Padding(1, 2).
		Width(width).
		MarginLeft(1).
		MarginRight(1)

	return cardStyle.Render(highlightedDesc)
}

func (m *MainView) renderTipsCard(width int) string {
	theme := themes.GetCurrentTheme()

	tipsTitle := lipgloss.NewStyle().
		Foreground(lipgloss.Color(theme.Secondary)).
		Bold(true).
		Render("💡 Tips for getting started:")

	tips := []string{
		"1. Ask questions, edit files or run commands",
		"2. Be specific for the best result",
		"3. Press ? for help anytime",
		"4. Use /commands for quick actions",
	}

	tipsContent := tipsTitle + "\n\n"
	for _, tip := range tips {
		tipsContent += lipgloss.NewStyle().
			Foreground(lipgloss.Color(theme.Text)).
			Render(tip) + "\n"
	}

	cardStyle := lipgloss.NewStyle().
		Background(lipgloss.Color(theme.Background)).
		Padding(1, 2).
		Width(width)

	return cardStyle.Render(tipsContent)
}

func (m *MainView) renderQuickCommands(width int) string {
	theme := themes.GetCurrentTheme()

	commandsStyle := lipgloss.NewStyle().
		Border(lipgloss.RoundedBorder()).
		BorderForeground(lipgloss.Color(theme.Border)).
		Background(lipgloss.Color(theme.Background)).
		Foreground(lipgloss.Color(theme.Text)).
		Padding(0, 1).
		Width(width)

	quickCmds := []string{"/help", "/theme", "/new", "/p_drive"}

	var cmdButtons []string
	for _, cmd := range quickCmds {
		btnStyle := lipgloss.NewStyle().
			Foreground(lipgloss.Color(theme.Primary)).
			Bold(true).
			Padding(0, 1)
		cmdButtons = append(cmdButtons, btnStyle.Render(cmd))
	}

	commandsContent := "⚡ " + strings.Join(cmdButtons, " | ")

	return commandsStyle.Render(commandsContent)
}

func (m *MainView) renderEnhancedStatusBar(width int) string {
	connectionStatus := "🟢 Online"
	if len(m.availableProviders) == 0 {
		connectionStatus = "🔴 No API Keys"
	} else if m.streaming {
		connectionStatus = "🔄 Streaming"
	}

	messages := m.session.GetMessages()
	messageCount := len(messages)
	userMessages := 0
	for _, msg := range messages {
		if strings.HasPrefix(msg, "You:") {
			userMessages++
		}
	}

	sessionInfo := fmt.Sprintf("💬 %d msgs", messageCount)
	if userMessages > 0 {
		sessionInfo = fmt.Sprintf("💬 %d/%d msgs", userMessages, messageCount)
	}

	currentTime := fmt.Sprintf("🕐 %s", getCurrentTime())
	copilotIndicator := fmt.Sprintf("PUKU-%s", strings.ToUpper(m.currentProvider))

	leftSection := fmt.Sprintf("%s  %s 🎨 %s", connectionStatus, sessionInfo, strings.Title(m.currentTheme))
	rightSection := fmt.Sprintf("%s %s", copilotIndicator, currentTime)

	// Calculate spacing
	leftWidth := len(stripANSI(leftSection))
	rightWidth := len(stripANSI(rightSection))
	spacing := width - leftWidth - rightWidth - 8
	if spacing < 1 {
		spacing = 1
	}

	statusContent := leftSection + strings.Repeat(" ", spacing) + rightSection

	theme := themes.GetCurrentTheme()
	statusStyle := lipgloss.NewStyle().
		Background(lipgloss.Color(theme.InputBackground)).
		Foreground(lipgloss.Color(theme.DimText)).
		Padding(0, 1).
		Width(width)

	return statusStyle.Render(statusContent)
}

func (m *MainView) renderHelpView(containerWidth int) string {
	styles := ui.GetStyles()
	theme := themes.GetCurrentTheme()
	var sections []string

	title := lipgloss.NewStyle().
		Bold(true).
		Foreground(lipgloss.Color(theme.Primary)).
		Align(lipgloss.Center).
		Width(containerWidth).
		Render("📖 PUKU CLI Help")
	sections = append(sections, title)

	shortcutsTitle := lipgloss.NewStyle().
		Bold(true).
		Foreground(lipgloss.Color(theme.Secondary)).
		Render("⌨️  Keyboard Shortcuts")

	shortcuts := []string{
		"?               Show/hide this help",
		"Tab             Switch between providers",
		"Ctrl+P          Toggle provider list",
		"Ctrl+C          Quit application",
		"Esc             Cancel/Go back",
		"Enter           Send message/Execute command",
	}

	shortcutsList := ""
	for _, shortcut := range shortcuts {
		parts := strings.SplitN(shortcut, " ", 2)
		if len(parts) == 2 {
			keyStyle := lipgloss.NewStyle().
				Foreground(lipgloss.Color(theme.Primary)).
				Bold(true)
			descStyle := lipgloss.NewStyle().
				Foreground(lipgloss.Color(theme.Text))

			formatted := fmt.Sprintf("  %s  %s\n",
				keyStyle.Render(fmt.Sprintf("%-15s", parts[0])),
				descStyle.Render(parts[1]))
			shortcutsList += formatted
		}
	}

	sections = append(sections, shortcutsTitle)
	sections = append(sections, shortcutsList)

	footer := lipgloss.NewStyle().
		Foreground(lipgloss.Color(theme.DimText)).
		Italic(true).
		Align(lipgloss.Center).
		Width(containerWidth).
		Render("Press any key to return • ESC to go back")
	sections = append(sections, footer)

	content := strings.Join(sections, "\n\n")
	return styles.Container.Width(containerWidth).Render(content)
}

func (m *MainView) renderFileBrowserView(containerWidth int) string {
	styles := ui.GetStyles()
	theme := themes.GetCurrentTheme()
	var sections []string

	title := lipgloss.NewStyle().
		Bold(true).
		Foreground(lipgloss.Color(theme.Primary)).
		Align(lipgloss.Center).
		Width(containerWidth).
		Render("📁 File Browser")
	sections = append(sections, title)

	pathDisplay := lipgloss.NewStyle().
		Foreground(lipgloss.Color(theme.Secondary)).
		Bold(true).
		Render("📍 Current Path: " + m.fileBrowserPath)
	sections = append(sections, pathDisplay)

	// Directory contents would be implemented here
	instructions := lipgloss.NewStyle().
		Foreground(lipgloss.Color(theme.DimText)).
		Italic(true).
		Render("📋 Navigation: ↑↓ to select, Enter to open, ESC to go back")
	sections = append(sections, instructions)

	content := strings.Join(sections, "\n\n")
	return styles.Container.Width(containerWidth).Render(content)
}

func (m *MainView) renderExitConfirmView(containerWidth int) string {
	theme := themes.GetCurrentTheme()

	dialogWidth := 50
	if containerWidth < 50 {
		dialogWidth = containerWidth - 4
	}

	title := lipgloss.NewStyle().
		Bold(true).
		Foreground(lipgloss.Color(theme.Text)).
		Align(lipgloss.Center).
		Width(dialogWidth - 4).
		Render("Are you sure you want to quit?")

	yesStyle := lipgloss.NewStyle().
		Padding(0, 2).
		Margin(0, 1)

	noStyle := lipgloss.NewStyle().
		Padding(0, 2).
		Margin(0, 1)

	if m.exitToggleSelected == 0 {
		yesStyle = yesStyle.
			Background(lipgloss.Color(theme.Primary)).
			Foreground(lipgloss.Color("#ffffff")).
			Bold(true)
		noStyle = noStyle.
			Border(lipgloss.NormalBorder()).
			BorderForeground(lipgloss.Color(theme.Border)).
			Foreground(lipgloss.Color(theme.Text))
	} else {
		yesStyle = yesStyle.
			Border(lipgloss.NormalBorder()).
			BorderForeground(lipgloss.Color(theme.Border)).
			Foreground(lipgloss.Color(theme.Text))
		noStyle = noStyle.
			Background(lipgloss.Color(theme.Primary)).
			Foreground(lipgloss.Color("#ffffff")).
			Bold(true)
	}

	yesButton := yesStyle.Render("Yes")
	noButton := noStyle.Render("No")
	buttons := lipgloss.JoinHorizontal(lipgloss.Center, yesButton, noButton)

	instructions := lipgloss.NewStyle().
		Foreground(lipgloss.Color(theme.DimText)).
		Align(lipgloss.Center).
		Width(dialogWidth - 4).
		Render("← → to toggle • Enter to confirm • ESC to cancel")

	dialogContent := lipgloss.JoinVertical(
		lipgloss.Center,
		title,
		"",
		buttons,
		"",
		instructions,
	)

	dialogStyle := lipgloss.NewStyle().
		Border(lipgloss.DoubleBorder()).
		BorderForeground(lipgloss.Color(theme.Error)).
		Background(lipgloss.Color(theme.Background)).
		Padding(1, 2).
		Width(dialogWidth)

	dialog := dialogStyle.Render(dialogContent)

	containerStyle := lipgloss.NewStyle().
		Width(containerWidth).
		Height(m.height-4).
		Align(lipgloss.Center, lipgloss.Center)

	return containerStyle.Render(dialog)
}

func (m *MainView) getAnimatedIcon() string {
	theme := themes.GetCurrentTheme()
	icons := []string{"❋", "✻", "+", ".", "-"}
	icon := icons[m.animatedIconFrame%len(icons)]

	iconStyle := lipgloss.NewStyle().
		Foreground(lipgloss.Color(theme.Primary)).
		Bold(true)

	return iconStyle.Render(icon)
}

func getCurrentProjectPath() string {
	cwd, err := os.Getwd()
	if err != nil {
		return "~/unknown"
	}
	projectName := filepath.Base(cwd)
	return "~/" + projectName
}

func getCurrentTime() string {
	now := time.Now()
	return now.Format("15:04")
}

func stripANSI(s string) string {
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