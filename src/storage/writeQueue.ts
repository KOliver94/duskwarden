export interface WriteQueue<T> {
  push(value: T): void
  flush(): Promise<void>
}

export function createWriteQueue<T>(
  write: (value: T) => Promise<unknown>,
  onResult: (ok: boolean) => void,
): WriteQueue<T> {
  let pending: { value: T } | null = null
  let running: Promise<void> | null = null

  async function drain() {
    while (pending) {
      const { value } = pending
      pending = null
      try {
        await write(value)
        onResult(true)
      } catch {
        onResult(false)
      }
    }
    running = null
  }

  return {
    push(value) {
      pending = { value }
      running ??= drain()
    },
    flush: () => running ?? Promise.resolve(),
  }
}
