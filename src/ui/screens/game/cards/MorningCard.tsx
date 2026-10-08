import { Sun } from 'lucide-react'
import { cn } from 'cn'
import { morningTitle } from '@/domain/copy'
import { useActions } from '@/store/hooks'
import { FACTION_TONE } from '@/ui/labels'
import { playerById } from '@/ui/names'
import { Button } from '@/ui/primitives/button'
import { Say, StepCard } from '../StepCard'
import type { StepProps } from '../types'

export function MorningCard({ step, game, derived, openSheet }: StepProps) {
  const actions = useActions()
  const { setup } = game
  const day = derived.phases[step.phase].day!
  const addedByGm = new Set(day.adjustments.filter((a) => a.dead).map((a) => a.playerId))

  const setRevealed = (id: string, shown: boolean) => {
    const others = day.revealed.filter((r) => r !== id && day.announced.includes(r))
    actions.setInput(step.id, {
      kind: 'morning',
      adjustments: day.adjustments,
      revealed: shown ? [...others, id] : others,
    })
  }

  return (
    <StepCard title="Reggel" aside={<Sun className="size-8 text-primary" />}>
      <Say>{morningTitle(step.phase)}. Mindenki kinyithatja a szemét!</Say>
      {day.announced.length === 0 ? (
        <p className="text-lg">Az éjszaka senki sem halt meg.</p>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-lg">Az éjszaka meghalt:</p>
          <ul className="flex flex-col gap-2">
            {day.announced.map((id) => {
              const player = playerById(setup, id)
              const role = setup.roles[player.roleId]
              return (
                <li
                  key={id}
                  className="flex min-h-16 items-center gap-3 rounded-xl bg-blood/15 py-1 pr-1 pl-4 text-lg"
                >
                  <span className="flex-1">
                    ☠ {player.name}
                    {day.revealed.includes(id) && (
                      <>
                        {' – '}
                        <span className={cn('font-semibold', FACTION_TONE[role.faction])}>
                          {role.name}
                        </span>
                      </>
                    )}
                    {addedByGm.has(id) && (
                      <span className="text-sm text-muted-foreground"> (mesélői módosítás)</span>
                    )}
                  </span>
                  {day.revealed.includes(id) ? (
                    <Button
                      variant="ghost"
                      className="h-14 shrink-0"
                      onClick={() => setRevealed(id, false)}
                    >
                      Elrejtés
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="h-14 shrink-0"
                      onClick={() => setRevealed(id, true)}
                    >
                      Szerep felfedése
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}
      <Button variant="outline" size="touch" onClick={() => openSheet('adjust')}>
        Módosítás
      </Button>
    </StepCard>
  )
}
