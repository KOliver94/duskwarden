import { useCallback } from 'react'
import { IDLE_TIMER, elapsedMs } from '@/domain/timer'
import { useActions, useApp } from '@/store/hooks'
import { useNow } from './useNow'

export function useStepTimer(stepId: string) {
  const timer = useApp((s) => s.game?.timers[stepId]) ?? IDLE_TIMER
  const actions = useActions()
  const running = timer.startedAt !== null
  const now = useNow(running ? 250 : null)
  const start = useCallback(() => actions.timer(stepId, 'start'), [actions, stepId])
  const pause = useCallback(() => actions.timer(stepId, 'pause'), [actions, stepId])
  const reset = useCallback(() => actions.timer(stepId, 'reset'), [actions, stepId])
  return {
    elapsed: elapsedMs(timer, now),
    running,
    idle: !running && timer.accumulatedMs === 0,
    start,
    pause,
    reset,
  }
}
