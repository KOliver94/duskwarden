import type { TimerState } from './types'

export const IDLE_TIMER: TimerState = { startedAt: null, accumulatedMs: 0 }

export const elapsedMs = (t: TimerState, now: number) =>
  t.accumulatedMs + (t.startedAt === null ? 0 : Math.max(0, now - t.startedAt))

export const startTimer = (t: TimerState, now: number): TimerState =>
  t.startedAt !== null ? t : { ...t, startedAt: now }

export const pauseTimer = (t: TimerState, now: number): TimerState =>
  t.startedAt === null ? t : { startedAt: null, accumulatedMs: elapsedMs(t, now) }
