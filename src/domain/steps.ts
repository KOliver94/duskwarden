import { wakingOrder } from './roles'
import { isNight, stepId } from './timeline'
import type { GameSetup, RoleDef, Settings, Step } from './types'

const DAY_SLOTS = ['morning', 'discussion', 'execution'] as const

const perPlayer = (role: RoleDef, settings: Settings) =>
  role.action === 'vest' || (role.faction === 'killers' && !settings.killersKnowEachOther)

export function buildSteps(setup: GameSetup, phase: number, alive: ReadonlySet<string>): Step[] {
  const base = (slot: string) => ({ id: stepId(phase, slot), slot, phase })
  if (!isNight(phase)) return DAY_SLOTS.map((slot) => ({ ...base(slot), kind: slot }))

  const steps: Step[] = [{ ...base('dusk'), kind: 'dusk' }]
  if (phase === 0) {
    steps.push({ ...base('tell'), kind: 'tell' })
    const killers = setup.players.filter((p) => setup.roles[p.roleId].faction === 'killers')
    if (setup.settings.killersKnowEachOther && killers.length >= 2) {
      steps.push({
        ...base('killersMeet'),
        kind: 'killersMeet',
        actorIds: killers.map((p) => p.id),
      })
    }
  }

  const roleIds = [...new Set(setup.players.map((p) => p.roleId))]
  for (const roleId of wakingOrder(setup.nightOrder, roleIds, setup.roles)) {
    const holders = setup.players.filter((p) => p.roleId === roleId)
    if (perPlayer(setup.roles[roleId], setup.settings)) {
      for (const p of holders) {
        steps.push({
          ...base(`${roleId}:${p.id}`),
          kind: 'action',
          roleId,
          ownerId: p.id,
          actorIds: alive.has(p.id) ? [p.id] : [],
          plural: false,
        })
      }
    } else {
      steps.push({
        ...base(roleId),
        kind: 'action',
        roleId,
        actorIds: holders.filter((p) => alive.has(p.id)).map((p) => p.id),
        // Counting only living holders would switch the narration to singular and reveal a death.
        plural: holders.length > 1,
      })
    }
  }
  return steps
}
