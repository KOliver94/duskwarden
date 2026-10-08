import { useActions } from '@/store/hooks'
import { Button } from '@/ui/primitives/button'
import type { StepProps } from './types'

export function StepView({ step, game, derived }: StepProps) {
  const actions = useActions()
  const choosable =
    (step.kind === 'action' && step.actorIds.length > 0) || step.kind === 'execution'
  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-card p-5">
      <h2 className="font-display text-2xl">{step.id}</h2>
      {choosable &&
        derived.options[step.id]
          ?.filter((o) => o.disabled === null)
          .map((o) => (
            <Button
              key={o.playerId}
              variant="secondary"
              onClick={() =>
                actions.setInput(
                  step.id,
                  step.kind === 'execution'
                    ? { kind: 'execution', targetId: o.playerId }
                    : { kind: 'target', targetId: o.playerId },
                )
              }
            >
              {game.setup.players.find((p) => p.id === o.playerId)?.name}
            </Button>
          ))}
    </section>
  )
}
