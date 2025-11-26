# Debugging the Timeout Issue

## Current Situation

You've explicitly set the model to `"openrouter/z-ai/glm-4.6"` which works in `session_demo.go`, but you're still getting timeout in PUKU CLI after 30 seconds.

## Possible Root Causes

### 1. **Authentication Issue**
The model requires authentication with OpenRouter. Have you configured OpenRouter credentials in PukuCode?

**Check:**
```bash
cd packages/pukucode
bun run src/index.ts auth list
```

**Expected output:**
```
Configured providers:
- openrouter: configured
```

**If not configured:**
```bash
bun run src/index.ts auth login --provider openrouter --key sk-or-v1-xxxxx
```

### 2. **Server Not Processing**
The PukuCode server might not be invoking the AI at all.

**Check server logs:**
When you send a message from PUKU CLI, watch the PukuCode server terminal. You should see:
```
[session] chatting session=ses_xxxxx
[provider] calling openrouter model=z-ai/glm-4.6
```

**If you don't see these logs**, the server isn't processing your prompt.

### 3. **Session Locked**
The session might be locked from a previous incomplete operation.

**In `processor.ts` line 244-256**, there's a lock check:
```typescript
if (isLocked(input.sessionID)) {
  return new Promise((resolve) => {
    // Queues the message instead of processing it
  })
}
```

### 4. **Model Configuration**
OpenRouter requires specific configuration that might be missing.

**Check if model exists:**
```bash
cd packages/pukucode
bun run src/index.ts models | grep "z-ai/glm-4.6"
```

## Debugging Steps

### Step 1: Enable Verbose Logging in PukuCode Server

**Edit `packages/pukucode/src/index.ts`** or set environment variable:
```bash
cd packages/pukucode
LOG_LEVEL=debug bun run dev
```

### Step 2: Use the Debug SDK Client

In PUKU CLI, switch to debug mode to see exactly what's happening.

**Edit `internal/ui/views/handlers.go` line ~102:**
```go
// Change from:
return m, api.SendToAIViaSDK(message)

// To:
return m, api.SendToAIViaSDKDebug(message)
```

**Rebuild and run with logging:**
```bash
cd terminal-ai-assistant
go build -o puku.exe .
./puku.exe 2> debug.log

# In another terminal:
tail -f debug.log
```

### Step 3: Manual Test via SDK

Create a simple test to isolate the issue:

**File: `terminal-ai-assistant/test_prompt.go`**
```go
package main

import (
	"context"
	"fmt"
	"log"
	"time"

	pukucode "github.com/pukucode/pukucode-sdk-go"
	"github.com/pukucode/pukucode-sdk-go/option"
)

func main() {
	// Create client
	client := pukucode.NewClient(option.WithBaseURL("http://localhost:1337"))
	ctx := context.Background()

	// Create session with explicit model
	fmt.Println("Creating session with openrouter/z-ai/glm-4.6...")
	session, err := client.Session.New(ctx, pukucode.SessionNewParams{
		Title: pukucode.F("Test Session"),
		Model: pukucode.F("openrouter/z-ai/glm-4.6"),
	})
	if err != nil {
		log.Fatalf("Failed to create session: %v", err)
	}
	fmt.Printf("Session created: %s\n", session.ID)

	// Send a prompt
	fmt.Println("Sending prompt...")
	msg, err := client.Session.Prompt(ctx, session.ID, pukucode.SessionPromptParams{
		Parts: []pukucode.MessagePart{
			{Type: "text", Text: "Say hello in 3 words"},
		},
	})
	if err != nil {
		log.Fatalf("Failed to send prompt: %v", err)
	}
	fmt.Printf("Prompt sent: %s\n", msg.ID)

	// Poll for response
	fmt.Println("Waiting for response...")
	for attempt := 0; attempt < 30; attempt++ {
		time.Sleep(2 * time.Second)

		messages, err := client.Session.Messages(ctx, session.ID, pukucode.SessionMessagesParams{})
		if err != nil {
			log.Fatalf("Failed to get messages: %v", err)
		}

		fmt.Printf("[Attempt %d] Total messages: %d\n", attempt+1, len(messages))

		// Print all messages
		for i, m := range messages {
			fmt.Printf("  Message %d: Role=%s, Parts=%d\n", i, m.Role, len(m.Parts))
			for j, part := range m.Parts {
				if part.Type == "text" && part.Text != "" {
					preview := part.Text
					if len(preview) > 50 {
						preview = preview[:50] + "..."
					}
					fmt.Printf("    Part %d [text]: %s\n", j, preview)
				} else {
					fmt.Printf("    Part %d [%s]\n", j, part.Type)
				}
			}
		}

		// Check for assistant response
		for i := len(messages) - 1; i >= 0; i-- {
			if messages[i].Role == "assistant" {
				for _, part := range messages[i].Parts {
					if part.Type == "text" && part.Text != "" {
						fmt.Printf("\n✅ Got response: %s\n", part.Text)
						return
					}
				}
			}
		}
	}

	fmt.Println("❌ Timeout waiting for response")
}
```

