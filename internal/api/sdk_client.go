package api

import (
	"context"
	"fmt"
	"os"
	"time"

	pukucode "github.com/pukucode/pukucode-sdk-go"
	"github.com/pukucode/pukucode-sdk-go/option"

	"Chat2/internal/types"

	tea "github.com/charmbracelet/bubbletea"
)

// Global SDK client and session
var (
	sdkClient      *pukucode.Client
	currentSession *pukucode.Session
)

// InitSDKClient initializes the PukuCode SDK client
func InitSDKClient() error {
	baseURL := os.Getenv("PUKUCODE_BASE_URL")
	if baseURL == "" {
		baseURL = "http://localhost:1337"
	}

	sdkClient = pukucode.NewClient(option.WithBaseURL(baseURL))

	// Create a session with a model
	ctx := context.Background()

	// Get available providers first
	providers, err := sdkClient.Config.Providers(ctx, pukucode.ConfigProvidersParams{})
	if err != nil {
		return fmt.Errorf("failed to get providers: %w", err)
	}

	// Find a model to use (prefer anthropic/claude or openai/gpt)
	var modelToUse string
	for _, provider := range providers.Providers {
		if len(provider.Models) > 0 {
			// Try to find claude or gpt models
			for modelID := range provider.Models {
				if modelToUse == "" ||
				   (provider.ID == "anthropic") ||
				   (provider.ID == "openai" && modelToUse == "") {
					modelToUse = provider.ID + "/" + modelID
				}
			}
		}
	}

	if modelToUse == "" {
		return fmt.Errorf("no AI models available - please configure authentication")
	}

	session, err := sdkClient.Session.New(ctx, pukucode.SessionNewParams{
		Title: pukucode.F("PUKU CLI Chat"),
		// Model: pukucode.F(modelToUse), // IMPORTANT: Specify the model!
		Model: pukucode.F("openrouter/z-ai/glm-4.6"),
	})
	if err != nil {
		return fmt.Errorf("failed to create session: %w", err)
	}

	fmt.Printf("Using AI model: %s\n", modelToUse)

	currentSession = session
	return nil
}

// GetSDKClient returns the global SDK client
func GetSDKClient() *pukucode.Client {
	return sdkClient
}

// GetCurrentSession returns the current session
func GetCurrentSession() *pukucode.Session {
	return currentSession
}

// SendToAIViaSDK sends a message using the PukuCode SDK
func SendToAIViaSDK(message string) tea.Cmd {
	return func() tea.Msg {
		if sdkClient == nil || currentSession == nil {
			return types.ErrorMsg("SDK not initialized. Make sure PukuCode server is running.")
		}

		ctx := context.Background()

		// Send prompt to session (this initiates the AI processing)
		_, err := sdkClient.Session.Prompt(ctx, currentSession.ID, pukucode.SessionPromptParams{
			Parts: []pukucode.MessagePart{
				{
					Type: "text",
					Text: message,
				},
			},
		})
		if err != nil {
			return types.ErrorMsg("Failed to send message: " + err.Error())
		}

		// Wait for AI to process and respond
		// Since tools can take time, we need to wait longer
		time.Sleep(10 * time.Second)

		// Fetch the messages
		messages, err := sdkClient.Session.Messages(ctx, currentSession.ID, pukucode.SessionMessagesParams{})
		if err != nil {
			return types.ErrorMsg("Failed to fetch messages: " + err.Error())
		}

		// Find the latest assistant message and collect ALL text parts
		var responseText string
		for i := len(messages) - 1; i >= 0; i-- {
			if messages[i].Role == "assistant" {
				// Collect all text parts from the assistant message
				for _, part := range messages[i].Parts {
					if part.Type == "text" && part.Text != "" {
						responseText += part.Text
					}
				}
				break
			}
		}

		if responseText != "" {
			return types.ResponseMsg(responseText)
		}

		return types.ErrorMsg("No response text found. The AI might still be processing.")
	}
}
