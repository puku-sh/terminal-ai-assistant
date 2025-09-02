#!/usr/bin/env bun
import yargs from "yargs"
import { hideBin } from "yargs/helpers"
import { App } from "./app/app"
import { Bus } from "@bus/"
import { Global } from "@global/"
import { Log } from "./util/log"
import { z} from "zod"

const logger = Log.create({ service: "cli" })

const cli = yargs(hideBin(process.argv))
  .scriptName("pukucode")
  .command({
    command: "test",
    describe: "test the app context",
    handler: async () => {
      logger.info("Starting app context test")
      await App.provide({ cwd: process.cwd() }, async (app) => {
        logger.info("App initialized successfully", { 
          hostname: app.hostname, 
          cwd: app.path.cwd,
          git: app.git 
        })
        console.log("App initialized:", app)
      })
    }
  })

  const TestEvent = Bus.event("test.message", z.object({
    message: z.string()
  }))

  cli.command({
    command: "event-test",
    describe: "test event bus",
    handler: async () => {
      logger.info("Starting event bus test")
      await App.provide({ cwd: process.cwd() }, async () => {
        // Subscribe
        logger.debug("Setting up event subscription")
        Bus.subscribe(TestEvent, (event) => {
          logger.info("Event received", { message: event.properties.message })
          console.log("Received:", event.properties.message)
        })

        // Publish  
        logger.debug("Publishing test event")
        await Bus.publish(TestEvent, { message: "Hello Events!" })
        logger.info("Event bus test completed")
      })
    }
  })

try {
  await cli.parse()
} catch (error) {
  logger.error("CLI command failed", { error })
  process.exit(1)
}