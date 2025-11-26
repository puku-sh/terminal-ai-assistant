package api

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	pukucode "github.com/pukucode/pukucode-sdk-go"
	"github.com/pukucode/pukucode-sdk-go/option"

	"Chat2/internal/types"

	tea "github.com/charmbracelet/bubbletea"
)

// SendToAIViaSDKDebug is a debug version that shows what's happening
func SendToAIViaSDKDebug(message string) tea.Cmd {
	return func() tea.Msg {
		if sdkClient == nil || currentSession == nil {
			return types.ErrorMsg("SDK not initialized. Make sure PukuCode server is running.")
		}

		ctx := context.Background()

		log.Printf("[DEBUG] Sending message: %s", message)
		log.Printf("[DEBUG] Session ID: %s", currentSession.ID)

		// Send prompt to session
		msg, err := sdkClient.Session.Prompt(ctx, currentSession.ID, pukucode.SessionPromptParams{
			Parts: []pukucode.MessagePart{
				{
					Type: "text",
					Text: message,
				},
			},
		})
		if err != nil {
			log.Printf("[DEBUG] Error sending prompt: %v", err)
			return types.ErrorMsg("Failed to send message: " + err.Error())
		}

		log.Printf("[DEBUG] Message sent, ID: %s", msg.ID)
		log.Printf("[DEBUG] Waiting for response...")

		// Poll for response with retries (max 30 seconds)
		maxAttempts := 15
		waitTime := 2 * time.Second

		var response string
		for attempt := 0; attempt < maxAttempts; attempt++ {
			// Wait before checking
			time.Sleep(waitTime)

			log.Printf("[DEBUG] Attempt %d/%d - Fetching messages...", attempt+1, maxAttempts)

			// Fetch messages
			messages, err := sdkClient.Session.Messages(ctx, currentSession.ID, pukucode.SessionMessagesParams{})
			if err != nil {
				log.Printf("[DEBUG] Error fetching messages: %v", err)
				return types.ErrorMsg("Failed to fetch messages: " + err.Error())
			}

			log.Printf("[DEBUG] Got %d messages total", len(messages))
			for i, m := range messages {
				log.Printf("[DEBUG]   Message %d: Role=%s, Parts=%d", i, m.Role, len(m.Parts))
			}

			// Find the latest assistant message
			response = ""
			for i := len(messages) - 1; i >= 0; i-- {
				if messages[i].Role == "assistant" {
					log.Printf("[DEBUG] Found assistant message at index %d", i)
					// Combine all text parts
					for _, part := range messages[i].Parts {
						if part.Type == "text" {
							response += part.Text
							log.Printf("[DEBUG] Added text part: %s", part.Text[:min(50, len(part.Text))])
						}
					}
					break
				}
			}

			// If we got a response, return it
			if response != "" {
				log.Printf("[DEBUG] Got response! Length: %d", len(response))
				return types.ResponseMsg(response)
			}

			log.Printf("[DEBUG] No assistant response yet, retrying...")

			// No response yet, will retry
			// Increase wait time slightly for subsequent attempts
			if attempt > 3 {
				waitTime = 3 * time.Second
			}
		}

		// Timeout - no response received
		log.Printf("[DEBUG] Timeout waiting for response")
		return types.ErrorMsg(fmt.Sprintf("Timeout waiting for AI response (waited 30s). Message ID: %s", msg.ID))
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// InitSDKClientWithModel creates a session with specific model
func InitSDKClientWithModel(model string) error {
	baseURL := os.Getenv("PUKUCODE_BASE_URL")
	if baseURL == "" {
		baseURL = "http://localhost:1337"
	}

	sdkClient = pukucode.NewClient(option.WithBaseURL(baseURL))

	// Create a session WITH a model specified
	ctx := context.Background()
	session, err := sdkClient.Session.New(ctx, pukucode.SessionNewParams{
		Title: pukucode.F("PUKU CLI Chat"),
		Model: pukucode.F(model), // Specify the model!
	})
	if err != nil {
		return fmt.Errorf("failed to create session: %w", err)
	}

	currentSession = session
	log.Printf("[DEBUG] Session created with model: %s", model)
	return nil
}
