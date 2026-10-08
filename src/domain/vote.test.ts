import { describe, expect, it } from 'vitest'
import { tally, votesNeeded } from './vote'

describe('votesNeeded', () => {
  it('needs more than half of the living players', () => {
    expect([4, 5, 6, 7].map(votesNeeded)).toEqual([3, 3, 4, 4])
  })
})

describe('tally', () => {
  it('executes nobody without nominations', () => {
    expect(tally([], 7)).toEqual({ outcome: 'none' })
  })

  it('executes the only nominee with a majority', () => {
    expect(tally([{ playerId: 'a', votes: 4 }], 7)).toEqual({
      outcome: 'executed',
      playerId: 'a',
      votes: 4,
    })
  })

  it('picks the nominee with the most votes', () => {
    const result = tally(
      [
        { playerId: 'a', votes: 2 },
        { playerId: 'b', votes: 5 },
      ],
      7,
    )
    expect(result).toEqual({ outcome: 'executed', playerId: 'b', votes: 5 })
  })

  it('saves everyone on a tie at the top', () => {
    const result = tally(
      [
        { playerId: 'a', votes: 4 },
        { playerId: 'b', votes: 4 },
        { playerId: 'c', votes: 1 },
      ],
      8,
    )
    expect(result).toEqual({ outcome: 'tie', playerIds: ['a', 'b'], votes: 4 })
  })

  it('saves the top nominee without a majority, exactly half included', () => {
    expect(tally([{ playerId: 'a', votes: 3 }], 6)).toEqual({
      outcome: 'noMajority',
      playerId: 'a',
      votes: 3,
      needed: 4,
    })
  })
})
