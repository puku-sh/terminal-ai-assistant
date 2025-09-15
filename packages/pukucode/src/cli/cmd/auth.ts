import { Auth } from "../../auth"
import { cmd } from "./cmd"
import { ModelsDev } from "../../provider/models"
import { map, pipe, sortBy, values } from "remeda"
import path from "path"
import os from "os"
import { Global } from "../../global"
import { Plugin } from "../../plugin"
import { Instance } from "../../project/instance"

// Simple console utilities to replace @clack/prompts
const console_utils = {
  intro: (msg: string) => console.log(`\n┌  ${msg}`),
  outro: (msg: string) => console.log(`└  ${msg}\n`),
  log: {
    info: (msg: string) => console.log(`│  ${msg}`),
    error: (msg: string) => console.log(`■  ${msg}`),
    warn: (msg: string) => console.log(`▲  ${msg}`),
    success: (msg: string) => console.log(`✓  ${msg}`)
  },

  async input(prompt: string): Promise<string> {
    process.stdout.write(`◆  ${prompt}: `);

    return new Promise<string>((resolve) => {
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
      process.stdin.setEncoding('utf8');

      const onData = (data: any) => {
        process.stdin.off('data', onData);
        process.stdin.pause();
        resolve(data.toString().trim());
      };

      process.stdin.resume();
      process.stdin.once('data', onData);
    });
  },

  async select(options: {message: string, options: Array<{label: string, value: string}>}): Promise<string> {
    console.log(`◆  ${options.message}`);
    options.options.forEach((opt, i) => {
      console.log(`   ${i + 1}. ${opt.label}`);
    });

    const answer = await this.input('Enter choice (number)');
    const index = parseInt(answer) - 1;
    if (index >= 0 && index < options.options.length) {
      return options.options[index].value;
    } else {
      console.log('■  Invalid choice');
      return '';
    }
  }
};

export const AuthCommand = cmd({
  command: "auth",
  describe: "manage credentials",
  builder: (yargs) =>
    yargs.command(AuthLoginCommand).command(AuthLogoutCommand).command(AuthListCommand).demandCommand(),
  async handler() {},
})

export const AuthListCommand = cmd({
  command: "list",
  aliases: ["ls"],
  describe: "list providers",
  async handler() {
    const authPath = path.join(Global.Path.data, "auth.json")
    const homedir = os.homedir()
    const displayPath = authPath.startsWith(homedir) ? authPath.replace(homedir, "~") : authPath
    console_utils.intro(`Credentials ${displayPath}`)
    const results = await Auth.all().then((x) => Object.entries(x))
    const database = await ModelsDev.get()

    for (const [providerID, result] of results) {
      const name = database[providerID]?.name || providerID
      console_utils.log.info(`${name} (${result.type})`)
    }

    console_utils.outro(`${results.length} credentials`)

    // Environment variables section
    const activeEnvVars: Array<{ provider: string; envVar: string }> = []

    for (const [providerID, provider] of Object.entries(database)) {
      for (const envVar of provider.env) {
        if (process.env[envVar]) {
          activeEnvVars.push({
            provider: provider.name || providerID,
            envVar,
          })
        }
      }
    }

    if (activeEnvVars.length > 0) {
      console_utils.intro("Environment")

      for (const { provider, envVar } of activeEnvVars) {
        console_utils.log.info(`${provider} ${envVar}`)
      }

      console_utils.outro(`${activeEnvVars.length} environment variable` + (activeEnvVars.length === 1 ? "" : "s"))
    }
  },
})

