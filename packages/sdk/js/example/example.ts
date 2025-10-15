import { createPukucodeClient, createPukucodeServer } from "@pukucode/sdk"

/**
 * Example demonstrating basic PukuCode SDK usage
 */
async function basicExample() {
  console.log("=== Basic PukuCode SDK Example ===\n")

  // Connect to an existing PukuCode server
  const client = createPukucodeClient({
    baseUrl: "http://localhost:3000",
  })

  // Create a new session
  console.log("Creating a new session...")
  const session = await client.session.create()
  console.log(`Session created: ${session.data.id}\n`)

  // Send a simple text prompt
  console.log("Sending a prompt...")
  await client.session.prompt({
    path: { id: session.data.id },
    body: {
      parts: [
        {
          type: "text",
          text: "Hello! Please write a simple hello world function in TypeScript.",
        },
      ],
    },
  })

  console.log("Prompt sent successfully!\n")

  // List all sessions
  const sessions = await client.session.list()
  console.log(`Total sessions: ${sessions.data.length}`)
}

/**
 * Example demonstrating server creation and management
 */
async function serverExample() {
  console.log("\n=== Server Management Example ===\n")

  // Start a PukuCode server programmatically
  console.log("Starting PukuCode server...")
  const server = await createPukucodeServer({
    hostname: "127.0.0.1",
    port: 3001,
    timeout: 15000,
  })

  console.log(`Server started at: ${server.url}\n`)

  // Create a client connected to the new server
  const client = createPukucodeClient({
    baseUrl: server.url,
  })

  // Use the client
  const session = await client.session.create()
  console.log(`Created session on new server: ${session.data.id}`)

  // Clean up
  console.log("\nClosing server...")
  server.close()
  console.log("Server closed")
}

/**
 * Example demonstrating file-based prompts
 */
async function filePromptExample() {
  console.log("\n=== File-Based Prompt Example ===\n")

  const client = createPukucodeClient({
    baseUrl: "http://localhost:3000",
  })

  const session = await client.session.create()

  // Send a prompt with a file attachment
  console.log("Sending prompt with file...")
  await client.session.prompt({
    path: { id: session.data.id },
    body: {
      parts: [
        {
          type: "file",
          mime: "text/plain",
          url: "file://./example.ts",
          filename: "example.ts",
        },
        {
          type: "text",
          text: "Please review this code and suggest improvements.",
        },
      ],
    },
  })

  console.log("File-based prompt sent successfully!")
}

/**
 * Example demonstrating session management operations
 */
async function sessionManagementExample() {
  console.log("\n=== Session Management Example ===\n")

  const client = createPukucodeClient({
    baseUrl: "http://localhost:3000",
  })

  // Create a session
  const session = await client.session.create({
    body: {
      agent: "build",
      model: "anthropic/claude-3-5-sonnet-20241022",
    },
  })

  console.log(`Session ID: ${session.data.id}`)
  console.log(`Agent: ${session.data.agent}`)
  console.log(`Model: ${session.data.model}`)

  // Update session
  await client.session.update({
    path: { id: session.data.id },
    body: {
      title: "My Updated Session",
    },
  })

  console.log("\nSession updated with new title")

  // Get session info
  const sessionInfo = await client.session.get({
    path: { id: session.data.id },
  })

  console.log(`Session title: ${sessionInfo.data.title}`)

  // Delete session when done
  await client.session.delete({
    path: { id: session.data.id },
  })

  console.log("\nSession deleted")
}

/**
 * Example demonstrating configuration and provider management
 */
async function configExample() {
  console.log("\n=== Configuration Example ===\n")

  const client = createPukucodeClient({
    baseUrl: "http://localhost:3000",
  })

  // Get current configuration
  const config = await client.config.get()
  console.log("Current configuration loaded")

  // List available providers
  const providers = await client.config.providers()
  console.log(`\nAvailable providers: ${providers.data.length}`)
  providers.data.forEach((provider) => {
    console.log(`  - ${provider.id}`)
  })

  // List available agents
  const agents = await client.app.agents()
  console.log(`\nAvailable agents: ${agents.data.length}`)
  agents.data.forEach((agent) => {
    console.log(`  - ${agent.id}`)
  })
}

/**
 * Example demonstrating batch file processing
 */
async function batchProcessingExample() {
  console.log("\n=== Batch Processing Example ===\n")

  const server = await createPukucodeServer()
  const client = createPukucodeClient({ baseUrl: server.url })

  // Process multiple files in parallel
  const files = await Array.fromAsync(new Bun.Glob("src/**/*.ts").scan())

  console.log(`Processing ${files.length} files...`)

  const tasks = files.map(async (file) => {
    const session = await client.session.create()
    console.log(`Processing ${file}`)

    await client.session.prompt({
      path: { id: session.data.id },
      body: {
        parts: [
          {
            type: "file",
            mime: "text/plain",
            url: `file://${file}`,
          },
          {
            type: "text",
            text: `Analyze this file and provide a brief summary.`,
          },
        ],
      },
    })

    console.log(`Completed ${file}`)
  })

  await Promise.all(tasks)

  console.log("\nAll files processed!")
  server.close()
}

/**
 * Main function to run all examples
 */
async function main() {
  try {
    // Run basic example first
    await basicExample()

    // Uncomment to run other examples:
    // await serverExample()
    // await filePromptExample()
    // await sessionManagementExample()
    // await configExample()
    // await batchProcessingExample()
  } catch (error) {
    console.error("Error running examples:", error)
    throw error
  }
}

// Run examples if this file is executed directly
if (import.meta.main) {
  main().catch(console.error)
}

export {
  basicExample,
  serverExample,
  filePromptExample,
  sessionManagementExample,
  configExample,
  batchProcessingExample,
}
