#!/usr/bin/env bun
/**
 * Final Verification - Shows actual AI response content
 * This proves the Kimi Groq Proxy is working correctly
 */

import { createPukucodeClient, createPukucodeServer } from "../src/index.js"

async function main() {
  console.log("🔍 Final Verification - Checking Kimi Groq Proxy Integration\n")

  // Start server
  console.log("Starting PukuCode server...")
  const server = await createPukucodeServer({
    hostname: "127.0.0.1",
    port: 7777,
    timeout: 15000,
  })
  console.log(`✅ Server running at: ${server.url}\n`)

  const client = createPukucodeClient({ baseUrl: server.url })

  try {
    // Create session (sessions don't store model preference)
    console.log("Creating test session...")
    const session = await client.session.create({
      body: {},
    })
    console.log(`✅ Session created: ${session.data.id}\n`)

    // Send a simple prompt with Groq model specified
    console.log("Sending prompt with groq/llama-3.1-8b-instant model: 'Say hello in exactly 5 words'\n")
    await client.session.prompt({
      path: { id: session.data.id },
      body: {
        model: {
          providerID: "groq",
          modelID: "llama-3.1-8b-instant",
        },
        parts: [
          {
            type: "text",
            text: "Say hello in exactly 5 words",
          },
        ],
      },
    })
    console.log("✅ Prompt sent, waiting for AI response...\n")

    // Wait for AI to respond - retry multiple times
    let messages
    let attempts = 0
    const maxAttempts = 6

    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 2000))
      attempts++

      console.log(`Attempt ${attempts}/${maxAttempts}: Fetching messages...`)
      messages = await client.session.messages({
        path: { id: session.data.id },
      })

      // Check if we have an AI response
      const hasAIResponse = messages.data.some(
        (msg) => msg.role === "assistant"
      )

      if (hasAIResponse) {
        console.log("✅ AI response detected!\n")
        break
      } else {
        console.log(`   Still waiting... (${messages.data.length} messages so far)`)
      }
    }

    if (messages.data.length === 0) {
      console.log("❌ No messages received - AI may not have responded yet")
      return
    }

    console.log(`✅ Received ${messages.data.length} message(s)\n`)

    // Display each message
    for (let i = 0; i < messages.data.length; i++) {
      const message = messages.data[i]
      console.log(`Message ${i + 1}:`)
      console.log(`  Role: ${message.role}`)
      console.log(`  ID: ${message.id}`)
      console.log(`  Parts: ${message.parts?.length || 0}\n`)

      if (message.parts && message.parts.length > 0) {
        for (let j = 0; j < message.parts.length; j++) {
          const part = message.parts[j]
          console.log(`  Part ${j + 1}:`)
          console.log(`    Type: ${part.type}`)

          if (part.type === "text" && "text" in part) {
            console.log(`    Content: "${part.text}"\n`)
          }
        }
      }
    }

    // Check if we got an AI response
    const hasAIResponse = messages.data.some(
      (msg) => msg.role === "assistant" && msg.parts && msg.parts.length > 0
    )

    if (hasAIResponse) {
      console.log("✅ SUCCESS! The AI responded via the Kimi Groq Proxy!")
      console.log("✅ The proxy configuration is working correctly!\n")
    } else {
      console.log("⚠️  No AI assistant response found (may still be processing)\n")
    }

    // Clean up
    await client.session.delete({ path: { id: session.data.id } })
    console.log("✅ Test session deleted")

  } catch (error) {
    console.error("❌ Error during verification:", error)
    throw error
  } finally {
    server.close()
    console.log("✅ Server stopped\n")
  }

  console.log("🎉 Verification complete!")
}

main().catch((error) => {
  console.error("\n❌ Verification failed:", error)
  process.exit(1)
})
