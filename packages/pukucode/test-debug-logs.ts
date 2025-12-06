#!/usr/bin/env bun

/**
 * Test script to verify DEBUG logging is working
 * This script creates various log messages at different levels
 * and makes a simple API request to the server
 */

import { Log } from "./src/util/log"

// Initialize logger with DEBUG level
await Log.init({ print: true, level: "DEBUG" })

const logger = Log.create({ service: "test-debug" })

console.log("=== Testing PukuCode Debug Logging ===\n")

// Test all log levels
logger.debug("This is a DEBUG message - you should see this when LOG_LEVEL=DEBUG")
logger.info("This is an INFO message - visible at INFO level and above")
logger.warn("This is a WARN message - visible at WARN level and above")
logger.error("This is an ERROR message - always visible")

console.log("\n=== Making API request to server ===\n")

// Make a request to the server to trigger logs
const serverUrl = "http://localhost:1337"

try {
  // Test health check or models endpoint
  const response = await fetch(`${serverUrl}/health`).catch(() =>
    fetch(`${serverUrl}/models`)
  )

  if (response.ok) {
    const data = await response.text()
    logger.info("Server response received", { status: response.status })
    logger.debug("Response data", { data: data.substring(0, 100) })
  } else {
    logger.warn("Server returned non-OK status", { status: response.status })
  }
} catch (error) {
  logger.error("Failed to connect to server", {
    error: error instanceof Error ? error.message : String(error),
    serverUrl
  })
  console.log("\nMake sure the server is running with: bun src/index.ts server -p 1337")
}

console.log("\n=== Test Complete ===")
console.log("\nTo see DEBUG logs from the server, run it with:")
console.log("  LOG_LEVEL=DEBUG bun src/index.ts server -p 1337")
console.log("  OR")
console.log("  bun src/index.ts server -p 1337 --log-level DEBUG")
