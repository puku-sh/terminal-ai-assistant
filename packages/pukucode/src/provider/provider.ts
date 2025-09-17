import z from "zod"
import { App } from "../app/app"
import { Config } from "../config/config"
import { mergeDeep, sortBy } from "remeda"
import { NoSuchModelError, type LanguageModel, type Provider as SDK } from "ai"
import { Log } from "../util/log"
import { BunProc } from "../bun"
import { Plugin } from "../plugin"
import { ModelsDev } from "./models"
import { NamedError } from "../util/error"
import { Auth } from "../auth"
import { Instance } from "../project/instance"
export namespace Provider {
  const log = Log.create({ service: "provider" })

  /**
   * Type for custom provider loader functions.
   * Each loader can declare:
   * - autoload: whether this provider should auto-initialize
   * - getModel: function to resolve a model from this provider SDK
   * - options: additional settings such as headers or region
   */
  type CustomLoader = (
    provider: ModelsDev.Provider,
    api?: string,
  ) => Promise<{
    autoload: boolean
    getModel?: (sdk: any, modelID: string) => Promise<any>
    options?: Record<string, any>
  }>

  /** Possible sources for providers */
  type Source = "env" | "config" | "custom" | "api"

  /**
   * Special handling for certain providers (Anthropic, OpenAI, Azure, etc.)
   * These allow us to tweak headers, region prefixes, or
   * augment the SDK loading (e.g. in Amazon Bedrock).
   */
  const CUSTOM_LOADERS: Record<string, CustomLoader> = {
    async anthropic() {
      return {
        autoload: true,
        options: {
          headers: {
            // Special Anthropic beta flags
            "anthropic-beta":
              "claude-code-20250219,interleaved-thinking-2025-05-14,fine-grained-tool-streaming-2025-05-14",
          },
        },
      }
    },
    // async opencode(input) {
    //   return {
    //     // Autoload if the provider already has models in database
    //     autoload: Object.keys(input.models).length > 0,
    //     options: {},
    //   }
    // },
    openai: async () => {
      return {
        autoload: true,
        async getModel(sdk: any, modelID: string) {
          // OpenAI SDK exposes `responses(modelID)`
          return sdk.responses(modelID)
        },
        options: {},
      }
    },
    google: async () => {
      return {
        autoload: true,
        options: {},
      }
    },
    azure: async () => {
      return {
        autoload: true,
        async getModel(sdk: any, modelID: string) {
          return sdk.responses(modelID)
        },
        options: {},
      }
    },
    "amazon-bedrock": async () => {
      // Require AWS creds or skip autoload
      if (!process.env["AWS_PROFILE"] && !process.env["AWS_ACCESS_KEY_ID"] && !process.env["AWS_BEARER_TOKEN_BEDROCK"])
        return { autoload: true }

      const region = process.env["AWS_REGION"] ?? "us-east-1"

      // Fetch AWS SDK credential provider dynamically
      const { fromNodeProviderChain } = await import(await BunProc.install("@aws-sdk/credential-providers"))
      return {
        autoload: true,
        options: {
          region,
          credentialProvider: fromNodeProviderChain(),
        },
        async getModel(sdk: any, modelID: string) {
          // Bedrock quirks: sometimes need to prefix model IDs with region abbreviations
          let regionPrefix = region.split("-")[0]

          switch (regionPrefix) {
            case "us": {
              const modelRequiresPrefix = ["claude", "deepseek"].some((m) => modelID.includes(m))
              if (modelRequiresPrefix) {
                modelID = `${regionPrefix}.${modelID}`
              }
              break
            }
            case "eu": {
              const regionRequiresPrefix = [
                "eu-west-1",
                "eu-west-3",
                "eu-north-1",
                "eu-central-1",
                "eu-south-1",
                "eu-south-2",
              ].some((r) => region.includes(r))
              const modelRequiresPrefix = ["claude", "nova-lite", "nova-micro", "llama3", "pixtral"].some((m) =>
                modelID.includes(m),
              )
              if (regionRequiresPrefix && modelRequiresPrefix) {
                modelID = `${regionPrefix}.${modelID}`
              }
              break
            }
            case "ap": {
              const modelRequiresPrefix = ["claude", "nova-lite", "nova-micro", "nova-pro"].some((m) =>
                modelID.includes(m),
              )
              if (modelRequiresPrefix) {
                regionPrefix = "apac"
                modelID = `${regionPrefix}.${modelID}`
              }
              break
            }
          }

          return sdk.languageModel(modelID)
        },
      }
    },
    // Other providers with just headers for identification
    openrouter: async () => ({
      autoload: true,
      options: {
        headers: {
          "HTTP-Referer": "https://opencode.ai/",
          "X-Title": "opencode",
        },
      },
    }),
    vercel: async () => ({
      autoload: true,
      options: {
        headers: {
          "http-referer": "https://github.com/pukucode/pukucode",
          "x-title": "pukucode",
        },
      },
    }),
    groq: async () => ({
      autoload: true,
      options: {
        headers: {
          "http-referer": "https://github.com/pukucode/pukucode",
          "x-title": "pukucode",
        },
      },
    }),
  }

