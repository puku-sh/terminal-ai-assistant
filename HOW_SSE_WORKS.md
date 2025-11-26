# How SSE (Server-Sent Events) Actually Works

## What is SSE?

SSE (Server-Sent Events) is a **one-way communication channel** where:
- **Client** opens a connection to the **Server**
- **Server** keeps the connection open
- **Server** pushes events to the client in real-time
- **Client** listens and reacts to events as they arrive

Think of it like a **live news feed** - you subscribe once, and updates keep flowing to you.

---

## HTTP vs SSE vs WebSocket

### Traditional HTTP (What Polling Uses)
```
Client: "Do you have data for me?"
Server: "No"
[Client waits 2 seconds]
Client: "Do you have data for me?"
Server: "No"
[Client waits 2 seconds]
Client: "Do you have data for me?"
Server: "Yes! Here it is."
```
**Problem:** Wasteful - many requests, most return "no data yet"

### SSE (What We Want)
```
Client: "I want to subscribe to events"
Server: "OK, keeping connection open..."
[Server sends events whenever something happens]
Server: "event: message.updated"
Server: "event: message.part.updated"
Server: "event: session.idle"
[Connection stays open]
```
**Advantage:** Efficient - one connection, server pushes when ready

### WebSocket (Full Duplex)
```
Client ←→ Server (both can send anytime)
```
**Difference:** SSE is simpler (server→client only), WebSocket is bidirectional

---

## How SSE Works Under the Hood

### 1. Client Subscribes to Event Stream

**What happens in your code:**
```go
stream, err := client.Event.Subscribe(ctx)
```

**What happens on the network:**
```http
GET /event HTTP/1.1
Host: localhost:1337
Accept: text/event-stream
Connection: keep-alive
```

**Server response:**
```http
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

[Connection stays open - server will send events here]
```

### 2. Server Sends Events

When something happens on the server (e.g., AI responds), the server writes to this open connection:

**Event format (text stream):**
```
event: message.updated
data: {"sessionID":"ses_123","messageID":"msg_456"}

event: message.part.updated
data: {"sessionID":"ses_123","messageID":"msg_456"}

event: session.idle
data: {"sessionID":"ses_123"}

```

Each event is separated by double newline (`\n\n`).

### 3. Client Receives Events

**Your Go code:**
```go
for stream.Next() {
    event := stream.Current()
    fmt.Printf("Got event: %s\n", event.Type)
}
```

**What `stream.Next()` does:**
- Blocks and waits for next event from the open connection
- Parses the incoming text into an `Event` struct
- Returns `true` when an event arrives
- Returns `false` when connection closes

---

## How Events Are Generated in PukuCode

Let's trace what happens when you send a prompt:

### Step 1: User Sends Prompt
```go
client.Session.Prompt(ctx, sessionID, ...)
```

**Server receives HTTP POST:**
```http
POST /session/ses_123/prompt
```

### Step 2: Server Processes Prompt

**In `processor.ts` (TypeScript):**
```typescript
// Server publishes events via Bus
await Bus.publish(MessageV2.Event.Updated, {
  sessionID: input.sessionID,
  messageID: userMsg.id
})
```

### Step 3: Bus Broadcasts to SSE Subscribers

**In `bus/index.ts`:**
```typescript
export const Bus = {
  async publish(event, data) {
    // Send to all SSE connections listening
    sseConnections.forEach(connection => {
      connection.write(`event: ${event}\n`)
      connection.write(`data: ${JSON.stringify(data)}\n\n`)
    })
  }
}
```

### Step 4: Your Client Receives Event

```go
// stream.Next() unblocks
event := stream.Current()
// event.Type = "message.updated"
// event.SessionID = "ses_123"
```

---

## Event Flow Timeline

Here's what happens when you send "Say hello":

```
T+0ms   → Client: Session.Prompt("Say hello")
         Server: HTTP POST received

T+5ms   → Server: Creates user message
         Server: Bus.publish("message.updated", {sessionID, messageID})
         Client: Receives "message.updated" event

T+10ms  → Server: Creates assistant message placeholder
         Server: Bus.publish("message.updated", {sessionID, messageID})
         Client: Receives "message.updated" event

T+20ms  → Server: Locks session, calls AI provider
         Server: Bus.publish("session.locked", {sessionID})

T+500ms → AI: Starts responding with text
         Server: Bus.publish("message.part.updated", {sessionID, messageID})
         Client: Receives "message.part.updated" event

T+800ms → AI: More text arrives
         Server: Bus.publish("message.part.updated", {sessionID, messageID})
         Client: Receives "message.part.updated" event

T+1200ms → AI: Finishes responding
         Server: Bus.publish("message.updated", {sessionID, messageID})
         Client: Receives "message.updated" event

T+1250ms → Server: Unlocks session
         Server: Bus.publish("session.idle", {sessionID})
         Client: Receives "session.idle" event ⭐

         👉 THIS IS WHEN YOU FETCH MESSAGES!
```

---

## Why Your Event Demo Didn't Show Messages

