# Design Migration Plan: OpenCode → PUKU TUI

## Executive Summary
This document outlines the plan to migrate the current OpenCode-themed TUI to use the PUKU brand identity, including logo, colors, and design language from the original dummy TUI.

---

## Current State Analysis

### OpenCode TUI (packages/tui/)

**Color Palette:**
- **Primary (Dark):** `#fab283` (Peach/Salmon)
- **Primary (Light):** `#3b7dd8` (Blue)
- **Secondary (Dark):** `#5c9cf5` (Light Blue)
- **Secondary (Light):** `#7b5bb6` (Purple)
- **Accent (Dark):** `#9d7cd8` (Lavender)
- **Accent (Light):** `#d68c27` (Orange)
- **Success:** `#7fd88f` (Green)
- **Error:** `#e06c75` (Red)
- **Warning:** `#f5a742` (Orange)
- **Info:** `#56b6c2` (Cyan)

**Theme System:**
- JSON-based theme system (`internal/theme/themes/opencode.json`)
- Adaptive colors supporting both light and dark terminals
- Comprehensive theme interface with 50+ color definitions
- System theme that adapts to terminal background
- Support for custom user themes

**Architecture:**
- Complex theme interface with BaseTheme struct
- Theme manager with registration system
- Adaptive colors using `compat.AdaptiveColor`
- Markdown and syntax highlighting color schemes
- Diff view colors for code changes

**Current Branding:**
- No visible ASCII logo in the TUI
- "OpenCode" references in theme names and manager
- Professional, code-focused design language

---

## Target State: PUKU Design

### PUKU TUI (internal/)

**Brand Identity:**
```
██████╗ ██╗   ██╗██╗  ██╗██╗   ██╗     ██████╗██╗     ██╗
██╔══██╗██║   ██║██║ ██╔╝██║   ██║    ██╔════╝██║     ██║
██████╔╝██║   ██║█████╔╝ ██║   ██║    ██║     ██║     ██║
██╔═══╝ ██║   ██║██╔═██╗ ██║   ██║    ██║     ██║     ██║
██║     ╚██████╔╝██║  ██╗╚██████╔╝    ╚██████╗███████╗██║
╚═╝      ╚═════╝ ╚═╝  ╚═╝ ╚═════╝      ╚═════╝╚══════╝╚═╝
```

**Color Palette - PUKU Theme (Default):**
- **Primary:** `#6a5acd` (Slate Blue / Purple)
- **Secondary:** `#9370db` (Medium Purple)
- **Accent:** `#4b0082` (Indigo)
- **Text:** `#e6e6fa` (Lavender)
- **Dim Text:** `#696969` (Dim Gray)
- **Border:** `#483d8b` (Dark Slate Blue)
- **Success:** `#00ff7f` (Spring Green)
- **Warning:** `#ffa500` (Orange)
- **Error:** `#ff1493` (Deep Pink)
- **Highlight:** `#da70d6` (Orchid)

**Logo Animation:**
- Purple gradient from `#f4d4ff` (light purple) to `#8e3fd9` (darker purple)
- Smooth color interpolation across ASCII art lines
- Creates a cohesive brand presence

**Additional Themes Available:**
1. **Puku** (default) - Purple/indigo theme
2. **Light** - GitHub-inspired light theme
3. **Dark** - VS Code dark theme
4. **Ocean** - Cyan/blue ocean theme
5. **Forest** - Green nature theme
6. **Sunset** - Monokai-inspired vibrant theme
7. **Cyber** - Neon cyberpunk theme

**Design Philosophy:**
- Playful, friendly brand personality
- Purple as signature color (PUKU branding)
- Rounded borders and welcoming UI
- Animated icons and visual feedback
- Clear visual hierarchy with color contrast

---

## Migration Strategy

### Phase 1: Theme System Integration ✅ (Already Compatible)

**Status:** The OpenCode TUI theme system is actually MORE advanced than the dummy TUI's simple theme system. We can leverage this.

