// ===================================================================
// STEP 5: PROMPT PROCESSING

//
// This module contains the PromptProcessor class that handles:
// - User input processing (file references, attachments)
// - Tool setup and configuration
// - Model parameter preparation
// - File processing and @file references
// ===================================================================

import path from "path"
import { URL } from "url"
import { tool } from "ai"
import type { Tool as AITool, ZodSchema } from "ai"

import { Identifier } from "../id/id"
import { Provider } from "../provider/provider"
import { Agent } from "../agent/agent"
import { SystemPrompt } from "./system"
import { MessageV2 } from "./message-v2"
import { Instance } from "../project/instance"
import { ReadTool } from "../tool/read"
import { ToolRegistry } from "../tool/registry"
//import { MCP } from "../mcp"
import { Plugin } from "../plugin"
import { Wildcard } from "../util/wildcard"
import { FileTime } from "../file/time"
import { Log } from "../util/log"
import { mergeDeep, pipe } from "remeda"

import type { ChatInput } from "./types"
import { fileRegex } from "./utils"
import { createMessage, updateMessage } from "./messages"

const log = Log.create({ service: "session-processor" })

// ===================================================================
// PROMPT PROCESSOR CLASS
// ===================================================================

export class PromptProcessor {
  constructor(
    private sessionID: string,
    private input: ChatInput,
    private assistantMsg: MessageV2.Assistant
  ) {}

  // ===================================================================
  // USER PARTS PROCESSING
  // ===================================================================

  async processUserParts(): Promise<MessageV2.Part[]> {
    const userMsg: MessageV2.Info = {
      id: this.input.messageID ?? Identifier.ascending("message"),
      role: "user",
      sessionID: this.sessionID,
      time: {
        created: Date.now(),
      },
    }

    const userParts = await Promise.all(
      this.input.parts.map(async (part): Promise<MessageV2.Part[]> => {
        if (part.type === "file") {
          return this.processFilePart(part, userMsg)
        }

        if (part.type === "agent") {
          return this.processAgentPart(part, userMsg)
        }

        // Text parts (process @file references)
        if (part.type === "text") {
          return this.processTextPart(part, userMsg)
        }

        return [
          {
            id: Identifier.ascending("part"),
            ...part,
            messageID: userMsg.id,
            sessionID: this.sessionID,
          } as MessageV2.Part,
        ]
      })
    ).then((x) => x.flat())

    // Trigger plugin hooks
    await Plugin.trigger(
      "chat.message",
      {},
      {
        message: userMsg,
        parts: userParts,
      }
    )

    // Create and store the user message
    await createMessage(this.sessionID, "user", userParts)

    // Update the assistant message to ensure it's stored
    await updateMessage(this.assistantMsg)

    return userParts
  }

  // ===================================================================
  // FILE PART PROCESSING
  // ===================================================================

  private async processFilePart(part: any, userMsg: MessageV2.Info): Promise<MessageV2.Part[]> {
    const url = new URL(part.url)

    switch (url.protocol) {
      case "data:":
        if (part.mime === "text/plain") {
          return [
            {
              id: Identifier.ascending("part"),
              messageID: userMsg.id,
              sessionID: this.sessionID,
              type: "text",
              synthetic: true,
              text: `Called the Read tool with the following input: ${JSON.stringify({ filePath: part.filename })}`,
            } as MessageV2.Part,
            {
              id: Identifier.ascending("part"),
              messageID: userMsg.id,
              sessionID: this.sessionID,
              type: "text",
              synthetic: true,
              text: Buffer.from(part.url, "base64url").toString(),
            } as MessageV2.Part,
            {
              ...part,
              id: part.id ?? Identifier.ascending("part"),
              messageID: userMsg.id,
              sessionID: this.sessionID,
            } as MessageV2.Part,
          ]
        }
        break

      case "file:":
        return this.processFileURL(url, part, userMsg)
    }

    return [
      {
        ...part,
        id: part.id ?? Identifier.ascending("part"),
        messageID: userMsg.id,
        sessionID: this.sessionID,
      } as MessageV2.Part,
    ]
  }

