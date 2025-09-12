
import { App } from "../app/app"
import { Config } from "../config/config"
import { Bus } from "../bus"
import { Log } from "../util/log"

// Stub implementation of Plugin system to avoid external dependencies
export namespace Plugin {
  const log = Log.create({ service: "plugin" })

  // Basic hook types for the stub implementation
  interface Hook {
    config?: (config: any) => Promise<void>
    event?: (input: { event: any }) => Promise<void>
    [key: string]: any
  }

  const state = App.state("plugin", async () => {
    // Return empty state since we're stubbing the plugin system
    return {
      hooks: [] as Hook[],
      input: {},
    }
  })

  export async function trigger<Input = any, Output = any>(
    name: string, 
    input: Input, 
    output: Output
  ): Promise<Output> {
    // Stub implementation - just return the output without modification
    return output
  }

  export async function list() {
    return state().then((x) => x.hooks)
  }

  export async function init() {
    // Stub implementation - no-op
    log.info("Plugin system initialized (stub)")
  }
}
