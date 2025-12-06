import type { Argv } from "yargs"
import { Server } from "../../server/server"
import { UI } from "../ui"
import { cmd } from "./cmd"
import { bootstrap } from "../bootstrap"

export const ServerCommand = cmd({
  command: "server",
  describe: "start the pukucode server",
  builder: (yargs: Argv) => {
    return yargs
      .option("port", {
        describe: "port to listen on",
        type: "number",
        default: 3000,
        alias: "p",
      })
      .option("hostname", {
        describe: "hostname to bind to",
        type: "string",
        default: "localhost",
        alias: "h",
      })
      .option("open", {
        describe: "open browser after starting",
        type: "boolean",
        default: false,
        alias: "o",
      })
      .option("log-level", {
        describe: "log level (DEBUG, INFO, WARN, ERROR)",
        type: "string",
        choices: ["DEBUG", "INFO", "WARN", "ERROR"],
        alias: "l",
      })
  },
  handler: async (args) => {
    // Re-initialize logging if log-level flag is provided
    if (args["log-level"]) {
      const { Log } = await import("../../util/log")
      await Log.init({
        print: true,
        level: args["log-level"] as "DEBUG" | "INFO" | "WARN" | "ERROR"
      })
    }

    await bootstrap(process.cwd(), async () => {
      const port = args.port as number
      const hostname = args.hostname as string

      UI.println(UI.Style.TEXT_INFO_BOLD + "Starting pukucode server...")
      UI.println(UI.Style.TEXT_DIM + `Port: ${port}`)
      UI.println(UI.Style.TEXT_DIM + `Hostname: ${hostname}`)
      if (args["log-level"]) {
        UI.println(UI.Style.TEXT_DIM + `Log Level: ${args["log-level"]}`)
      }
      
      const server = Server.listen({ port, hostname })

      console.log(`pukucode server listening on http://${server.hostname}:${server.port}`)
      
      const url = `http://${hostname}:${port}`
      UI.println(UI.Style.TEXT_SUCCESS_BOLD + `Server running at ${url}`)
      UI.println(UI.Style.TEXT_DIM + `API docs at ${url}/doc`)
      UI.println(UI.Style.TEXT_DIM + `Press Ctrl+C to stop`)
      
      if (args.open) {
        try {
          await Bun.spawn({
            cmd: process.platform === "win32" ? ["start", url] : 
                 process.platform === "darwin" ? ["open", url] : 
                 ["xdg-open", url]
          }).exited
        } catch (error) {
          UI.println(UI.Style.TEXT_WARNING + "Could not open browser")
        }
      }
      
      // Keep the process alive
      await new Promise(() => {})
      server.stop()
    })
  },
})