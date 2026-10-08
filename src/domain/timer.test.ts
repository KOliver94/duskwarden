import { describe, expect, it } from 'vitest'
import { IDLE_TIMER, elapsedMs, pauseTimer, startTimer } from './timer'

describe('timer', () => {
  it('accumulates across pauses', () => {
    const running = startTimer(IDLE_TIMER, 1000)
    expect(elapsedMs(running, 4000)).toBe(3000)
    const paused = pauseTimer(running, 4000)
    expect(elapsedMs(paused, 9000)).toBe(3000)
    expect(elapsedMs(startTimer(paused, 10_000), 11_000)).toBe(4000)
  })

  it('ignores a second start', () => {
    const running = startTimer(IDLE_TIMER, 1000)
    expect(startTimer(running, 5000)).toBe(running)
  })

  it('never runs backwards when the clock jumps back', () => {
    expect(elapsedMs(startTimer(IDLE_TIMER, 5000), 1000)).toBe(0)
  })
})
