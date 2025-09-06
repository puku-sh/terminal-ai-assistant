#!/usr/bin/env bun
import yargs from "yargs"
import { hideBin } from "yargs/helpers"
import { App } from "./app/app"
import { Bus } from "./bus"
import { Log } from "./util/log"
import { z} from "zod"
import { Filesystem } from "./util/filesystem"
import os from "os"
import path from "path"
import { useAppInfoService } from "./services/appInfoService"
import { ModelsDev } from "./provider/model" // import for models-test command

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

  cli.command({
    command: "fs-test",
    describe: "test filesystem helpers",
    handler: async () => {
      logger.info("Starting filesystem test")
      await App.provide({ cwd: process.cwd() }, async (app) => {
        logger.info("App initialized for filesystem test", { cwd: app.path.cwd })
  
        // Example 1: contains
        const insideHome = Filesystem.contains(
          os.homedir(),
          app.path.cwd
        )
        console.log("Is cwd inside home?", insideHome)
  
        // Example 2: findUp
        const pkgJsons = await Filesystem.findUp("package.json", app.path.cwd)
        console.log("Found package.json files:", pkgJsons)
  
        // Example 3: overlaps
        const overlaps = Filesystem.overlaps(
          app.path.cwd,
          path.join(app.path.cwd, "subdir")
        )
        console.log("Does cwd overlap with cwd/subdir?", overlaps)
  
        // Example 4: up async generator
        for await (const match of Filesystem.up({ targets: [".gitignore"], start: app.path.cwd })) {
          console.log("Found .gitignore walking up:", match)
        }
      })
    }
  })


  // Add this to CLI setup
  cli.command({
    command: "app-info",
    describe: "Show application context and test App.state service",
    handler: async () => {
      await App.provide({ cwd: process.cwd() }, async (app) => {
        // --- App.info usage ---
        console.log("=== From App.info() ===")
        console.log("Hostname:", app.hostname)
        console.log("Root directory:", app.path.root)
        console.log("Git repo?:", app.git)

        // --- Service usage ---
        console.log("\n=== From App.state (App Info Service) ===")
        const infoService = useAppInfoService()
        console.log(infoService.summary())

        // 🛑 Trigger service shutdown at the end of the run
        await App.shutdown()
      })

      // optionally: await App.shutdown()
    }
  })

  cli.command({
    command: "models-test",
    describe: "Test the ModelsDev provider",
    handler: async () => {
      logger.info("Starting ModelsDev provider test")
      await App.provide({ cwd: process.cwd() }, async () => {
        try {
          console.log("=== Testing ModelsDev.get() ===")
          const providers = await ModelsDev.get()
          console.log("Loaded providers:", Object.keys(providers))
          
          for (const [providerId, provider] of Object.entries(providers)) {
            console.log(`\n=== Provider: ${providerId} ===`)
            console.log("Name:", provider.name)
            console.log("Environment vars needed:", provider.env)
            console.log("Models count:", Object.keys(provider.models).length)
            
            // Test schema validation
            const validationResult = ModelsDev.Provider.safeParse(provider)
            console.log("Schema validation:", validationResult.success ? "✓ PASS" : "✗ FAIL")
            
            if (!validationResult.success) {
              console.log("Validation errors:", validationResult.error.issues)
            }
            
            // Show first model as example
            const firstModelId = Object.keys(provider.models)[0]
            if (firstModelId) {
              const firstModel = provider.models[firstModelId]
              console.log(`Example model (${firstModelId}):`)
              console.log("  Name:", firstModel.name)
              console.log("  Context limit:", firstModel.limit.context)
              console.log("  Input cost:", firstModel.cost.input)
            }
          }
          
          logger.info("ModelsDev provider test completed successfully")
        } catch (error) {
          logger.error("ModelsDev provider test failed", { error })
          console.error("Test failed:", error)
        }
      })
    }
  })

try {
  await cli.parse()
} catch (error) {
  logger.error("CLI command failed", { error })
  process.exit(1)
}