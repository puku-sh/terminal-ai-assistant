import { Storage } from "../storage/storage"
import { Bus } from "../bus"
import { MessageV2 } from "./message-v2"

// ===================================================================
// MESSAGE AND PARTS HANDLING
// ===================================================================

export async function messages(sessionID: string) {
  const result = [] as {
    info: MessageV2.Info
    parts: MessageV2.Part[]
  }[]
  for (const p of await Storage.list(["message", sessionID])) {
    const read = await Storage.read<MessageV2.Info>(p)
    result.push({
      info: read,
      parts: await getParts(read.id),
    })
  }
  result.sort((a, b) => (a.info.id > b.info.id ? 1 : -1))
  return result
}

export async function getMessage(sessionID: string, messageID: string) {
  return {
    info: await Storage.read<MessageV2.Info>(["message", sessionID, messageID]),
    parts: await getParts(messageID),
  }
}

export async function getParts(messageID: string) {
  const result = [] as MessageV2.Part[]
  for (const item of await Storage.list(["part", messageID])) {
    const read = await Storage.read<MessageV2.Part>(item)
    result.push(read)
  }
  result.sort((a, b) => (a.id > b.id ? 1 : -1))
  return result
}

// ===================================================================
// MESSAGE UPDATE FUNCTIONS
// ===================================================================

export async function updateMessage(msg: MessageV2.Info) {
  await Storage.write(["message", msg.sessionID, msg.id], msg)
  Bus.publish(MessageV2.Event.Updated, {
    info: msg,
  })
}

export async function updatePart(part: MessageV2.Part) {
  await Storage.write(["part", part.messageID, part.id], part)
  Bus.publish(MessageV2.Event.PartUpdated, {
    part,
  })
  return part
}