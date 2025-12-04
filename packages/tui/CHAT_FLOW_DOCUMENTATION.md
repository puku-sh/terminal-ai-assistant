# PukuCLI TUI Chat Flow Documentation

## Overview
This document explains how chat messages flow through the PukuCLI TUI system, from user input to AI response rendering.

## Architecture Components

### 1. TUI (Terminal User Interface)
- **Location**: `packages/tui/`
- **Framework**: Bubble Tea (Go)
- **Purpose**: Renders UI and handles user interactions

### 2. Backend Server
- **Location**: `packages/pukucode/src/server/`
- **Framework**: Hono (TypeScript/Bun)
- **Purpose**: Processes chat requests, manages sessions, interacts with AI providers

### 3. SDK (Software Development Kit)
- **Location**: `packages/sdk/go/`
- **Language**: Go
- **Purpose**: Client library for TUI to communicate with backend

### 4. Event Bus
- **Location**: `packages/pukucode/src/bus/`
- **Purpose**: Pub/sub system for real-time event broadcasting

---

## Complete Chat Flow (End-to-End)

### Phase 1: User Input → Message Submission

1. **User types message and presses Enter**
   - Location: `packages/tui/internal/components/chat/editor.go`
   - Editor component captures input

2. **Message sent to app layer**
   - Location: `packages/tui/internal/app/app.go` → `SendPrompt()` (lines 771-808)
   - Creates user message with unique ID
   - Adds message to `app.Messages` array
   - Creates session if doesn't exist

3. **SDK sends POST request to backend**
   ```go
   // packages/tui/internal/app/app.go:788-796
   _, err := a.Client.Session.Message(ctx, pukucode.SessionMessageParams{
       SessionID: a.Session.ID,
       Parts: parts,
   })
   ```
   - Endpoint: `POST /session/{sessionID}/message`
   - Backend location: `packages/pukucode/src/server/server.ts`

### Phase 2: Backend Processing

4. **Backend receives message**
   - Location: `packages/pukucode/src/server/server.ts`
   - Route handler: `POST /session/:sessionID/message`
   - Validates request and creates message record

5. **Backend publishes events to Bus**
   - Location: `packages/pukucode/src/session/processor.ts`
   - Events published:
     ```typescript
     Bus.publish(Event.MessageUpdated, {...})       // User message created
     Bus.publish(Event.MessagePartUpdated, {...})   // Message part added
     Bus.publish(Event.SessionUpdated, {...})       // Session state changed
     ```

6. **AI provider processes request**
   - Location: `packages/pukucode/src/provider/`
   - Streaming response from AI (e.g., OpenRouter, Anthropic)
   - Each token/chunk generates events:
     ```typescript
     Bus.publish(Event.MessagePartUpdated, {
         part: { type: "text", text: "..." }
     })
     ```

### Phase 3: Event Streaming (SSE)

7. **TUI subscribes to SSE stream**
   - Location: `packages/tui/cmd/pukucode/main.go` (lines 155-169)
   ```go
   stream, err := httpClient.Event.Subscribe(ctx)
   for stream.Next() {
       evt := stream.Current()
       program.Send(evt.AsUnion())
   }
   ```
   - Endpoint: `GET /event` (Server-Sent Events)
   - **CRITICAL**: This endpoint must exist in backend!

8. **Backend streams events to TUI**
   - Location: `packages/pukucode/src/server/server.ts`
   - Endpoint implementation (from OpenCode reference):
   ```typescript
   app.get("/event", async (c) => {
       return streamSSE(c, async (stream) => {
           const unsub = Bus.subscribeAll(async (event) => {
               await stream.writeSSE({
                   data: JSON.stringify(event)
               })
           })
           // Handle disconnection
           await new Promise((resolve) => {
               stream.onAbort(() => {
                   unsub()
                   resolve()
               })
           })
       })
   })
   ```

### Phase 4: Event Processing in TUI

9. **Events received and typed**
   - Location: `packages/tui/cmd/pukucode/main.go:163`
   ```go
   program.Send(evt.AsUnion())  // Convert to typed event
   ```
   - SDK: `packages/sdk/go/event.go` → `AsUnion()` method
   - Converts generic `Event` to typed aliases like:
     - `EventListResponseEventMessagePartUpdated`
     - `EventListResponseEventMessageUpdated`

10. **Bubble Tea dispatches to Update()**
    - Location: `packages/tui/internal/tui/tui.go` → `Update()` method
    - Type switches on event types (lines 464-697)

11. **Messages component handles events**
    - Location: `packages/tui/internal/components/chat/messages.go` (lines 232-260)
    ```go
    case pukucode.EventListResponseEventMessagePartUpdated:
        if msg.Properties.Part != nil && msg.Properties.Part.SessionID == m.app.Session.ID {
            cmds = append(cmds, m.renderView())
        }
    ```
    - Nil checks are critical to prevent panics!

### Phase 5: Rendering

