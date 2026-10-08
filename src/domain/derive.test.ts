import { describe, expect, it } from 'vitest'
import { deriveGame } from './derive'
import { makeSetup, t } from './fixtures'
import type { StepInput } from './types'

// p1 killer, p2 doctor, p3 detective, p4 villager, p5 villager
const s = makeSetup(['killer', 'doctor', 'detective', 'villager', 'villager'])
const exec = (targetId: string | null): StepInput => ({ kind: 'execution', targetId })
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

describe('day', () => {
  it('applies morning adjustments to the announcement and the living', () => {
    const d = deriveGame(
      s,
      {
        'n1:killer': t('p4'),
        'd1:morning': {
          kind: 'morning',
          adjustments: [
            { playerId: 'p4', dead: false },
            { playerId: 'p5', dead: true },
          ],
        },
      },
      1,
    )
    expect(d.phases[1].day!.announced).toEqual(['p5'])
    expect(d.phases[1].day!.aliveAfterMorning).toEqual(['p1', 'p2', 'p3', 'p4'])
  })

  it('ignores an adjustment that no longer matches the night', () => {
    const d = deriveGame(
      s,
      { 'd1:morning': { kind: 'morning', adjustments: [{ playerId: 'p5', dead: false }] } },
      1,
    )
    expect(d.invalid.has('d1:morning')).toBe(true)
    expect(d.effective['d1:morning']).toEqual({ kind: 'morning', adjustments: [] })
  })

  it('executes and checks wins at both checkpoints', () => {
    const d = deriveGame(s, { 'd1:execution': exec('p1') }, 1)
    expect(d.phases[1].day!.winAfterMorning).toBeNull()
    expect(d.phases[1].day!.winAfterExecution).toBe('town')
    expect(d.phases[1].aliveAtEnd).toEqual(['p2', 'p3', 'p4', 'p5'])
  })

  it('invalidates a later choice when an earlier edit kills its target', () => {
    const d = deriveGame(s, { 'n1:killer': t('p4'), 'd1:execution': exec('p4') }, 1)
    expect(d.invalid.has('d1:execution')).toBe(true)
    expect(d.effective['d1:execution']).toBeUndefined()
    expect(d.phases[1].day!.executedId).toBeNull()
    expect(option(d, 'd1:execution', 'p4')).toBe('dead')
  })
})
