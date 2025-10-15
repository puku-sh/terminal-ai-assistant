import { describe, test, expect, beforeAll, afterAll } from "bun:test"
import { createPukucodeClient, createPukucodeServer } from "../src/index"

/**
 * Integration tests that verify SDK works with actual PukuCode server
 * These tests require PukuCode to be installed and available
 */
describe("PukuCode SDK Integration Tests", () => {
  let server: Awaited<ReturnType<typeof createPukucodeServer>>
  let client: ReturnType<typeof createPukucodeClient>

  beforeAll(async () => {
    console.log("Starting PukuCode server for integration tests...")
    server = await createPukucodeServer({
      hostname: "127.0.0.1",
      port: 3005,
      timeout: 20000,
    })

    client = createPukucodeClient({
      baseUrl: server.url,
    })

    console.log(`Server running at ${server.url}`)
  }, 30000) // 30 second timeout for server startup

  afterAll(() => {
    if (server) {
      console.log("Stopping PukuCode server...")
      server.close()
    }
  })

  test("should create session and send prompt", async () => {
    // Create a new session
    const session = await client.session.create()
    expect(session.data).toBeDefined()
    expect(session.data.id).toBeDefined()

    // Send a prompt
    const promptResponse = await client.session.prompt({
      path: { id: session.data.id },
      body: {
        parts: [
          {
            type: "text",
            text: "Hello! Can you respond with just 'OK'?",
          },
        ],
      },
    })

    expect(promptResponse).toBeDefined()

    // Clean up
    await client.session.delete({
      path: { id: session.data.id },
    })
  }, 30000)

  test("should list and manage sessions", async () => {
    // Create multiple sessions
    const session1 = await client.session.create()
    const session2 = await client.session.create()

    // List sessions
    const sessions = await client.session.list()
    expect(sessions.data.length).toBeGreaterThanOrEqual(2)

    // Get individual sessions
    const fetchedSession1 = await client.session.get({
      path: { id: session1.data.id },
    })
    expect(fetchedSession1.data.id).toBe(session1.data.id)

    // Update session
    await client.session.update({
      path: { id: session1.data.id },
      body: {
        title: "Integration Test Session",
      },
    })

    // Verify update
    const updatedSession = await client.session.get({
      path: { id: session1.data.id },
    })
    expect(updatedSession.data.title).toBe("Integration Test Session")

    // Clean up
    await client.session.delete({ path: { id: session1.data.id } })
    await client.session.delete({ path: { id: session2.data.id } })
  })

  test("should get configuration and providers", async () => {
    // Get configuration
    const config = await client.config.get()
    expect(config.data).toBeDefined()

    // List providers
    const providers = await client.config.providers()
    expect(providers.data).toBeDefined()
    // Providers could be an array or object depending on implementation
    expect(providers.data).toBeTruthy()
  })

  test("should list agents", async () => {
    const agents = await client.app.agents()
    expect(agents.data).toBeDefined()
    expect(Array.isArray(agents.data)).toBe(true)
    expect(agents.data.length).toBeGreaterThan(0)
  })

  test("should get file status", async () => {
    const status = await client.file.status()
    expect(status.data).toBeDefined()
  })

  test("should get current project", async () => {
    const project = await client.project.current()
    expect(project.data).toBeDefined()
  })
})
