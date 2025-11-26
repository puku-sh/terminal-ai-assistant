// Quick demo of PukuCode Go SDK - shows basic functionality
package main

import (
	"context"
	"fmt"
	"log"

	pukucode "github.com/pukucode/pukucode-sdk-go"
	"github.com/pukucode/pukucode-sdk-go/option"
)

func main() {
	fmt.Println("🚀 PukuCode Go SDK Quick Demo\n")

	// Create client (assumes server is running at localhost:1337)
	baseURL := "http://localhost:1337"
	client := pukucode.NewClient(option.WithBaseURL(baseURL))
	ctx := context.Background()

	fmt.Printf("   Connecting to server at: %s\n\n", baseURL)

	// 1. Create session
	fmt.Println("1. Creating a new session...")
	session, err := client.Session.New(ctx, pukucode.SessionNewParams{
		Title: pukucode.F("Go SDK Demo Session"),
	})
	if err != nil {
		log.Fatalf("   ❌ Failed to create session: %v", err)
	}
	fmt.Printf("   ✅ Session created: %s\n\n", session.ID)

	// 2. Get session info
	fmt.Println("2. Getting session info...")
	sessionInfo, err := client.Session.Get(ctx, session.ID, pukucode.SessionGetParams{})
	if err != nil {
		log.Fatalf("   ❌ Failed to get session: %v", err)
	}
	fmt.Printf("   ✅ Session ID: %s\n", sessionInfo.ID)
	fmt.Printf("   ✅ Session Title: %s\n\n", sessionInfo.Title)

	// 3. List providers
	fmt.Println("3. Listing AI providers...")
	providersResp, err := client.Config.Providers(ctx, pukucode.ConfigProvidersParams{})
	if err != nil {
		log.Fatalf("   ❌ Failed to list providers: %v", err)
	}
	fmt.Printf("   ✅ Found %d providers\n", len(providersResp.Providers))
	for i, provider := range providersResp.Providers {
		if i >= 3 {
			fmt.Printf("      ... and %d more\n", len(providersResp.Providers)-3)
			break
		}
		fmt.Printf("      - %s (%s)\n", provider.ID, provider.Name)
	}
	fmt.Println()

	// 4. List all sessions
	fmt.Println("4. Listing all sessions...")
	sessions, err := client.Session.List(ctx, pukucode.SessionListParams{})
	if err != nil {
		log.Fatalf("   ❌ Failed to list sessions: %v", err)
	}
	fmt.Printf("   ✅ Total sessions: %d\n\n", len(sessions))

	// 5. Update session title
	fmt.Println("5. Updating session title...")
	updatedSession, err := client.Session.Update(ctx, session.ID, pukucode.SessionUpdateParams{
		Title: pukucode.F("Updated Demo Session"),
	})
	if err != nil {
		log.Fatalf("   ❌ Failed to update session: %v", err)
	}
	fmt.Printf("   ✅ Session title updated to: %s\n\n", updatedSession.Title)

	// 6. List commands
	fmt.Println("6. Listing available commands...")
	commands, err := client.Command.List(ctx, pukucode.CommandListParams{})
	if err != nil {
		log.Fatalf("   ❌ Failed to list commands: %v", err)
	}
	fmt.Printf("   ✅ Found %d commands\n", len(commands))
	for i, cmd := range commands {
		if i >= 5 {
			fmt.Printf("      ... and %d more\n", len(commands)-5)
			break
		}
		fmt.Printf("      - %s: %s\n", cmd.Name, cmd.Description)
	}
	fmt.Println()

	// 7. List files
	fmt.Println("7. Listing files in current directory...")
	files, err := client.File.List(ctx, pukucode.FileListParams{
		Path: pukucode.F("."),
	})
	if err != nil {
		log.Fatalf("   ❌ Failed to list files: %v", err)
	}
	fmt.Printf("   ✅ Found %d files/directories\n", len(files))
	for i, file := range files {
		if i >= 5 {
			fmt.Printf("      ... and %d more\n", len(files)-5)
			break
		}
		dirMarker := ""
		if file.IsDir {
			dirMarker = "/"
		}
		fmt.Printf("      - %s%s\n", file.Name, dirMarker)
	}
	fmt.Println()

	// 8. Clean up - delete session
	fmt.Println("8. Cleaning up - deleting session...")
	err = client.Session.Delete(ctx, session.ID, pukucode.SessionDeleteParams{})
	if err != nil {
		log.Fatalf("   ❌ Failed to delete session: %v", err)
	}
	fmt.Println("   ✅ Session deleted\n")

	fmt.Println("✨ Demo complete! The Go SDK is working perfectly.\n")
}