  private async processFileURL(url: URL, part: any, userMsg: MessageV2.Info): Promise<MessageV2.Part[]> {
    const filePath = decodeURIComponent(url.pathname)

    if (part.mime === "text/plain") {
      let offset: number | undefined = undefined
      let limit: number | undefined = undefined

      const range = {
        start: url.searchParams.get("start"),
        end: url.searchParams.get("end"),
      }

      if (range.start != null) {
        const start = parseInt(range.start)
        const end = range.end ? parseInt(range.end) : undefined

        // Handle symbol searches and ranges
        if (start === end) {
          // Try to expand range using LSP if available
          // This is a simplified version - original uses LSP.documentSymbol
          offset = Math.max(start - 2, 0)
          if (end) {
            limit = end - offset + 2
          }
        }
      }

      const args = { filePath, offset, limit }

      try {
        const readTool = await ReadTool.init()
        const result = await readTool.execute(args, {
          sessionID: this.sessionID,
          abort: new AbortController().signal,
          agent: this.input.agent!,
          messageID: userMsg.id,
          extra: { bypassCwdCheck: true },
          metadata: async () => {},
        })

        return [
          {
            id: Identifier.ascending("part"),
            messageID: userMsg.id,
            sessionID: this.sessionID,
            type: "text",
            synthetic: true,
            text: `Called the Read tool with the following input: ${JSON.stringify(args)}`,
          } as MessageV2.Part,
          {
            id: Identifier.ascending("part"),
            messageID: userMsg.id,
            sessionID: this.sessionID,
            type: "text",
            synthetic: true,
            text: result.output,
          } as MessageV2.Part,
          {
            ...part,
            id: part.id ?? Identifier.ascending("part"),
            messageID: userMsg.id,
            sessionID: this.sessionID,
          } as MessageV2.Part,
        ]
      } catch (error) {
        log.error("Failed to read file", { filePath, error })
        return [
          {
            id: Identifier.ascending("part"),
            messageID: userMsg.id,
            sessionID: this.sessionID,
            type: "text",
            text: `Error reading file ${filePath}: ${error}`,
          } as MessageV2.Part,
        ]
      }
    }

    // Handle binary files
    try {
      const file = Bun.file(filePath)
      FileTime.read(this.sessionID, filePath)

      return [
        {
          id: Identifier.ascending("part"),
          messageID: userMsg.id,
          sessionID: this.sessionID,
          type: "text",
          text: `Called the Read tool with the following input: {"filePath":"${filePath}"}`,
          synthetic: true,
        } as MessageV2.Part,
         {
            id: part.id ?? Identifier.ascending("part"),
            messageID: userMsg.id,
            sessionID: this.sessionID,
            type: "file",
            url: `data:${part.mime};base64,` + Buffer.from(await file.bytes()).toString("base64"),
            mime: part.mime,
            filename: part.filename,
            source: part.source,
            } as MessageV2.Part,
      ]
    } catch (error) {
      log.error("Failed to process file", { filePath, error })
      return [
        {
          id: Identifier.ascending("part"),
          messageID: userMsg.id,
          sessionID: this.sessionID,
          type: "text",
          text: `Error processing file ${filePath}: ${error}`,
        } as MessageV2.Part,
      ]
    }
  }

  // ===================================================================
  // AGENT PART PROCESSING
  // ===================================================================

  private processAgentPart(part: any, userMsg: MessageV2.Info): MessageV2.Part[] {
    return [
      {
        id: Identifier.ascending("part"),
        ...part,
        messageID: userMsg.id,
        sessionID: this.sessionID,
      } as MessageV2.Part,
      {
        id: Identifier.ascending("part"),
        messageID: userMsg.id,
        sessionID: this.sessionID,
        type: "text",
        synthetic: true,
        text: "Use the above message and context to generate a prompt and call the task tool with subagent: " + part.name,
      } as MessageV2.Part,
    ]
  }

  // ===================================================================
  // TEXT PART PROCESSING (@file references)
  // ===================================================================

  private async processTextPart(part: any, userMsg: MessageV2.Info): Promise<MessageV2.Part[]> {
    let processedText = part.text

    // Process @file references
    const matches = Array.from(processedText.matchAll(fileRegex))

    if (matches.length === 0) {
      return [
        {
          id: Identifier.ascending("part"),
          ...part,
          messageID: userMsg.id,
          sessionID: this.sessionID,
        } as MessageV2.Part,
      ]
    }

    // Replace @file references with file content
    for (const match of matches) {
      const filePath = match[1]
      try {
        const fileContent = await this.readFileContent(filePath)
        const replacement = `\n\`\`\`${this.getFileExtension(filePath)}\n${fileContent}\n\`\`\`\n`
        processedText = processedText.replace(match[0], replacement)
      } catch (error) {
        log.warn(`Could not read file ${filePath}:`, error)
        // Leave the reference as-is if file can't be read
      }
    }

    return [
      {
        id: Identifier.ascending("part"),
        ...part,
        text: processedText,
        messageID: userMsg.id,
        sessionID: this.sessionID,
      } as MessageV2.Part,
    ]
  }

