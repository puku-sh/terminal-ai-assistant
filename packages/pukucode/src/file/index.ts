import { z } from "zod"
import { App } from "../app/app"
import { $ } from "bun"
import path from "path"

export namespace File {
  // Define the shape of file info
  export const Info = z.object({
    path: z.string(),
    added: z.number().int(),
    removed: z.number().int(),
    status: z.enum(["added", "deleted", "modified"]),
  })

  export type Info = z.infer<typeof Info>

  // Simple Git status - just detect modified files for now
  export async function status() {
    const app = App.info()
    
    // If not a git repo, return empty
    if (!app.git) {
      console.log("Not a git repository")
      return []
    }

    console.log("Checking git status in:", app.path.root)

    // Get modified files only (simplified version)
    const modifiedOutput = await $`git diff --name-only`.cwd(app.path.root).quiet().nothrow().text()
    
    const files: Info[] = []
    
    if (modifiedOutput.trim()) {
      const modifiedFiles = modifiedOutput.trim().split("\n")
      for (const filepath of modifiedFiles) {
        files.push({
          path: filepath,
          added: 0,  // simplified for now
          removed: 0, // simplified for now  
          status: "modified"
        })
      }
    }

    return files
  }
}