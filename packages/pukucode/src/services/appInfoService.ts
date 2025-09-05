// services/appInfoService.ts
import { App } from "../app/app"

export const useAppInfoService = App.state(
  "app-info",
  (info) => {
    console.log("🚀 Initializing AppInfoService")
    return {
      summary: () => ({
        hostname: info.hostname,
        cwd: info.path.cwd,
        root: info.path.root,
        configDir: info.path.config,
        gitRepo: info.git
      })
    }
  },
  async (service) => {
    console.log("🛑 Shutting down AppInfoService")
    // cleanup logic (if needed, e.g. closing files, connections)
    // here service is the object returned by init()
  }
)