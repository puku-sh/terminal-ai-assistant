export namespace Context {
    export function create<T>(name: string) {
      let current: T | undefined

      return {
        provide: async <R>(value: T, cb: () => Promise<R>) => {
          const prev = current
          current = value
          try {
            return await cb()
          } finally {
            current = prev
          }
        },
        use: (): T => {
          if (!current) throw new Error(`${name} context not available`)
          return current
        }
      }
    }
  }