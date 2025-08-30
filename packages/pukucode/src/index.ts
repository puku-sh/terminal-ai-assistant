import yargs from "yargs"
import { hideBin } from "yargs/helpers"
import { App } from "./app/app"
import { Bus } from "./bus"
import { z} from "zod"

const cli = yargs(hideBin(process.argv))
  .scriptName("my-agent")
  .command({
    command: "test",
    describe: "test the app context",
    handler: async () => {
      await App.provide({ cwd: process.cwd() }, async (app) => {
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
      await App.provide({ cwd: process.cwd() }, async () => {
        // Subscribe
        Bus.subscribe(TestEvent, (event) => {
          console.log("Received:", event.properties.message)
        })

        // Publish  
        await Bus.publish(TestEvent, { message: "Hello Events!" })
      })
    }
  })

await cli.parse()