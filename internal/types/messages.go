package types

import (
	"strings"

	"github.com/charmbracelet/bubbles/textinput"
	tea "github.com/charmbracelet/bubbletea"
)

type (
	ResponseMsg     string
	StreamCharMsg   string
	StreamEndMsg    struct{}
	ErrorMsg        string
	ProviderSetMsg  string
	ConfigLoadedMsg struct{}
)

type AIProvider struct {
	Name    string
	APIKey  string
	BaseURL string
	Model   string
}

type Model struct {
	TextInput          textinput.Model
	Messages           []string
	Loading            bool
	Streaming          bool
	CurrentResponse    strings.Builder
	CurrentProvider    string
	AvailableProviders []string
	Err                error
	Width              int
	Height             int
	APIKeys            map[string]string
	ShowProviders      bool
}

type TeaMsg = tea.Msg
type TeaModel = tea.Model
type TeaCmd = tea.Cmd