import { buildSteps } from './steps'
import { isNight, stepId } from './timeline'
import type {
  ActionStep,
  Adjustment,
  DisabledReason,
  GameSetup,
  Nomination,
  Step,
  StepInput,
  Winner,
} from './types'
import { tally, type Tally } from './vote'
import { checkWin } from './win'

export interface TargetOption {
  playerId: string
  disabled: DisabledReason | null
}

export interface Attack {
  stepId: string
  roleId: string
  actorIds: string[]
  targetId: string
  result: 'killed' | 'protected'
  protectedBy: string[]
}

export interface NightResult {
  attacks: Attack[]
  deaths: string[]
}

export interface DayResult {
  nightDeaths: string[]
  adjustments: Adjustment[]
  announced: string[]
  aliveAfterMorning: string[]
  nominations: Nomination[]
  tally: Tally
  executedId: string | null
  revealed: string[]
  winAfterMorning: Winner | null
  winAfterExecution: Winner | null
}

export interface DerivedPhase {
  index: number
  steps: Step[]
  aliveAtStart: string[]
  aliveAtEnd: string[]
  night?: NightResult
  day?: DayResult
}

export interface DerivedGame {
  phases: DerivedPhase[]
  effective: Record<string, StepInput>
  invalid: ReadonlySet<string>
  options: Record<string, TargetOption[]>
  usesLeft: Record<string, number | null>
}

interface SlotContext {
  previousTarget: string | null
  selfIds: ReadonlySet<string>
  selfUses: number
  usesLeft: number | null
}

const targetOf = (input: StepInput) => (input.kind === 'target' ? input.targetId : null)

function slotContext(
  setup: GameSetup,
  step: ActionStep,
  effective: Record<string, StepInput>,
): SlotContext {
  const role = setup.roles[step.roleId]
  // Shared steps change actors as holders die, so "self" means anyone holding the role.
  const selfIds = new Set(
    step.ownerId
      ? [step.ownerId]
      : setup.players.filter((p) => p.roleId === step.roleId).map((p) => p.id),
  )
  const earlier: StepInput[] = []
  for (let phase = step.phase - 2; phase >= 0; phase -= 2) {
    const input = effective[stepId(phase, step.slot)]
    if (input) earlier.push(input)
  }
  const previous = step.phase >= 2 ? effective[stepId(step.phase - 2, step.slot)] : undefined
  const used = earlier.filter((i) => (i.kind === 'vest' ? i.use : targetOf(i) !== null)).length
  const selfUses = earlier.filter((i) => {
    const target = targetOf(i)
    return target !== null && selfIds.has(target)
  }).length
  const max = role.constraints.maxUses
  return {
    previousTarget: previous ? targetOf(previous) : null,
    selfIds,
    selfUses,
    usesLeft: max === undefined ? null : Math.max(0, max - used),
  }
}

function targetOptions(
  setup: GameSetup,
  step: ActionStep,
  alive: ReadonlySet<string>,
  ctx: SlotContext,
): TargetOption[] {
  const { constraints } = setup.roles[step.roleId]
  return setup.players.map(({ id }) => {
    const self = ctx.selfIds.has(id)
    let disabled: DisabledReason | null = null
    if (!alive.has(id)) disabled = 'dead'
    else if (ctx.usesLeft === 0) disabled = 'exhausted'
    else if (self && !constraints.canTargetSelf) disabled = 'self'
    else if (
      self &&
      constraints.selfTargetMax !== undefined &&
      ctx.selfUses >= constraints.selfTargetMax
    )
      disabled = 'selfLimit'
    else if (constraints.noRepeatTarget && ctx.previousTarget === id) disabled = 'repeat'
    return { playerId: id, disabled }
  })
}

function resolveNight(
  setup: GameSetup,
  steps: Step[],
  effective: Record<string, StepInput>,
  seatOrder: string[],
): NightResult {
  const pending: Omit<Attack, 'result' | 'protectedBy'>[] = []
  const protections = new Map<string, string[]>()
  const protect = (targetId: string, by: string) =>
    protections.set(targetId, [...(protections.get(targetId) ?? []), by])

  for (const step of steps) {
    if (step.kind !== 'action') continue
    const input = effective[step.id]
    if (!input) continue
    if (input.kind === 'vest') {
      if (input.use && step.ownerId) protect(step.ownerId, step.id)
      continue
    }
    const targetId = targetOf(input)
    if (targetId === null) continue
    const { action } = setup.roles[step.roleId]
    if (action === 'kill') {
      pending.push({ stepId: step.id, roleId: step.roleId, actorIds: step.actorIds, targetId })
    }
    if (action === 'protect') protect(targetId, step.id)
  }

  const attacks: Attack[] = pending.map((a) => {
    const by = protections.get(a.targetId) ?? []
    return { ...a, result: by.length > 0 ? 'protected' : 'killed', protectedBy: by }
  })
  const killed = new Set(attacks.filter((a) => a.result === 'killed').map((a) => a.targetId))
  return { attacks, deaths: seatOrder.filter((id) => killed.has(id)) }
}

