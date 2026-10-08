import { Sun } from 'lucide-react'
import { morningTitle } from '@/domain/copy'
import { playerById } from '@/ui/names'
import { Button } from '@/ui/primitives/button'
import { Say, StepCard } from '../StepCard'
import type { StepProps } from '../types'

export function MorningCard({ step, game, derived, openSheet }: StepProps) {
  const { setup } = game
  const day = derived.phases[step.phase].day!
  const addedByGm = new Set(day.adjustments.filter((a) => a.dead).map((a) => a.playerId))

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
              return (
                <li key={id} className="rounded-xl bg-blood/15 px-4 py-3 text-lg">
                  ☠ {player.name}
                  {setup.settings.revealRoleOnDeath && <> – {setup.roles[player.roleId].name}</>}
                  {addedByGm.has(id) && (
                    <span className="text-sm text-muted-foreground"> (mesélői módosítás)</span>
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
