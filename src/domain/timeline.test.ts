import { describe, expect, it } from 'vitest'
import { firstStepId, isNight, phaseNumber, stepId } from './timeline'

describe('timeline', () => {
  it('alternates nights and days starting with night 1', () => {
    expect([0, 1, 2, 3].map(isNight)).toEqual([true, false, true, false])
    expect([0, 1, 2, 3].map(phaseNumber)).toEqual([1, 1, 2, 2])
  })

  it('builds step ids from phase and slot', () => {
    expect(stepId(0, 'doctor')).toBe('n1:doctor')
    expect(stepId(3, 'execution')).toBe('d2:execution')
    expect(firstStepId(2)).toBe('n2:dusk')
    expect(firstStepId(1)).toBe('d1:morning')
  })
})
