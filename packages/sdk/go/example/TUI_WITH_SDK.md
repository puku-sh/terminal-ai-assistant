# Building a TUI with PukuCode Go SDK

## Current State: PUKU CLI vs PukuCode Architecture

### PUKU CLI (Current Go TUI) - Does NOT use SDK

The existing PUKU CLI (`terminal-ai-assistant/main.go`) is a standalone Bubble Tea TUI that:

```
┌─────────────────────────────────────────┐
│ PUKU CLI (Go)                           │
│ - Bubble Tea TUI                        │
│ - Direct HTTP calls to OpenRouter API   │
│ - No SDK usage                          │
│ - No backend server                     │
└─────────────────────────────────────────┘
         ↓ (direct HTTP)
┌─────────────────────────────────────────┐
│ OpenRouter API                          │
│ https://openrouter.ai/api/v1/           │
└─────────────────────────────────────────┘
```

**Key Files:**
- `main.go` - Entry point
- `internal/api/providers.go` - Direct OpenRouter API calls (raw HTTP)
- `internal/ui/views/` - Bubble Tea UI components
- **No SDK dependency** - Just Bubble Tea + direct HTTP

---

### OpenCode TUI Architecture (Uses SDK) ✅

OpenCode's TUI successfully uses its Go SDK:

```
┌─────────────────────────────────────────┐
│ tui.ts (TypeScript)                     │
│ - Starts OpenCode Server (HTTP API)    │
│ - Spawns Go TUI binary                  │
│ - Passes OPENCODE_SERVER env var       │
└─────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────┐
│ TUI (Go) - Uses OpenCode Go SDK        │
│ - httpClient = opencode.NewClient()    │
│ - httpClient.Project.Current()         │
│ - httpClient.Session.Create()          │
│ - httpClient.Event.ListStreaming()     │
└─────────────────────────────────────────┘
         ↓ (HTTP via SDK)
┌─────────────────────────────────────────┐
│ OpenCode Server (TypeScript/Bun)       │
│ - HTTP API (Hono framework)            │
│ - Agent orchestration                  │
│ - Tool execution                       │
└─────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────┐
│ AI Providers (Anthropic, OpenAI, etc.) │
└─────────────────────────────────────────┘
```

---

## YES - You CAN Build TUI with PukuCode SDK

### Architecture for PukuCode TUI Using SDK

To replicate OpenCode's approach, you would need:

```
┌─────────────────────────────────────────┐
│ pukucode CLI (TypeScript/Bun)           │
│ packages/pukucode/src/index.ts          │
│                                         │
│ 1. Start PukuCode Server                │
│    Server.listen({ port: 3000 })        │
│                                         │
│ 2. Launch Go TUI                        │
│    Bun.spawn([tui-binary], {            │
│      env: {                             │
│        PUKUCODE_BASE_URL:               │
│          "http://localhost:3000"        │
│      }                                   │
│    })                                    │
└─────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────┐
│ NEW: PukuCode TUI (Go)                  │
│ Uses PukuCode Go SDK                    │
│                                         │
│ import pukucode "github.com/            │
│   pukucode/pukucode-sdk-go"             │
│                                         │
│ client := pukucode.NewClient()          │
│                                         │
│ // Use SDK methods:                     │
│ client.Session.New(...)                 │
│ client.Session.Prompt(...)              │
│ client.Event.Subscribe(...)             │
│ client.Config.Providers(...)            │
└─────────────────────────────────────────┘
         ↓ (HTTP via SDK)
┌─────────────────────────────────────────┐
│ PukuCode Server (TypeScript/Bun)       │
│ packages/pukucode/src/server/           │
│ - REST API endpoints                   │
│ - Session management                   │
│ - Message handling                     │
│ - SSE streaming                        │
└─────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────┐
│ AI Providers (via SDK integrations)    │
│ - Anthropic, OpenAI, Groq, etc.        │
└─────────────────────────────────────────┘
```

---

## Implementation Steps

### Step 1: Ensure PukuCode Server is Running

The PukuCode backend must be running to provide the HTTP API:

```bash
cd terminal-ai-assistant/packages/pukucode
bun run dev  # Starts server on http://localhost:3000
```

Or via the CLI:

```bash
pukucode server --port 3000
```

### Step 2: Create Go TUI Project

Create a new Go TUI that uses the PukuCode SDK:

```go
// tui/main.go
package main

import (
    "context"
    "fmt"
    "log"
    "os"

    pukucode "github.com/pukucode/pukucode-sdk-go"
    "github.com/pukucode/pukucode-sdk-go/option"
    tea "github.com/charmbracelet/bubbletea"
)

type model struct {
    client   *pukucode.Client
    session  *pukucode.Session
    messages []pukucode.Message
    input    string
}

func (m model) Init() tea.Cmd {
    return createSession(m.client)
}

func createSession(client *pukucode.Client) tea.Cmd {
    return func() tea.Msg {
        ctx := context.Background()
        session, err := client.Session.New(ctx, pukucode.SessionNewParams{
            Title: pukucode.F("TUI Chat"),
        })
        if err != nil {
            return errorMsg{err}
        }
        return sessionCreatedMsg{session}
    }
}

type sessionCreatedMsg struct{ session *pukucode.Session }
type errorMsg struct{ err error }

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
    switch msg := msg.(type) {
    case sessionCreatedMsg:
        m.session = msg.session
        return m, nil

    case tea.KeyMsg:
        if msg.String() == "enter" && m.input != "" {
            return m, sendPrompt(m.client, m.session.ID, m.input)
        }
    }
    return m, nil
}

func sendPrompt(client *pukucode.Client, sessionID, text string) tea.Cmd {
    return func() tea.Msg {
        ctx := context.Background()
        msg, err := client.Session.Prompt(ctx, sessionID, pukucode.SessionPromptParams{
            Parts: []pukucode.MessagePart{
                {Type: "text", Text: text},
            },
        })
        if err != nil {
            return errorMsg{err}
        }
        return messageReceivedMsg{msg}
    }
}

type messageReceivedMsg struct{ msg *pukucode.Message }

func (m model) View() string {
    if m.session == nil {
        return "Creating session..."
    }
    return fmt.Sprintf("Session: %s\nInput: %s", m.session.ID, m.input)
}

func main() {
    baseURL := os.Getenv("PUKUCODE_BASE_URL")
    if baseURL == "" {
        baseURL = "http://localhost:3000"
    }

    client := pukucode.NewClient(option.WithBaseURL(baseURL))

    p := tea.NewProgram(model{
        client: client,
    })

    if _, err := p.Run(); err != nil {
        log.Fatal(err)
    }
}
```

### Step 3: Add SSE Event Streaming

For real-time AI responses:

```go
func subscribeToEvents(client *pukucode.Client) tea.Cmd {
    return func() tea.Msg {
        ctx := context.Background()
        stream, err := client.Event.Subscribe(ctx)
        if err != nil {
            return errorMsg{err}
        }

        // Process events in background
        go func() {
            for stream.Next() {
                event := stream.Current()
                // Send event to Bubble Tea via channel
                types.GetGlobalProgram().Send(eventMsg{event})
            }
        }()

        return nil
    }
}

type eventMsg struct{ event *pukucode.Event }
```

### Step 4: Handle AI Streaming Responses

```go
func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
    switch msg := msg.(type) {
    case eventMsg:
        switch msg.event.Type {
        case "message.updated":
            // Refresh messages
            return m, fetchMessages(m.client, m.session.ID)
        }
    }
    return m, nil
}

func fetchMessages(client *pukucode.Client, sessionID string) tea.Cmd {
    return func() tea.Msg {
        ctx := context.Background()
        messages, err := client.Session.Messages(ctx, sessionID, pukucode.SessionMessagesParams{})
        if err != nil {
            return errorMsg{err}
        }
        return messagesLoadedMsg{messages}
    }
}

type messagesLoadedMsg struct{ messages []pukucode.Message }
```

---

## Comparison: Current vs SDK-Based Architecture