**Approach:**
1. Keep the existing sophisticated theme architecture
2. Add PUKU-themed JSON files to match the 7 original themes
3. Set PUKU as the default theme instead of OpenCode

**Benefits:**
- Backward compatible with OpenCode's theme system
- Users can still load custom themes
- Maintains adaptive color support for different terminals
- Preserves markdown/syntax highlighting features

### Phase 2: Logo Integration

**Implementation Locations:**

1. **Create Logo Module** (`internal/util/logo.go`)
   ```go
   package util

   import (
       "strings"
       "github.com/charmbracelet/lipgloss/v2"
       "github.com/charmbracelet/lipgloss/v2/compat"
       "github.com/pukucode/pukucode-tui/internal/theme"
   )

   // GetPUKULogo returns the PUKU ASCII art with animated gradient
   func GetPUKULogo() string

   // GetPUKULogoAnimated returns logo with animation frame support
   func GetPUKULogoAnimated(maxLines int) string

   // interpolateColor creates smooth color transitions
   func interpolateColor(color1, color2 string, t float64) lipgloss.Color
   ```

2. **Landing View** (`internal/components/chat/landing.go` or create new)
   - Display PUKU logo prominently on startup
   - Show version information
   - Welcome message with brand identity

3. **Status Bar** (existing `internal/tui/tui.go`)
   - Replace any OpenCode branding references
   - Use PUKU color scheme for status indicators

**Logo Placement:**
- **Landing Screen:** Full logo with gradient (6 lines)
- **Help Screen:** Compact version (3 lines)
- **Minimized Mode:** Single-line "PUKU CLI" with icon

### Phase 3: Color Theme Files

**Create New Theme JSONs:**

1. **`internal/theme/themes/puku.json`** (Primary Brand Theme)
   ```json
   {
     "$schema": "https://pukucode.com/theme.json",
     "defs": {
       "darkPrimary": "#6a5acd",
       "darkSecondary": "#9370db",
       "darkAccent": "#4b0082",
       "darkText": "#e6e6fa",
       "darkDim": "#696969",
       "darkBorder": "#483d8b",
       "darkSuccess": "#00ff7f",
       "darkWarning": "#ffa500",
       "darkError": "#ff1493",
       "darkHighlight": "#da70d6",
       ...
     },
     "theme": {
       "primary": { "dark": "darkPrimary", "light": "lightPrimary" },
       ...
     }
   }
   ```

2. **Port Other Themes:**
   - `ocean.json` - Cyan/blue theme
   - `forest.json` - Green theme
   - `sunset.json` - Monokai-inspired
   - `cyber.json` - Neon cyberpunk
   - Keep `light.json` and `dark.json` as generic options

3. **Update Theme Loader** (`internal/theme/loader.go`)
   - Change embedded themes directory reference
   - Update default theme to "puku"
   - Change theme directory paths from `.opencode/themes/` to `.pukucode/themes/`

### Phase 4: Branding Consistency

**File-Level Changes:**

1. **Theme Manager** (`internal/theme/manager.go:96-98`)
   ```go
   // BEFORE:
   if a == "opencode" {
       return -1
   }

   // AFTER:
   if a == "puku" {
       return -1
   }
   ```

2. **App Initialization** (`internal/app/app.go:141`)
   ```go
   // BEFORE:
   themeEnv := os.Getenv("OPENCODE_THEME")

   // AFTER:
   themeEnv := os.Getenv("PUKUCODE_THEME")
   ```

3. **Environment Variables:**
   - `OPENCODE_THEME` → `PUKUCODE_THEME`
   - `OPENCODE_CALLER` → `PUKUCODE_CALLER`
   - `OPENCODE_AGENTS_SWITCH_SINGLE_MODEL` → `PUKUCODE_AGENTS_SWITCH_SINGLE_MODEL`

4. **Update Messages** (`internal/tui/tui.go`)
   ```go
   // Line 466:
   "pukucode updated to "+msg.Properties.Version+", restart to apply."

   // Line 472:
   "Installed the pukucode extension in "+msg.Properties.Ide
   ```

