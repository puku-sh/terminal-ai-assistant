import { Context } from "../util/context"
import path from "path"
import os from "os"
import { Filesystem } from "../util/filesystem"
import { Global } from "../global"   // use your global path manager

export namespace App {
  export type Info = {
    hostname: string
    git: boolean
    path: {
      config: string
      data: string
      root: string
      cwd: string
      state: string
    }
    time: {
      initialized?: number
    }
  }

  type ContextValue = {
    info: Info
    services: Map<any, any>
    shutdowns: Map<any, (state: any) => Promise<void> | void>
  }

  const ctx = Context.create<ContextValue>("app")

  export async function provide<T>(
    input: { cwd: string }, 
    cb: (app: Info) => Promise<T>
  ) {
    // detect git repo
    let gitRoot: string | null = null
    const foundGit = await Filesystem.findUp(".git", input.cwd)
    if (foundGit.length) {
      gitRoot = path.dirname(foundGit[0])
    }

    const info: Info = {
      hostname: os.hostname(),
      git: !!gitRoot,
      path: {
        config: Global.Path.config,
        data: Global.Path.data,
        root: gitRoot ?? input.cwd,  // <-- project root (git root or cwd)
        cwd: input.cwd,
        state: Global.Path.state,
      },
      time: {
        initialized: Date.now(),
      },
    }

    return ctx.provide(
      { info, services: new Map(), shutdowns: new Map() },
      () => cb(info)
    )
  }

   /**
   * Access just the app info
   */
   export function info(): Info {
    return ctx.use().info
  }
  
  /**
   * Register a service/state with optional shutdown handler
   */
  export function state<State>(
    key: any,
    init: (app: Info) => State,
    shutdown?: (state: State) => Promise<void> | void
  ) {
    return () => {
      const app = ctx.use()
      if (!app.services.has(key)) {
        const service = init(app.info)
        app.services.set(key, service)
        if (shutdown) {
          app.shutdowns.set(key, shutdown as any)
        }
      }
      return app.services.get(key) as State
    }
  }

  /**
   * Initialize the app (e.g. pre-warm services, ensure paths exist)
   */
  export async function initialize() {
    const app = ctx.use()
    // Touch initialization timestamp
    app.info.time.initialized = Date.now()
    // You could also force eager service init here if desired
  }

  /**
   * Shutdown app: call all registered service shutdown hooks
   */
  export async function shutdown() {
    const app = ctx.use()
    for (const [key, state] of app.services) {
      const shutdownFn = app.shutdowns.get(key)
      if (shutdownFn) {
        try {
          await shutdownFn(state)
        } catch (e) {
          console.error(`Error shutting down service ${String(key)}`, e)
        }
      }
    }
    // Clear context maps
    app.services.clear()
    app.shutdowns.clear()
  }

  export const use = ctx.use
}

