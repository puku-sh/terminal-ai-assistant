package components

import (
	"github.com/charmbracelet/bubbles/textinput"
	tea "github.com/charmbracelet/bubbletea"
)

type InputComponent struct {
	textInput textinput.Model
}

func NewInputComponent(placeholder string) *InputComponent {
	ti := textinput.New()
	ti.Placeholder = placeholder
	ti.Focus()
	ti.CharLimit = 0
	ti.Width = 0

	return &InputComponent{
		textInput: ti,
	}
}

func (c *InputComponent) Update(msg tea.Msg) (*InputComponent, tea.Cmd) {
	var cmd tea.Cmd
	c.textInput, cmd = c.textInput.Update(msg)
	return c, cmd
}

func (c *InputComponent) View() string {
	return c.textInput.View()
}

func (c *InputComponent) Value() string {
	return c.textInput.Value()
}

func (c *InputComponent) SetValue(value string) {
	c.textInput.SetValue(value)
}

func (c *InputComponent) Focus() tea.Cmd {
	return c.textInput.Focus()
}

func (c *InputComponent) Blur() {
	c.textInput.Blur()
}