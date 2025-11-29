# PukuCode SSE Event Types Reference

This document lists all Server-Sent Events (SSE) published by the PukuCode server.

---

## Table of Contents

1. [Event System Overview](#event-system-overview)
2. [Complete Event List](#complete-event-list)
3. [Session Events](#session-events)
4. [Message Events](#message-events)
5. [File Events](#file-events)
6. [Permission Events](#permission-events)
7. [Server Events](#server-events)
8. [Go SDK Integration](#go-sdk-integration)

---

## Event System Overview

### How Events Work

PukuCode uses an Event Bus to publish events that are streamed to clients via SSE:

```
Server Code → Bus.publish(event, data) → SSE Stream → Go SDK → Your App
```

### SSE Endpoint

```
GET /event
Accept: text/event-stream
```

### Event Format

All events are JSON with this structure:
```json
{
  "type": "event.name",
  "properties": {
    // event-specific data
  }
}
```

**Important:** The event data is nested under `properties`, NOT at the root level!

---

## Complete Event List

| # | Event Type | Category | Description |
|---|-----------|----------|-------------|
| 1 | `session.updated` | Session | Session created or metadata changed |
| 2 | `session.deleted` | Session | Session removed |
| 3 | `session.idle` | Session | Session finished processing (AI done) |
| 4 | `session.error` | Session | Error occurred during processing |
| 5 | `message.updated` | Message | Message created or updated |
| 6 | `message.removed` | Message | Message deleted |
| 7 | `message.part.updated` | Message | Message part added/updated (streaming) |
| 8 | `message.part.removed` | Message | Message part deleted |
| 9 | `file.edited` | File | File modified by Write/Edit tool |
| 10 | `file.watcher.updated` | File | External file change detected |
| 11 | `permission.updated` | Permission | Permission request created |
| 12 | `permission.replied` | Permission | User responded to permission |
| 13 | `server.connected` | Server | SSE connection established |

**Total: 13 event types**

---

## Session Events

### `session.updated`

**When:** Session is created or its metadata changes (title, model, etc.)

**Source:** `src/session/crud.ts:51, 107`

**Properties:**
```typescript
{
  info: {
    id: string              // e.g., "ses_01HXYZ..."
    projectID: string       // Project identifier
    directory: string       // Working directory
    parentID?: string       // Parent session (for child sessions)
    title: string           // Session title
    version: string         // PukuCode version
    time: {
      created: number       // Unix timestamp (ms)
      updated: number       // Unix timestamp (ms)
    }
    revert?: {              // Only if session has revert state
      messageID: string
      partID?: string
      snapshot?: string
      diff?: string
    }
  }
}
```

---

### `session.deleted`

**When:** Session is removed

**Source:** `src/session/crud.ts:149`

**Properties:**
```typescript
{
  info: {
    id: string
    // ... same as session.updated
  }
}
```

---

### `session.idle`

**When:** Session finishes processing (AI response complete, tools done)

**Source:** `src/session/utils.ts:95`

**Properties:**
```typescript
{
  sessionID: string    // The session that became idle
}
```

**Important:** This is the key event to know when AI is done responding!

---

### `session.error`

**When:** An error occurs during session processing

**Source:** `src/session/stream-processor.ts:287`

**Properties:**
```typescript
{
  sessionID?: string     // May be undefined for global errors
  error: {
    name: string         // Error type name
    message: string      // Human-readable message
    // Additional properties based on error type
  }
}
```

**Error Types:**
- `MessageOutputLengthError` - Response exceeded token limit
- `MessageAbortedError` - User cancelled the operation
- `ProviderAuthError` - Invalid API key or auth failure
- `UnknownError` - General/unexpected error

---

## Message Events

### `message.updated`

**When:** Message is created or its metadata changes

**Source:** `src/session/messages.ts:48`

**Properties:**
```typescript
{
  info: {
    id: string              // e.g., "msg_01ABC..."
    sessionID: string
    role: "user" | "assistant"
    time: {
      created: number       // Unix timestamp (ms)
      completed?: number    // Only for assistant messages when done
    }
    // Assistant-specific fields:
    error?: {
      name: string
      message: string
    }
    system?: string[]       // System prompts used
    modelID?: string        // e.g., "claude-3-opus"
    providerID?: string     // e.g., "anthropic"
    mode?: string           // Agent mode
    path?: {
      cwd: string           // Current working directory
      root: string          // Project root
    }
    summary?: boolean       // True if this is a summary message
    cost?: number           // Cost in dollars
    tokens?: {
      input: number
      output: number
      reasoning: number
      cache: {
        read: number
        write: number
      }
    }
  }
}
```

---

### `message.removed`

**When:** Message is deleted (e.g., during revert)

**Source:** `src/session/processor.ts:56, 408`

**Properties:**
```typescript
{
  sessionID: string
  messageID: string
}
```

---

### `message.part.updated`

**When:** A message part is added or updated (text streaming, tool execution)

**Source:** `src/session/messages.ts:55`

**This is the main event for real-time streaming!**

**Properties (common):**
```typescript
{
  part: {
    id: string              // e.g., "part_01DEF..."
    sessionID: string
    messageID: string
    type: string            // See part types below
    // ... type-specific fields
  }
}
```

**Part Types:**

#### Text Part (`type: "text"`)
```typescript
{
  part: {
    type: "text"
    text: string            // The actual text content
    synthetic?: boolean     // True if system-generated
    time?: {
      start: number
      end?: number
    }
  }
}
```

#### Reasoning Part (`type: "reasoning"`)
```typescript
{
  part: {
    type: "reasoning"
    text: string            // AI's reasoning/thinking
    metadata?: Record<string, any>
    time: {
      start: number
      end?: number
    }
  }
}
```

#### Tool Part (`type: "tool"`)
```typescript
{
  part: {
    type: "tool"
    callID: string          // Unique call identifier
    tool: string            // Tool name (e.g., "Bash", "Edit", "Write")
    state: {
      status: "pending" | "running" | "completed" | "error"
      input?: Record<string, any>    // Tool input parameters
      output?: string                // Tool output
      error?: string                 // Error message if failed
      title?: string                 // Display title
      metadata?: Record<string, any>
      time: {
        start: number
        end?: number
      }
    }
  }
}
```

#### File Part (`type: "file"`)
```typescript
{
  part: {
    type: "file"
    mime: string            // e.g., "text/plain", "image/png"
    filename?: string
    url: string             // Data URL or file URL
    source?: {
      type: "file"
      path: string
      text: {
        value: string
        start: number
        end: number
      }
    }
  }
}
```

#### Step Start Part (`type: "step-start"`)
```typescript
{
  part: {
    type: "step-start"
    // No additional fields
  }
}
```

#### Step Finish Part (`type: "step-finish"`)
```typescript
{
  part: {
    type: "step-finish"
    cost: number
    tokens: {
      input: number
      output: number
      reasoning: number
      cache: {
        read: number
        write: number
      }
    }
  }
}
```

---

### `message.part.removed`

**When:** A message part is deleted

**Source:** `src/session/processor.ts:65`

**Properties:**
```typescript
{
  sessionID: string
  messageID: string
  partID: string
}
```

---

## File Events

### `file.edited`

**When:** A file is modified by the Write or Edit tool

**Source:** `src/tool/write.ts:49`, `src/tool/edit.ts:66, 97`

**Properties:**
```typescript
{
  file: string    // Absolute file path
}
```

---

### `file.watcher.updated`

**When:** File system watcher detects external changes

**Source:** `src/file/watch.ts:32`

**Properties:**
```typescript
{
  file: string              // Absolute file path
  event: "rename" | "change"
}
```

---

## Permission Events

### `permission.updated`

**When:** Agent needs user permission for an action

**Source:** `src/permission/index.ts:147`

**Properties:**
```typescript
{
  id: string                // e.g., "perm_01XYZ..."
  type: string              // Permission type
  pattern?: string          // Pattern for batch permissions
  sessionID: string
  messageID: string
  callID?: string           // Tool call ID
  title: string             // Human-readable description
  metadata: Record<string, any>
  time: {
    created: number
  }
}
```

---

### `permission.replied`

**When:** User responds to a permission request

**Source:** `src/permission/index.ts:165`

**Properties:**
```typescript
{
  sessionID: string
  permissionID: string
  response: "once" | "always" | "reject"
}
```

---

## Server Events

### `server.connected`

**When:** SSE connection is established (heartbeat)

**Properties:**
```typescript
{}    // Empty object
```

---

## Go SDK Integration

### Current Issue

The Go SDK Event struct expects `sessionID` and `messageID` at the root level, but PukuCode sends them nested under `properties`:

**What PukuCode sends:**
```json
{
  "type": "session.idle",
  "properties": {
    "sessionID": "ses_01HXYZ..."
  }
}
```

**What Go SDK expects:**
```go
type Event struct {
    Type      string      `json:"type"`
    SessionID string      `json:"sessionID"`    // NOT HERE!
    MessageID string      `json:"messageID"`    // NOT HERE!
    Data      interface{} `json:"data"`
}
```

### Fix Required

The Go SDK needs to be updated to match the actual event format. See `packages/sdk/go/event.go` for the corrected struct.

---

## Event Flow Examples

### Example 1: User Sends Simple Prompt

```
T+0ms    session.updated (session marked as updated)
T+5ms    message.updated (user message created)
T+10ms   message.part.updated (user text part)
T+15ms   message.updated (assistant message created)
T+20ms   message.part.updated (step-start)
T+500ms  message.part.updated (text: "Hello...")
T+600ms  message.part.updated (text: "Hello! How...")
T+800ms  message.part.updated (text: "Hello! How can I help?")
T+850ms  message.part.updated (step-finish)
T+900ms  message.updated (tokens counted)
T+950ms  session.idle ⭐ (AI done!)
```

### Example 2: Agent Uses Tool

```
T+0ms    message.updated (user message)
T+10ms   message.part.updated (user text)
T+20ms   message.updated (assistant message)
T+100ms  message.part.updated (text: "I'll create the file...")
T+150ms  message.part.updated (tool: Write, status: pending)
T+200ms  permission.updated (needs approval)
...
T+5000ms permission.replied (user allowed)
T+5050ms message.part.updated (tool: Write, status: running)
T+5100ms file.edited (file written)
T+5150ms message.part.updated (tool: Write, status: completed)
T+5200ms message.part.updated (text: "I've created the file...")
T+5250ms session.idle ⭐
```

---

## Summary

| Event | Key Property | Use Case |
|-------|-------------|----------|
| `session.idle` | `sessionID` | Know when AI is done |
| `message.part.updated` | `part.text` | Stream text in real-time |
| `message.updated` | `info.tokens` | Track costs |
| `session.error` | `error.message` | Handle errors |
| `permission.updated` | `title` | Show permission dialogs |

**Most Important for SDK Integration:**
1. `session.idle` - Wait for this to know AI finished
2. `message.part.updated` - Stream text chunks
3. `session.error` - Handle failures gracefully
