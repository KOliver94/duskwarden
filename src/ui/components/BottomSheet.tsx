import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/ui/primitives/button'
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle } from '@/ui/primitives/sheet'

export function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose(): void
  title: string
  children: ReactNode
}) {
  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        aria-describedby={undefined}
        className="mx-auto max-h-[85dvh] w-full max-w-xl gap-0 rounded-t-2xl bg-card"
      >
        <SheetHeader className="flex-row items-center justify-between border-b border-border py-2 pr-2 pl-4">
          <SheetTitle className="font-display text-2xl">{title}</SheetTitle>
          <SheetClose asChild>
            <Button variant="ghost" size="icon-touch" aria-label="Bezárás">
              <X />
            </Button>
          </SheetClose>
        </SheetHeader>
        <div className="overflow-y-auto px-4 pt-4 pb-8">{children}</div>
      </SheetContent>
    </Sheet>
  )
}
