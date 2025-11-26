# SSE Streaming Testing Guide

This guide shows you how to test SSE (Server-Sent Events) streaming with both OpenCode and PukuCode SDKs.

## Why SSE Streaming?

**Problem with Polling:**
- You send a message → wait → check for response → repeat
- Wastes time waiting when response is ready earlier
- Can miss responses if timing is off
- Not efficient for real-time applications

**SSE Streaming Solution:**
- Subscribe to events BEFORE sending message
- Server pushes events to you in real-time as they happen
- Know immediately when AI starts responding, when tools execute, when response is complete
- Much more efficient and reliable

## OpenCode SSE Test

### Prerequisites
```bash
# Make sure OpenCode server is running
cd opencode
bun dev
```

### Run the Test
```bash
cd opencode/packages/sdk/go/examples
go run sse_stream_demo.go
```

### What You'll See
```
=== SSE Streaming Demo ===

Creating session...
Session created: ses_xxxxx

Subscribing to SSE events...
✅ Subscribed to event stream

Sending prompt: 'Write hello world in Python'
Prompt sent!

📡 Listening for events...

─────────────────────────────────────────────────────
[15:23:45.123] Event #1
  Type: message.updated
  MessageID: msg_xxxxx...
  SessionID: ses_xxxxx...
  → Message metadata updated

[15:23:45.234] Event #2
  Type: message.part.updated
  MessageID: msg_xxxxx...
  SessionID: ses_xxxxx...
  → Message part updated (text streaming)

[15:23:46.567] Event #3
  Type: session.idle
  SessionID: ses_xxxxx...
  → Session idle - AI finished!
─────────────────────────────────────────────────────

✅ Event stream completed

Fetching final messages...
Total messages: 2

Message 1 [user] ID: msg_xxxxx...
  ──────────────────────────────────────────────────
  Part 1 [text]:
    Write hello world in Python

Message 2 [assistant] ID: msg_xxxxx...
  ──────────────────────────────────────────────────
  Part 1 [text]:
    print("Hello, World!")

Cleaning up...
Session deleted

=== SSE Stream Demo Complete ===
```

## PukuCode SSE Test

### Prerequisites
```bash
# Make sure PukuCode server is running
cd terminal-ai-assistant/packages/pukucode
bun run dev
```

### Run the Test
```bash
cd terminal-ai-assistant/packages/sdk/go/example
go run sse_stream_demo.go
```

### What You'll See
```
=== PukuCode SSE Streaming Demo ===

Creating session with openrouter/z-ai/glm-4.6...
Session created: ses_xxxxx

Subscribing to SSE events...
✅ Subscribed to event stream

Sending prompt: 'Say hello in 5 words'
Prompt sent!

📡 Listening for events...

─────────────────────────────────────────────────────
[15:24:01.123] Event #1
  Type: message.updated
  MessageID: msg_xxxxx...
  SessionID: ses_xxxxx...
  → Message metadata updated

[15:24:01.234] Event #2
  Type: message.part.updated
  MessageID: msg_xxxxx...
  SessionID: ses_xxxxx...
  → Message part updated (text streaming)

[15:24:06.567] Event #3
  Type: session.idle
  SessionID: ses_xxxxx...
  → Session idle - AI finished!
─────────────────────────────────────────────────────

✅ Event stream completed

Fetching final messages...
Total messages: 2

Message 1 [user] ID: msg_xxxxx...
  ──────────────────────────────────────────────────
  Part 1 [text]:
    Say hello in 5 words

Message 2 [assistant] ID: msg_xxxxx...
  ──────────────────────────────────────────────────
  Part 1 [text]:
    Hello there, how are you?
  Part 2 [reasoning]: 152 chars
  Part 3 [step-finish]

Cleaning up...
Session deleted

=== PukuCode SSE Stream Demo Complete ===

Total events received: 3
```

## Understanding the Events

### Key Event Types

1. **`message.updated`**
   - Fired when message metadata changes
   - Indicates a message was created or updated
   - Contains `MessageID` and `SessionID`

