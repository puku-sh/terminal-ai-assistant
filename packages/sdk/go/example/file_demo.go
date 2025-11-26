// File operations demo - demonstrates file listing and operations
package main

import (
	"context"
	"fmt"
	"log"

	pukucode "github.com/pukucode/pukucode-sdk-go"
	"github.com/pukucode/pukucode-sdk-go/option"
)

func main() {
	fmt.Println("=== File Operations Demo ===\n")

	// Create client
	client := pukucode.NewClient(option.WithBaseURL("http://localhost:1337"))
	ctx := context.Background()

	// 1. List files in current directory
	fmt.Println("1. Listing files in current directory...")
	files, err := client.File.List(ctx, pukucode.FileListParams{
		Path: pukucode.F("."),
	})
	if err != nil {
		log.Fatalf("   ❌ Failed to list files: %v", err)
	}
	fmt.Printf("   ✅ Found %d items:\n", len(files))
	for i, file := range files {
		if i >= 10 {
			fmt.Printf("      ... and %d more\n", len(files)-10)
			break
		}
		typeStr := "FILE"
		if file.IsDir {
			typeStr = "DIR "
		}
		sizeStr := fmt.Sprintf("%d bytes", file.Size)
		if file.IsDir {
			sizeStr = "-"
		}
		fmt.Printf("      [%s] %-30s %s\n", typeStr, file.Name, sizeStr)
	}
	fmt.Println()

	// 2. Get file status
	fmt.Println("2. Getting file status...")
	status, err := client.File.Status(ctx, pukucode.FileStatusParams{})
	if err != nil {
		log.Fatalf("   ❌ Failed to get file status: %v", err)
	}
	fmt.Println("   ✅ File status retrieved")
	fmt.Printf("   Modified files: %d\n", len(status.Modified))
	fmt.Printf("   Added files: %d\n", len(status.Added))
	fmt.Printf("   Deleted files: %d\n\n", len(status.Deleted))

	// 3. List files in a specific path (if exists)
	fmt.Println("3. Listing files in 'src' directory (if exists)...")
	srcFiles, err := client.File.List(ctx, pukucode.FileListParams{
		Path: pukucode.F("src"),
	})
	if err != nil {
		fmt.Printf("   ⚠️  Could not list 'src' directory: %v\n\n", err)
	} else {
		fmt.Printf("   ✅ Found %d items in src/:\n", len(srcFiles))
		for i, file := range srcFiles {
			if i >= 5 {
				fmt.Printf("      ... and %d more\n", len(srcFiles)-5)
				break
			}
			typeStr := "📄"
			if file.IsDir {
				typeStr = "📁"
			}
			fmt.Printf("      %s %s\n", typeStr, file.Name)
		}
		fmt.Println()
	}

	// 4. List projects
	fmt.Println("4. Listing projects...")
	projects, err := client.Project.List(ctx, pukucode.ProjectListParams{})
	if err != nil {
		log.Fatalf("   ❌ Failed to list projects: %v", err)
	}
	fmt.Printf("   ✅ Found %d projects:\n", len(projects))
	for _, project := range projects {
		idStr := project.ID
		if len(idStr) > 8 {
			idStr = idStr[:8]
		}
		fmt.Printf("      - %s: %s\n", idStr, project.Worktree)
	}
	fmt.Println()

	fmt.Println("=== File Operations Demo Complete ===")
}
