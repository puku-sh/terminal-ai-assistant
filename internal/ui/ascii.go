package ui

import (
	"strings"

	"Chat2/internal/themes"

	"github.com/charmbracelet/lipgloss"
)

func GeneratePUKUASCII() string {
	theme := themes.GetCurrentTheme()

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

	for i, line := range ascii {
		progress := float64(i) / float64(numLines-1)
		color := interpolateColor(theme.Secondary, theme.Accent, progress)

		style := lipgloss.NewStyle().Foreground(lipgloss.Color(color))
		styledLines = append(styledLines, style.Render(line))
	}

	return strings.Join(styledLines, "\n")
}

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
			return 0, nil
		}
	}
	return result, nil
}

func rgbToHex(r, g, b int) string {
	return "#" + intToHexString(r) + intToHexString(g) + intToHexString(b)
}

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
