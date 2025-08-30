import { Context } from "../util/context"
import path from "path"
import os from "os"

export namespace App {
  export type Info = {
    hostname: string
    git: boolean
    path: {
      config: string
      data: string
      root: string
      cwd: string
    }
  }

  const ctx = Context.create<{ info: Info; services: Map<any, any> }>("app")

  export async function provide<T>(
    input: { cwd: string }, 
    cb: (app: Info) => Promise<T>
  ) {
    const info: Info = {
      hostname: os.hostname(),
      git: false, // TODO: detect git
      path: {
        config: path.join(os.homedir(), '.opencode'),
        data: path.join(os.homedir(), '.opencode/data'),
        root: input.cwd,
        cwd: input.cwd
      }
    }

    return ctx.provide({ info, services: new Map() }, () => cb(info))
  }
  export function state<State>(
    key: any,
    init: (app: Info) => State
  ) {
    return () => {
      const app = ctx.use()
      if (!app.services.has(key)) {
        app.services.set(key, init(app.info))
      }
      return app.services.get(key) as State
    }
  }

  export const use = ctx.use
}

