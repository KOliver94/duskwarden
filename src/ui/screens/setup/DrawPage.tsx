import { Shuffle } from 'lucide-react'
import { cn } from 'cn'
import type { Player, RoleDef } from '@/domain/types'
import { FACTION_TONE } from '@/ui/labels'
import { Button } from '@/ui/primitives/button'

export function DrawPage({
  players,
  roles,
  onRedraw,
}: {
  players: Player[]
  roles: Record<string, RoleDef>
  onRedraw(): void
}) {
  return (
    <div className="flex flex-col gap-6">
      <ul className="flex flex-col gap-2">
        {players.map((p) => (
          <li
            key={p.id}
            data-testid="assignment"
            className="flex min-h-14 items-center rounded-xl bg-card px-4 text-lg"
          >
            {p.seat}. {p.name} –{' '}
            <span className={cn('font-semibold', FACTION_TONE[roles[p.roleId].faction])}>
              {roles[p.roleId].name}
            </span>
          </li>
        ))}
      </ul>
      <Button variant="outline" size="touch" onClick={onRedraw}>
        <Shuffle />
        Újrasorsolás
      </Button>
    </div>
  )
}
