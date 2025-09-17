import os from "os"
import path from "path"
import { spawn } from "child_process"
import { ulid } from "ulid"

import { Identifier } from "../id/id"
import { Instance } from "../project/instance"
import { MessageV2 } from "./message-v2"
import type { ShellInput } from "./types"
import { lock } from "./utils"
import { updateMessage, updatePart } from "./messages"

// ===================================================================
// SHELL EXECUTION FUNCTIONALITY
// ===================================================================

export async function shell(input: ShellInput) {
  using abort = lock(input.sessionID)
  const userMsg: MessageV2.User = {
    id: Identifier.ascending("message"),
    sessionID: input.sessionID,
    time: {
      created: Date.now(),
    },
    role: "user",
  }
  await updateMessage(userMsg)
  const userPart: MessageV2.Part = {
    type: "text",
    id: Identifier.ascending("part"),
    messageID: userMsg.id,
    sessionID: input.sessionID,
    text: "The following tool was executed by the user",
    synthetic: true,
  }
  await updatePart(userPart)

  const msg: MessageV2.Assistant = {
    id: Identifier.ascending("message"),
    sessionID: input.sessionID,
    system: [],
    mode: input.agent,
    cost: 0,
    path: {
      cwd: Instance.directory,
      root: Instance.worktree,
    },
    time: {
      created: Date.now(),
    },
    role: "assistant",
    tokens: {
      input: 0,
      output: 0,
      reasoning: 0,
      cache: { read: 0, write: 0 },
    },
    modelID: "",
    providerID: "",
  }
  await updateMessage(msg)
  const part: MessageV2.Part = {
    type: "tool",
    id: Identifier.ascending("part"),
    messageID: msg.id,
    sessionID: input.sessionID,
    tool: "bash",
    callID: ulid(),
    state: {
      status: "running",
      time: {
        start: Date.now(),
      },
      input: {
        command: input.command,
      },
    },
  }
  await updatePart(part)
  const shell = process.env["SHELL"] ?? "bash"
  const shellName = path.basename(shell)

  const scripts: Record<string, string> = {
    nu: input.command,
    fish: `eval "${input.command}"`,
  }

  const script =
    scripts[shellName] ??
    `[[ -f ~/.zshenv ]] && source ~/.zshenv >/dev/null 2>&1 || true
     [[ -f "\${ZDOTDIR:-$HOME}/.zshrc" ]] && source "\${ZDOTDIR:-$HOME}/.zshrc" >/dev/null 2>&1 || true
     [[ -f ~/.bashrc ]] && source ~/.bashrc >/dev/null 2>&1 || true
     eval "${input.command}"`

  const isFishOrNu = shellName === "fish" || shellName === "nu"
  const args = isFishOrNu ? ["-c", script] : ["-c", "-l", script]

  const proc = spawn(shell, args, {
    cwd: Instance.directory,
    signal: abort.signal,
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      TERM: "dumb",
    },
  })

  abort.signal.addEventListener("abort", () => {
    if (!proc.pid) return
    process.kill(-proc.pid)
  })

  let output = ""

  proc.stdout?.on("data", (chunk) => {
    output += chunk.toString()
    if (part.state.status === "running") {
      part.state.metadata = {
        output: output,
        description: "",
      }
      updatePart(part)
    }
  })

  proc.stderr?.on("data", (chunk) => {
    output += chunk.toString()
    if (part.state.status === "running") {
      part.state.metadata = {
        output: output,
        description: "",
      }
      updatePart(part)
    }
  })

  await new Promise<void>((resolve) => {
    proc.on("close", () => {
      resolve()
    })
  })
  msg.time.completed = Date.now()
  await updateMessage(msg)
  if (part.state.status === "running") {
    part.state = {
      status: "completed",
      time: {
        ...part.state.time,
        end: Date.now(),
      },
      input: part.state.input,
      title: "",
      metadata: {
        output,
        description: "",
      },
      output,
    }
    await updatePart(part)
  }
  return { info: msg, parts: [part] }
}