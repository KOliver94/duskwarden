import { cn } from 'cn'
import { AnimatePresence, motion, useIsPresent } from 'motion/react'
import { Menu } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import {
  closeDayTitle,
  closeNightBody,
  closeNightTitle,
  phaseLabel,
  reopenBody,
  reopenTitle,
  winnerLabel,
} from '@/domain/copy'
import type { DerivedGame } from '@/domain/derive'
import { back, currentStep, next, pendingWin } from '@/domain/navigation'
import { isNight } from '@/domain/timeline'
import type { Cursor, GameSetup } from '@/domain/types'
import { useActions, useGame } from '@/store/hooks'
import { useBackGuard } from '@/ui/hooks/useBackGuard'
import { useConfirm, type ConfirmRequest } from '@/ui/hooks/useConfirm'
import { useWakeLock } from '@/ui/hooks/useWakeLock'
import { playerById } from '@/ui/names'
import { Button } from '@/ui/primitives/button'
import { StepView } from './StepView'
import type { SheetId } from './types'

const slide = {
  enter: (direction: number) => ({ x: direction * 48, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction * -48, opacity: 0 }),
}

// The outgoing card lingers during its exit animation; it must not take taps or show up to assistive tech.
function InertWhenLeaving({ children }: { children: ReactNode }) {
  const present = useIsPresent()
  return (
    <div inert={!present} aria-hidden={!present}>
      {children}
    </div>
  )
}

function closeRequest(
  closing: number,
  derived: DerivedGame,
  setup: GameSetup,
  onConfirm: () => void,
): ConfirmRequest {
  if (isNight(closing)) {
    return {
      title: closeNightTitle(closing),
      body: closeNightBody(closing),
      cancelLabel: 'Még nem',
      confirmLabel: 'Jöhet a reggel',
      onConfirm,
    }
  }
  const executedId = derived.phases[closing].day!.executedId
  return {
    title: closeDayTitle(closing),
    body: executedId
      ? `Kivégezve: ${playerById(setup, executedId).name}`
      : 'Ma senkit sem végeztek ki.',
    cancelLabel: 'Még nem',
    confirmLabel: 'Jöhet az éjszaka',
    onConfirm,
  }
}

export function GameScreen() {
  const { game, derived } = useGame()
  const actions = useActions()
  const confirm = useConfirm()
  const [sheet, setSheet] = useState<SheetId | null>(null)
  const [direction, setDirection] = useState<1 | -1>(1)
  const { setup, cursor } = game
  const phase = derived.phases[cursor.phase]
  const step = currentStep(derived, cursor)
  const win = pendingWin(derived, cursor)

  useWakeLock()

  useEffect(() => {
    document.documentElement.dataset.phase = isNight(cursor.phase) ? 'night' : 'day'
    return () => {
      delete document.documentElement.dataset.phase
    }
  }, [cursor.phase])

  const go = (target: Cursor, dir: 1 | -1) => {
    setDirection(dir)
    actions.moveCursor(target)
  }

  const onNext = () => {
    const result = next(derived, cursor)
    if (!result.ok) return
    const advance = () =>
      result.closesPhase === null
        ? go(result.cursor, 1)
        : confirm.ask(closeRequest(result.closesPhase, derived, setup, () => go(result.cursor, 1)))
    if (result.win && setup.settings.autoEnd) {
      const winner = result.win
      confirm.ask({
        title: winnerLabel(winner, setup.roles),
        body: 'Vége a játéknak?',
        cancelLabel: 'Még nem',
        confirmLabel: 'Játék vége',
        onConfirm: () => actions.endGame(winner, false),
        onCancel: advance,
      })
    } else advance()
  }

  const onBack = () => {
    const result = back(derived, cursor)
    if (!result) return
    if (result.reopensPhase === null) return go(result.cursor, -1)
    confirm.ask({
      title: reopenTitle(result.reopensPhase),
      body: reopenBody(result.reopensPhase),
      cancelLabel: 'Mégse',
      confirmLabel: 'Újranyitás',
      onConfirm: () => go(result.cursor, -1),
    })
  }

  useBackGuard(() => {
    if (confirm.isOpen) confirm.dismiss()
    else if (sheet) setSheet(null)
    else onBack()
  })

  const canGoBack = back(derived, cursor) !== null
  const canGoNext = next(derived, cursor).ok

  return (
    <main className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 flex h-16 items-center gap-3 bg-background/95 px-4 backdrop-blur">
        <div className="flex-1">
          <h1 className="font-display text-xl">{phaseLabel(cursor.phase)}</h1>
          <div className="mt-1 flex gap-1" aria-hidden>
            {phase.steps.map((s) => (
              <span
                key={s.id}
                className={cn(
                  'h-1.5 flex-1 rounded-full bg-muted',
                  s.id === step.id && 'bg-primary',
                )}
              />
            ))}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon-touch"
          aria-label="Menü"
          onClick={() => setSheet('menu')}
        >
          <Menu />
        </Button>
      </header>

      {win && (
        <div className="mx-4 flex items-center gap-3 rounded-xl bg-primary/15 p-3">
          <p className="flex-1 text-sm">
            Teljesült a győzelmi feltétel: <strong>{winnerLabel(win, setup.roles)}</strong>
          </p>
          <Button className="h-11" onClick={() => actions.endGame(win, false)}>
            Befejezés
          </Button>
        </div>
      )}

      <div className="relative flex-1 overflow-x-hidden px-4 py-4">
        <AnimatePresence mode="popLayout" custom={direction} initial={false}>
          <motion.div
            key={step.id}
            custom={direction}
            variants={slide}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <InertWhenLeaving>
              <StepView step={step} game={game} derived={derived} openSheet={setSheet} />
            </InertWhenLeaving>
          </motion.div>
        </AnimatePresence>
      </div>

      <footer className="sticky bottom-0 grid grid-cols-2 gap-3 bg-background/95 p-4 backdrop-blur">
        <Button
          variant="outline"
          size="touch"
          className="text-lg"
          disabled={!canGoBack}
          onClick={onBack}
        >
          Vissza
        </Button>
        <Button size="touch" className="text-lg" disabled={!canGoNext} onClick={onNext}>
          Tovább
        </Button>
      </footer>

      {confirm.dialog}
    </main>
  )
}
