# Auth and Tools Architecture: OpenCode vs PukuCode

This document explains how authentication and tools work in both OpenCode and PukuCode, and why the SDKs differ in their approach.

---

## Table of Contents

- [Authentication Architecture](#authentication-architecture)
  - [OpenCode's Approach](#opencodes-approach)
  - [PukuCode's Approach](#pukucodes-approach)
  - [Comparison](#authentication-comparison)
- [Tools Architecture](#tools-architecture)
  - [Key Concept: Tools Execute on Backend](#key-concept-tools-execute-on-backend)
  - [Tool Flow Diagram](#tool-flow-diagram)
  - [OpenCode Tool System](#opencode-tool-system)
  - [PukuCode Tool System](#pukucode-tool-system)
  - [Why OpenCode SDK Has No Tool Service](#why-opencode-sdk-has-no-tool-service)
- [SDK Service Comparison](#sdk-service-comparison)

---

## Authentication Architecture

### OpenCode's Approach

**OpenCode does NOT have an Auth service in its Go SDK.** Authentication is handled entirely by the backend server before the TUI starts.

```
┌─────────────────────────────────────────────────────────────┐
│                  OPENCODE BACKEND SERVER                     │
│                                                              │
│  1. Credentials configured via:                              │
│     - Environment variables (ANTHROPIC_API_KEY, etc.)        │
│     - Config files (opencode.json)                           │
│     - CLI: `opencode auth` command                           │
│                                                              │
│  2. Backend authenticates with providers internally          │
│                                                              │
│  3. Exposes /config/providers endpoint with                  │
│     PRE-AUTHENTICATED provider list                          │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      GO TUI                                  │
│                                                              │
│  client.App.Providers() → Returns authenticated providers    │
│                                                              │
│  TUI just DISPLAYS available models - no auth needed!        │
└─────────────────────────────────────────────────────────────┘
```

**How OpenCode handles auth:**

```bash
# Before running TUI, set up credentials via CLI
opencode auth login --provider anthropic --key sk-ant-xxx

# Or via environment variables
export ANTHROPIC_API_KEY=sk-ant-xxx

# Or via config file (opencode.json)
```

**In the TUI code (`app.go`):**

```go
func (a *App) InitializeProvider() tea.Cmd {
    // TUI just fetches pre-authenticated providers from backend
    providersResponse, err := a.Client.App.Providers(
        context.Background(),
        opencode.AppProvidersParams{},
    )
    // Use providers directly - already authenticated!
    providers := providersResponse.Providers
}
```

---

### PukuCode's Approach

**PukuCode HAS an Auth service in its Go SDK.** This allows programmatic authentication from the TUI or any SDK client.

```
┌─────────────────────────────────────────────────────────────┐
│                     GO TUI / SDK CLIENT                      │
│                                                              │
│  Option 1: Programmatic auth via SDK                        │
│  client.Auth.Set(ctx, "anthropic", pukucode.NewAPIKeyParams │
│      ("sk-ant-xxx"))                                        │
│                                                              │
│  Option 2: CLI auth (like OpenCode)                         │
│  pukucode auth login --provider anthropic --key sk-xxx      │
│                                                              │
│  Option 3: Environment variables                            │
│  export ANTHROPIC_API_KEY=sk-ant-xxx                        │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  PUKUCODE BACKEND SERVER                     │
│                                                              │
│  Receives auth credentials and stores them                  │
│  Makes providers available for AI requests                  │
└─────────────────────────────────────────────────────────────┘
```

**PukuCode Auth Service methods:**

```go
// Set API Key authentication
err := client.Auth.Set(ctx, "anthropic", pukucode.NewAPIKeyParams("sk-ant-xxx"))

// Set OAuth authentication
err := client.Auth.Set(ctx, "google", pukucode.NewOAuthParams(
    "refresh-token",
    "access-token",
    1234567890, // expires timestamp
))

// Set WellKnown authentication
err := client.Auth.Set(ctx, "provider", pukucode.NewWellKnownParams(
    "key",
    "token",
))
```

---

### Authentication Comparison

| Aspect | OpenCode | PukuCode |
|--------|----------|----------|
| **Where auth happens** | Backend server (pre-configured) | Backend server |
| **How to configure auth** | CLI command, env vars, config files | SDK `Auth.Set()`, CLI, env vars |
| **SDK Auth service** | Not available | Available |
| **TUI auth management** | Cannot manage auth | Can manage auth programmatically |
| **Flexibility** | Must configure before TUI starts | Can configure anytime |

**Recommendation for PukuCode TUI:**

Keep both approaches:
1. **CLI/env vars** - For users who prefer pre-configuration
2. **SDK Auth service** - For building auth dialogs in TUI or programmatic setup

---

## Tools Architecture

### Key Concept: Tools Execute on Backend

**CRITICAL:** Tools are NEVER executed in the TUI or SDK. They are always executed on the backend server. The TUI only DISPLAYS tool execution status.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           AI PROVIDER                                    │
│                    (Anthropic, OpenAI, etc.)                            │
│                                                                          │
│   AI Model decides: "I need to run the 'bash' tool with 'ls -la'"       │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          BACKEND SERVER                                  │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    ToolRegistry                                  │    │
│  │                                                                  │    │
│  │  Built-in Tools:               Execution Flow:                   │    │
│  │  - BashTool                    1. AI returns tool_call           │    │
│  │  - EditTool                    2. Backend finds tool in registry │    │
│  │  - ReadTool                    3. Backend executes tool.execute()│    │
│  │  - WriteTool                   4. Backend returns result to AI   │    │
│  │  - GrepTool                    5. AI continues with result       │    │
│  │  - GlobTool                                                      │    │
│  │  - WebFetchTool                                                  │    │
│  │  - TaskTool (subagent)                                           │    │
│  │  - ListTool (ls)                                                 │    │
│  │  + Custom/Plugin tools                                           │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  The TUI NEVER executes tools - it only DISPLAYS tool execution status  │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
                               │ SSE Events: message.part.updated
                               │ (ToolPart with state: pending/running/completed)
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                              GO TUI                                      │
│                                                                          │
│   Receives ToolPart events and DISPLAYS:                                │
│   - Tool name (bash, edit, read, etc.)                                  │
│   - Tool state (pending → running → completed/error)                    │
│   - Tool metadata (command, file path, etc.)                            │
│   - Tool output (result)                                                │
│                                                                          │
│   TUI does NOT execute any tools!                                       │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### Tool Flow Diagram

Complete flow when user asks AI to do something that requires tools:

```
User types: "List files in /tmp"
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│  TUI: client.Session.Prompt(sessionID, "List files in /tmp")        │
└─────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│  BACKEND: Sends prompt + tool definitions to AI                      │
│                                                                      │
│  Tools available: [bash, edit, read, write, grep, glob, ls, ...]    │
└─────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│  AI: "I'll use the 'ls' tool with path='/tmp'"                       │
│                                                                      │
│  Returns: tool_call { name: "ls", args: { path: "/tmp" } }          │
└─────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│  BACKEND: Receives tool_call, creates ToolPart with state=pending    │
│                                                                      │
│  → Publishes SSE: message.part.updated (ToolPart, state=pending)    │
└─────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│  TUI: Receives SSE event, displays "⏳ ls pending..."                │
└─────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│  BACKEND: Executes ListTool.execute({ path: "/tmp" })                │
│                                                                      │
│  → Updates ToolPart state=running                                   │
│  → Publishes SSE: message.part.updated (ToolPart, state=running)    │
└─────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│  TUI: Receives SSE event, displays "🔄 ls running..."                │
└─────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│  BACKEND: Tool finishes, returns result                              │
│                                                                      │
│  → Updates ToolPart state=completed, output="file1.txt\nfile2.txt"  │
│  → Publishes SSE: message.part.updated (ToolPart, state=completed)  │
│  → Sends result back to AI                                          │
└─────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│  TUI: Receives SSE event, displays "✅ ls completed"                 │
│       Shows output: file1.txt, file2.txt                            │
└─────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│  AI: Generates final response using tool result                      │
│                                                                      │
│  "The /tmp directory contains: file1.txt, file2.txt"                │
└─────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│  TUI: Displays AI's response text via SSE message.part.updated       │
└─────────────────────────────────────────────────────────────────────┘
```

---

### OpenCode Tool System

**Backend Tool Registry (`opencode/packages/opencode/src/tool/registry.ts`):**

```typescript
export namespace ToolRegistry {
  async function all(): Promise<Tool.Info[]> {
    return [
      InvalidTool,
      BashTool,
      EditTool,
      WebFetchTool,
      GlobTool,
      GrepTool,
      ListTool,
      PatchTool,
      ReadTool,
      WriteTool,
      TodoWriteTool,
      TodoReadTool,
      TaskTool,
      ...custom,  // Plugin tools
    ]
  }

  export async function tools(providerID, modelID) {
    // Returns all tools with their schemas for AI
  }
}
```

**Tool Execution (`opencode/packages/opencode/src/session/prompt.ts`):**

```typescript
async function createTools(input) {
  const tools: Record<string, AITool> = {}

  for (const item of await ToolRegistry.tools(providerID, modelID)) {
    tools[item.id] = tool({
      description: item.description,
      inputSchema: jsonSchema(schema),

      // THIS EXECUTES ON THE BACKEND!
      async execute(args, options) {
        const result = await item.execute(args, {
          sessionID: input.sessionID,
          abort: options.abortSignal,
          messageID: input.processor.message.id,
          callID: options.toolCallId,
          agent: input.agent.name,
        })
        return result
      },
    })
  }

  return tools
}
```

**TUI displays ToolPart from SSE events:**

```go
// OpenCode SDK type for tool parts in messages
type ToolPart struct {
    ID        string
    CallID    string
    MessageID string
    SessionID string
    State     ToolPartState  // pending, running, completed, error
    Tool      string         // "bash", "edit", "read", etc.
    Metadata  map[string]interface{}
}

type ToolPartState struct {
    Status   string  // "pending", "running", "completed", "error"
    Title    string
    Input    interface{}
    Output   string
    Metadata map[string]interface{}
    Time     struct {
        Start int64
        End   int64
    }
}
```

---

### PukuCode Tool System

**Backend Tool Registry (`terminal-ai-assistant/packages/pukucode/src/tool/registry.ts`):**

```typescript
export namespace ToolRegistry {
  export function all(): Tool.Info[] {
    return [
      BashTool,
      EditTool,
      ReadTool,
      WriteTool,
      GrepTool,
      GlobTool,
      WebFetchTool,
      ListTool,
    ]
  }
}
```

**PukuCode SDK Tool Service (`terminal-ai-assistant/packages/sdk/go/tool.go`):**

```go
// ToolService - For INTROSPECTION, not execution!
type ToolService struct {
    Options []option.RequestOption
}

// IDs - Get list of available tool IDs
func (r *ToolService) IDs(ctx context.Context, query ToolIDsParams, opts ...option.RequestOption) (res *string, err error) {
    // GET /experimental/tool/ids
    // Returns: ["bash", "edit", "read", "write", "grep", "glob", ...]
}

// List - Get tool definitions for a specific model
func (r *ToolService) List(ctx context.Context, query ToolListParams, opts ...option.RequestOption) (res *string, err error) {
    // GET /experimental/tool?provider=anthropic&model=claude-3-5-haiku
    // Returns: Tool schemas/descriptions (for display/debugging)
}
```

**Usage of Tool Service (introspection only):**

```go
// Get list of all available tools
toolIDs, err := client.Tool.IDs(ctx, pukucode.ToolIDsParams{})
// Returns: "bash,edit,read,write,grep,glob,webfetch,ls"

// Get tool definitions for a model (for debugging/display)
tools, err := client.Tool.List(ctx, pukucode.ToolListParams{
    Provider: pukucode.F("anthropic"),
    Model:    pukucode.F("claude-3-5-haiku"),
})
```

---

### Why OpenCode SDK Has No Tool Service

OpenCode decided the TUI doesn't need to know about tools in detail because:

1. **Tools are fully managed by the backend** - The backend decides which tools to provide to the AI
2. **TUI only sees ToolPart in messages** - Just the tool name and state
3. **No need to query tool definitions** - Tools work automatically

**PukuCode added Tool Service as an experimental feature for:**

1. **Debugging** - See which tools are available
2. **Documentation** - Display tool descriptions to users
3. **Future features** - Maybe letting users enable/disable tools from TUI

---

## SDK Service Comparison

| Service | OpenCode SDK | PukuCode SDK | Notes |
|---------|-------------|--------------|-------|
| Event | ✅ | ✅ | SSE streaming |
| Path | ✅ | ✅ | Path utilities |
| App | ✅ | ✅ | App utilities, providers |
| **Agent** | ✅ | ❌ | Agent management |
| **Find** | ✅ | ❌ | File/symbol search |
| File | ✅ | ✅ | File operations |
| Config | ✅ | ✅ | Configuration |
| Command | ✅ | ✅ | Slash commands |
| Project | ✅ | ✅ | Project management |
| Session | ✅ | ✅ | Session management |
| Session.Permissions | ✅ | ❌ | Permission responses |
| Tui | ✅ | ✅ | TUI control |
| **Auth** | ❌ | ✅ | Programmatic auth |
| **Tool** | ❌ | ✅ | Tool introspection |

**Summary:**
- OpenCode has: Agent, Find, Session.Permissions (TUI needs these for full features)
- PukuCode has: Auth, Tool (bonus features for flexibility)

---

## Implications for Building PukuCode TUI

### What Works Today

1. **Tools work automatically** - Backend handles execution, TUI displays status via SSE
2. **Auth can be done via CLI or SDK** - Flexibility for users
3. **Tool introspection available** - Can display available tools if needed

### What's Missing for Full OpenCode Parity

1. **Agent Service** - Cannot switch between agents (build, plan, code-review)
2. **Find Service** - No fuzzy file finder or symbol search
3. **Session.Permissions** - Cannot approve tool execution requests

### Recommended Priority

1. **First:** Add Session.Permissions (critical for tool approval flow)
2. **Second:** Add Agent Service (for agent switching)
3. **Third:** Add Find Service (for file/symbol search)

---

## Conclusion

- **Auth:** PukuCode is MORE flexible (SDK + CLI), OpenCode is CLI-only
- **Tools:** Both work the same way (backend execution, TUI displays status)
- **Tool Service:** PukuCode has it for introspection, OpenCode doesn't need it

For building the TUI, you don't need the Tool service - tools work automatically through SSE events. The Auth service gives you extra flexibility for building auth dialogs in the TUI if desired.
