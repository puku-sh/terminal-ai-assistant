package themes

import "github.com/charmbracelet/lipgloss"

type Theme struct {
	Name            string
	Background      string
	Primary         string
	Secondary       string
	Accent          string
	Text            string
	DimText         string
	Border          string
	InputBackground string
	Success         string
	Warning         string
	Error           string
	Highlight       string
}

var themes = map[string]Theme{
	"puku": {
		Name:            "Puku",
		Background:      "",
		Primary:         "#6a5acd",
		Secondary:       "#9370db",
		Accent:          "#4b0082",
		Text:            "#e6e6fa",
		DimText:         "#696969",
		Border:          "#483d8b",
		InputBackground: "",
		Success:         "#00ff7f",
		Warning:         "#ffa500",
		Error:           "#ff1493",
		Highlight:       "#da70d6",
	},
	"light": {
		Name:            "Light",
		Background:      "",
		Primary:         "#0969da",
		Secondary:       "#6f42c1",
		Accent:          "#1f883d",
		Text:            "#e0e0e0",
		DimText:         "#a0a0a0",
		Border:          "#565f89",
		InputBackground: "",
		Success:         "#1f883d",
		Warning:         "#bf8700",
		Error:           "#cf222e",
		Highlight:       "#2d3748",
	},
	"dark": {
		Name:            "Dark",
		Background:      "",
		Primary:         "#007acc",
		Secondary:       "#569cd6",
		Accent:          "#4ec9b0",
		Text:            "#d4d4d4",
		DimText:         "#808080",
		Border:          "#3c3c3c",
		InputBackground: "#2d2d30",
		Success:         "#4ec9b0",
		Warning:         "#ffcc02",
		Error:           "#f44747",
		Highlight:       "#264f78",
	},
	"ocean": {
		Name:            "Ocean",
		Background:      "",
		Primary:         "#39bae6",
		Secondary:       "#59c2ff",
		Accent:          "#ff8f40",
		Text:            "#b3b1ad",
		DimText:         "#5c6773",
		Border:          "#1f2430",
		InputBackground: "#1f2430",
		Success:         "#91b362",
		Warning:         "#ffb454",
		Error:           "#ff3333",
		Highlight:       "#253340",
	},
	"forest": {
		Name:            "Forest",
		Background:      "",
		Primary:         "#a7c080",
		Secondary:       "#83c092",
		Accent:          "#e69875",
		Text:            "#d3c6aa",
		DimText:         "#859289",
		Border:          "#3c4841",
		InputBackground: "#2d353b",
		Success:         "#a7c080",
		Warning:         "#dbbc7f",
		Error:           "#e67e80",
		Highlight:       "#425047",
	},
	"sunset": {
		Name:            "Sunset",
		Background:      "",
		Primary:         "#f92672",
		Secondary:       "#a6e22e",
		Accent:          "#fd971f",
		Text:            "#f8f8f2",
		DimText:         "#75715e",
		Border:          "#49483e",
		InputBackground: "#3e3d32",
		Success:         "#a6e22e",
		Warning:         "#e6db74",
		Error:           "#f92672",
		Highlight:       "#49483e",
	},
	"cyber": {
		Name:            "Cyber",
		Background:      "",
		Primary:         "#00ffff",
		Secondary:       "#ff00ff",
		Accent:          "#ffff00",
		Text:            "#00ff41",
		DimText:         "#4d4d4d",
		Border:          "#1a1a2e",
		InputBackground: "#ecedf2ff",
		Success:         "#00ff41",
		Warning:         "#ffff00",
		Error:           "#ff0040",
		Highlight:       "#0f3460",
	},
}

var currentTheme = "puku"

func GetCurrentTheme() Theme {
	return themes[currentTheme]
}

func SetTheme(name string) bool {
	if _, exists := themes[name]; exists {
		currentTheme = name
		return true
	}
	return false
}

func GetAvailableThemes() []string {
	var names []string
	for name := range themes {
		names = append(names, name)
	}
	return names
}

func GetThemeByName(name string) (Theme, bool) {
	theme, exists := themes[name]
	return theme, exists
}

func CreateThemedStyle(baseStyle lipgloss.Style, theme Theme) lipgloss.Style {
	return baseStyle
}

// Get theme preview text with colors
func GetThemePreview(themeName string) string {
	theme, exists := themes[themeName]
	if !exists {
		return "Theme not found"
	}

	preview := lipgloss.NewStyle().
		Foreground(lipgloss.Color(theme.Primary)).
		Bold(true).
		Render(theme.Name) + " theme • "

	preview += lipgloss.NewStyle().
		Foreground(lipgloss.Color(theme.Text)).
		Render("Sample text • ")

	preview += lipgloss.NewStyle().
		Background(lipgloss.Color(theme.Highlight)).
		Foreground(lipgloss.Color("#ffffff")).
		Render(" Highlight ")

	return preview
}

// Get all themes with previews for selection
func GetThemesList() []string {
	var themeList []string
	for name := range themes {
		preview := GetThemePreview(name)
		themeList = append(themeList, preview)
	}
	return themeList
}
