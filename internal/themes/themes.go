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
		Name:            "PUKU",
		Background:      "#1a1b26",
		Primary:         "#b794f6",
		Secondary:       "#e9d8fd",
		Accent:          "#805ad5",
		Text:            "#ffffff",
		DimText:         "#a0a0a0",
		Border:          "#b794f6",
		InputBackground: "#2a2b36",
		Success:         "#04B575",
		Warning:         "#FFD23F",
		Error:           "#FF6B6B",
		Highlight:       "#e9d8fd",
	},
	"ocean": {
		Name:            "Ocean",
		Background:      "#0d1117",
		Primary:         "#58a6ff",
		Secondary:       "#79c0ff",
		Accent:          "#1f6feb",
		Text:            "#f0f6fc",
		DimText:         "#8b949e",
		Border:          "#30363d",
		InputBackground: "#21262d",
		Success:         "#238636",
		Warning:         "#f85149",
		Error:           "#da3633",
		Highlight:       "#388bfd",
	},
	"forest": {
		Name:            "Forest",
		Background:      "#1a2332",
		Primary:         "#5fb3a3",
		Secondary:       "#7fc8b8",
		Accent:          "#42a085",
		Text:            "#f4f4f4",
		DimText:         "#a8b2b8",
		Border:          "#5fb3a3",
		InputBackground: "#243447",
		Success:         "#6ab04c",
		Warning:         "#f39801",
		Error:           "#eb4d4b",
		Highlight:       "#7fc8b8",
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