import { describe, expect, it } from 'vitest'
import { deriveGame } from './derive'
import { makeSetup, t } from './fixtures'
import { chronicle, graveyard, individualWinners, narratorLog } from './history'
import type { StepInput } from './types'

// p1 killer, p2 doctor, p3 detective, p4 villager, p5 villager
const s = makeSetup(['killer', 'doctor', 'detective', 'villager', 'villager'])
const at = (phase: number, stepId: string) => ({ phase, stepId })

// p5 dies in night 1; 4 players vote and 3 votes are a majority
const inputs: Record<string, StepInput> = {
  'n1:killer': t('p5'),
  'n1:doctor': t('p4'),
  'n1:detective': t('p1'),
  'd1:voting': { kind: 'votes', nominations: [{ playerId: 'p1', votes: 3 }] },
}

describe('graveyard', () => {
  it('shows night deaths from the morning but hides an execution still being voted on', () => {
    expect(graveyard(deriveGame(s, inputs, 1), at(1, 'd1:voting'))).toEqual([
      { phase: 1, entries: [{ playerId: 'p5', cause: 'night', revealed: false }] },
    ])
  })

  it('lists the execution once the verdict is reached', () => {
    expect(graveyard(deriveGame(s, inputs, 1), at(1, 'd1:verdict'))).toEqual([
      {
        phase: 1,
        entries: [
          { playerId: 'p5', cause: 'night', revealed: false },
          { playerId: 'p1', cause: 'execution', revealed: false },
        ],
      },
    ])
  })

  it('shows a role once it is revealed', () => {
    const revealed = {
      ...inputs,
      'd1:morning': { kind: 'morning', adjustments: [], revealed: ['p5'] },
      'd1:verdict': { kind: 'verdict', revealedId: 'p1' },
    } satisfies Record<string, StepInput>
    expect(graveyard(deriveGame(s, revealed, 1), at(1, 'd1:verdict'))[0].entries).toEqual([
      { playerId: 'p5', cause: 'night', revealed: true },
      { playerId: 'p1', cause: 'execution', revealed: true },
    ])
  })

  it('drops a reveal once the player is no longer among the deaths', () => {
    const revived = {
      ...inputs,
      'd1:morning': {
        kind: 'morning',
        adjustments: [{ playerId: 'p5', dead: false }],
        revealed: ['p5'],
      },
    } satisfies Record<string, StepInput>
    expect(graveyard(deriveGame(s, revived, 1), at(1, 'd1:discussion'))[0].entries).toEqual([])
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

  it('adds nominations while voting and the verdict once reached', () => {
    const voting = narratorLog(s, deriveGame(s, inputs, 1), at(1, 'd1:voting'), false)[1]
    expect(voting.entries).toEqual([{ kind: 'nomination', playerId: 'p1', votes: 3 }])
    const verdict = narratorLog(s, deriveGame(s, inputs, 1), at(1, 'd1:verdict'), false)[1]
    expect(verdict.entries).toEqual([
      { kind: 'nomination', playerId: 'p1', votes: 3 },
      { kind: 'verdict', tally: { outcome: 'executed', playerId: 'p1', votes: 3 } },
    ])
  })
})

describe('chronicle', () => {
  it('summarises saves and executions with their votes', () => {
    const saved: Record<string, StepInput> = { ...inputs, 'n1:killer': t('p4') }
    expect(chronicle(s, deriveGame(s, saved, 1), at(1, 'd1:verdict'))).toEqual([
      {
        phase: 0,
        entries: [{ kind: 'saved', playerId: 'p4', by: 'protect', protectorRoleId: 'doctor' }],
      },
      { phase: 1, entries: [{ kind: 'executed', playerId: 'p1', votes: 3 }] },
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
  // p1 killer, p2 jester, p3 survivor, p4 villager; 4 voters, 3 votes needed
  const n = makeSetup(['killer', 'jester', 'survivor', 'villager'])
  const jesterVoted: Record<string, StepInput> = {
    'd1:voting': { kind: 'votes', nominations: [{ playerId: 'p2', votes: 3 }] },
  }

  it('lists executed jesters and living survivors', () => {
    const d = deriveGame(n, jesterVoted, 1)
    expect(individualWinners(n, d, at(1, 'd1:verdict'), ['p1', 'p3', 'p4'])).toEqual(['p2', 'p3'])
  })

  it('ignores an execution the game never reached', () => {
    const d = deriveGame(n, jesterVoted, 1)
    expect(individualWinners(n, d, at(1, 'd1:voting'), ['p1', 'p2', 'p3', 'p4'])).toEqual(['p3'])
  })
})
