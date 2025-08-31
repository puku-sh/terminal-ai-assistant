import { App } from "../app/app"
import { z } from "zod"
import { Bus } from "../bus"
import { Log } from "../util/log"
import { Identifier } from "../id/id"

export namespace Permission {
  const log = Log.create({ service: "permission" })

  export const Info = z
    .object({
      id: z.string(),
      type: z.string(),
      pattern: z.string().optional(),
      sessionID: z.string(),
      messageID: z.string(),
      callID: z.string().optional(),
      title: z.string(),
      metadata: z.record(z.any()),
      time: z.object({
        created: z.number(),
      }),
    })
    .openapi({
      ref: "Permission",
    })
  export type Info = z.infer<typeof Info>

  export const Event = {
    Updated: Bus.event("permission.updated", Info),
    Replied: Bus.event(
      "permission.replied",
      z.object({ sessionID: z.string(), permissionID: z.string(), response: z.string() }),
    ),
  }

  // Configuration for default permission behavior
  export const Config = {
    // Default behavior when no plugin is available
    defaultBehavior: "ask" as "allow" | "deny" | "ask",
    // Auto-approve certain permission types
    autoApprove: new Set<string>(),
    // Auto-deny certain permission types  
    autoDeny: new Set<string>(),
  }

  const state = App.state(
    "permission",
    () => {
      const pending: {
        [sessionID: string]: {
          [permissionID: string]: {
            info: Info
            resolve: () => void
            reject: (e: any) => void
          }
        }
      } = {}

      const approved: {
        [sessionID: string]: {
          [permissionID: string]: boolean
        }
      } = {}

      return {
        pending,
        approved,
      }
    },
    async (state) => {
      for (const pending of Object.values(state.pending)) {
        for (const item of Object.values(pending)) {
          item.reject(new RejectedError(item.info.sessionID, item.info.id, item.info.callID, item.info.metadata))
        }
      }
    },
  )

  // Simple permission check function that replaces plugin logic
  function checkPermission(info: Info): "allow" | "deny" | "ask" {
    // Check auto-approve list
    if (Config.autoApprove.has(info.type) || (info.pattern && Config.autoApprove.has(info.pattern))) {
      return "allow"
    }
    
    // Check auto-deny list
    if (Config.autoDeny.has(info.type) || (info.pattern && Config.autoDeny.has(info.pattern))) {
      return "deny"
    }

    // Return default behavior
    return Config.defaultBehavior
  }

  export async function ask(input: {
    type: Info["type"]
    title: Info["title"]
    pattern?: Info["pattern"]
    callID?: Info["callID"]
    sessionID: Info["sessionID"]
    messageID: Info["messageID"]
    metadata: Info["metadata"]
  }) {
    const { pending, approved } = state()
    log.info("asking", {
      sessionID: input.sessionID,
      messageID: input.messageID,
      toolCallID: input.callID,
      pattern: input.pattern,
    })
    
    if (approved[input.sessionID]?.[input.pattern ?? input.type]) return
    
    const info: Info = {
      id: Identifier.ascending("permission"),
      type: input.type,
      pattern: input.pattern,
      sessionID: input.sessionID,
      messageID: input.messageID,
      callID: input.callID,
      title: input.title,
      metadata: input.metadata,
      time: {
        created: Date.now(),
      },
    }

    // Use simple permission check instead of plugin
    const status = checkPermission(info)

    switch (status) {
      case "deny":
        throw new RejectedError(info.sessionID, info.id, info.callID, info.metadata)
      case "allow":
        return
    }

    // If status is "ask", proceed with user prompt
    pending[input.sessionID] = pending[input.sessionID] || {}
    return new Promise<void>((resolve, reject) => {
      pending[input.sessionID][info.id] = {
        info,
        resolve,
        reject,
      }
      Bus.publish(Event.Updated, info)
    })
  }

  export const Response = z.enum(["once", "always", "reject"])
  export type Response = z.infer<typeof Response>

  export function respond(input: { sessionID: Info["sessionID"]; permissionID: Info["id"]; response: Response }) {
    log.info("response", input)
    const { pending, approved } = state()
    const match = pending[input.sessionID]?.[input.permissionID]
    if (!match) return
    delete pending[input.sessionID][input.permissionID]
    if (input.response === "reject") {
      match.reject(new RejectedError(input.sessionID, input.permissionID, match.info.callID, match.info.metadata))
      return
    }
    match.resolve()
    Bus.publish(Event.Replied, {
      sessionID: input.sessionID,
      permissionID: input.permissionID,
      response: input.response,
    })
    if (input.response === "always") {
      approved[input.sessionID] = approved[input.sessionID] || {}
      approved[input.sessionID][match.info.pattern ?? match.info.type] = true
      for (const item of Object.values(pending[input.sessionID])) {
        if ((item.info.pattern ?? item.info.type) === (match.info.pattern ?? match.info.type)) {
          respond({ sessionID: item.info.sessionID, permissionID: item.info.id, response: input.response })
        }
      }
    }
  }

  // Helper functions to configure permission behavior
  export function setDefaultBehavior(behavior: "allow" | "deny" | "ask") {
    Config.defaultBehavior = behavior
  }

  export function addAutoApprove(typeOrPattern: string) {
    Config.autoApprove.add(typeOrPattern)
  }

  export function addAutoDeny(typeOrPattern: string) {
    Config.autoDeny.add(typeOrPattern)
  }

  export function removeAutoApprove(typeOrPattern: string) {
    Config.autoApprove.delete(typeOrPattern)
  }

  export function removeAutoDeny(typeOrPattern: string) {
    Config.autoDeny.delete(typeOrPattern)
  }

  export class RejectedError extends Error {
    constructor(
      public readonly sessionID: string,
      public readonly permissionID: string,
      public readonly toolCallID?: string,
      public readonly metadata?: Record<string, any>,
    ) {
      super(`The user rejected permission to use this specific tool call. You may try again with different parameters.`)
    }
  }
}