export function deriveGame(
  setup: GameSetup,
  inputs: Record<string, StepInput>,
  throughPhase: number,
): DerivedGame {
  const seatOrder = setup.players.map((p) => p.id)
  const inSeatOrder = (ids: Iterable<string>) => {
    const set = new Set(ids)
    return seatOrder.filter((id) => set.has(id))
  }
  const effective: Record<string, StepInput> = {}
  const invalid = new Set<string>()
  const options: Record<string, TargetOption[]> = {}
  const usesLeft: Record<string, number | null> = {}
  const phases: DerivedPhase[] = []
  let alive = seatOrder

  for (let phase = 0; phase <= throughPhase; phase++) {
    const aliveSet = new Set(alive)
    const steps = buildSteps(setup, phase, aliveSet)

    if (isNight(phase)) {
      for (const step of steps) {
        const input = inputs[step.id]
        if (step.kind === 'tell') {
          if (input?.kind === 'tell') effective[step.id] = input
          continue
        }
        if (step.kind !== 'action' || step.actorIds.length === 0) continue
        const ctx = slotContext(setup, step, effective)
        usesLeft[step.id] = ctx.usesLeft
        if (setup.roles[step.roleId].action === 'vest') {
          if (!input) continue
          if (input.kind === 'vest' && !(input.use && ctx.usesLeft === 0))
            effective[step.id] = input
          else invalid.add(step.id)
          continue
        }
        const opts = targetOptions(setup, step, aliveSet, ctx)
        options[step.id] = opts
        if (!input) continue
        const valid =
          input.kind === 'target' &&
          (input.targetId === null ||
            opts.some((o) => o.playerId === input.targetId && o.disabled === null))
        if (valid) effective[step.id] = input
        else invalid.add(step.id)
      }
      const night = resolveNight(setup, steps, effective, seatOrder)
      const aliveAtEnd = alive.filter((id) => !night.deaths.includes(id))
      phases.push({ index: phase, steps, aliveAtStart: alive, aliveAtEnd, night })
      alive = aliveAtEnd
      continue
    }

    const morningId = stepId(phase, 'morning')
    const morning = inputs[morningId]
    let adjustments: Adjustment[] = []
    let requestedReveals: string[] = []
    if (morning?.kind === 'morning') {
      adjustments = morning.adjustments.filter(
        (a) => seatOrder.includes(a.playerId) && aliveSet.has(a.playerId) === a.dead,
      )
      if (adjustments.length !== morning.adjustments.length) invalid.add(morningId)
      // Records saved before reveals existed have no list.
      requestedReveals = morning.revealed ?? []
    } else if (morning) invalid.add(morningId)

    const killedByGm = new Set(adjustments.filter((a) => a.dead).map((a) => a.playerId))
    const revived = adjustments.filter((a) => !a.dead).map((a) => a.playerId)
    const nightDeaths = phases[phase - 1].night!.deaths
    const aliveAfterMorning = inSeatOrder([
      ...alive.filter((id) => !killedByGm.has(id)),
      ...revived,
    ])
    const announced = inSeatOrder([
      ...nightDeaths.filter((id) => !revived.includes(id)),
      ...killedByGm,
    ])
    const nightReveals = inSeatOrder(requestedReveals.filter((id) => announced.includes(id)))
    if (morning?.kind === 'morning') {
      effective[morningId] = { kind: 'morning', adjustments, revealed: nightReveals }
    }

    const votingId = stepId(phase, 'voting')
    const afterMorning = new Set(aliveAfterMorning)
    options[votingId] = seatOrder.map((id) => ({
      playerId: id,
      disabled: afterMorning.has(id) ? null : 'dead',
    }))
    const voting = inputs[votingId]
    let nominations: Nomination[] = []
    if (voting?.kind === 'votes') {
      const seen = new Set<string>()
      nominations = voting.nominations.filter((n) => {
        const valid =
          afterMorning.has(n.playerId) &&
          !seen.has(n.playerId) &&
          Number.isInteger(n.votes) &&
          n.votes >= 0 &&
          n.votes <= aliveAfterMorning.length
        seen.add(n.playerId)
        return valid
      })
      if (nominations.length !== voting.nominations.length) invalid.add(votingId)
      effective[votingId] = { kind: 'votes', nominations }
    } else if (voting) invalid.add(votingId)

    const result = tally(nominations, aliveAfterMorning.length)
    const executedId = result.outcome === 'executed' ? result.playerId : null
    const verdictId = stepId(phase, 'verdict')
    const verdict = inputs[verdictId]
    if (verdict?.kind === 'verdict') effective[verdictId] = verdict
    else if (verdict) invalid.add(verdictId)
    const executionRevealed =
      executedId !== null && verdict?.kind === 'verdict' && verdict.revealedId === executedId

    const aliveAtEnd = aliveAfterMorning.filter((id) => id !== executedId)
    phases.push({
      index: phase,
      steps,
      aliveAtStart: alive,
      aliveAtEnd,
      day: {
        nightDeaths,
        adjustments,
        announced,
        aliveAfterMorning,
        nominations,
        tally: result,
        executedId,
        revealed: executionRevealed ? [...nightReveals, executedId] : nightReveals,
        winAfterMorning: checkWin(setup, aliveAfterMorning, null),
        winAfterExecution: checkWin(setup, aliveAtEnd, executedId),
      },
    })
    alive = aliveAtEnd
  }

  return { phases, effective, invalid, options, usesLeft }
}
