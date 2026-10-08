import type { DerivedGame, DerivedPhase } from './derive'
import { firstStepId } from './timeline'
import type { Cursor, Step, Winner } from './types'

export const stepIndex = (phase: DerivedPhase, stepId: string) =>
  Math.max(
    0,
    phase.steps.findIndex((s) => s.id === stepId),
  )

export function currentStep(derived: DerivedGame, cursor: Cursor): Step {
  const phase = derived.phases[cursor.phase]
  return phase.steps[stepIndex(phase, cursor.stepId)]
}

export const needsInput = (step: Step) =>
  step.kind === 'execution' || (step.kind === 'action' && step.actorIds.length > 0)

export type NextResult =
  { ok: false } | { ok: true; cursor: Cursor; closesPhase: number | null; win: Winner | null }

export function next(derived: DerivedGame, cursor: Cursor): NextResult {
  const phase = derived.phases[cursor.phase]
  const i = stepIndex(phase, cursor.stepId)
  const step = phase.steps[i]
  if (needsInput(step) && !(step.id in derived.effective)) return { ok: false }
  const win =
    step.kind === 'morning'
      ? phase.day!.winAfterMorning
      : step.kind === 'execution'
        ? phase.day!.winAfterExecution
        : null
  if (i < phase.steps.length - 1) {
    const cursorNext = { phase: cursor.phase, stepId: phase.steps[i + 1].id }
    return { ok: true, cursor: cursorNext, closesPhase: null, win }
  }
  const following = cursor.phase + 1
  const cursorNext = { phase: following, stepId: firstStepId(following) }
  return { ok: true, cursor: cursorNext, closesPhase: cursor.phase, win }
}

export function back(
  derived: DerivedGame,
  cursor: Cursor,
): { cursor: Cursor; reopensPhase: number | null } | null {
  const phase = derived.phases[cursor.phase]
  const i = stepIndex(phase, cursor.stepId)
  if (i > 0) {
    return { cursor: { phase: cursor.phase, stepId: phase.steps[i - 1].id }, reopensPhase: null }
  }
  if (cursor.phase === 0) return null
  const previous = derived.phases[cursor.phase - 1]
  return {
    cursor: { phase: previous.index, stepId: previous.steps[previous.steps.length - 1].id },
    reopensPhase: previous.index,
  }
}

export function pendingWin(derived: DerivedGame, cursor: Cursor): Winner | null {
  for (let p = cursor.phase; p >= 0; p--) {
    const phase = derived.phases[p]
    if (!phase.day) continue
    const position = p === cursor.phase ? stepIndex(phase, cursor.stepId) : Infinity
    const execution = phase.steps.findIndex((s) => s.kind === 'execution')
    if (position > execution) return phase.day.winAfterExecution
    if (position > 0) return phase.day.winAfterMorning
  }
  return null
}

export function aliveAt(derived: DerivedGame, cursor: Cursor, ended: boolean): string[] {
  const phase = derived.phases[cursor.phase]
  if (!phase.day) return phase.aliveAtStart
  return ended && currentStep(derived, cursor).kind === 'execution'
    ? phase.aliveAtEnd
    : phase.day.aliveAfterMorning
}
