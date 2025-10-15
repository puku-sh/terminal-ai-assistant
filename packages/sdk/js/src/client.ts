export * from "./gen/types.gen.js"
export { type Config as PukucodeClientConfig, PukucodeClient }

import { createClient } from "./gen/client/client.gen.js"
import { type Config } from "./gen/client/types.gen.js"
import { PukucodeClient } from "./gen/sdk.gen.js"

/**
 * Creates a PukuCode client instance for interacting with the PukuCode server
 * @param config - Client configuration including baseUrl and fetch options
 * @returns A configured PukucodeClient instance
 *
 * @example
 * ```typescript
 * const client = createPukucodeClient({
 *   baseUrl: 'http://localhost:3000'
 * })
 *
 * // Create a new session
 * const session = await client.session.create()
 *
 * // Send a prompt
 * await client.session.prompt({
 *   path: { id: session.data.id },
 *   body: {
 *     parts: [{ type: 'text', text: 'Hello, PukuCode!' }]
 *   }
 * })
 * ```
 */
export function createPukucodeClient(config?: Config) {
  const client = createClient(config)
  return new PukucodeClient({ client })
}
