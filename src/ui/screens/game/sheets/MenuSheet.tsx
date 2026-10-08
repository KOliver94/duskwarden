import { BottomSheet } from '@/ui/components/BottomSheet'
import { Button } from '@/ui/primitives/button'
import type { SheetId } from '../types'

const ITEMS: [Exclude<SheetId, 'menu' | 'adjust'>, string][] = [
  ['roster', 'Szereposztás'],
  ['graveyard', 'Temető'],
  ['log', 'Mesélői napló'],
  ['end', 'Játék befejezése'],
]

export function MenuSheet({
  open,
  onClose,
  onNavigate,
  onHome,
}: {
  open: boolean
  onClose(): void
  onNavigate(id: SheetId): void
  onHome(): void
}) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Menü">
      <nav className="flex flex-col gap-2">
        {ITEMS.map(([id, label]) => (
          <Button
            key={id}
            variant="secondary"
            size="touch"
            className="justify-start"
            onClick={() => onNavigate(id)}
          >
            {label}
          </Button>
        ))}
        <Button variant="ghost" size="touch" className="justify-start" onClick={onHome}>
          Kezdőlap
        </Button>
      </nav>
    </BottomSheet>
  )
}
