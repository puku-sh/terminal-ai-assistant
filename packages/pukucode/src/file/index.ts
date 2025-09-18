import { z } from "zod"
import { Bus } from "../bus"
import { $ } from "bun"
import { createPatch } from "diff"
import path from "path"
import ignore from "ignore"
//import { App } from "../app/app"
import fs from "fs"
import { Log } from "../util/log"
import {Instance } from "../project/instance"

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
    .openapi("File") 

  export type Info = z.infer<typeof Info>

  /**
   * The Node type  represents a file system entry with these properties 

    Purpose: Used by the list() function  to return structured directory listings that include:
    - File metadata for UI display
    - Git ignore status for visual indicators
    - Type information for sorting (directories first, then files alphabetically)

    This enables the IDE to show file trees with proper icons, sorting, and ignore status visualization.
  */

    export const Node = z
      .object({
        name: z.string(),
        path: z.string(),
        type: z.enum(["file", "directory"]),
        ignored: z.boolean(),
      })
      .openapi("FileNode")
    export type Node = z.infer<typeof Node>
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
    const project = Instance.project        // Get current project configuration
    if (project.vcs !== "git") return []   // If not Git, return empty array
    // 1. Modified files (added/removed stats)
    // e.g. "12\t7\tsrc/index.ts"
    const diffOutput = await $`git diff --numstat HEAD`.cwd(Instance.directory).quiet().nothrow().text()

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
      .cwd(Instance.directory)
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
      .cwd(Instance.directory)
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
      path: path.relative(Instance.directory, path.join(Instance.worktree, x.path)),
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

    const project = Instance.project
    const full = path.join(Instance.directory, file)

    // read current file content (trim)
    const content = await Bun.file(full)
      .text()
      .catch(() => "")
      .then((x) => x.trim())

    if (project.vcs === "git") {
      const rel = path.relative(Instance.worktree, full)
      const diff = await $`git diff ${rel}`.cwd(Instance.worktree).quiet().nothrow().text()

      
      if (diff.trim()) {
        const original = await $`git show HEAD:${rel}`.cwd(Instance.worktree).quiet().nothrow().text()
        const patch = createPatch(file, original, content, "old", "new", {
          context: Infinity,
        })
        return { type: "patch", content: patch }
      }
    }

    // Fallback for non-git or unchanged files
    return { type: "raw", content }
  }
  export async function list(dir?: string) {
    const exclude = [".git", ".DS_Store"]
    const project = Instance.project
    let ignored = (_: string) => false
    if (project.vcs === "git") {
      const gitignore = Bun.file(path.join(Instance.worktree, ".gitignore"))
      if (await gitignore.exists()) {
        const ig = ignore().add(await gitignore.text())
        ignored = ig.ignores.bind(ig)
      }
    }
    const resolved = dir ? path.join(Instance.directory, dir) : Instance.directory
    const nodes: Node[] = []
    for (const entry of await fs.promises.readdir(resolved, { withFileTypes: true })) {
      if (exclude.includes(entry.name)) continue
      const fullPath = path.join(resolved, entry.name)
      const relativePath = path.relative(Instance.directory, fullPath)
      const type = entry.isDirectory() ? "directory" : "file"
      nodes.push({
        name: entry.name,
        path: relativePath,
        type,
        ignored: ignored(type === "directory" ? relativePath + "/" : relativePath),
      })
    }
    return nodes.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === "directory" ? -1 : 1
      }
      return a.name.localeCompare(b.name)
    })
  }
}