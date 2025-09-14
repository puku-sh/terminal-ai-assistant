import z from "zod"
import { Bus } from "../bus"
import { NamedError } from "../util/error"
import { Message } from "./message"
import { convertToModelMessages, type ModelMessage, type UIMessage } from "ai"
import { Identifier } from "../id/id"
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi"


extendZodWithOpenApi(z)

export namespace MessageV2{
    // start with basic error types
    export const OutputLengthError = NamedError.create("MessageOutputLengthError", z.object({}))
    export const AbortedError = NamedError.create("MessageAbortedError", z.object({}))
    export const AuthError = NamedError.create(
        "ProviderAuthError",
        z.object({
        providerID: z.string(),
        message: z.string(),
        }),
    )

    //Build Tool states
    export const ToolStatePending = z 
    .object({
        status:z.literal("pending")
    })
    .openapi("ToolStatePending")

    export type ToolStatePending = z.infer<typeof ToolStatePending>

    export const ToolStateRunning = z
    .object({
        status: z.literal("running"),
        input: z.any(),
        title: z.string().optional(),
        metadata: z.record(z.any()).optional(),
        time: z.object({
        start: z.number(),
        }),
    })
    .openapi("ToolStateRunning")
    export type ToolStateRunning = z.infer<typeof ToolStateRunning>

    export const ToolStateCompleted = z
        .object({
        status: z.literal("completed"),
        input: z.record(z.any()),
        output: z.string(),
        title: z.string(),
        metadata: z.record(z.any()),
        time: z.object({
            start: z.number(),
            end: z.number(),
        }),
        })
        .openapi("ToolStateCompleted")
    export type ToolStateCompleted = z.infer<typeof ToolStateCompleted>

    export const ToolStateError = z
        .object({
        status: z.literal("error"),
        input: z.record(z.any()),
        error: z.string(),
        metadata: z.record(z.any()).optional(),
        time: z.object({
            start: z.number(),
            end: z.number(),
        }),
        })
        .openapi("ToolStateError")

    export type ToolStateError = z.infer<typeof ToolStateError>


    export const ToolState = z
        .discriminatedUnion("status", [ToolStatePending, ToolStateRunning, ToolStateCompleted, ToolStateError])
        .openapi("ToolState")

//Define Core Part Types
    const PartBase = z.object({
        id: z.string(),
        sessionID: z.string(),
        messageID: z.string(),
        })
    // Essential parts for LLM responses
    export const TextPart = PartBase.extend({
        type: z.literal("text"),
        text: z.string(),
        synthetic: z.boolean().optional(),
        time: z
            .object({
            start: z.number(),
            end: z.number().optional(),
            })
            .optional(),
        }).openapi("TextPart")

    export type TextPart = z.infer<typeof TextPart>
    export const ToolPart = PartBase.extend({
        type: z.literal("tool"),
        callID: z.string(),
        tool: z.string(),
        state: ToolState,
      }).openapi("ToolPart")

    export type ToolPart = z.infer<typeof ToolPart>

    export const StepStartPart = PartBase.extend({
        type: z.literal("step-start"),
      }).openapi("StepStartPart")
    export type StepStartPart = z.infer<typeof StepStartPart>
    
    export const StepFinishPart = PartBase.extend({
        type: z.literal("step-finish"),
        cost: z.number(),
        tokens: z.object({
          input: z.number(),
          output: z.number(),
          reasoning: z.number(),
          cache: z.object({
            read: z.number(),
            write: z.number(),
          }),
        }),
      }).openapi("StepFinishPart")
     
    export type StepFinishPart = z.infer<typeof StepFinishPart>

    const Base = z.object({
        id: z.string(),
        sessionID: z.string(),
      })
    
      export const User = Base.extend({
        role: z.literal("user"),
        time: z.object({
          created: z.number(),
        }),
      }).openapi("UserMessage")
      export type User = z.infer<typeof User>
    
      export const Part = z
        .discriminatedUnion("type", [
          TextPart,
          ToolPart,
          StepStartPart,
          StepFinishPart
        ])
        .openapi("Part")
    
    export type Part = z.infer<typeof Part>
    
    export const Assistant = Base.extend({
        role: z.literal("assistant"),
        time: z.object({
          created: z.number(),
          completed: z.number().optional(),
        }),
        error: z
          .discriminatedUnion("name", [
            AuthError.Schema,
            NamedError.Unknown.Schema,
            OutputLengthError.Schema,
            AbortedError.Schema,
          ])
          .optional(),
        system: z.string().array(),
        modelID: z.string(),
        providerID: z.string(),
        mode: z.string(),
        path: z.object({
          cwd: z.string(),
          root: z.string(),
        }),
        summary: z.boolean().optional(),
        cost: z.number(),
        tokens: z.object({
          input: z.number(),
          output: z.number(),
          reasoning: z.number(),
          cache: z.object({
            read: z.number(),
            write: z.number(),
          }),
        }),
      }).openapi("AssistantMessage")
    
    export type Assistant = z.infer<typeof Assistant>
    
    export const Info = z.discriminatedUnion("role", [User, Assistant]).openapi("Message")
    export type Info = z.infer<typeof Info>
    export const Event = {
        Updated: Bus.event(
          "message.updated",
          z.object({
            info: Info,
          }),
        ),
        Removed: Bus.event(
          "message.removed",
          z.object({
            sessionID: z.string(),
            messageID: z.string(),
          }),
        ),
        PartUpdated: Bus.event(
          "message.part.updated",
          z.object({
            part: Part,
          }),
        ),
        PartRemoved: Bus.event(
          "message.part.removed",
          z.object({
            sessionID: z.string(),
            messageID: z.string(),
            partID: z.string(),
          }),
        ),
    }
    //LLM integration
    export function toModelMessage(
        input: {
          info: Info
          parts: Part[]
        }[],
      ): ModelMessage[] {
        const result: UIMessage[] = []
    
        for (const msg of input) {
          if (msg.parts.length === 0) continue
    
          if (msg.info.role === "user") {
            result.push({
              id: msg.info.id,
              role: "user",
              parts: msg.parts.flatMap((part): UIMessage["parts"] => {
                if (part.type === "text")
                  return [
                    {
                      type: "text",
                      text: part.text,
                    },
                  ]
                // text/plain files are converted into text parts, ignore them
                if (part.type === "file" && part.mime !== "text/plain")
                  return [
                    {
                      type: "file",
                      url: part.url,
                      mediaType: part.mime,
                      filename: part.filename,
                    },
                  ]
                return []
              }),
            })
          }
    
          if (msg.info.role === "assistant") {
            result.push({
              id: msg.info.id,
              role: "assistant",
              parts: msg.parts.flatMap((part): UIMessage["parts"] => {
                if (part.type === "text")
                  return [
                    {
                      type: "text",
                      text: part.text,
                    },
                  ]
                if (part.type === "step-start")
                  return [
                    {
                      type: "step-start",
                    },
                  ]
                if (part.type === "tool") {
                  if (part.state.status === "completed")
                    return [
                      {
                        type: ("tool-" + part.tool) as `tool-${string}`,
                        state: "output-available",
                        toolCallId: part.callID,
                        input: part.state.input,
                        output: part.state.output,
                      },
                    ]
                  if (part.state.status === "error")
                    return [
                      {
                        type: ("tool-" + part.tool) as `tool-${string}`,
                        state: "output-error",
                        toolCallId: part.callID,
                        input: part.state.input,
                        errorText: part.state.error,
                      },
                    ]
                }
    
                return []
              }),
            })
          }
        }
    
        return convertToModelMessages(result)
      }
        

}