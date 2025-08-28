import { App } from "../app/app"
import { ConfigHooks } from "../config/hooks"
import { Format } from "../format"
import { LSP } from "../lsp"
import { Plugin } from "../plugin"
import { Share } from "../share/share"
import { Snapshot } from "../snapshot"

export async function bootstrap<T>(input: App.Input, cb: (app: App.Info) => Promise<T>) {
  return App.provide(input, async (app) => {
    await Plugin.init()
    Share.init()
    Format.init()
    ConfigHooks.init()
    LSP.init()
    Snapshot.init()

    return cb(app)
  })
}
