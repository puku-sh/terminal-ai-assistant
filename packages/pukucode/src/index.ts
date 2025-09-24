#!/usr/bin/env bun
import yargs from "yargs"
import { hideBin } from "yargs/helpers"
import { Log } from "./util/log"
import { ModelsCommand } from "cli/cmd/models"
import { AuthCommand } from "cli/cmd/auth"
import { RunCommand } from "cli/cmd/run"
import { ServerCommand } from "cli/cmd/server"



const logger = Log.create({ service: "cli" })

const cli = yargs(hideBin(process.argv))
  .scriptName("pukucode")

  cli.command(ModelsCommand)
  cli.command(AuthCommand)
  cli.command(RunCommand)
  cli.command(ServerCommand)
try {
  await cli.parse()
} catch (error) {
  logger.error("CLI command failed", { error })
  process.exit(1)
}