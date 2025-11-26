# PukuCode Go SDK Examples

This directory contains example programs demonstrating the PukuCode Go SDK.

## Prerequisites

1. Make sure PukuCode server is running:
   ```bash
   cd terminal-ai-assistant/packages/pukucode
   bun run dev
   # or
   pukucode server --port 1337
   ```

2. The server should be accessible at `http://localhost:1337`

## Running Examples

Each example is a standalone Go program. Run them from the example directory:

```bash
cd terminal-ai-assistant/packages/sdk/go/example

# Run the quick demo
go run quick_demo.go

# Run the session management demo
go run session_demo.go

# Run the configuration demo
go run config_demo.go

# Run the file operations demo
go run file_demo.go
```

## Examples Overview

### quick_demo.go
A quick demonstration of basic SDK functionality:
- Creates a session
- Gets session info
- Lists providers
- Lists sessions
- Updates session
- Lists commands
- Lists files
- Deletes session

### session_demo.go
Comprehensive session management operations:
- Creates multiple sessions
- Lists all sessions
- Updates session titles
- Gets session details
- Retrieves messages
- Sends prompts to sessions
- Deletes sessions

### config_demo.go
Configuration and provider management:
- Gets current configuration
- Lists AI providers and their models
- Lists available agents
- Lists available commands
- Shows auth status
- Demonstrates auth setting (example code)

### file_demo.go
File system operations:
- Lists files in directories
- Gets file status
- Lists projects

## Customizing the Server URL

If your server runs on a different port, modify the `baseURL` in each example:

```go
client := pukucode.NewClient(option.WithBaseURL("http://localhost:YOUR_PORT"))
```

## Example Output

Running `go run quick_demo.go` should produce output like:

```
🚀 PukuCode Go SDK Quick Demo

   Connecting to server at: http://localhost:1337

1. Creating a new session...
   ✅ Session created: abc12345-...

2. Getting session info...
   ✅ Session ID: abc12345-...
   ✅ Session Title: Go SDK Demo Session

3. Listing AI providers...
   ✅ Found 5 providers
      - anthropic
      - openai
      - google
      ... and 2 more

...

✨ Demo complete! The Go SDK is working perfectly.
```

## Troubleshooting

**Error: connection refused**
- Make sure the PukuCode server is running
- Check the port number matches your server configuration

**Error: 404 Not Found**
- Ensure you're using the correct API endpoints
- Check if the server is properly initialized

**Error: authentication required**
- Some operations may require API keys to be set
- Use `client.Auth.Set()` to configure authentication
