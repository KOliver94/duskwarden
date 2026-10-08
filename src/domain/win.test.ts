import { describe, expect, it } from 'vitest'
import { makeSetup } from './fixtures'
import { checkWin, isMainWinner } from './win'

// p1 killer, p2 serial killer, p3 doctor, p4 detective, p5 villager, p6 jester, p7 survivor
const roles = ['killer', 'serialKiller', 'doctor', 'detective', 'villager', 'jester', 'survivor']
const s = makeSetup(roles)

describe('checkWin', () => {
  it('reports nobody when everyone is dead', () => {
    expect(checkWin(s, [], null)).toBe('nobody')
  })

  it('lets the town win once no hostile is alive', () => {
    expect(checkWin(s, ['p3', 'p4', 'p7'], null)).toBe('town')
  })

  it('lets killers win at parity, but not while a serial killer lives', () => {
    expect(checkWin(s, ['p1', 'p3'], null)).toBe('killers')
    expect(checkWin(s, ['p1', 'p3', 'p4'], null)).toBeNull()
    expect(checkWin(s, ['p1', 'p2'], null)).toBeNull()
  })

  it('lets the serial killer win with at most one other survivor', () => {
    expect(checkWin(s, ['p2', 'p3'], null)).toEqual({ roleId: 'serialKiller' })
    expect(checkWin(s, ['p2', 'p3', 'p4'], null)).toBeNull()
  })

  it('ends with the jester only when the setting says so', () => {
    const alive = ['p1', 'p3', 'p4', 'p5']
    expect(checkWin(s, alive, 'p6')).toBeNull()
    expect(checkWin(makeSetup(roles, { jesterWinEndsGame: true }), alive, 'p6')).toEqual({
      roleId: 'jester',
    })
  })

  it('checks the town before the jester', () => {
    const j = makeSetup(roles, { jesterWinEndsGame: true })
    expect(checkWin(j, ['p3', 'p4'], 'p6')).toBe('town')
  })
})

describe('isMainWinner', () => {
  it('maps winners to players', () => {
    expect(isMainWinner(s, 'p3', 'town')).toBe(true)
    expect(isMainWinner(s, 'p6', 'town')).toBe(false)
    expect(isMainWinner(s, 'p1', 'killers')).toBe(true)
    expect(isMainWinner(s, 'p2', { roleId: 'serialKiller' })).toBe(true)
    expect(isMainWinner(s, 'p3', 'nobody')).toBe(false)
  })
})
