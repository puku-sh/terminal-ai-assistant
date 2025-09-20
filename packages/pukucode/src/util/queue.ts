export class AsyncQueue<T> {
  private queue: T[] = []
  private waiters: Array<(value: T) => void> = []

  push(item: T): void {
    if (this.waiters.length > 0) {
      const waiter = this.waiters.shift()!
      waiter(item)
    } else {
      this.queue.push(item)
    }
  }

  async next(): Promise<T> {
    if (this.queue.length > 0) {
      return this.queue.shift()!
    }

    return new Promise<T>((resolve) => {
      this.waiters.push(resolve)
    })
  }

  get length(): number {
    return this.queue.length
  }

  clear(): void {
    this.queue = []
    this.waiters = []
  }
}