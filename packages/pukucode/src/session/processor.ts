import { z } from "zod"
import { generateText, streamText, tool, wrapLanguageModel, type Tool as AITool, type ModelMessage } from "ai"
import { splitWhen, mergeDeep, pipe } from "remeda"

import PROMPT_INITIALIZE from "./prompt/initialize.txt"
import PROMPT_PLAN from "./prompt/plan.txt"
import BUILD_SWITCH from "./prompt/build-switch.txt"

import { Bus } from "../bus"
import { Identifier } from "../id/id"
import { Provider } from "../provider/provider"
import { ProviderTransform } from "../provider/transform"
import { SystemPrompt } from "./system"
import { MessageV2 } from "./message-v2"
import { ReadTool } from "../tool/read"
import { ToolRegistry } from "../tool/registry"
import { Plugin } from "../plugin"
import { Agent } from "../agent/agent"
import { Permission } from "../permission"
import { Wildcard } from "../util/wildcard"
import { ulid } from "ulid"
import { defer } from "../util/defer"
import { Storage } from "../storage/storage"
import { FileTime } from "../file/time"
import { Instance } from "../project/instance"
import { Log } from "../util/log"

import type { ChatInput, PromptInput } from "./types"
import { OUTPUT_TOKEN_MAX, lock, isLocked, state, isDefaultTitle } from "./utils"
import { get, update } from "./crud"
import { messages, updateMessage, updatePart } from "./messages"
import { createStreamProcessor } from "./stream-processor"
import { summarize } from "./operations"

// ===================================================================
// MAIN PROMPT PROCESSING PIPELINE
// ===================================================================

