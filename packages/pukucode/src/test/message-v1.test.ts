import { test, describe } from "node:test"
import { strict as assert } from "node:assert"
import z from "zod"
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi"

// Extend zod with OpenAPI before using Message schemas
extendZodWithOpenApi(z)

// Now import Message after extending Zod
import { Message } from "../session/message-v1"

describe("Message V1 Tests", () => {
  test("TextPart schema validation", () => {
    const textPart = {
      type: "text" as const,
      text: "Hello world"
    }

    const result = Message.TextPart.parse(textPart)
    assert.deepEqual(result, textPart)
  })

  test("ToolCall schema validation", () => {
    const toolCall = {
      state: "call" as const,
      toolCallId: "call_123",
      toolName: "bash",
      args: { command: "ls" }
    }

    const result = Message.ToolCall.parse(toolCall)
    assert.deepEqual(result, toolCall)
  })

  test("Complete message structure", () => {
    const message = {
      id: "msg_123",
      role: "assistant" as const,
      parts: [
        { type: "text" as const, text: "Running..." },
        {
          type: "tool-invocation" as const,
          toolInvocation: {
            state: "result" as const,
            toolCallId: "call_123",
            toolName: "bash",
            args: { command: "ls" },
            result: "file1.txt"
          }
        }
      ],
      metadata: {
        sessionID: "session_123",
        time: { created: Date.now() },
        tool: {},
        assistant: {
          system: [],
          modelID: "claude-3-sonnet",
          providerID: "anthropic",
          path: { cwd: "/test", root: "/test" },
          cost: 0.01,
          tokens: { input: 100, output: 50, reasoning: 0, cache: { read: 0, write: 0 } }
        }
      }
    }

    const result = Message.Info.parse(message)
    assert.deepEqual(result, message)
  })
})