import { describe, expect, it } from 'vitest'
import { makeSetup } from './fixtures'
import { buildSteps } from './steps'
import type { GameSetup } from './types'

const everyone = (s: GameSetup) => new Set(s.players.map((p) => p.id))
const ids = (s: GameSetup, phase: number, alive = everyone(s)) =>
  buildSteps(s, phase, alive).map((step) => step.id)

describe('buildSteps', () => {
  it('opens night 1 with dusk, tell and the killers meeting', () => {
    const s = makeSetup(['killer', 'killer', 'doctor', 'villager'])
    expect(ids(s, 0)).toEqual(['n1:dusk', 'n1:tell', 'n1:killersMeet', 'n1:killer', 'n1:doctor'])
  })

  it('skips the meeting with a single killer', () => {
    expect(ids(makeSetup(['killer', 'doctor', 'villager']), 0)).toEqual([
      'n1:dusk',
      'n1:tell',
      'n1:killer',
      'n1:doctor',
    ])
  })

  it('wakes each killer alone when they do not know each other', () => {
    const s = makeSetup(['killer', 'killer', 'doctor'], { killersKnowEachOther: false })
    expect(ids(s, 0)).toEqual(['n1:dusk', 'n1:tell', 'n1:killer:p1', 'n1:killer:p2', 'n1:doctor'])
  })

  it('drops the tell step after night 1', () => {
    expect(ids(makeSetup(['killer', 'doctor', 'villager']), 2)).toEqual([
      'n2:dusk',
      'n2:killer',
      'n2:doctor',
    ])
  })

  it('keeps a dummy step for a dead role', () => {
    const s = makeSetup(['killer', 'doctor', 'villager'])
    const doctor = buildSteps(s, 2, new Set(['p1', 'p3'])).find((x) => x.id === 'n2:doctor')
    expect(doctor).toMatchObject({ kind: 'action', actorIds: [] })
  })

  it('narrates in plural by role count even when only one holder lives', () => {
    const s = makeSetup(['doctor', 'doctor', 'killer'])
    const doctor = buildSteps(s, 2, new Set(['p2', 'p3'])).find((x) => x.id === 'n2:doctor')
    expect(doctor).toMatchObject({ actorIds: ['p2'], plural: true })
  })

  it('gives every vest holder an own step', () => {
    const s = makeSetup(['killer', 'survivor', 'survivor'])
    expect(ids(s, 2)).toEqual(['n2:dusk', 'n2:killer', 'n2:survivor:p2', 'n2:survivor:p3'])
  })

  it('builds the day steps', () => {
    expect(ids(makeSetup(['killer', 'villager']), 1)).toEqual([
      'd1:morning',
      'd1:discussion',
      'd1:execution',
    ])
  })
})
