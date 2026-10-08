import { reasonText } from '@/domain/copy'
import type { TargetOption } from '@/domain/derive'
import type { ActionKind, Player } from '@/domain/types'
import { cn } from 'cn'

interface PlayerGridProps {
  players: Player[]
  options: TargetOption[]
  selectedId: string | null | undefined
  action: ActionKind
  onSelect(playerId: string): void
}

export function PlayerGrid({ players, options, selectedId, action, onSelect }: PlayerGridProps) {
  return (
    <div role="group" aria-label="Játékosok" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {players.map((p) => {
        const disabled = options.find((o) => o.playerId === p.id)?.disabled ?? null
        const selected = selectedId === p.id
        return (
          <button
            key={p.id}
            type="button"
            disabled={disabled !== null}
            aria-pressed={selected}
            onClick={() => onSelect(p.id)}
            className={cn(
              'flex min-h-16 flex-col items-start justify-center rounded-xl border-2 border-border bg-secondary px-3 py-2 text-left transition-colors',
              selected && 'border-primary bg-primary/15',
              disabled !== null && 'opacity-40',
            )}
          >
            <span className="text-xs text-muted-foreground">{p.seat}.</span>
            <span className="text-lg font-semibold leading-tight">{p.name}</span>
            {disabled !== null && <span className="text-xs">{reasonText(disabled, action)}</span>}
          </button>
        )
      })}
    </div>
  )
}
