import { describe, expect, it } from 'vitest'
import { deriveGame } from './derive'
import { makeSetup, t } from './fixtures'
import { chronicle, graveyard, individualWinners, narratorLog } from './history'
import type { StepInput } from './types'

// p1 killer, p2 doctor, p3 detective, p4 villager, p5 villager
const s = makeSetup(['killer', 'doctor', 'detective', 'villager', 'villager'])
const inputs: Record<string, StepInput> = {
  'n1:killer': t('p5'),
  'n1:doctor': t('p4'),
  'n1:detective': t('p1'),
  'd1:execution': { kind: 'execution', targetId: 'p1' },
}
const at = (phase: number, stepId: string) => ({ phase, stepId })

describe('graveyard', () => {
  it('shows night deaths from the morning but hides a pending execution', () => {
    expect(graveyard(deriveGame(s, inputs, 1), at(1, 'd1:discussion'), false)).toEqual([
      { phase: 1, entries: [{ playerId: 'p5', cause: 'night' }] },
    ])
  })

  it('includes the execution once the day is closed', () => {
    expect(graveyard(deriveGame(s, inputs, 2), at(2, 'n2:dusk'), false)).toEqual([
      {
        phase: 1,
        entries: [
          { playerId: 'p5', cause: 'night' },
          { playerId: 'p1', cause: 'execution' },
        ],
      },
    ])
  })

  it('includes the execution the game ended on', () => {
    const days = graveyard(deriveGame(s, inputs, 1), at(1, 'd1:execution'), true)
    expect(days[0].entries).toContainEqual({ playerId: 'p1', cause: 'execution' })
  })
})

describe('narratorLog', () => {
  it('lists choices up to the cursor and hides open night outcomes', () => {
    const [night] = narratorLog(s, deriveGame(s, inputs, 0), at(0, 'n1:doctor'), false)
    expect(night.entries.map((e) => e.kind)).toEqual(['action', 'action'])
  })

  it('adds outcomes and investigation results once the night is closed', () => {
    const [night] = narratorLog(s, deriveGame(s, inputs, 1), at(1, 'd1:morning'), false)
    expect(night.entries).toContainEqual({
      kind: 'action',
      stepId: 'n1:detective',
      roleId: 'detective',
      actorIds: ['p3'],
      targetId: 'p1',
      suspicious: true,
    })
    expect(night.entries.filter((e) => e.kind === 'attack')).toHaveLength(1)
  })
})

describe('chronicle', () => {
  it('summarises saves and executions', () => {
    const saved: Record<string, StepInput> = { ...inputs, 'n1:killer': t('p4') }
    expect(chronicle(s, deriveGame(s, saved, 1), at(1, 'd1:execution'))).toEqual([
      {
        phase: 0,
        entries: [{ kind: 'saved', playerId: 'p4', by: 'protect', protectorRoleId: 'doctor' }],
      },
      { phase: 1, entries: [{ kind: 'executed', playerId: 'p1' }] },
    ])
  })

  it('calls out a killer killing another killer', () => {
    const k = makeSetup(['killer', 'killer', 'villager'], { killersKnowEachOther: false })
    const d = deriveGame(k, { 'n1:killer:p1': t('p2') }, 1)
    expect(chronicle(k, d, at(1, 'd1:morning'))).toEqual([
      { phase: 0, entries: [{ kind: 'killerKilledKiller', playerId: 'p2' }] },
      { phase: 1, entries: [{ kind: 'died', playerId: 'p2' }] },
    ])
  })
})

describe('chronicle of an unfinished night', () => {
  it('leaves out attacks of the night the game ended in', () => {
    const k = makeSetup(['killer', 'killer', 'villager'], { killersKnowEachOther: false })
    const d = deriveGame(k, { 'n1:killer:p1': t('p2') }, 0)
    expect(chronicle(k, d, at(0, 'n1:killer:p2'))).toEqual([])
  })
})

describe('individualWinners', () => {
  it('lists executed jesters and living survivors', () => {
    const n = makeSetup(['killer', 'jester', 'survivor', 'villager'])
    const d = deriveGame(n, { 'd1:execution': { kind: 'execution', targetId: 'p2' } }, 1)
    expect(individualWinners(n, d, at(1, 'd1:execution'), ['p1', 'p3', 'p4'])).toEqual(['p2', 'p3'])
  })

  it('ignores an execution the game never reached', () => {
    const n = makeSetup(['killer', 'jester', 'survivor', 'villager'])
    const d = deriveGame(n, { 'd1:execution': { kind: 'execution', targetId: 'p2' } }, 1)
    expect(individualWinners(n, d, at(1, 'd1:discussion'), ['p1', 'p2', 'p3', 'p4'])).toEqual([
      'p3',
    ])
  })
})
