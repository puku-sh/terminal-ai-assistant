import { z } from "zod"
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi"

// Initialize Zod OpenAPI extension
extendZodWithOpenApi(z)

// ===================================================================
// MODULAR SESSION NAMESPACE - Import and re-export from specialized modules
// ===================================================================

// Import all functionality from modules
import * as Types from "./types"
import * as Utils from "./utils"
import * as Crud from "./crud"
import * as Messages from "./messages"
import * as Processor from "./processor"
import * as StreamProcessor from "./stream-processor"
import * as Shell from "./shell"
import * as Command from "./command"
import * as Operations from "./operations"

// Create namespace that aggregates all functionality
export namespace Session {
  // Types and schemas
  export const Info = Types.Info
  export const ShareInfo = Types.ShareInfo
  export const Event = Types.Event
  export const PromptInput = Types.PromptInput
  export const ShellInput = Types.ShellInput
  export const CommandInput = Types.CommandInput
  export const RevertInput = Types.RevertInput
  export const BusyError = Types.BusyError
  export const bashRegex = Types.bashRegex
  export const fileRegex = Types.fileRegex
  export type Info = Types.Info
  export type ShareInfo = Types.ShareInfo
  export type ChatInput = Types.ChatInput
  export type ShellInput = Types.ShellInput
  export type CommandInput = Types.CommandInput
  export type RevertInput = Types.RevertInput

  // Utility functions
  export const OUTPUT_TOKEN_MAX = Utils.OUTPUT_TOKEN_MAX
  export const createDefaultTitle = Utils.createDefaultTitle
  export const isDefaultTitle = Utils.isDefaultTitle
  export const state = Utils.state
  export const isLocked = Utils.isLocked
  export const lock = Utils.lock
  export const getUsage = Utils.getUsage

  // CRUD operations
  export const create = Crud.create
  export const createNext = Crud.createNext
  export const get = Crud.get
  export const update = Crud.update
  export const list = Crud.list
  export const children = Crud.children
  export const remove = Crud.remove

  // Message handling
  export const messages = Messages.messages
  export const getMessage = Messages.getMessage
  export const getParts = Messages.getParts
  export const updateMessage = Messages.updateMessage
  export const updatePart = Messages.updatePart

  // Main processing functions
  export const prompt = Processor.prompt

  // Stream processor
  export const createStreamProcessor = StreamProcessor.createStreamProcessor

  // Shell functionality
  export const shell = Shell.shell

  // Command functionality
  export const command = Command.command

  // Operations
  export const revert = Operations.revert
  export const unrevert = Operations.unrevert
  export const summarize = Operations.summarize
  export const abort = Operations.abort
  export const initialize = Operations.initialize
}
