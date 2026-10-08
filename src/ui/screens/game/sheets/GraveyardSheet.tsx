import { phaseLabel } from '@/domain/copy'
import { graveyard } from '@/domain/history'
import { BottomSheet } from '@/ui/components/BottomSheet'
import { playerById } from '@/ui/names'
import type { SheetProps } from '../types'

export function GraveyardSheet({ game, derived, open, onClose }: SheetProps) {
  const { setup } = game
  const days = graveyard(derived, game.cursor, false)
  const empty = days.every((d) => d.entries.length === 0)

  return (
    <BottomSheet open={open} onClose={onClose} title="Temető">
      {empty ? (
        <p className="text-muted-foreground">Még senki sem halt meg.</p>
      ) : (
        <div className="flex flex-col gap-5">
          {days.map((day) => (
            <section key={day.phase} className="flex flex-col gap-2">
              <h3 className="font-display text-lg text-primary">{phaseLabel(day.phase)}</h3>
              {day.entries.length === 0 && (
                <p className="text-muted-foreground">Senki sem halt meg.</p>
              )}
              {day.entries.map((entry) => {
                const player = playerById(setup, entry.playerId)
                return (
                  <p key={entry.playerId + entry.cause} className="text-lg">
                    {player.name} – {entry.cause === 'night' ? 'éjjel halt meg' : 'kivégezték'}
                    {setup.settings.revealRoleOnDeath && (
                      <span className="text-muted-foreground">
                        {' '}
                        ({setup.roles[player.roleId].name})
                      </span>
                    )}
                  </p>
                )
              })}
            </section>
          ))}
        </div>
      )}
    </BottomSheet>
  )
}
