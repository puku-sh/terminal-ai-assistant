# PukuCode Go SDK

The official Go client library for the PukuCode API. This SDK provides a type-safe, idiomatic Go interface for interacting with PukuCode's AI-powered terminal assistant.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Core Concepts](#core-concepts)
- [Services](#services)
  - [Session Service](#session-service)
  - [Project Service](#project-service)
  - [Config Service](#config-service)
  - [File Service](#file-service)
  - [Command Service](#command-service)
  - [App Service](#app-service)
  - [TUI Service](#tui-service)
  - [Auth Service](#auth-service)
  - [Tool Service](#tool-service)
  - [Event Service](#event-service)
- [Field Helpers](#field-helpers)
- [Error Handling](#error-handling)
- [Request Options](#request-options)
- [Examples](#examples)
- [Requirements](#requirements)

## Installation

```bash
go get github.com/pukucode/pukucode-sdk-go
```

## Quick Start

Here's a simple example to get you started:

```go
package main

import (
    "context"
    "fmt"
    "log"

    pukucode "github.com/pukucode/pukucode-sdk-go"
    "github.com/pukucode/pukucode-sdk-go/option"
)

func main() {
    // Create a new client
    client := pukucode.NewClient(
        option.WithBaseURL("http://localhost:1337"),
    )

    ctx := context.Background()

    // List all sessions
    sessions, err := client.Session.List(ctx, pukucode.SessionListParams{})
    if err != nil {
        log.Fatal(err)
    }

    fmt.Printf("Found %d sessions\n", len(sessions))

    // Create a new session
    session, err := client.Session.New(ctx, pukucode.SessionNewParams{
        Title: pukucode.F("My First Session"),
    })
    if err != nil {
        log.Fatal(err)
    }

    fmt.Printf("Created session: %s\n", session.ID)
}
```

## Configuration

### Environment Variables

The SDK automatically reads configuration from environment variables:

- `PUKUCODE_BASE_URL` - The base URL for the PukuCode API (default: `http://localhost:3000`)

### Client Options

You can configure the client using various options:

```go
// Basic configuration
client := pukucode.NewClient(
    option.WithBaseURL("http://localhost:3000"),
)

// With custom HTTP client
httpClient := &http.Client{
    Timeout: 30 * time.Second,
}
client := pukucode.NewClient(
    option.WithHTTPClient(httpClient),
)

// With retry configuration
client := pukucode.NewClient(
    option.WithMaxRetries(3),
)

// With custom headers
client := pukucode.NewClient(
    option.WithHeader("X-Custom-Header", "value"),
)
```

## Core Concepts

### The Client

The `Client` is the main entry point to the SDK. It contains all the services you need to interact with PukuCode:

```go
client := pukucode.NewClient()

// Access services
client.Session   // Session management
client.Project   // Project management
client.Config    // Configuration
client.File      // File operations
client.Command   // Slash commands
client.App       // Application utilities
client.Tui       // TUI control
client.Auth      // Authentication
client.Tool      // Tool definitions
client.Event     // Server-sent events
```

### Context

All API methods require a `context.Context` as the first argument. This allows you to:

- Set timeouts
- Cancel requests
- Pass request-scoped values

```go
// With timeout
ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
defer cancel()

sessions, err := client.Session.List(ctx, pukucode.SessionListParams{})
```

### Parameters

Each API method accepts a parameters struct. Use the field helpers to set values:

```go
params := pukucode.SessionNewParams{
    Title:    pukucode.F("My Session"),     // Set a value
    ParentID: pukucode.Null[string](),      // Explicitly set null
}
```

## Services

### Session Service

The Session service manages chat sessions with the AI assistant.

#### List Sessions

```go
sessions, err := client.Session.List(ctx, pukucode.SessionListParams{
    Directory: pukucode.F("/path/to/project"), // Optional
})
if err != nil {
    log.Fatal(err)
}

for _, session := range sessions {
    fmt.Printf("Session: %s - %s\n", session.ID, session.Title)
}
```

#### Create a Session

```go
session, err := client.Session.New(ctx, pukucode.SessionNewParams{
    Title:    pukucode.F("Code Review Session"),
    ParentID: pukucode.F("parent-session-id"), // Optional, for branching
})
if err != nil {
    log.Fatal(err)
}

fmt.Printf("Created: %s\n", session.ID)
```

#### Get a Session

```go
session, err := client.Session.Get(ctx, "session-id", pukucode.SessionGetParams{})
if err != nil {
    log.Fatal(err)
}

fmt.Printf("Title: %s\n", session.Title)
fmt.Printf("Created: %d\n", session.CreatedAt)
```

#### Update a Session

```go
session, err := client.Session.Update(ctx, "session-id", pukucode.SessionUpdateParams{
    Title: pukucode.F("Updated Title"),
})
```

#### Delete a Session

```go
err := client.Session.Delete(ctx, "session-id", pukucode.SessionDeleteParams{})
```

#### Send a Message (Prompt)

```go
message, err := client.Session.Prompt(ctx, "session-id", pukucode.SessionPromptParams{
    Parts: []pukucode.MessagePart{
        {
            Type: "text",
            Text: "Explain how to implement a binary search tree in Go",
        },
    },
})
if err != nil {
    log.Fatal(err)
}

fmt.Printf("Message sent: %s\n", message.ID)
```

#### Send a Message with File Attachment

```go
message, err := client.Session.Prompt(ctx, "session-id", pukucode.SessionPromptParams{
    Parts: []pukucode.MessagePart{
        {
            Type: "text",
            Text: "Please review this code",
        },
        {
            Type:     "file",
            Mime:     "text/plain",
            URL:      "file:///path/to/code.go",
            Filename: "code.go",
        },
    },
})
```

#### Get Messages

```go
messages, err := client.Session.Messages(ctx, "session-id", pukucode.SessionMessagesParams{})
if err != nil {
    log.Fatal(err)
}

for _, msg := range messages {
    fmt.Printf("[%s] %s\n", msg.Role, msg.ID)
    for _, part := range msg.Parts {
        if part.Type == "text" {
            fmt.Println(part.Text)
        }
    }
}
```

#### Get a Specific Message

```go
message, err := client.Session.Message(ctx, "session-id", "message-id", pukucode.SessionMessageParams{})
```

#### Initialize a Session

Initialize a session with a specific provider and model:

```go
err := client.Session.Init(ctx, "session-id", pukucode.SessionInitParams{
    MessageID:  pukucode.F("msg-123"),
    ProviderID: pukucode.F("anthropic"),
    ModelID:    pukucode.F("claude-3-sonnet"),
})
```

#### Abort a Running Session

```go
err := client.Session.Abort(ctx, "session-id", pukucode.SessionAbortParams{})
```

#### Execute a Command

```go
message, err := client.Session.Command(ctx, "session-id", pukucode.SessionCommandParams{
    Command:   pukucode.F("/help"),
    Arguments: pukucode.F(""),
})
```

#### Execute a Shell Command

```go
err := client.Session.Shell(ctx, "session-id", pukucode.SessionShellParams{
    Agent:   pukucode.F("default"),
    Command: pukucode.F("ls -la"),
})
```

#### Get Child Sessions

```go
children, err := client.Session.Children(ctx, "parent-id", pukucode.SessionChildrenParams{})
```

#### Revert to a Previous Message

```go
err := client.Session.Revert(ctx, "session-id", pukucode.SessionRevertParams{
    MessageID: pukucode.F("msg-123"),
    PartID:    pukucode.F("prt-456"), // Optional
})
```

#### Unrevert

```go
err := client.Session.Unrevert(ctx, "session-id", pukucode.SessionUnrevertParams{})
```

### Project Service

Manage projects in PukuCode.

#### List Projects

```go
projects, err := client.Project.List(ctx, pukucode.ProjectListParams{})
if err != nil {
    log.Fatal(err)
}

for _, project := range projects {
    fmt.Printf("Project: %s at %s\n", project.ID, project.Worktree)
}
```

#### Get Current Project

```go
project, err := client.Project.Current(ctx, pukucode.ProjectCurrentParams{
    Directory: pukucode.F("/path/to/project"),
})
if err != nil {
    log.Fatal(err)
}

fmt.Printf("Current project: %s\n", project.ID)
```

### Config Service

Access configuration and providers.

#### Get Configuration

```go
config, err := client.Config.Get(ctx, pukucode.ConfigGetParams{})
if err != nil {
    log.Fatal(err)
}

fmt.Printf("Config: %s\n", *config)
```

#### List Providers

```go
providers, err := client.Config.Providers(ctx, pukucode.ConfigProvidersParams{})
if err != nil {
    log.Fatal(err)
}

for _, provider := range providers {
    fmt.Printf("Provider: %s (%s)\n", provider.Name, provider.ID)
    for _, model := range provider.Models {
        fmt.Printf("  - Model: %s\n", model.Name)
    }
}
```

### File Service

Perform file operations.

#### List Files

```go
files, err := client.File.List(ctx, pukucode.FileListParams{
    Path: pukucode.F("/path/to/directory"),
})
if err != nil {
    log.Fatal(err)
}

for _, file := range files {
    if file.IsDir {
        fmt.Printf("[DIR]  %s\n", file.Name)
    } else {
        fmt.Printf("[FILE] %s (%d bytes)\n", file.Name, file.Size)
    }
}
```

#### Read File Content

```go
content, err := client.File.Read(ctx, pukucode.FileReadParams{
    Path: pukucode.F("/path/to/file.txt"),
})
if err != nil {
    log.Fatal(err)
}

fmt.Println(*content)
```

#### Get File Status

```go
status, err := client.File.Status(ctx, pukucode.FileStatusParams{})
if err != nil {
    log.Fatal(err)
}

fmt.Printf("Modified: %v\n", status.Modified)
fmt.Printf("Added: %v\n", status.Added)
fmt.Printf("Deleted: %v\n", status.Deleted)
```

### Command Service

List available slash commands.

```go
commands, err := client.Command.List(ctx, pukucode.CommandListParams{})
if err != nil {
    log.Fatal(err)
}

for _, cmd := range commands {
    fmt.Printf("/%s - %s\n", cmd.Name, cmd.Description)
}
```

### App Service

Application utilities including logging and agent management.

#### Send a Log Message

```go
err := client.App.Log(ctx, pukucode.AppLogParams{
    Service: pukucode.F("my-service"),
    Level:   pukucode.F("info"),
    Message: pukucode.F("Operation completed successfully"),
    Extra: pukucode.F(map[string]interface{}{
        "duration": 1.5,
        "count":    42,
    }),
})
```

#### List Agents

```go
agents, err := client.App.Agents(ctx, pukucode.AppAgentsParams{})
if err != nil {
    log.Fatal(err)
}

for _, agent := range agents {
    fmt.Printf("Agent: %s - %s\n", agent.Name, agent.Description)
}
```

### TUI Service

Control the terminal user interface programmatically.

#### Append Text to Prompt

```go
err := client.Tui.AppendPrompt(ctx, pukucode.TuiAppendPromptParams{
    Text: pukucode.F("Hello, world!"),
})
```

#### Open Dialogs

```go
// Open help dialog
err := client.Tui.OpenHelp(ctx)

// Open sessions dialog
err := client.Tui.OpenSessions(ctx)

// Open themes dialog
err := client.Tui.OpenThemes(ctx)

// Open models dialog
err := client.Tui.OpenModels(ctx)
```

#### Prompt Controls

```go
// Submit the current prompt
err := client.Tui.SubmitPrompt(ctx)

// Clear the current prompt
err := client.Tui.ClearPrompt(ctx)
```

#### Execute a TUI Command

```go
err := client.Tui.ExecuteCommand(ctx, pukucode.TuiExecuteCommandParams{
    Command: pukucode.F("/help"),
})
```

#### Show a Toast Notification

```go
err := client.Tui.ShowToast(ctx, pukucode.TuiShowToastParams{
    Title:   pukucode.F("Success"),           // Optional
    Message: pukucode.F("Operation complete"),
    Variant: pukucode.F("success"),           // info, success, warning, error
})
```

### Auth Service

Manage authentication credentials for AI providers.

#### Set API Key Authentication

```go
err := client.Auth.Set(ctx, "anthropic", pukucode.NewAPIKeyParams("sk-ant-xxx"))
if err != nil {
    log.Fatal(err)
}
```

#### Set OAuth Authentication

```go
err := client.Auth.Set(ctx, "google", pukucode.NewOAuthParams(
    "refresh-token",
    "access-token",
    1234567890, // expires timestamp
))
```

#### Set WellKnown Authentication

```go
err := client.Auth.Set(ctx, "provider", pukucode.NewWellKnownParams(
    "key",
    "token",
))
```

### Tool Service

Access tool definitions (experimental).

#### Get Tool IDs

```go
toolIDs, err := client.Tool.IDs(ctx, pukucode.ToolIDsParams{})
if err != nil {
    log.Fatal(err)
}

fmt.Printf("Tool IDs: %s\n", *toolIDs)
```

#### List Tools for a Model

```go
tools, err := client.Tool.List(ctx, pukucode.ToolListParams{
    Provider: pukucode.F("anthropic"),
    Model:    pukucode.F("claude-3-sonnet"),
})
```

### Event Service

Subscribe to server-sent events for real-time updates. Events are pushed from the server whenever something happens (messages, session updates, errors, etc.).

#### Basic Event Subscription

```go
stream, err := client.Event.Subscribe(ctx)
if err != nil {
    log.Fatal(err)
}
defer stream.Close()

// Process events
for stream.Next() {
    event := stream.Current()

    fmt.Printf("Event Type: %s\n", event.Type)

    // Use helper methods to get session/message IDs
    if sessionID := event.GetSessionID(); sessionID != "" {
        fmt.Printf("Session: %s\n", sessionID)
    }

    if messageID := event.GetMessageID(); messageID != "" {
        fmt.Printf("Message: %s\n", messageID)
    }
}

// Check for errors
if err := stream.Err(); err != nil {
    log.Fatal(err)
}
```

#### Event Types

| Event Type | Description |
|------------|-------------|
| `session.updated` | Session created or metadata changed |
| `session.deleted` | Session removed |
| `session.idle` | AI finished responding (important!) |
| `session.error` | Error occurred during processing |
| `message.updated` | Message created or updated |
| `message.removed` | Message deleted |
| `message.part.updated` | Message part added/updated (text streaming) |
| `message.part.removed` | Message part deleted |
| `file.edited` | File modified by Write/Edit tool |
| `permission.updated` | Permission request created |
| `permission.replied` | User responded to permission |
| `server.connected` | SSE connection established |

#### Handling Specific Events

```go
for stream.Next() {
    event := stream.Current()

    switch event.Type {
    case "session.idle":
        // AI finished responding - safe to fetch messages now
        fmt.Printf("Session %s is idle\n", event.GetSessionID())

    case "message.part.updated":
        // Text streaming - get the text content
        if part := event.GetPart(); part != nil {
            if part.Type == "text" {
                fmt.Printf("Text: %s\n", part.Text)
            }
            if part.Type == "tool" {
                fmt.Printf("Tool: %s (status: %s)\n", part.Tool, part.State.Status)
            }
        }

    case "session.error":
        // Handle errors
        if event.Properties.Error != nil {
            fmt.Printf("Error: %s - %s\n",
                event.Properties.Error.Name,
                event.Properties.Error.Message)
        }
    }
}
```

#### Wait for AI Response Pattern

The recommended pattern for sending a prompt and waiting for the response:

```go
// 1. Send the prompt
_, err := client.Session.Prompt(ctx, sessionID, pukucode.SessionPromptParams{
    Parts: []pukucode.MessagePart{
        {Type: "text", Text: "Hello!"},
    },
})
if err != nil {
    log.Fatal(err)
}

// 2. Subscribe to events
stream, _ := client.Event.Subscribe(ctx)
defer stream.Close()

// 3. Wait for session.idle event
for stream.Next() {
    event := stream.Current()
    if event.Type == "session.idle" && event.GetSessionID() == sessionID {
        break // AI is done!
    }
}

// 4. Fetch the messages
messages, _ := client.Session.Messages(ctx, sessionID, pukucode.SessionMessagesParams{})

// 5. Get the assistant's response
for i := len(messages) - 1; i >= 0; i-- {
    if messages[i].Role == "assistant" {
        for _, part := range messages[i].Parts {
            if part.Type == "text" {
                fmt.Println(part.Text)
            }
        }
        break
    }
}
```

#### Event Structure

Events have this structure:

```go
type Event struct {
    Type       string          // Event type (e.g., "session.idle")
    Properties EventProperties // Event-specific data
}

type EventProperties struct {
    SessionID    string            // Session ID (if applicable)
    MessageID    string            // Message ID (if applicable)
    PartID       string            // Part ID (if applicable)
    Info         *SessionInfo      // For session.updated/deleted
    Part         *EventMessagePart // For message.part.updated
    Error        *EventError       // For session.error
    Permission   *PermissionInfo   // For permission.updated
    // ... other fields
}
```

#### Helper Methods

```go
event.GetSessionID()  // Get session ID from any event
event.GetMessageID()  // Get message ID from any event
event.GetText()       // Get text content (for text part updates)
event.GetPart()       // Get the message part (for part updates)
```

## Field Helpers

The SDK uses field helpers to distinguish between zero values, null values, and omitted values.

### Available Helpers

```go
// F - Set a value of any type
pukucode.F("string value")
pukucode.F(42)
pukucode.F(true)
pukucode.F(3.14)

// Type-specific helpers
pukucode.String("string value")
pukucode.Int(42)
pukucode.Bool(true)
pukucode.Float(3.14)

// Null - Explicitly send null
pukucode.Null[string]()

// Raw - Send a non-conforming value
pukucode.Raw[int](3.14) // Send float as int field
```

### Why Use Field Helpers?

Field helpers solve the problem of distinguishing between:

1. **Omitted fields** - Not included in the request
2. **Zero values** - Empty string, 0, false
3. **Explicit null** - JSON `null`

```go
// This will only include "title" in the request, not "parentID"
params := pukucode.SessionNewParams{
    Title: pukucode.F("My Session"),
    // ParentID is omitted
}

// This will include both, with parentID as null
params := pukucode.SessionNewParams{
    Title:    pukucode.F("My Session"),
    ParentID: pukucode.Null[string](),
}
```

## Error Handling

The SDK returns structured errors for API failures.

### Basic Error Handling

```go
sessions, err := client.Session.List(ctx, pukucode.SessionListParams{})
if err != nil {
    log.Fatal(err)
}
```

### Detailed Error Information

```go
import "errors"

sessions, err := client.Session.List(ctx, pukucode.SessionListParams{})
if err != nil {
    var apierr *pukucode.Error
    if errors.As(err, &apierr) {
        fmt.Printf("Status Code: %d\n", apierr.StatusCode)
        fmt.Printf("Request:\n%s\n", string(apierr.DumpRequest(true)))
        fmt.Printf("Response:\n%s\n", string(apierr.DumpResponse(true)))
    } else {
        // Network error, context cancellation, etc.
        log.Fatal(err)
    }
}
```

### Context Errors

```go
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()

sessions, err := client.Session.List(ctx, pukucode.SessionListParams{})
if err != nil {
    if errors.Is(err, context.DeadlineExceeded) {
        fmt.Println("Request timed out")
    } else if errors.Is(err, context.Canceled) {
        fmt.Println("Request was cancelled")
    }
}
```

## Request Options

Customize individual requests with options.

### Per-Request Options

```go
// Add custom headers
session, err := client.Session.Get(ctx, "session-id", pukucode.SessionGetParams{},
    option.WithHeader("X-Request-ID", "abc123"),
)

// Set request timeout
session, err := client.Session.Get(ctx, "session-id", pukucode.SessionGetParams{},
    option.WithRequestTimeout(10*time.Second),
)

// Combine multiple options
session, err := client.Session.Get(ctx, "session-id", pukucode.SessionGetParams{},
    option.WithHeader("X-Request-ID", "abc123"),
    option.WithRequestTimeout(10*time.Second),
    option.WithMaxRetries(5),
)
```

### Available Options

| Option | Description |
|--------|-------------|
| `WithBaseURL(url)` | Override the base URL |
| `WithHTTPClient(client)` | Use a custom HTTP client |
| `WithMaxRetries(n)` | Set maximum retry attempts |
| `WithRequestTimeout(duration)` | Set per-request timeout |
| `WithHeader(key, value)` | Set a header |
| `WithHeaderAdd(key, value)` | Add a header value |
| `WithHeaderDel(key)` | Remove a header |
| `WithQuery(key, value)` | Set a query parameter |
| `WithQueryAdd(key, value)` | Add a query parameter |
| `WithQueryDel(key)` | Remove a query parameter |
| `WithMiddleware(fn)` | Add request middleware |
| `WithResponseInto(ptr)` | Copy response to pointer |

### Middleware

```go
loggingMiddleware := func(req *http.Request, next option.MiddlewareNext) (*http.Response, error) {
    start := time.Now()
    resp, err := next(req)
    duration := time.Since(start)

    fmt.Printf("%s %s - %v\n", req.Method, req.URL.Path, duration)

    return resp, err
}

client := pukucode.NewClient(
    option.WithMiddleware(loggingMiddleware),
)
```

## Examples

### Complete Chat Session

```go
package main

import (
    "context"
    "fmt"
    "log"

    pukucode "github.com/pukucode/pukucode-sdk-go"
    "github.com/pukucode/pukucode-sdk-go/option"
)

func main() {
    client := pukucode.NewClient(
        option.WithBaseURL("http://localhost:3000"),
    )

    ctx := context.Background()

    // Create a new session
    session, err := client.Session.New(ctx, pukucode.SessionNewParams{
        Title: pukucode.F("Go Tutorial"),
    })
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Created session: %s\n", session.ID)

    // Send a message
    _, err = client.Session.Prompt(ctx, session.ID, pukucode.SessionPromptParams{
        Parts: []pukucode.MessagePart{
            {Type: "text", Text: "Explain goroutines in Go"},
        },
    })
    if err != nil {
        log.Fatal(err)
    }

    // Get all messages
    messages, err := client.Session.Messages(ctx, session.ID, pukucode.SessionMessagesParams{})
    if err != nil {
        log.Fatal(err)
    }

    // Print conversation
    for _, msg := range messages {
        fmt.Printf("\n[%s]\n", msg.Role)
        for _, part := range msg.Parts {
            if part.Type == "text" {
                fmt.Println(part.Text)
            }
        }
    }
}
```

### Real-time Event Handling

```go
package main

import (
    "context"
    "fmt"
    "log"

    pukucode "github.com/pukucode/pukucode-sdk-go"
    "github.com/pukucode/pukucode-sdk-go/option"
)

func main() {
    client := pukucode.NewClient(
        option.WithBaseURL("http://localhost:3000"),
    )

    ctx := context.Background()

    // Subscribe to events
    stream, err := client.Event.Subscribe(ctx)
    if err != nil {
        log.Fatal(err)
    }
    defer stream.Close()

    fmt.Println("Listening for events...")

    // Process events
    for stream.Next() {
        event := stream.Current()

        switch event.Type {
        case "message.created":
            fmt.Printf("New message in session %s\n", event.SessionID)
        case "message.updated":
            fmt.Printf("Message %s updated\n", event.MessageID)
        case "session.created":
            fmt.Printf("New session created: %s\n", event.SessionID)
        default:
            fmt.Printf("Event: %s\n", event.Type)
        }
    }

    if err := stream.Err(); err != nil {
        log.Fatal(err)
    }
}
```

### Provider Management

```go
package main

import (
    "context"
    "fmt"
    "log"

    pukucode "github.com/pukucode/pukucode-sdk-go"
    "github.com/pukucode/pukucode-sdk-go/option"
)

func main() {
    client := pukucode.NewClient(
        option.WithBaseURL("http://localhost:3000"),
    )

    ctx := context.Background()

    // Set up authentication for Anthropic
    err := client.Auth.Set(ctx, "anthropic", pukucode.NewAPIKeyParams("sk-ant-xxx"))
    if err != nil {
        log.Fatal(err)
    }
    fmt.Println("Anthropic authentication configured")

    // List available providers
    providers, err := client.Config.Providers(ctx, pukucode.ConfigProvidersParams{})
    if err != nil {
        log.Fatal(err)
    }

    fmt.Println("\nAvailable providers:")
    for _, provider := range providers {
        fmt.Printf("\n%s (%s)\n", provider.Name, provider.ID)
        fmt.Println("  Models:")
        for _, model := range provider.Models {
            fmt.Printf("    - %s (%s)\n", model.Name, model.ID)
        }
    }
}
```

## Requirements

- Go 1.22 or later
- A running PukuCode server

## Dependencies

- `github.com/tidwall/gjson` - JSON parsing
- `github.com/tidwall/sjson` - JSON manipulation

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues and feature requests, please use the [GitHub issue tracker](https://github.com/pukucode/pukucode-sdk-go/issues).
