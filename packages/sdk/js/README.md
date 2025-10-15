# @pukucode/sdk

TypeScript/JavaScript SDK for PukuCode - A terminal AI assistant with multi-provider support.

## Installation

```bash
# Using npm
npm install @pukucode/sdk

# Using bun
bun add @pukucode/sdk

# Using pnpm
pnpm add @pukucode/sdk
```

## Quick Start

### Basic Usage with Existing Server

```typescript
import { createPukucodeClient } from "@pukucode/sdk"

// Connect to a running PukuCode server
const client = createPukucodeClient({
  baseUrl: "http://localhost:3000",
})

// Create a new session
const session = await client.session.create()

// Send a prompt
await client.session.prompt({
  path: { id: session.data.id },
  body: {
    parts: [
      {
        type: "text",
        text: "Hello! Please help me write a TypeScript function.",
      },
    ],
  },
})

// List all sessions
const sessions = await client.session.list()
console.log(`Total sessions: ${sessions.data.length}`)
```

### Starting a Server Programmatically

```typescript
import { createPukucodeServer, createPukucodeClient } from "@pukucode/sdk"

// Start a PukuCode server
const server = await createPukucodeServer({
  hostname: "127.0.0.1",
  port: 3000,
  timeout: 15000,
})

console.log(`Server running at: ${server.url}`)

// Create a client connected to the server
const client = createPukucodeClient({
  baseUrl: server.url,
})

// Use the client...
const session = await client.session.create()

// Clean up when done
server.close()
```

## Features

- ✅ **Full Type Safety** - Complete TypeScript support with generated types
- ✅ **Session Management** - Create, update, list, and remove sessions
- ✅ **Multi-Part Prompts** - Send text, files, and other content types
- ✅ **Provider Support** - Access multiple AI providers (Anthropic, OpenAI, Google, etc.)
- ✅ **Configuration** - Manage agents, models, and server settings
- ✅ **File Operations** - Read and list project files
- ✅ **Server Management** - Programmatically start and stop PukuCode servers

## API Reference

### Client Creation

#### `createPukucodeClient(config?)`

Creates a PukuCode client instance.

**Parameters:**
- `config` (optional): Client configuration
  - `baseUrl`: Base URL of the PukuCode server (default: `http://localhost:3000`)
  - `fetch`: Custom fetch implementation

**Returns:** `PukucodeClient` instance

**Example:**
```typescript
const client = createPukucodeClient({
  baseUrl: "http://localhost:3000",
})
```

### Server Management

#### `createPukucodeServer(options?)`

Starts a new PukuCode server instance.

**Parameters:**
- `options` (optional): Server configuration
  - `hostname`: Server hostname (default: `127.0.0.1`)
  - `port`: Server port (default: `3000`)
  - `timeout`: Startup timeout in ms (default: `10000`)
  - `signal`: AbortSignal for cancellation
  - `config`: PukuCode configuration object
  - `cwd`: Working directory for the server

**Returns:** Promise resolving to `{ url: string, close: () => void }`

**Example:**
```typescript
const server = await createPukucodeServer({
  hostname: "127.0.0.1",
  port: 3001,
})

// Later...
server.close()
```

### Session Operations

#### `client.session.create(options?)`

Creates a new session.

**Parameters:**
- `options` (optional):
  - `body.agent`: Agent ID to use (e.g., `"build"`)
  - `body.model`: Model ID (e.g., `"anthropic/claude-3-5-sonnet-20241022"`)

**Example:**
```typescript
const session = await client.session.create({
  body: {
    agent: "build",
    model: "anthropic/claude-3-5-sonnet-20241022",
  },
})
```

#### `client.session.list()`

Lists all sessions.

**Example:**
```typescript
const sessions = await client.session.list()
sessions.data.forEach((session) => {
  console.log(`Session ${session.id}: ${session.title}`)
})
```

#### `client.session.get({ path })`

Gets a specific session by ID.

**Parameters:**
- `path.id`: Session ID

**Example:**
```typescript
const session = await client.session.get({
  path: { id: "session_abc123" },
})
```

#### `client.session.update({ path, body })`

Updates a session.

**Parameters:**
- `path.id`: Session ID
- `body.title`: New session title
- `body.agent`: New agent ID
- `body.model`: New model ID

**Example:**
```typescript
await client.session.update({
  path: { id: session.data.id },
  body: { title: "My Project Session" },
})
```

#### `client.session.delete({ path })`

Deletes a session and all its data.

