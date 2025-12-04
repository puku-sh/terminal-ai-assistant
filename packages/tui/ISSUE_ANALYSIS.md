# Chat Not Working - Issue Analysis

## Problem Statement
After typing a message in PukuCLI TUI and pressing Enter, no response is shown. The screen remains blank.

## Investigation Summary

### What's Working ✓
1. **Backend Processing**
   - Server receives messages correctly
   - Sessions are created successfully
   - AI provider processes requests
   - Events are published to Bus (`service=bus type=message.part.updated publishing`)
   - Tool calls execute properly

2. **TUI Compilation**
   - TUI compiles without errors
   - Launches successfully
   - User can type messages
   - Messages are sent to backend via POST `/session/{id}/message`

### What's Not Working ✗
1. **SSE Connection**
   - Server logs show NO "event connected" message
   - This means TUI is NOT connecting to GET `/event` endpoint
   - Without SSE connection, TUI cannot receive events
   - No events = no response rendering

2. **Event Reception**
   - TUI never receives `message.part.updated` events
   - Messages component never triggers re-render
   - User sees blank screen after sending message

## Root Cause

**The TUI is failing to establish an SSE connection to the backend's `/event` endpoint.**

Even though:
- The endpoint exists in `packages/pukucode/src/server/server.ts` (lines 1242-1285)
- The TUI attempts to subscribe in `cmd/pukucode/main.go` (line 157)
- Events are being published by the backend

The connection is not being established, which means:
- `stream, err := httpClient.Event.Subscribe(ctx)` is either:
  - Failing silently (error not logged)
  - Not being called at all (goroutine issue)
  - Connecting to wrong URL

## Fixes Applied

### 1. Event Type Conversion (AsUnion)
**File**: `packages/sdk/go/event.go`

Added `AsUnion()` method to convert generic `Event` to typed event aliases:

```go
func (e *Event) AsUnion() interface{} {
    switch e.Type {
    case "session.updated":
        return EventListResponseEventSessionUpdated(*e)
    case "message.updated":
        return EventListResponseEventMessageUpdated(*e)
    case "message.part.updated":
        return EventListResponseEventMessagePartUpdated(*e)
    // ... etc for all event types
    }
}
```

**Why needed**: Go's type system requires explicit type conversion for type switches to work.

### 2. Call AsUnion() Before Sending
**File**: `cmd/pukucode/main.go:166`

Changed:
```go
program.Send(evt)
```
To:
```go
program.Send(evt.AsUnion())
```

### 3. Nil Pointer Safety
**Files**: `internal/components/chat/messages.go`, `internal/tui/tui.go`

Added nil checks before accessing nested event properties:

```go
// Before (unsafe - causes panic)
if msg.Properties.Info.ID == sessionID { ... }

// After (safe)
if msg.Properties.Info != nil && msg.Properties.Info.ID == sessionID { ... }
```

### 4. Debug Logging
**File**: `cmd/pukucode/main.go:156-172`

Added extensive logging to track SSE subscription lifecycle:
- "Attempting to subscribe to event stream"
- "Successfully subscribed to event stream"
- "Received event" (with type)
- "Event stream ended"

## Testing Instructions

### Step 1: Rebuild TUI
```bash
cd terminal-ai-assistant/packages/tui
go build -o pukucode-tui.exe ./cmd/pukucode
```

### Step 2: Start Backend (in separate terminal)
```bash
cd terminal-ai-assistant/packages/pukucode
bun run src/index.ts server -p 1337
```

### Step 3: Run TUI with Debug Logging
```bash
# Set log level to see debug messages
set PUKUCODE_LOG_LEVEL=debug

cd terminal-ai-assistant/packages/tui
./pukucode-tui.exe
```

### Step 4: Check Logs

**In backend terminal**, look for:
```
INFO event connected     # <-- THIS MUST APPEAR
```

**In TUI terminal/logs**, look for:
```
INFO Attempting to subscribe to event stream url=http://localhost:1337/event
INFO Successfully subscribed to event stream     # <-- THIS MUST APPEAR
DEBUG Received event type=message.part.updated   # <-- Should appear when typing
```

### Step 5: Test Chat
1. Type "Hi" and press Enter
2. **Expected behavior:**
   - Your message appears in chat immediately
   - Loading indicator shows
   - Backend logs show event publications
   - TUI logs show "Received event type=..."
   - AI response appears token-by-token

## Debugging Checklist

If SSE connection still fails:

- [ ] Check if backend is actually running on port 1337
- [ ] Verify no firewall blocking localhost:1337
- [ ] Check if PUKUCODE_SERVER or PUKUCODE_BASE_URL env vars are set incorrectly
- [ ] Verify `/event` endpoint exists: `curl http://localhost:1337/event`
- [ ] Check if SSL/TLS causing issues (should be plain HTTP)
- [ ] Look for "Failed to subscribe to events" error in TUI logs
- [ ] Check backend logs for connection errors
- [ ] Verify SDK's Event.Subscribe() implementation in `packages/sdk/go/event.go`

## Expected Log Flow (Success Case)

### Backend Logs:
```
INFO server listening on http://localhost:1337
INFO event connected                              # 1. TUI connects
INFO service=bus type=message.updated publishing  # 2. User message
INFO service=bus type=message.part.updated publishing  # 3. AI response chunks
```

### TUI Logs:
```
INFO Attempting to subscribe to event stream url=http://localhost:1337/event
INFO Successfully subscribed to event stream
DEBUG Received event type=server.connected
DEBUG Received event type=message.updated
DEBUG Received event type=message.part.updated
DEBUG Received event type=message.part.updated
...
```

## Next Steps

1. **Test with logging** - Run TUI and check if SSE connection is established
2. **If connection fails** - Check SDK Subscribe() implementation for bugs
3. **If connection succeeds** - Verify events are being sent/received correctly
4. **If events received but not rendered** - Check message component event handlers

## Related Files

- **Documentation**: `CHAT_FLOW_DOCUMENTATION.md` - Complete end-to-end flow explanation
- **Backend**: `packages/pukucode/src/server/server.ts:1242-1285` - SSE endpoint
- **TUI Main**: `cmd/pukucode/main.go:155-173` - SSE subscription
- **SDK**: `packages/sdk/go/event.go` - Event types and Subscribe()
- **Messages Component**: `internal/components/chat/messages.go:232-260` - Event handlers
