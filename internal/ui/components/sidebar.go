package components

import (
	"Chat2/internal/ui"
	"strings"
)

type SidebarComponent struct {
	visible         bool
	currentProvider string
	currentTheme    string
	availableProviders []string
	showProviders   bool
}

func NewSidebarComponent() *SidebarComponent {
	return &SidebarComponent{
		visible: false,
		showProviders: false,
	}
}

func (s *SidebarComponent) SetVisible(visible bool) {
	s.visible = visible
}

func (s *SidebarComponent) SetCurrentProvider(provider string) {
	s.currentProvider = provider
}

func (s *SidebarComponent) SetCurrentTheme(theme string) {
	s.currentTheme = theme
}

func (s *SidebarComponent) SetAvailableProviders(providers []string) {
	s.availableProviders = providers
}

func (s *SidebarComponent) SetShowProviders(show bool) {
	s.showProviders = show
}

func (s *SidebarComponent) View(width, height int) string {
	if !s.visible {
		return ""
	}

	styles := ui.GetStyles()
	sidebarWidth := 25
	
	var content []string
	content = append(content, styles.SidebarHeader.Render("PUKU CHAT"))
	content = append(content, "")
	
	// Provider section
	content = append(content, styles.SidebarSection.Render("PROVIDER"))
	if s.showProviders && len(s.availableProviders) > 1 {
		for _, provider := range s.availableProviders {
			if provider == s.currentProvider {
				content = append(content, styles.SidebarItemActive.Render("→ "+strings.ToUpper(provider)))
			} else {
				content = append(content, styles.SidebarItem.Render("  "+strings.ToUpper(provider)))
			}
		}
	} else {
		content = append(content, styles.SidebarItemActive.Render("→ "+strings.ToUpper(s.currentProvider)))
	}
	
	content = append(content, "")
	
	// Theme section
	content = append(content, styles.SidebarSection.Render("THEME"))
	content = append(content, styles.SidebarItemActive.Render("→ "+strings.ToUpper(s.currentTheme)))
	
	// Controls section
	content = append(content, "")
	content = append(content, styles.SidebarSection.Render("CONTROLS"))
	content = append(content, styles.SidebarItem.Render("Tab - Switch Provider"))
	content = append(content, styles.SidebarItem.Render("Ctrl+P - Toggle Providers"))
	content = append(content, styles.SidebarItem.Render("? - Help"))
	content = append(content, styles.SidebarItem.Render("Esc - Exit"))
	
	// Pad content to fill height
	for len(content) < height-2 {
		content = append(content, "")
	}
	
	sidebar := strings.Join(content, "\n")
	
	return styles.Sidebar.
		Width(sidebarWidth).
		Height(height).
		Render(sidebar)
}