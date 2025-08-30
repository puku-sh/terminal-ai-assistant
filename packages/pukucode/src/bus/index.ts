import { z, type ZodType } from "zod"
  import { App } from "../app/app"

  export namespace Bus {
    type Subscription = (event: any) => void

    const state = App.state("bus", () => ({
      subscriptions: new Map<string, Subscription[]>()
    }))

    export type EventDefinition = ReturnType<typeof event>

    export function event<Type extends string, Properties extends ZodType>(
      type: Type, 
      properties: Properties
    ) {
      return { type, properties }
    }

    export async function publish<Definition extends EventDefinition>(
      def: Definition,
      properties: z.output<Definition["properties"]>
    ) {
      const payload = { type: def.type, properties }

      const pending = []
      for (const key of [def.type, "*"]) {
        const subscribers = state().subscriptions.get(key) ?? []
        for (const sub of subscribers) {
          pending.push(sub(payload))
        }
      }

      return Promise.all(pending)
    }

    export function subscribe<Definition extends EventDefinition>(
      def: Definition,
      callback: (event: { type: Definition["type"]; properties: z.infer<Definition["properties"]> }) => void
    ) {
      return raw(def.type, callback)
    }

    export function subscribeAll(callback: (event: any) => void) {
      return raw("*", callback)
    }

    function raw(type: string, callback: (event: any) => void) {
      const subscriptions = state().subscriptions
      const match = subscriptions.get(type) ?? []
      match.push(callback)
      subscriptions.set(type, match)

      return () => {
        const subs = subscriptions.get(type)
        if (subs) {
          const index = subs.indexOf(callback)
          if (index !== -1) subs.splice(index, 1)
        }
      }
    }
  }