export async function prompt(
  input: z.infer<typeof PromptInput>,
): Promise<{ info: MessageV2.Assistant; parts: MessageV2.Part[] }> {
  const l = Log.create({ service: "session" }).tag("session", input.sessionID)
  l.info("chatting")

  const inputAgent = input.agent ?? "build"

  // Process revert cleanup first, before creating new messages
  const session = await get(input.sessionID)
  if (session.revert) {
    let msgs = await messages(input.sessionID)
    const messageID = session.revert.messageID
    const [preserve, remove] = splitWhen(msgs, (x) => x.info.id === messageID)
    msgs = preserve
    for (const msg of remove) {
      await Storage.remove(["message", input.sessionID, msg.info.id])
      await Bus.publish(MessageV2.Event.Removed, { sessionID: input.sessionID, messageID: msg.info.id })
    }
    const last = preserve.at(-1)
    if (session.revert.partID && last) {
      const partID = session.revert.partID
      const [preserveParts, removeParts] = splitWhen(last.parts, (x) => x.id === partID)
      last.parts = preserveParts
      for (const part of removeParts) {
        await Storage.remove(["part", last.info.id, part.id])
        await Bus.publish(MessageV2.Event.PartRemoved, {
          sessionID: input.sessionID,
          messageID: last.info.id,
          partID: part.id,
        })
      }
    }
    await update(input.sessionID, (draft) => {
      draft.revert = undefined
    })
  }

  const userMsg: MessageV2.Info = {
    id: input.messageID ?? Identifier.ascending("message"),
    role: "user",
    sessionID: input.sessionID,
    time: {
      created: Date.now(),
    },
  }

  const userParts = await Promise.all(
    input.parts.map(async (part): Promise<MessageV2.Part[]> => {
      if (part.type === "file") {
        const url = new URL(part.url)
        switch (url.protocol) {
          case "data:":
            if (part.mime === "text/plain") {
              return [
                {
                  id: Identifier.ascending("part"),
                  messageID: userMsg.id,
                  sessionID: input.sessionID,
                  type: "text",
                  synthetic: true,
                  text: `Called the Read tool with the following input: ${JSON.stringify({ filePath: part.filename })}`,
                },
                {
                  id: Identifier.ascending("part"),
                  messageID: userMsg.id,
                  sessionID: input.sessionID,
                  type: "text",
                  synthetic: true,
                  text: Buffer.from(part.url, "base64url").toString(),
                },
                {
                  ...part,
                  id: part.id ?? Identifier.ascending("part"),
                  messageID: userMsg.id,
                  sessionID: input.sessionID,
                },
              ]
            }
            break
          case "file:":
            const filePath = decodeURIComponent(url.pathname)

            if (part.mime === "text/plain") {
              let offset: number | undefined = undefined
              let limit: number | undefined = undefined
              const range = {
                start: url.searchParams.get("start"),
                end: url.searchParams.get("end"),
              }
              if (range.start != null) {
                const filePath = part.url.split("?")[0]
                let start = parseInt(range.start)
                let end = range.end ? parseInt(range.end) : undefined
              }
              const args = { filePath, offset, limit }
              const result = await ReadTool.init().then((t) =>
                t.execute(args, {
                  sessionID: input.sessionID,
                  abort: new AbortController().signal,
                  agent: input.agent!,
                  messageID: userMsg.id,
                  extra: { bypassCwdCheck: true },
                  metadata: async () => {},
                }),
              )
              return [
                {
                  id: Identifier.ascending("part"),
                  messageID: userMsg.id,
                  sessionID: input.sessionID,
                  type: "text",
                  synthetic: true,
                  text: `Called the Read tool with the following input: ${JSON.stringify(args)}`,
                },
                {
                  id: Identifier.ascending("part"),
                  messageID: userMsg.id,
                  sessionID: input.sessionID,
                  type: "text",
                  synthetic: true,
                  text: result.output,
                },
                {
                  ...part,
                  id: part.id ?? Identifier.ascending("part"),
                  messageID: userMsg.id,
                  sessionID: input.sessionID,
                },
              ]
            }

            let file = Bun.file(filePath)
            FileTime.read(input.sessionID, filePath)
            return [
              {
                id: Identifier.ascending("part"),
                messageID: userMsg.id,
                sessionID: input.sessionID,
                type: "text",
                text: `Called the Read tool with the following input: {\\"filePath\\":\\"${filePath}\\"}`,
                synthetic: true,
              },
              {
                id: part.id ?? Identifier.ascending("part"),
                messageID: userMsg.id,
                sessionID: input.sessionID,
                type: "file",
                url: `data:${part.mime};base64,` + Buffer.from(await file.bytes()).toString("base64"),
                mime: part.mime,
                filename: part.filename!,
                source: part.source,
              },
            ]
        }
      }

      if (part.type === "agent") {
        return [
          {
            id: Identifier.ascending("part"),
            ...part,
            messageID: userMsg.id,
            sessionID: input.sessionID,
          },
          {
            id: Identifier.ascending("part"),
            messageID: userMsg.id,
            sessionID: input.sessionID,
            type: "text",
            synthetic: true,
            text:
              "Use the above message and context to generate a prompt and call the task tool with subagent: " +
              part.name,
          },
        ]
      }

      return [
        {
          id: Identifier.ascending("part"),
          ...part,
          messageID: userMsg.id,
          sessionID: input.sessionID,
        },
      ]
    }),
  ).then((x) => x.flat())

  await Plugin.trigger(
    "chat.message",
    {},
    {
      message: userMsg,
      parts: userParts,
    },
  )
  await updateMessage(userMsg)
  for (const part of userParts) {
    await updatePart(part)
  }

  // mark session as updated
  await update(input.sessionID, (_draft) => {})

  if (isLocked(input.sessionID)) {
    return new Promise((resolve) => {
      const queue = state().queued.get(input.sessionID) ?? []
      queue.push({
        input: input,
        message: userMsg,
        parts: userParts,
        processed: false,
        callback: resolve,
      })
      state().queued.set(input.sessionID, queue)
    })
  }

  const agent = await Agent.get(inputAgent)
  const modelConfig = await (async () => {
    if (input.model) {
      return input.model
    }
    if (agent.model) {
      return agent.model
    }
    return Provider.defaultModel()
  })()
  const model = await Provider.getModel(modelConfig.providerID, modelConfig.modelID)
  const modelWithIds = { ...model, providerID: modelConfig.providerID, modelID: modelConfig.modelID }
  let msgs = await messages(input.sessionID)

  const previous = msgs.filter((x) => x.info.role === "assistant").at(-1)?.info as MessageV2.Assistant
  const outputLimit = Math.min(modelWithIds.info.limit.output, OUTPUT_TOKEN_MAX) || OUTPUT_TOKEN_MAX

  // auto summarize if too long
  if (previous && previous.tokens) {
    const tokens =
      previous.tokens.input + previous.tokens.cache.read + previous.tokens.cache.write + previous.tokens.output
    if (model.info.limit.context && tokens > Math.max((model.info.limit.context - outputLimit) * 0.9, 0)) {
      state().autoCompacting.set(input.sessionID, true)

      // Will need to import summarize from operations module
      await summarize({
        sessionID: input.sessionID,
        providerID: model.providerID,
        modelID: model.info.id,
      })
      return prompt(input)
    }
  }

  using abort = lock(input.sessionID)

  const lastSummary = msgs.findLast((msg) => msg.info.role === "assistant" && msg.info.summary === true)
  if (lastSummary) msgs = msgs.filter((msg) => msg.info.id >= lastSummary.info.id)

  if (msgs.filter((m) => m.info.role === "user").length === 1 && !session.parentID && isDefaultTitle(session.title)) {
    const small = (await Provider.getSmallModel(model.providerID)) ?? model
    generateText({
      maxOutputTokens: small.info.reasoning ? 1024 : 20,
      providerOptions: {
        [model.providerID]: {
          ...small.info.options,
          ...ProviderTransform.options(small.providerID, small.modelID, input.sessionID),
        },
      },
      messages: [
        ...SystemPrompt.title(model.providerID).map(
          (x): ModelMessage => ({
            role: "system",
            content: x,
          }),
        ),
        ...MessageV2.toModelMessage([
          {
            info: {
              id: Identifier.ascending("message"),
              role: "user",
              sessionID: input.sessionID,
              time: {
                created: Date.now(),
              },
            },
            parts: userParts,
          },
        ]),
      ],
      model: small.language,
    })
      .then((result) => {
        if (result.text)
          return update(input.sessionID, (draft) => {
            const cleaned = result.text.replace(/<think>[\s\S]*?<\/think>\s*/g, "")
            const title = cleaned.length > 100 ? cleaned.substring(0, 97) + "..." : cleaned
            draft.title = title.trim()
          })
      })
      .catch((error) => {
        l.error("failed to generate title", { error, model: small.info.id })
      })
  }

  if (agent.name === "plan") {
    msgs.at(-1)?.parts.push({
      id: Identifier.ascending("part"),
      messageID: userMsg.id,
      sessionID: input.sessionID,
      type: "text",
      text: PROMPT_PLAN,
      synthetic: true,
    })
  }

  const lastAssistantMsg = msgs.filter((x) => x.info.role === "assistant").at(-1)?.info as MessageV2.Assistant
  if (lastAssistantMsg?.mode === "plan" && agent.name === "build") {
    msgs.at(-1)?.parts.push({
      id: Identifier.ascending("part"),
      messageID: userMsg.id,
      sessionID: input.sessionID,
      type: "text",
      text: BUILD_SWITCH,
      synthetic: true,
    })
  }

  let system = SystemPrompt.header(modelWithIds.providerID)
  system.push(
    ...(() => {
      if (input.system) return [input.system]
      if (agent.prompt) return [agent.prompt]
      return SystemPrompt.provider(modelWithIds.modelID)
    })(),
  )
  system.push(...(await SystemPrompt.environment()))
  system.push(...(await SystemPrompt.custom()))
  // max 2 system prompt messages for caching purposes
  const [first, ...rest] = system
  system = [first, rest.join("\n")]

  const assistantMsg: MessageV2.Info = {
    id: Identifier.ascending("message"),
    role: "assistant",
    system,
    mode: inputAgent,
    path: {
      cwd: Instance.directory,
      root: Instance.worktree,
    },
    cost: 0,
    tokens: {
      input: 0,
      output: 0,
      reasoning: 0,
      cache: { read: 0, write: 0 },
    },
    modelID: modelWithIds.modelID,
    providerID: modelWithIds.providerID,
    time: {
      created: Date.now(),
    },
    sessionID: input.sessionID,
  }
  await updateMessage(assistantMsg)

  await using _ = defer(async () => {
    if (assistantMsg.time.completed) return
    await Storage.remove(["session", "message", input.sessionID, assistantMsg.id])
    await Bus.publish(MessageV2.Event.Removed, { sessionID: input.sessionID, messageID: assistantMsg.id })
  })

  const tools: Record<string, AITool> = {}
  const processor = createStreamProcessor(assistantMsg, modelWithIds.info)

  const enabledTools = pipe(
    agent.tools,
    mergeDeep(await ToolRegistry.enabled(modelWithIds.providerID, modelWithIds.modelID, agent)),
    mergeDeep(input.tools ?? {}),
  )

  for (const item of await ToolRegistry.tools(modelWithIds.providerID, modelWithIds.modelID)) {
    if (Wildcard.all(item.id, enabledTools) === false) continue
    tools[item.id] = tool({
      id: item.id as any,
      description: item.description,
      inputSchema: item.parameters as z.ZodSchema,
      async execute(args, options) {
        await Plugin.trigger(
          "tool.execute.before",
          {
            tool: item.id,
            sessionID: input.sessionID,
            callID: options.toolCallId,
          },
          {
            args,
          },
        )
        const result = await item.execute(args, {
          sessionID: input.sessionID,
          abort: options.abortSignal!,
          messageID: assistantMsg.id,
          callID: options.toolCallId,
          agent: agent.name,
          metadata: async (val) => {
            const match = processor.partFromToolCall(options.toolCallId)
            if (match && match.state.status === "running") {
              await updatePart({
                ...match,
                state: {
                  title: val.title,
                  metadata: val.metadata,
                  status: "running",
                  input: args,
                  time: {
                    start: Date.now(),
                  },
                },
              })
            }
          },
        })
        await Plugin.trigger(
          "tool.execute.after",
          {
            tool: item.id,
            sessionID: input.sessionID,
            callID: options.toolCallId,
          },
          result,
        )
        return result
      },
      toModelOutput(result) {
        return {
          type: "text",
          value: result.output,
        }
      },
    })
  }

  const params = await Plugin.trigger(
    "chat.params",
    {
      model: model.info,
      provider: await Provider.getProvider(model.providerID),
      message: userMsg,
    },
    {
      temperature: model.info.temperature
        ? (agent.temperature ?? ProviderTransform.temperature(model.providerID, model.modelID))
        : undefined,
      topP: agent.topP ?? ProviderTransform.topP(model.providerID, model.modelID),
      options: {
        ...ProviderTransform.options(model.providerID, model.modelID, input.sessionID),
        ...model.info.options,
        ...agent.options,
      },
    },
  )

  const stream = streamText({
    onError(e) {
      l.error("streamText error", {
        error: e,
      })
    },
    async prepareStep({ messages }) {
      const queue = (state().queued.get(input.sessionID) ?? []).filter((x) => !x.processed)
      if (queue.length) {
        for (const item of queue) {
          if (item.processed) continue
          messages.push(
            ...MessageV2.toModelMessage([
              {
                info: item.message,
                parts: item.parts,
              },
            ]),
          )
          item.processed = true
        }
        assistantMsg.time.completed = Date.now()
        await updateMessage(assistantMsg)
        Object.assign(assistantMsg, {
          id: Identifier.ascending("message"),
          role: "assistant",
          system,
          path: {
            cwd: Instance.directory,
            root: Instance.worktree,
          },
          cost: 0,
          tokens: {
            input: 0,
            output: 0,
            reasoning: 0,
            cache: { read: 0, write: 0 },
          },
          modelID: model.modelID,
          providerID: model.providerID,
          mode: inputAgent,
          time: {
            created: Date.now(),
          },
          sessionID: input.sessionID,
        })
        await updateMessage(assistantMsg)
      }
      return {
        messages,
      }
    },
    async experimental_repairToolCall(input) {
      return {
        ...input.toolCall,
        input: JSON.stringify({
          tool: input.toolCall.toolName,
          error: input.error.message,
        }),
        toolName: "invalid",
      }
    },
    headers:
      model.providerID === "pukucode"
        ? {
            "x-opencode-session": input.sessionID,
            "x-opencode-request": userMsg.id,
          }
        : undefined,
    maxRetries: 3,
    activeTools: Object.keys(tools).filter((x) => x !== "invalid"),
    maxOutputTokens: outputLimit,
    abortSignal: abort.signal,
    stopWhen: async ({ steps }) => {
      if (steps.length >= 1000) {
        return true
      }

      if (processor.getShouldStop()) {
        return true
      }

      return false
    },
    providerOptions: {
      [model.providerID]: params.options,
    },
    temperature: params.temperature,
    topP: params.topP,
    messages: [
      ...system.map(
        (x): ModelMessage => ({
          role: "system",
          content: x,
        }),
      ),
      ...MessageV2.toModelMessage(msgs.filter((m) => !(m.info.role === "assistant" && m.info.error))),
    ],
    tools: model.info.tool_call === false ? undefined : tools,
    model: wrapLanguageModel({
      model: model.language,
      middleware: [
        {
          async transformParams(args) {
            if (args.type === "stream") {
              // @ts-expect-error
              args.params.prompt = ProviderTransform.message(args.params.prompt, model.providerID, model.modelID)
            }
            return args.params
          },
        },
      ],
    }),
  })

  const result = await processor.process(stream)
  const queued = state().queued.get(input.sessionID) ?? []
  const unprocessed = queued.find((x) => !x.processed)
  if (unprocessed) {
    unprocessed.processed = true
    return prompt(unprocessed.input)
  }
  for (const item of queued) {
    item.callback(result)
  }
  state().queued.delete(input.sessionID)
  return result
}