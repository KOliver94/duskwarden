import { Check } from 'lucide-react'
import { cn } from 'cn'
import { useActions } from '@/store/hooks'
import { FACTION_TONE } from '@/ui/labels'
import { StepCard } from '../StepCard'
import type { StepProps } from '../types'

export function TellCard({ step, game }: StepProps) {
  const actions = useActions()
  const { players, roles } = game.setup
  const input = game.inputs[step.id]
  const told = new Set(input?.kind === 'tell' ? input.told : [])

  const toggle = (id: string) => {
    if (told.has(id)) told.delete(id)
    else told.add(id)
    actions.setInput(step.id, {
      kind: 'tell',
      told: players.filter((p) => told.has(p.id)).map((p) => p.id),
    })
  }

  return (
    <StepCard title="Szerepek kiosztása">
      <p>Súgd meg mindenkinek a szerepét:</p>
      <ul className="flex flex-col gap-2">
        {players.map((p) => {
          const done = told.has(p.id)
          const role = roles[p.roleId]
          return (
            <li key={p.id}>
              <button
                type="button"
                aria-pressed={done}
                onClick={() => toggle(p.id)}
                className={cn(
                  'flex min-h-14 w-full items-center gap-3 rounded-xl bg-secondary px-4 text-left transition-opacity',
                  done && 'opacity-60',
                )}
              >
                <span
                  className={cn(
                    'flex size-7 shrink-0 items-center justify-center rounded-full border-2',
                    done ? 'border-primary bg-primary text-primary-foreground' : 'border-border',
                  )}
                >
                  {done && <Check className="size-4" />}
                </span>
                <span className="text-lg">
                  {p.seat}. {p.name} –{' '}
                  <span className={cn('font-semibold', FACTION_TONE[role.faction])}>
                    {role.name}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </StepCard>
  )
}
