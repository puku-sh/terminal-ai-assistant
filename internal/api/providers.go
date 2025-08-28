package api

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"Chat2/internal/types"

	tea "github.com/charmbracelet/bubbletea"
)

var Providers = map[string]types.AIProvider{
	"openrouter": {
		Name:    "OpenRouter",
		BaseURL: "https://openrouter.ai/api/v1/chat/completions",
		Model:   "gpt-3.5-turbo",
	},
}

func SendToAI(message, currentProvider string, apiKeys map[string]string) tea.Cmd {
	provider := Providers[currentProvider]
	apiKey := apiKeys[currentProvider]

	switch currentProvider {
	case "openrouter":
		return sendToOpenRouter(message, provider, apiKey)
	default:
		return func() tea.Msg {
			return types.ErrorMsg("Unknown provider: " + currentProvider)
		}
	}
}

func sendToOpenRouter(message string, provider types.AIProvider, apiKey string) tea.Cmd {
	return func() tea.Msg {
		requestBody := map[string]interface{}{
			"model": provider.Model,
			"messages": []map[string]string{
				{"role": "user", "content": message},
			},
			"max_tokens": 1000,
			"stream":     true,
		}

		jsonBody, err := json.Marshal(requestBody)
		if err != nil {
			return types.ErrorMsg("Failed to encode OpenAI request: " + err.Error())
		}

		req, err := http.NewRequest("POST", provider.BaseURL, bytes.NewBuffer(jsonBody))
		if err != nil {
			return types.ErrorMsg("Failed to create OpenAI request: " + err.Error())
		}

		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+apiKey)

		client := &http.Client{Timeout: 60 * time.Second}
		resp, err := client.Do(req)
		if err != nil {
			return types.ErrorMsg("OpenAI API error: " + err.Error())
		}

		if resp.StatusCode != http.StatusOK {
			resp.Body.Close()
			return types.ErrorMsg(fmt.Sprintf("OpenAI API returned status %d", resp.StatusCode))
		}

		go handleOpenRouterStream(resp.Body)
		return nil
	}
}

func handleOpenRouterStream(body io.ReadCloser) {
	defer body.Close()
	
	program := types.GetGlobalProgram()
	if program == nil {
		return
	}

	scanner := bufio.NewScanner(body)
	for scanner.Scan() {
		line := scanner.Text()
		if strings.HasPrefix(line, "data: ") {
			data := strings.TrimPrefix(line, "data: ")
			if data == "[DONE]" {
				program.Send(types.StreamEndMsg{})
				return
			}

			var chunk struct {
				Choices []struct {
					Delta struct {
						Content string `json:"content"`
					} `json:"delta"`
				} `json:"choices"`
			}

			if err := json.Unmarshal([]byte(data), &chunk); err == nil {
				if len(chunk.Choices) > 0 && chunk.Choices[0].Delta.Content != "" {
					program.Send(types.StreamCharMsg(chunk.Choices[0].Delta.Content))
				}
			}
		}
	}

	program.Send(types.StreamEndMsg{})
}