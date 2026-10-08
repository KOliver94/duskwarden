import { describe, expect, it } from 'vitest'
import { assignRoles, shuffle } from './assign'

const constant = (value: number) => () => value

describe('shuffle', () => {
  it('is a Fisher–Yates permutation driven by the injected random', () => {
    expect(shuffle([1, 2, 3, 4], constant(0))).toEqual([2, 3, 4, 1])
    expect(shuffle([1, 2, 3, 4], constant(0.999))).toEqual([1, 2, 3, 4])
  })
})

describe('assignRoles', () => {
  const people = [
    { id: 'a', name: ' Anna ' },
    { id: 'b', name: 'Bence' },
    { id: 'c', name: 'Csilla' },
  ]

  it('gives every seat exactly one role from the pool', () => {
    const players = assignRoles(people, { killer: 1, villager: 2 }, Math.random)
    expect(players.map((p) => p.seat)).toEqual([1, 2, 3])
    expect(players.map((p) => p.name)).toEqual(['Anna', 'Bence', 'Csilla'])
    expect(players.map((p) => p.roleId).sort()).toEqual(['killer', 'villager', 'villager'])
  })

  it('rejects a pool that does not match the player count', () => {
    expect(() => assignRoles(people, { killer: 1 }, Math.random)).toThrow()
  })
})
