import os from "os"
import path from "path"
import fs from "fs/promises"

import { Log } from "../util/log"
import { Command } from "../command"
import { Provider } from "../provider/provider"
import { Agent } from "../agent/agent"
import { Instance } from "../project/instance"
import type { CommandInput, ChatInput } from "./types"
import { bashRegex, fileRegex } from "./types"
import { prompt } from "./processor"
import { $ } from "bun"

const log = Log.create({ service: "session" })

// ===================================================================
// COMMAND EXECUTION LOGIC
// ===================================================================

export async function command(input: CommandInput) {
  log.info("command", input)
  const command = await Command.get(input.command)
  const agent = command.agent ?? input.agent ?? "build"

  let template = command.template.replace("$ARGUMENTS", input.arguments)

  const bash = Array.from(template.matchAll(bashRegex))
  if (bash.length > 0) {
    const results = await Promise.all(
      bash.map(async ([, cmd]) => {
        try {
          return await $`${{ raw: cmd }}`.nothrow().text()
        } catch (error) {
          return `Error executing command: ${error instanceof Error ? error.message : String(error)}`
        }
      }),
    )
    let index = 0
    template = template.replace(bashRegex, () => results[index++])
  }

  const parts = [
    {
      type: "text",
      text: template,
    },
  ] as ChatInput["parts"]

  const matches = Array.from(template.matchAll(fileRegex))
  await Promise.all(
    matches.map(async (match) => {
      const name = match[1]
      const filepath = name.startsWith("~/")
        ? path.join(os.homedir(), name.slice(2))
        : path.resolve(Instance.worktree, name)

      const stats = await fs.stat(filepath).catch(() => undefined)
      if (!stats) {
        const agent = await Agent.get(name)
        if (agent) {
          parts.push({
            type: "agent",
            name: agent.name,
          })
        }
        return
      }

      if (stats.isDirectory()) return

      parts.push({
        type: "file",
        url: `file://${filepath}`,
        filename: name,
        mime: "text/plain",
      })
    }),
  )

  return prompt({
    sessionID: input.sessionID,
    messageID: input.messageID,
    model: (() => {
      if (input.model) {
        return Provider.parseModel(input.model)
      }
      if (command.model) {
        return Provider.parseModel(command.model)
      }
      return undefined
    })(),
    agent,
    parts,
  })
}