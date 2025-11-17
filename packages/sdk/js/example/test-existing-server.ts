#!/usr/bin/env bun
/**
 * Test AI Response with Existing Server
 *
 * Connects to an already-running PukuCode server
 * Run this after starting: pukucode server
 *
 * Uses the GLM-4.6 model via OpenRouter
 */

import { createPukucodeClient } from "../src/index.js"

async function main() {
  console.log("🧪 Testing AI Response with Existing Server\n")

  // Connect to existing server
  const serverUrl = "http://localhost:3000"
  console.log(`🔌 Connecting to server at: ${serverUrl}`)

  const client = createPukucodeClient({ baseUrl: serverUrl })

  try {
    // Verify server is running by listing sessions
    console.log("✅ Checking server connectivity...")
    const existingSessions = await client.session.list()
    console.log(`✅ Connected! Found ${existingSessions.data.length} existing sessions\n`)

    // Create session with GLM-4.6 model
    console.log("Creating new session with openrouter/z-ai/glm-4.6...")
    const session = await client.session.create({
      body: {
        model: "openrouter/z-ai/glm-4.6",
      },
    })
    console.log(`✅ Session created: ${session.data.id}\n`)

    // Send a simple prompt
    const testPrompt = "What is the capital city of France?"
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

      // Find the assistant's response
      const assistantMessage = messages.data.find(m => m.info?.role === "assistant")
      if (assistantMessage) {
        const textParts = assistantMessage.parts?.filter(p => p.type === "text") || []
        const responseText = textParts.map(p => p.text).join("")
        console.log(`\n📝 Response length: ${responseText.length} characters`)
      }
    } else {
      console.log("\n⚠️  Warning: Expected at least 2 messages (user + assistant)")
    }

    // Ask if user wants to clean up
    console.log("\n🧹 Cleaning up test session...")
    await client.session.delete({ path: { id: session.data.id } })
    console.log("✅ Test session deleted")

    // Show final session count
    const finalSessions = await client.session.list()
    console.log(`📊 Total sessions remaining: ${finalSessions.data.length}`)

  } catch (error) {
    console.error("\n❌ Error:", error)
    if (error instanceof Error) {
      if (error.message.includes("ECONNREFUSED") || error.message.includes("fetch failed")) {
        console.error("\n💡 Make sure the server is running:")
        console.error("   Run: pukucode server")
      }
    }
    throw error
  }

  console.log("\n✨ Test complete!\n")
}

main().catch((error) => {
  console.error("\n❌ Test failed:", error)
  process.exit(1)
})
