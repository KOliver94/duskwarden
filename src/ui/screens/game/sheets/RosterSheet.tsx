import { useState } from 'react'
import { cn } from 'cn'
import { aliveAt } from '@/domain/navigation'
import { SwitchRow } from '@/ui/components/fields'
import { BottomSheet } from '@/ui/components/BottomSheet'
import { FACTION_TONE } from '@/ui/labels'
import { displayName } from '@/ui/names'
import type { SheetProps } from '../types'

function RosterBody({ game, derived }: Pick<SheetProps, 'game' | 'derived'>) {
  const [show, setShow] = useState(false)
  const { setup } = game
  const alive = new Set(aliveAt(derived, game.cursor, false))
  return (
    <div className="flex flex-col gap-4">
      <SwitchRow label="Nevek mutatása" checked={show} onChange={setShow} />
      <ul className="flex flex-col gap-2">
        {setup.players.map((p) => {
          const role = setup.roles[p.roleId]
          const living = alive.has(p.id)
          return (
            <li
              key={p.id}
              className={cn(
                'flex min-h-14 items-center gap-3 rounded-xl bg-secondary px-4',
                !living && 'opacity-50',
              )}
            >
              <span className="w-24 truncate font-semibold">{displayName(setup, p.id, !show)}</span>
              <span className={cn('flex-1', FACTION_TONE[role.faction])}>{role.name}</span>
              <span className="text-sm text-muted-foreground">{living ? 'él' : 'halott'}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function RosterSheet({ open, onClose, ...props }: SheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Szereposztás">
      <RosterBody {...props} />
    </BottomSheet>
  )
}
