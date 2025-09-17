import { Identifier } from "../id/id"
import { Bus } from "../bus"
import { Storage } from "../storage/storage"
import { Instance } from "../project/instance"
import { Config } from "../config/config"
import { Log } from "../util/log"
import type { Info } from "./types"
import { Event } from "./types"
import { createDefaultTitle } from "./utils"

const log = Log.create({ service: "session" })

// ===================================================================
// SESSION CRUD OPERATIONS
// ===================================================================

export async function create(parentID?: string, title?: string) {
  return createNext({
    parentID,
    directory: Instance.directory,
    title,
  })
}

export async function createNext(input: { id?: string; title?: string; parentID?: string; directory: string }) {
  const result: Info = {
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
  // if (!result.parentID && ( cfg.share === "auto"))
  //   share(result.id)
  //     .then((share) => {
  //       update(result.id, (draft) => {
  //         draft.share = share
  //       })
  //     })
  //     .catch(() => {
  //       // Silently ignore sharing errors during session creation
  //     })
  Bus.publish(Event.Updated, {
    info: result,
  })
  return result
}

export async function get(id: string) {
  const read = await Storage.read<Info>(["session", Instance.project.id, id])
  return read as Info
}

//   export async function getShare(id: string) {
//     return Storage.read<ShareInfo>(["share", id])
//   }

//   export async function share(id: string) {
//     const cfg = await Config.get()
//     if (cfg.share === "disabled") {
//       throw new Error("Sharing is disabled in configuration")
//     }

//     const session = await get(id)
//     if (session.share) return session.share
//     const share = await Share.create(id)
//     await update(id, (draft) => {
//       draft.share = {
//         url: share.url,
//       }
//     })
//     await Storage.write(["share", id], share)
//     await Share.sync("session/info/" + id, session)
//     for (const msg of await messages(id)) {
//       await Share.sync("session/message/" + id + "/" + msg.info.id, msg.info)
//       for (const part of msg.parts) {
//         await Share.sync("session/part/" + id + "/" + msg.info.id + "/" + part.id, part)
//       }
//     }
//     return share
//   }

// export async function unshare(id: string) {
//     const share = await getShare(id)
//     if (!share) return
//     await Storage.remove(["share", id])
//     await update(id, (draft) => {
//       draft.share = undefined
//     })
//     // await Share.remove(id, share.secret)
//   }

export async function update(id: string, editor: (session: Info) => void) {
  const project = Instance.project
  const result = await Storage.update<Info>(["session", project.id, id], (draft) => {
    editor(draft)
    draft.time.updated = Date.now()
  })
  Bus.publish(Event.Updated, {
    info: result,
  })
  return result
}

export async function* list() {
  const project = Instance.project
  for (const item of await Storage.list(["session", project.id])) {
    yield Storage.read<Info>(item)
  }
}

export async function children(parentID: string) {
  const project = Instance.project
  const result = [] as Info[]
  for (const item of await Storage.list(["session", project.id])) {
    const session = await Storage.read<Info>(item)
    if (session.parentID !== parentID) continue
    result.push(session)
  }
  return result
}

export async function remove(sessionID: string, emitEvent = true) {
  const project = Instance.project
  try {
    // Will need to import abort function from utils when implementing
    // abort(sessionID)
    const session = await get(sessionID)
    for (const child of await children(sessionID)) {
      await remove(child.id, false)
    }
    // await unshare(sessionID).catch(() => {})
    for (const msg of await Storage.list(["message", sessionID])) {
      for (const part of await Storage.list(["part", msg.at(-1)!])) {
        await Storage.remove(part)
      }
      await Storage.remove(msg)
    }
    await Storage.remove(["session", project.id, sessionID])
    if (emitEvent) {
      Bus.publish(Event.Deleted, {
        info: session,
      })
    }
  } catch (e) {
    log.error(e)
  }
}