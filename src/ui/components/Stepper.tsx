import { Minus, Plus } from 'lucide-react'
import { Button } from '@/ui/primitives/button'

export function Stepper({
  value,
  onChange,
  label,
  min = 0,
  max,
}: {
  value: number
  onChange(value: number): void
  label: string
  min?: number
  max?: number
}) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <Button
        variant="outline"
        size="icon-touch"
        aria-label={`${label} −1`}
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
      >
        <Minus />
      </Button>
      <span className="w-10 text-center text-xl tabular-nums">{value}</span>
      <Button
        variant="outline"
        size="icon-touch"
        aria-label={`${label} +1`}
        disabled={max !== undefined && value >= max}
        onClick={() => onChange(value + 1)}
      >
        <Plus />
      </Button>
    </div>
  )
}