export const AuthLoginCommand = cmd({
  command: "login [url]",
  describe: "log in to a provider",
  builder: (yargs) =>
    yargs
      .positional("url", {
        describe: "pukucode auth provider",
        type: "string",
      })
      .option("provider", {
        describe: "provider id (anthropic, openai, groq, other)",
        type: "string",
        alias: "p"
      })
      .option("key", {
        describe: "API key",
        type: "string",
        alias: "k"
      }),
  async handler(args) {
    await Instance.provide(process.cwd(), async () => {
      console_utils.intro("Add credential")
      if (args.url) {
        try {
          const wellknown = await fetch(`${args.url}/.well-known/pukucode`).then((x) => x.json())
          if (wellknown?.auth?.command) {
            console_utils.log.info(`Running \`${wellknown.auth.command.join(" ")}\``)
            const proc = Bun.spawn({
              cmd: wellknown.auth.command,
              stdout: "pipe",
            })
            const exit = await proc.exited
            if (exit !== 0) {
              console_utils.log.error("Failed")
              console_utils.outro("Done")
              return
            }
            const token = await new Response(proc.stdout).text()
            await Auth.set(args.url, {
              type: "wellknown",
              key: wellknown.auth.env,
              token: token.trim(),
            })
            console_utils.log.success("Logged into " + args.url)
            console_utils.outro("Done")
            return
          }
        } catch (error) {
          console_utils.log.error(`Failed to fetch wellknown config from ${args.url}/.well-known/pukucode`)
          console_utils.log.error("This URL doesn't support automatic authentication.")
        }
        console_utils.log.warn(`URL ${args.url} doesn't support wellknown authentication. Use 'auth login' without URL for manual setup.`)
        console_utils.outro("Done")
        return
      }
      let provider = args.provider

      if (!provider) {
        const providers = await ModelsDev.get()
        console_utils.log.info("Available providers: anthropic, openai, groq, other")
        console_utils.log.error("Please specify a provider using --provider or -p flag")
        console_utils.log.info("Example: pukucode auth login --provider anthropic --key your-api-key")
        console_utils.outro("Cancelled")
        return
      }

      // Skip plugin-based auth for now - just handle basic API key entry
      let finalProvider = provider

      if (provider === "other") {
        if (!args.key) {
          console_utils.log.error("For 'other' providers, you must specify both --provider and --key")
          console_utils.log.info("Example: pukucode auth login --provider custom-provider --key your-api-key")
          console_utils.outro("Cancelled")
          return
        }

        // For "other", we need to get the actual provider name from the key or use a default
        finalProvider = "custom"
        console_utils.log.warn(`This only stores a credential for ${finalProvider} - you will need configure it in config files`)
      }

      if (finalProvider === "amazon-bedrock") {
        console_utils.log.info("Amazon bedrock can be configured with standard AWS environment variables like AWS_BEARER_TOKEN_BEDROCK, AWS_PROFILE or AWS_ACCESS_KEY_ID")
        console_utils.outro("Done")
        return
      }

      if (finalProvider === "opencode") {
        console_utils.log.info("Create an api key at https://opencode.ai/auth")
      }

      if (finalProvider === "vercel") {
        console_utils.log.info("You can create an api key at https://vercel.link/ai-gateway-token")
      }

      if (!args.key) {
        console_utils.log.error("API key is required. Use --key or -k flag")
        console_utils.log.info(`Example: pukucode auth login --provider ${provider} --key your-api-key`)
        console_utils.outro("Cancelled")
        return
      }

      const key = args.key

      await Auth.set(finalProvider, {
        type: "api",
        key,
      })

      console_utils.log.success(`API key saved for ${finalProvider}`)
      console_utils.outro("Done")
    })
  },
})

export const AuthLogoutCommand = cmd({
  command: "logout",
  describe: "log out from a configured provider",
  builder: (yargs) =>
    yargs.option("provider", {
      describe: "provider id to remove",
      type: "string",
      alias: "p"
    }),
  async handler(args) {
    const credentials = await Auth.all().then((x) => Object.entries(x))
    console_utils.intro("Remove credential")
    if (credentials.length === 0) {
      console_utils.log.error("No credentials found")
      return
    }

    if (!args.provider) {
      const database = await ModelsDev.get()
      console_utils.log.info("Available credentials:")
      for (const [key, value] of credentials) {
        const name = database[key]?.name || key
        console_utils.log.info(`  ${key} - ${name} (${value.type})`)
      }
      console_utils.log.error("Please specify a provider using --provider or -p flag")
      console_utils.log.info("Example: pukucode auth logout --provider anthropic")
      console_utils.outro("Cancelled")
      return
    }

    const providerID = args.provider

    await Auth.remove(providerID)
    console_utils.log.success(`Removed credentials for ${providerID}`)
    console_utils.outro("Logout successful")
  },
})