| Feature | Current PUKU CLI | SDK-Based TUI |
|---------|------------------|---------------|
| **Backend** | None (direct API calls) | PukuCode Server required |
| **API Calls** | Raw HTTP to OpenRouter | Type-safe SDK methods |
| **AI Providers** | OpenRouter only | All providers (Anthropic, OpenAI, Groq, etc.) |
| **Session Management** | Manual chat history | Server-side sessions |
| **Streaming** | Manual SSE parsing | SDK handles streaming |
| **Type Safety** | Manual JSON marshaling | Auto-generated types |
| **Error Handling** | Manual HTTP errors | Structured SDK errors |
| **Authentication** | Manual API key handling | SDK auth service |
| **File Operations** | Not available | SDK file service |
| **Project Management** | Not available | SDK project service |

---

## Advantages of Using SDK

### 1. **Type Safety**
```go
// Current (raw HTTP)
jsonBody := map[string]interface{}{
    "model": "gpt-3.5-turbo",
    "messages": []map[string]string{...},
}

// With SDK
session, _ := client.Session.New(ctx, pukucode.SessionNewParams{
    Title: pukucode.F("Chat"),  // Type-checked at compile time
    Model: pukucode.F("anthropic/claude-3-5-sonnet"),
})
```

### 2. **Error Handling**
```go
// Current
if resp.StatusCode != http.StatusOK {
    return types.ErrorMsg(fmt.Sprintf("API returned status %d", resp.StatusCode))
}

// With SDK
session, err := client.Session.New(ctx, params)
if err != nil {
    // Structured error with details
    return handleError(err)
}
```

### 3. **Automatic Retries & Timeouts**
The SDK handles retries, timeouts, and connection management automatically.

### 4. **SSE Streaming Made Easy**
```go
// Current - manual SSE parsing
scanner := bufio.NewScanner(resp.Body)
for scanner.Scan() {
    line := scanner.Text()
    if strings.HasPrefix(line, "data: ") {
        // Parse JSON manually
    }
}

// With SDK
stream, _ := client.Event.Subscribe(ctx)
for stream.Next() {
    event := stream.Current()  // Already parsed!
}
```

### 5. **Multi-Provider Support**
Instead of hardcoding OpenRouter, the SDK gives access to all configured providers via the Config service.

---

## Example: Full TUI with SDK

See the complete example in `terminal-ai-assistant/packages/sdk/go/example/tui_example/` (to be created):

```
tui_example/
├── main.go              # Entry point + Bubble Tea setup
├── model.go             # Application state
├── update.go            # Message handling
├── view.go              # UI rendering
├── commands.go          # SDK interaction commands
└── README.md            # Usage instructions
```

**Usage:**
```bash
# Terminal 1: Start PukuCode server
cd packages/pukucode
bun run dev

# Terminal 2: Run TUI
cd packages/sdk/go/example/tui_example
PUKUCODE_BASE_URL=http://localhost:3000 go run .
```

---

## Recommendation

**YES, you should use the SDK for a production TUI because:**

1. **Consistency** - Same architecture as OpenCode (proven pattern)
2. **Type Safety** - Compile-time checking prevents runtime errors
3. **Maintainability** - SDK updates automatically with API changes
4. **Features** - Access to all PukuCode features (not just chat)
5. **Error Handling** - Better error messages and retry logic
6. **Testing** - Easier to mock SDK than raw HTTP calls

The current PUKU CLI is a lightweight prototype. For a fully-featured TUI like OpenCode, using the SDK is the right approach.

---

## Migration Path

If you want to migrate the existing PUKU CLI to use the SDK:

1. **Keep the UI** - Bubble Tea components can stay the same
2. **Replace API layer** - Replace `internal/api/providers.go` with SDK calls
3. **Add server** - Start PukuCode server before TUI
4. **Use sessions** - Store chat history server-side via SDK
5. **Add SSE** - Use SDK event streaming for real-time updates

The UI layer (Bubble Tea) is independent of how you fetch data - you just replace the HTTP calls with SDK calls in your `Update()` function's command layer.
