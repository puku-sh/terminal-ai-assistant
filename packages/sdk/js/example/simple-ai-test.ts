#!/usr/bin/env bun
/**
 * Simple AI Response Test
 *
 * A minimal test to verify AI responses are received correctly
 * Uses the GLM-4.6 model via OpenRouter
 */

import { createPukucodeClient, createPukucodeServer } from "../src/index.js"

async function main() {
  console.log("🧪 Simple AI Response Test\n")

  // Start server
  console.log("Starting PukuCode server...")
  const server = await createPukucodeServer({
    hostname: "127.0.0.1",
    port: 6667,
    timeout: 15000,
  })
  console.log(`✅ Server running at: ${server.url}\n`)

  // Create client
  const client = createPukucodeClient({ baseUrl: server.url })

  try {
    // Create session with GLM-4.6 model
    console.log("Creating session with openrouter/z-ai/glm-4.6...")
    const session = await client.session.create({
      body: {
        model: "openrouter/z-ai/glm-4.6",
      },
    })
    console.log(`✅ Session created: ${session.data.id}\n`)

    // Send a simple prompt
    const testPrompt = "What is the capital of France? Answer in one sentence."
    console.log(`📤 Sending prompt: "${testPrompt}"`)

    await client.session.prompt({
      path: { id: session.data.id },
      body: {
        parts: [
          {
            type: "text",
            text: testPrompt,
          },
        ],
      },
    })
    console.log("✅ Prompt sent successfully\n")

    // Wait for AI to process
    console.log("⏳ Waiting for AI response...")
    await new Promise((resolve) => setTimeout(resolve, 8000))

    // Get messages to see the response
    console.log("\n📨 Fetching messages...\n")
    const messages = await client.session.messages({
      path: { id: session.data.id },
    })

    console.log(`Found ${messages.data.length} messages:\n`)
    console.log("=" .repeat(60))

    // Display all messages
    for (const message of messages.data) {
      const role = message.info?.role || "unknown"
      console.log(`\n[${role.toUpperCase()}]`)
      console.log("-".repeat(60))

      const parts = message.parts || []
      for (const part of parts) {
        if (part.type === "text" && part.text) {
          console.log(part.text)
        } else if (part.type === "tool-call") {
          console.log(`[Tool Call: ${part.tool?.name}]`)
        } else if (part.type === "tool-result") {
          console.log(`[Tool Result]`)
        }
      }
    }

    console.log("\n" + "=".repeat(60))

    // Verify we got a response
    if (messages.data.length >= 2) {
      console.log("\n✅ AI response received successfully!")
    } else {
      console.log("\n⚠️  Warning: Expected at least 2 messages (user + assistant)")
    }

    // Clean up
    console.log("\n🧹 Cleaning up...")
    await client.session.delete({ path: { id: session.data.id } })
    console.log("✅ Session deleted")

  } catch (error) {
    console.error("\n❌ Error:", error)
    throw error
  } finally {
    // Close server
    console.log("\n🛑 Shutting down server...")
    server.close()
    console.log("✅ Server stopped")
  }

  console.log("\n✨ Test complete!\n")
}

main().catch((error) => {
  console.error("\n❌ Test failed:", error)
  process.exit(1)
})
