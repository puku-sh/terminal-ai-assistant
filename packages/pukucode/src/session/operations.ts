import { splitWhen } from "remeda"
import { streamText, generateText, type ModelMessage } from "ai"

import { Identifier } from "../id/id"
import { Provider } from "../provider/provider"
import { Instance } from "../project/instance"
import { Snapshot } from "../snapshot"
import { SystemPrompt } from "./system"
import { MessageV2 } from "./message-v2"
import { Log } from "../util/log"
import type { RevertInput, Info } from "./types"
import { lock, state } from "./utils"
import { get, update } from "./crud"
import { messages, updateMessage } from "./messages"
import { createStreamProcessor } from "./stream-processor"

const log = Log.create({ service: "session" })

// ===================================================================
// SESSION OPERATIONS: REVERT, SUMMARIZE, ETC.
// ===================================================================

export async function revert(input: RevertInput) {
  const all = await messages(input.sessionID)
  let lastUser: MessageV2.User | undefined
  const session = await get(input.sessionID)

  let revert: Info["revert"]
  const patches: Snapshot.Patch[] = []
  for (const msg of all) {
    if (msg.info.role === "user") lastUser = msg.info
    const remaining = []
    for (const part of msg.parts) {
      if (revert) {
        if (part.type === "patch") {
          patches.push(part)
        }
        continue
      }

      if (!revert) {
        if ((msg.info.id === input.messageID && !input.partID) || part.id === input.partID) {
          // if no useful parts left in message, same as reverting whole message
          const partID = remaining.some((item) => ["text", "tool"].includes(item.type)) ? input.partID : undefined
          revert = {
            messageID: !partID && lastUser ? lastUser.id : msg.info.id,
            partID,
          }
        }
        remaining.push(part)
      }
    }
  }

  if (revert) {
    const session = await get(input.sessionID)
    revert.snapshot = session.revert?.snapshot ?? (await Snapshot.track())
    await Snapshot.revert(patches)
    if (revert.snapshot) revert.diff = await Snapshot.diff(revert.snapshot)
    return update(input.sessionID, (draft) => {
      draft.revert = revert
    })
  }
  return session
}

export async function unrevert(input: { sessionID: string }) {
  log.info("unreverting", input)
  const session = await get(input.sessionID)
  if (!session.revert) return session
  if (session.revert.snapshot) await Snapshot.restore(session.revert.snapshot)
  const next = await update(input.sessionID, (draft) => {
    draft.revert = undefined
  })
  return next
}

export async function summarize(input: { sessionID: string; providerID: string; modelID: string }) {
  using abort = lock(input.sessionID)
  const msgs = await messages(input.sessionID)
  const lastSummary = msgs.findLast((msg) => msg.info.role === "assistant" && msg.info.summary === true)
  const filtered = msgs.filter((msg) => !lastSummary || msg.info.id >= lastSummary.info.id)
  const model = await Provider.getModel(input.providerID, input.modelID)
  const system = [
    ...SystemPrompt.summarize(model.providerID),
    ...(await SystemPrompt.environment()),
    ...(await SystemPrompt.custom()),
  ]

  const next: MessageV2.Info = {
    id: Identifier.ascending("message"),
    role: "assistant",
    sessionID: input.sessionID,
    system,
    mode: "build",
    path: {
      cwd: Instance.directory,
      root: Instance.worktree,
    },
    summary: true,
    cost: 0,
    modelID: input.modelID,
    providerID: model.providerID,
    tokens: {
      input: 0,
      output: 0,
      reasoning: 0,
      cache: { read: 0, write: 0 },
    },
    time: {
      created: Date.now(),
    },
  }
  await updateMessage(next)

  const processor = createStreamProcessor(next, model.info)
  const stream = streamText({
    maxRetries: 10,
    abortSignal: abort.signal,
    model: model.language,
    messages: [
      ...system.map(
        (x): ModelMessage => ({
          role: "system",
          content: x,
        }),
      ),
      ...MessageV2.toModelMessage(filtered),
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Provide a detailed but concise summary of our conversation above. Focus on information that would be helpful for continuing the conversation, including what we did, what we're doing, which files we're working on, and what we're going to do next.",
          },
        ],
      },
    ],
  })

  const result = await processor.process(stream)
  return result
}

// ===================================================================
// SESSION STATE UTILITIES
// ===================================================================

export function abort(sessionID: string) {
  const controller = state().pending.get(sessionID)
  if (!controller) return false
  log.info("aborting", {
    sessionID,
  })
  controller.abort()
  state().pending.delete(sessionID)
  return true
}

// ===================================================================
// INITIALIZATION FUNCTION
// ===================================================================

export async function initialize(input: {
  sessionID: string
  modelID: string
  providerID: string
  messageID: string
}) {
  const { prompt } = await import("./processor")
  const { Project } = await import("../project/project")

  await prompt({
    sessionID: input.sessionID,
    messageID: input.messageID,
    model: {
      providerID: input.providerID,
      modelID: input.modelID,
    },
    parts: [
      {
        id: Identifier.ascending("part"),
        type: "text",
        text: (await import("./prompt/initialize.txt")).default.replace("${path}", Instance.worktree),
      },
    ],
  })
  await Project.setInitialized(Instance.project.id)
}