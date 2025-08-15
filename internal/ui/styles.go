package ui

import (
	"Chat2/internal/themes"
	"github.com/charmbracelet/lipgloss"
)

func GetStyles() Styles {
	theme := themes.GetCurrentTheme()
	
	return Styles{
		Container: lipgloss.NewStyle().
			Border(lipgloss.RoundedBorder()).
			BorderForeground(lipgloss.Color(theme.Border)).
			Padding(1, 2).
			Margin(1),

		Title: lipgloss.NewStyle().
			Bold(true).
			Foreground(lipgloss.Color(theme.Text)).
			Align(lipgloss.Center),

		WelcomeBox: lipgloss.NewStyle().
			Border(lipgloss.RoundedBorder()).
			BorderForeground(lipgloss.Color(theme.Primary)).
			Foreground(lipgloss.Color(theme.Text)).
			Padding(0, 1).
			Margin(0, 0, 1, 0),

		Version: lipgloss.NewStyle().
			Foreground(lipgloss.Color(theme.DimText)).
			Italic(true),

		CommandMenu: lipgloss.NewStyle().
			Foreground(lipgloss.Color(theme.Text)).
			Margin(1, 0),

		CommandItem: lipgloss.NewStyle().
			Foreground(lipgloss.Color(theme.Primary)).
			Bold(true),

		CommandDescription: lipgloss.NewStyle().
			Foreground(lipgloss.Color(theme.DimText)),

		InputContainer: lipgloss.NewStyle().
			Border(lipgloss.RoundedBorder()).
			BorderForeground(lipgloss.Color(theme.Border)).
			Background(lipgloss.Color(theme.InputBackground)).
			Padding(1, 2).
			Margin(1, 0, 0, 0),

		InputField: lipgloss.NewStyle().
			Foreground(lipgloss.Color(theme.Text)).
			Background(lipgloss.Color(theme.InputBackground)),

		InputPlaceholder: lipgloss.NewStyle().
			Foreground(lipgloss.Color(theme.DimText)).
			Italic(true),

		InputIcons: lipgloss.NewStyle().
			Foreground(lipgloss.Color(theme.DimText)),

		UserMessage: lipgloss.NewStyle().
			Border(lipgloss.RoundedBorder()).
			BorderForeground(lipgloss.Color(theme.Success)).
			Foreground(lipgloss.Color(theme.Text)).
			Padding(1).
			Margin(0, 0, 1, 0),

		AIMessage: lipgloss.NewStyle().
			Border(lipgloss.RoundedBorder()).
			BorderForeground(lipgloss.Color(theme.Primary)).
			Foreground(lipgloss.Color(theme.Text)).
			Padding(1).
			Margin(0, 0, 1, 0),

		StreamingMessage: lipgloss.NewStyle().
			Border(lipgloss.DoubleBorder()).
			BorderForeground(lipgloss.Color(theme.Warning)).
			Foreground(lipgloss.Color(theme.Text)).
			Padding(1).
			Margin(0, 0, 1, 0),

		Error: lipgloss.NewStyle().
			Foreground(lipgloss.Color(theme.Error)).
			Bold(true),

		Success: lipgloss.NewStyle().
			Foreground(lipgloss.Color(theme.Success)).
			Bold(true),

		Warning: lipgloss.NewStyle().
			Foreground(lipgloss.Color(theme.Warning)).
			Bold(true),

		Dim: lipgloss.NewStyle().
			Foreground(lipgloss.Color(theme.DimText)),
	}
}

type Styles struct {
	Container           lipgloss.Style
	Title               lipgloss.Style
	WelcomeBox          lipgloss.Style
	Version             lipgloss.Style
	CommandMenu         lipgloss.Style
	CommandItem         lipgloss.Style
	CommandDescription  lipgloss.Style
	InputContainer      lipgloss.Style
	InputField          lipgloss.Style
	InputPlaceholder    lipgloss.Style
	InputIcons          lipgloss.Style
	UserMessage         lipgloss.Style
	AIMessage           lipgloss.Style
	StreamingMessage    lipgloss.Style
	Error               lipgloss.Style
	Success             lipgloss.Style
	Warning             lipgloss.Style
	Dim                 lipgloss.Style
}