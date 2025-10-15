import { describe, test, expect, beforeAll, afterAll } from "bun:test"
import { createPukucodeClient, createPukucodeServer } from "../src/index"

describe("PukuCode SDK", () => {
  let server: Awaited<ReturnType<typeof createPukucodeServer>>
  let client: ReturnType<typeof createPukucodeClient>

  beforeAll(async () => {
    // Start a test server
    server = await createPukucodeServer({
      hostname: "127.0.0.1",
      port: 3002,
      timeout: 15000,
    })

    client = createPukucodeClient({
      baseUrl: server.url,
    })
  })

  afterAll(() => {
    if (server) {
      server.close()
    }
  })

  describe("Session Management", () => {
    test("should create a new session", async () => {
      const session = await client.session.create()

      expect(session).toBeDefined()
      expect(session.data).toBeDefined()
      expect(session.data.id).toBeDefined()
      expect(typeof session.data.id).toBe("string")
    })

    test("should list sessions", async () => {
      const sessions = await client.session.list()

      expect(sessions).toBeDefined()
      expect(sessions.data).toBeDefined()
      expect(Array.isArray(sessions.data)).toBe(true)
    })

    test("should get a specific session", async () => {
      const newSession = await client.session.create()
      const session = await client.session.get({
        path: { id: newSession.data.id },
      })

      expect(session).toBeDefined()
      expect(session.data).toBeDefined()
      expect(session.data.id).toBe(newSession.data.id)
    })

    test("should update a session", async () => {
      const newSession = await client.session.create()
      const updatedSession = await client.session.update({
        path: { id: newSession.data.id },
        body: {
          title: "Test Session",
        },
      })

      expect(updatedSession).toBeDefined()
      expect(updatedSession.data.title).toBe("Test Session")
    })

    test("should delete a session", async () => {
      const newSession = await client.session.create()
      await client.session.delete({
        path: { id: newSession.data.id },
      })

      // Try to get the removed session - should fail or return null
      try {
        await client.session.get({
          path: { id: newSession.data.id },
        })
      } catch (error) {
        // Expected to fail
        expect(error).toBeDefined()
      }
    })
  })

  describe("Prompt Handling", () => {
    test("should send a text prompt", async () => {
      const session = await client.session.create()

      const response = await client.session.prompt({
        path: { id: session.data.id },
        body: {
          parts: [
            {
              type: "text",
              text: "Hello, this is a test prompt.",
            },
          ],
        },
      })

      expect(response).toBeDefined()
    })

    test("should send a prompt with file", async () => {
      const session = await client.session.create()

      const response = await client.session.prompt({
        path: { id: session.data.id },
        body: {
          parts: [
            {
              type: "file",
              mime: "text/plain",
              url: "file://./test/sdk.test.ts",
              filename: "sdk.test.ts",
            },
            {
              type: "text",
              text: "Review this test file.",
            },
          ],
        },
      })

      expect(response).toBeDefined()
    })
  })

  describe("Configuration", () => {
    test("should get configuration", async () => {
      const config = await client.config.get()

      expect(config).toBeDefined()
      expect(config.data).toBeDefined()
    })
  })

  describe("Provider Management", () => {
    test("should list available providers", async () => {
      const providers = await client.config.providers()

      expect(providers).toBeDefined()
      expect(providers.data).toBeDefined()
      expect(Array.isArray(providers.data)).toBe(true)
    })
  })

  describe("Agent Management", () => {
    test("should list available agents", async () => {
      const agents = await client.app.agents()

      expect(agents).toBeDefined()
      expect(agents.data).toBeDefined()
      expect(Array.isArray(agents.data)).toBe(true)
    })
  })

  describe("File Operations", () => {
    test("should get file status", async () => {
      const status = await client.file.status()

      expect(status).toBeDefined()
      expect(status.data).toBeDefined()
    })
  })
})

describe("Server Management", () => {
  test("should start and stop server", async () => {
    const testServer = await createPukucodeServer({
      hostname: "127.0.0.1",
      port: 3003,
      timeout: 15000,
    })

    expect(testServer).toBeDefined()
    expect(testServer.url).toBeDefined()
    expect(testServer.url).toContain("http://")

    testServer.close()
  })

  test("should create client with custom config", () => {
    const testClient = createPukucodeClient({
      baseUrl: "http://localhost:3000",
    })

    expect(testClient).toBeDefined()
  })
})
