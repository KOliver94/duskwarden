import { cn } from 'cn'
import { winnerLabel } from '@/domain/copy'
import { useActions } from '@/store/hooks'
import { FACTION_TONE } from '@/ui/labels'
import { playerById } from '@/ui/names'
import { Button } from '@/ui/primitives/button'
import { Say, StepCard } from '../StepCard'
import type { StepProps } from '../types'

export function VerdictCard({ step, game, derived }: StepProps) {
  const actions = useActions()
  const { setup } = game
  const day = derived.phases[step.phase].day!
  const result = day.tally
  const name = (id: string) => playerById(setup, id).name

  if (result.outcome === 'executed') {
    const player = playerById(setup, result.playerId)
    const role = setup.roles[player.roleId]
    const revealed = day.revealed.includes(player.id)
    return (
      <StepCard title="Ítélet">
        <Say>{player.name} kivégzésre kerül.</Say>
        <p className="text-muted-foreground">{result.votes} szavazat</p>
        {revealed ? (
          <>
            <p className="text-lg">
              Szerepe:{' '}
              <span className={cn('font-semibold', FACTION_TONE[role.faction])}>{role.name}</span>
            </p>
            {role.neutralGoal === 'executed' && (
              <p className="font-semibold text-primary">
                {winnerLabel({ roleId: role.id }, setup.roles)}
              </p>
            )}
          </>
        ) : (
          <Button
            variant="outline"
            size="touch"
            onClick={() => actions.setInput(step.id, { kind: 'verdict', revealedId: player.id })}
          >
            Szerep felfedése
          </Button>
        )}
      </StepCard>
    )
  }

  return (
    <StepCard title="Ítélet">
      {result.outcome === 'none' && <Say>Nem volt jelölt – ma senkit sem végeznek ki.</Say>}
      {result.outcome === 'tie' && (
        <>
          <Say>Döntetlen – ma senkit sem végeznek ki.</Say>
          <p className="text-muted-foreground">
            {result.playerIds.map(name).join(', ')} – {result.votes} szavazat
          </p>
        </>
      )}
      {result.outcome === 'noMajority' && (
        <>
          <Say>Nincs meg a többség – ma senkit sem végeznek ki.</Say>
          <p className="text-muted-foreground">
            {name(result.playerId)} – {result.votes} szavazat. Legalább {result.needed} szavazat
            kellett volna.
          </p>
        </>
      )}
    </StepCard>
  )
}
