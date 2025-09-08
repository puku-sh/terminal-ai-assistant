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
import { File } from "./file"
import { Ripgrep } from "./file/ripgrep"
import { FileTime } from "./file/time"
import { FileWatcher } from "./file/watch"

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
    command: "file-status",
    describe: "Check git tracked files (added, deleted, modified)",
    handler: async () => {
      await App.provide({ cwd: process.cwd() }, async () => {
        const files = await File.status()
        console.log("=== Git File Status ===")
        if (files.length === 0) {
          console.log("No changes found")
        } else {
          for (const f of files) {
            console.log(`${f.status.toUpperCase()} → ${f.path}  (+${f.added} -${f.removed})`)
          }
        }
      })
    }
  })
  cli.command({
    command: "file-read <file>",
    describe: "Read file content or show diff if modified",
    builder: (yargs) => yargs.positional("file", { type: "string", demandOption: true }),
    handler: async (args) => {
      const file = args.file as string
      await App.provide({ cwd: process.cwd() }, async () => {
        const result = await File.read(file)
        console.log("=== File Read Result ===")
        console.log(`Type: ${result.type}`)
        console.log(result.content.substring(0, 400)) // show first 400 chars
      })
    }
  })
  cli.command({
    command: "file-tree",
    describe: "List project files using Ripgrep stub implementation",
    builder: (yargs) =>
      yargs.option("limit", {
        alias: "l",
        type: "number",
        describe: "Limit number of files shown",
      }),
    handler: async (args) => {
      await App.provide({ cwd: process.cwd() }, async (app) => {
        console.log("=== File Tree ===")
        const tree = await Ripgrep.tree({
          cwd: app.path.cwd,
          limit: args.limit,
        })
        console.log(tree)
      })
    },
  })
  cli.command({
    command: "file-time-test <file>",
    describe: "Interactively test file freshness tracking",
    builder: (yargs) => yargs.positional("file", {
      type: "string", demandOption: true
    }),
    handler: async (args) => {
      const file = args.file as string;
  
      await App.provide({ cwd: process.cwd() }, async () => {
        const sessionID = "interactive-session";
  
        // --- Step 1: Initial Read ---
        console.log(`[1] Reading file '${file}' and recording timestamp...`);
        FileTime.read(sessionID, file);
        console.log(`   -> Timestamp recorded: ${FileTime.get(sessionID, file)?.toISOString()}`);
  
        try {
          await FileTime.assert(sessionID, file);
          console.log("   -> ✔ Immediately after reading, the file is fresh. Correct.");
        } catch (e) {
          // This part should not fail
          console.error("   -> ❌ This should not have failed!", e);
        }
  
        // --- Step 2: Wait for manual modification ---
        console.log(`\n[2] You now have 10 seconds to manually edit and save the file: ${file}`);
        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait for 10 seconds
  
        // --- Step 3: Assert Freshness Again ---
        console.log("\n[3] Checking file freshness again after 10 seconds...");
        try {
          await FileTime.assert(sessionID, file);
          console.log("   -> ✔ OK: The file was NOT modified in the last 10 seconds.");
        } catch (e) {
          console.error("   -> ❌ FAILED: The file was modified since it was last read. Correct!");
          console.error(`      Reason: ${(e as Error).message}`);
        }
      });
    }
  });
//hello
cli.command({
  command: "watch-test",
  describe: "Test file watcher",
  handler: async () => {
    await App.provide({ cwd: process.cwd() }, async () => {
      Bus.subscribe(FileWatcher.Event.Updated, (event) => {
        console.log("📂 File changed:", event.properties.file, "event:", event.properties.event)
      })

      FileWatcher.init()
      console.log("👀 Watching for file changes... edit something in your project!")

      // Keep process alive
      await new Promise(() => {})
    })
  }
})

try {
  await cli.parse()
} catch (error) {
  logger.error("CLI command failed", { error })
  process.exit(1)
}