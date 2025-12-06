# Debug Instructions - Chat Issues

## Issues to Debug
1. **User message appearing twice**
2. **AI response not showing** (even though backend is generating it)

## Debug Steps

### 1. Rebuild TUI with Debug Logging
```bash
cd terminal-ai-assistant/packages/tui
go build -o pukucode-tui.exe ./cmd/pukucode
```

### 2. Start Backend (separate terminal)
```bash
cd terminal-ai-assistant/packages/pukucode
bun run src/index.ts server -p 1337
```

### 3. Run TUI with Log Capture
```bash
cd terminal-ai-assistant/packages/tui
./pukucode-tui.exe 2> debug.log
```

### 4. Send a Test Message
1. Type: "test"
2. Press Enter
3. Wait 5 seconds
4. Press Ctrl+C to exit

### 5. Check Both Logs

**Backend Terminal - Look for:**
```
INFO event connected                           # SSE connected ✓
INFO service=bus type=message.updated publishing  # User message event
INFO service=bus type=message.updated publishing  # Assistant message event
INFO service=bus type=message.part.updated publishing  # AI response chunks
```

**debug.log - Look for:**
```
DEBUG Received event type=message.updated
DEBUG message updated event messageID=msg_... role=user
DEBUG message search result matchIndex=0 totalMessages=1
DEBUG updating existing message index=0

DEBUG Received event type=message.updated
DEBUG message updated event messageID=msg_... role=assistant
DEBUG message search result matchIndex=-1 totalMessages=1
DEBUG adding new message messageID=msg_...

DEBUG Received event type=message.part.updated
DEBUG message part updated message=msg_... part=part_... type=text
DEBUG searching for message to add part messageIndex=1 totalMessages=2
```

## What to Look For

### Issue 1: Duplicate User Message

**Expected (Good):**
```
# First message.updated for user message
matchIndex=0 totalMessages=1     # Found existing message
updating existing message         # Updates it (no duplicate)
```

**Actual (Bad - causing duplicate):**
```
# First message.updated for user message
matchIndex=-1 totalMessages=1    # NOT found
adding new message               # Adds duplicate!
```

**Diagnosis:**
- If matchIndex=-1 for user message, the IDs don't match
- Possible causes:
  - Local message has different ID than server event
  - Message comparison logic is broken
  - Event arrives before local message is added

### Issue 2: No AI Response

**Expected (Good):**
```
# message.updated for assistant message
matchIndex=-1                    # Not found (correct, it's new)
adding new message               # Adds assistant message

# message.part.updated for AI text
messageIndex=1                   # Found assistant message
```

**Actual (Bad - no response shown):**
```
# message.updated for assistant message - MISSING or matchIndex=0 (wrong)

# message.part.updated for AI text
messageIndex=-1                  # NOT found! Can't add parts!
```

**Diagnosis:**
- If assistant message event is missing, backend isn't publishing it
- If messageIndex=-1 for parts, assistant message wasn't added to app.Messages
- Check if assistant message.updated event actually creates the message

## Expected Flow (Working Correctly)

```
1. User types "test" and presses Enter
   └─ SendPrompt() adds UserMessage locally with ID "msg_001"
   └─ app.Messages = [UserMessage{ID:"msg_001"}]

2. Backend receives POST /session/{id}/message
   └─ Publishes message.updated (user) with ID "msg_001"
   └─ Creates assistant message with ID "msg_002"
   └─ Publishes message.updated (assistant) with ID "msg_002"

3. TUI receives message.updated (user, ID:"msg_001")
   └─ Searches app.Messages for ID "msg_001"
   └─ matchIndex=0 (FOUND)
   └─ Updates existing message (no duplicate)
   └─ app.Messages = [UserMessage{ID:"msg_001"}]

4. TUI receives message.updated (assistant, ID:"msg_002")
   └─ Searches app.Messages for ID "msg_002"
   └─ matchIndex=-1 (NOT FOUND - this is correct!)
   └─ Adds new AssistantMessage
   └─ app.Messages = [UserMessage{ID:"msg_001"}, AssistantMessage{ID:"msg_002"}]

5. Backend streams AI response → publishes message.part.updated
   └─ Part belongs to message ID "msg_002"

6. TUI receives message.part.updated (messageID:"msg_002", type:"text", text:"Hello...")
   └─ Searches app.Messages for message ID "msg_002"
   └─ messageIndex=1 (FOUND - the assistant message)
   └─ Adds part to message.Parts
   └─ app.Messages[1].Parts = [TextPart{Text:"Hello..."}]

7. Message component re-renders → AI response visible!
```

## Share the Logs

After running the test, please share:
1. **Backend terminal output** (all lines from when you sent "test")
2. **debug.log file contents** (especially lines with "DEBUG")

This will show us exactly where the flow is breaking!
