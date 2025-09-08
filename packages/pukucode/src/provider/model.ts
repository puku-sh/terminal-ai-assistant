import { Global } from "../global"
import { Log } from "../util/log"
import path from "path"
import { z } from "zod"
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi"
import { data } from "./model-macro" with { type: "macro" }

extendZodWithOpenApi(z)




export namespace ModelsDev {
  const log = Log.create({ service: "models.dev" })
  const filepath = path.join(Global.Path.cache, "models.json")

  export const Model = z.object({
    id: z.string(),
    name: z.string(),
    release_date: z.string(),
    attachment: z.boolean(),
    reasoning: z.boolean(),
    temperature: z.boolean(),
    tool_call: z.boolean(),
    cost: z.object({
      input: z.number(),
      output: z.number(),
      cache_read: z.number().optional(),
      cache_write: z.number().optional(),
    }),
    limit: z.object({
      context: z.number(),
      output: z.number(),
    }),
    options: z.record(z.any()),
  })
  .openapi("Model")
  export type Model = z.infer<typeof Model>

  export const Provider = z.object({
    api: z.string().optional(),
    name: z.string(),
    env: z.array(z.string()),
    id: z.string(),
    npm: z.string().optional(),
    models: z.record(z.string(), Model),
  })
  .openapi("Provider")

  export type Provider = z.infer<typeof Provider>

  export async function get() {
    
    const file = Bun.file(filepath)
    const result = await file.json().catch(() => {})
    if (result) return result as Record<string, Provider>
    const json = await data()
    return JSON.parse(json) as Record<string, Provider>
  }

}