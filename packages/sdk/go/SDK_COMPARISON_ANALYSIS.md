# PukuCode Go SDK vs OpenCode Go SDK - Detailed Comparison & Analysis

This document provides a comprehensive analysis of the limitations in the PukuCode Go SDK compared to the OpenCode Go SDK, with specific focus on what's needed to build a full-featured TUI similar to OpenCode's TUI.

## Executive Summary

The PukuCode Go SDK is **approximately 70% feature-complete** compared to OpenCode's SDK. The core functionality for building a TUI exists, but several advanced features are missing that could impact the richness of the user experience.

### Verdict: **CAN BUILD TUI** ✅

You can build a functional TUI similar to OpenCode using the existing PukuCode SDK. However, some features will need to be either:
1. Implemented in the PukuCode backend first
2. Simulated/omitted in the TUI
3. Added to the SDK as the backend evolves

---

## Service Comparison

### 1. Client Structure

| Feature | OpenCode | PukuCode | Gap |
|---------|----------|----------|-----|
| Base Client | ✅ | ✅ | None |
| Event Service | ✅ | ✅ | None |
| Path Service | ✅ | ✅ | None |
| App Service | ✅ | ✅ | Partial |
| **Agent Service** | ✅ | ❌ | **MISSING** |
| **Find Service** | ✅ | ❌ | **MISSING** |
| File Service | ✅ | ✅ | None |
| Config Service | ✅ | ✅ | None |
| Command Service | ✅ | ✅ | None |
| Project Service | ✅ | ✅ | None |
| Session Service | ✅ | ✅ | Partial |
| TUI Service | ✅ | ✅ | None |
| Auth Service | ❌ | ✅ | PukuCode has more |
| Tool Service | ❌ | ✅ | PukuCode has more |

---

## Detailed Gap Analysis

### 🔴 CRITICAL GAPS (Required for Full TUI)

#### 1. Agent Service - MISSING

**OpenCode has:**
```go
type AgentService struct {}

func (r *AgentService) List(ctx, query AgentListParams) (*[]Agent, error)

type Agent struct {
    BuiltIn     bool
    Mode        AgentMode        // "subagent", "primary", "all"
    Name        string
    Options     map[string]interface{}
    Permission  AgentPermission  // bash, edit, webfetch permissions
    Tools       map[string]bool
    Description string
    Model       AgentModel       // providerID + modelID
    Prompt      string
    Temperature float64
    TopP        float64
}
```

**PukuCode has:** Nothing

**Impact on TUI:**
- Cannot display available agents in dialogs
- Cannot switch between agents (default, plan, code-review, etc.)
- Cannot show agent-specific permissions
- No subagent support

**Workaround:**
- Add `AgentService` to PukuCode SDK
- Or: Hardcode agent list in TUI (not recommended)

---

#### 2. Find Service - MISSING

**OpenCode has:**
```go
type FindService struct {}

func (r *FindService) Files(ctx, query FindFilesParams) (*[]string, error)
func (r *FindService) Symbols(ctx, query FindSymbolsParams) (*[]Symbol, error)
func (r *FindService) Text(ctx, query FindTextParams) (*[]FindTextResponse, error)

type Symbol struct {
    Kind     float64
    Location SymbolLocation
    Name     string
}
```

**PukuCode has:** Nothing

**Impact on TUI:**
- No fuzzy file finder (Ctrl+P equivalent)
- No symbol search (go-to-definition, find references)
- No text/regex search across project
- Cannot implement file browser search

**Workaround:**
- Use File.List() for basic file listing
- Implement client-side fuzzy matching
- Or: Add Find endpoints to PukuCode backend

---

#### 3. Session Permissions Service - MISSING

**OpenCode has:**
```go
type SessionPermissionService struct {}

func (r *SessionPermissionService) Respond(ctx, sessionID, permissionID string, params) (*bool, error)

type Permission struct {
    ID        string
    MessageID string
    Metadata  map[string]interface{}
    SessionID string
    Time      PermissionTime
    Title     string
    Type      string
    CallID    string
    Pattern   PermissionPatternUnion
}
```