  private async readFileContent(filePath: string): Promise<string> {
    try {
      // Resolve file path relative to project root
      const fullPath = path.resolve(Instance.worktree, filePath)

      const readTool = await ReadTool.init()
      const result = await readTool.execute(
        { filePath: fullPath },
        {
          sessionID: this.sessionID,
          abort: new AbortController().signal,
          agent: this.input.agent || "build",
          messageID: this.assistantMsg.id,
          extra: { bypassCwdCheck: true },
          metadata: async () => {},
        }
      )
      return result.output
    } catch (error) {
      throw new Error(`Failed to read file ${filePath}: ${error}`)
    }
  }

  private getFileExtension(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase()
    const extensionMap: Record<string, string> = {
      'js': 'javascript',
      'ts': 'typescript',
      'jsx': 'jsx',
      'tsx': 'tsx',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'rs': 'rust',
      'go': 'go',
      'php': 'php',
      'rb': 'ruby',
      'html': 'html',
      'css': 'css',
      'json': 'json',
      'xml': 'xml',
      'yaml': 'yaml',
      'yml': 'yaml',
      'md': 'markdown',
    }
    return extensionMap[ext || ''] || ext || 'text'
  }

  // ===================================================================
  // TOOL SETUP
  // ===================================================================

  async setupTools(): Promise<Record<string, AITool>> {
    const tools: Record<string, AITool> = {}

    const inputAgent = this.input.agent ?? "build"
    const agent = await Agent.get(inputAgent)
    const model = await this.getModel()

    const enabledTools = pipe(
      agent.tools,
      mergeDeep(await ToolRegistry.enabled(model.providerID, model.modelID, agent)),
      mergeDeep(this.input.tools ?? {}),
    )

    // Setup internal tools
    for (const item of await ToolRegistry.tools(model.providerID, model.modelID)) {
      if (Wildcard.all(item.id, enabledTools) === false) continue

      tools[item.id] = tool({
        id: item.id as any,
        description: item.description,
        inputSchema: item.parameters as ZodSchema,
        async execute(args, options) {
          return await item.execute(args, {
            sessionID: this.sessionID,
            abort: options.abortSignal!,
            messageID: this.assistantMsg.id,
            callID: options.toolCallId,
            agent: agent.name,
            metadata: async (val) => {
              // Handle metadata updates during tool execution
            },
          })
        },
        toModelOutput(result) {
          return {
            type: "text",
            value: result.output,
          }
        },
      })
    }

    // // Setup MCP tools
    // for (const [key, item] of Object.entries(await MCP.tools())) {
    //   if (Wildcard.all(key, enabledTools) === false) continue

    //   const execute = item.execute
    //   if (!execute) continue

    //   item.execute = async (args, opts) => {
    //     const result = await execute(args, opts)
    //     const output = result.content
    //       .filter((x: any) => x.type === "text")
    //       .map((x: any) => x.text)
    //       .join("\n\n")

    //     return { output }
    //   }

    //   item.toModelOutput = (result) => ({
    //     type: "text",
    //     value: result.output,
    //   })

    //   tools[key] = item
    // }

    return tools
  }

  // ===================================================================
  // MODEL SETUP
  // ===================================================================

  async getModel() {
    if (this.input.model) {
      return this.input.model
    }

    const inputAgent = this.input.agent ?? "build"
    const agent = await Agent.get(inputAgent)

    if (agent.model) {
      return agent.model
    }

    return Provider.defaultModel()
  }

  // ===================================================================
  // SYSTEM PROMPT SETUP
  // ===================================================================

  async setupSystemPrompt(): Promise<string[]> {
    const model = await this.getModel()
    const modelInfo = await Provider.getModel(model.providerID, model.modelID)

    let system = SystemPrompt.header(modelInfo.providerID)
    system.push(
      ...(() => {
        if (this.input.system) return [this.input.system]

        const inputAgent = this.input.agent ?? "build"
        // In real implementation, would get agent prompt
        return SystemPrompt.provider(modelInfo.modelID)
      })(),
    )

    system.push(...(await SystemPrompt.environment()))
    system.push(...(await SystemPrompt.custom()))

    // Max 2 system prompt messages for caching purposes
    const [first, ...rest] = system
    system = [first, rest.join("\n")]

    return system
  }
}