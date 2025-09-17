// ===================================================================
// STEP 4: MESSAGE MANAGEMENT

//
// This module contains message and parts handling functionality.
// Dependencies: types.ts, utils.ts, crud.ts, and external modules
// ===================================================================

import { Storage } from "../storage/storage"
import { MessageV2 } from "./message-v2"
import { Bus } from "../bus"
import { Identifier } from "../id/id"

import { exists as sessionExists } from "./crud"

// ===================================================================
// MESSAGE RETRIEVAL
// ===================================================================

export async function getMessages(sessionID: string): Promise<{
  info: MessageV2.Info
  parts: MessageV2.Part[]
}[]> {
  // Verify session exists
  if (!(await sessionExists(sessionID))) {
    throw new Error(`Session not found: ${sessionID}`)
  }

  const result: {
    info: MessageV2.Info
    parts: MessageV2.Part[]
  }[] = []

  for (const p of await Storage.list(["message", sessionID])) {
    const read = await Storage.read<MessageV2.Info>(p)
    if (read) {
      result.push({
        info: read,
        parts: await getParts(read.id),
      })
    }
  }

  result.sort((a, b) => (a.info.id > b.info.id ? 1 : -1))
  return result
}

export async function getMessage(sessionID: string, messageID: string): Promise<{
  info: MessageV2.Info
  parts: MessageV2.Part[]
}> {
  const info = await Storage.read<MessageV2.Info>(["message", sessionID, messageID])
  if (!info) {
    throw new Error(`Message not found: ${messageID}`)
  }

  // Verify the message belongs to the correct session
  if (info.sessionID !== sessionID) {
    throw new Error(`Message ${messageID} does not belong to session ${sessionID}`)
  }

  return {
    info,
    parts: await getParts(messageID),
  }
}

export async function getParts(messageID: string): Promise<MessageV2.Part[]> {
  const result: MessageV2.Part[] = []

  for (const item of await Storage.list(["part", messageID])) {
    const read = await Storage.read<MessageV2.Part>(item)
    if (read) {
      result.push(read)
    }
  }

  result.sort((a, b) => (a.id > b.id ? 1 : -1))
  return result
}

// ===================================================================
// MESSAGE UPDATES
// ===================================================================

export async function updateMessage(msg: MessageV2.Info): Promise<void> {
  // Validate the message (could add schema validation here)
  // Update timestamp if it has one
  if ('time' in msg && msg.time && typeof msg.time === 'object' && 'updated' in msg.time) {
    (msg.time as any).updated = Date.now()
  }

  // Store the updated message
  await Storage.write(["message", msg.sessionID, msg.id], msg)

  // Emit update event
  Bus.publish(MessageV2.Event.Updated, {
    info: msg,
  })
}

export async function updatePart(part: MessageV2.Part): Promise<MessageV2.Part> {
  await Storage.write(["part", part.messageID, part.id], part)

  Bus.publish(MessageV2.Event.PartUpdated, {
    part,
  })

  return part
}

// ===================================================================
// MESSAGE CREATION
// ===================================================================

// export async function createMessage(
//   sessionID: string,
//   type: "user" | "assistant",
//   parts: MessageV2.Part[] = []
// ): Promise<MessageV2.Info> {
//   // Verify session exists
//   if (!(await sessionExists(sessionID))) {
//     throw new Error(`Session not found: ${sessionID}`)
//   }

//   const now = Date.now()

//   const message: MessageV2.Info = {
//     id: Identifier.ascending("message"),
//     sessionID,
//     role: type,
//     time: {
//       created: now,
//     },
//   } as MessageV2.Info

//   // Store the message
//   await Storage.write(["message", sessionID, message.id], message)

//   // Store all parts with proper IDs
//   for (const part of parts) {
//     await updatePart({
//       ...part,
//       id: part.id || Identifier.ascending("part"),
//       messageID: message.id,
//       sessionID,
//     })
//   }

//   // Emit creation event
//   Bus.publish(MessageV2.Event.Created, {
//     info: message,
//   } as any)

//   return message
// }

// // ===================================================================
// // MESSAGE DELETION
// // ===================================================================

// export async function deleteMessage(sessionID: string, messageID: string): Promise<void> {
//   // Verify message exists and belongs to session
//   await getMessage(sessionID, messageID)

//   // Remove all parts
//   const parts = await getParts(messageID)
//   for (const part of parts) {
//     await Storage.remove(["part", messageID, part.id])
//   }

//   // Remove the message
//   await Storage.remove(["message", sessionID, messageID])

//   // Emit deletion event
//   Bus.publish(MessageV2.Event.Removed, {
//     sessionID,
//     messageID,
//   } as any)
// }

// // ===================================================================
// // MESSAGE UTILITIES
// // ===================================================================

// export async function getLastMessage(sessionID: string): Promise<{
//   info: MessageV2.Info
//   parts: MessageV2.Part[]
// } | null> {
//   const messages = await getMessages(sessionID)
//   return messages.length > 0 ? messages[messages.length - 1] : null
// }

// export async function getMessagesPaginated(
//   sessionID: string,
//   limit: number = 50,
//   offset: number = 0
// ): Promise<{
//   messages: { info: MessageV2.Info; parts: MessageV2.Part[] }[]
//   total: number
//   hasMore: boolean
// }> {
//   const allMessages = await getMessages(sessionID)
//   const total = allMessages.length
//   const messages = allMessages.slice(offset, offset + limit)
//   const hasMore = offset + limit < total

//   return {
//     messages,
//     total,
//     hasMore,
//   }
// }

// export async function searchMessages(
//   sessionID: string,
//   query: string
// ): Promise<{ info: MessageV2.Info; parts: MessageV2.Part[] }[]> {
//   const messages = await getMessages(sessionID)
//   const lowerQuery = query.toLowerCase()

//   return messages.filter(message => {
//     // Search in parts content
//     return message.parts.some(part => {
//       if (part.type === "text" && 'text' in part && part.text) {
//         return part.text.toLowerCase().includes(lowerQuery)
//       }
//       return false
//     })
//   })
// }

// export async function getMessageStats(sessionID: string): Promise<{
//   total: number
//   userMessages: number
//   assistantMessages: number
//   totalParts: number
// }> {
//   const messages = await getMessages(sessionID)

//   return {
//     total: messages.length,
//     userMessages: messages.filter(m => m.info.role === "user").length,
//     assistantMessages: messages.filter(m => m.info.role === "assistant").length,
//     totalParts: messages.reduce((sum, m) => sum + m.parts.length, 0),
//   }
// }