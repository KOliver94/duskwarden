import { winnerLabel } from '@/domain/copy'
import { useActions } from '@/store/hooks'
import { playerById } from '@/ui/names'
import { Button } from '@/ui/primitives/button'
import { PlayerGrid } from '../PlayerGrid'
import { StepCard } from '../StepCard'
import type { StepProps } from '../types'
import { StaleChoiceAlert } from './StaleChoiceAlert'

export function ExecutionCard({ step, game, derived }: StepProps) {
  const actions = useActions()
  const { setup } = game
  const chosen = derived.effective[step.id]
  const selected = chosen?.kind === 'execution' ? chosen.targetId : undefined
  const executed = selected ? playerById(setup, selected) : null
  const executedRole = executed ? setup.roles[executed.roleId] : null

  return (
    <StepCard title="Kivégzés">
      {derived.invalid.has(step.id) && <StaleChoiceAlert />}
      <p className="text-xl font-semibold">Kit végez ki a város?</p>
      <PlayerGrid
        players={setup.players}
        options={derived.options[step.id] ?? []}
        selectedId={selected}
        action="none"
        onSelect={(targetId) => actions.setInput(step.id, { kind: 'execution', targetId })}
      />
      <Button
        size="touch"
        variant={selected === null ? 'default' : 'outline'}
        aria-pressed={selected === null}
        onClick={() => actions.setInput(step.id, { kind: 'execution', targetId: null })}
      >
        Senkit
      </Button>
      {selected === null && <p className="text-lg">Ma senkit sem végeztek ki.</p>}
      {executed && executedRole && (
        <div className="flex flex-col gap-1 rounded-xl bg-blood/15 p-4 text-lg">
          <p>Kivégezve: {executed.name}</p>
          {setup.settings.revealRoleOnDeath && <p>Szerepe: {executedRole.name}</p>}
          {executedRole.neutralGoal === 'executed' && (
            <p className="font-semibold text-primary">
              {winnerLabel({ roleId: executedRole.id }, setup.roles)}
            </p>
          )}
        </div>
      )}
    </StepCard>
  )
}
