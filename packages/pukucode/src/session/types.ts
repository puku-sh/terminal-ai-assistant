// ===================================================================
// STEP 1: CORE TYPES & SCHEMAS

//
// This module contains all type definitions and schemas for the session system.
// No dependencies except for external libraries (zod, identifier).
// ===================================================================

import { z } from "zod"
import { Identifier } from "../id/id"
import { MessageV2 } from "./message-v2"
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi"


extendZodWithOpenApi(z)

// Constants
export const OUTPUT_TOKEN_MAX = 32_000

// ===================================================================
// CORE SESSION SCHEMAS
// ===================================================================

// Core session information schema (from original Session.Info)
export const SessionInfo = z
  .object({
    id: Identifier.schema("session"),
    projectID: z.string(),
    directory: z.string(),
    parentID: Identifier.schema("session").optional(),
    share: z
      .object({
        url: z.string(),
      })
      .optional(),
    title: z.string(),
    version: z.string(),
    time: z.object({
      created: z.number(),
      updated: z.number(),
    }),
    revert: z
      .object({
        messageID: z.string(),
        partID: z.string().optional(),
        snapshot: z.string().optional(),
        diff: z.string().optional(),
      })
      .optional(),
  })
  .openapi("Session")

export type SessionInfo = z.output<typeof SessionInfo>

// Share info schema (kept for compatibility)
export const ShareInfo = z
  .object({
    secret: z.string(),
    url: z.string(),
  })
  .openapi("SessionShare")
export type ShareInfo = z.output<typeof ShareInfo>

// ===================================================================
// INPUT SCHEMAS
// ===================================================================

// Chat/prompt input schema (from original PromptInput)
export const PromptInput = z.object({
  sessionID: Identifier.schema("session"),
  messageID: Identifier.schema("message").optional(),
  model: z
    .object({
      providerID: z.string(),
      modelID: z.string(),
    })
    .optional(),
  agent: z.string().optional(),
  system: z.string().optional(),
  tools: z.record(z.boolean()).optional(),
  parts: z.array(
    z.discriminatedUnion("type", [
      MessageV2.TextPart.omit({
        messageID: true,
        sessionID: true,
      })
        .partial({
          id: true,
        })
        .openapi("TextPartInput"),
      MessageV2.FilePart.omit({
        messageID: true,
        sessionID: true,
      })
        .partial({
          id: true,
        })
        .openapi("FilePartInput"),
      MessageV2.AgentPart.omit({
        messageID: true,
        sessionID: true,
      })
        .partial({
          id: true,
        })
        .openapi("AgentPartInput"),
    ]),
  ),
})

export type ChatInput = z.infer<typeof PromptInput>

// Shell input schema
export const ShellInput = z.object({
  sessionID: Identifier.schema("session"),
  agent: z.string(),
  command: z.string(),
})
export type ShellInput = z.infer<typeof ShellInput>

// Command input schema
export const CommandInput = z.object({
  messageID: Identifier.schema("message").optional(),
  sessionID: Identifier.schema("session"),
  agent: z.string().optional(),
  model: z.string().optional(),
  arguments: z.string(),
  command: z.string(),
})
export type CommandInput = z.infer<typeof CommandInput>

// Revert input schema
export const RevertInput = z.object({
  sessionID: Identifier.schema("session"),
  messageID: Identifier.schema("message"),
  partID: Identifier.schema("part").optional(),
})
export type RevertInput = z.infer<typeof RevertInput>

// ===================================================================
// ERROR CLASSES
// ===================================================================

export class BusyError extends Error {
  constructor(public readonly sessionID: string) {
    super(`Session ${sessionID} is busy`)
  }
}

export class SessionNotFoundError extends Error {
  constructor(sessionID: string) {
    super(`Session not found: ${sessionID}`)
    this.name = "SessionNotFoundError"
  }
}

export class SessionLockError extends Error {
  constructor(sessionID: string) {
    super(`Session is locked: ${sessionID}`)
    this.name = "SessionLockError"
  }
}

// ===================================================================
// RESULT TYPES
// ===================================================================

export interface SessionCreateResult {
  id: string
  info: SessionInfo
}

export interface SessionListItem {
  id: string
  title: string
  created: number
  updated: number
  parentID?: string
}

// Queue item type for session processing
export interface QueueItem {
  input: ChatInput
  message: MessageV2.User
  parts: MessageV2.Part[]
  processed: boolean
  callback: (input: { info: MessageV2.Assistant; parts: MessageV2.Part[] }) => void
}

// Session state structure
export interface SessionState {
  pending: Map<string, AbortController>
  autoCompacting: Map<string, boolean>
  queued: Map<string, QueueItem[]>
}