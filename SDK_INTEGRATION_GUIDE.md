# PUKU CLI - SDK Integration Guide

## ✅ Integration Complete!

PUKU CLI now uses the **PukuCode Go SDK** instead of making direct HTTP calls to OpenRouter!

## Architecture

```
┌────────────────────────────────────────┐
│ PUKU CLI (Go)                          │
│ - Bubble Tea TUI                       │
│ - Uses PukuCode Go SDK                 │
│ - Falls back to direct API if needed   │
└────────────────────────────────────────┘
         ↓ (via SDK)
┌────────────────────────────────────────┐
│ PukuCode Server (TypeScript/Bun)      │
│ - Session management                   │
│ - Message handling                     │
│ - Multi-provider support               │
└────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────┐
│ AI Providers                           │
│ - Anthropic, OpenAI, Groq, etc.       │
└────────────────────────────────────────┘
```

## Changes Made

### 1. Added SDK Dependency
- **File:** `go.mod`
- Added `github.com/pukucode/pukucode-sdk-go` with local replace directive
- Dependencies automatically managed

### 2. Created SDK Client Wrapper
- **File:** `internal/api/sdk_client.go`
- `InitSDKClient()` - Initializes connection to PukuCode server
- `SendToAIViaSDK()` - Sends messages using SDK instead of raw HTTP
- Automatic session creation and management

### 3. Updated Main Entry Point
- **File:** `main.go`
- Auto-connects to PukuCode server on startup
- Shows connection status and session ID
- Gracefully falls back if server unavailable

### 4. Modified Message Handler
- **File:** `internal/ui/views/handlers.go`
- Prefers SDK when available
- Falls back to direct OpenRouter API if needed

## How to Use

### Step 1: Start PukuCode Server

In a **separate terminal**:

```bash
cd terminal-ai-assistant/packages/pukucode
bun run dev
```

You should see:
```
PukuCode server running on http://localhost:3000
```

### Step 2: Run PUKU CLI

```bash
cd terminal-ai-assistant
go build -o puku.exe .
./puku.exe
```

You should see:
```
Starting PUKU CLI...
Connecting to PukuCode server...
✅ Connected to PukuCode server
📝 Session created: <session-id>
App initialized successfully
Starting TUI program...
```

### Step 3: Chat!

Type your message and press Enter. The message will:
1. Go through the PukuCode SDK
2. Get sent to the PukuCode server
3. Be routed to your configured AI provider
4. Return the response to the TUI

## Configuration

### Environment Variables

```bash
# Set PukuCode server URL (default: http://localhost:3000)
export PUKUCODE_BASE_URL="http://localhost:3000"

# Then run PUKU
./puku.exe
```

### Server Setup

Make sure you've configured authentication in PukuCode:

```bash
cd packages/pukucode

# Set up Anthropic (recommended)
bun run src/index.ts auth login --provider anthropic --key sk-ant-xxx

# Or OpenAI
bun run src/index.ts auth login --provider openai --key sk-xxx

# Or any other provider
bun run src/index.ts auth login --provider <provider> --key <key>
```

## Testing the Integration

### Test 1: Basic Message

1. Start server: `cd packages/pukucode && bun run dev`
2. Run PUKU: `./puku.exe`
3. Type: "What is 2+2?"
4. Press Enter
5. Wait for response (should appear in ~2-5 seconds)

### Test 2: Session Persistence

Messages are now stored in server-side sessions. You can:
- View session in PukuCode console
- Resume sessions later
- Export chat history

### Test 3: Fallback Mode

1. **Don't** start the server
2. Run PUKU: `./puku.exe`
3. You'll see: "Warning: Could not connect to PukuCode server"
4. TUI still works with direct OpenRouter API

## How It Works

### SDK Flow

```go
// In internal/api/sdk_client.go

// 1. Create session on startup
session, err := sdkClient.Session.New(ctx, pukucode.SessionNewParams{
    Title: pukucode.F("PUKU CLI Chat"),
})

// 2. Send message when user presses Enter
msg, err := sdkClient.Session.Prompt(ctx, currentSession.ID, pukucode.SessionPromptParams{
    Parts: []pukucode.MessagePart{
        {Type: "text", Text: message},
    },
})

// 3. Fetch response
messages, err := sdkClient.Session.Messages(ctx, currentSession.ID, pukucode.SessionMessagesParams{})

// 4. Extract latest assistant message
for i := len(messages) - 1; i >= 0; i-- {
    if messages[i].Role == "assistant" {
        // Got the response!
    }
}
```

### Type Safety

