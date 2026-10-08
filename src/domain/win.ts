import type { GameSetup, RoleDef, Winner } from './types'

const roleOf = (setup: GameSetup, playerId: string): RoleDef =>
  setup.roles[setup.players.find((p) => p.id === playerId)!.roleId]

export function checkWin(
  setup: GameSetup,
  alive: string[],
  executedId: string | null,
): Winner | null {
  if (alive.length === 0) return 'nobody'
  const living = alive.map((id) => roleOf(setup, id))
  const killers = living.filter((r) => r.faction === 'killers').length
  const solo = living.filter((r) => r.neutralGoal === 'soloKiller')
  if (killers === 0 && solo.length === 0) return 'town'
  if (solo.length === 0 && killers >= alive.length - killers) return 'killers'
  if (killers === 0 && alive.length - solo.length <= 1) return { roleId: solo[0].id }
  if (executedId && setup.settings.jesterWinEndsGame) {
    const executed = roleOf(setup, executedId)
    if (executed.neutralGoal === 'executed') return { roleId: executed.id }
  }
  return null
}

export function isMainWinner(setup: GameSetup, playerId: string, winner: Winner): boolean {
  const role = roleOf(setup, playerId)
  if (winner === 'town') return role.faction === 'town'
  if (winner === 'killers') return role.faction === 'killers'
  if (winner === 'nobody') return false
  return role.id === winner.roleId
}
