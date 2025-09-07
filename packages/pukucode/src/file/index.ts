import { z } from "zod"
import { Bus } from "../bus"
import { $ } from "bun"
import { createPatch } from "diff"
import path from "path"
import * as git from "isomorphic-git"
import { App } from "../app/app"
import fs from "fs"
import { Log } from "../util/log"

export namespace File {
  const log = Log.create({ service: "file" })

  /**
   * File.Info schema
   * ----------------
   * Defines the shape of a file "diff" entry.
   * This extends what we had in the minimal version:
   * - Minimal version only tracked path/status
   * - Now we also track `added` and `removed` line counts
   */
  export const Info = z
    .object({
      path: z.string(),
      added: z.number().int(),
      removed: z.number().int(),
      status: z.enum(["added", "deleted", "modified"]),
    })
    // .openapi({ ref: "File" }) 

  export type Info = z.infer<typeof Info>

  /**
   * File-related Events on the Bus
   * -------------------------------
   * Our minimal version didn’t have events. 
   * Now we define `file.edited` which other modules can subscribe to.
   */
  export const Event = {
    Edited: Bus.event(
      "file.edited",
      z.object({
        file: z.string(),
      }),
    ),
  }

  /**
   * status()
   * --------
   * In minimal version:
   *  - We just ran `git diff --name-only` → only knew which files were "modified"
   *
   * In final version:
   *  - Parse `git diff --numstat HEAD` → gives #lines added/removed
   *  - Also detect:
   *    - untracked files → `git ls-files --others`
   *    - deleted files → `git diff --name-only --diff-filter=D HEAD`
   */
  export async function status() {
    const app = App.info()
    if (!app.git) return [] // short-circuit if not in a Git repo

    // 1. Modified files (added/removed stats)
    // e.g. "12\t7\tsrc/index.ts"
    const diffOutput = await $`git diff --numstat HEAD`
      .cwd(app.path.cwd)
      .quiet()
      .nothrow()
      .text()

    const changedFiles: Info[] = []

    if (diffOutput.trim()) {
      const lines = diffOutput.trim().split("\n")
      for (const line of lines) {
        const [added, removed, filepath] = line.split("\t")
        changedFiles.push({
          path: filepath,
          added: added === "-" ? 0 : parseInt(added, 10),
          removed: removed === "-" ? 0 : parseInt(removed, 10),
          status: "modified",
        })
      }
    }

    // 2. Untracked files (new files not in Git yet)
    const untrackedOutput = await $`git ls-files --others --exclude-standard`
      .cwd(app.path.cwd)
      .quiet()
      .nothrow()
      .text()

    if (untrackedOutput.trim()) {
      const untrackedFiles = untrackedOutput.trim().split("\n")
      for (const filepath of untrackedFiles) {
        try {
          const content = await Bun.file(path.join(app.path.root, filepath)).text()
          const lines = content.split("\n").length
          changedFiles.push({
            path: filepath,
            added: lines,
            removed: 0,
            status: "added",
          })
        } catch {
          continue
        }
      }
    }

    // 3. Deleted files
    const deletedOutput = await $`git diff --name-only --diff-filter=D HEAD`
      .cwd(app.path.cwd)
      .quiet()
      .nothrow()
      .text()

    if (deletedOutput.trim()) {
      const deletedFiles = deletedOutput.trim().split("\n")
      for (const filepath of deletedFiles) {
        changedFiles.push({
          path: filepath,
          added: 0,
          removed: 0, // could run extra git command, but optional
          status: "deleted",
        })
      }
    }

    // Normalize paths (relative to cwd, not git root)
    return changedFiles.map((x) => ({
      ...x,
      path: path.relative(app.path.cwd, path.join(app.path.root, x.path)),
    }))
  }

  /**
   * read()
   * -------
   * In minimal version:
   *  - We just returned { type: "clean" or "modified", content }
   *
   * In final version:
   *  - If file is clean → return { type: "raw", content }
   *  - If file is dirty (different from Git HEAD):
   *      → fetch previous version using `git show HEAD:file`
   *      → generate a *patch* using `diff.createPatch`
   * This way, we can see exactly WHAT changed.
   */
  export async function read(file: string) {
    using _ = log.time("read", { file })

    const app = App.info()
    const full = path.join(app.path.cwd, file)

    // read current file content (trim)
    const content = await Bun.file(full)
      .text()
      .catch(() => "")
      .then((x) => x.trim())

    if (app.git) {
      const rel = path.relative(app.path.root, full)
      const diff = await git.status({
        fs,
        dir: app.path.root,
        filepath: rel,
      })

      // if status != "unmodified", generate patch
      if (diff !== "unmodified") {
        const original = await $`git show HEAD:${rel}`
          .cwd(app.path.root)
          .quiet()
          .nothrow()
          .text()

        // Create a human-readable diff patch
        const patch = createPatch(file, original, content, "old", "new", {
          context: Infinity,
        })

        return { type: "patch", content: patch }
      }
    }

    // Fallback for non-git or unchanged files
    return { type: "raw", content }
  }
}