import { describe, expect, it } from 'vitest'
import { BUILT_IN_ROLES, isHostile, isSuspicious, rolesById, wakingOrder } from './roles'
import type { RoleDef } from './types'

const roles = rolesById([])

describe('roles', () => {
  it('ships the agreed built-in set', () => {
    expect(BUILT_IN_ROLES.map((r) => r.id)).toEqual([
      'killer',
      'serialKiller',
      'doctor',
      'detective',
      'villager',
      'jester',
      'survivor',
    ])
  })

  it('derives suspicion from the kill action unless overridden', () => {
    expect(isSuspicious(roles.killer)).toBe(true)
    expect(isSuspicious(roles.serialKiller)).toBe(true)
    expect(isSuspicious(roles.doctor)).toBe(false)
    expect(isSuspicious({ ...roles.killer, suspiciousOverride: false })).toBe(false)
  })

  it('treats killers and solo killers as hostile', () => {
    expect(isHostile(roles.killer)).toBe(true)
    expect(isHostile(roles.serialKiller)).toBe(true)
    expect(isHostile(roles.jester)).toBe(false)
  })

  it('lets custom roles override built-ins with the same id', () => {
    const custom: RoleDef = { ...roles.doctor, id: 'doctor', name: 'Gyógyító', builtIn: false }
    expect(rolesById([custom]).doctor.name).toBe('Gyógyító')
  })

  it('orders waking roles by the night order and appends unknown ones', () => {
    const custom: RoleDef = { ...roles.villager, id: 'witch', action: 'other' }
    const all = { ...roles, witch: custom }
    expect(
      wakingOrder(['doctor', 'killer'], ['villager', 'witch', 'killer', 'doctor'], all),
    ).toEqual(['doctor', 'killer', 'witch'])
  })
})
