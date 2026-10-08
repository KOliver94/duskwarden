import type { GameSetup, Player } from '@/domain/types'

export const playerById = (setup: GameSetup, id: string): Player =>
  setup.players.find((p) => p.id === id)!

export const displayName = (setup: GameSetup, id: string, masked: boolean) => {
  const player = playerById(setup, id)
  return masked ? `#${player.seat}` : player.name
}
