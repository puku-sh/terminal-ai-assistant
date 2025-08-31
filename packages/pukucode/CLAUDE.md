# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `bun install` - Install dependencies
- `bun run src/index.ts` - Run the main CLI application
- `bun run src/index.ts run [message]` - Run PukuCode with a message (primary command)
- `bun run src/index.ts run --help` - Show RunCommand help and options

### Primary Command: `run`

The main `run` command supports:
- `--continue` / `-c` - Continue the last session
- `--session <id>` / `-s <id>` - Continue specific session ID  
- `--model <provider/model>` / `-m <provider/model>` - Specify AI model (e.g., "anthropic/claude-3-sonnet-20240229")
- `--agent <name>` - Specify agent to use (build, plan, etc.)
- `--share` - Share the session automatically

### Usage Examples

```bash
# Basic conversation
bun run src/index.ts run "Help me analyze this codebase"

# Continue last session
bun run src/index.ts run -c "Follow up question"

# Use specific model
bun run src/index.ts run -m "anthropic/claude-3-sonnet-20240229" "Your message"

# Pipe input
cat file.ts | bun run src/index.ts run "Explain this code"
```

### Test Commands

- `bun run src/index.ts session-test` - Test session management
- `bun run src/index.ts provider-test` - Test provider system
- `bun run src/index.ts tool-test` - Test tool registry
- `bun run src/index.ts config-test` - Test configuration loading

## Architecture

PukuCode is a TypeScript-based terminal AI assistant built with Bun runtime. The codebase follows a modular namespace pattern with dependency injection using async local storage. It integrates session management, AI provider systems, and tool execution capabilities.

### Core Components

- **App** (`src/app/app.ts`) - Main application context provider using AsyncLocalStorage for dependency injection. Manages application lifecycle, services registration, and project-specific state storage
- **Bus** (`src/bus/index.ts`) - Event bus system for pub/sub messaging with Zod schema validation. Supports typed events, subscriptions, and wildcard listeners
- **Session** (`src/session/index.ts`) - Comprehensive session management system for conversation tracking, message handling, tool execution, and session lifecycle. Includes features like summarization, reverting, sharing, and nested sessions
- **Provider** (`src/provider/provider.ts`) - AI provider integration system supporting multiple LLM providers (Anthropic, OpenAI, Amazon Bedrock, etc.) with dynamic model loading, custom loaders, and authentication management
- **Tool Registry** (`src/tool/registry.ts`) - Tool execution framework with 15+ built-in tools including bash, edit, glob, grep, read, write, webfetch, todo management, LSP integration, and more
- **Context** (`src/util/context.ts`) - AsyncLocalStorage wrapper for dependency injection pattern used throughout the codebase
- **Config** (`src/config/config.ts`) - Configuration loader supporting JSONC format with environment variable substitution and file references
- **RunCommand** (`src/cli/cmd/run.ts`) - Primary CLI command for interacting with the AI assistant, supporting session management, model selection, and real-time tool execution feedback

### Key Architecture Patterns

1. **Namespace Organization** - All modules use TypeScript namespaces for organization
2. **Dependency Injection** - Uses AsyncLocalStorage via Context utility for service location
3. **Service Registration** - App.state() pattern for lazy-loaded singleton services with lifecycle management
4. **Event-Driven** - Bus system for decoupled communication between components
5. **Schema Validation** - Extensive use of Zod with OpenAPI extensions for type safety
6. **Session Management** - Stateful conversation tracking with message history and metadata
7. **Provider Abstraction** - Unified interface for multiple AI providers with dynamic loading
8. **Tool System** - Extensible tool execution framework with context-aware execution

### Session Management

- Sessions track conversation state, message history, and metadata
- Support for parent-child session relationships
- Message system with typed parts (text, file, tool executions)
- Event-driven updates for real-time session state changes
- In-memory storage for development (can be extended to persistent storage)

### Provider System

- Built-in support for Anthropic Claude and OpenAI GPT models
- Environment variable and API key-based authentication
- Model metadata including cost, limits, and capabilities
- Dynamic provider loading with npm package integration
- Unified model interface across different providers

### Tool System

- Comprehensive tool registry with 15+ built-in tools and typed parameter validation
- Built-in tools include: bash execution, file operations (read, write, edit, multiedit), filesystem utilities (glob, grep, ls), LSP integration (hover, diagnostics), webfetch, todo management, task delegation, and more
- Provider-specific parameter transformation for different AI providers (OpenAI, Google, Azure)
- Context-aware execution with session and message tracking
- Metadata collection and progress reporting  
- Tool execution state tracking (pending, running, completed, error)
- Real-time tool execution feedback in CLI with colored output

### Configuration System

