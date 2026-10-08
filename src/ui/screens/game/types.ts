import type { DerivedGame } from '@/domain/derive'
import type { Game, Step } from '@/domain/types'

export type SheetId = 'menu' | 'roster' | 'graveyard' | 'log' | 'end' | 'adjust'

export interface StepProps {
  step: Step
  game: Game
  derived: DerivedGame
  openSheet(id: SheetId): void
}

export interface SheetProps {
  game: Game
  derived: DerivedGame
  open: boolean
  onClose(): void
}