**PukuCode has:** Nothing (no nested Permissions service on Session)

**Impact on TUI:**
- Cannot respond to permission requests (bash commands, file edits)
- AI will hang waiting for permission approval
- Security model is incomplete

**Workaround:**
- Add permission.respond endpoint to PukuCode backend
- Add SessionPermissionService to SDK

---

### 🟡 MODERATE GAPS (Nice to have)

#### 4. Session Service - Partial

**OpenCode has but PukuCode is missing:**

| Method | OpenCode | PukuCode | Notes |
|--------|----------|----------|-------|
| `New` | ✅ | ✅ | - |
| `Update` | ✅ | ✅ | - |
| `List` | ✅ | ✅ | - |
| `Delete` | ✅ | ✅ | - |
| `Get` | ✅ | ✅ | - |
| `Abort` | ✅ | ✅ | - |
| `Children` | ✅ | ✅ | - |
| `Command` | ✅ | ✅ | - |
| `Init` | ✅ | ✅ | - |
| `Message` | ✅ | ✅ | - |
| `Messages` | ✅ | ✅ | - |
| `Prompt` | ✅ | ✅ | - |
| `Revert` | ✅ | ✅ | - |
| `Unrevert` | ✅ | ✅ | - |
| `Shell` | ✅ | ✅ | - |
| **Share** | ✅ | ❌ | Missing |
| **Unshare** | ✅ | ❌ | Missing |
| **Summarize** | ✅ | ❌ | Missing |
| **Permissions.Respond** | ✅ | ❌ | Missing (nested service) |

**Impact:**
- Cannot share sessions publicly
- Cannot create session summaries for context compaction

---

#### 5. Event Types - Partial

**OpenCode Event Types (19 total):**
```go
- installation.updated
- lsp.client.diagnostics
- message.updated
- message.removed
- message.part.updated
- message.part.removed
- session.compacted
- permission.updated
- permission.replied
- file.edited
- file.watcher.updated
- todo.updated
- session.idle
- session.created
- session.updated
- session.deleted
- session.error
- server.connected
- ide.installed
```

**PukuCode Event Types (13 total):**
```go
- session.updated
- session.deleted
- session.idle
- session.error
- message.updated
- message.removed
- message.part.updated
- message.part.removed
- file.edited
- file.watcher.updated
- permission.updated
- permission.replied
- server.connected
```

**Missing Events:**
- `installation.updated` - Version updates
- `lsp.client.diagnostics` - LSP integration
- `session.compacted` - Memory compaction
- `todo.updated` - Todo list updates
- `session.created` - New session events
- `ide.installed` - IDE integration

**Impact:**
- No LSP diagnostics in TUI
- No todo tracking display
- Cannot show installation updates

---

#### 6. Type System - Simpler

**OpenCode has rich union types:**
```go
type Part interface { implementsPart() }
type TextPart struct { ... }
type ReasoningPart struct { ... }
type ToolPart struct { ... }
type FilePart struct { ... }
type AgentPart struct { ... }
type StepStartPart struct { ... }
type StepFinishPart struct { ... }
type SnapshotPart struct { ... }

type ToolState interface { ... }
type ToolStatePending struct { ... }
type ToolStateRunning struct { ... }
type ToolStateCompleted struct { ... }
type ToolStateError struct { ... }
```

**PukuCode has simpler types:**
```go
type MessagePart struct {
    Type     string
    Text     string
    Mime     string
    URL      string
    Filename string
}
```

**Impact:**
- Less type safety
- Need runtime type checking instead of compile-time
- Harder to display different part types correctly

---

### 🟢 PUKUCODE ADVANTAGES

PukuCode SDK has features OpenCode doesn't:

#### 1. Auth Service
```go
type AuthService struct {}

func (r *AuthService) Set(ctx, providerID string, params AuthParams) error

// Supports API keys, OAuth, WellKnown auth types
pukucode.NewAPIKeyParams("sk-xxx")
pukucode.NewOAuthParams(refresh, access, expires)
pukucode.NewWellKnownParams(key, token)
```

