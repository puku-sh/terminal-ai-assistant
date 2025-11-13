#!/usr/bin/env bun
/**
 * Direct API Test - Tests the PukuCode server API endpoints directly
 * This helps us debug issues by bypassing the SDK
 */

async function testAPI() {
  const baseUrl = "http://localhost:3000"

  console.log("🧪 Testing PukuCode API Endpoints Directly\n")

  try {
    // Test 1: Create a session
    console.log("1. Creating a session...")
    const createResponse = await fetch(`${baseUrl}/session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openrouter/z-ai/glm-4.6",
      }),
    })

    if (!createResponse.ok) {
      console.log(`   ❌ Failed: ${createResponse.status} ${createResponse.statusText}`)
      const error = await createResponse.text()
      console.log(`   Error: ${error}`)
      return
    }

    const session = await createResponse.json()
    console.log(`   ✅ Session created: ${session.id}`)
    console.log(`   Session data:`, JSON.stringify(session, null, 2))

    // Test 2: Send a prompt
    console.log("\n2. Sending a prompt...")
    const promptBody = {
      parts: [
        {
          type: "text",
          text: "Hi. Can you please show me the files that are located in the current directory?",
        },
      ],
    }
    console.log(`   Request body:`, JSON.stringify(promptBody, null, 2))

    const promptResponse = await fetch(`${baseUrl}/session/${session.id}/message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(promptBody),
    })

    if (!promptResponse.ok) {
      console.log(`   ❌ Failed: ${promptResponse.status} ${promptResponse.statusText}`)
      const error = await promptResponse.text()
      console.log(`   Error: ${error}`)
      return
    }

    const promptResult = await promptResponse.json()
    console.log(`   ✅ Prompt sent`)
    console.log(`   Response:`, JSON.stringify(promptResult, null, 2))

    // Test 3: Wait and check messages
    console.log("\n3. Waiting 8 seconds for AI to respond...")
    await new Promise((resolve) => setTimeout(resolve, 8000))

    console.log("\n4. Fetching messages...")
    const messagesResponse = await fetch(`${baseUrl}/session/${session.id}/message`)

    if (!messagesResponse.ok) {
      console.log(`   ❌ Failed: ${messagesResponse.status} ${messagesResponse.statusText}`)
      const error = await messagesResponse.text()
      console.log(`   Error: ${error}`)
      return
    }

    const messages = await messagesResponse.json()
    console.log(`   ✅ Retrieved ${messages.length} messages`)
    console.log(`   Messages data:`, JSON.stringify(messages, null, 2))

    // Display messages
    console.log("\n5. Message contents:")
    for (const message of messages) {
      const role = message.info?.role || "unknown"
      console.log(`\n   📨 Message [${role}]:`)

      const parts = message.parts || []
      for (const part of parts) {
        if (part.type === "text" && part.text) {
          console.log(`      Text: ${part.text}`)
        } else if (part.type === "tool-call") {
          console.log(`      [Tool Call: ${part.tool?.name}]`)
        } else if (part.type === "tool-result") {
          console.log(`      [Tool Result]`)
        } else {
          console.log(`      [Part type: ${part.type}]`)
        }
      }
    }

    // Test 4: Delete session
    console.log("\n6. Deleting test session...")
    const deleteResponse = await fetch(`${baseUrl}/session/${session.id}`, {
      method: "DELETE",
    })

    if (!deleteResponse.ok) {
      console.log(`   ❌ Failed: ${deleteResponse.status} ${deleteResponse.statusText}`)
    } else {
      console.log(`   ✅ Session deleted`)
    }

    console.log("\n✨ Direct API test complete!")
  } catch (error) {
    console.error("\n❌ Error during API testing:", error)
  }
}

console.log("⚠️  Make sure PukuCode server is running on port 6666")
console.log("   Run: cd packages/pukucode && bun run dev server --port 6666\n")

testAPI()
