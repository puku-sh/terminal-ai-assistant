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
        // api: "https://kimi-groq-proxy.poridhiaccess.workers.dev",
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
          "llama-3.3-70b-versatile": {
            id: "llama-3.3-70b-versatile",
            name: "Llama 3.3 70B Versatile",
            release_date: "2024-12-01",
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
              output: 32768
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
              input: 0.05,
              output: 0.08,
              cache_read: 0,
              cache_write: 0
            },
            limit: {
              context: 131072,
              output: 16384
            },
            options: {}
          }
        }
      },
      moonshotai: {
        id: "moonshotai",
        name: "Moonshot AI",
        npm: "@ai-sdk/openai",
        env: ["MOONSHOT_API_KEY"],
        api: "https://api.moonshot.cn/v1",
        models: {
          "kimi-k2-instruct-0905": {
            id: "kimi-k2-instruct-0905",
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
      google: {
        id: "google",
        name: "Google",
        npm: "@ai-sdk/google",
        env: ["GOOGLE_GENERATIVE_AI_API_KEY"],
        api: "https://generativelanguage.googleapis.com/v1beta",
        models: {
          "gemini-1.5-pro": {
            id: "gemini-1.5-pro",
            name: "Gemini 1.5 Pro",
            release_date: "2024-02-15",
            attachment: true,
            reasoning: false,
            temperature: true,
            tool_call: true,
            cost: {
              input: 1.25,
              output: 5.0,
              cache_read: 0.3125,
              cache_write: 1.25
            },
            limit: {
              context: 2097152,
              output: 8192
            },
            options: {}
          },
          "gemini-1.5-flash": {
            id: "gemini-1.5-flash",
            name: "Gemini 1.5 Flash",
            release_date: "2024-05-14",
            attachment: true,
            reasoning: false,
            temperature: true,
            tool_call: true,
            cost: {
              input: 0.075,
              output: 0.3,
              cache_read: 0.01875,
              cache_write: 0.075
            },
            limit: {
              context: 1048576,
              output: 8192
            },
            options: {}
          },
          "gemini-2.0-flash-exp": {
            id: "gemini-2.0-flash-exp",
            name: "Gemini 2.0 Flash Experimental",
            release_date: "2024-12-11",
            attachment: true,
            reasoning: false,
            temperature: true,
            tool_call: true,
            cost: {
              input: 0.075,
              output: 0.3,
              cache_read: 0.01875,
              cache_write: 0.075
            },
            limit: {
              context: 1048576,
              output: 8192
            },
            options: {}
          },
          "gemini-2.5-flash": {
            id: "gemini-2.5-flash",
            name: "Gemini 2.5 Flash",
            attachment: true,
            reasoning: true,
            temperature: true,
            tool_call: true,
            knowledge: "2025-01",
            release_date: "2025-03-20",
            last_updated: "2025-06-05",
            modalities: {
              "input": [
                "text",
                "image",
                "audio",
                "video",
                "pdf"
              ],
              "output": [
                "text"
              ]
            },
            open_weights: false,
            cost: {
              input: 0.3,
              output: 2.5,
              cache_read: 0.075,
              input_audio: 1
            },
            limit: {
              context: 1048576,
              output: 65536
            }
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
      },
      "openrouter": {
        "id": "openrouter",
        "env": [
          "OPENROUTER_API_KEY"
        ],
        "npm": "@ai-sdk/openai-compatible",
        "api": "https://openrouter.ai/api/v1",
        "name": "OpenRouter",
        "doc": "https://openrouter.ai/models",
        "models": {
          "moonshotai/kimi-k2": {
            "id": "moonshotai/kimi-k2",
            "name": "Kimi K2",
            "attachment": false,
            "reasoning": false,
            "temperature": true,
            "tool_call": true,
            "knowledge": "2024-10",
            "release_date": "2025-07-11",
            "last_updated": "2025-07-11",
            "modalities": {
              "input": [
                "text"
              ],
              "output": [
                "text"
              ]
            },
            "open_weights": true,
            "cost": {
              "input": 0.55,
              "output": 2.2
            },
            "limit": {
              "context": 131072,
              "output": 32768
            }
          },
          "z-ai/glm-4.6": {
            "id": "z-ai/glm-4.6",
            "name": "GLM 4.6",
            "attachment": false,
            "reasoning": true,
            "temperature": true,
            "tool_call": true,
            "knowledge": "2025-09",
            "release_date": "2025-09-30",
            "last_updated": "2025-09-30",
            "modalities": {
              "input": [
                "text"
              ],
              "output": [
                "text"
              ]
            },
            "open_weights": true,
            "cost": {
              "input": 0.6,
              "output": 2.2,
              "cache_read": 0.11
            },
            "limit": {
              "context": 200000,
              "output": 128000
            }
          },
        }
      }
    })
  }