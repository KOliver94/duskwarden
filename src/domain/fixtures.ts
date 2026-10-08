import { BUILT_IN_ORDER, rolesById } from './roles'
import type { GameSetup, Settings, StepInput } from './types'

export const ROLES = rolesById([])

const SETTINGS: Settings = {
  killersKnowEachOther: true,
  autoEnd: true,
  discussionMinutes: null,
  jesterWinEndsGame: false,
}

export function makeSetup(roleIds: string[], settings: Partial<Settings> = {}): GameSetup {
  return {
    players: roleIds.map((roleId, i) => ({
      id: `p${i + 1}`,
      name: `P${i + 1}`,
      seat: i + 1,
      roleId,
    })),
    roles: ROLES,
    nightOrder: BUILT_IN_ORDER,
    settings: { ...SETTINGS, ...settings },
  }
}

export const t = (targetId: string | null): StepInput => ({ kind: 'target', targetId })
