// Configuration demo - demonstrates providers, config, and auth operations
package main

import (
	"context"
	"fmt"
	"log"

	pukucode "github.com/pukucode/pukucode-sdk-go"
	"github.com/pukucode/pukucode-sdk-go/option"
)

func main() {
	fmt.Println("=== Configuration & Providers Demo ===\n")

	// Create client
	client := pukucode.NewClient(option.WithBaseURL("http://localhost:1337"))
	ctx := context.Background()

	// 1. Get configuration
	fmt.Println("1. Getting current configuration...")
	config, err := client.Config.Get(ctx, pukucode.ConfigGetParams{})
	if err != nil {
		log.Fatalf("   ❌ Failed to get config: %v", err)
	}
	fmt.Println("   ✅ Configuration loaded successfully")
	fmt.Printf("   Username: %s\n", config.Username)
	fmt.Printf("   Agents configured: %d\n", len(config.Agent))
	fmt.Printf("   Commands configured: %d\n", len(config.Command))
	fmt.Printf("   Plugins loaded: %d\n\n", len(config.Plugin))

	// 2. List all providers
	fmt.Println("2. Listing AI providers...")
	providersResp, err := client.Config.Providers(ctx, pukucode.ConfigProvidersParams{})
	if err != nil {
		log.Fatalf("   ❌ Failed to list providers: %v", err)
	}
	fmt.Printf("   ✅ Found %d providers:\n", len(providersResp.Providers))
	for _, provider := range providersResp.Providers {
		fmt.Printf("\n   Provider: %s\n", provider.ID)
		fmt.Printf("   Name: %s\n", provider.Name)
		if len(provider.Models) > 0 {
			fmt.Printf("   Models (%d):\n", len(provider.Models))
			count := 0
			for _, model := range provider.Models {
				if count >= 3 {
					fmt.Printf("      ... and %d more models\n", len(provider.Models)-3)
					break
				}
				fmt.Printf("      - %s: %s\n", model.ID, model.Name)
				count++
			}
		}
	}
	fmt.Println()

	// 3. List available agents
	fmt.Println("3. Listing available agents...")
	agents, err := client.App.Agents(ctx, pukucode.AppAgentsParams{})
	if err != nil {
		log.Fatalf("   ❌ Failed to list agents: %v", err)
	}
	fmt.Printf("   ✅ Found %d agents:\n", len(agents))
	for _, agent := range agents {
		fmt.Printf("      - %s\n", agent.ID)
	}
	fmt.Println()

	// 4. List available commands
	fmt.Println("4. Listing available commands...")
	commands, err := client.Command.List(ctx, pukucode.CommandListParams{})
	if err != nil {
		log.Fatalf("   ❌ Failed to list commands: %v", err)
	}
	fmt.Printf("   ✅ Found %d commands:\n", len(commands))
	for _, cmd := range commands {
		desc := cmd.Description
		if len(desc) > 40 {
			desc = desc[:40] + "..."
		}
		fmt.Printf("      - /%s: %s\n", cmd.Name, desc)
	}
	fmt.Println()

	// 5. Auth status (get)
	fmt.Println("5. Checking authentication status...")
	fmt.Println("   Note: Use client.Auth.Get(ctx, \"provider\", params) to check specific provider")
	fmt.Println("   Note: Use client.Auth.Set(ctx, \"provider\", params) to set credentials")
	fmt.Println("   Note: Use client.Auth.Delete(ctx, \"provider\", params) to delete credentials")
	fmt.Println()

	// 6. Example: Set auth (commented out - don't run without real key)
	fmt.Println("6. Example: Setting API key (demonstration only)")
	fmt.Println("   // To set an API key:")
	fmt.Println("   // err := client.Auth.Set(ctx, \"anthropic\", pukucode.NewAPIKeyParams(\"sk-ant-xxx\"))")
	fmt.Println("   // To delete auth:")
	fmt.Println("   // err := client.Auth.Delete(ctx, \"anthropic\", pukucode.AuthDeleteParams{})")
	fmt.Println()

	fmt.Println("=== Configuration Demo Complete ===")
}
