import { useEffect } from 'react'
import { formatClock } from '@/ui/format'
import { cn } from 'cn'
import { useStepTimer } from '@/ui/hooks/useStepTimer'
import { useVibrateOnRise } from '@/ui/hooks/useVibrateOnRise'

export function Countdown({ stepId, seconds }: { stepId: string; seconds: number }) {
  const { elapsed, idle, running, start, reset } = useStepTimer(stepId)
  const remaining = Math.max(0, seconds * 1000 - elapsed)
  const expired = running && remaining === 0

  useEffect(() => {
    if (idle && seconds > 0) start()
  }, [idle, seconds, start])
  useVibrateOnRise(expired)

  if (seconds <= 0) return null
  return (
    <button
      type="button"
      aria-label="Időzítő újraindítása"
      onClick={() => {
        reset()
        start()
      }}
      className={cn(
        'h-11 shrink-0 rounded-full px-4 font-mono text-lg tabular-nums',
        expired ? 'animate-pulse bg-blood/20 text-blood' : 'bg-muted',
      )}
    >
      {expired ? 'Lejárt' : formatClock(remaining)}
    </button>
  )
}
