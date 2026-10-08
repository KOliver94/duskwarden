import { describe, expect, it } from 'vitest'
import { deriveGame } from './derive'
import { makeSetup, t } from './fixtures'
import type { StepInput } from './types'

// p1 killer, p2 doctor, p3 detective, p4 villager, p5 villager
const s = makeSetup(['killer', 'doctor', 'detective', 'villager', 'villager'])
const option = (d: ReturnType<typeof deriveGame>, stepId: string, playerId: string) =>
  d.options[stepId].find((o) => o.playerId === playerId)?.disabled

describe('night resolution', () => {
  it('kills an unprotected target and announces it in the morning', () => {
    const d = deriveGame(s, { 'n1:killer': t('p4'), 'n1:doctor': t('p5') }, 1)
    expect(d.phases[0].night!.deaths).toEqual(['p4'])
    expect(d.phases[1].day!.announced).toEqual(['p4'])
    expect(d.phases[1].aliveAtStart).toEqual(['p1', 'p2', 'p3', 'p5'])
  })

  it('records a protected attack without a death', () => {
    const d = deriveGame(s, { 'n1:killer': t('p4'), 'n1:doctor': t('p4') }, 0)
    expect(d.phases[0].night).toEqual({
      attacks: [
        {
          stepId: 'n1:killer',
          roleId: 'killer',
          actorIds: ['p1'],
          targetId: 'p4',
          result: 'protected',
          protectedBy: ['n1:doctor'],
        },
      ],
      deaths: [],
    })
  })

  it('lets a vest protect its wearer', () => {
    const v = makeSetup(['killer', 'survivor', 'villager'])
    const d = deriveGame(
      v,
      { 'n1:killer': t('p2'), 'n1:survivor:p2': { kind: 'vest', use: true } },
      0,
    )
    expect(d.phases[0].night!.deaths).toEqual([])
  })

  it('resolves simultaneously, so killers can kill each other', () => {
    const k = makeSetup(['killer', 'killer', 'villager', 'villager'], {
      killersKnowEachOther: false,
    })
    const d = deriveGame(k, { 'n1:killer:p1': t('p2'), 'n1:killer:p2': t('p3') }, 0)
    expect(d.phases[0].night!.deaths).toEqual(['p2', 'p3'])
  })

  it('accepts an explicit no-target choice', () => {
    const d = deriveGame(s, { 'n1:killer': t(null) }, 0)
    expect(d.effective['n1:killer']).toEqual(t(null))
    expect(d.phases[0].night!.deaths).toEqual([])
  })
})

describe('target options', () => {
  it('stops killers from choosing themselves', () => {
    expect(option(deriveGame(s, {}, 0), 'n1:killer', 'p1')).toBe('self')
  })

  it('blocks the previous protection target', () => {
    const d = deriveGame(s, { 'n1:doctor': t('p4') }, 2)
    expect(option(d, 'n2:doctor', 'p4')).toBe('repeat')
  })

  it('allows self protection once', () => {
    const d = deriveGame(s, { 'n1:doctor': t('p2'), 'n2:doctor': t('p4') }, 4)
    expect(option(d, 'n3:doctor', 'p2')).toBe('selfLimit')
  })

  it('marks dead players', () => {
    const d = deriveGame(s, { 'n1:killer': t('p4') }, 2)
    expect(option(d, 'n2:doctor', 'p4')).toBe('dead')
  })

  it('runs out of vest uses', () => {
    const v = makeSetup(['killer', 'survivor', 'villager', 'villager'])
    const vest: StepInput = { kind: 'vest', use: true }
    const inputs = Object.fromEntries([1, 2, 3, 4, 5].map((n) => [`n${n}:survivor:p2`, vest]))
    const d = deriveGame(v, inputs, 8)
    expect(d.usesLeft['n4:survivor:p2']).toBe(1)
    expect(d.usesLeft['n5:survivor:p2']).toBe(0)
    expect(d.invalid.has('n5:survivor:p2')).toBe(true)
  })
})

const votes = (...nominations: [string, number][]): StepInput => ({
  kind: 'votes',
  nominations: nominations.map(([playerId, n]) => ({ playerId, votes: n })),
})
const morning = (adjustments: { playerId: string; dead: boolean }[], revealed: string[] = []) =>
  ({ kind: 'morning', adjustments, revealed }) as StepInput

