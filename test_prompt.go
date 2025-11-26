package main

import (
	"context"
	"fmt"
	"log"
	"time"

	pukucode "github.com/pukucode/pukucode-sdk-go"
	"github.com/pukucode/pukucode-sdk-go/option"
)

func main() {
	// Create client
	client := pukucode.NewClient(option.WithBaseURL("http://localhost:1337"))
	ctx := context.Background()

	// Create session with explicit model
	fmt.Println("Creating session with openrouter/z-ai/glm-4.6...")
	session, err := client.Session.New(ctx, pukucode.SessionNewParams{
		Title: pukucode.F("Test Session"),
		Model: pukucode.F("openrouter/z-ai/glm-4.6"),
	})
	if err != nil {
		log.Fatalf("Failed to create session: %v", err)
	}
	fmt.Printf("Session created: %s\n", session.ID)

	// Send a prompt
	fmt.Println("\nSending prompt: 'Say hello in 3 words'")
	msg, err := client.Session.Prompt(ctx, session.ID, pukucode.SessionPromptParams{
		Parts: []pukucode.MessagePart{
			{Type: "text", Text: "Say hello in 3 words"},
		},
	})
	if err != nil {
		log.Fatalf("Failed to send prompt: %v", err)
	}
	fmt.Printf("Prompt sent with ID: %s\n", msg.ID)

	// Poll for response
	fmt.Println("\n⏳ Polling for response (max 60 seconds)...\n")
	for attempt := 0; attempt < 30; attempt++ {
		time.Sleep(2 * time.Second)

		messages, err := client.Session.Messages(ctx, session.ID, pukucode.SessionMessagesParams{})
		if err != nil {
			log.Fatalf("Failed to get messages: %v", err)
		}

		fmt.Printf("[Attempt %2d/30] Total messages: %d\n", attempt+1, len(messages))

		// Print all messages
		for i, m := range messages {
			fmt.Printf("  Message %d:\n", i+1)
			fmt.Printf("    ID: %s\n", m.ID)
			fmt.Printf("    Role: %s\n", m.Role)
			fmt.Printf("    Parts: %d\n", len(m.Parts))

			for j, part := range m.Parts {
				if part.Type == "text" && part.Text != "" {
					preview := part.Text
					if len(preview) > 80 {
						preview = preview[:80] + "..."
					}
					fmt.Printf("      Part %d [text]: %s\n", j+1, preview)
				} else if part.Type == "tool-use" {
					fmt.Printf("      Part %d [tool-use]: Tool being called\n", j+1)
				} else if part.Type == "tool-result" {
					fmt.Printf("      Part %d [tool-result]: Tool result\n", j+1)
				} else {
					fmt.Printf("      Part %d [%s]\n", j+1, part.Type)
				}
			}
		}
		fmt.Println()

		// Check for assistant response with text
		for i := len(messages) - 1; i >= 0; i-- {
			if messages[i].Role == "assistant" {
				for _, part := range messages[i].Parts {
					if part.Type == "text" && part.Text != "" {
						fmt.Println("=" + string(make([]byte, 60)) + "=")
						fmt.Printf("✅ SUCCESS! Got response:\n\n%s\n", part.Text)
						fmt.Println("=" + string(make([]byte, 60)) + "=")

						// Clean up
						fmt.Println("\nCleaning up...")
						client.Session.Delete(ctx, session.ID, pukucode.SessionDeleteParams{})
						fmt.Println("Session deleted")
						return
					}
				}
			}
		}
	}

	fmt.Println("=" + string(make([]byte, 60)) + "=")
	fmt.Println("❌ TIMEOUT: No response received after 60 seconds")
	fmt.Println("=" + string(make([]byte, 60)) + "=")

	// Clean up
	fmt.Println("\nCleaning up...")
	client.Session.Delete(ctx, session.ID, pukucode.SessionDeleteParams{})
	fmt.Println("Session deleted")
}
