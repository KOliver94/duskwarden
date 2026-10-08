import { Plus, X } from 'lucide-react'
import { useState } from 'react'
import type { Nomination } from '@/domain/types'
import { votesNeeded } from '@/domain/vote'
import { useActions } from '@/store/hooks'
import { Stepper } from '@/ui/components/Stepper'
import { playerById } from '@/ui/names'
import { Button } from '@/ui/primitives/button'
import { PlayerGrid } from '../PlayerGrid'
import { Say, StepCard } from '../StepCard'
import type { StepProps } from '../types'
import { StaleChoiceAlert } from './StaleChoiceAlert'

export function VotingCard({ step, game, derived }: StepProps) {
  const actions = useActions()
  const [picking, setPicking] = useState(false)
  const { setup } = game
  const alive = derived.phases[step.phase].day!.aliveAfterMorning
  const stored = game.inputs[step.id]
  const nominations = stored?.kind === 'votes' ? stored.nominations : []
  const save = (next: Nomination[]) =>
    actions.setInput(step.id, { kind: 'votes', nominations: next })
  const nominated = new Set(nominations.map((n) => n.playerId))
  const candidates = setup.players.filter((p) => alive.includes(p.id) && !nominated.has(p.id))

  return (
    <StepCard title="Szavazás">
      <Say>Kit jelöltök kivégzésre?</Say>
      {derived.invalid.has(step.id) && <StaleChoiceAlert />}
      {nominations.length === 0 && <p className="text-muted-foreground">Még nincs jelölt.</p>}
      <ul className="flex flex-col gap-2">
        {nominations.map((n) => {
          const name = playerById(setup, n.playerId).name
          return (
            <li
              key={n.playerId}
              className="flex items-center gap-2 rounded-xl bg-secondary py-1 pr-1 pl-4"
            >
              <span className="flex-1 truncate text-lg font-semibold">{name}</span>
              <Stepper
                label={`${name} szavazatai`}
                value={n.votes}
                max={alive.length}
                onChange={(votes) =>
                  save(nominations.map((m) => (m.playerId === n.playerId ? { ...m, votes } : m)))
                }
              />
              <Button
                variant="ghost"
                size="icon-touch"
                aria-label={`${name} jelölésének törlése`}
                onClick={() => save(nominations.filter((m) => m.playerId !== n.playerId))}
              >
                <X />
              </Button>
            </li>
          )
        })}
      </ul>
      {picking ? (
        <div className="flex flex-col gap-3">
          <PlayerGrid
            players={candidates}
            options={candidates.map((p) => ({ playerId: p.id, disabled: null }))}
            selectedId={undefined}
            action="none"
            onSelect={(playerId) => {
              save([...nominations, { playerId, votes: 0 }])
              setPicking(false)
            }}
          />
          <Button variant="ghost" size="touch" onClick={() => setPicking(false)}>
            Mégse
          </Button>
        </div>
      ) : (
        candidates.length > 0 && (
          <Button variant="outline" size="touch" onClick={() => setPicking(true)}>
            <Plus />
            Jelölt hozzáadása
          </Button>
        )
      )}
      <p className="text-sm text-muted-foreground">
        Kivégzéshez legalább {votesNeeded(alive.length)} szavazat kell.
      </p>
    </StepCard>
  )
}
