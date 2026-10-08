import { useState } from 'react'
import { dummyLine, promptFor, sleepLine, wakeLine } from '@/domain/copy'
import { isSuspicious } from '@/domain/roles'
import type { ActionStep, RoleDef } from '@/domain/types'
import { useActions } from '@/store/hooks'
import { playerById } from '@/ui/names'
import { Button } from '@/ui/primitives/button'
import { Countdown } from '../Countdown'
import { PlayerGrid } from '../PlayerGrid'
import { Say, StepCard } from '../StepCard'
import type { StepProps } from '../types'
import { StaleChoiceAlert } from './StaleChoiceAlert'

type ChoiceProps = Omit<StepProps, 'openSheet'> & { step: ActionStep; role: RoleDef }

function TargetChoice({ step, game, derived, role }: ChoiceProps) {
  const actions = useActions()
  const chosen = derived.effective[step.id]
  const selected = chosen?.kind === 'target' ? chosen.targetId : undefined
  const target = selected ? playerById(game.setup, selected) : null
  return (
    <>
      <p className="text-xl font-semibold">{promptFor(role, step.plural)}</p>
      <PlayerGrid
        players={game.setup.players}
        options={derived.options[step.id] ?? []}
        selectedId={selected}
        action={role.action}
        onSelect={(targetId) => actions.setInput(step.id, { kind: 'target', targetId })}
      />
      <Button
        size="touch"
        variant={selected === null ? 'default' : 'outline'}
        aria-pressed={selected === null}
        onClick={() => actions.setInput(step.id, { kind: 'target', targetId: null })}
      >
        Senkit
      </Button>
      {role.action === 'investigate' && target && (
        <div className="rounded-xl border-2 border-primary p-4 text-center">
          <p className="text-sm text-muted-foreground">Jelezd neki:</p>
          <p className="font-display text-3xl">
            {isSuspicious(game.setup.roles[target.roleId]) ? 'Gyanús 👍' : 'Nem gyanús 👎'}
          </p>
        </div>
      )}
    </>
  )
}

function VestChoice({ step, derived, role }: ChoiceProps) {
  const actions = useActions()
  const chosen = derived.effective[step.id]
  const left = derived.usesLeft[step.id]
  const use = chosen?.kind === 'vest' ? chosen.use : undefined
  return (
    <>
      <p className="text-xl font-semibold">
        {promptFor(role, false)}
        {typeof left === 'number' && (
          <span className="font-normal text-muted-foreground"> (még {left} maradt)</span>
        )}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <Button
          size="touch"
          variant={use === true ? 'default' : 'outline'}
          aria-pressed={use === true}
          disabled={left === 0}
          onClick={() => actions.setInput(step.id, { kind: 'vest', use: true })}
        >
          Igen
        </Button>
        <Button
          size="touch"
          variant={use === false ? 'default' : 'outline'}
          aria-pressed={use === false}
          onClick={() => actions.setInput(step.id, { kind: 'vest', use: false })}
        >
          Nem
        </Button>
      </div>
    </>
  )
}

export function ActionCard({ step, game, derived }: StepProps & { step: ActionStep }) {
  const [hint, setHint] = useState(false)
  const { setup } = game
  const role = setup.roles[step.roleId]
  const dummy = step.actorIds.length === 0
  const names = step.actorIds.map((id) => playerById(setup, id).name).join(', ')
  const Choice = role.action === 'vest' ? VestChoice : TargetChoice

  return (
    <StepCard title={role.name} aside={<Countdown stepId={step.id} seconds={role.stepSeconds} />}>
      <Say>{dummy ? dummyLine(role, step.plural) : wakeLine(role, step.plural)}</Say>

      {!dummy && (
        <>
          <p className="text-muted-foreground">
            {step.actorIds.length > 1 ? 'Játékosok' : 'Játékos'}:{' '}
            <span className="font-semibold text-foreground">{names}</span>
          </p>
          {derived.invalid.has(step.id) && <StaleChoiceAlert />}
          <Choice step={step} game={game} derived={derived} role={role} />
        </>
      )}

      <Say>{sleepLine(role, step.plural)}</Say>

      {role.gmHint && (
        <div className="flex flex-col items-start gap-2">
          <Button variant="ghost" className="h-11 px-3" onClick={() => setHint(!hint)}>
            Tipp
          </Button>
          {hint && <p className="text-sm leading-relaxed text-muted-foreground">{role.gmHint}</p>}
        </div>
      )}
    </StepCard>
  )
}