describe('day', () => {
  it('applies morning adjustments to the announcement and the living', () => {
    const d = deriveGame(
      s,
      {
        'n1:killer': t('p4'),
        'd1:morning': morning([
          { playerId: 'p4', dead: false },
          { playerId: 'p5', dead: true },
        ]),
      },
      1,
    )
    expect(d.phases[1].day!.announced).toEqual(['p5'])
    expect(d.phases[1].day!.aliveAfterMorning).toEqual(['p1', 'p2', 'p3', 'p4'])
  })

  it('ignores an adjustment that no longer matches the night', () => {
    const d = deriveGame(s, { 'd1:morning': morning([{ playerId: 'p5', dead: false }]) }, 1)
    expect(d.invalid.has('d1:morning')).toBe(true)
    expect(d.effective['d1:morning']).toEqual(morning([]))
  })

  it('accepts a morning input saved before reveals existed', () => {
    const legacy = { kind: 'morning', adjustments: [] } as unknown as StepInput
    const d = deriveGame(s, { 'n1:killer': t('p4'), 'd1:morning': legacy }, 1)
    expect(d.phases[1].day!.revealed).toEqual([])
    expect(d.invalid.has('d1:morning')).toBe(false)
  })

  it('keeps reveals only for that morning’s deaths', () => {
    const d = deriveGame(s, { 'n1:killer': t('p4'), 'd1:morning': morning([], ['p4', 'p5']) }, 1)
    expect(d.phases[1].day!.revealed).toEqual(['p4'])
    expect(d.effective['d1:morning']).toEqual(morning([], ['p4']))
  })

  it('executes the vote winner and checks wins at both checkpoints', () => {
    const d = deriveGame(s, { 'd1:voting': votes(['p1', 3]) }, 1)
    expect(d.phases[1].day!.tally).toEqual({ outcome: 'executed', playerId: 'p1', votes: 3 })
    expect(d.phases[1].day!.executedId).toBe('p1')
    expect(d.phases[1].day!.winAfterMorning).toBeNull()
    expect(d.phases[1].day!.winAfterExecution).toBe('town')
    expect(d.phases[1].aliveAtEnd).toEqual(['p2', 'p3', 'p4', 'p5'])
  })

  it('executes nobody on a tie', () => {
    const d = deriveGame(s, { 'd1:voting': votes(['p1', 2], ['p2', 2]) }, 1)
    expect(d.phases[1].day!.executedId).toBeNull()
    expect(d.phases[1].aliveAtEnd).toHaveLength(5)
  })

  it('ignores a nomination whose nominee died after an edit', () => {
    const d = deriveGame(s, { 'n1:killer': t('p4'), 'd1:voting': votes(['p4', 4], ['p1', 1]) }, 1)
    expect(d.invalid.has('d1:voting')).toBe(true)
    expect(d.phases[1].day!.nominations).toEqual([{ playerId: 'p1', votes: 1 }])
    expect(d.phases[1].day!.executedId).toBeNull()
    expect(option(d, 'd1:voting', 'p4')).toBe('dead')
  })

  it('rejects more votes than living players', () => {
    const d = deriveGame(s, { 'n1:killer': t('p4'), 'd1:voting': votes(['p1', 5]) }, 1)
    expect(d.invalid.has('d1:voting')).toBe(true)
    expect(d.phases[1].day!.executedId).toBeNull()
  })

  it('ignores a second nomination of the same player', () => {
    const d = deriveGame(s, { 'd1:voting': votes(['p1', 3], ['p1', 1]) }, 1)
    expect(d.invalid.has('d1:voting')).toBe(true)
    expect(d.phases[1].day!.executedId).toBe('p1')
  })

  it('reveals the executed role only after the verdict reveal', () => {
    const hidden = deriveGame(s, { 'd1:voting': votes(['p1', 3]) }, 1)
    expect(hidden.phases[1].day!.revealed).toEqual([])
    const shown = deriveGame(
      s,
      { 'd1:voting': votes(['p1', 3]), 'd1:verdict': { kind: 'verdict', revealedId: 'p1' } },
      1,
    )
    expect(shown.phases[1].day!.revealed).toEqual(['p1'])
  })

  it('does not carry a verdict reveal over to a different executed player', () => {
    const d = deriveGame(
      s,
      { 'd1:voting': votes(['p2', 3]), 'd1:verdict': { kind: 'verdict', revealedId: 'p1' } },
      1,
    )
    expect(d.phases[1].day!.executedId).toBe('p2')
    expect(d.phases[1].day!.revealed).toEqual([])
  })
})
