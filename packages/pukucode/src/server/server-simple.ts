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
          { 
            method: "GET", 
            path: "/", 
            description: "Health check & server info",
            examples: [
              "curl http://localhost:3000/",
              "curl -i http://localhost:3000/"
            ],
            response: `{"name":"pukucode","version":"1.0.0","status":"running"}`
          },
          { 
            method: "GET", 
            path: "/config", 
            description: "Get pukucode configuration settings",
            examples: [
              "curl http://localhost:3000/config"
            ],
            response: `{"agent":{},"mode":{},"command":{},"plugin":[],"username":"user"}`
          },
          { 
            method: "GET", 
            path: "/path", 
            description: "Get path information (state, config, worktree, directory)",
            examples: [
              "curl http://localhost:3000/path"
            ],
            response: `{"state":"/path/to/state","config":"/path/to/config","worktree":"/path/to/worktree","directory":"/current/dir"}`
          },
          { 
            method: "GET", 
            path: "/session", 
            description: "List all sessions, sorted by most recently updated",
            examples: [
              "curl http://localhost:3000/session",
              "curl -H 'Accept: application/json' http://localhost:3000/session"
            ],
            response: `[{"id":"ses_123","title":"My Session","time":{"created":1640995200000,"updated":1640995200000}}]`
          },
          { 
            method: "GET", 
            path: "/session/:id", 
            description: "Get specific session by ID",
            examples: [
              "curl http://localhost:3000/session/ses_123456",
              "curl http://localhost:3000/session/ses_abc123"
            ],
            response: `{"id":"ses_123","title":"My Session","projectID":"proj_456","directory":"/path","time":{"created":1640995200000,"updated":1640995200000}}`
          },
          { 
            method: "POST", 
            path: "/session", 
            description: "Create new session with optional title and parent",
            body: { title: "string (optional)", parentID: "string (optional)" },
            examples: [
              `curl -X POST http://localhost:3000/session -H "Content-Type: application/json" -d '{}'`,
              `curl -X POST http://localhost:3000/session -H "Content-Type: application/json" -d '{"title": "My New Session"}'`,
              `curl -X POST http://localhost:3000/session -H "Content-Type: application/json" -d '{"title": "Child Session", "parentID": "ses_123"}'`
            ],
            response: `{"id":"ses_new123","title":"My New Session","projectID":"proj_456","time":{"created":1640995200000,"updated":1640995200000}}`
          },
          { 
            method: "DELETE", 
            path: "/session/:id", 
            description: "Delete session and all its data permanently",
            examples: [
              "curl -X DELETE http://localhost:3000/session/ses_123456",
              "curl -X DELETE http://localhost:3000/session/ses_unwanted"
            ],
            response: `true`
          },
          { 
            method: "PATCH", 
            path: "/session/:id", 
            description: "Update session properties (currently supports title)",
            body: { title: "string" },
            examples: [
              `curl -X PATCH http://localhost:3000/session/ses_123 -H "Content-Type: application/json" -d '{"title": "Updated Title"}'`,
              `curl -X PATCH http://localhost:3000/session/ses_456 -H "Content-Type: application/json" -d '{"title": "Bug Fix Session"}'`
            ],
            response: `{"id":"ses_123","title":"Updated Title","projectID":"proj_456","time":{"created":1640995200000,"updated":1640995300000}}`
          },
          { 
            method: "GET", 
            path: "/session/:id/message", 
            description: "List all messages in a session with their parts",
            examples: [
              "curl http://localhost:3000/session/ses_123/message",
              "curl -H 'Accept: application/json' http://localhost:3000/session/ses_456/message"
            ],
            response: `[{"info":{"id":"msg_123","role":"user","sessionID":"ses_123","time":{"created":1640995200000}},"parts":[{"id":"part_123","type":"text","text":"Hello!"}]}]`
          },
          { 
            method: "GET", 
            path: "/session/:id/message/:messageID", 
            description: "Get specific message and its parts",
            examples: [
              "curl http://localhost:3000/session/ses_123/message/msg_456",
              "curl http://localhost:3000/session/ses_abc/message/msg_def"
            ],
            response: `{"info":{"id":"msg_456","role":"assistant","sessionID":"ses_123","time":{"created":1640995200000}},"parts":[{"id":"part_789","type":"text","text":"Response message"}]}`
          },
          { 
            method: "POST", 
            path: "/session/:id/message", 
            description: "Send a message to an AI model in the session",
            body: { 
              messageID: "string", 
              model: { providerID: "string", modelID: "string" }, 
              agent: "string", 
              parts: [{ id: "string", type: "text", text: "string" }] 
            },
            examples: [
              `curl -X POST http://localhost:3000/session/ses_123/message -H "Content-Type: application/json" -d '{
  "messageID": "msg_001", 
  "model": {"providerID": "anthropic", "modelID": "claude-3-5-haiku"}, 
  "agent": "build", 
  "parts": [{"id": "part_001", "type": "text", "text": "Hello, how are you?"}]
}'`,
              `curl -X POST http://localhost:3000/session/ses_456/message -H "Content-Type: application/json" -d '{
  "messageID": "msg_002", 
  "model": {"providerID": "openai", "modelID": "gpt-4"}, 
  "agent": "build", 
  "parts": [{"id": "part_002", "type": "text", "text": "Explain quantum computing"}]
}'`
            ],
            response: `{"info":{"id":"msg_response","role":"assistant","sessionID":"ses_123","modelID":"claude-3-5-haiku","time":{"created":1640995200000,"completed":1640995210000}},"parts":[{"id":"part_response","type":"text","text":"I'm doing well, thank you!"}]}`
          },
          { 
            method: "POST", 
            path: "/session/:id/command", 
            description: "Send a predefined command to the session",
            body: { messageID: "string", agent: "string", model: "string", command: "string", arguments: "string" },
            examples: [
              `curl -X POST http://localhost:3000/session/ses_123/command -H "Content-Type: application/json" -d '{
  "messageID": "cmd_001", 
  "agent": "build", 
  "model": "anthropic/claude-3-5-haiku", 
  "command": "code_review", 
  "arguments": "src/main.js"
}'`,
              `curl -X POST http://localhost:3000/session/ses_456/command -H "Content-Type: application/json" -d '{
  "messageID": "cmd_002", 
  "agent": "build", 
  "model": "openai/gpt-4", 
  "command": "generate_docs", 
  "arguments": "README.md"
}'`
            ],
            response: `{"info":{"id":"cmd_response","role":"assistant","sessionID":"ses_123","time":{"created":1640995200000}},"parts":[{"id":"part_cmd","type":"text","text":"Code review completed"}]}`
          },
          { 
            method: "POST", 
            path: "/session/:id/shell", 
            description: "Execute a shell command within the session context",
            body: { messageID: "string", command: "string" },
            examples: [
              `curl -X POST http://localhost:3000/session/ses_123/shell -H "Content-Type: application/json" -d '{
  "messageID": "shell_001", 
  "command": "ls -la"
}'`,
              `curl -X POST http://localhost:3000/session/ses_456/shell -H "Content-Type: application/json" -d '{
  "messageID": "shell_002", 
  "command": "git status"
}'`,
              `curl -X POST http://localhost:3000/session/ses_789/shell -H "Content-Type: application/json" -d '{
  "messageID": "shell_003", 
  "command": "npm test"
}'`
            ],
            response: `{"info":{"id":"shell_response","role":"assistant","sessionID":"ses_123","time":{"created":1640995200000}},"parts":[{"id":"part_shell","type":"text","text":"Command output here"}]}`
          },
          { 
            method: "POST", 
            path: "/session/:id/abort", 
            description: "Abort any running AI processing in the session",
            examples: [
              "curl -X POST http://localhost:3000/session/ses_123/abort",
              "curl -X POST http://localhost:3000/session/ses_runaway/abort"
            ],
            response: `true`
          },
          { 
            method: "GET", 
            path: "/config/providers", 
            description: "List all available AI providers and their default models",
            examples: [
              "curl http://localhost:3000/config/providers",
              "curl -H 'Accept: application/json' http://localhost:3000/config/providers"
            ],
            response: `{"providers":[{"id":"anthropic","name":"Anthropic","models":{"claude-3-5-haiku":{"id":"claude-3-5-haiku","name":"Claude 3.5 Haiku"}}}],"default":{"anthropic":"claude-3-5-haiku"}}`
          },
          { 
            method: "GET", 
            path: "/experimental/tool/ids", 
            description: "List all available tool IDs that can be used by AI models",
            examples: [
              "curl http://localhost:3000/experimental/tool/ids"
            ],
            response: `["bash","edit","grep","read","write"]`
          },
          { 
            method: "GET", 
            path: "/experimental/tool?provider=X&model=Y", 
            description: "List tools available for a specific provider/model combination",
            examples: [
              `curl "http://localhost:3000/experimental/tool?provider=anthropic&model=claude-3-5-haiku"`,
              `curl "http://localhost:3000/experimental/tool?provider=openai&model=gpt-4"`,
              `curl "http://localhost:3000/experimental/tool?provider=google&model=gemini-1.5-pro"`
            ],
            response: `[{"id":"bash","description":"Execute shell commands","parameters":{"type":"object","properties":{"command":{"type":"string"}}}},{"id":"edit","description":"Edit files","parameters":{"type":"object","properties":{"filePath":{"type":"string"},"oldString":{"type":"string"},"newString":{"type":"string"}}}}]`
          },
          { 
            method: "GET", 
            path: "/file?path=<path>", 
            description: "List files and directories at the specified path",
            examples: [
              `curl "http://localhost:3000/file?path=."`,
              `curl "http://localhost:3000/file?path=src"`,
              `curl "http://localhost:3000/file?path=/absolute/path"`,
              `curl "http://localhost:3000/file?path=relative/path"`
            ],
            response: `[{"name":"src","path":"src","type":"directory","ignored":false},{"name":"package.json","path":"package.json","type":"file","ignored":false}]`
          },
          { 
            method: "GET", 
            path: "/file/content?path=<path>", 
            description: "Read the content of a specific file",
            examples: [
              `curl "http://localhost:3000/file/content?path=package.json"`,
              `curl "http://localhost:3000/file/content?path=src/index.js"`,
              `curl "http://localhost:3000/file/content?path=README.md"`
            ],
            response: `{"type":"content","content":"File content here..."} or {"type":"patch","content":"Git diff if file is modified"}`
          },
          { 
            method: "GET", 
            path: "/file/status", 
            description: "Get git status of all tracked files (added, modified, deleted)",
            examples: [
              "curl http://localhost:3000/file/status"
            ],
            response: `[{"path":"src/index.js","status":"modified","added":10,"removed":5},{"path":"new-file.js","status":"added","added":20,"removed":0}]`
          },
          { 
            method: "GET", 
            path: "/command", 
            description: "List all available predefined commands",
            examples: [
              "curl http://localhost:3000/command"
            ],
            response: `[{"name":"code_review","description":"Review code for issues","template":"Review this code: {input}"},{"name":"generate_docs","description":"Generate documentation","template":"Create docs for: {input}"}]`
          },
          { 
            method: "GET", 
            path: "/agent", 
            description: "List all available AI agents with their configurations",
            examples: [
              "curl http://localhost:3000/agent"
            ],
            response: `[{"name":"build","description":"General purpose coding agent","model":{"providerID":"anthropic","modelID":"claude-3-5-haiku"},"temperature":0.7},{"name":"plan","description":"Planning and architecture agent","model":{"providerID":"anthropic","modelID":"claude-3-5-sonnet"}}]`
          },
          { 
            method: "PUT", 
            path: "/auth/:id", 
            description: "Set authentication credentials for an AI provider",
            body: { type: "api", key: "string" },
            examples: [
              `curl -X PUT http://localhost:3000/auth/anthropic -H "Content-Type: application/json" -d '{"type": "api", "key": "sk-ant-api03-your-key-here"}'`,
              `curl -X PUT http://localhost:3000/auth/openai -H "Content-Type: application/json" -d '{"type": "api", "key": "sk-your-openai-key-here"}'`,
              `curl -X PUT http://localhost:3000/auth/groq -H "Content-Type: application/json" -d '{"type": "api", "key": "gsk_your-groq-key-here"}'`
            ],
            response: `true`
          },
          { 
            method: "GET", 
            path: "/project", 
            description: "List all detected projects in the system",
            examples: [
              "curl http://localhost:3000/project"
            ],
            response: `[{"id":"proj_123","worktree":"/path/to/project","vcs":"git","time":{"created":1640995200000}},{"id":"proj_456","worktree":"/another/project","vcs":"git","time":{"created":1640995100000}}]`
          },
          { 
            method: "GET", 
            path: "/project/current", 
            description: "Get information about the current project",
            examples: [
              "curl http://localhost:3000/project/current"
            ],
            response: `{"id":"proj_123","worktree":"/current/project/path","vcs":"git","time":{"created":1640995200000}}`
          },
          { 
            method: "GET", 
            path: "/event", 
            description: "Server-Sent Events stream for real-time updates (tool execution, message updates, etc.)",
            examples: [
              "curl -N http://localhost:3000/event",
              "curl -N -H 'Accept: text/event-stream' http://localhost:3000/event"
            ],
            response: `data: {"type":"server.connected","properties":{}}\n\ndata: {"type":"message.updated","properties":{"info":{"id":"msg_123"}}}\n\ndata: {"type":"tool.executed","properties":{"tool":"bash","result":"success"}}\n\n`
          },
          { 
            method: "POST", 
            path: "/tui/append-prompt", 
            description: "TUI: Append text to the current prompt",
            body: { text: "string" },
            examples: [
              `curl -X POST http://localhost:3000/tui/append-prompt -H "Content-Type: application/json" -d '{"text": "Additional prompt text"}'`
            ],
            response: `true`
          },
          { 
            method: "POST", 
            path: "/tui/open-help", 
            description: "TUI: Open the help dialog in the terminal interface",
            examples: [
              "curl -X POST http://localhost:3000/tui/open-help"
            ],
            response: `true`
          },
          { 
            method: "POST", 
            path: "/tui/open-sessions", 
            description: "TUI: Open the sessions dialog in the terminal interface",
            examples: [
              "curl -X POST http://localhost:3000/tui/open-sessions"
            ],
            response: `true`
          },
          { 
            method: "POST", 
            path: "/tui/submit-prompt", 
            description: "TUI: Submit the current prompt for processing",
            examples: [
              "curl -X POST http://localhost:3000/tui/submit-prompt"
            ],
            response: `true`
          },
          { 
            method: "POST", 
            path: "/tui/clear-prompt", 
            description: "TUI: Clear the current prompt text",
            examples: [
              "curl -X POST http://localhost:3000/tui/clear-prompt"
            ],
            response: `true`
          },
          { 
            method: "POST", 
            path: "/tui/execute-command", 
            description: "TUI: Execute a specific TUI command",
            body: { command: "string" },
            examples: [
              `curl -X POST http://localhost:3000/tui/execute-command -H "Content-Type: application/json" -d '{"command": "agent_cycle"}'`,
              `curl -X POST http://localhost:3000/tui/execute-command -H "Content-Type: application/json" -d '{"command": "model_switch"}'`
            ],
            response: `true`
          },
          { 
            method: "POST", 
            path: "/tui/show-toast", 
            description: "TUI: Display a toast notification in the terminal interface",
            body: { title: "string (optional)", message: "string", variant: "info|success|warning|error" },
            examples: [
              `curl -X POST http://localhost:3000/tui/show-toast -H "Content-Type: application/json" -d '{"message": "Operation completed", "variant": "success"}'`,
              `curl -X POST http://localhost:3000/tui/show-toast -H "Content-Type: application/json" -d '{"title": "Error", "message": "Something went wrong", "variant": "error"}'`
            ],
            response: `true`
          }
        ]
        
        const html = `
<!DOCTYPE html>
<html>
<head>
    <title>PukuCode API Documentation</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 1400px; margin: 0 auto; padding: 20px; line-height: 1.6; }
        h1 { color: #333; border-bottom: 3px solid #007bff; padding-bottom: 10px; }
        h2 { color: #444; margin-top: 30px; }
        h3 { color: #555; margin-top: 20px; }
        .toc { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .toc a { text-decoration: none; color: #007bff; margin-right: 15px; }
        .toc a:hover { text-decoration: underline; }
        .endpoint { border: 1px solid #ddd; margin: 20px 0; padding: 20px; border-radius: 8px; background-color: #fafafa; }
        .endpoint:target { border-color: #007bff; background-color: #f0f8ff; }
        .method { display: inline-block; padding: 4px 12px; border-radius: 4px; color: white; font-weight: bold; min-width: 70px; text-align: center; margin-right: 10px; }
        .GET { background-color: #61affe; }
        .POST { background-color: #49cc90; }
        .PUT { background-color: #fca130; }
        .DELETE { background-color: #f93e3e; }
        .PATCH { background-color: #50e3c2; }
        .path { font-family: 'Courier New', monospace; font-weight: bold; font-size: 16px; }
        .description { margin: 12px 0; color: #555; font-size: 14px; }
        .body { margin: 12px 0; padding: 12px; background-color: #fff3cd; border-radius: 4px; border-left: 4px solid #ffc107; }
        .body-title { font-weight: bold; color: #856404; margin-bottom: 8px; }
        .body-content { font-family: 'Courier New', monospace; font-size: 12px; background-color: white; padding: 8px; border-radius: 3px; }
        .examples-section { margin: 15px 0; }
        .examples-title { font-weight: bold; color: #28a745; margin-bottom: 10px; display: block; }
        .example { margin: 8px 0; padding: 12px; background-color: #f8f9fa; border-left: 4px solid #28a745; border-radius: 3px; }
        .example-command { font-family: 'Courier New', monospace; font-size: 12px; background-color: #2d3748; color: #e2e8f0; padding: 10px; border-radius: 4px; margin: 5px 0; overflow-x: auto; white-space: pre-wrap; }
        .copy-btn { background: #007bff; color: white; border: none; padding: 4px 8px; border-radius: 3px; font-size: 11px; cursor: pointer; margin-left: 8px; }
        .copy-btn:hover { background: #0056b3; }
        .response-section { margin: 12px 0; }
        .response-title { font-weight: bold; color: #6f42c1; margin-bottom: 8px; display: block; }
        .response { font-family: 'Courier New', monospace; font-size: 11px; background-color: #f1f3f4; padding: 10px; border-radius: 4px; border-left: 4px solid #6f42c1; overflow-x: auto; white-space: pre-wrap; }
        .nav-top { position: fixed; bottom: 20px; right: 20px; background: #007bff; color: white; padding: 10px 15px; border-radius: 25px; text-decoration: none; box-shadow: 0 2px 10px rgba(0,0,0,0.2); }
        .nav-top:hover { background: #0056b3; color: white; text-decoration: none; }
        .category { margin: 30px 0; }
        .category-title { color: #007bff; font-size: 20px; font-weight: bold; border-bottom: 2px solid #007bff; padding-bottom: 5px; margin-bottom: 20px; }
    </style>
    <script>
        function copyToClipboard(text) {
            navigator.clipboard.writeText(text).then(() => {
                alert('Copied to clipboard!');
            });
        }
    </script>
</head>
<body>
    <h1 id="top">🚀 PukuCode API Documentation</h1>
    <p><strong>Server Status:</strong> Running | <strong>Version:</strong> 1.0.0 | <strong>Base URL:</strong> http://localhost:3000</p>
    
    <div class="toc">
        <strong>📑 Quick Navigation:</strong><br>
        <a href="#health">Health & Config</a>
        <a href="#sessions">Sessions</a>
        <a href="#messages">Messages</a>
        <a href="#files">Files</a>
        <a href="#tools">Tools & Agents</a>
        <a href="#auth">Authentication</a>
        <a href="#tui">TUI</a>
        <a href="#events">Events</a>
    </div>
    
    <div class="category" id="health">
        <div class="category-title">🏥 Health & Configuration</div>
        ${endpoints.filter(e => ['/', '/config', '/path'].includes(e.path)).map(endpoint => `
            <div class="endpoint" id="${endpoint.path.replace(/[/:]/g, '-')}">
                <div>
                    <span class="method ${endpoint.method}">${endpoint.method}</span>
                    <span class="path">${endpoint.path}</span>
                </div>
                <div class="description">${endpoint.description}</div>
                ${endpoint.body ? `
                    <div class="body">
                        <div class="body-title">📝 Request Body:</div>
                        <div class="body-content">${JSON.stringify(endpoint.body, null, 2)}</div>
                    </div>
                ` : ''}
                <div class="examples-section">
                    <span class="examples-title">💡 Examples:</span>
                    ${endpoint.examples.map(example => `
                        <div class="example">
                            <div class="example-command">${example}<button class="copy-btn" onclick="copyToClipboard('${example.replace(/'/g, "\\'")}')">Copy</button></div>
                        </div>
                    `).join('')}
                </div>
                <div class="response-section">
                    <span class="response-title">📤 Response:</span>
                    <div class="response">${endpoint.response}</div>
                </div>
            </div>
        `).join('')}
    </div>
    
    <div class="category" id="sessions">
        <div class="category-title">💬 Session Management</div>
        ${endpoints.filter(e => e.path.startsWith('/session') && !e.path.includes('/message') && !e.path.includes('/command') && !e.path.includes('/shell') && !e.path.includes('/abort')).map(endpoint => `
            <div class="endpoint" id="${endpoint.path.replace(/[/:]/g, '-')}">
                <div>
                    <span class="method ${endpoint.method}">${endpoint.method}</span>
                    <span class="path">${endpoint.path}</span>
                </div>
                <div class="description">${endpoint.description}</div>
                ${endpoint.body ? `
                    <div class="body">
                        <div class="body-title">📝 Request Body:</div>
                        <div class="body-content">${JSON.stringify(endpoint.body, null, 2)}</div>
                    </div>
                ` : ''}
                <div class="examples-section">
                    <span class="examples-title">💡 Examples:</span>
                    ${endpoint.examples.map(example => `
                        <div class="example">
                            <div class="example-command">${example}<button class="copy-btn" onclick="copyToClipboard('${example.replace(/'/g, "\\'")}')">Copy</button></div>
                        </div>
                    `).join('')}
                </div>
                <div class="response-section">
                    <span class="response-title">📤 Response:</span>
                    <div class="response">${endpoint.response}</div>
                </div>
            </div>
        `).join('')}
    </div>
    
    <div class="category" id="messages">
        <div class="category-title">💌 Messages & Commands</div>
        ${endpoints.filter(e => e.path.includes('/message') || e.path.includes('/command') || e.path.includes('/shell') || e.path.includes('/abort')).map(endpoint => `
            <div class="endpoint" id="${endpoint.path.replace(/[/:]/g, '-')}">
                <div>
                    <span class="method ${endpoint.method}">${endpoint.method}</span>
                    <span class="path">${endpoint.path}</span>
                </div>
                <div class="description">${endpoint.description}</div>
                ${endpoint.body ? `
                    <div class="body">
                        <div class="body-title">📝 Request Body:</div>
                        <div class="body-content">${JSON.stringify(endpoint.body, null, 2)}</div>
                    </div>
                ` : ''}
                <div class="examples-section">
                    <span class="examples-title">💡 Examples:</span>
                    ${endpoint.examples.map(example => `
                        <div class="example">
                            <div class="example-command">${example}<button class="copy-btn" onclick="copyToClipboard('${example.replace(/'/g, "\\'")}')">Copy</button></div>
                        </div>
                    `).join('')}
                </div>
                <div class="response-section">
                    <span class="response-title">📤 Response:</span>
                    <div class="response">${endpoint.response}</div>
                </div>
            </div>
        `).join('')}
    </div>
    
    <div class="category" id="files">
        <div class="category-title">📁 File Operations</div>
        ${endpoints.filter(e => e.path.startsWith('/file')).map(endpoint => `
            <div class="endpoint" id="${endpoint.path.replace(/[/:]/g, '-')}">
                <div>
                    <span class="method ${endpoint.method}">${endpoint.method}</span>
                    <span class="path">${endpoint.path}</span>
                </div>
                <div class="description">${endpoint.description}</div>
                ${endpoint.body ? `
                    <div class="body">
                        <div class="body-title">📝 Request Body:</div>
                        <div class="body-content">${JSON.stringify(endpoint.body, null, 2)}</div>
                    </div>
                ` : ''}
                <div class="examples-section">
                    <span class="examples-title">💡 Examples:</span>
                    ${endpoint.examples.map(example => `
                        <div class="example">
                            <div class="example-command">${example}<button class="copy-btn" onclick="copyToClipboard('${example.replace(/'/g, "\\'")}')">Copy</button></div>
                        </div>
                    `).join('')}
                </div>
                <div class="response-section">
                    <span class="response-title">📤 Response:</span>
                    <div class="response">${endpoint.response}</div>
                </div>
            </div>
        `).join('')}
    </div>
    
    <div class="category" id="tools">
        <div class="category-title">🔧 Tools, Agents & Commands</div>
        ${endpoints.filter(e => e.path.includes('/tool') || e.path === '/agent' || e.path === '/command' || e.path.startsWith('/config/providers') || e.path.startsWith('/project')).map(endpoint => `
            <div class="endpoint" id="${endpoint.path.replace(/[/:]/g, '-')}">
                <div>
                    <span class="method ${endpoint.method}">${endpoint.method}</span>
                    <span class="path">${endpoint.path}</span>
                </div>
                <div class="description">${endpoint.description}</div>
                ${endpoint.body ? `
                    <div class="body">
                        <div class="body-title">📝 Request Body:</div>
                        <div class="body-content">${JSON.stringify(endpoint.body, null, 2)}</div>
                    </div>
                ` : ''}
                <div class="examples-section">
                    <span class="examples-title">💡 Examples:</span>
                    ${endpoint.examples.map(example => `
                        <div class="example">
                            <div class="example-command">${example}<button class="copy-btn" onclick="copyToClipboard('${example.replace(/'/g, "\\'")}')">Copy</button></div>
                        </div>
                    `).join('')}
                </div>
                <div class="response-section">
                    <span class="response-title">📤 Response:</span>
                    <div class="response">${endpoint.response}</div>
                </div>
            </div>
        `).join('')}
    </div>
    
    <div class="category" id="auth">
        <div class="category-title">🔐 Authentication</div>
        ${endpoints.filter(e => e.path.startsWith('/auth')).map(endpoint => `
            <div class="endpoint" id="${endpoint.path.replace(/[/:]/g, '-')}">
                <div>
                    <span class="method ${endpoint.method}">${endpoint.method}</span>
                    <span class="path">${endpoint.path}</span>
                </div>
                <div class="description">${endpoint.description}</div>
                ${endpoint.body ? `
                    <div class="body">
                        <div class="body-title">📝 Request Body:</div>
                        <div class="body-content">${JSON.stringify(endpoint.body, null, 2)}</div>
                    </div>
                ` : ''}
                <div class="examples-section">
                    <span class="examples-title">💡 Examples:</span>
                    ${endpoint.examples.map(example => `
                        <div class="example">
                            <div class="example-command">${example}<button class="copy-btn" onclick="copyToClipboard('${example.replace(/'/g, "\\'")}')">Copy</button></div>
                        </div>
                    `).join('')}
                </div>
                <div class="response-section">
                    <span class="response-title">📤 Response:</span>
                    <div class="response">${endpoint.response}</div>
                </div>
            </div>
        `).join('')}
    </div>
    
    <div class="category" id="tui">
        <div class="category-title">🖥️ Terminal UI (TUI)</div>
        ${endpoints.filter(e => e.path.startsWith('/tui')).map(endpoint => `
            <div class="endpoint" id="${endpoint.path.replace(/[/:]/g, '-')}">
                <div>
                    <span class="method ${endpoint.method}">${endpoint.method}</span>
                    <span class="path">${endpoint.path}</span>
                </div>
                <div class="description">${endpoint.description}</div>
                ${endpoint.body ? `
                    <div class="body">
                        <div class="body-title">📝 Request Body:</div>
                        <div class="body-content">${JSON.stringify(endpoint.body, null, 2)}</div>
                    </div>
                ` : ''}
                <div class="examples-section">
                    <span class="examples-title">💡 Examples:</span>
                    ${endpoint.examples.map(example => `
                        <div class="example">
                            <div class="example-command">${example}<button class="copy-btn" onclick="copyToClipboard('${example.replace(/'/g, "\\'")}')">Copy</button></div>
                        </div>
                    `).join('')}
                </div>
                <div class="response-section">
                    <span class="response-title">📤 Response:</span>
                    <div class="response">${endpoint.response}</div>
                </div>
            </div>
        `).join('')}
    </div>
    
    <div class="category" id="events">
        <div class="category-title">📡 Real-time Events</div>
        ${endpoints.filter(e => e.path === '/event').map(endpoint => `
            <div class="endpoint" id="${endpoint.path.replace(/[/:]/g, '-')}">
                <div>
                    <span class="method ${endpoint.method}">${endpoint.method}</span>
                    <span class="path">${endpoint.path}</span>
                </div>
                <div class="description">${endpoint.description}</div>
                ${endpoint.body ? `
                    <div class="body">
                        <div class="body-title">📝 Request Body:</div>
                        <div class="body-content">${JSON.stringify(endpoint.body, null, 2)}</div>
                    </div>
                ` : ''}
                <div class="examples-section">
                    <span class="examples-title">💡 Examples:</span>
                    ${endpoint.examples.map(example => `
                        <div class="example">
                            <div class="example-command">${example}<button class="copy-btn" onclick="copyToClipboard('${example.replace(/'/g, "\\'")}')">Copy</button></div>
                        </div>
                    `).join('')}
                </div>
                <div class="response-section">
                    <span class="response-title">📤 Response:</span>
                    <div class="response">${endpoint.response}</div>
                </div>
            </div>
        `).join('')}
    </div>
    
    <a href="#top" class="nav-top">↑ Top</a>
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