5. **Theme Directory Paths** (`internal/theme/loader.go:67-80`)
   ```go
   // USER_CONFIG/pukucode/themes/*.json
   // PROJECT_ROOT/.pukucode/themes/*.json
   // CWD/.pukucode/themes/*.json
   ```

### Phase 5: UI Components Styling

**Consistent Visual Language:**

1. **Welcome Screen:**
   - PUKU logo with gradient
   - Purple-themed welcome box
   - Animated loading indicators in purple palette

2. **Input Components:**
   - Border colors using PUKU theme
   - Focus states with accent color
   - Placeholder text in dim color

3. **Chat Messages:**
   - User messages: Success color border (green)
   - AI responses: Primary color border (purple)
   - System messages: Dim text
   - Errors: Error color (deep pink)

4. **Status Bar:**
   - Provider indicator: Secondary color
   - Model indicator: Accent color
   - Theme name: Dim text
   - Animated elements: Highlight color

5. **Sidebar (if present):**
   - Background: Background panel color
   - Headers: Primary color
   - Active item: Highlight color
   - Inactive items: Dim text

---

## Implementation Checklist

### High Priority (Breaking Changes)
- [ ] Create `internal/theme/themes/puku.json` with PUKU color scheme
- [ ] Port ocean, forest, sunset, cyber themes to JSON format
- [ ] Create `internal/util/logo.go` with PUKU ASCII art generator
- [ ] Update default theme from "opencode" to "puku" in theme manager
- [ ] Change `.opencode/` paths to `.pukucode/` throughout codebase
- [ ] Update environment variable names (OPENCODE_* → PUKUCODE_*)

### Medium Priority (Visual Enhancements)
- [ ] Add PUKU logo to landing screen
- [ ] Update status bar branding
- [ ] Implement animated logo with gradient
- [ ] Update help screen with PUKU branding
- [ ] Add version display with PUKU colors

### Low Priority (Polish)
- [ ] Add animated welcome icon (similar to dummy TUI)
- [ ] Implement theme preview with PUKU colors
- [ ] Create PUKU-themed error messages
- [ ] Add loading animations with purple palette
- [ ] Document theme customization for users

### Documentation
- [ ] Update README with PUKU branding
- [ ] Document theme system and customization
- [ ] Add screenshots of PUKU-themed TUI
- [ ] Create theme development guide
- [ ] Update configuration examples

---

## Design Principles to Follow

### 1. **Purple is King**
   - Primary brand color should dominate the UI
   - Use purple for key interactive elements
   - Gradient effects for visual interest

### 2. **Friendliness Over Formality**
   - Rounded borders (already using `lipgloss.RoundedBorder()`)
   - Welcoming messages and tone
   - Playful animations and icons

### 3. **Clear Visual Hierarchy**
   - High contrast for readability
   - Consistent color meanings (error = pink, success = green)
   - Dimmed secondary information

### 4. **Respect Terminal Limitations**
   - Maintain adaptive color system
   - Test with various terminal backgrounds
   - Provide fallbacks for limited color support

### 5. **Preserve Functionality**
   - Don't remove features for aesthetics
   - Keep advanced theme system intact
   - Maintain compatibility with OpenCode configs (with warnings)

---

## Testing Strategy

### Visual Testing:
1. **Terminal Compatibility:**
   - Test on Windows Terminal, iTerm2, Alacritty, Kitty
   - Verify on dark and light backgrounds
   - Check ANSI-only mode (16 colors)

2. **Theme Switching:**
   - Verify all 7 PUKU themes load correctly
   - Test custom user themes still work
   - Validate theme preview function

3. **Logo Rendering:**
   - Check ASCII art alignment
   - Verify gradient colors render correctly
   - Test animated version frame rate

### Functional Testing:
1. **Environment Variables:**
   - Verify PUKUCODE_THEME works
   - Test fallback to default
   - Ensure backward compatibility warnings

2. **Theme Directories:**
   - Test `.pukucode/themes/` loading
   - Verify override hierarchy works
   - Check error messages for missing themes

