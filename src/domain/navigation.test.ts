import { describe, expect, it } from 'vitest'
import { deriveGame } from './derive'
import { makeSetup, t } from './fixtures'
import { aliveAt, back, next, pendingWin } from './navigation'
import type { StepInput } from './types'

// p1 killer, p2 doctor, p3 villager, p4 villager
const s = makeSetup(['killer', 'doctor', 'villager', 'villager'])
const d = (inputs: Record<string, StepInput>, phase: number) => deriveGame(s, inputs, phase)
const at = (phase: number, stepId: string) => ({ phase, stepId })
const votes = (playerId: string, n: number): StepInput => ({
  kind: 'votes',
  nominations: [{ playerId, votes: n }],
})

describe('next', () => {
  it('requires a choice on a living role step', () => {
    expect(next(d({}, 0), at(0, 'n1:killer'))).toEqual({ ok: false })
  })

  it('advances within a phase', () => {
    expect(next(d({ 'n1:killer': t('p3') }, 0), at(0, 'n1:killer'))).toEqual({
      ok: true,
      cursor: at(0, 'n1:doctor'),
      closesPhase: null,
      win: null,
    })
  })

  it('asks to close the phase on its last step', () => {
    const result = next(d({ 'n1:doctor': t('p3') }, 0), at(0, 'n1:doctor'))
    expect(result).toEqual({ ok: true, cursor: at(1, 'd1:morning'), closesPhase: 0, win: null })
  })

  it('lets a dummy step through without a choice', () => {
    const inputs = { 'n1:killer': t('p2') }
    expect(next(d(inputs, 2), at(2, 'n2:doctor'))).toMatchObject({ ok: true, closesPhase: 2 })
  })

  it('reports the win when leaving the morning', () => {
    const k = makeSetup(['killer', 'villager', 'villager'])
    const derived = deriveGame(k, { 'n1:killer': t('p2') }, 1)
    expect(next(derived, at(1, 'd1:morning'))).toMatchObject({ ok: true, win: 'killers' })
  })

  it('lets the vote proceed without nominations', () => {
    expect(next(d({}, 1), at(1, 'd1:voting'))).toEqual({
      ok: true,
      cursor: at(1, 'd1:verdict'),
      closesPhase: null,
      win: null,
    })
  })

  it('reports the win when leaving the verdict', () => {
    const derived = d({ 'd1:voting': votes('p1', 3) }, 1)
    expect(next(derived, at(1, 'd1:verdict'))).toEqual({
      ok: true,
      cursor: at(2, 'n2:dusk'),
      closesPhase: 1,
      win: 'town',
    })
  })

  it('blocks Next on a night action invalidated by an earlier edit', () => {
    const inputs: Record<string, StepInput> = { 'n1:killer': t('p3'), 'n2:doctor': t('p3') }
    expect(next(d(inputs, 2), at(2, 'n2:doctor'))).toEqual({ ok: false })
  })
})

describe('back', () => {
  it('steps back within a phase', () => {
    expect(back(d({}, 0), at(0, 'n1:doctor'))).toEqual({
      cursor: at(0, 'n1:killer'),
      reopensPhase: null,
    })
  })

  it('reopens the previous phase from the first step', () => {
    expect(back(d({}, 1), at(1, 'd1:morning'))).toEqual({
      cursor: at(0, 'n1:doctor'),
      reopensPhase: 0,
    })
  })

  it('stops at the very first step', () => {
    expect(back(d({}, 0), at(0, 'n1:dusk'))).toBeNull()
  })
})

describe('pendingWin', () => {
  const k = makeSetup(['killer', 'villager', 'villager'])
  const derived = deriveGame(k, { 'n1:killer': t('p2') }, 1)

  it('holds the latest passed checkpoint', () => {
    expect(pendingWin(derived, at(1, 'd1:discussion'))).toBe('killers')
  })

  it('ignores a checkpoint not yet passed', () => {
    expect(pendingWin(derived, at(1, 'd1:morning'))).toBeNull()
  })
})

describe('aliveAt', () => {
  // p3 dies in night 1, so 3 players vote and 2 votes are a majority
  const inputs: Record<string, StepInput> = { 'n1:killer': t('p3'), 'd1:voting': votes('p4', 2) }

  it('keeps night deaths hidden during the night', () => {
    expect(aliveAt(d(inputs, 0), at(0, 'n1:doctor'))).toEqual(['p1', 'p2', 'p3', 'p4'])
  })

  it('uses the morning state while the town votes', () => {
    expect(aliveAt(d(inputs, 1), at(1, 'd1:voting'))).toEqual(['p1', 'p2', 'p4'])
  })

  it('applies the execution from the verdict on', () => {
    expect(aliveAt(d(inputs, 1), at(1, 'd1:verdict'))).toEqual(['p1', 'p2'])
  })
})
