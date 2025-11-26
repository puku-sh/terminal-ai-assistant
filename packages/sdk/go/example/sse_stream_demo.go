// SSE Streaming demo - demonstrates real-time event streaming with PukuCode SDK
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
	fmt.Println("=== PukuCode SSE Streaming Demo ===\n")

	// Create client
	client := pukucode.NewClient(option.WithBaseURL("http://localhost:1337"))
	ctx := context.Background()

	// 1. Create a session with a model
	fmt.Println("Creating session with openrouter/z-ai/glm-4.6...")
	session, err := client.Session.New(ctx, pukucode.SessionNewParams{
		Title: pukucode.F("SSE Stream Test"),
		Model: pukucode.F("openrouter/z-ai/glm-4.6"),
	})
	if err != nil {
		log.Fatalf("Failed to create session: %v", err)
	}
	fmt.Printf("Session created: %s\n\n", session.ID)

	// 2. Subscribe to SSE events BEFORE sending the prompt
	fmt.Println("Subscribing to SSE events...")
	stream, err := client.Event.Subscribe(ctx)
	if err != nil {
		log.Fatalf("Failed to subscribe to events: %v", err)
	}
	defer stream.Close()
	fmt.Println("✅ Subscribed to event stream\n")

	// 3. Send a prompt (this will trigger AI processing)
	fmt.Println("Sending prompt: 'Say hello in 5 words'")
	_, err = client.Session.Prompt(ctx, session.ID, pukucode.SessionPromptParams{
		Parts: []pukucode.MessagePart{
			{Type: "text", Text: "Say hello in 5 words"},
		},
	})
	if err != nil {
		log.Fatalf("Failed to send prompt: %v", err)
	}
	fmt.Println("Prompt sent!\n")

	// 4. Listen for events in real-time
	fmt.Println("📡 Listening for events...\n")
	fmt.Println("─────────────────────────────────────────────────────")

	eventCount := 0
	timeout := time.After(60 * time.Second)
	done := make(chan bool)

	go func() {
		for stream.Next() {
			event := stream.Current()
			eventCount++

			// Only show events for our session
			if event.SessionID != session.ID {
				continue
			}

			// Print event details
			timestamp := time.Now().Format("15:04:05.000")
			fmt.Printf("[%s] Event #%d\n", timestamp, eventCount)
			fmt.Printf("  Type: %s\n", event.Type)
			if event.MessageID != "" {
				msgIDStr := event.MessageID
				if len(msgIDStr) > 12 {
					msgIDStr = msgIDStr[:12] + "..."
				}
				fmt.Printf("  MessageID: %s\n", msgIDStr)
			}
			if event.SessionID != "" {
				sessIDStr := event.SessionID
				if len(sessIDStr) > 12 {
					sessIDStr = sessIDStr[:12] + "..."
				}
				fmt.Printf("  SessionID: %s\n", sessIDStr)
			}

			// Handle specific event types
			switch event.Type {
			case "message.updated":
				fmt.Println("  → Message metadata updated")

			case "message.part.updated":
				fmt.Println("  → Message part updated (text streaming)")

			case "session.idle":
				fmt.Println("  → Session idle - AI finished!")
				fmt.Println("─────────────────────────────────────────────────────")
				done <- true
				return
			}

			fmt.Println()
		}

		// Check for stream errors
		if err := stream.Err(); err != nil {
			log.Printf("Stream error: %v", err)
		}
		done <- true
	}()

	// Wait for completion or timeout
	select {
	case <-done:
		fmt.Println("\n✅ Event stream completed")
	case <-timeout:
		fmt.Println("\n⏱️  Timeout reached (60 seconds)")
	}

	// 5. Fetch the final messages to see the result
	fmt.Println("\nFetching final messages...")
	messages, err := client.Session.Messages(ctx, session.ID, pukucode.SessionMessagesParams{})
	if err != nil {
		log.Fatalf("Failed to get messages: %v", err)
	}

	fmt.Printf("Total messages: %d\n\n", len(messages))

	// Display the messages
	for i, msg := range messages {
		idStr := msg.ID
		if len(idStr) > 12 {
			idStr = idStr[:12] + "..."
		}

		fmt.Printf("Message %d [%s] ID: %s\n", i+1, msg.Role, idStr)
		fmt.Println("  " + string([]byte{'─'})*50)

		for j, part := range msg.Parts {
			if part.Type == "text" && part.Text != "" {
				fmt.Printf("  Part %d [text]:\n", j+1)
				// Limit text display to 200 chars
				text := part.Text
				if len(text) > 200 {
					text = text[:200] + "..."
				}
				fmt.Printf("    %s\n", text)
			} else if part.Type == "tool" {
				fmt.Printf("  Part %d [tool]\n", j+1)
			} else if part.Type == "reasoning" {
				fmt.Printf("  Part %d [reasoning]: %d chars\n", j+1, len(part.Text))
			} else if part.Type != "" {
				fmt.Printf("  Part %d [%s]\n", j+1, part.Type)
			}
		}
		fmt.Println()
	}

	// Clean up
	fmt.Println("Cleaning up...")
	err = client.Session.Delete(ctx, session.ID, pukucode.SessionDeleteParams{})
	if err != nil {
		log.Printf("Warning: Failed to delete session: %v", err)
	}
	fmt.Println("Session deleted")

	fmt.Println("\n=== PukuCode SSE Stream Demo Complete ===")
	fmt.Printf("\nTotal events received: %d\n", eventCount)
}
