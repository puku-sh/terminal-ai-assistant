import { describe, test, expect } from "bun:test"
import { createPukucodeClient } from "../src/client"

describe("Basic SDK Tests", () => {
  test("should create a client instance", () => {
    const client = createPukucodeClient({
      baseUrl: "http://localhost:3000",
    })

    expect(client).toBeDefined()
    expect(client.session).toBeDefined()
    expect(client.config).toBeDefined()
    expect(client.file).toBeDefined()
    expect(client.app).toBeDefined()
    expect(client.project).toBeDefined()
    expect(client.auth).toBeDefined()
    expect(client.command).toBeDefined()
  })

  test("should have correct session methods", () => {
    const client = createPukucodeClient()

    expect(typeof client.session.create).toBe("function")
    expect(typeof client.session.list).toBe("function")
    expect(typeof client.session.get).toBe("function")
    expect(typeof client.session.update).toBe("function")
    expect(typeof client.session.delete).toBe("function")
    expect(typeof client.session.prompt).toBe("function")
    expect(typeof client.session.messages).toBe("function")
    expect(typeof client.session.command).toBe("function")
    expect(typeof client.session.shell).toBe("function")
  })

  test("should have correct config methods", () => {
    const client = createPukucodeClient()

    expect(typeof client.config.get).toBe("function")
    expect(typeof client.config.providers).toBe("function")
  })

  test("should have correct app methods", () => {
    const client = createPukucodeClient()

    expect(typeof client.app.agents).toBe("function")
    expect(typeof client.app.log).toBe("function")
  })

  test("should have correct file methods", () => {
    const client = createPukucodeClient()

    expect(typeof client.file.list).toBe("function")
    expect(typeof client.file.read).toBe("function")
    expect(typeof client.file.status).toBe("function")
  })
})
