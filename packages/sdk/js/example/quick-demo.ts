#!/usr/bin/env bun
/**
 * Quick demo of PukuCode SDK - shows basic functionality without waiting for AI responses
 */

import { createPukucodeClient, createPukucodeServer } from "../src/index.js"

async function main() {
  console.log("🚀 PukuCode SDK Quick Demo\n")

  // Start server
  console.log("1. Starting PukuCode server...")
  const server = await createPukucodeServer({
    hostname: "127.0.0.1",
    port: 7777,
    timeout: 15000,
  })
  console.log(`   ✅ Server running at: ${server.url}\n`)

  // Create client
  const client = createPukucodeClient({ baseUrl: server.url })

  // Create session
  console.log("2. Creating a new session...")
  const session = await client.session.create()
  console.log(`   ✅ Session created: ${session.data.id}\n`)

  // Get configuration
  console.log("3. Getting configuration...")
  const config = await client.config.get()
  console.log(`   ✅ Configuration loaded\n`)

  // List providers
  console.log("4. Listing AI providers...")
  const providers = await client.config.providers()
  console.log(`   ✅ Providers available\n`)

  // List agents
  console.log("5. Listing agents...")
  const agents = await client.app.agents()
  console.log(`   ✅ Found ${agents.data.length} agents`)
  agents.data.slice(0, 3).forEach((agent) => {
    console.log(`      - ${agent.id}`)
  })
  console.log()

  // List sessions
  console.log("6. Listing all sessions...")
  const sessions = await client.session.list()
  console.log(`   ✅ Total sessions: ${sessions.data.length}\n`)

  // Update session title
  console.log("7. Updating session title...")
  await client.session.update({
    path: { id: session.data.id },
    body: { title: "SDK Demo Session" },
  })
  console.log(`   ✅ Session updated\n`)

  // Get file status
  console.log("8. Getting file status...")
  const status = await client.file.status()
  console.log(`   ✅ File status retrieved\n`)

  // Clean up
  console.log("9. Cleaning up...")
  await client.session.delete({ path: { id: session.data.id } })
  console.log(`   ✅ Session deleted`)

  server.close()
  console.log(`   ✅ Server stopped\n`)

  console.log("✨ Demo complete! The SDK is working perfectly.\n")
}

main().catch((error) => {
  console.error("❌ Demo failed:", error)
  process.exit(1)
})
