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
      
      // API Documentation
      .get("/doc", async (c) => {
        const endpoints = [
          { method: "GET", path: "/", description: "Health check & server info" },
          { method: "GET", path: "/config", description: "Get configuration" },
          { method: "GET", path: "/path", description: "Get path information" },
          { method: "GET", path: "/session", description: "List all sessions" },
          { method: "GET", path: "/session/:id", description: "Get specific session" },
          { method: "POST", path: "/session", description: "Create new session", body: { title: "string (optional)", parentID: "string (optional)" } },
          { method: "DELETE", path: "/session/:id", description: "Delete session" },
          { method: "PATCH", path: "/session/:id", description: "Update session", body: { title: "string" } },
          { method: "GET", path: "/session/:id/message", description: "List messages in session" },
          { method: "GET", path: "/session/:id/message/:messageID", description: "Get specific message" },
          { method: "POST", path: "/session/:id/message", description: "Send message to session", body: { messageID: "string", model: { providerID: "string", modelID: "string" }, agent: "string", parts: [{ id: "string", type: "text", text: "string" }] } },
          { method: "POST", path: "/session/:id/command", description: "Send command to session", body: { messageID: "string", agent: "string", model: "string", command: "string", arguments: "string" } },
          { method: "POST", path: "/session/:id/shell", description: "Run shell command in session", body: { messageID: "string", command: "string" } },
          { method: "POST", path: "/session/:id/abort", description: "Abort session processing" },
          { method: "GET", path: "/config/providers", description: "List AI providers and models" },
          { method: "GET", path: "/experimental/tool/ids", description: "List all tool IDs" },
          { method: "GET", path: "/experimental/tool?provider=X&model=Y", description: "List tools for specific provider/model" },
          { method: "GET", path: "/file?path=<path>", description: "List files and directories" },
          { method: "GET", path: "/file/content?path=<path>", description: "Read file content" },
          { method: "GET", path: "/file/status", description: "Get git status of files" },
          { method: "GET", path: "/command", description: "List available commands" },
          { method: "GET", path: "/agent", description: "List available agents" },
          { method: "PUT", path: "/auth/:id", description: "Set authentication for provider", body: { type: "api", key: "string" } },
          { method: "GET", path: "/project", description: "List all projects" },
          { method: "GET", path: "/project/current", description: "Get current project" },
          { method: "GET", path: "/event", description: "SSE endpoint for real-time events" },
          { method: "POST", path: "/tui/*", description: "TUI communication endpoints" },
        ]
        
        const html = `
<!DOCTYPE html>
<html>
<head>
    <title>PukuCode API Documentation</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
        h1 { color: #333; }
        .endpoint { border: 1px solid #ddd; margin: 10px 0; padding: 15px; border-radius: 5px; }
        .method { display: inline-block; padding: 3px 8px; border-radius: 3px; color: white; font-weight: bold; min-width: 60px; text-align: center; }
        .GET { background-color: #61affe; }
        .POST { background-color: #49cc90; }
        .PUT { background-color: #fca130; }
        .DELETE { background-color: #f93e3e; }
        .PATCH { background-color: #50e3c2; }
        .path { font-family: monospace; font-weight: bold; margin-left: 10px; }
        .description { margin-top: 8px; color: #666; }
        .body { margin-top: 8px; padding: 8px; background-color: #f5f5f5; border-radius: 3px; font-family: monospace; font-size: 12px; }
        .examples { margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 5px; }
        .example { margin: 10px 0; padding: 8px; background-color: #fff; border-left: 3px solid #007bff; font-family: monospace; font-size: 12px; }
    </style>
</head>
<body>
    <h1>🚀 PukuCode API Documentation</h1>
    <p>Server Status: <strong>Running</strong> | Version: <strong>1.0.0</strong></p>
    
    <h2>📋 Available Endpoints</h2>
    ${endpoints.map(endpoint => `
        <div class="endpoint">
            <div>
                <span class="method ${endpoint.method}">${endpoint.method}</span>
                <span class="path">${endpoint.path}</span>
            </div>
            <div class="description">${endpoint.description}</div>
            ${endpoint.body ? `<div class="body">Request Body: <pre>${JSON.stringify(endpoint.body, null, 2)}</pre></div>` : ''}
        </div>
    `).join('')}
    
    <div class="examples">
        <h3>📝 Quick Examples</h3>
        <div class="example">
            <strong>Health Check:</strong><br>
            curl http://localhost:3000/
        </div>
        <div class="example">
            <strong>List Sessions:</strong><br>
            curl http://localhost:3000/session
        </div>
        <div class="example">
            <strong>Create Session:</strong><br>
            curl -X POST http://localhost:3000/session -H "Content-Type: application/json" -d '{"title": "My Session"}'
        </div>
        <div class="example">
            <strong>List Files:</strong><br>
            curl "http://localhost:3000/file?path=."
        </div>
        <div class="example">
            <strong>Get Providers:</strong><br>
            curl http://localhost:3000/config/providers
        </div>
        <div class="example">
            <strong>Real-time Events:</strong><br>
            curl -N http://localhost:3000/event
        </div>
    </div>
</body>
</html>`
        
        return c.html(html)
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