2. **`message.part.updated`**
   - Fired when a message part is added or updated
   - This is where text streaming happens
   - Multiple events for each text chunk

3. **`session.idle`**
   - **MOST IMPORTANT** - Fired when AI finishes responding
   - This tells you it's safe to fetch the complete messages
   - Only contains `SessionID`

### Event Flow

```
User sends prompt
    ↓
message.updated (user message created)
    ↓
message.updated (assistant message created)
    ↓
message.part.updated (text starts streaming)
    ↓
message.part.updated (more text)
    ↓
message.part.updated (text complete)
    ↓
session.idle (AI finished - FETCH MESSAGES NOW!)
```

## Integrating SSE into PUKU CLI

Based on these tests, here's how to integrate into your TUI:

### Approach 1: Simple Wait for session.idle
```go
func SendToAIViaSDK(message string) tea.Cmd {
    return func() tea.Msg {
        // 1. Send prompt
        client.Session.Prompt(ctx, sessionID, ...)

        // 2. Subscribe to events
        stream, _ := client.Event.Subscribe(ctx)
        defer stream.Close()

        // 3. Wait for session.idle
        for stream.Next() {
            event := stream.Current()
            if event.SessionID == sessionID && event.Type == "session.idle" {
                break // AI finished!
            }
        }

        // 4. Fetch and return messages
        messages, _ := client.Session.Messages(ctx, sessionID, ...)
        return types.ResponseMsg(extractText(messages))
    }
}
```

### Approach 2: Real-time Streaming (Advanced)
Send Bubble Tea messages for each text chunk as it arrives:
```go
func SendToAIViaSDK(message string) tea.Cmd {
    return func() tea.Msg {
        client.Session.Prompt(ctx, sessionID, ...)

        stream, _ := client.Event.Subscribe(ctx)
        defer stream.Close()

        for stream.Next() {
            event := stream.Current()
            if event.Type == "message.part.updated" {
                // Send chunk to TUI for real-time display
                // (requires more complex state management)
            }
            if event.Type == "session.idle" {
                break
            }
        }

        messages, _ := client.Session.Messages(ctx, sessionID, ...)
        return types.ResponseMsg(extractText(messages))
    }
}
```

## Troubleshooting

### "Stream error: context deadline exceeded"
**Solution:** Increase timeout or check if server is responding:
```go
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
defer cancel()
```

### Events not showing for my session
**Solution:** Filter events by SessionID:
```go
for stream.Next() {
    event := stream.Current()
    if event.SessionID != yourSessionID {
        continue // Skip events from other sessions
    }
    // Handle event...
}
```

### session.idle never fires
**Possible causes:**
1. Server crashed or errored
2. Model is still processing (wait longer)
3. Authentication issue (check server logs)

**Debug:** Add logging to see what events you ARE receiving:
```go
for stream.Next() {
    event := stream.Current()
    log.Printf("Received event: %s for session %s", event.Type, event.SessionID)
}
```

### No text in messages after session.idle
**Solution:** Check all message parts, not just "text" type:
```go
for _, part := range message.Parts {
    if part.Type == "text" && part.Text != "" {
        response += part.Text
    }
    // Also check "reasoning" parts for some models
    if part.Type == "reasoning" && part.Text != "" {
        response += part.Text
    }
}
```

## Next Steps

1. **Test OpenCode SSE** - Run `opencode/packages/sdk/go/examples/sse_stream_demo.go`
2. **Test PukuCode SSE** - Run `terminal-ai-assistant/packages/sdk/go/example/sse_stream_demo.go`
3. **Observe the events** - See which events fire and when
4. **Integrate into PUKU CLI** - Use the simple "wait for session.idle" approach
5. **Verify it works** - Check that responses appear in your TUI

## Summary

✅ SSE streaming is the **correct way** to get AI responses
✅ Much more reliable than polling
✅ Listen for `session.idle` event to know when AI is done
✅ Then fetch messages with `Session.Messages()`
✅ Extract text from message parts

The test scripts show you exactly how SSE works. Once you see them working, applying the same pattern to PUKU CLI should make responses appear correctly! 🎉
