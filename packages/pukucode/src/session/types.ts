import { z } from "zod"
import { Identifier } from "../id/id"
import { Bus } from "../bus"
import { MessageV2 } from "./message-v2"

// ===================================================================
// CORE SESSION TYPES & SCHEMAS
// ===================================================================

export const Info = z
  .object({
    id: Identifier.schema("session"),
    projectID: z.string(),
    directory: z.string(),
    parentID: Identifier.schema("session").optional(),
    //   share: z
    //     .object({
    //       url: z.string(),
    //     })
    //     .optional(),
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
export type Info = z.output<typeof Info>

export const ShareInfo = z
  .object({
    secret: z.string(),
    url: z.string(),
  })
  .openapi("SessionShare")
export type ShareInfo = z.output<typeof ShareInfo>

// ===================================================================
// EVENT DEFINITIONS
// ===================================================================

export const Event = {
  Updated: Bus.event(
    "session.updated",
    z.object({
      info: Info,
    }),
  ),
  Deleted: Bus.event(
    "session.deleted",
    z.object({
      info: Info,
    }),
  ),
  Idle: Bus.event(
    "session.idle",
    z.object({
      sessionID: z.string(),
    }),
  ),
  Error: Bus.event(
    "session.error",
    z.object({
      sessionID: z.string().optional(),
      error: MessageV2.Assistant.shape.error,
    }),
  ),
}

// ===================================================================
// INPUT SCHEMAS
// ===================================================================

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

export const ShellInput = z.object({
  sessionID: Identifier.schema("session"),
  agent: z.string(),
  command: z.string(),
})
export type ShellInput = z.infer<typeof ShellInput>

export const CommandInput = z.object({
  messageID: Identifier.schema("message").optional(),
  sessionID: Identifier.schema("session"),
  agent: z.string().optional(),
  model: z.string().optional(),
  arguments: z.string(),
  command: z.string(),
})
export type CommandInput = z.infer<typeof CommandInput>

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

// ===================================================================
// REGULAR EXPRESSIONS
// ===================================================================

export const bashRegex = /!`([^`]+)`/g

/**
 * Regular expression to match @ file references in text
 * Matches @ followed by file paths, excluding commas, periods at end of sentences, and backticks
 * Does not match when preceded by word characters or backticks (to avoid email addresses and quoted references)
 */
export const fileRegex = /(?<![\\w`])@(\\.?[^\\s`,.]*(?:\\.[^\\s`,.]+)*)/g