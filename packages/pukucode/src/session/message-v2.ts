import z from "zod"
import { Bus } from "../bus"
import { NamedError } from "../util/error"
import { Message } from "./message"
import { convertToModelMessages, type ModelMessage, type UIMessage } from "ai"
import { Identifier } from "../id/id"

export namespace MessageV2{
    export const OutputLengthError = NamedError.create("MessageOutputLengthError", z.object({}))
    export const AbortedError = NamedError.create("MessageAbortedError", z.object({}))
    export const AuthError = NamedError.create(
        "ProviderAuthError",
        z.object({
        providerID: z.string(),
        message: z.string(),
        }),
    )
}