```go
// Before (raw HTTP):
requestBody := map[string]interface{}{
    "model": "gpt-3.5-turbo",
    "messages": []map[string]string{...},
}

// After (SDK):
pukucode.SessionPromptParams{
    Parts: []pukucode.MessagePart{
        {Type: "text", Text: message},  // Type-checked!
    },
}
```

## Benefits of SDK Integration

| Feature | Before (Direct API) | After (SDK) |
|---------|-------------------|-------------|
| **Type Safety** | ❌ Manual JSON | ✅ Compile-time checking |
| **Error Handling** | ❌ Parse HTTP errors | ✅ Structured errors |
| **Session Management** | ❌ In-memory only | ✅ Server-side persistence |
| **Multi-Provider** | ❌ OpenRouter only | ✅ All providers |
| **Authentication** | ❌ Manual API key | ✅ SDK auth service |
| **Retries** | ❌ Manual | ✅ Automatic |
| **SSE Streaming** | ❌ Manual parsing | ✅ Built-in support |

## Current Limitations & Future Improvements

### Current Implementation
- ✅ Session creation
- ✅ Sending prompts
- ✅ Receiving responses
- ⚠️  Polling for responses (waits 2-5 seconds)

### Future Enhancements
- [ ] **SSE Streaming** - Use `client.Event.Subscribe()` for real-time responses
- [ ] **Session Switching** - List and switch between sessions
- [ ] **File Operations** - Use `client.File` for file browsing
- [ ] **Multi-Session** - Support multiple chat sessions
- [ ] **Better Error Display** - Show SDK errors in TUI

## Troubleshooting

### "Could not connect to PukuCode server"
**Solution:** Make sure server is running:
```bash
cd packages/pukucode && bun run dev
```

### "Timeout waiting for AI response (waited 30s)"
**This was the main issue!** The session was created without specifying a model.

**Root cause:** When you create a session without the `Model` parameter, PukuCode server doesn't know which AI provider to use, so no response ever comes.

**Solution (already fixed):** The latest code now:
1. Calls `Config.Providers()` to get available models
2. Automatically selects a model (prefers anthropic/claude, falls back to openai)
3. Creates session WITH the model parameter
4. Shows which model is being used

**To verify the fix:**
```bash
# Rebuild PUKU CLI
cd terminal-ai-assistant
go build -o puku.exe .

# Run and check for this line:
./puku.exe
# Should see: "Using AI model: anthropic/claude-3-5-sonnet-20241022" (or similar)
```

**If you still see timeout:**
1. Make sure you've configured authentication:
```bash
cd packages/pukucode
bun run src/index.ts auth login --provider anthropic --key sk-ant-xxx
# Or for OpenAI:
bun run src/index.ts auth login --provider openai --key sk-xxx
```

2. Check which providers are available:
```bash
cd packages/pukucode
bun run src/index.ts models
```

3. Enable debug logging (see next section)

### Enable Debug Logging
If you're still having issues, use the debug version:

**In `internal/ui/views/handlers.go` line ~102:**
```go
// Change from:
return m, api.SendToAIViaSDK(message)

// To:
return m, api.SendToAIViaSDKDebug(message)
```

Then rebuild and run with output redirection:
```bash
go build -o puku.exe .
./puku.exe 2> debug.log

# In another terminal, watch the debug output:
tail -f debug.log
```

The debug version will show:
- Session ID being used
- When messages are sent
- How many messages are returned from the API
- What roles each message has
- Response content preview

### "No AI models available"
**Solution:** You need to configure at least one AI provider:
```bash
cd packages/pukucode

# Anthropic (recommended)
bun run src/index.ts auth login --provider anthropic --key sk-ant-xxx

# Or OpenAI
bun run src/index.ts auth login --provider openai --key sk-xxx

# Or Groq (fast and free)
bun run src/index.ts auth login --provider groq --key gsk-xxx
```

### Build Errors
**Solution:** Clean and rebuild:
```bash
go clean
go mod tidy
go build -o puku.exe .
```

## Files Changed

```
terminal-ai-assistant/
├── go.mod                              # ✅ Added SDK dependency
├── main.go                             # ✅ Initialize SDK on startup
├── internal/
│   ├── api/
│   │   ├── sdk_client.go              # ✅ NEW: SDK wrapper
│   │   └── providers.go               # Unchanged (fallback)
│   └── ui/
│       └── views/
│           └── handlers.go            # ✅ Use SDK when available
└── SDK_INTEGRATION_GUIDE.md           # ✅ This file
```

## Next Steps

To fully leverage the SDK, consider:

1. **Add SSE streaming** for real-time AI responses
2. **Use Event API** to listen for message updates
3. **Implement session list** to switch between chats
4. **Add file browser** using SDK file operations
5. **Show provider info** from SDK config

See `packages/sdk/go/example/API_REFERENCE.md` for all available SDK functions!