Looking at your output:
```
[10.393s] Event #61
Type: session.idle
→ ⭐ SESSION IDLE - AI FINISHED!
   (This is when you should fetch messages)
```

Notice: **No SessionID printed!**

The issue: `session.idle` event might not include `SessionID` field, or it's in `event.Data` instead.

**Fix:** Check if SessionID is in the Data field:

```go
case "session.idle":
    fmt.Println("   → ⭐ SESSION IDLE - AI FINISHED!")

    // Try to get sessionID from event or data
    sessionID := event.SessionID
    if sessionID == "" && event.Data != nil {
        // SessionID might be in Data
        if dataMap, ok := event.Data.(map[string]interface{}); ok {
            if sid, ok := dataMap["sessionID"].(string); ok {
                sessionID = sid
            }
        }
    }

    if sessionID != "" {
        // Fetch messages...
    }
```

---

## Complete SSE Integration for PUKU CLI

Here's how to use SSE in your TUI:

```go
func SendToAIViaSDK(message string) tea.Cmd {
    return func() tea.Msg {
        ctx := context.Background()

        // 1. Send the prompt
        _, err := sdkClient.Session.Prompt(ctx, currentSession.ID,
            pukucode.SessionPromptParams{
                Parts: []pukucode.MessagePart{
                    {Type: "text", Text: message},
                },
            })
        if err != nil {
            return types.ErrorMsg("Failed to send: " + err.Error())
        }

        // 2. Subscribe to events
        stream, err := sdkClient.Event.Subscribe(ctx)
        if err != nil {
            return types.ErrorMsg("Failed to subscribe: " + err.Error())
        }
        defer stream.Close()

        // 3. Wait for session.idle event
        for stream.Next() {
            event := stream.Current()

            // Filter events for our session
            if event.SessionID != currentSession.ID {
                continue
            }

            // Wait for session.idle
            if event.Type == "session.idle" {
                break // AI is done!
            }
        }

        // 4. Fetch and return messages
        messages, err := sdkClient.Session.Messages(ctx, currentSession.ID,
            pukucode.SessionMessagesParams{})
        if err != nil {
            return types.ErrorMsg("Failed to fetch: " + err.Error())
        }

        // 5. Extract text from messages
        var responseText string
        for i := len(messages) - 1; i >= 0; i-- {
            if messages[i].Role == "assistant" {
                for _, part := range messages[i].Parts {
                    if part.Type == "text" && part.Text != "" {
                        responseText += part.Text
                    }
                }
                break
            }
        }

        return types.ResponseMsg(responseText)
    }
}
```

---

## Key Concepts Summary

### 1. **SSE is a Persistent HTTP Connection**
- One HTTP request, server keeps connection open
- Server writes events as plain text
- Client parses the text stream

### 2. **Events Are Just Structured Text**
```
event: <event-type>
data: <json-data>

```

### 3. **The Event Bus Pattern**
```
Server Code → Bus.publish() → SSE connections → Client code
```

### 4. **Why SSE Instead of Polling**

**Polling (what we tried first):**
- Make request → wait 2s → check response → repeat
- Problem: AI might finish at 1.5s or 10s, timing is unpredictable

**SSE (what we should use):**
- Subscribe once → wait for `session.idle` event
- Server tells you exactly when AI finishes
- No wasted requests, instant notification

---

## Analogy: Pizza Delivery

### Polling = Calling Pizza Shop Every 5 Minutes
```
You: "Is my pizza ready?"
Shop: "No"
[Wait 5 minutes]
You: "Is my pizza ready?"
Shop: "No"
[Wait 5 minutes]
You: "Is my pizza ready?"
Shop: "Yes, it's ready!"
```

### SSE = Shop Calls You When Ready
```
You: "I want to order pizza, call me when ready"
Shop: "OK, will call you"
[You do other things]
Shop: *calls* "Pizza is ready!"
You: "Great, I'll pick it up!"
```

**SSE is like getting a phone call when your pizza is ready - much better than calling every 5 minutes!**

---

## Testing the Fixed Demo

Run the updated event_demo.go and look for:

```
[10.393s] Event #61
Type: session.idle
→ ⭐ SESSION IDLE - AI FINISHED!
   (This is when you should fetch messages)
   DEBUG: SessionID = 'ses_5447557b...'  👈 Should see this!

📥 Fetching messages from session...
   ✅ Got 2 messages

   Message 1 [user] ID: msg_xxxxx...
      Part 1 [text]: Hello! can you tell me...

   Message 2 [assistant] ID: msg_xxxxx...
      Part 1 [text]: I'm currently in the directory...
      Part 2 [tool]: Write
      Part 3 [text]: I've created demo.txt...
```

If you see messages, SSE is working perfectly! 🎉

---

## Summary

**SSE Streaming is:**
✅ A persistent HTTP connection
✅ Server pushes events in real-time
✅ Much more efficient than polling
✅ The correct way to get AI responses

**How it works:**
1. Client subscribes → opens persistent connection
2. Server generates events → writes to connection
3. Client receives events → reacts in real-time
4. `session.idle` event → time to fetch messages

**Next step:** Run the fixed event_demo.go to see messages appear! 🚀
