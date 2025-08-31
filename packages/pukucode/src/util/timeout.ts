// Utility functions for timeout handling
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage = "Operation timed out"
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
  })

  return Promise.race([promise, timeoutPromise])
}

export function createTimeout(ms: number): { promise: Promise<void>; cancel: () => void } {
  let timeoutId: Timer
  let cancel: () => void

  const promise = new Promise<void>((resolve) => {
    timeoutId = setTimeout(resolve, ms)
    cancel = () => {
      clearTimeout(timeoutId)
      resolve()
    }
  })

  return { promise, cancel: cancel! }
}