**OpenCode:** No Auth service (authentication is external)

#### 2. Tool Service
```go
type ToolService struct {}

func (r *ToolService) IDs(ctx, params) (*string, error)
func (r *ToolService) List(ctx, params) (*[]Tool, error)
```

**OpenCode:** No Tool service

---

## TUI Feature Mapping

### What You CAN Build with Current PukuCode SDK

| TUI Feature | Possible? | SDK Methods Used |
|-------------|-----------|------------------|
| Chat interface | ✅ YES | Session.Prompt, Event.Subscribe |
| Message display | ✅ YES | Session.Messages |
| Session list sidebar | ✅ YES | Session.List |
| Create new session | ✅ YES | Session.New |
| Delete session | ✅ YES | Session.Delete |
| Model selection dialog | ✅ YES | Config.Providers |
| Theme selection | ✅ YES | Config.Get (themes in config) |
| Help dialog | ✅ YES | TUI.OpenHelp or local |
| Slash commands | ✅ YES | Command.List, Session.Command |
| Text streaming | ✅ YES | message.part.updated events |
| Error handling | ✅ YES | session.error events |
| Session idle detection | ✅ YES | session.idle events |
| File attachments | ✅ YES | Session.Prompt with file parts |
| Abort running session | ✅ YES | Session.Abort |
| Session branching | ✅ YES | Session.New(parentID), Children |
| Revert/Unrevert | ✅ YES | Session.Revert, Unrevert |
| Project detection | ✅ YES | Project.Current |
| File browser | ✅ YES | File.List |
| Authentication | ✅ YES | Auth.Set |
| Toast notifications | ✅ YES | TUI.ShowToast |

### What You CANNOT Build (Missing Features)

| TUI Feature | Reason | Required Change |
|-------------|--------|-----------------|
| Permission approval dialog | No Session.Permissions service | Add to backend + SDK |
| Agent selector | No Agent service | Add to backend + SDK |
| Fuzzy file finder | No Find.Files service | Add to backend + SDK |
| Symbol search | No Find.Symbols service | Add LSP + SDK |
| Text search | No Find.Text service | Add ripgrep endpoint |
| Session sharing | No Share/Unshare methods | Add to backend + SDK |
| Session summarization | No Summarize method | Add to backend + SDK |
| LSP diagnostics | No lsp.client.diagnostics event | Add LSP integration |
| Todo tracking | No todo.updated event | Add todo system |

---

## Recommended SDK Additions

### Priority 1: CRITICAL (Required for basic TUI)

1. **SessionPermissionService**
   ```go
   type SessionPermissionService struct {}

   func (r *SessionPermissionService) Respond(
       ctx context.Context,
       sessionID string,
       permissionID string,
       params SessionPermissionRespondParams,
   ) error
   ```

### Priority 2: HIGH (Required for feature parity)

2. **AgentService**
   ```go
   type AgentService struct {}

   func (r *AgentService) List(ctx, params) ([]Agent, error)
   ```

3. **FindService** (at least Files)
   ```go
   type FindService struct {}

   func (r *FindService) Files(ctx, params) ([]string, error)
   ```

### Priority 3: MEDIUM (Nice to have)

4. **Session.Share/Unshare/Summarize methods**

5. **Enhanced event types:**
   - `session.created`
   - `todo.updated`

6. **Richer Part types** (union types like OpenCode)

---

## Implementation Roadmap for TUI

### Phase 1: Basic TUI (Works with current SDK)
- Chat interface with streaming
- Session management (list, create, delete, switch)
- Model selection
- Basic error handling
- Help dialog

### Phase 2: Add Permission System
- Add SessionPermissionService to SDK
- Add permission.respond endpoint to backend
- Build permission approval dialog in TUI

### Phase 3: Add Agent Support
- Add AgentService to SDK
- Add agent list endpoint to backend
- Build agent selector in TUI

