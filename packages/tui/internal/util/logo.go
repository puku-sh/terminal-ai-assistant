package util

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/lipgloss/v2"
	"github.com/pukucode/pukucode-tui/internal/theme"
)

// GetPUKULogo returns the full PUKU ASCII art with purple gradient
func GetPUKULogo() string {
	return GetPUKULogoAnimated(6) // Show all 6 lines
}

// GetPUKULogoAnimated returns the PUKU logo with optional line animation
// maxLines controls how many lines to show (useful for animation effects)
func GetPUKULogoAnimated(maxLines int) string {
	ascii := []string{
		"██████╗ ██╗   ██╗██╗  ██╗██╗   ██╗     ██████╗██╗     ██╗",
		"██╔══██╗██║   ██║██║ ██╔╝██║   ██║    ██╔════╝██║     ██║",
		"██████╔╝██║   ██║█████╔╝ ██║   ██║    ██║     ██║     ██║",
		"██╔═══╝ ██║   ██║██╔═██╗ ██║   ██║    ██║     ██║     ██║",
		"██║     ╚██████╔╝██║  ██╗╚██████╔╝    ╚██████╗███████╗██║",
		"╚═╝      ╚═════╝ ╚═╝  ╚═╝ ╚═════╝      ╚═════╝╚══════╝╚═╝",
	}

	var styledLines []string
	numLines := len(ascii)

	// Limit the number of lines shown for animation effect
	linesToShow := maxLines
	if linesToShow > numLines {
		linesToShow = numLines
	}

	// Purple gradient colors (light to dark purple)
	color1 := "#f4d4ff" // Light purple
	color2 := "#8e3fd9" // Darker purple

	for i := 0; i < linesToShow; i++ {
		line := ascii[i]
		progress := float64(i) / float64(numLines-1)
		color := interpolateColor(color1, color2, progress)

		style := lipgloss.NewStyle().Foreground(lipgloss.Color(color))
		styledLines = append(styledLines, style.Render(line))
	}

	return strings.Join(styledLines, "\n")
}

// GetPUKULogoWithTheme returns the PUKU logo using the current theme's primary color
func GetPUKULogoWithTheme() string {
	t := theme.CurrentTheme()
	if t == nil {
		return GetPUKULogo() // Fallback to default gradient
	}

	ascii := []string{
		"██████╗ ██╗   ██╗██╗  ██╗██╗   ██╗     ██████╗██╗     ██╗",
		"██╔══██╗██║   ██║██║ ██╔╝██║   ██║    ██╔════╝██║     ██║",
		"██████╔╝██║   ██║█████╔╝ ██║   ██║    ██║     ██║     ██║",
		"██╔═══╝ ██║   ██║██╔═██╗ ██║   ██║    ██║     ██║     ██║",
		"██║     ╚██████╔╝██║  ██╗╚██████╔╝    ╚██████╗███████╗██║",
		"╚═╝      ╚═════╝ ╚═╝  ╚═╝ ╚═════╝      ╚═════╝╚══════╝╚═╝",
	}

	var styledLines []string
	for i, line := range ascii {
		var style lipgloss.Style
		// Alternate between primary and secondary colors for visual interest
		if i%2 == 0 {
			style = lipgloss.NewStyle().Foreground(t.Primary())
		} else {
			style = lipgloss.NewStyle().Foreground(t.Secondary())
		}
		styledLines = append(styledLines, style.Render(line))
	}

	return strings.Join(styledLines, "\n")
}

// GetPUKULogoCompact returns a compact version of the logo (3 lines)
func GetPUKULogoCompact() string {
	return GetPUKULogoAnimated(3)
}

// GetPUKULogoSingleLine returns a single-line PUKU branding
func GetPUKULogoSingleLine() string {
	t := theme.CurrentTheme()
	if t == nil {
		return lipgloss.NewStyle().
			Foreground(lipgloss.Color("#6a5acd")).
			Bold(true).
			Render("PUKU CLI")
	}

	return lipgloss.NewStyle().
		Foreground(t.Primary()).
		Bold(true).
		Render("PUKU CLI")
}

// interpolateColor creates a smooth color transition between two hex colors
// t should be between 0.0 and 1.0
func interpolateColor(color1, color2 string, t float64) string {
	if t <= 0 {
		return color1
	}
	if t >= 1 {
		return color2
	}

	r1, g1, b1 := hexToRGB(color1)
	r2, g2, b2 := hexToRGB(color2)

	r := int(float64(r1) + t*float64(r2-r1))
	g := int(float64(g1) + t*float64(g2-g1))
	b := int(float64(b1) + t*float64(b2-b1))

	return rgbToHex(r, g, b)
}

// hexToRGB converts a hex color string to RGB values
func hexToRGB(hex string) (int, int, int) {
	if len(hex) != 7 || hex[0] != '#' {
		return 0, 0, 0
	}

	var r, g, b int
	n, err := hexStringToInt(hex[1:3])
	if err == nil {
		r = n
	}
	n, err = hexStringToInt(hex[3:5])
	if err == nil {
		g = n
	}
	n, err = hexStringToInt(hex[5:7])
	if err == nil {
		b = n
	}

	return r, g, b
}

// hexStringToInt converts a hex string to an integer
func hexStringToInt(hex string) (int, error) {
	result := 0
	for _, char := range hex {
		result *= 16
		switch {
		case char >= '0' && char <= '9':
			result += int(char - '0')
		case char >= 'a' && char <= 'f':
			result += int(char - 'a' + 10)
		case char >= 'A' && char <= 'F':
			result += int(char - 'A' + 10)
		default:
			return 0, fmt.Errorf("invalid hex character: %c", char)
		}
	}
	return result, nil
}

// rgbToHex converts RGB values to a hex color string
func rgbToHex(r, g, b int) string {
	return "#" + intToHexString(r) + intToHexString(g) + intToHexString(b)
}

// intToHexString converts an integer (0-255) to a two-character hex string
func intToHexString(n int) string {
	if n < 0 {
		n = 0
	}
	if n > 255 {
		n = 255
	}

	hex := "0123456789abcdef"
	return string(hex[n/16]) + string(hex[n%16])
}
