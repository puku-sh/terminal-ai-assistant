import { Log } from "../util/log"
import { Bus } from "../bus"
import { Hono } from "hono"
import { cors } from "hono/cors"
import { streamSSE } from "hono/streaming"
import { Session } from "../session"
import z from "zod"
import { Provider } from "../provider/provider"
import { mapValues } from "remeda"
import { NamedError } from "../util/error"
import { ModelsDev } from "../provider/models"
import { Config } from "../config/config"
import { File } from "../file"
import { MessageV2 } from "../session/message-v2"
import { callTui, TuiRoute } from "./tui"
import { Permission } from "../permission"
import { Instance } from "../project/instance"
import { Agent } from "../agent/agent"
import { Auth } from "../auth"
import { Command } from "../command"
import { Global } from "../global"
import { ProjectRoute } from "./project"
import { ToolRegistry } from "../tool/registry"

export namespace Server {
  const log = Log.create({ service: "server" })

  export const Event = {
    Connected: Bus.event("server.connected", z.object({})),
  }

  const app = new Hono()
  
  export function App() {
    return app
      .onError((err, c) => {
        log.error("failed", {
          error: err,
        })
        if (err instanceof NamedError) {
          return c.json(err.toObject(), {
            status: 400,
          })
        }
        return c.json(new NamedError.Unknown({ message: err.toString() }).toObject(), {
          status: 400,
        })
      })
      .use(async (c, next) => {
        const skipLogging = c.req.path === "/log"
        if (!skipLogging) {
          log.info("request", {
            method: c.req.method,
            path: c.req.path,
          })
        }
        const start = Date.now()
        await next()
        if (!skipLogging) {
          log.info("response", {
            duration: Date.now() - start,
          })
        }
      })
      .use(async (c, next) => {
        const directory = c.req.query("directory") ?? process.cwd()
        return Instance.provide(directory, async () => {
          return next()
        })
      })
      .use(cors())
      
      // Basic health check
      .get("/", async (c) => {
        return c.json({ 
          name: "pukucode", 
          version: "1.0.0",
          status: "running" 
        })
      })
      
      // Config endpoints
      .get("/config", async (c) => {
        return c.json(await Config.get())
      })
      
      // Path info
      .get("/path", async (c) => {
        return c.json({
          state: Global.Path.state,
          config: Global.Path.config,
          worktree: Instance.worktree,
          directory: Instance.directory,
        })
      })
      
      // Session endpoints
      .get("/session", async (c) => {
        const sessions = await Array.fromAsync(Session.list())
        sessions.sort((a, b) => b.time.updated - a.time.updated)
        return c.json(sessions)
      })
      
      .get("/session/:id", async (c) => {
        const sessionID = c.req.param("id")
        const session = await Session.get(sessionID)
        return c.json(session)
      })
      
      .post("/session", async (c) => {
        const body = await c.req.json().catch(() => ({}))
        const session = await Session.create(body.parentID, body.title)
        return c.json(session)
      })
      
      .delete("/session/:id", async (c) => {
        await Session.remove(c.req.param("id"))
        return c.json(true)
      })
      
      .patch("/session/:id", async (c) => {
        const sessionID = c.req.param("id")
        const updates = await c.req.json()

        const updatedSession = await Session.update(sessionID, (session) => {
          if (updates.title !== undefined) {
            session.title = updates.title
          }
        })

        return c.json(updatedSession)
      })
      
      // Messages
      .get("/session/:id/message", async (c) => {
        const messages = await Session.messages(c.req.param("id"))
        return c.json(messages)
      })
      
      .get("/session/:id/message/:messageID", async (c) => {
        const sessionID = c.req.param("id")
        const messageID = c.req.param("messageID")
        const message = await Session.getMessage(sessionID, messageID)
        return c.json(message)
      })
      
      .post("/session/:id/message", async (c) => {
        const sessionID = c.req.param("id")
        const body = await c.req.json()
        const msg = await Session.prompt({ ...body, sessionID })
        return c.json(msg)
      })
      
      .post("/session/:id/command", async (c) => {
        const sessionID = c.req.param("id")
        const body = await c.req.json()
        const msg = await Session.command({ ...body, sessionID })
        return c.json(msg)
      })
      
      .post("/session/:id/shell", async (c) => {
        const sessionID = c.req.param("id")
        const body = await c.req.json()
        const msg = await Session.shell({ ...body, sessionID })
        return c.json(msg)
      })
      
      .post("/session/:id/abort", async (c) => {
        return c.json(Session.abort(c.req.param("id")))
      })
      
      // Providers
      .get("/config/providers", async (c) => {
        const providers = await Provider.list().then((x) => mapValues(x, (item) => item.info))
        return c.json({
          providers: Object.values(providers),
          default: mapValues(providers, (item) => Provider.sort(Object.values(item.models))[0].id),
        })
      })
      
      // Tools
      .get("/experimental/tool/ids", async (c) => {
        return c.json(await ToolRegistry.ids())
      })
      
      .get("/experimental/tool", async (c) => {
        const provider = c.req.query("provider")
        const model = c.req.query("model")
        if (!provider || !model) {
          return c.json({ error: "provider and model query params required" }, 400)
        }
        
        const tools = await ToolRegistry.tools(provider, model)
        return c.json(
          tools.map((t) => ({
            id: t.id,
            description: t.description,
            parameters: t.parameters,
          })),
        )
      })
      
      // Files
      .get("/file", async (c) => {
        const path = c.req.query("path")
        if (!path) {
          return c.json({ error: "path query param required" }, 400)
        }
        const content = await File.list(path)
        return c.json(content)
      })
      
      .get("/file/content", async (c) => {
        const path = c.req.query("path")
        if (!path) {
          return c.json({ error: "path query param required" }, 400)
        }
        const content = await File.read(path)
        return c.json(content)
      })
      
      .get("/file/status", async (c) => {
        const content = await File.status()
        return c.json(content)
      })
      
      // Commands and Agents
      .get("/command", async (c) => {
        const commands = await Command.list()
        return c.json(commands)
      })
      
      .get("/agent", async (c) => {
        const modes = await Agent.list()
        return c.json(modes)
      })
      
      // Auth
      .put("/auth/:id", async (c) => {
        const id = c.req.param("id")
        const info = await c.req.json()
        await Auth.set(id, info)
        return c.json(true)
      })
      
      // Project routes
      .route("/project", ProjectRoute)
      
      // TUI routes
      .route("/tui/control", TuiRoute)
      .post("/tui/append-prompt", async (c) => c.json(await callTui(c)))
      .post("/tui/open-help", async (c) => c.json(await callTui(c)))
      .post("/tui/open-sessions", async (c) => c.json(await callTui(c)))
      .post("/tui/open-themes", async (c) => c.json(await callTui(c)))
      .post("/tui/open-models", async (c) => c.json(await callTui(c)))
      .post("/tui/submit-prompt", async (c) => c.json(await callTui(c)))
      .post("/tui/clear-prompt", async (c) => c.json(await callTui(c)))
      .post("/tui/execute-command", async (c) => c.json(await callTui(c)))
      .post("/tui/show-toast", async (c) => c.json(await callTui(c)))
      
      // Events
      .get("/event", async (c) => {
        log.info("event connected")
        return streamSSE(c, async (stream) => {
          stream.writeSSE({
            data: JSON.stringify({
              type: "server.connected",
              properties: {},
            }),
          })
          const unsub = Bus.subscribeAll(async (event) => {
            await stream.writeSSE({
              data: JSON.stringify(event),
            })
          })
          await new Promise<void>((resolve) => {
            stream.onAbort(() => {
              unsub()
              resolve()
              log.info("event disconnected")
            })
          })
        })
      })
  }

  export function listen(opts: { port: number; hostname: string }) {
    const server = Bun.serve({
      port: opts.port,
      hostname: opts.hostname,
      idleTimeout: 0,
      fetch: App().fetch,
    })
    return server
  }
}