3. **Branding Consistency:**
   - Audit all user-facing messages
   - Check status bar displays
   - Verify help text references PUKU

---

## Risk Mitigation

### Potential Issues:

1. **Breaking Changes for OpenCode Users:**
   - **Risk:** Users with `.opencode/` configs lose their settings
   - **Mitigation:** Add migration helper that copies `.opencode/` to `.pukucode/`
   - **Mitigation:** Display warning if `.opencode/` detected

2. **Theme Compatibility:**
   - **Risk:** User custom themes reference "opencode" theme
   - **Mitigation:** Alias "opencode" theme to "puku" with deprecation notice

3. **ASCII Logo Display Issues:**
   - **Risk:** Logo doesn't render on some terminals
   - **Mitigation:** Detect terminal capabilities, fallback to text logo

4. **Color Contrast Problems:**
   - **Risk:** Purple on dark backgrounds may be hard to read
   - **Mitigation:** Use adaptive colors, provide light theme

5. **Performance:**
   - **Risk:** Animated gradients cause terminal lag
   - **Mitigation:** Make animations optional via config

---

## Timeline Estimate

**Total Estimated Time:** 6-8 hours

- **Phase 1:** Theme system (30 minutes) - JSON file creation
- **Phase 2:** Logo integration (1.5 hours) - ASCII art + gradient logic
- **Phase 3:** Color themes (2 hours) - Port 7 themes to JSON
- **Phase 4:** Branding updates (1 hour) - Find/replace, env vars
- **Phase 5:** UI components (2 hours) - Landing, status, messages
- **Testing:** (1-2 hours) - Visual + functional verification
- **Documentation:** (30 minutes) - Update README, add guides

---

## Success Criteria

### Must Have:
✅ PUKU logo displays on landing screen
✅ Purple color scheme is default
✅ All 7 themes functional
✅ No "opencode" references in UI
✅ Environment variables use PUKUCODE prefix

### Should Have:
✅ Animated logo gradient
✅ Theme switching works seamlessly
✅ Custom user themes still supported
✅ Status bar uses PUKU colors
✅ Help screen branded correctly

### Nice to Have:
✅ Migration tool for OpenCode configs
✅ Theme preview function
✅ Loading animations
✅ Comprehensive documentation
✅ Screenshots and examples

---

## Long-term Maintenance

### Keep in Sync:
- Monitor OpenCode TUI updates for new features
- Maintain theme compatibility
- Update logo if brand evolves

### Community Themes:
- Create theme submission process
- Curate community theme gallery
- Maintain theme validation tools

### Documentation:
- Keep theme schema updated
- Document color meanings
- Provide theme creation tutorial

---

## Appendix: Color Comparison Table

| Element | OpenCode (Dark) | PUKU Theme |
|---------|----------------|------------|
| Primary | `#fab283` (Peach) | `#6a5acd` (Purple) |
| Secondary | `#5c9cf5` (Blue) | `#9370db` (Purple) |
| Accent | `#9d7cd8` (Lavender) | `#4b0082` (Indigo) |
| Success | `#7fd88f` (Green) | `#00ff7f` (Spring Green) |
| Error | `#e06c75` (Red) | `#ff1493` (Deep Pink) |
| Warning | `#f5a742` (Orange) | `#ffa500` (Orange) |
| Text | `#eeeeee` (White) | `#e6e6fa` (Lavender) |
| Text Muted | `#808080` (Gray) | `#696969` (Dim Gray) |
| Border | `#484848` (Dark Gray) | `#483d8b` (Dark Purple) |

---

## Next Steps

1. **Review this plan** with the team
2. **Get approval** for breaking changes
3. **Create feature branch** `feature/puku-branding`
4. **Implement Phase 1-2** (themes + logo)
5. **Internal testing** with team
6. **Implement Phase 3-5** (remaining UI updates)
7. **User testing** with beta group
8. **Documentation** and examples
9. **Release** with migration guide

---

**Document Version:** 1.0
**Last Updated:** 2025-12-02
**Author:** Claude Code
**Status:** Ready for Implementation
