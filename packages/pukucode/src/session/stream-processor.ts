import { Decimal } from "decimal.js"
import type { StreamTextResult, LanguageModelUsage, ProviderMetadata } from "ai"
import { LoadAPIKeyError } from "ai"

import { Identifier } from "../id/id"
import { Bus } from "../bus"
import { Log } from "../util/log"
import { NamedError } from "../util/error"
import { Permission } from "../permission"
import { Snapshot } from "../snapshot"
import type { ModelsDev } from "../provider/models"
import { MessageV2 } from "./message-v2"
import { Event } from "./types"
import { updateMessage, updatePart, getParts } from "./messages"
import { getUsage } from "./utils"

const log = Log.create({ service: "session" })

// ===================================================================
// STREAM PROCESSOR FACTORY
// ===================================================================

export function createStreamProcessor(assistantMsg: MessageV2.Assistant, model: ModelsDev.Model) {
  const toolcalls: Record<string, MessageV2.ToolPart> = {}
  let snapshot: string | undefined
  let shouldStop = false

  return {
    partFromToolCall(toolCallID: string) {
      return toolcalls[toolCallID]
    },
    getShouldStop() {
      return shouldStop
    },
    async process(stream: StreamTextResult<Record<string, any>, never>) {
      try {
        let currentText: MessageV2.TextPart | undefined
        let reasoningMap: Record<string, MessageV2.ReasoningPart> = {}

        for await (const value of stream.fullStream) {
          log.info("part", {
            type: value.type,
          })
          switch (value.type) {
            case "start":
              break

            case "reasoning-start":
              if (value.id in reasoningMap) {
                continue
              }
              reasoningMap[value.id] = {
                id: Identifier.ascending("part"),
                messageID: assistantMsg.id,
                sessionID: assistantMsg.sessionID,
                type: "reasoning",
                text: "",
                time: {
                  start: Date.now(),
                },
              }
              break

            case "reasoning-delta":
              if (value.id in reasoningMap) {
                const part = reasoningMap[value.id]
                part.text += value.text
                if (part.text) await updatePart(part)
              }
              break

            case "reasoning-end":
              if (value.id in reasoningMap) {
                const part = reasoningMap[value.id]
                part.text = part.text.trimEnd()
                part.metadata = value.providerMetadata
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
                id: toolcalls[value.id]?.id ?? Identifier.ascending("part"),
                messageID: assistantMsg.id,
                sessionID: assistantMsg.sessionID,
                type: "tool",
                tool: value.toolName,
                callID: value.id,
                state: {
                  status: "pending",
                },
              })
              toolcalls[value.id] = part as MessageV2.ToolPart
              break

            case "tool-input-delta":
              break

            case "tool-input-end":
              break

            case "tool-call": {
              const match = toolcalls[value.toolCallId]
              if (match) {
                const part = await updatePart({
                  ...match,
                  tool: value.toolName,
                  state: {
                    status: "running",
                    input: value.input,
                    time: {
                      start: Date.now(),
                    },
                  },
                })
                toolcalls[value.toolCallId] = part as MessageV2.ToolPart
              }
              break
            }
            case "tool-result": {
              const match = toolcalls[value.toolCallId]
              if (match && match.state.status === "running") {
                await updatePart({
                  ...match,
                  state: {
                    status: "completed",
                    input: value.input,
                    output: value.output.output,
                    metadata: value.output.metadata,
                    title: value.output.title,
                    time: {
                      start: match.state.time.start,
                      end: Date.now(),
                    },
                  },
                })
                delete toolcalls[value.toolCallId]
              }
              break
            }

            case "tool-error": {
              const match = toolcalls[value.toolCallId]
              if (match && match.state.status === "running") {
                if (value.error instanceof Permission.RejectedError) {
                  shouldStop = true
                }
                await updatePart({
                  ...match,
                  state: {
                    status: "error",
                    input: value.input,
                    error: (value.error as any).toString(),
                    metadata: value.error instanceof Permission.RejectedError ? value.error.metadata : undefined,
                    time: {
                      start: match.state.time.start,
                      end: Date.now(),
                    },
                  },
                })
                delete toolcalls[value.toolCallId]
              }
              break
            }
            case "error":
              throw value.error

            case "start-step":
              await updatePart({
                id: Identifier.ascending("part"),
                messageID: assistantMsg.id,
                sessionID: assistantMsg.sessionID,
                type: "step-start",
              })
              snapshot = await Snapshot.track()
              break

            case "finish-step":
              const usage = getUsage(model, value.usage, value.providerMetadata)
              assistantMsg.cost += usage.cost
              assistantMsg.tokens = usage.tokens
              await updatePart({
                id: Identifier.ascending("part"),
                messageID: assistantMsg.id,
                sessionID: assistantMsg.sessionID,
                type: "step-finish",
                tokens: usage.tokens,
                cost: usage.cost,
              })
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
                  })
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
                time: {
                  start: Date.now(),
                },
              }
              break

            case "text-delta":
              if (currentText) {
                currentText.text += value.text
                if (currentText.text) await updatePart(currentText)
              }
              break

            case "text-end":
              if (currentText) {
                currentText.text = currentText.text.trimEnd()
                currentText.time = {
                  start: Date.now(),
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
              log.info("unhandled", {
                ...value,
              })
              continue
          }
        }
      } catch (e) {
        log.error("", {
          error: e,
        })
        switch (true) {
          case e instanceof DOMException && e.name === "AbortError":
            assistantMsg.error = new MessageV2.AbortedError(
              { message: e.message },
              {
                cause: e,
              },
            ).toObject()
            break
          case MessageV2.OutputLengthError.isInstance(e):
            assistantMsg.error = e
            break
          case LoadAPIKeyError.isInstance(e):
            assistantMsg.error = new MessageV2.AuthError(
              {
                providerID: model.id,
                message: e.message,
              },
              { cause: e },
            ).toObject()
            break
          case e instanceof Error:
            assistantMsg.error = new NamedError.Unknown({ message: e.toString() }, { cause: e }).toObject()
            break
          default:
            assistantMsg.error = new NamedError.Unknown({ message: JSON.stringify(e) }, { cause: e })
        }
        Bus.publish(Event.Error, {
          sessionID: assistantMsg.sessionID,
          error: assistantMsg.error,
        })
      }
      const p = await getParts(assistantMsg.id)
      for (const part of p) {
        if (part.type === "tool" && part.state.status !== "completed" && part.state.status !== "error") {
          updatePart({
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
          })
        }
      }
      assistantMsg.time.completed = Date.now()
      await updateMessage(assistantMsg)
      return { info: assistantMsg, parts: p }
    },
  }
}