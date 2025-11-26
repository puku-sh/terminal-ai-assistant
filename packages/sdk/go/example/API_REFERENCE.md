# PukuCode Go SDK - API Reference

Complete reference of all available functions in the PukuCode Go SDK.

## Table of Contents

- [Client](#client)
- [SessionService](#sessionservice)
- [ConfigService](#configservice)
- [FileService](#fileservice)
- [AppService](#appservice)
- [ProjectService](#projectservice)
- [TuiService](#tuiservice)
- [AuthService](#authservice)
- [EventService](#eventservice)
- [CommandService](#commandservice)
- [ToolService](#toolservice)
- [PathService](#pathservice)
- [Helper Functions](#helper-functions)
- [Types](#types)

---

## Client

The main client that provides access to all services.

### Constructor

```go
func NewClient(opts ...option.RequestOption) *Client
```

Creates a new PukuCode client. Reads `PUKUCODE_BASE_URL` from environment by default.

**Example:**
```go
client := pukucode.NewClient(option.WithBaseURL("http://localhost:3000"))
```

### Services

| Service | Description |
|---------|-------------|
| `client.Session` | Session management (chat conversations) |
| `client.Config` | Configuration and providers |
| `client.File` | File system operations |
| `client.App` | Application-level operations |
| `client.Project` | Project management |
| `client.Tui` | TUI control (dialogs, prompts) |
| `client.Auth` | Authentication management |
| `client.Event` | Server-Sent Events streaming |
| `client.Command` | Slash commands |
| `client.Tool` | AI tools (experimental) |
| `client.Path` | Path information |

### Low-level Methods

```go
func (r *Client) Execute(ctx, method, path, params, res, opts) error
func (r *Client) Get(ctx, path, params, res, opts) error
func (r *Client) Post(ctx, path, params, res, opts) error
func (r *Client) Put(ctx, path, params, res, opts) error
func (r *Client) Patch(ctx, path, params, res, opts) error
func (r *Client) Delete(ctx, path, params, res, opts) error
```

---

## SessionService

Manages chat sessions and messages.

### Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `New(ctx, params)` | Create a new session | `*Session` |
| `List(ctx, params)` | List all sessions | `[]Session` |
| `Get(ctx, id, params)` | Get session by ID | `*Session` |
| `Update(ctx, id, params)` | Update session (e.g., title) | `*Session` |
| `Delete(ctx, id, params)` | Delete a session | `error` |
| `Children(ctx, id, params)` | Get child sessions | `[]Session` |
| `Init(ctx, id, params)` | Initialize a session | `error` |
| `Abort(ctx, id, params)` | Abort a running session | `error` |
| `Messages(ctx, id, params)` | Get all messages in session | `[]Message` |
| `Prompt(ctx, id, params)` | Send a message to session | `*Message` |
| `Message(ctx, sessionID, messageID, params)` | Get specific message | `*Message` |
| `Command(ctx, id, params)` | Execute a command in session | `*Message` |
| `Shell(ctx, id, params)` | Execute shell command | `error` |
| `Revert(ctx, id, params)` | Revert to a message | `error` |
| `Unrevert(ctx, id, params)` | Undo a revert | `error` |

### Parameter Types

```go
// SessionNewParams - Create session
type SessionNewParams struct {
    ParentID param.Field[string] `json:"parentID"`
    Title    param.Field[string] `json:"title"`
    Model    param.Field[string] `json:"model"`
    Agent    param.Field[string] `json:"agent"`
}

// SessionUpdateParams - Update session
type SessionUpdateParams struct {
    Title param.Field[string] `json:"title"`
}

// SessionPromptParams - Send message
type SessionPromptParams struct {
    Parts []MessagePart `json:"parts,required"`
}

// SessionCommandParams - Execute command
type SessionCommandParams struct {
    Command   param.Field[string] `json:"command,required"`
    Arguments param.Field[string] `json:"arguments,required"`
    MessageID param.Field[string] `json:"messageID"`
    Agent     param.Field[string] `json:"agent"`
    Model     param.Field[string] `json:"model"`
}

// SessionShellParams - Execute shell
type SessionShellParams struct {
    Command param.Field[string] `json:"command,required"`
    Agent   param.Field[string] `json:"agent,required"`
}

// SessionRevertParams - Revert to message
type SessionRevertParams struct {
    MessageID param.Field[string] `json:"messageID,required"`
    PartID    param.Field[string] `json:"partID"`
}

// SessionInitParams - Initialize session
type SessionInitParams struct {
    MessageID  param.Field[string] `json:"messageID,required"`
    ProviderID param.Field[string] `json:"providerID"`
    ModelID    param.Field[string] `json:"modelID"`
}
```

### Usage Example

```go
// Create session
session, _ := client.Session.New(ctx, pukucode.SessionNewParams{
    Title: pukucode.F("My Chat"),
    Model: pukucode.F("anthropic/claude-3-5-sonnet"),
})

// Send message
msg, _ := client.Session.Prompt(ctx, session.ID, pukucode.SessionPromptParams{
    Parts: []pukucode.MessagePart{
        {Type: "text", Text: "Hello, AI!"},
    },
})

// Get messages
messages, _ := client.Session.Messages(ctx, session.ID, pukucode.SessionMessagesParams{})
```

---

## ConfigService

Get configuration and provider information.

### Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `Get(ctx, params)` | Get current configuration | `*Config` |
| `Providers(ctx, params)` | List all AI providers | `*ProvidersResponse` |

### Parameter Types

```go
type ConfigGetParams struct {
    Directory param.Field[string] `query:"directory"`
}

type ConfigProvidersParams struct {
    Directory param.Field[string] `query:"directory"`
}
```

### Usage Example

```go
// Get config
config, _ := client.Config.Get(ctx, pukucode.ConfigGetParams{})
fmt.Println("Username:", config.Username)

// Get providers
providers, _ := client.Config.Providers(ctx, pukucode.ConfigProvidersParams{})
for _, p := range providers.Providers {
    fmt.Printf("Provider: %s (%d models)\n", p.Name, len(p.Models))
}
```

---

## FileService

File system operations.

### Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `List(ctx, params)` | List files in directory | `[]FileInfo` |
| `Read(ctx, params)` | Read file content | `*string` |
| `Status(ctx, params)` | Get git file status | `*FileStatus` |

### Parameter Types

```go
type FileListParams struct {
    Path      param.Field[string] `query:"path,required"`
    Directory param.Field[string] `query:"directory"`
}

type FileReadParams struct {
    Path      param.Field[string] `query:"path,required"`
    Directory param.Field[string] `query:"directory"`
}

type FileStatusParams struct {
    Directory param.Field[string] `query:"directory"`
}
```

### Usage Example

```go
// List files
files, _ := client.File.List(ctx, pukucode.FileListParams{
    Path: pukucode.F("."),
})
for _, f := range files {
    if f.IsDir {
        fmt.Printf("[DIR] %s\n", f.Name)
    } else {
        fmt.Printf("[FILE] %s (%d bytes)\n", f.Name, f.Size)
    }
}

// Read file
content, _ := client.File.Read(ctx, pukucode.FileReadParams{
    Path: pukucode.F("README.md"),
})

// Get git status
status, _ := client.File.Status(ctx, pukucode.FileStatusParams{})
fmt.Printf("Modified: %v\n", status.Modified)
```

---

## AppService

Application-level operations.

### Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `Log(ctx, params)` | Send a log message | `error` |
| `Agents(ctx, params)` | List all available agents | `[]Agent` |

### Parameter Types

```go
type AppLogParams struct {
    Service param.Field[string]                 `json:"service,required"`
    Level   param.Field[string]                 `json:"level,required"`
    Message param.Field[string]                 `json:"message,required"`
    Extra   param.Field[map[string]interface{}] `json:"extra"`
}

type AppAgentsParams struct {
    Directory param.Field[string] `query:"directory"`
}
```

### Usage Example

```go
// Send log
client.App.Log(ctx, pukucode.AppLogParams{
    Service: pukucode.F("my-app"),
    Level:   pukucode.F("info"),
    Message: pukucode.F("Application started"),
})

// List agents
agents, _ := client.App.Agents(ctx, pukucode.AppAgentsParams{})
for _, a := range agents {
    fmt.Printf("Agent: %s - %s\n", a.Name, a.Description)
}
```

---

## ProjectService

Project management operations.

### Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `List(ctx, params)` | List all projects | `[]Project` |
| `Current(ctx, params)` | Get current project | `*Project` |

### Parameter Types

```go
type ProjectListParams struct {
    Directory param.Field[string] `query:"directory"`
}

type ProjectCurrentParams struct {
    Directory param.Field[string] `query:"directory"`
}
```

### Usage Example

```go
// Get current project
project, _ := client.Project.Current(ctx, pukucode.ProjectCurrentParams{})
fmt.Printf("Project: %s at %s\n", project.ID, project.Worktree)

// List all projects
projects, _ := client.Project.List(ctx, pukucode.ProjectListParams{})
```

---

## TuiService

Control the PukuCode TUI (Terminal User Interface).

### Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `AppendPrompt(ctx, params)` | Append text to prompt | `error` |
| `ClearPrompt(ctx)` | Clear the prompt | `error` |
| `SubmitPrompt(ctx)` | Submit current prompt | `error` |
| `OpenHelp(ctx)` | Open help dialog | `error` |
| `OpenSessions(ctx)` | Open sessions dialog | `error` |
| `OpenThemes(ctx)` | Open themes dialog | `error` |
| `OpenModels(ctx)` | Open models dialog | `error` |
| `ExecuteCommand(ctx, params)` | Execute a TUI command | `error` |
| `ShowToast(ctx, params)` | Show toast notification | `error` |

### Parameter Types

```go
type TuiAppendPromptParams struct {
    Text param.Field[string] `json:"text,required"`
}

type TuiExecuteCommandParams struct {
    Command param.Field[string] `json:"command,required"`
}

type TuiShowToastParams struct {
    Message param.Field[string] `json:"message,required"`
    Variant param.Field[string] `json:"variant,required"` // "success", "error", "info", "warning"
    Title   param.Field[string] `json:"title"`
}
```

### Usage Example

```go
// Show toast
client.Tui.ShowToast(ctx, pukucode.TuiShowToastParams{
    Title:   pukucode.F("Hello"),
    Message: pukucode.F("SDK connected!"),
    Variant: pukucode.F("success"),
})

// Append to prompt
client.Tui.AppendPrompt(ctx, pukucode.TuiAppendPromptParams{
    Text: pukucode.F("Explain this code: "),
})

// Open dialogs
client.Tui.OpenHelp(ctx)
client.Tui.OpenSessions(ctx)
client.Tui.OpenModels(ctx)
```

---

## AuthService

Authentication management.

### Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `Set(ctx, providerID, params)` | Set auth credentials | `error` |

### Parameter Types

```go
type AuthSetParams struct {
    Type    param.Field[string] `json:"type,required"` // "oauth", "api", "wellknown"

    // For OAuth
    Refresh param.Field[string] `json:"refresh"`
    Access  param.Field[string] `json:"access"`
    Expires param.Field[int64]  `json:"expires"`

    // For API key
    Key param.Field[string] `json:"key"`

    // For WellKnown
    Token param.Field[string] `json:"token"`
}
```

### Helper Constructors

```go
func NewOAuthParams(refresh, access string, expires int64) AuthSetParams
func NewAPIKeyParams(key string) AuthSetParams
func NewWellKnownParams(key, token string) AuthSetParams
```

### Usage Example

```go
// Set API key
client.Auth.Set(ctx, "anthropic", pukucode.NewAPIKeyParams("sk-ant-xxx"))

// Set OAuth
client.Auth.Set(ctx, "openai", pukucode.NewOAuthParams(
    "refresh_token",
    "access_token",
    1699999999,
))
```

---

## EventService

Server-Sent Events for real-time updates.

### Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `Subscribe(ctx)` | Subscribe to events | `*ssestream.Stream[Event]` |

### Usage Example

```go
stream, _ := client.Event.Subscribe(ctx)

for stream.Next() {
    event := stream.Current()
    fmt.Printf("Event: %s\n", event.Type)
    if event.SessionID != "" {
        fmt.Printf("  Session: %s\n", event.SessionID)
    }
    if event.MessageID != "" {
        fmt.Printf("  Message: %s\n", event.MessageID)
    }
}

if err := stream.Err(); err != nil {
    log.Printf("Stream error: %v", err)
}
```

---

## CommandService

Slash command operations.

### Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `List(ctx, params)` | List all commands | `[]Command` |

### Usage Example

```go
commands, _ := client.Command.List(ctx, pukucode.CommandListParams{})
for _, cmd := range commands {
    fmt.Printf("/%s - %s\n", cmd.Name, cmd.Description)
}
```

---

## ToolService

AI tool operations (experimental).

### Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `IDs(ctx, params)` | Get all tool IDs | `*string` |
| `List(ctx, params)` | List tools for provider/model | `*string` |

### Parameter Types

```go
type ToolIDsParams struct {
    Directory param.Field[string] `query:"directory"`
}

type ToolListParams struct {
    Provider  param.Field[string] `query:"provider,required"`
    Model     param.Field[string] `query:"model,required"`
    Directory param.Field[string] `query:"directory"`
}
```

---

## PathService

Get path information.

### Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `Get(ctx, params)` | Get current path info | `*string` |

---

## Helper Functions

### F() - Field Wrapper

```go
func F[T any](value T) param.Field[T]
```

Wraps a value in `param.Field[T]` for use in request parameters.

**Example:**
```go
params := pukucode.SessionNewParams{
    Title: pukucode.F("My Session"),
    Model: pukucode.F("anthropic/claude-3-5-sonnet"),
}
```

---

## Types

### Session

```go
type Session struct {
    ID        string `json:"id,required"`
    Title     string `json:"title"`
    ParentID  string `json:"parentID"`
    CreatedAt int64  `json:"createdAt,required"`
    UpdatedAt int64  `json:"updatedAt,required"`
}
```

### Message

```go
type Message struct {
    ID        string        `json:"id,required"`
    SessionID string        `json:"sessionID,required"`
    Role      string        `json:"role,required"` // "user", "assistant"
    Parts     []MessagePart `json:"parts"`
    CreatedAt int64         `json:"createdAt,required"`
}
```

### MessagePart

```go
type MessagePart struct {
    Type     string `json:"type,required"` // "text", "image", "file"
    Text     string `json:"text"`
    Mime     string `json:"mime"`
    URL      string `json:"url"`
    Filename string `json:"filename"`
}
```

### Provider

```go
type Provider struct {
    ID     string           `json:"id,required"`
    Name   string           `json:"name,required"`
    Models map[string]Model `json:"models"`
    Env    []string         `json:"env"`
    API    string           `json:"api"`
    NPM    string           `json:"npm"`
    Doc    string           `json:"doc"`
}
```

### Model

```go
type Model struct {
    ID          string `json:"id,required"`
    Name        string `json:"name,required"`
    Attachment  bool   `json:"attachment"`
    Reasoning   bool   `json:"reasoning"`
    Temperature bool   `json:"temperature"`
    ToolCall    bool   `json:"tool_call"`
    Knowledge   string `json:"knowledge"`
    ReleaseDate string `json:"release_date"`
}
```

### Project

```go
type Project struct {
    ID       string      `json:"id,required"`
    Worktree string      `json:"worktree,required"`
    VCS      string      `json:"vcs"`
    Time     ProjectTime `json:"time,required"`
}

type ProjectTime struct {
    Created     int64 `json:"created,required"`
    Initialized int64 `json:"initialized"`
}
```

### FileInfo

```go
type FileInfo struct {
    Name  string `json:"name,required"`
    Path  string `json:"path,required"`
    IsDir bool   `json:"isDir,required"`
    Size  int64  `json:"size"`
}
```

### FileStatus

```go
type FileStatus struct {
    Modified []string `json:"modified"`
    Added    []string `json:"added"`
    Deleted  []string `json:"deleted"`
}
```

### Agent

```go
type Agent struct {
    ID          string `json:"id,required"`
    Name        string `json:"name,required"`
    Description string `json:"description"`
}
```

### Command

```go
type Command struct {
    Name        string `json:"name,required"`
    Description string `json:"description"`
}
```

### Event

```go
type Event struct {
    Type      string      `json:"type,required"`
    SessionID string      `json:"sessionID"`
    MessageID string      `json:"messageID"`
    Data      interface{} `json:"data"`
}
```

### Config

```go
type Config struct {
    Agent    map[string]interface{} `json:"agent"`
    Mode     map[string]interface{} `json:"mode"`
    Command  map[string]interface{} `json:"command"`
    Plugin   []interface{}          `json:"plugin"`
    Username string                 `json:"username"`
}
```

---

## Request Options

Available options when making requests:

```go
option.WithBaseURL(url string)           // Set base URL
option.WithHeader(key, value string)     // Add header
option.WithQuery(key, value string)      // Add query param
option.WithRequestTimeout(d time.Duration) // Set timeout
option.WithEnvironmentProduction()       // Use production env
```

---

## Complete Example

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
    // Create client
    client := pukucode.NewClient(option.WithBaseURL("http://localhost:3000"))
    ctx := context.Background()

    // Get providers
    providers, err := client.Config.Providers(ctx, pukucode.ConfigProvidersParams{})
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Found %d providers\n", len(providers.Providers))

    // Create session
    session, err := client.Session.New(ctx, pukucode.SessionNewParams{
        Title: pukucode.F("API Test"),
    })
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Created session: %s\n", session.ID)

    // Send message
    msg, err := client.Session.Prompt(ctx, session.ID, pukucode.SessionPromptParams{
        Parts: []pukucode.MessagePart{
            {Type: "text", Text: "What is 2+2?"},
        },
    })
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Message sent: %s\n", msg.ID)

    // Get messages
    messages, _ := client.Session.Messages(ctx, session.ID, pukucode.SessionMessagesParams{})
    for _, m := range messages {
        fmt.Printf("[%s] %d parts\n", m.Role, len(m.Parts))
    }
}
```
