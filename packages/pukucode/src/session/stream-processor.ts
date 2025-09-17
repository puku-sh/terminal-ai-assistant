// ===================================================================
// STEP 6: STREAM PROCESSING

//
// This module contains the createProcessor function that handles:
// - AI model stream events (text-delta, tool-call, reasoning, etc.)
// - Tool execution and result processing
// - Error handling and stream state management
// - Part creation and updates during streaming
// ===================================================================

import type { StreamTextResult, Tool as AITool } from "ai"
import { Identifier } from "../id/id"
import { MessageV2 } from "./message-v2"
import type { ModelsDev } from "../provider/models"
import { Snapshot } from "../snapshot"
import { Permission } from "../permission"
import { Log } from "../util/log"

import { updateMessage, updatePart, getParts } from "./messages"
import { getUsage } from "./utils"

const log = Log.create({ service: "session-stream" })

// ===================================================================
// STREAM PROCESSOR FACTORY
// ===================================================================

export function createStreamProcessor(assistantMsg: MessageV2.Assistant, model: ModelsDev.Model) {
  const toolcalls: Record<string, MessageV2.ToolPart> = {}
  let snapshot: string | undefined
  let shouldStop = false

  return {
    // ===================================================================
    // PUBLIC INTERFACE
    // ===================================================================

    partFromToolCall(toolCallID: string): MessageV2.ToolPart | undefined {
      return toolcalls[toolCallID]
    },

    getShouldStop(): boolean {
      return shouldStop
    },

    // ===================================================================
    // MAIN STREAM PROCESSING
    // ===================================================================

    async process(stream: StreamTextResult<Record<string, AITool>, never>): Promise<{
      info: MessageV2.Assistant
      parts: MessageV2.Part[]
    }> {
      try {
        let currentText: MessageV2.TextPart | undefined
        let reasoningMap: Record<string, MessageV2.ReasoningPart> = {}

        for await (const value of stream.fullStream) {
          log.info("stream-event", { type: value.type })

          switch (value.type) {
            case "start":
              // Stream started
              break

            case "reasoning-start":
              if (value.id in reasoningMap) continue

              reasoningMap[value.id] = {
                id: Identifier.ascending("part"),
                messageID: assistantMsg.id,
                sessionID: assistantMsg.sessionID,
                type: "reasoning",
                text: "",
                time: { start: Date.now() },
              } as MessageV2.ReasoningPart
              break

            case "reasoning-delta":
              if (value.id in reasoningMap) {
                const part = reasoningMap[value.id]
                part.text += (value as any).text
                if (part.text) await updatePart(part)
              }
              break

            case "reasoning-end":
              if (value.id in reasoningMap) {
                const part = reasoningMap[value.id]
                part.text = part.text.trimEnd()
                part.metadata = (value as any).providerMetadata
                part.time = {
                  ...part.time,
                  end: Date.now(),
                }
                await updatePart(part)
                delete reasoningMap[value.id]
              }
              break

            case "tool-input-start":
              const part = await updatePart({
                id: toolcalls[(value as any).id]?.id ?? Identifier.ascending("part"),
                messageID: assistantMsg.id,
                sessionID: assistantMsg.sessionID,
                type: "tool",
                tool: (value as any).toolName,
                callID: (value as any).id,
                state: { status: "pending" },
              } as MessageV2.ToolPart)
              toolcalls[(value as any).id] = part as MessageV2.ToolPart
              break

            case "tool-input-delta":
              // Handle tool input streaming if needed
              break

            case "tool-input-end":
              // Handle tool input completion if needed
              break

            case "tool-call": {
              const toolCallValue = value as any
              const match = toolcalls[toolCallValue.toolCallId]
              if (match) {
                const updatedPart = await updatePart({
                  ...match,
                  tool: toolCallValue.toolName,
                  state: {
                    status: "running",
                    input: toolCallValue.input,
                    time: { start: Date.now() },
                  },
                } as MessageV2.ToolPart)
                toolcalls[toolCallValue.toolCallId] = updatedPart as MessageV2.ToolPart
              }
              break
            }

            case "tool-result": {
              const toolResultValue = value as any
              const match = toolcalls[toolResultValue.toolCallId]
              if (match && match.state.status === "running") {
                await updatePart({
                  ...match,
                  state: {
                    status: "completed",
                    input: toolResultValue.input,
                    output: toolResultValue.output.output,
                    metadata: toolResultValue.output.metadata,
                    title: toolResultValue.output.title,
                    time: {
                      start: match.state.time?.start || Date.now(),
                      end: Date.now(),
                    },
                  },
                } as MessageV2.ToolPart)
                delete toolcalls[toolResultValue.toolCallId]
              }
              break
            }

            case "tool-error": {
              const toolErrorValue = value as any
              const match = toolcalls[toolErrorValue.toolCallId]
              if (match && match.state.status === "running") {
                if (toolErrorValue.error instanceof Permission.RejectedError) {
                  shouldStop = true
                }
                await updatePart({
                  ...match,
                  state: {
                    status: "error",
                    input: toolErrorValue.input,
                    error: toolErrorValue.error.toString(),
                    metadata: toolErrorValue.error instanceof Permission.RejectedError
                      ? toolErrorValue.error.metadata
                      : undefined,
                    time: {
                      start: match.state.time?.start || Date.now(),
                      end: Date.now(),
                    },
                  },
                } as MessageV2.ToolPart)
                delete toolcalls[toolErrorValue.toolCallId]
              }
              break
            }

            case "error":
              throw (value as any).error

            case "start-step":
              await updatePart({
                id: Identifier.ascending("part"),
                messageID: assistantMsg.id,
                sessionID: assistantMsg.sessionID,
                type: "step-start",
              } as MessageV2.Part)
              snapshot = await Snapshot.track()
              break

            case "finish-step":
              const stepValue = value as any
              const usage = getUsage(model, stepValue.usage, stepValue.providerMetadata)
              assistantMsg.cost = (assistantMsg.cost || 0) + usage.cost
              assistantMsg.tokens = usage.tokens

              await updatePart({
                id: Identifier.ascending("part"),
                messageID: assistantMsg.id,
                sessionID: assistantMsg.sessionID,
                type: "step-finish",
                tokens: usage.tokens,
                cost: usage.cost,
              } as MessageV2.Part)

              await updateMessage(assistantMsg)

              if (snapshot) {
                const patch = await Snapshot.patch(snapshot)
                if (patch.files.length) {
                  await updatePart({
                    id: Identifier.ascending("part"),
                    messageID: assistantMsg.id,
                    sessionID: assistantMsg.sessionID,
                    type: "patch",
                    hash: patch.hash,
                    files: patch.files,
                  } as MessageV2.Part)
                }
                snapshot = undefined
              }
              break

            case "text-start":
              currentText = {
                id: Identifier.ascending("part"),
                messageID: assistantMsg.id,
                sessionID: assistantMsg.sessionID,
                type: "text",
                text: "",
                time: { start: Date.now() },
              } as MessageV2.TextPart
              break

            case "text-delta":
              if (currentText) {
                currentText.text += (value as any).text
                if (currentText.text) await updatePart(currentText)
              }
              break

            case "text-end":
              if (currentText) {
                currentText.text = currentText.text.trimEnd()
                currentText.time = {
                  start: currentText.time?.start || Date.now(),
                  end: Date.now(),
                }
                await updatePart(currentText)
              }
              currentText = undefined
              break

            case "finish":
              assistantMsg.time.completed = Date.now()
              await updateMessage(assistantMsg)
              break

            default:
              log.info("unhandled-stream-event", { type: (value as any).type, value })
              continue
          }
        }
      } catch (e) {
        log.error("stream-processing-error", { error: e })
        await this.handleError(e, assistantMsg)
      }

      // Cleanup any incomplete tool calls
      await this.cleanupToolCalls(assistantMsg)

      // Get final parts
      const parts = await getParts(assistantMsg.id)

      // Mark as completed
      assistantMsg.time.completed = Date.now()
      await updateMessage(assistantMsg)

      return { info: assistantMsg, parts }
    },

    // ===================================================================
    // ERROR HANDLING
    // ===================================================================

    async handleError(error: any, assistantMsg: MessageV2.Assistant): Promise<void> {
      switch (true) {
        case error instanceof DOMException && error.name === "AbortError":
          assistantMsg.error = new MessageV2.AbortedError(
            { message: error.message },
            { cause: error }
          ).toObject()
          break

        case MessageV2.OutputLengthError.isInstance(error):
          assistantMsg.error = error
          break

        case error.name === "LoadAPIKeyError":
          assistantMsg.error = new MessageV2.AuthError(
            {
              providerID: model.id,
              message: error.message,
            },
            { cause: error }
          ).toObject()
          break

        case error instanceof Error:
          assistantMsg.error = {
            name: "UnknownError",
            message: error.toString(),
            stack: error.stack,
          }
          break

        default:
          assistantMsg.error = {
            name: "UnknownError",
            message: JSON.stringify(error),
          }
      }

      // Emit error event
      // Note: In modular version, would use proper event system
      log.error("session-error", {
        sessionID: assistantMsg.sessionID,
        error: assistantMsg.error,
      })
    },

    // ===================================================================
    // CLEANUP
    // ===================================================================

    async cleanupToolCalls(assistantMsg: MessageV2.Assistant): Promise<void> {
      const parts = await getParts(assistantMsg.id)

      for (const part of parts) {
        if (part.type === "tool" &&
            'state' in part &&
            part.state.status !== "completed" &&
            part.state.status !== "error") {
          await updatePart({
            ...part,
            state: {
              status: "error",
              error: "Tool execution aborted",
              time: {
                start: Date.now(),
                end: Date.now(),
              },
              input: {},
            },
          } as MessageV2.ToolPart)
        }
      }
    },
  }
}