- Supports hierarchical config loading: global → project-specific → custom
- Configuration files: `opencode.jsonc`, `opencode.json`
- Markdown-based definitions for agents (`agent/**/*.md`), commands (`command/**/*.md`)
- Auth system supports OAuth, API keys, and well-known providers
- Plugin system loads TypeScript/JavaScript files from `plugin/*.{ts,js}`
- Provider configuration with model overrides and options

### Entry Points

- `index.ts` - Simple "Hello via Bun!" placeholder  
- `src/index.ts` - Main CLI entry point with yargs-based command system
- **Primary Command**: `run [message]` - Interactive AI assistant with session management
- **Test Commands**: Various test commands for system verification
  - `session-test` - Session management operations
  - `provider-test` - Provider system integration
  - `tool-test` - Tool execution testing
  - `config-test` - Configuration loading verification

### File Structure

```
src/
├── app/app.ts               # Application context and lifecycle
├── auth/index.ts            # Authentication management  
├── bus/index.ts             # Event bus system
├── cli/                     # CLI interface and commands
│   ├── cmd/
│   │   ├── cmd.ts          # Command wrapper utilities
│   │   └── run.ts          # Primary RunCommand implementation
│   ├── bootstrap.ts        # Application bootstrapping
│   └── ui.ts               # Terminal UI utilities
├── command/index.ts         # Command template system
├── config/
│   ├── config.ts           # Configuration loading
│   └── hooks.ts            # Configuration hooks
├── global/index.ts          # Global path management
├── provider/
│   ├── provider.ts         # AI provider system
│   ├── models.ts           # Model definitions and metadata
│   └── transform.ts        # Provider-specific transformations
├── session/
│   ├── index.ts            # Comprehensive session management
│   ├── message.ts          # Basic message types
│   ├── message-v2.ts       # Advanced message system
│   └── system.ts           # System prompt management
├── tool/                    # Tool execution framework
│   ├── registry.ts         # Tool registry and management
│   ├── bash.ts             # Bash execution tool
│   ├── edit.ts             # File editing tools
│   ├── read.ts             # File reading tool
│   ├── write.ts            # File writing tool
│   ├── glob.ts             # File pattern matching
│   ├── grep.ts             # Text search tool
│   ├── webfetch.ts         # Web content fetching
│   ├── todo.ts             # Todo management tools
│   ├── task.ts             # Task delegation tool
│   └── [others]            # Additional specialized tools
├── util/                    # Shared utilities
│   ├── context.ts          # AsyncLocalStorage wrapper
│   ├── log.ts              # Logging system
│   ├── error.ts            # Named error types
│   ├── filesystem.ts       # Filesystem utilities
│   └── [others]            # Additional utilities
└── index.ts                # Main CLI entry point
```

### Dependencies

Key dependencies for the integrated systems:
- `zod` + `zod-openapi` - Schema validation and OpenAPI integration
- `ai` + `@ai-sdk/anthropic` - AI SDK for provider integration with Claude support
- `ulid` - Unique identifier generation for sessions/messages
- `remeda` - Functional programming utilities for data transformation
- `yargs` - CLI argument parsing and command management
- `gray-matter` - Markdown frontmatter parsing for configuration
- `jsonc-parser` - JSONC configuration file parsing
- `xdg-basedir` - Cross-platform config directory resolution

## Key Implementation Notes

### RunCommand Implementation

The RunCommand (`src/cli/cmd/run.ts`) is the primary user interface:

1. **Session Management**: Automatically creates new sessions or continues existing ones based on flags
2. **Model Selection**: Supports model specification via `--model provider/model` format  
3. **Real-time Feedback**: Uses event bus to show tool execution progress with colored output
4. **Agent Integration**: Supports different agent modes (build, plan, etc.)
5. **Session Sharing**: Optional session sharing with URL generation
6. **Piped Input/Output**: Supports both interactive and piped usage

### Session System Architecture

The session system (`src/session/index.ts`) provides:

- **Message Tracking**: Full conversation history with typed message parts
- **Tool Execution**: Integrated tool calls with state tracking and metadata
- **Session Lifecycle**: Create, update, delete, share, and revert operations
- **Summarization**: Automatic context summarization when approaching token limits
- **Error Handling**: Comprehensive error tracking and recovery
- **Event Integration**: Real-time updates via event bus

### Tool Execution Flow

1. Tool registry validates parameters using Zod schemas
2. Tools execute with session context and abort signals  
3. Progress updates streamed via event bus
4. Results stored in session with metadata
5. UI provides real-time feedback with tool-specific styling

### Current State

- Core architecture is implemented and functional
- Session management system is comprehensive 
- Provider system supports multiple AI services
- Tool registry has 15+ built-in tools
- CLI provides full interactive experience
- Some dependencies (Plugin, Flag, Config advanced features) are stubbed out or removed
- Ready for extension with additional tools and providers