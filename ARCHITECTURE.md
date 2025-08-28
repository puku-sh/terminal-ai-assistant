# Chat2 - Modular Architecture

This project has been refactored into a clean, modular architecture similar to OpenCode for better maintainability and understanding.

## Directory Structure

```
Chat2/
├── main.go                    # Application entry point
├── go.mod                     # Go module definition
├── internal/                  # Internal application packages
│   ├── app/                   # Application core & coordination
│   │   └── app.go            # Main application setup and lifecycle
│   │
│   ├── api/                   # AI provider integrations
│   │   └── providers.go      # API provider implementations (OpenRouter, etc.)
│   │
│   ├── chat/                  # Chat session & message management
│   │   └── session.go        # Chat session logic and message handling
│   │
│   ├── commands/              # Command system & handlers
│   │   └── commands.go       # Command registry and implementations (/help, /theme, etc.)
│   │
│   ├── config/                # Configuration management
│   │   └── config.go         # API key loading and configuration
│   │
│   ├── themes/                # Theme system
│   │   └── themes.go         # Theme definitions and management
│   │
│   ├── types/                 # Shared types & interfaces
│   │   └── messages.go       # Type definitions, interfaces, and global state
│   │
│   └── ui/                    # UI components & rendering
│       ├── ascii.go          # ASCII art generation
│       ├── styles.go         # UI styling definitions
│       ├── components/       # Reusable UI components
│       │   ├── input.go      # Text input component
│       │   └── sidebar.go    # Sidebar component
│       └── views/            # Main UI views
│           ├── main.go       # Main view implementation
│           ├── handlers.go   # Input/keyboard handling
│           ├── render.go     # Main rendering logic
│           └── render_helpers.go # Rendering helper functions
└── README.md
└── ARCHITECTURE.md           # This file
```

## Module Responsibilities

### `/app` - Application Core
- **Purpose**: Coordinates the entire application lifecycle
- **Key Components**:
  - `App` struct: Main application instance
  - Initialization and startup logic
  - Program lifecycle management

### `/api` - AI Provider Integrations  
- **Purpose**: Handles communication with external AI services
- **Key Components**:
  - Provider definitions and configurations
  - API request/response handling
  - Streaming response management
  - Error handling for external services

### `/chat` - Session Management
- **Purpose**: Manages chat sessions and message history
- **Key Components**:
  - `Session` struct: Chat session state
  - Message storage and retrieval
  - Message filtering and formatting
  - Session persistence (future)

### `/commands` - Command System
- **Purpose**: Implements the slash command system
- **Key Components**:
  - Command registry and routing
  - Individual command implementations
  - Command validation and execution
  - Help system integration

### `/config` - Configuration
- **Purpose**: Handles application configuration
- **Key Components**:
  - API key management
  - Environment variable loading
  - Configuration validation

### `/themes` - Theme System
- **Purpose**: Manages UI themes and styling
- **Key Components**:
  - Theme definitions (colors, styles)
  - Theme switching logic
  - Theme preview generation

### `/types` - Shared Types
- **Purpose**: Defines common types and interfaces
- **Key Components**:
  - Message types for Bubble Tea
  - UI model interface definitions  
  - Global state management
  - Type aliases for common patterns

### `/ui` - User Interface
- **Purpose**: Handles all UI rendering and interaction
- **Key Components**:
  - **`components/`**: Reusable UI elements (input fields, sidebar)
  - **`views/`**: Main application views and rendering logic
  - **`styles.go`**: Centralized styling definitions
  - **`ascii.go`**: ASCII art generation

## Key Design Principles

1. **Separation of Concerns**: Each module has a clear, single responsibility
2. **Interface-Based Design**: Uses interfaces to decouple components
3. **Dependency Injection**: Dependencies are injected rather than hard-coded
4. **Testability**: Each module can be tested independently
5. **Maintainability**: Clear structure makes the code easy to understand and modify

## Benefits of This Architecture

- **Modularity**: Easy to add new features without affecting existing code
- **Testability**: Each component can be unit tested independently  
- **Maintainability**: Clear separation makes debugging and updates easier
- **Scalability**: New providers, themes, or commands can be added easily
- **Code Reusability**: Components can be reused across different parts of the app

## Similar to OpenCode

This architecture follows similar patterns to OpenCode:
- Clear module boundaries with specific responsibilities
- Interface-driven design for better testability
- Centralized configuration and theming
- Modular command system
- Component-based UI architecture
- Clean separation between business logic and presentation

The result is a codebase that is easier to understand, modify, and extend while maintaining the same functionality as the original monolithic structure.