package commands

import (
	"Chat2/internal/themes"
	"Chat2/internal/types"
	"fmt"
	"os"
	"strings"

	tea "github.com/charmbracelet/bubbletea"
)

type Handler interface {
	Execute(args []string) (tea.Model, tea.Cmd)
}

type Command struct {
	Name        string
	Description string
	Handler     Handler
}

type Registry struct {
	commands map[string]*Command
	model    types.UIModel
}

func NewRegistry(model types.UIModel) *Registry {
	r := &Registry{
		commands: make(map[string]*Command),
		model:    model,
	}
	r.registerDefaultCommands()
	return r
}

func (r *Registry) registerDefaultCommands() {
	r.Register("help", "show help", &HelpCommand{model: r.model})
	r.Register("sessions", "list sessions", &SessionsCommand{model: r.model})
	r.Register("new", "start a new session", &NewSessionCommand{model: r.model})
	r.Register("model", "switch model", &SwitchModelCommand{model: r.model})
	r.Register("theme", "switch theme", &ThemeCommand{model: r.model})
	r.Register("share", "shares the current session", &ShareCommand{model: r.model})
	r.Register("p_drive", "open drive to see folders", &DriveCommand{model: r.model})
	r.Register("exit", "exit the app", &ExitCommand{})
}

func (r *Registry) Register(name, description string, handler Handler) {
	r.commands[name] = &Command{
		Name:        name,
		Description: description,
		Handler:     handler,
	}
}

func (r *Registry) Execute(input string) (tea.Model, tea.Cmd) {
	if !strings.HasPrefix(input, "/") {
		return r.model, nil
	}

	parts := strings.Fields(input[1:]) // Remove "/" and split
	if len(parts) == 0 {
		r.model.AddMessage("❌ Empty command")
		return r.model, nil
	}

	cmdName := parts[0]
	args := parts[1:]

	if cmd, exists := r.commands[cmdName]; exists {
		return cmd.Handler.Execute(args)
	}

	r.model.AddMessage("❌ Unknown command: /" + cmdName)
	return r.model, nil
}

func (r *Registry) GetCommands() []*Command {
	var cmds []*Command
	for _, cmd := range r.commands {
		cmds = append(cmds, cmd)
	}
	return cmds
}

// Command implementations

type HelpCommand struct{ model types.UIModel }

func (c *HelpCommand) Execute(args []string) (tea.Model, tea.Cmd) {
	helpText := "Available Commands:\n"
	// This would need access to registry, simplified for now
	helpText += "  /help - show help\n"
	helpText += "  /sessions - list sessions\n"
	helpText += "  /new - start a new session\n"
	helpText += "  /model - switch model\n"
	helpText += "  /theme - switch theme\n"
	helpText += "  /share - shares the current session\n"
	helpText += "  /p_drive - open drive to see folders\n"
	helpText += "  /exit - exit the app\n"
	c.model.AddMessage(helpText)
	return c.model, nil
}

type SessionsCommand struct{ model types.UIModel }

func (c *SessionsCommand) Execute(args []string) (tea.Model, tea.Cmd) {
	c.model.AddMessage("📋 No saved sessions found.")
	return c.model, nil
}

type NewSessionCommand struct{ model types.UIModel }

func (c *NewSessionCommand) Execute(args []string) (tea.Model, tea.Cmd) {
	c.model.ClearMessages()
	c.model.AddMessage("🎉 Started new session!")
	return c.model, nil
}

type SwitchModelCommand struct{ model types.UIModel }

func (c *SwitchModelCommand) Execute(args []string) (tea.Model, tea.Cmd) {
	providers := c.model.GetAvailableProviders()
	if len(providers) > 1 {
		return c.model, c.model.SwitchProvider()
	}
	currentProvider := c.model.GetCurrentProvider()
	c.model.AddMessage("Only one provider available: " + currentProvider)
	return c.model, nil
}

type ThemeCommand struct{ model types.UIModel }

func (c *ThemeCommand) Execute(args []string) (tea.Model, tea.Cmd) {
	availableThemes := themes.GetAvailableThemes()
	currentTheme := c.model.GetCurrentTheme()
	currentIndex := 0

	for i, theme := range availableThemes {
		if theme == currentTheme {
			currentIndex = i
			break
		}
	}

	nextIndex := (currentIndex + 1) % len(availableThemes)
	nextTheme := availableThemes[nextIndex]

	if themes.SetTheme(nextTheme) {
		c.model.SetCurrentTheme(nextTheme)
		themePreview := themes.GetThemePreview(nextTheme)
		c.model.AddMessage(fmt.Sprintf("🎨 Switched to %s", themePreview))
	}

	return c.model, nil
}

type ShareCommand struct{ model types.UIModel }

func (c *ShareCommand) Execute(args []string) (tea.Model, tea.Cmd) {
	c.model.AddMessage("🔗 Session sharing not implemented yet.")
	return c.model, nil
}

type DriveCommand struct{ model types.UIModel }

func (c *DriveCommand) Execute(args []string) (tea.Model, tea.Cmd) {
	c.model.SetPreviousState(c.model.GetState())
	c.model.SetState(types.StateFileBrowser)
	
	cwd, err := os.Getwd()
	if err != nil {
		c.model.AddMessage("❌ Error accessing current directory: " + err.Error())
		return c.model, nil
	}
	c.model.SetFileBrowserPath(cwd)
	return c.model, nil
}

type ExitCommand struct{}

func (c *ExitCommand) Execute(args []string) (tea.Model, tea.Cmd) {
	return nil, tea.Quit
}