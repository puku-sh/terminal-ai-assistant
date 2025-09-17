// ===================================================================
// STEP 3: CRUD OPERATIONS
// Extracted from src/session/index.ts lines 202-301, 341-396
//
// This module contains session CRUD operations.
// Dependencies: types.ts, utils.ts, and external modules
// ===================================================================

import { Storage } from "../storage/storage"
import { Instance } from "../project/instance"
import { Identifier } from "../id/id"
// import { Installation } from "../installa"
import { Config } from "../config/config"
// import { Flag } from "../flag/flag"
import { Bus } from "../bus"
// import { Share } from "../share/share"
import { Log } from "../util/log"

import type { SessionInfo, ShareInfo, SessionCreateResult, SessionListItem } from "./types"
import { SessionNotFoundError } from "./types"
import { createDefaultTitle, getCurrentTimestamp, validateSessionID, abort } from "./utils"

const log = Log.create({ service: "session-crud" })

// ===================================================================
// SESSION CREATION
// ===================================================================

export async function create(parentID?: string, title?: string): Promise<SessionInfo> {
  return createNext({
    parentID,
    directory: Instance.directory,
    title,
  })
}

export async function createNext(input: {
  id?: string
  title?: string
  parentID?: string
  directory: string
}): Promise<SessionInfo> {
  const result: SessionInfo = {
    id: Identifier.descending("session", input.id),
    version: "1.0.0",
    projectID: Instance.project.id,
    directory: input.directory,
    parentID: input.parentID,
    title: input.title ?? createDefaultTitle(!!input.parentID),
    time: {
      created: Date.now(),
      updated: Date.now(),
    },
  }

  log.info("created", result)
  await Storage.write(["session", Instance.project.id, result.id], result)

  const cfg = await Config.get()
  if (!result.parentID && ( cfg.share === "auto")) {
    share(result.id)
      .then((shareInfo) => {
        update(result.id, (draft) => {
          draft.share = shareInfo
        })
      })
      .catch(() => {
        // Silently ignore sharing errors during session creation
      })
  }

  Bus.publish({
    type: "session.updated",
    data: { info: result }
  } as any)

  return result
}

// ===================================================================
// SESSION RETRIEVAL
// ===================================================================

export async function get(id: string): Promise<SessionInfo> {
  if (!validateSessionID(id)) {
    throw new Error(`Invalid session ID: ${id}`)
  }

  const read = await Storage.read<SessionInfo>(["session", Instance.project.id, id])
  if (!read) {
    throw new SessionNotFoundError(id)
  }

  return read as SessionInfo
}

export async function getShare(id: string): Promise<ShareInfo | null> {
  return Storage.read<ShareInfo>(["share", id])
}

// ===================================================================
// SESSION SHARING
// ===================================================================

// export async function share(id: string): Promise<ShareInfo> {
//   const cfg = await Config.get()
//   if (cfg.share === "disabled") {
//     throw new Error("Sharing is disabled in configuration")
//   }

//   const session = await get(id)
//   if (session.share) return session.share as ShareInfo

// //   const shareInfo = await Share.create(id)
// //   await update(id, (draft) => {
// //     draft.share = {
// //       url: shareInfo.url,
// //     }
// //   })

//   await Storage.write(["share", id])
//  // await Share.sync("session/info/" + id, session)

//   // Note: In the modular version, messages would be imported from messages.ts
//   // For now, we'll skip the message syncing part

//   return shareInfo
// }

export async function unshare(id: string): Promise<void> {
  const shareInfo = await getShare(id)
  if (!shareInfo) return

  await Storage.remove(["share", id])
  await update(id, (draft) => {
    draft.share = undefined
  })

//   await Share.remove(id, shareInfo.secret)
}

// ===================================================================
// SESSION UPDATES
// ===================================================================

export async function update(
  id: string,
  editor: (session: SessionInfo) => void
): Promise<SessionInfo> {
  const project = Instance.project
  const result = await Storage.update<SessionInfo>(["session", project.id, id], (draft) => {
    editor(draft)
    draft.time.updated = Date.now()
  })

  Bus.publish({
    type: "session.updated",
    data: { info: result }
  } as any)

  return result
}

// ===================================================================
// SESSION LISTING
// ===================================================================

export async function* list(): AsyncGenerator<SessionInfo> {
  const project = Instance.project
  for (const item of await Storage.list(["session", project.id])) {
    const session = await Storage.read<SessionInfo>(item)
    if (session) {
      yield session
    }
  }
}

export async function listSorted(limit?: number): Promise<SessionListItem[]> {
  const sessions: SessionListItem[] = []

  for await (const session of list()) {
    sessions.push({
      id: session.id,
      title: session.title,
      created: session.time.created,
      updated: session.time.updated,
      parentID: session.parentID,
    })
  }

  // Sort by updated time (most recent first)
  sessions.sort((a, b) => b.updated - a.updated)

  // Apply limit if specified
  if (limit) {
    return sessions.slice(0, limit)
  }

  return sessions
}

export async function children(parentID: string): Promise<SessionInfo[]> {
  const project = Instance.project
  const result: SessionInfo[] = []

  for (const item of await Storage.list(["session", project.id])) {
    const session = await Storage.read<SessionInfo>(item)
    if (session && session.parentID === parentID) {
      result.push(session)
    }
  }

  return result
}

// ===================================================================
// SESSION SEARCH
// ===================================================================

export async function search(query: string): Promise<SessionListItem[]> {
  const sessions: SessionListItem[] = []
  const lowerQuery = query.toLowerCase()

  for await (const session of list()) {
    if (session.title.toLowerCase().includes(lowerQuery)) {
      sessions.push({
        id: session.id,
        title: session.title,
        created: session.time.created,
        updated: session.time.updated,
        parentID: session.parentID,
      })
    }
  }

  return sessions.sort((a, b) => b.updated - a.updated)
}

// ===================================================================
// SESSION EXISTENCE & COUNTING
// ===================================================================

export async function exists(sessionID: string): Promise<boolean> {
  try {
    await get(sessionID)
    return true
  } catch (error) {
    if (error instanceof SessionNotFoundError) {
      return false
    }
    throw error
  }
}

export async function count(): Promise<number> {
  let sessionCount = 0
  for await (const _ of list()) {
    sessionCount++
  }
  return sessionCount
}

// ===================================================================
// SESSION DELETION
// ===================================================================

export async function remove(sessionID: string, emitEvent = true): Promise<void> {
  const project = Instance.project

  try {
    abort(sessionID)
    const session = await get(sessionID)

    // Remove child sessions recursively
    for (const child of await children(sessionID)) {
      await remove(child.id, false)
    }

    // Unshare session
    await unshare(sessionID).catch(() => {})

    // Remove all messages and parts
    // Note: In modular version, this would import from messages.ts
    for (const msg of await Storage.list(["message", sessionID])) {
      for (const part of await Storage.list(["part", msg.at(-1)!])) {
        await Storage.remove(part)
      }
      await Storage.remove(msg)
    }

    // Remove the session itself
    await Storage.remove(["session", project.id, sessionID])

    if (emitEvent) {
      Bus.publish({
        type: "session.deleted",
        data: { info: session }
      } as any)
    }
  } catch (e) {
    log.error(e)
    throw e
  }
}