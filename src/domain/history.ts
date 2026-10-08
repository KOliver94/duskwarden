import type { Attack, DerivedGame } from './derive'
import { stepIndex } from './navigation'
import { isSuspicious } from './roles'
import { stepId } from './timeline'
import type { Cursor, GameSetup } from './types'

export interface GraveEntry {
  playerId: string
  cause: 'night' | 'execution'
}

export interface GraveDay {
  phase: number
  entries: GraveEntry[]
}

export type LogEntry =
  | {
      kind: 'action'
      stepId: string
      roleId: string
      actorIds: string[]
      targetId: string | null
      suspicious: boolean | null
    }
  | { kind: 'vest'; stepId: string; playerId: string; use: boolean }
  | { kind: 'attack'; attack: Attack }
  | { kind: 'adjustment'; playerId: string; dead: boolean }
  | { kind: 'execution'; targetId: string | null }

export interface LogPhase {
  phase: number
  entries: LogEntry[]
}

export type ChronicleEntry =
  | { kind: 'saved'; playerId: string; by: 'protect' | 'vest'; protectorRoleId: string | null }
  | { kind: 'killerKilledKiller'; playerId: string }
  | { kind: 'died'; playerId: string }
  | { kind: 'executed'; playerId: string }
  | { kind: 'noExecution' }

export interface ChroniclePhase {
  phase: number
  entries: ChronicleEntry[]
}

function progress(derived: DerivedGame, cursor: Cursor, ended: boolean) {
  const position = (phase: number, id: string) =>
    phase * 1000 + stepIndex(derived.phases[phase], id)
  const current = position(cursor.phase, cursor.stepId)
  return {
    reached: (phase: number, id: string) => position(phase, id) <= current,
    passed: (phase: number, id: string) =>
      position(phase, id) < current || (ended && position(phase, id) === current),
  }
}

const roleOfPlayer = (setup: GameSetup, id: string) =>
  setup.roles[setup.players.find((p) => p.id === id)!.roleId]

export function graveyard(derived: DerivedGame, cursor: Cursor, ended: boolean): GraveDay[] {
  const { passed } = progress(derived, cursor, ended)
  return derived.phases.flatMap((p) => {
    if (!p.day) return []
    const night = p.day.announced.map((playerId) => ({ playerId, cause: 'night' as const }))
    const executed =
      p.day.executedId !== null && passed(p.index, stepId(p.index, 'execution'))
        ? [{ playerId: p.day.executedId, cause: 'execution' as const }]
        : []
    return [{ phase: p.index, entries: [...night, ...executed] }]
  })
}

export function narratorLog(
  setup: GameSetup,
  derived: DerivedGame,
  cursor: Cursor,
  ended: boolean,
): LogPhase[] {
  const { reached, passed } = progress(derived, cursor, ended)
  return derived.phases.map((p) => {
    const entries: LogEntry[] = []
    if (p.night) {
      for (const step of p.steps) {
        if (step.kind !== 'action' || !reached(p.index, step.id)) continue
        const input = derived.effective[step.id]
        if (input?.kind === 'vest') {
          entries.push({ kind: 'vest', stepId: step.id, playerId: step.ownerId!, use: input.use })
        }
        if (input?.kind === 'target') {
          const investigates = setup.roles[step.roleId].action === 'investigate'
          entries.push({
            kind: 'action',
            stepId: step.id,
            roleId: step.roleId,
            actorIds: step.actorIds,
            targetId: input.targetId,
            suspicious:
              investigates && input.targetId
                ? isSuspicious(roleOfPlayer(setup, input.targetId))
                : null,
          })
        }
      }
      // Attack results can still change until the night is closed.
      if (p.index < cursor.phase || ended) {
        entries.push(...p.night.attacks.map((attack) => ({ kind: 'attack' as const, attack })))
      }
    }
    if (p.day) {
      entries.push(...p.day.adjustments.map((a) => ({ kind: 'adjustment' as const, ...a })))
      if (passed(p.index, stepId(p.index, 'execution'))) {
        entries.push({ kind: 'execution', targetId: p.day.executedId })
      }
    }
    return { phase: p.index, entries }
  })
}

export function chronicle(
  setup: GameSetup,
  derived: DerivedGame,
  cursor: Cursor,
): ChroniclePhase[] {
  const { passed } = progress(derived, cursor, true)
  const stepRole = new Map(
    derived.phases.flatMap((p) =>
      p.steps.flatMap((s) => (s.kind === 'action' ? [[s.id, setup.roles[s.roleId]] as const] : [])),
    ),
  )

  return derived.phases
    .map((p) => {
      const entries: ChronicleEntry[] = []
      // A night the game ended in was never resolved; its attacks did not happen.
      const attacks = p.index < cursor.phase ? (p.night?.attacks ?? []) : []
      for (const attack of attacks) {
        const saved = entries.some((e) => e.kind === 'saved' && e.playerId === attack.targetId)
        if (attack.result === 'protected' && !saved) {
          const protectors = attack.protectedBy.map((id) => stepRole.get(id))
          const vest = protectors.some((r) => r?.action === 'vest')
          entries.push({
            kind: 'saved',
            playerId: attack.targetId,
            by: vest ? 'vest' : 'protect',
            protectorRoleId: vest ? null : (protectors[0]?.id ?? null),
          })
        }
        if (
          attack.result === 'killed' &&
          setup.roles[attack.roleId].faction === 'killers' &&
          roleOfPlayer(setup, attack.targetId).faction === 'killers'
        ) {
          entries.push({ kind: 'killerKilledKiller', playerId: attack.targetId })
        }
      }
      if (p.day) {
        entries.push(...p.day.announced.map((playerId) => ({ kind: 'died' as const, playerId })))
        if (passed(p.index, stepId(p.index, 'execution'))) {
          entries.push(
            p.day.executedId
              ? { kind: 'executed', playerId: p.day.executedId }
              : { kind: 'noExecution' },
          )
        }
      }
      return { phase: p.index, entries }
    })
    .filter((p) => p.entries.length > 0)
}

export function individualWinners(
  setup: GameSetup,
  derived: DerivedGame,
  cursor: Cursor,
  finalAlive: string[],
): string[] {
  const { passed } = progress(derived, cursor, true)
  const executed = new Set(
    derived.phases.flatMap((p) =>
      p.day?.executedId && passed(p.index, stepId(p.index, 'execution')) ? [p.day.executedId] : [],
    ),
  )
  return setup.players
    .filter((p) => {
      const goal = setup.roles[p.roleId].neutralGoal
      return (
        (goal === 'executed' && executed.has(p.id)) ||
        (goal === 'survive' && finalAlive.includes(p.id))
      )
    })
    .map((p) => p.id)
}
