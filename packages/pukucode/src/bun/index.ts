import { z } from "zod"
import { Global } from "../global"
import { Log } from "../util/log"
import path from "path"
import { NamedError } from "../util/error"
import { readableStreamToText } from "bun"

// BunProc is a helper namespace for running Bun commands in a structured way
export namespace BunProc {
  // Create a logger for this service
  const log = Log.create({ service: "bun" })

  /**
   * Runs a command using Bun.spawn with clean logging and error handling
   *
   * @param cmd - Array of command arguments (e.g., ["add", "chalk"])
   * @param options - Bun.Spawn options (cwd, env, etc.)
   * @returns Bun.Subprocess instance (contains stdout/stderr, exitCode, etc.)
   *
   * Example:
   *   await BunProc.run(["--version"])
   */
  export async function run(cmd: string[], options?: Bun.SpawnOptions.OptionsObject<any, any, any>) {
    // Log the command being run
    log.info("running", {
      cmd: [which(), ...cmd], // which() = process.execPath
      ...options,
    })

    // Spawn Bun process
    const result = Bun.spawn([which(), ...cmd], {
      ...options,
      stdout: "pipe", // capture stdout
      stderr: "pipe", // capture stderr
      env: {
        ...process.env,   // inherit current environment
        ...options?.env,  // allow overrides
        BUN_BE_BUN: "1",  // custom var to signal "run under Bun"
      },
    })

    // Wait for process to finish
    const code = await result.exited

    // Collect stdout (could be a stream or fd number)
    const stdout = result.stdout
      ? typeof result.stdout === "number"
        ? result.stdout // if fd number
        : await readableStreamToText(result.stdout) // stream → string
      : undefined

    // Collect stderr
    const stderr = result.stderr
      ? typeof result.stderr === "number"
        ? result.stderr
        : await readableStreamToText(result.stderr)
      : undefined

    // Log output
    log.info("done", {
      code,
      stdout,
      stderr,
    })

    // If non-zero exit code, throw error
    if (code !== 0) {
      throw new Error(`Command failed with exit code ${result.exitCode}`)
    }

    // Otherwise, return process result
    return result
  }

  /**
   * Returns the path to the current Bun executable
   */
  export function which() {
    return process.execPath
  }

  /**
   * Custom error type for package installation failures
   */
  export const InstallFailedError = NamedError.create(
    "BunInstallFailedError",
    z.object({
      pkg: z.string(),
      version: z.string(),
    }),
  )

  /**
   * Installs an NPM package into the global cache directory using Bun
   *
   * @param pkg - Package name (e.g. "chalk")
   * @param version - Version to install (default = "latest")
   * @returns module install path (cache/node_modules/pkg)
   */
  export async function install(pkg: string, version = "latest") {
    // Where this package would live after install
    const mod = path.join(Global.Path.cache, "node_modules", pkg)

    // Load or initialize cache/package.json
    const pkgjson = Bun.file(path.join(Global.Path.cache, "package.json"))
    const parsed = await pkgjson.json().catch(async () => {
      const result = { dependencies: {} }
      // If package.json didn’t exist, write a blank one
      await Bun.write(pkgjson.name!, JSON.stringify(result, null, 2))
      return result
    })

    // If already installed at right version, return early
    if (parsed.dependencies[pkg] === version) return mod

    // Build Bun "add" command
    const args = ["add", "--force", "--exact", "--cwd", Global.Path.cache, pkg + "@" + version]

    log.info("installing package using Bun's default registry resolution", { pkg, version })

    // Run Bun install command
    await BunProc.run(args, {
      cwd: Global.Path.cache,
    }).catch((e) => {
      // Wrap in custom error type if install fails
      throw new InstallFailedError(
        { pkg, version },
        { cause: e },
      )
    })

    // Save new dependency version
    parsed.dependencies[pkg] = version
    await Bun.write(pkgjson.name!, JSON.stringify(parsed, null, 2))

    return mod
  }
}