import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/ui/primitives/button'

export function ScreenHeader({
  title,
  onClose,
  closeLabel,
  right,
}: {
  title: string
  onClose(): void
  closeLabel: string
  right?: ReactNode
}) {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-2 bg-background/95 px-2 backdrop-blur">
      <Button variant="ghost" size="icon-touch" aria-label={closeLabel} onClick={onClose}>
        <X />
      </Button>
      <h1 className="flex-1 truncate font-display text-xl">{title}</h1>
      {right && <div className="pr-3 text-sm text-muted-foreground">{right}</div>}
    </header>
  )
}
