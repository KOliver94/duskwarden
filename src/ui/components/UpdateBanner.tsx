import { Button } from '@/ui/primitives/button'

export function UpdateBanner({ onUpdate }: { onUpdate(): void }) {
  return (
    <div className="flex items-center gap-3 bg-primary/15 px-4 py-3">
      <p className="flex-1 text-sm">Új verzió érhető el.</p>
      <Button className="h-11" onClick={onUpdate}>
        Frissítés
      </Button>
    </div>
  )
}