**Run it:**
```bash
go run test_prompt.go
```

**Watch the output carefully:**
- If you see "Total messages: 1" → Only user message, AI not responding
- If you see "Total messages: 2" but no text → Assistant message created but empty
- If you see tool-use parts → AI is using tools, need to wait longer

### Step 4: Check Server Response Manually

Use curl to see what the server is doing:

```bash
# Create session
curl -X POST http://localhost:1337/session \
  -H "Content-Type: application/json" \
  -d '{"title": "Test", "model": "openrouter/z-ai/glm-4.6"}'

# Note the session ID from response, then send prompt
curl -X POST http://localhost:1337/session/{SESSION_ID}/prompt \
  -H "Content-Type: application/json" \
  -d '{"parts": [{"type": "text", "text": "Hello"}]}'

# Wait 5 seconds, then get messages
curl http://localhost:1337/session/{SESSION_ID}/messages
```

## Common Issues and Solutions

### Issue 1: "Total messages: 1" (Only User Message)

**Cause:** Server not processing the prompt at all.

**Solutions:**
1. Check authentication: `bun run src/index.ts auth list`
2. Check server logs for errors
3. Verify model exists: `bun run src/index.ts models`
4. Check if session is locked (restart PukuCode server)

### Issue 2: "Total messages: 2" with Empty Assistant Message

**Cause:** Assistant message created but no content.

**Solutions:**
1. Wait longer (some models are slow)
2. Check if AI is using tools (look for tool-use parts)
3. Check server logs for API errors

### Issue 3: Messages with Tool-Use Parts

**Cause:** AI is using tools (bash, read, write, etc.) which takes time.

**Solution:** Increase timeout to 60+ seconds. Tool execution can be slow.

### Issue 4: Authentication Error in Server Logs

**Cause:** OpenRouter API key invalid or not configured.

**Solution:**
```bash
cd packages/pukucode
bun run src/index.ts auth login --provider openrouter --key YOUR_KEY
```

### Issue 5: Rate Limiting

**Cause:** OpenRouter free tier has rate limits.

**Solution:**
- Wait a minute between requests
- Or switch to a different model/provider
- Or upgrade OpenRouter plan

## Expected Behavior

When everything works correctly:

**PUKU CLI output:**
```
Starting PUKU CLI...
Connecting to PukuCode server...
Using AI model: openrouter/z-ai/glm-4.6
✅ Connected to PukuCode server
📝 Session created: ses_xxxxx

[User types: "Hello"]
[After 2-5 seconds, AI response appears]
```

**PukuCode server logs:**
```
[session] chatting session=ses_xxxxx
[provider] calling openrouter model=z-ai/glm-4.6
[session] response completed tokens=50
```

**Debug logs (debug.log):**
```
[DEBUG] Sending message: Hello
[DEBUG] Session ID: ses_xxxxx
[DEBUG] Message sent, ID: msg_xxxxx
[DEBUG] Attempt 1/15 - Fetching messages...
[DEBUG] Got 1 messages total
[DEBUG]   Message 0: Role=user, Parts=1
[DEBUG] Attempt 2/15 - Fetching messages...
[DEBUG] Got 2 messages total
[DEBUG]   Message 0: Role=user, Parts=1
[DEBUG]   Message 1: Role=assistant, Parts=1
[DEBUG] Found assistant message at index 1
[DEBUG] Got response! Length: 15
```

## Next Steps

1. **First**, verify authentication is configured
2. **Second**, enable debug mode in both PUKU CLI and PukuCode server
3. **Third**, run the `test_prompt.go` script to see raw SDK behavior
4. **Fourth**, watch server logs while sending messages
5. **Report back** with:
   - What you see in `bun run src/index.ts auth list`
   - What you see in PukuCode server logs
   - What you see in `debug.log` from PUKU CLI
   - What you see from `test_prompt.go`

This will help identify exactly where the issue is!
