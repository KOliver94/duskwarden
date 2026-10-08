import { useEffect, useRef, useState, type ReactNode } from 'react'

export function HoldButton({
  onConfirm,
  children,
  durationMs = 2000,
}: {
  onConfirm(): void
  children: ReactNode
  durationMs?: number
}) {
  const [progress, setProgress] = useState(0)
  const frame = useRef(0)

  const stop = () => {
    cancelAnimationFrame(frame.current)
    setProgress(0)
  }

  const start = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    const begin = performance.now()
    const tick = (time: number) => {
      const value = Math.min(1, (time - begin) / durationMs)
      setProgress(value)
      if (value < 1) frame.current = requestAnimationFrame(tick)
      else {
        navigator.vibrate?.(50)
        onConfirm()
      }
    }
    frame.current = requestAnimationFrame(tick)
  }

  useEffect(() => () => cancelAnimationFrame(frame.current), [])

  return (
    <button
      type="button"
      onPointerDown={start}
      onPointerUp={stop}
      onPointerCancel={stop}
      onContextMenu={(e) => e.preventDefault()}
      className="relative h-14 w-full touch-none select-none overflow-hidden rounded-xl border-2 border-destructive font-semibold text-destructive"
    >
      <span
        className="absolute inset-y-0 left-0 bg-destructive/30"
        style={{ width: `${progress * 100}%` }}
      />
      <span className="relative">{children}</span>
    </button>
  )
}
