package chat

import (
	"regexp"
	"strings"
)

type Session struct {
	Messages        []string
	CurrentProvider string
	IsActive        bool
}

func NewSession(provider string) *Session {
	return &Session{
		Messages:        []string{},
		CurrentProvider: provider,
		IsActive:        false,
	}
}

func (s *Session) AddMessage(message string) {
	s.Messages = append(s.Messages, message)
}

func (s *Session) AddUserMessage(message string) {
	s.Messages = append(s.Messages, "You: "+message)
}

func (s *Session) AddAIResponse(response string) {
	filteredResponse := s.filterSystemReminders(response)
	s.Messages = append(s.Messages, "AI: "+filteredResponse)
}

func (s *Session) AddErrorMessage(err string) {
	s.Messages = append(s.Messages, "❌ Error: "+err)
}

func (s *Session) Clear() {
	s.Messages = []string{}
}

func (s *Session) GetMessages() []string {
	return s.Messages
}

func (s *Session) SetProvider(provider string) {
	s.CurrentProvider = provider
	s.Messages = append(s.Messages, "🔄 Switched to "+strings.ToUpper(provider))
}

func (s *Session) filterSystemReminders(text string) string {
	re := regexp.MustCompile(`<system-reminder>[\s\S]*?</system-reminder>`)
	filtered := re.ReplaceAllString(text, "")
	return strings.TrimSpace(filtered)
}