**Parameters:**
- `path.id`: Session ID

**Example:**
```typescript
await client.session.delete({
  path: { id: session.data.id },
})
```

### Prompt Operations

#### `client.session.prompt({ path, body })`

Sends a prompt to a session.

**Parameters:**
- `path.id`: Session ID
- `body.parts`: Array of message parts

**Part Types:**
- **Text**: `{ type: "text", text: string }`
- **File**: `{ type: "file", mime: string, url: string, filename?: string }`

**Example:**
```typescript
// Text only
await client.session.prompt({
  path: { id: session.data.id },
  body: {
    parts: [
      {
        type: "text",
        text: "Write a hello world function",
      },
    ],
  },
})

// With file
await client.session.prompt({
  path: { id: session.data.id },
  body: {
    parts: [
      {
        type: "file",
        mime: "text/plain",
        url: "file://./src/index.ts",
        filename: "index.ts",
      },
      {
        type: "text",
        text: "Review this code",
      },
    ],
  },
})
```

### Configuration

#### `client.config.get()`

Gets the current PukuCode configuration.

**Example:**
```typescript
const config = await client.config.get()
console.log(config.data)
```

### Provider Operations

#### `client.config.providers()`

Lists available AI providers.

**Example:**
```typescript
const providers = await client.config.providers()
providers.data.forEach((provider) => {
  console.log(`Provider: ${provider.id}`)
})
```

### Agent Operations

#### `client.app.agents()`

Lists available agents.

**Example:**
```typescript
const agents = await client.app.agents()
agents.data.forEach((agent) => {
  console.log(`Agent: ${agent.id}`)
})
```

### File Operations

#### `client.file.list({ query })`

Lists files and directories in the project.

**Parameters:**
- `query.path`: Optional path to filter files
- `query.pattern`: Optional glob pattern

**Example:**
```typescript
const files = await client.file.list({
  query: { pattern: "*.ts" },
})
files.data.forEach((file) => {
  console.log(`File: ${file.path}`)
})
```

#### `client.file.read({ query })`

Reads a file's content.

**Parameters:**
- `query.path`: File path to read

**Example:**
```typescript
const content = await client.file.read({
  query: { path: "src/index.ts" },
})
```

#### `client.file.status()`

Gets the git status of files in the project.

**Example:**
```typescript
const status = await client.file.status()
console.log(`Modified files: ${status.data.modified.length}`)
```

## Advanced Examples

### Batch Processing Files

```typescript
import { createPukucodeServer, createPukucodeClient } from "@pukucode/sdk"

const server = await createPukucodeServer()
const client = createPukucodeClient({ baseUrl: server.url })

// Process multiple files in parallel
const files = ["src/app.ts", "src/utils.ts", "src/config.ts"]

const tasks = files.map(async (file) => {
  const session = await client.session.create()

  await client.session.prompt({
    path: { id: session.data.id },
    body: {
      parts: [
        {
          type: "file",
          mime: "text/plain",
          url: `file://${file}`,
        },
        {
          type: "text",
          text: "Generate comprehensive tests for this file.",
        },
      ],
    },
  })
})

await Promise.all(tasks)
server.close()
```

### Using Custom Configuration

```typescript
const server = await createPukucodeServer({
  config: {
    agent: {
      custom: {
        name: "Custom Agent",
        model: "anthropic/claude-3-5-sonnet-20241022",
        prompt: "You are a helpful coding assistant.",
      },
    },
  },
})
```

### Error Handling

```typescript
try {
  const session = await client.session.create()
  await client.session.prompt({
    path: { id: session.data.id },
    body: {
      parts: [{ type: "text", text: "Hello!" }],
    },
  })
} catch (error) {
  console.error("Error:", error)
}
```

## Testing

Run the test suite:

```bash
bun test
```

## Development

### Regenerating the SDK

When the PukuCode server API changes, regenerate the SDK:

```bash
bun run generate
```

This will:
1. Start a temporary PukuCode server
2. Fetch the OpenAPI specification
3. Generate TypeScript types and client code
4. Format the generated code

### Building

```bash
bun run build
```

### Type Checking

```bash
bun run typecheck
```

## Requirements

- **Bun** runtime (or Node.js with appropriate polyfills)
- **PukuCode** server installed and accessible

## License

MIT

## Links

- [PukuCode Repository](https://github.com/puku-sh/pukucode)
- [Documentation](https://pukucode.dev/docs)
- [Examples](./example)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
