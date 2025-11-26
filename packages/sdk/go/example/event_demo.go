// Event Demo - Demonstrates EventService SSE streaming for PukuCode
//
// This example shows how to:
// - Subscribe to real-time events from PukuCode
// - Handle different event types (message updates, session idle, etc.)
//
// NOTE: This demo listens for events for 30 seconds.
// Try sending a prompt in another terminal while this is running!
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
	fmt.Println("═══════════════════════════════════════════════════════════")
	fmt.Println("           PukuCode Go SDK - Event Demo")
	fmt.Println("═══════════════════════════════════════════════════════════\n")

	// Create client
	baseURL := "http://localhost:1337"
	client := pukucode.NewClient(option.WithBaseURL(baseURL))

	fmt.Printf("Connected to: %s\n\n", baseURL)

	// ═══════════════════════════════════════════════════════════════════
	// 1. Subscribe to events
	// ═══════════════════════════════════════════════════════════════════
	fmt.Println("1. Subscribing to events...")
	fmt.Println("   (Listening for 30 seconds - try sending a prompt!)\n")

	// Create a context with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Start streaming events
	stream, err := client.Event.Subscribe(ctx)
	if err != nil {
		log.Fatalf("   ❌ Failed to subscribe to events: %v", err)
	}
	defer stream.Close()

	fmt.Println("   ✅ Subscribed to event stream")
	fmt.Println("   Waiting for events...")
	fmt.Println("   " + strings.Repeat("─", 50))

	eventCount := 0
	startTime := time.Now()

	// Track session activity
	activeSessions := make(map[string]int) // sessionID -> event count

	// Process events
	for stream.Next() {
		event := stream.Current()
		eventCount++
		elapsed := time.Since(startTime).Round(time.Millisecond)

		fmt.Printf("\n   [%v] Event #%d\n", elapsed, eventCount)
		fmt.Println("   " + strings.Repeat("─", 50))

		// Print event type
		fmt.Printf("   Type: %s\n", event.Type)

		// Print session ID if available
		if event.SessionID != "" {
			sessIDStr := event.SessionID
			if len(sessIDStr) > 12 {
				sessIDStr = sessIDStr[:12] + "..."
			}
			fmt.Printf("   SessionID: %s\n", sessIDStr)
			activeSessions[event.SessionID]++
		}

		// Print message ID if available
		if event.MessageID != "" {
			msgIDStr := event.MessageID
			if len(msgIDStr) > 12 {
				msgIDStr = msgIDStr[:12] + "..."
			}
			fmt.Printf("   MessageID: %s\n", msgIDStr)
		}

		// Handle different event types with descriptions
		switch event.Type {
		case "message.updated":
			fmt.Println("   → Message metadata updated")
			fmt.Println("      (Message was created or updated)")

		case "message.removed":
			fmt.Println("   → Message removed")
			fmt.Println("      (Message was deleted from session)")

		case "message.part.updated":
			fmt.Println("   → Message part updated")
			fmt.Println("      (Text streaming or tool execution)")

		case "message.part.removed":
			fmt.Println("   → Message part removed")
			fmt.Println("      (Part was deleted)")

		case "session.updated":
			fmt.Println("   → Session updated")
			fmt.Println("      (Session metadata changed)")

		case "session.idle":
			fmt.Println("   → ⭐ SESSION IDLE - AI FINISHED!")
			fmt.Println("      (This is when you should fetch messages)")
			fmt.Printf("      DEBUG: SessionID = '%s'\n", event.SessionID)

			// Fetch and display messages when session becomes idle
			if event.SessionID != "" {
				fmt.Println("\n   📥 Fetching messages from session...")
				fetchCtx := context.Background()
				messages, err := client.Session.Messages(fetchCtx, event.SessionID, pukucode.SessionMessagesParams{})
				if err != nil {
					fmt.Printf("      ❌ Failed to fetch messages: %v\n", err)
				} else {
					fmt.Printf("      ✅ Got %d messages\n", len(messages))

					// Display the messages
					for i, msg := range messages {
						msgIDStr := msg.ID
						if len(msgIDStr) > 12 {
							msgIDStr = msgIDStr[:12] + "..."
						}
						fmt.Printf("\n      Message %d [%s] ID: %s\n", i+1, msg.Role, msgIDStr)

						// Show text parts
						for j, part := range msg.Parts {
							if part.Type == "text" && part.Text != "" {
								textPreview := part.Text
								if len(textPreview) > 150 {
									textPreview = textPreview[:150] + "..."
								}
								fmt.Printf("         Part %d [text]: %s\n", j+1, textPreview)
							} else if part.Type != "" {
								fmt.Printf("         Part %d [%s]\n", j+1, part.Type)
							}
						}
					}
					fmt.Println()
				}
			}

		case "session.compacted":
			fmt.Println("   → Session compacted")
			fmt.Println("      (Session was summarized to save tokens)")

		case "permission.updated":
			fmt.Println("   → Permission updated")
			fmt.Println("      (Permission request state changed)")

		case "permission.replied":
			fmt.Println("   → Permission replied")
			fmt.Println("      (User responded to permission request)")

		default:
			fmt.Printf("   → Unknown event type: %s\n", event.Type)
		}

		// Print data if available
		if event.Data != nil {
			fmt.Printf("   Data: %+v\n", event.Data)
		}
	}

	// Check for errors
	if err := stream.Err(); err != nil {
		if ctx.Err() == context.DeadlineExceeded {
			fmt.Println("\n   ⏱️  Timeout reached (30 seconds)")
		} else {
			fmt.Printf("\n   ❌ Stream error: %v\n", err)
		}
	}

	fmt.Printf("\n   ✅ Received %d events total\n", eventCount)

	// Print session activity summary
	if len(activeSessions) > 0 {
		fmt.Println("\n   Active sessions during this period:")
		for sessID, count := range activeSessions {
			sessIDStr := sessID
			if len(sessIDStr) > 12 {
				sessIDStr = sessIDStr[:12] + "..."
			}
			fmt.Printf("      - %s: %d events\n", sessIDStr, count)
		}
	}

	fmt.Println()
	fmt.Println("═══════════════════════════════════════════════════════════")
	fmt.Println("           Event Demo Complete!")
	fmt.Println("═══════════════════════════════════════════════════════════")
	fmt.Println("\nTIP: To test event streaming with a prompt:")
	fmt.Println("  1. Run this demo in one terminal")
	fmt.Println("  2. Run session_demo.go in another terminal")
	fmt.Println("  3. Watch events appear in real-time!")
}
