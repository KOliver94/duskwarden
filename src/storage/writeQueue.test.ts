import { describe, expect, it } from 'vitest'
import { createWriteQueue } from './writeQueue'

describe('createWriteQueue', () => {
  it('coalesces to the latest value while a write is running', async () => {
    const written: number[] = []
    const queue = createWriteQueue(
      async (value: number) => {
        written.push(value)
      },
      () => {},
    )
    queue.push(1)
    queue.push(2)
    queue.push(3)
    await queue.flush()
    expect(written).toEqual([1, 3])
  })

  it('reports failures and keeps writing', async () => {
    const results: boolean[] = []
    const queue = createWriteQueue(
      async (value: number) => {
        if (value === 1) throw new Error('quota')
      },
      (ok) => results.push(ok),
    )
    queue.push(1)
    await queue.flush()
    queue.push(2)
    await queue.flush()
    expect(results).toEqual([false, true])
  })

  it('flushes immediately when idle', async () => {
    await expect(
      createWriteQueue(
        async () => {},
        () => {},
      ).flush(),
    ).resolves.toBeUndefined()
  })
})