  /**
   * Provider State:
   * This is the main shared service created once per App context.
   * It contains:
   *  - providers: all resolved providers
   *  - models: cached models loaded from sdk
   *  - sdk: cached provider SDK clients
   */
  const state = Instance.state(async () => {
    const config = await Config.get()
    const database = await ModelsDev.get()

    const providers: {
      [providerID: string]: {
        source: Source
        info: ModelsDev.Provider   // provider metadata from ModelsDev database
        getModel?: (sdk: any, modelID: string) => Promise<any>
        options: Record<string, any>
      }
    } = {}
    const models = new Map<string, { info: ModelsDev.Model; language: LanguageModel }>()
    const sdk = new Map<string, SDK>()

    log.info("init")

    /**
     * Helper to merge provider definitions from different sources
     * (env/config/api/custom). Updates the `providers` registry.
     */
    function mergeProvider(
      id: string,
      options: Record<string, any>,
      source: Source,
      getModel?: (sdk: any, modelID: string) => Promise<any>,
    ) {
      const provider = providers[id]
      if (!provider) {
        const info = database[id]
        if (!info) return
        // Attach baseURL if not already provided
        if (info.api && !options["baseURL"]) options["baseURL"] = info.api
        providers[id] = {
          source,
          info,
          options,
          getModel,
        }
        return
      }
      // If provider already exists, merge new options deeply
      provider.options = mergeDeep(provider.options, options)
      provider.source = source
      provider.getModel = getModel ?? provider.getModel
    }

    /** Load providers defined directly in config */
    const configProviders = Object.entries(config.provider ?? {})

    // Merge all config providers into the database
    for (const [providerID, provider] of configProviders) {
      const existing = database[providerID]
      const parsed: ModelsDev.Provider = {
        id: providerID,
        npm: provider.npm ?? existing?.npm,
        name: provider.name ?? existing?.name ?? providerID,
        env: provider.env ?? existing?.env ?? [],
        api: provider.api ?? existing?.api,
        models: existing?.models ?? {},
      }

      // Merge model-level overrides
      for (const [modelID, model] of Object.entries(provider.models ?? {})) {
        const existing = parsed.models[modelID]
        const parsedModel: ModelsDev.Model = {
          id: modelID,
          name: model.name ?? existing?.name ?? modelID,
          release_date: model.release_date ?? existing?.release_date,
          attachment: model.attachment ?? existing?.attachment ?? false,
          reasoning: model.reasoning ?? existing?.reasoning ?? false,
          temperature: model.temperature ?? existing?.temperature ?? false,
          tool_call: model.tool_call ?? existing?.tool_call ?? true,
          cost:
            !model.cost && !existing?.cost
              ? { input: 0, output: 0, cache_read: 0, cache_write: 0 }
              : { cache_read: 0, cache_write: 0, ...existing?.cost, ...model.cost },
          options: { ...existing?.options, ...model.options },
          limit: model.limit ?? existing?.limit ?? { context: 0, output: 0 },
        }
        parsed.models[modelID] = parsedModel
      }
      database[providerID] = parsed
    }

    const disabled = await Config.get().then((cfg) => new Set(cfg.disabled_providers ?? []))

    /** Load from environment variables (e.g. OPENAI_API_KEY) */
    for (const [providerID, provider] of Object.entries(database)) {
      if (disabled.has(providerID)) continue
      const apiKey = provider.env.map((item) => process.env[item]).at(0)
      if (!apiKey) continue
      mergeProvider(
        providerID,
        // If only one env var candidate, include apiKey explicitly
        provider.env.length === 1 ? { apiKey } : {},
        "env",
      )
    }

    /** Load stored API keys (from Auth system) */
    for (const [providerID, provider] of Object.entries(await Auth.all())) {
      if (disabled.has(providerID)) continue
      if (provider.type === "api") {
        mergeProvider(providerID, { apiKey: provider.key }, "api")
      }
    }

    /** Load and merge provider-specific custom loaders */
    for (const [providerID, fn] of Object.entries(CUSTOM_LOADERS)) {
      if (disabled.has(providerID)) continue
      const result = await fn(database[providerID])
      if (result && (result.autoload || providers[providerID])) {
        mergeProvider(providerID, result.options ?? {}, "custom", result.getModel)
      }
    }

    /** Load from plugins providing providers */
    for (const plugin of await Plugin.list()) {
      if (!plugin.auth) continue
      const providerID = plugin.auth.provider
      if (disabled.has(providerID)) continue
      const auth = await Auth.get(providerID)
      if (!auth) continue
      if (!plugin.auth.loader) continue
      const options = await plugin.auth.loader(() => Auth.get(providerID) as any, database[plugin.auth.provider])
      mergeProvider(plugin.auth.provider, options ?? {}, "custom")
    }

    /** Apply final config overrides */
    for (const [providerID, provider] of configProviders) {
      mergeProvider(providerID, provider.options ?? {}, "config")
    }

    /** Final cleanup: remove blacklisted models */
    for (const [providerID, provider] of Object.entries(providers)) {
      const filteredModels = Object.fromEntries(
        Object.entries(provider.info.models).filter(
          ([modelID]) =>
            modelID !== "gpt-5-chat-latest" && !(providerID === "openrouter" && modelID === "openai/gpt-5-chat"),
        ),
      )
      provider.info.models = filteredModels

      // If no models remain, drop provider
      if (Object.keys(provider.info.models).length === 0) {
        delete providers[providerID]
        continue
      }
      log.info("found", { providerID })
    }

    return { models, providers, sdk }
  })

