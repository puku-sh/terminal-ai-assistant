// Session management demo - demonstrates session CRUD operations
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
	fmt.Println("=== Session Management Demo ===\n")

	// Create client
	client := pukucode.NewClient(option.WithBaseURL("http://localhost:1337"))
	ctx := context.Background()

	// 1. Create multiple sessions with AI model
	fmt.Println("Creating sessions with AI model (openrouter/z-ai/glm-4.6)...")
	var sessionIDs []string
	for i := 1; i <= 3; i++ {
		session, err := client.Session.New(ctx, pukucode.SessionNewParams{
			Title: pukucode.F(fmt.Sprintf("Test Session %d", i)),
			Model: pukucode.F("openrouter/z-ai/glm-4.6"),
		})
		if err != nil {
			log.Fatalf("Failed to create session %d: %v", i, err)
		}
		sessionIDs = append(sessionIDs, session.ID)
		fmt.Printf("   Created session %d: %s\n", i, session.ID)
	}
	fmt.Println()

	// 2. List all sessions
	fmt.Println("Listing all sessions...")
	sessions, err := client.Session.List(ctx, pukucode.SessionListParams{})
	if err != nil {
		log.Fatalf("Failed to list sessions: %v", err)
	}
	fmt.Printf("   Total sessions: %d\n", len(sessions))
	for _, s := range sessions {
		fmt.Printf("   - [%s] %s (created: %d)\n", s.ID[:8], s.Title, s.CreatedAt)
	}
	fmt.Println()

	// 3. Update a session
	fmt.Println("Updating first session...")
	updated, err := client.Session.Update(ctx, sessionIDs[0], pukucode.SessionUpdateParams{
		Title: pukucode.F("Updated Session Title"),
	})
	if err != nil {
		log.Fatalf("Failed to update session: %v", err)
	}
	fmt.Printf("   Session updated: %s -> %s\n\n", sessionIDs[0][:8], updated.Title)

	// 4. Get session details
	fmt.Println("Getting session details...")
	details, err := client.Session.Get(ctx, sessionIDs[0], pukucode.SessionGetParams{})
	if err != nil {
		log.Fatalf("Failed to get session: %v", err)
	}
	fmt.Printf("   ID: %s\n", details.ID)
	fmt.Printf("   Title: %s\n", details.Title)
	fmt.Printf("   Created: %d\n", details.CreatedAt)
	fmt.Printf("   Updated: %d\n\n", details.UpdatedAt)

	// 5. Get messages from a session
	fmt.Println("Getting messages from session...")
	messages, err := client.Session.Messages(ctx, sessionIDs[0], pukucode.SessionMessagesParams{})
	if err != nil {
		log.Fatalf("Failed to get messages: %v", err)
	}
	fmt.Printf("   Messages in session: %d\n\n", len(messages))

	// 6. Send a prompt to the session
	fmt.Println("Sending a prompt to the session...")
	message, err := client.Session.Prompt(ctx, sessionIDs[0], pukucode.SessionPromptParams{
		Parts: []pukucode.MessagePart{
			{Type: "text", Text: "hi. are you there?"},
		},
	})
	if err != nil {
		log.Fatalf("Failed to send prompt: %v", err)
	}
	fmt.Printf("   Message sent: %s\n", message.ID)
	fmt.Printf("   Role: %s\n\n", message.Role)

	// Wait for AI to respond
	fmt.Println("⏳ Waiting for AI response (8 seconds)...")
	time.Sleep(8 * time.Second)

	// 7. Get messages again to see the new message
	fmt.Println("Getting messages after prompt...")
	messagesAfter, err := client.Session.Messages(ctx, sessionIDs[0], pukucode.SessionMessagesParams{})
	if err != nil {
		log.Fatalf("Failed to get messages: %v", err)
	}
	fmt.Printf("   Messages in session: %d\n\n", len(messagesAfter))
	for i, msg := range messagesAfter {
		idStr := msg.ID
		if len(idStr) > 8 {
			idStr = idStr[:8]
		}
		role := msg.Role
		if role == "" {
			role = "unknown"
		}
		fmt.Printf("   Message %d [%s] ID: %s\n", i+1, role, idStr)
		fmt.Println("   " + strings.Repeat("─", 50))

		// Display all parts
		for _, part := range msg.Parts {
			if part.Type == "text" && part.Text != "" {
				fmt.Printf("   %s\n", part.Text)
			} else if part.Type != "" && part.Type != "text" {
				fmt.Printf("   [%s]\n", part.Type)
			}
		}
		fmt.Println()
	}
	fmt.Println()

	// 8. Clean up - delete all test sessions
	fmt.Println("Cleaning up - deleting test sessions...")
	for i, id := range sessionIDs {
		err := client.Session.Delete(ctx, id, pukucode.SessionDeleteParams{})
		if err != nil {
			log.Printf("   Warning: Failed to delete session %d: %v", i+1, err)
		} else {
			fmt.Printf("   Deleted session %d: %s\n", i+1, id[:8])
		}
	}
	fmt.Println()

	fmt.Println("=== Session Demo Complete ===")
}
