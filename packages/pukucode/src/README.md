# PukuCode - Source Architecture

A TypeScript-based terminal AI assistant with modular architecture built on Bun runtime.

## 🚀 Quick Start

```bash
# Run application context test
bun src/index.ts test

# Run event bus test
bun src/index.ts event-test
```

## 📁 Directory Structure

```
src/
├── index.ts           # CLI entry point with commands
├── app/
│   └── app.ts        # Application context and state management
├── bus/
│   └── index.ts      # Event bus system
└── util/
    └── context.ts    # Context provider utility
```

## 🏗️ System Architecture Flow

![](../../../images/image.png)


---

*Built with TypeScript, Bun, Yargs, and Zod*