12. **View re-rendered**
    - Location: `packages/tui/internal/components/chat/messages.go` → `renderView()` (lines 315-863)
    - Formats messages with markdown, syntax highlighting
    - Updates viewport content

13. **Screen updates**
    - Bubble Tea framework triggers `View()` method
    - Terminal displays updated content
    - User sees AI response streaming in real-time

---

## Event Types

### Message Events
```typescript
// User message created
{
    type: "message.updated",
    properties: {
        sessionID: "ses_...",
        message: { id: "msg_...", role: "user", ... }
    }
}

// AI response streaming
{
    type: "message.part.updated",
    properties: {
        sessionID: "ses_...",
        messageID: "msg_...",
        part: {
            id: "part_...",
            type: "text",
            text: "Hello! How can I help you?"
        }
    }
}

// Tool execution
{
    type: "message.part.updated",
    properties: {
        part: {
            type: "tool",
            tool: "Read",
            state: { status: "running", ... }
        }
    }
}
```

### Session Events
```typescript
{
    type: "session.updated",
    properties: {
        info: { id: "ses_...", title: "...", ... }
    }
}

{
    type: "session.error",
    properties: {
        sessionID: "ses_...",
        error: { name: "api_error", message: "..." }
    }
}
```

---

## Critical Implementation Details

### 1. Event Type Conversion (AsUnion)
**Why needed**: Go's type system doesn't automatically convert type aliases
```go
// Without AsUnion - events are ignored
program.Send(evt)  // Type: Event

// With AsUnion - events match type switches
program.Send(evt.AsUnion())  // Type: EventListResponseEventMessagePartUpdated
```

### 2. Nil Pointer Safety
**Always check nested pointers**:
```go
// BAD - will panic if Properties.Part is nil
if msg.Properties.Part.SessionID == sessionID { ... }

// GOOD - safe nil check
if msg.Properties.Part != nil && msg.Properties.Part.SessionID == sessionID { ... }
```

### 3. SSE Connection Lifecycle
- Connection opened on TUI startup
- Persistent connection (not closed between messages)
- Reconnection handling on network issues
- Graceful shutdown on exit

### 4. Message State Management
- User message added immediately to UI
- AI message placeholder created
- Parts streamed in and appended
- Message marked complete when done

---

## Common Issues & Solutions

### Issue 1: Screen Goes Blank After Sending Message
**Cause**: `m.loading` flag stuck as true
**Solution**: Ensure `renderView()` sets `m.loading = false` when done

### Issue 2: No Response Shown
**Cause**: Missing `/event` SSE endpoint
**Solution**: Implement event streaming endpoint in backend

### Issue 3: TUI Crashes with Nil Pointer
**Cause**: Accessing nested event properties without nil checks
**Solution**: Add nil checks before accessing `Properties.Part`, `Properties.Info`, etc.

### Issue 4: Events Not Matching Type Switches
**Cause**: Not calling `AsUnion()` before sending events
**Solution**: Call `evt.AsUnion()` in main.go before `program.Send()`

---

## Testing Checklist

- [ ] User message appears in chat immediately after pressing Enter
- [ ] Loading indicator shows while waiting for response
- [ ] AI response streams in token-by-token
- [ ] Tool calls display with proper formatting
- [ ] Error messages show when AI fails
- [ ] Multiple messages in same session work
- [ ] Switching sessions preserves message history
- [ ] TUI doesn't crash on edge cases (nil events, malformed data)

---

## Key Files Reference

| Component | File Path | Key Functions |
|-----------|-----------|---------------|
| Message Editor | `internal/components/chat/editor.go` | Input capture |
| App Layer | `internal/app/app.go` | `SendPrompt()` (771-808) |
| Messages Component | `internal/components/chat/messages.go` | Event handlers (232-260), `renderView()` (315-863) |
| TUI Main | `cmd/pukucode/main.go` | SSE subscription (155-169) |
| Event SDK | `packages/sdk/go/event.go` | `Subscribe()`, `AsUnion()` |
| Backend Server | `packages/pukucode/src/server/server.ts` | HTTP routes, SSE endpoint |
| Session Processor | `packages/pukucode/src/session/processor.ts` | AI streaming logic |
| Event Bus | `packages/pukucode/src/bus/index.ts` | `publish()`, `subscribeAll()` |

---

## Comparison with OpenCode

PukuCode TUI is based on OpenCode's architecture but uses a hand-written SDK instead of auto-generated one.

**Key differences**:
- SDK: Hand-written (PukuCode) vs Stainless-generated (OpenCode)
- Event types: Simple type aliases vs complex union types
- Backend: Minimal routes vs full-featured API

**Similarities**:
- Same Bubble Tea framework
- Same event-driven architecture
- Same SSE streaming approach
- Similar component structure

---

## Future Enhancements

1. **Reconnection logic**: Auto-reconnect SSE stream on network issues
2. **Offline mode**: Queue messages when server unreachable
3. **Message persistence**: Cache messages locally for instant loading
4. **Typing indicators**: Show when AI is "thinking"
5. **Cancel requests**: Allow user to stop long-running AI responses
