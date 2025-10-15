#!/usr/bin/env bun

import { fileURLToPath } from "url"

const dir = fileURLToPath(new URL("..", import.meta.url))
process.chdir(dir)

import { $ } from "bun"
import path from "path"

import { createClient } from "@hey-api/openapi-ts"

// Start PukuCode server temporarily to generate OpenAPI spec
console.log("Starting PukuCode server to generate OpenAPI spec...")
const pukucodePath = path.resolve(dir, "../../pukucode")
const serverProcess = Bun.spawn(["bun", "run", "src/index.ts", "server", "--port=3000", "--hostname=127.0.0.1"], {
  cwd: pukucodePath,
  stdout: "pipe",
  stderr: "pipe",
})

// Wait for server to start
await new Promise((resolve, reject) => {
  const timeout = setTimeout(() => {
    serverProcess.kill()
    reject(new Error("Timeout waiting for server to start"))
  }, 10000)

  const reader = serverProcess.stdout.getReader()
  const decoder = new TextDecoder()

  async function readOutput() {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const output = decoder.decode(value)
      console.log(output)

      if (output.includes("listening") || output.includes("Server started")) {
        clearTimeout(timeout)
        resolve(true)
        return
      }
    }
  }

  readOutput().catch(reject)
})

// Fetch OpenAPI spec
console.log("Fetching OpenAPI spec from http://localhost:3000/doc...")
try {
  const response = await fetch("http://localhost:3000/doc")
  if (!response.ok) {
    throw new Error(`Failed to fetch OpenAPI spec: ${response.statusText}`)
  }
  const spec = await response.text()
  await Bun.write(path.join(dir, "openapi.json"), spec)
  console.log("OpenAPI spec saved to openapi.json")
} catch (error) {
  console.error("Error fetching OpenAPI spec:", error)
  serverProcess.kill()
  throw error
}

// Kill server
serverProcess.kill()
console.log("Server stopped")

// Generate client
console.log("Generating TypeScript client...")
await createClient({
  input: "./openapi.json",
  output: {
    path: "./src/gen",
    tsConfigPath: path.join(dir, "tsconfig.json"),
  },
  plugins: [
    {
      name: "@hey-api/typescript",
      exportFromIndex: false,
    },
    {
      name: "@hey-api/sdk",
      instance: "PukucodeClient",
      exportFromIndex: false,
      auth: false,
    },
    {
      name: "@hey-api/client-fetch",
      exportFromIndex: false,
      baseUrl: "http://localhost:3000",
    },
  ],
})

console.log("Formatting generated code...")
await $`bun prettier --write src/gen`.catch(() => {
  console.log("Prettier not available, skipping formatting")
})

console.log("✓ SDK generation complete!")
