// import { Format } from "../format"
// import { LSP } from "../lsp"
import { App } from "../app/app"
import { Plugin } from "../plugin"
import { Instance } from "../project/instance"
// import { Share } from "../share/share"
import { Snapshot } from "../snapshot"

export async function bootstrap<T>(directory: string, cb: () => Promise<T>) {
  return App.provide({ cwd: directory }, async () => {
    return Instance.provide(directory, async () => {
      await Plugin.init()
      // Share.init()
      // Format.init()
      // LSP.init()
      Snapshot.init()
      const result = await cb()
      await Instance.dispose()
      return result
    })
  })
}
