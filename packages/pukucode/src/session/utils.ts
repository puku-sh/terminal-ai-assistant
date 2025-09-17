// ===================================================================
// STEP 2: UTILITIES
// Extracted from src/session/index.ts lines 79-96, 173-200, 1298-1305, 1823-1881
//
// This module contains utility functions and helper methods.
// Dependencies: types.ts, external libraries only
// ===================================================================

import { Decimal } from "decimal.js"
import type { LanguageModelUsage, ProviderMetadata } from "ai"
import type { ModelsDev } from "../provider/models"
import { Log } from "../util/log"

import type { SessionState} from "./types"


const log = Log.create({ service: "session" })

// ===================================================================
// TITLE GENERATION UTILITIES
// ===================================================================

const parentSessionTitlePrefix = "New session - "
const childSessionTitlePrefix = "Child session - "

export function createDefaultTitle(isChild = false): string {
  return (isChild ? childSessionTitlePrefix : parentSessionTitlePrefix) + new Date().toISOString()
}

export function isDefaultTitle(title: string): boolean {
  return title.startsWith(parentSessionTitlePrefix)
}

// ===================================================================
// FILE REFERENCE PATTERNS
// ===================================================================

// Utility regexes for file processing
export const bashRegex = /!`([^`]+)`/g

/**
 * Regular expression to match @ file references in text
 * Matches @ followed by file paths, excluding commas, periods at end of sentences, and backticks
 * Does not match when preceded by word characters or backticks (to avoid email addresses and quoted references)
 */
export const fileRegex = /(?<![\w`])@(\.?[^\s`,.]*(?:\.[^\s`,.]+)*)/g

// ===================================================================
// SESSION STATE MANAGEMENT
// ===================================================================

// Session state instance (initialized by Instance.state in main module)
let sessionState: SessionState | null = null

export function initializeState(state: SessionState): void {
  sessionState = state
}

export function getState(): SessionState {
  if (!sessionState) {
    throw new Error("Session state not initialized")
  }
  return sessionState
}

// ===================================================================
// SESSION LOCKING UTILITIES
// ===================================================================

export function isLocked(sessionID: string): boolean {
  return getState().pending.has(sessionID)
}

export function lock(sessionID: string): {
  signal: AbortSignal
  [Symbol.dispose](): Promise<void>
} {
  log.info("locking", { sessionID })
  const state = getState()

  if (state.pending.has(sessionID)) {
    const { BusyError } = await import("./types")
    throw new BusyError(sessionID)
  }

  const controller = new AbortController()
  state.pending.set(sessionID, controller)

  return {
    signal: controller.signal,
    async [Symbol.dispose]() {
      log.info("unlocking", { sessionID })
      state.pending.delete(sessionID)

      const isAutoCompacting = state.autoCompacting.get(sessionID) ?? false
      if (isAutoCompacting) {
        state.autoCompacting.delete(sessionID)
        return
      }

      // Note: In the modular version, this would need to import from crud.ts
      // For now, we'll emit the event directly - this needs proper event structure
      // Bus.publish would need proper event type from the original Session.Event.Idle
    },
  }
}

// ===================================================================
// USAGE CALCULATION
// ===================================================================

export function getUsage(
  model: ModelsDev.Model,
  usage: LanguageModelUsage,
  metadata?: ProviderMetadata
) {
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

// ===================================================================
// TIME UTILITIES
// ===================================================================

export function getCurrentTimestamp(): number {
  return Date.now()
}

export function formatSessionTime(timestamp: number): string {
  return new Date(timestamp).toISOString()
}

// ===================================================================
// SESSION ID VALIDATION
// ===================================================================

export function validateSessionID(sessionID: string): boolean {
  return sessionID.length > 0 && sessionID.includes("session_")
}

// ===================================================================
// CLEANUP UTILITIES
// ===================================================================

export function cleanupTempData(olderThanMs: number = 24 * 60 * 60 * 1000): void {
  const cutoff = Date.now() - olderThanMs
  // Implementation would clean up temporary files, caches, etc.
  // This is a placeholder for actual cleanup logic
  log.info("cleanupTempData", { cutoff })
}

// ===================================================================
// ABORT UTILITIES
// ===================================================================

export function abort(sessionID: string): boolean {
  const state = getState()
  const controller = state.pending.get(sessionID)
  if (!controller) return false

  log.info("aborting", { sessionID })
  controller.abort()
  state.pending.delete(sessionID)
  return true
}