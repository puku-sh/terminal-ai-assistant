package app

import (
	"errors"
	"time"

	"github.com/pukucode/pukucode-sdk-go"
	"github.com/pukucode/pukucode-tui/internal/attachment"
	"github.com/pukucode/pukucode-tui/internal/id"
)

type Prompt struct {
	Text        string                   `toml:"text"`
	Attachments []*attachment.Attachment `toml:"attachments"`
}

func (p Prompt) ToMessage(
	messageID string,
	sessionID string,
) Message {
	message := pukucode.UserMessage{
		ID:        messageID,
		SessionID: sessionID,
		Role:      pukucode.UserMessageRoleUser,
		Time: pukucode.UserMessageTime{
			Created: time.Now().UnixMilli(),
		},
	}

	text := p.Text
	textAttachments := []*attachment.Attachment{}
	for _, attachment := range p.Attachments {
		if attachment.Type == "text" {
			textAttachments = append(textAttachments, attachment)
		}
	}
	for i := 0; i < len(textAttachments)-1; i++ {
		for j := i + 1; j < len(textAttachments); j++ {
			if textAttachments[i].StartIndex < textAttachments[j].StartIndex {
				textAttachments[i], textAttachments[j] = textAttachments[j], textAttachments[i]
			}
		}
	}
	for _, att := range textAttachments {
		if source, ok := att.GetTextSource(); ok {
			if att.StartIndex > att.EndIndex || att.EndIndex > len(text) {
				continue
			}
			text = text[:att.StartIndex] + source.Value + text[att.EndIndex:]
		}
	}

	parts := []pukucode.PartUnion{pukucode.TextPart{
		ID:        id.Ascending(id.Part),
		MessageID: messageID,
		SessionID: sessionID,
		Type:      pukucode.TextPartTypeText,
		Text:      text,
	}}
	for _, attachment := range p.Attachments {
		if attachment.Type == "agent" {
			source, _ := attachment.GetAgentSource()
			parts = append(parts, pukucode.AgentPart{
				ID:        id.Ascending(id.Part),
				MessageID: messageID,
				SessionID: sessionID,
				Name:      source.Name,
				Source: pukucode.AgentPartSource{
					Value: attachment.Display,
					Start: int64(attachment.StartIndex),
					End:   int64(attachment.EndIndex),
				},
			})
			continue
		}

		text := pukucode.FilePartSourceText{
			Start: int64(attachment.StartIndex),
			End:   int64(attachment.EndIndex),
			Value: attachment.Display,
		}
		source := &pukucode.FilePartSource{}
		switch attachment.Type {
		case "text":
			continue
		case "file":
			if fileSource, ok := attachment.GetFileSource(); ok {
				source = &pukucode.FilePartSource{
					Text: text,
					Path: fileSource.Path,
					Type: pukucode.FilePartSourceTypeFile,
				}
			}
		case "symbol":
			if symbolSource, ok := attachment.GetSymbolSource(); ok {
				source = &pukucode.FilePartSource{
					Text: text,
					Path: symbolSource.Path,
					Type: pukucode.FilePartSourceTypeSymbol,
					Kind: int64(symbolSource.Kind),
					Name: symbolSource.Name,
					Range: pukucode.SymbolSourceRange{
						Start: pukucode.SymbolSourceRangeStart{
							Line:      float64(symbolSource.Range.Start.Line),
							Character: float64(symbolSource.Range.Start.Char),
						},
						End: pukucode.SymbolSourceRangeEnd{
							Line:      float64(symbolSource.Range.End.Line),
							Character: float64(symbolSource.Range.End.Char),
						},
					},
				}
			}
		}
		parts = append(parts, pukucode.FilePart{
			ID:        id.Ascending(id.Part),
			MessageID: messageID,
			SessionID: sessionID,
			Type:      pukucode.FilePartTypeFile,
			Filename:  attachment.Filename,
			Mime:      attachment.MediaType,
			URL:       attachment.URL,
			Source:    *source,
		})
	}
	return Message{
		Info:  message,
		Parts: parts,
	}
}

func (m Message) ToPrompt() (*Prompt, error) {
	switch m.Info.(type) {
	case pukucode.UserMessage:
		text := ""
		attachments := []*attachment.Attachment{}
		for _, part := range m.Parts {
			switch p := part.(type) {
			case pukucode.TextPart:
				if p.Synthetic {
					continue
				}
				text += p.Text + " "
			case pukucode.AgentPart:
				attachments = append(attachments, &attachment.Attachment{
					ID:         p.ID,
					Type:       "agent",
					Display:    p.Source.Value,
					StartIndex: int(p.Source.Start),
					EndIndex:   int(p.Source.End),
					Source: &attachment.AgentSource{
						Name: p.Name,
					},
				})
			case pukucode.FilePart:
				switch p.Source.Type {
				case "file":
					attachments = append(attachments, &attachment.Attachment{
						ID:         p.ID,
						Type:       "file",
						Display:    p.Source.Text.Value,
						URL:        p.URL,
						Filename:   p.Filename,
						MediaType:  p.Mime,
						StartIndex: int(p.Source.Text.Start),
						EndIndex:   int(p.Source.Text.End),
						Source: &attachment.FileSource{
							Path: p.Source.Path,
							Mime: p.Mime,
						},
					})
				case "symbol":
					r := p.Source.Range.(pukucode.SymbolSourceRange)
					attachments = append(attachments, &attachment.Attachment{
						ID:         p.ID,
						Type:       "symbol",
						Display:    p.Source.Text.Value,
						URL:        p.URL,
						Filename:   p.Filename,
						MediaType:  p.Mime,
						StartIndex: int(p.Source.Text.Start),
						EndIndex:   int(p.Source.Text.End),
						Source: &attachment.SymbolSource{
							Path: p.Source.Path,
							Name: p.Source.Name,
							Kind: int(p.Source.Kind),
							Range: attachment.SymbolRange{
								Start: attachment.Position{
									Line: int(r.Start.Line),
									Char: int(r.Start.Character),
								},
								End: attachment.Position{
									Line: int(r.End.Line),
									Char: int(r.End.Character),
								},
							},
						},
					})
				}
			}
		}
		return &Prompt{
			Text:        text,
			Attachments: attachments,
		}, nil
	}
	return nil, errors.New("unknown message type")
}

func (m Message) ToSessionChatParams() []pukucode.SessionPromptParamsPartUnion {
	parts := []pukucode.SessionPromptParamsPartUnion{}
	for _, part := range m.Parts {
		switch p := part.(type) {
		case pukucode.TextPart:
			parts = append(parts, pukucode.SessionPromptParamsPartUnion{
				Type: "text",
				Text: p.Text,
			})
		case pukucode.FilePart:
			parts = append(parts, pukucode.SessionPromptParamsPartUnion{
				Type:     "file",
				Mime:     p.Mime,
				URL:      p.URL,
				Filename: p.Filename,
			})
		case pukucode.AgentPart:
			// Agent parts are converted to text with @mention format
			parts = append(parts, pukucode.SessionPromptParamsPartUnion{
				Type: "text",
				Text: "@" + p.Name,
			})
		}
	}
	return parts
}
