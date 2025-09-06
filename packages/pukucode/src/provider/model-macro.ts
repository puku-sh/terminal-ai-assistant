export async function data() {
    // Stub implementation with basic provider configurations
    return JSON.stringify({
      anthropic: {
        id: "anthropic",
        name: "Anthropic",
        npm: "@ai-sdk/anthropic",
        env: ["ANTHROPIC_API_KEY"],
        api: "https://api.anthropic.com",
        models: {
          "claude-3-5-sonnet-20241022": {
            id: "claude-3-5-sonnet-20241022",
            name: "Claude 3.5 Sonnet",
            release_date: "2024-10-22",
            attachment: true,
            reasoning: false,
            temperature: true,
            tool_call: true,
            cost: {
              input: 3.0,
              output: 15.0,
              cache_read: 0.3,
              cache_write: 3.75
            },
            limit: {
              context: 200000,
              output: 8192
            },
            options: {}
          },
          "claude-3-haiku-20240307": {
            id: "claude-3-haiku-20240307",
            name: "Claude 3 Haiku",
            release_date: "2024-03-07",
            attachment: true,
            reasoning: false,
            temperature: true,
            tool_call: true,
            cost: {
              input: 0.25,
              output: 1.25,
              cache_read: 0.03,
              cache_write: 0.30
            },
            limit: {
              context: 200000,
              output: 4096
            },
            options: {}
          }
        }
      },
      groq: {
        id: "groq",
        name: "Groq",
        npm: "groq-sdk",
        env: ["GROQ_API_KEY"],
        api: "https://api.groq.com/openai/v1",
        models: {
          "llama-3.1-70b-versatile": {
            id: "llama-3.1-70b-versatile",
            name: "Llama 3.1 70B Versatile",
            release_date: "2024-07-23",
            attachment: false,
            reasoning: false,
            temperature: true,
            tool_call: true,
            cost: {
              input: 0.59,
              output: 0.79,
              cache_read: 0,
              cache_write: 0
            },
            limit: {
              context: 131072,
              output: 4096
            },
            options: {}
          },
          "mixtral-8x7b-32768": {
            id: "mixtral-8x7b-32768",
            name: "Mixtral 8x7B Instruct",
            release_date: "2023-12-11",
            attachment: false,
            reasoning: false,
            temperature: true,
            tool_call: true,
            cost: {
              input: 0.24,
              output: 0.24,
              cache_read: 0,
              cache_write: 0
            },
            limit: {
              context: 32768,
              output: 4096
            },
            options: {}
          },
          "llama-3.1-8b-instant": {
            id: "llama-3.1-8b-instant",
            name: "Llama 3.1 8B Instant",
            release_date: "2024-07-23",
            attachment: false,
            reasoning: false,
            temperature: true,
            tool_call: true,
            cost: {
              input: 0.05,
              output: 0.08,
              cache_read: 0,
              cache_write: 0
            },
            limit: {
              context: 131072,
              output: 4096
            },
            options: {}
          },
          "gemma2-9b-it": {
            id: "gemma2-9b-it",
            name: "Gemma 2 9B IT",
            release_date: "2024-06-27",
            attachment: false,
            reasoning: false,
            temperature: true,
            tool_call: true,
            cost: {
              input: 0.2,
              output: 0.2,
              cache_read: 0,
              cache_write: 0
            },
            limit: {
              context: 8192,
              output: 4096
            },
            options: {}
          },
          "moonshotai/kimi-k2-instruct": {
            id: "moonshotai/kimi-k2-instruct",
            name: "Kimi K2 Instruct",
            release_date: "2024-12-01",
            attachment: false,
            reasoning: false,
            temperature: true,
            tool_call: true,
            cost: {
              input: 0.1,
              output: 0.1,
              cache_read: 0,
              cache_write: 0
            },
            limit: {
              context: 200000,
              output: 4096
            },
            options: {}
          }
        }
      },
      openai: {
        id: "openai",
        name: "OpenAI",
        npm: "openai",
        env: ["OPENAI_API_KEY"],
        api: "https://api.openai.com/v1",
        models: {
          "gpt-4o": {
            id: "gpt-4o",
            name: "GPT-4o",
            release_date: "2024-05-13",
            attachment: true,
            reasoning: false,
            temperature: true,
            tool_call: true,
            cost: {
              input: 2.5,
              output: 10.0,
              cache_read: 1.25,
              cache_write: 6.25
            },
            limit: {
              context: 128000,
              output: 4096
            },
            options: {}
          },
          "gpt-4o-mini": {
            id: "gpt-4o-mini",
            name: "GPT-4o Mini",
            release_date: "2024-07-18",
            attachment: true,
            reasoning: false,
            temperature: true,
            tool_call: true,
            cost: {
              input: 0.15,
              output: 0.6,
              cache_read: 0.075,
              cache_write: 0.375
            },
            limit: {
              context: 128000,
              output: 16384
            },
            options: {}
          }
        }
      }
    })
  }