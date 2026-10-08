import type { Nomination } from './types'

export type Tally =
  | { outcome: 'none' }
  | { outcome: 'tie'; playerIds: string[]; votes: number }
  | { outcome: 'noMajority'; playerId: string; votes: number; needed: number }
  | { outcome: 'executed'; playerId: string; votes: number }

export const votesNeeded = (aliveCount: number) => Math.floor(aliveCount / 2) + 1

export function tally(nominations: Nomination[], aliveCount: number): Tally {
  if (nominations.length === 0) return { outcome: 'none' }
  const votes = Math.max(...nominations.map((n) => n.votes))
  const top = nominations.filter((n) => n.votes === votes)
  if (top.length > 1) return { outcome: 'tie', playerIds: top.map((n) => n.playerId), votes }
  const needed = votesNeeded(aliveCount)
  if (votes < needed) return { outcome: 'noMajority', playerId: top[0].playerId, votes, needed }
  return { outcome: 'executed', playerId: top[0].playerId, votes }
}