### Phase 4: Add Search Features
- Add FindService to SDK
- Add find endpoints to backend
- Build fuzzy finder in TUI
- Build text search in TUI

### Phase 5: Polish
- Add sharing features
- Add summarization
- Add LSP integration (if backend supports it)

---

## Code Examples: Building TUI with Current SDK

### Basic TUI Model (Bubble Tea)

```go
package main

import (
    "context"
    "fmt"

    tea "github.com/charmbracelet/bubbletea"
    pukucode "github.com/pukucode/pukucode-sdk-go"
    "github.com/pukucode/pukucode-sdk-go/option"
)

type model struct {
    client    *pukucode.Client
    sessionID string
    messages  []pukucode.Message
    input     string
    streaming bool
}

func (m model) Init() tea.Cmd {
    return m.subscribeToEvents()
}

func (m model) subscribeToEvents() tea.Cmd {
    return func() tea.Msg {
        ctx := context.Background()
        stream, err := m.client.Event.Subscribe(ctx)
        if err != nil {
            return errMsg{err}
        }

        for stream.Next() {
            event := stream.Current()

            switch event.Type {
            case "session.idle":
                if event.GetSessionID() == m.sessionID {
                    return sessionIdleMsg{}
                }

            case "message.part.updated":
                if event.GetSessionID() == m.sessionID {
                    return partUpdatedMsg{event.GetPart()}
                }

            case "session.error":
                return sessionErrorMsg{event.Properties.Error}
            }
        }

        return nil
    }
}

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
    switch msg := msg.(type) {
    case tea.KeyMsg:
        switch msg.String() {
        case "enter":
            if m.input != "" && !m.streaming {
                return m.sendPrompt()
            }
        case "ctrl+c":
            if m.streaming {
                return m.abortSession()
            }
            return m, tea.Quit
        }

    case sessionIdleMsg:
        m.streaming = false
        return m, m.fetchMessages()

    case partUpdatedMsg:
        // Handle streaming text
        return m, nil
    }

    return m, nil
}

func (m model) sendPrompt() (tea.Model, tea.Cmd) {
    m.streaming = true
    prompt := m.input
    m.input = ""

    return m, func() tea.Msg {
        ctx := context.Background()
        _, err := m.client.Session.Prompt(ctx, m.sessionID, pukucode.SessionPromptParams{
            Parts: []pukucode.MessagePart{
                {Type: "text", Text: prompt},
            },
        })
        if err != nil {
            return errMsg{err}
        }
        return promptSentMsg{}
    }
}

func (m model) abortSession() (tea.Model, tea.Cmd) {
    return m, func() tea.Msg {
        ctx := context.Background()
        m.client.Session.Abort(ctx, m.sessionID, pukucode.SessionAbortParams{})
        return sessionAbortedMsg{}
    }
}

func (m model) fetchMessages() tea.Cmd {
    return func() tea.Msg {
        ctx := context.Background()
        messages, err := m.client.Session.Messages(ctx, m.sessionID, pukucode.SessionMessagesParams{})
        if err != nil {
            return errMsg{err}
        }
        return messagesMsg{messages}
    }
}

func (m model) View() string {
    // Render TUI
    return "TUI View"
}

// Message types
type errMsg struct{ error }
type sessionIdleMsg struct{}
type partUpdatedMsg struct{ part *pukucode.EventMessagePart }
type sessionErrorMsg struct{ err *pukucode.EventError }
type promptSentMsg struct{}
type sessionAbortedMsg struct{}
type messagesMsg struct{ messages []pukucode.Message }
```

---

## Conclusion

The PukuCode Go SDK provides a solid foundation for building a TUI. The core chat functionality, session management, and event streaming are all present and working.

**Main blockers for full OpenCode TUI parity:**
1. No permission system (CRITICAL)
2. No agent service (HIGH)
3. No find/search service (MEDIUM)

**Recommendation:** Start building the TUI with current SDK capabilities, and add permission support as the first priority enhancement. This will unblock the AI from being able to execute tools that require user approval.
