# PukuCode SDK - Quick Start Guide

## Installation

```bash
cd packages/sdk/js
bun install
```

## Running Tests

### Basic Tests (No Server Required)
```bash
bun test test/basic.test.ts
```

### Integration Tests (Requires PukuCode)
```bash
bun test test/integration.test.ts
```

### All Tests
```bash
bun test
```

## Using the SDK

### 1. Start a PukuCode Server

First, make sure you have a PukuCode server running. You can either:

**Option A: Start manually**
```bash
cd packages/pukucode
bun run src/index.ts server --port 3000
```

**Option B: Start programmatically**
```typescript
import { createPukucodeServer } from "@pukucode/sdk"

const server = await createPukucodeServer({
  hostname: "127.0.0.1",
  port: 3000
})

// Server is now running at server.url
// Don't forget to close it when done:
// server.close()
```

### 2. Create a Client

```typescript
import { createPukucodeClient } from "@pukucode/sdk"

const client = createPukucodeClient({
  baseUrl: "http://localhost:3000"
})
```

### 3. Use the Client

```typescript
// Create a session
const session = await client.session.create()

// Send a prompt
await client.session.prompt({
  path: { id: session.data.id },
  body: {
    parts: [
      {
        type: "text",
        text: "Write a hello world function in TypeScript"
      }
    ]
  }
})

// List all sessions
const sessions = await client.session.list()
console.log(`Total sessions: ${sessions.data.length}`)
```

## Common Use Cases

### Example 1: Simple Q&A

```typescript
const client = createPukucodeClient({ baseUrl: "http://localhost:3000" })
const session = await client.session.create()

await client.session.prompt({
  path: { id: session.data.id },
  body: {
    parts: [{ type: "text", text: "Explain async/await in JavaScript" }]
  }
})
```

### Example 2: Code Review with File

```typescript
const session = await client.session.create()

await client.session.prompt({
  path: { id: session.data.id },
  body: {
    parts: [
      {
        type: "file",
        mime: "text/plain",
        url: "file://./src/app.ts",
        filename: "app.ts"
      },
      {
        type: "text",
        text: "Review this code and suggest improvements"
      }
    ]
  }
})
```

### Example 3: Batch Processing

```typescript
const server = await createPukucodeServer()
const client = createPukucodeClient({ baseUrl: server.url })

const files = ["src/util.ts", "src/helper.ts", "src/config.ts"]

const tasks = files.map(async (file) => {
  const session = await client.session.create()

  await client.session.prompt({
    path: { id: session.data.id },
    body: {
      parts: [
        {
          type: "file",
          mime: "text/plain",
          url: `file://${file}`
        },
        {
          type: "text",
          text: "Generate unit tests for this file"
        }
      ]
    }
  })
})

await Promise.all(tasks)
server.close()
```

## Running the Examples

```bash
# Run the example file
bun run example/example.ts
```

## Troubleshooting

### Port Already in Use
If you see "EADDRINUSE" error, another process is using the port. Either:
- Kill the process using that port
- Use a different port number

### Server Not Starting
Make sure PukuCode is properly installed:
```bash
cd packages/pukucode
bun install
npm install -g .
pukucode --version
```

### Authentication Issues
Some providers require API keys. Set them up:
```bash
pukucode auth login --provider anthropic --key YOUR_KEY
```

## Next Steps

- Check out the full [README.md](./README.md) for complete API documentation
- Browse [example/example.ts](./example/example.ts) for more usage patterns
- Review [test/integration.test.ts](./test/integration.test.ts) for testing examples

## API Quick Reference

### Session Operations
- `client.session.create()` - Create new session
- `client.session.list()` - List all sessions
- `client.session.get({ path: { id } })` - Get session by ID
- `client.session.update({ path: { id }, body })` - Update session
- `client.session.delete({ path: { id } })` - Delete session
- `client.session.prompt({ path: { id }, body })` - Send prompt

### Configuration
- `client.config.get()` - Get configuration
- `client.config.providers()` - List AI providers

### Application
- `client.app.agents()` - List available agents
- `client.app.log()` - Get application logs

### Files
- `client.file.list({ query })` - List files
- `client.file.read({ query: { path } })` - Read file
- `client.file.status()` - Get git status

### Project
- `client.project.current()` - Get current project info
- `client.project.list()` - List projects

---

**Ready to use!** The SDK is fully functional and tested. Happy coding! 🚀
