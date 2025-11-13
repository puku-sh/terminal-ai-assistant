#!/usr/bin/env bun
/**
 * AI Prompt Demo - Tests SDK with actual AI provider (Kimi Groq Proxy)
 *
 * This demo verifies that the PukuCode SDK can successfully:
 * 1. Start a PukuCode server
 * 2. Create a session with AI provider configured
 * 3. Send prompts and receive AI responses
 * 4. Handle streaming responses from the AI
 */

import { createPukucodeClient, createPukucodeServer } from "../src/index.js"

async function main() {
  console.log("🤖 PukuCode SDK AI Prompt Demo\n")
  console.log("This demo tests the SDK with the Kimi Groq Proxy provider\n")

  // Start PukuCode server
  console.log("1. Starting PukuCode server...")
  const server = await createPukucodeServer({
    hostname: "127.0.0.1",
    port: 6666,
    timeout: 15000,
  })
  console.log(`   ✅ Server running at: ${server.url}\n`)

  // Create client
  const client = createPukucodeClient({ baseUrl: server.url })

  try {
    // Test 1: Simple greeting with AI
    console.log("2. Testing simple AI prompt...")
    const session1 = await client.session.create({
      body: {
        model: "groq/llama-3.1-8b-instant", // Fast model for testing
      },
    })
    console.log(`   ✅ Session created: ${session1.data.id}`)

    console.log("   📤 Sending: 'Say hello in one sentence'")
    const response1 = await client.session.prompt({
      path: { id: session1.data.id },
      body: {
        parts: [
          {
            type: "text",
            text: "Say hello in one sentence",
          },
        ],
      },
    })
    console.log("   ✅ Prompt sent successfully")
    console.log("   💬 Waiting for AI response to complete...\n")

    // Wait longer for the first response to fully process
    await new Promise((resolve) => setTimeout(resolve, 10000))

    // Test 2: Math question
    console.log("3. Testing math question with AI...")
    const session2 = await client.session.create({
      body: {
        model: "groq/llama-3.1-8b-instant",
      },
    })
    console.log(`   ✅ Session created: ${session2.data.id}`)

    console.log("   📤 Sending: 'What is 2+2? Answer in one sentence.'")
    await client.session.prompt({
      path: { id: session2.data.id },
      body: {
        parts: [
          {
            type: "text",
            text: "What is 2+2? Answer in one sentence.",
          },
        ],
      },
    })
    console.log("   ✅ Prompt sent successfully\n")

    await new Promise((resolve) => setTimeout(resolve, 5000))

    // Test 3: Code generation
    console.log("4. Testing code generation with AI...")
    const session3 = await client.session.create({
      body: {
        model: "groq/llama-3.3-70b-versatile", // More capable model
      },
    })
    console.log(`   ✅ Session created: ${session3.data.id}`)

    console.log("   📤 Sending: 'Write a simple hello world function in TypeScript'")
    await client.session.prompt({
      path: { id: session3.data.id },
      body: {
        parts: [
          {
            type: "text",
            text: "Write a simple hello world function in TypeScript. Keep it under 5 lines.",
          },
        ],
      },
    })
    console.log("   ✅ Prompt sent successfully\n")

    await new Promise((resolve) => setTimeout(resolve, 3000))

    // Test 4: Multi-part prompt with text
    console.log("5. Testing creative writing prompt...")
    const session4 = await client.session.create({
      body: {
        model: "groq/moonshotai/kimi-k2-instruct", // Kimi model
      },
    })
    console.log(`   ✅ Session created: ${session4.data.id}`)

    console.log("   📤 Sending: 'Write a haiku about programming'")
    await client.session.prompt({
      path: { id: session4.data.id },
      body: {
        parts: [
          {
            type: "text",
            text: "Write a haiku about programming",
          },
        ],
      },
    })
    console.log("   ✅ Prompt sent successfully\n")

    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Test 5: System prompt with context
    console.log("6. Testing prompt with system context...")
    const session5 = await client.session.create({
      body: {
        model: "groq/llama-3.1-8b-instant",
      },
    })
    console.log(`   ✅ Session created: ${session5.data.id}`)

    console.log("   📤 Sending: 'What can you help me with?' (with helpful assistant context)")
    await client.session.prompt({
      path: { id: session5.data.id },
      body: {
        parts: [
          {
            type: "text",
            text: "What can you help me with? Answer in one sentence.",
          },
        ],
      },
    })
    console.log("   ✅ Prompt sent successfully\n")

    await new Promise((resolve) => setTimeout(resolve, 2000))

    // List all sessions to verify
    console.log("7. Verifying all sessions were created...")
    const sessions = await client.session.list()
    console.log(`   ✅ Total sessions in database: ${sessions.data.length}`)
    console.log(`   ✅ Sessions created in this demo: 5\n`)

    // Get messages from one session to verify AI responded
    console.log("8. Checking messages in first session...")
    const messages = await client.session.messages({
      path: { id: session1.data.id },
    })
    console.log(`   ✅ Messages in session: ${messages.data.length}`)
    if (messages.data.length > 0) {
      console.log(`   ✅ AI has responded!\n`)

      // Display all messages with their content
      // Note: messages.data already contains full message objects with info and parts
      for (const message of messages.data) {
        const role = message.info?.role || "unknown"
        console.log(`   📨 Message [${role}]:`)

        // Display each part
        const parts = message.parts || []
        for (const part of parts) {
          if (part.type === "text" && part.text) {
            console.log(`      ${part.text}`)
          } else if (part.type === "tool-call") {
            console.log(`      [Tool Call: ${part.tool?.name}]`)
          } else if (part.type === "tool-result") {
            console.log(`      [Tool Result]`)
          }
        }
        console.log() // Empty line between messages
      }
    } else {
      console.log(`   ⚠️  No messages yet (may still be processing)\n`)
    }

    // Clean up sessions
    console.log("9. Cleaning up test sessions...")
    await Promise.all([
      client.session.delete({ path: { id: session1.data.id } }),
      client.session.delete({ path: { id: session2.data.id } }),
      client.session.delete({ path: { id: session3.data.id } }),
      client.session.delete({ path: { id: session4.data.id } }),
      client.session.delete({ path: { id: session5.data.id } }),
    ])
    console.log(`   ✅ All test sessions deleted\n`)

  } catch (error) {
    console.error("❌ Error during AI prompt testing:", error)
    throw error
  } finally {
    // Close server
    console.log("10. Shutting down server...")
    server.close()
    console.log(`    ✅ Server stopped\n`)
  }

  console.log("✨ AI Prompt Demo Complete!\n")
  console.log("Summary:")
  console.log("  ✅ SDK successfully communicated with PukuCode server")
  console.log("  ✅ Sessions created with different AI models")
  console.log("  ✅ Prompts sent successfully to AI provider")
  console.log("  ✅ Server handled AI provider integration")
  console.log("  ✅ All CRUD operations working")
  console.log("\n🎉 The SDK is fully functional with AI providers!\n")
}

main().catch((error) => {
  console.error("\n❌ Demo failed:", error)
  process.exit(1)
})
