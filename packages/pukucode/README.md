# PukuCode

A powerful TypeScript-based terminal AI assistant built with Bun runtime.

## Quick Start

### Install Dependencies

```bash
bun install
```

### Run the Application

```bash
# Show help
bun run src/index.ts --help

# Start a conversation
bun run src/index.ts run "Hello, help me with my code"

# Continue last session
bun run src/index.ts run -c "Follow up question"

# Use specific model
bun run src/index.ts run -m "anthropic/claude-3-sonnet-20240229" "Your message"
```

## Features

- 🤖 **Multi-Provider AI Support** - Works with Anthropic Claude, OpenAI GPT, and more
- 💬 **Session Management** - Persistent conversations with session continuity
- 🛠️ **15+ Built-in Tools** - File operations, code search, web fetching, and more
- 🎯 **Real-time Feedback** - Live tool execution status and progress indicators
- 📁 **Project Integration** - Automatic project detection and context awareness
- 🔧 **Extensible Architecture** - Modular design with plugin support

## Documentation

- **[Complete Usage Guide](HOW_TO_RUN.md)** - Detailed installation and usage instructions
- **[Architecture Guide](CLAUDE.md)** - Technical documentation for developers

## Requirements

- [Bun](https://bun.sh/) v1.2.21 or later
- Optional: API keys for AI providers (Anthropic, OpenAI, etc.)

## Architecture

Built with modern TypeScript patterns:
- **Namespace Organization** - Clean modular structure
- **Dependency Injection** - Using AsyncLocalStorage for context
- **Event-Driven Design** - Real-time communication via event bus
- **Schema Validation** - Type-safe with Zod and OpenAPI integration
