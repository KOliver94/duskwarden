import type { Step } from '@/domain/types'
import { playerById } from '@/ui/names'
import { Say, StepCard } from '../StepCard'
import type { StepProps } from '../types'

export function KillersMeetCard({
  step,
  game,
}: StepProps & { step: Extract<Step, { kind: 'killersMeet' }> }) {
  return (
    <StepCard title="Gyilkosok">
      <Say>Felébrednek a gyilkosok, és megismerik egymást.</Say>
      <p className="text-lg font-semibold text-blood">
        {step.actorIds.map((id) => playerById(game.setup, id).name).join(', ')}
      </p>
      <Say>A gyilkosok elalszanak.</Say>
    </StepCard>
  )
}
