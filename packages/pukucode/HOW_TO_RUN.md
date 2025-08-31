# How to Run PukuCode

PukuCode is a powerful TypeScript-based terminal AI assistant built with Bun runtime. This guide explains how to install, configure, and run the application.

## Prerequisites

- **Bun** - Fast all-in-one JavaScript runtime
- **Node.js** (optional, for TypeScript compilation)
- **Git** (recommended for project management features)

## Installation

### 1. Install Dependencies

```bash
bun install
```

This will install all required packages including:
- AI SDK packages (`ai`, `@ai-sdk/anthropic`)
- Core dependencies (`zod`, `yargs`, `ulid`, etc.)
- Tool dependencies (`turndown`, `diff`, `isomorphic-git`, etc.)

### 2. Set Up Environment Variables (Required for AI functionality)

You need to set up API keys for at least one AI provider. Choose from:

#### Option 1: Export Environment Variables
```bash
# Anthropic Claude (recommended)
export ANTHROPIC_API_KEY=sk-ant-api03-your-key-here

# OR Groq (fast and affordable)
export GROQ_API_KEY=gsk_your-groq-key-here

# OR OpenAI
export OPENAI_API_KEY=sk-your-openai-key-here
```

#### Option 2: Create a `.env` file in the project root:
```bash
# Choose one or more providers:

# Anthropic Claude - Get key from https://console.anthropic.com/
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here

# Groq - Get key from https://console.groq.com/
GROQ_API_KEY=gsk_your-groq-key-here

# OpenAI - Get key from https://platform.openai.com/
OPENAI_API_KEY=sk-your-openai-key-here

# Optional Configuration
PUKUCODE_AUTO_SHARE=false
PUKUCODE_DEBUG=false
NODE_ENV=development
```

### 3. Get API Keys

**Anthropic (Claude):**
1. Go to https://console.anthropic.com/
2. Create an account and add credits
3. Generate an API key (starts with `sk-ant-api03-`)

**Groq (Fast Llama/Mixtral models):**
1. Go to https://console.groq.com/
2. Create an account (free tier available)
3. Generate an API key (starts with `gsk_`)

**OpenAI (GPT models):**
1. Go to https://platform.openai.com/
2. Create an account and add credits
3. Generate an API key (starts with `sk-`)

## Basic Usage

### Run the CLI

```bash
bun run src/index.ts
```

This shows the main help screen with available commands.

### Primary Command: `run`

The main way to interact with PukuCode is through the `run` command:

```bash
# Basic usage - start a conversation
bun run src/index.ts run "Hello, can you help me analyze my code?"

# Show all run command options
bun run src/index.ts run --help
```

## Command Options

### Basic Message

```bash
# Send a simple message
bun run src/index.ts run "What files are in this project?"

# Multi-word messages (quotes optional)
bun run src/index.ts run Explain the main application architecture
```

### Session Management

```bash
# Continue the last session
bun run src/index.ts run --continue "Follow up question"
bun run src/index.ts run -c "Follow up question"

# Continue a specific session by ID
bun run src/index.ts run --session session_id_here "Continue this session"
bun run src/index.ts run -s session_id_here "Continue this session"
```

### Model Selection

```bash
# Use specific AI model (format: provider/model)
bun run src/index.ts run --model "anthropic/claude-3-5-sonnet-20241022" "Your message"
bun run src/index.ts run -m "groq/llama-3.1-8b-instant" "Your message"
bun run src/index.ts run -m "openai/gpt-4o" "Your message"

# Available providers and models:
# - anthropic: claude-3-5-sonnet-20241022, claude-3-haiku-20240307
# - groq: llama-3.1-8b-instant, mixtral-8x7b-32768, gemma2-9b-it, moonshotai/kimi-k2-instruct
# - openai: gpt-4o, gpt-4o-mini
```

### Agent Configuration

```bash
# Use specific agent mode
bun run src/index.ts run --agent build "Help me implement a feature"
bun run src/index.ts run --agent plan "Create a development plan"
```

### Session Sharing

```bash
# Share the session automatically
bun run src/index.ts run --share "Create a shareable conversation"
```

### Combined Options

