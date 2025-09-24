import { Decimal } from "decimal.js"
import type { LanguageModelUsage, ProviderMetadata } from "ai"
import type { ModelsDev } from "../provider/models"
import { Instance } from "../project/instance"
import { Log } from "../util/log"
import { BusyError, Event, type ChatInput } from "./types"
import { get } from "./crud"
import { Bus } from "../bus"
import type { MessageV2 } from "./message-v2"


// ===================================================================
// CONSTANTS
// ===================================================================

export const OUTPUT_TOKEN_MAX = 32_000

const parentSessionTitlePrefix = "New session - "
const childSessionTitlePrefix = "Child session - "

// ===================================================================
// TITLE UTILITIES
// ===================================================================

export function createDefaultTitle(isChild = false) {
  return (isChild ? childSessionTitlePrefix : parentSessionTitlePrefix) + new Date().toISOString()
}

export function isDefaultTitle(title: string) {
  return title.startsWith(parentSessionTitlePrefix)
}

// ===================================================================
// SESSION STATE MANAGEMENT
// ===================================================================

export const state = Instance.state(
  () => {
    const pending = new Map<string, AbortController>()
    const autoCompacting = new Map<string, boolean>()
    const queued = new Map<
      string,
      {
        input: ChatInput // ChatInput - will be imported from types
        message: MessageV2.User // MessageV2.User
        parts:  MessageV2.Part[]
        processed: boolean
        callback: (input: {  info: MessageV2.Assistant; parts: MessageV2.Part[] }) => void // MessageV2.Assistant, MessageV2.Part[]
      }[]
    >()

    return {
      pending,
      autoCompacting,
      queued,
    }
  },
  async (state) => {
    for (const [_, controller] of state.pending) {
      controller.abort()
    }
  },
)

// ===================================================================
// LOCKING UTILITIES
// ===================================================================

const log = Log.create({ service: "session" })

export function isLocked(sessionID: string) {
  return state().pending.has(sessionID)
}

export function lock(sessionID: string) {
  log.info("locking", { sessionID })
  if (state().pending.has(sessionID)) throw new BusyError(sessionID)
  const controller = new AbortController()
  state().pending.set(sessionID, controller)
  return {
    signal: controller.signal,
    async [Symbol.dispose]() {
      log.info("unlocking", { sessionID })
      state().pending.delete(sessionID)

      const isAutoCompacting = state().autoCompacting.get(sessionID) ?? false
      if (isAutoCompacting) {
        state().autoCompacting.delete(sessionID)
        return
      }

      // Note: This will need to import get function and Event from other modules
      const session = await get(sessionID)
      if (session.parentID) return
      Bus.publish(Event.Idle, { sessionID })
    },
  }
}
// export function abort(sessionID: string) {
//   const controller = state().pending.get(sessionID)
//   if (!controller) return false
//   log.info("aborting", {
//     sessionID,
//   })
//   controller.abort()
//   state().pending.delete(sessionID)
//   return true
// }
// ===================================================================
// USAGE CALCULATION
// ===================================================================

export function getUsage(model: ModelsDev.Model, usage: LanguageModelUsage, metadata?: ProviderMetadata) {
  const tokens = {
    input: usage.inputTokens ?? 0,
    output: usage.outputTokens ?? 0,
    reasoning: usage?.reasoningTokens ?? 0,
    cache: {
      write: (metadata?.["anthropic"]?.["cacheCreationInputTokens"] ??
        // @ts-expect-error
        metadata?.["bedrock"]?.["usage"]?.["cacheWriteInputTokens"] ??
        0) as number,
      read: usage.cachedInputTokens ?? 0,
    },
  }
  return {
    cost: new Decimal(0)
      .add(new Decimal(tokens.input).mul(model.cost?.input ?? 0).div(1_000_000))
      .add(new Decimal(tokens.output).mul(model.cost?.output ?? 0).div(1_000_000))
      .add(new Decimal(tokens.cache.read).mul(model.cost?.cache_read ?? 0).div(1_000_000))
      .add(new Decimal(tokens.cache.write).mul(model.cost?.cache_write ?? 0).div(1_000_000))
      .toNumber(),
    tokens,
  }
}