  /** Return all active providers */
  export async function list() {
    return state().then((state) => state.providers)
  }

  /**
   * Load provider SDK lazily.
   * Installs the npm package dynamically (`BunProc.install`)
   * and calls its `create*` factory function.
   */
  async function getSDK(provider: ModelsDev.Provider) {
    return (async () => {
      using _ = log.time("getSDK", { providerID: provider.id })
      const s = await state()
      const existing = s.sdk.get(provider.id)
      if (existing) return existing
      const pkg = provider.npm ?? provider.id
      const mod = await import(await BunProc.install(pkg, "latest"))
      const fn = mod[Object.keys(mod).find((key) => key.startsWith("create"))!]
      const loaded = fn({ name: provider.id, ...s.providers[provider.id]?.options })
      s.sdk.set(provider.id, loaded)
      return loaded as SDK
    })().catch((e) => {
      throw new InitError({ providerID: provider.id }, { cause: e })
    })
  }

  /** Return one provider by ID */
  export async function getProvider(providerID: string) {
    return state().then((s) => s.providers[providerID])
  }

  /**
   * Resolve a specific model from a provider:
   *  - ensures provider + model exist
   *  - loads SDK if not cached
   *  - caches model in state.models
   */
  export async function getModel(providerID: string, modelID: string) {
    const key = `${providerID}/${modelID}`
    const s = await state()
    if (s.models.has(key)) return s.models.get(key)!

    log.info("getModel", { providerID, modelID })

    const provider = s.providers[providerID]
    if (!provider) throw new ModelNotFoundError({ providerID, modelID })
    const info = provider.info.models[modelID]
    if (!info) throw new ModelNotFoundError({ providerID, modelID })
    const sdk = await getSDK(provider.info)

    try {
      const language = provider.getModel ? await provider.getModel(sdk, modelID) : sdk.languageModel(modelID)
      log.info("found", { providerID, modelID })
      s.models.set(key, { info, language })
      return { info, language }
    } catch (e) {
      if (e instanceof NoSuchModelError)
        throw new ModelNotFoundError({ modelID, providerID }, { cause: e })
      throw e
    }
  }

  /** Pick a "small" / lightweight model for given provider */
  export async function getSmallModel(providerID: string) {
    const cfg = await Config.get()

    if (cfg.small_model) {
      const parsed = parseModel(cfg.small_model)
      return getModel(parsed.providerID, parsed.modelID)
    }

    const provider = await state().then((state) => state.providers[providerID])
    if (!provider) return
    const priority = ["3-5-haiku", "3.5-haiku", "gemini-2.5-flash", "gpt-5-nano"]
    for (const item of priority) {
      for (const model of Object.keys(provider.info.models)) {
        if (model.includes(item)) return getModel(providerID, model)
      }
    }
  }

  /** Sort models by priority list + heuristics */
  const priority = ["gemini-2.5-pro-preview", "gpt-5", "claude-sonnet-4"]
  export function sort(models: ModelsDev.Model[]) {
    return sortBy(
      models,
      [(model) => priority.findIndex((filter) => model.id.includes(filter)), "desc"],  // priority first
      [(model) => (model.id.includes("latest") ? 0 : 1), "asc"],                      // prefer latest
      [(model) => model.id, "desc"],                                                  // fallback: alphabetic
    )
  }

  /** Pick a default model (from config or best available provider) */
  export async function defaultModel() {
    const cfg = await Config.get()
    if (cfg.model) return parseModel(cfg.model)
    const provider = await list()
      .then((val) => Object.values(val))
      .then((x) => x.find((p) => !cfg.provider || Object.keys(cfg.provider).includes(p.info.id)))
    if (!provider) throw new Error("no providers found")
    const [model] = sort(Object.values(provider.info.models))
    if (!model) throw new Error("no models found")
    return { providerID: provider.info.id, modelID: model.id }
  }

  /** Utility to split "provider/model" strings */
  export function parseModel(model: string) {
    const [providerID, ...rest] = model.split("/")
    return {
      providerID: providerID,
      modelID: rest.join("/"),
    }
  }

  /** Custom error type: model not found */
  export const ModelNotFoundError = NamedError.create(
    "ProviderModelNotFoundError",
    z.object({
      providerID: z.string(),
      modelID: z.string(),
    }),
  )

  /** Custom error type: provider failed to load */
  export const InitError = NamedError.create(
    "ProviderInitError",
    z.object({
      providerID: z.string(),
    }),
  )
}