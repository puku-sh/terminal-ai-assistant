// Simple AI Response Test
//
// A minimal test to verify AI responses are received correctly
// Uses the GLM-4.6 model via OpenRouter
package main

import (
	"context"
	"fmt"
	"log"
	"strings"
	"time"

	pukucode "github.com/pukucode/pukucode-sdk-go"
	"github.com/pukucode/pukucode-sdk-go/option"
)

func main() {
	fmt.Println("🧪 Simple AI Response Test\n")

	// Create client
	client := pukucode.NewClient(option.WithBaseURL("http://localhost:1337"))
	ctx := context.Background()

	// Create session with GLM-4.6 model
	fmt.Println("Creating session with openrouter/z-ai/glm-4.6...")
	session, err := client.Session.New(ctx, pukucode.SessionNewParams{
		Model: pukucode.F("openrouter/z-ai/glm-4.6"),
	})
	if err != nil {
		log.Fatalf("❌ Failed to create session: %v", err)
	}
	fmt.Printf("✅ Session created: %s\n\n", session.ID)

	// Send a simple prompt
	testPrompt := "What is 2 + 3? Answer in one sentence."
	fmt.Printf("📤 Sending prompt: \"%s\"\n", testPrompt)

	message, err := client.Session.Prompt(ctx, session.ID, pukucode.SessionPromptParams{
		Parts: []pukucode.MessagePart{
			{
				Type: "text",
				Text: testPrompt,
			},
		},
	})
	if err != nil {
		log.Fatalf("❌ Failed to send prompt: %v", err)
	}
	fmt.Println("✅ Prompt sent successfully\n")
	fmt.Printf("Message ID: %s\n", message.ID)
	fmt.Printf("Message Role: %s\n\n", message.Role)

	// Wait for AI to process
	fmt.Println("⏳ Waiting for AI response...")
	time.Sleep(8 * time.Second)

	// Get messages to see the response
	fmt.Println("\n📨 Fetching messages...\n")
	messages, err := client.Session.Messages(ctx, session.ID, pukucode.SessionMessagesParams{})
	if err != nil {
		log.Fatalf("❌ Failed to fetch messages: %v", err)
	}

	fmt.Printf("Found %d messages:\n\n", len(messages))
	fmt.Println(strings.Repeat("=", 60))

	// Display all messages
	for _, msg := range messages {
		role := "unknown"
		if msg.Role != "" {
			role = msg.Role
		}
		fmt.Printf("\n[%s]\n", strings.ToUpper(role))
		fmt.Println(strings.Repeat("-", 60))

		for _, part := range msg.Parts {
			if part.Type == "text" && part.Text != "" {
				fmt.Println(part.Text)
			} else if part.Type == "tool-call" {
				fmt.Println("[Tool Call]")
			} else if part.Type == "tool-result" {
				fmt.Println("[Tool Result]")
			} else {
				fmt.Printf("[%s]\n", part.Type)
			}
		}
	}

	fmt.Println("\n" + strings.Repeat("=", 60))

	// Verify we got a response
	if len(messages) >= 2 {
		fmt.Println("\n✅ AI response received successfully!")
	} else {
		fmt.Println("\n⚠️  Warning: Expected at least 2 messages (user + assistant)")
	}

	// Clean up
	fmt.Println("\n🧹 Cleaning up...")
	err = client.Session.Delete(ctx, session.ID, pukucode.SessionDeleteParams{})
	if err != nil {
		log.Printf("⚠️  Warning: Failed to delete session: %v", err)
	} else {
		fmt.Println("✅ Session deleted")
	}

	fmt.Println("\n✨ Test complete!\n")
}
