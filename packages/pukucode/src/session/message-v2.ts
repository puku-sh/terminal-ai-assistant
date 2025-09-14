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


}