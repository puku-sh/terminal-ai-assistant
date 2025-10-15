import { spawn } from "node:child_process"
import { type Config } from "./gen/types.gen.js"

export type ServerOptions = {
  hostname?: string
  port?: number
  signal?: AbortSignal
  timeout?: number
  config?: Config
  cwd?: string
}

/**
 * Creates and starts a PukuCode server instance
 * @param options - Server configuration options
 * @returns Promise resolving to server URL and close function
 *
 * @example
 * ```typescript
 * const server = await createPukucodeServer({
 *   hostname: '127.0.0.1',
 *   port: 3000
 * })
 * console.log('Server running at:', server.url)
 * // ... use server
 * server.close() // Stop the server
 * ```
 */
export async function createPukucodeServer(options?: ServerOptions) {
  options = Object.assign(
    {
      hostname: "127.0.0.1",
      port: 3000,
      timeout: 10000,
    },
    options ?? {},
  )

  const args = ["server", `--hostname=${options.hostname}`, `--port=${options.port}`]

  const proc = spawn(`pukucode`, args, {
    signal: options.signal,
    cwd: options.cwd,
    env: {
      ...process.env,
      PUKUCODE_CONFIG_CONTENT: JSON.stringify(options.config ?? {}),
    },
  })

  const url = await new Promise<string>((resolve, reject) => {
    const id = setTimeout(() => {
      reject(new Error(`Timeout waiting for server to start after ${options.timeout}ms`))
    }, options.timeout)
    let output = ""
    proc.stdout?.on("data", (chunk) => {
      output += chunk.toString()
      const lines = output.split("\n")
      for (const line of lines) {
        // Look for PukuCode server startup message
        if (line.includes("listening") || line.includes("Server started")) {
          const match = line.match(/(?:on\s+|at\s+)?(https?:\/\/[^\s]+)/)
          if (match) {
            clearTimeout(id)
            resolve(match[1])
            return
          }
          // If we see "listening" but no URL, construct it
          if (line.includes("listening")) {
            clearTimeout(id)
            resolve(`http://${options.hostname}:${options.port}`)
            return
          }
        }
      }
    })
    proc.stderr?.on("data", (chunk) => {
      output += chunk.toString()
    })
    proc.on("exit", (code) => {
      clearTimeout(id)
      let msg = `Server exited with code ${code}`
      if (output.trim()) {
        msg += `\nServer output: ${output}`
      }
      reject(new Error(msg))
    })
    proc.on("error", (error) => {
      clearTimeout(id)
      reject(error)
    })
    if (options.signal) {
      options.signal.addEventListener("abort", () => {
        clearTimeout(id)
        proc.kill()
        reject(new Error("Aborted"))
      })
    }
  })

  return {
    url,
    close() {
      proc.kill()
    },
  }
}