```bash
# Use multiple options together
bun run src/index.ts run \
  --model "groq/llama-3.1-70b-versatile" \
  --agent build \
  --share \
  "Help me refactor this TypeScript code"
```

## Advanced Usage

### Piped Input

PukuCode supports piped input for processing files or command output:

```bash
# Process file content
cat src/index.ts | bun run src/index.ts run "Explain this code"

# Process command output
ls -la | bun run src/index.ts run "Analyze these files"
```

### Logging and Debugging

```bash
# Enable detailed logging
bun run src/index.ts --print-logs run "Your message"

# Set log level
bun run src/index.ts --log-level DEBUG run "Your message"

# Available log levels: DEBUG, INFO, WARN, ERROR
```

### Version Information

```bash
# Show version
bun run src/index.ts --version
bun run src/index.ts -v
```

## Features

### Built-in Tools

PukuCode includes 15+ built-in tools that are automatically available during conversations:

- **File Operations**: read, write, edit, multiedit
- **Code Search**: glob, grep, ls
- **Development**: bash execution, LSP integration
- **Web**: webfetch for online content
- **Organization**: todo management, task delegation
- **Analysis**: diff, patch creation

### Real-time Feedback

The CLI provides real-time feedback during AI processing:
- Colored tool execution status
- Progress indicators for long-running operations
- Error handling with detailed messages

### Session Persistence

- Sessions are automatically saved and can be resumed
- Full conversation history is maintained
- Session sharing capabilities (when configured)

## Configuration

### Project-level Config

Create configuration files in your project:

- `pukucode.jsonc` - Main configuration
- `pukucode.json` - Alternative JSON format

Example configuration:
```jsonc
{
  "model": "anthropic/claude-3-sonnet-20240229",
  "share": "auto", // "auto", "manual", or "disabled"
  "provider": {
    "anthropic": {
      "options": {
        "maxRetries": 3
      }
    }
  },
  "disabled_providers": ["openrouter"]
}
```

### Global Config

Configuration is stored in XDG standard directories:
- Linux/macOS: `~/.config/pukucode/`
- Windows: `%APPDATA%/pukucode/`

## Troubleshooting

### Common Issues

1. **Module not found errors**: Run `bun install` to ensure all dependencies are installed
2. **API key errors**: Set up your AI provider API keys in environment variables
3. **Permission errors**: Ensure Bun has proper file system permissions
4. **TypeScript errors**: The project uses Bun's built-in TypeScript support

### Getting Help

```bash
# General help
bun run src/index.ts --help

# Command-specific help
bun run src/index.ts run --help

# Version information
bun run src/index.ts --version
```

### Test Commands

The application includes test commands for verifying functionality:

```bash
# Test session management
bun run src/index.ts session-test

# Test provider system
bun run src/index.ts provider-test

# Test tool registry
bun run src/index.ts tool-test

# Test configuration loading
bun run src/index.ts config-test
```

## Development

### Running in Development Mode

```bash
# Enable debug logging
PUKUCODE_DEBUG=true bun run src/index.ts run "Your message"

# Watch mode (if using TypeScript compiler)
bun --watch run src/index.ts run "Your message"
```

### Building for Production

The project uses Bun's runtime directly, so no build step is required. For distribution:

```bash
# Create executable (if needed)
bun build src/index.ts --outfile pukucode --target bun

# Run the built executable
./pukucode run "Hello world"
```

## Examples

### Basic Usage Examples

```bash
# Code analysis
bun run src/index.ts run "Analyze the architecture of this project"

# Code generation
bun run src/index.ts run "Create a TypeScript interface for user data"

# Debugging help
bun run src/index.ts run "Help me debug this error message"

# Documentation
bun run src/index.ts run "Generate documentation for the main functions"
```

### Advanced Workflow Examples

```bash
# Multi-step development session
bun run src/index.ts run "Let's implement a new feature for user authentication"
bun run src/index.ts run -c "Now add validation to the login form"
bun run src/index.ts run -c "Create unit tests for the auth functions"

# Code review session
bun run src/index.ts run --agent build "Review this pull request for potential issues"

# Architecture planning
bun run src/index.ts run --agent plan "Design a microservices architecture for this app"
```

## Support

For issues, feature requests, or contributions, please refer to the project's documentation or repository.