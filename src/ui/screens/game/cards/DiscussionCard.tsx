import { cn } from 'cn'
import { formatClock } from '@/ui/format'
import { useStepTimer } from '@/ui/hooks/useStepTimer'
import { useVibrateOnRise } from '@/ui/hooks/useVibrateOnRise'
import { Button } from '@/ui/primitives/button'
import { StepCard } from '../StepCard'
import type { StepProps } from '../types'

export function DiscussionCard({ step, game, openSheet }: StepProps) {
  const { elapsed, running, start, pause, reset } = useStepTimer(step.id)
  const minutes = game.setup.settings.discussionMinutes
  const remaining = minutes === null ? null : Math.max(0, minutes * 60_000 - elapsed)
  const expired = remaining === 0
  useVibrateOnRise(expired && running)

  return (
    <StepCard title="Vita">
      <p
        className={cn(
          'text-center font-mono text-6xl tabular-nums',
          expired && 'animate-pulse text-blood',
        )}
      >
        {remaining === null ? formatClock(elapsed, Math.floor) : formatClock(remaining)}
      </p>
      {expired && (
        <p role="alert" className="text-center text-lg text-blood">
          Lejárt az idő! Jöhet a szavazás.
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Button size="touch" onClick={running ? pause : start}>
          {running ? 'Szünet' : 'Indítás'}
        </Button>
        <Button size="touch" variant="outline" onClick={reset}>
          Újra
        </Button>
      </div>
      <Button size="touch" variant="ghost" onClick={() => openSheet('graveyard')}>
        Temető
      </Button>
    </StepCard>
  )
}
