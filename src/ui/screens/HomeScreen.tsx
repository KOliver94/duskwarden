import { MoonStar } from 'lucide-react'
import { useState } from 'react'
import { phaseLabel, winnerLabel } from '@/domain/copy'
import { deriveGame } from '@/domain/derive'
import { aliveAt } from '@/domain/navigation'
import type { Game } from '@/domain/types'
import { useActions, useApp } from '@/store/hooks'
import { HoldButton } from '@/ui/components/HoldButton'
import { useConfirm } from '@/ui/hooks/useConfirm'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/ui/primitives/alert-dialog'
import { Button } from '@/ui/primitives/button'

function gameStatus(game: Game): string {
  if (game.ending) return `Vége · ${winnerLabel(game.ending.winner, game.setup.roles)}`
  const derived = deriveGame(game.setup, game.inputs, game.cursor.phase)
  return `${phaseLabel(game.cursor.phase)} · ${aliveAt(derived, game.cursor, false).length} élő`
}

export function HomeScreen() {
  const game = useApp((s) => s.game)
  const actions = useActions()
  const confirm = useConfirm()
  const [holding, setHolding] = useState(false)

  const newGame = () => {
    if (!game || game.ending) return actions.goto('setup')
    confirm.ask({
      title: 'Fut egy játék!',
      body: 'Ha újat kezdesz, a mostanit nem tudod majd folytatni.',
      cancelLabel: 'Mégse',
      confirmLabel: 'Tovább',
      onConfirm: () => setHolding(true),
    })
  }

  return (
    <main className="flex flex-1 flex-col justify-between gap-10 px-4 pt-16 pb-10">
      <header className="flex flex-col items-center gap-4 text-center">
        <MoonStar className="size-16 text-primary drop-shadow-[0_0_24px_var(--primary)]" />
        <h1 className="font-display text-5xl text-primary">Duskwarden</h1>
        <p className="text-muted-foreground">Mesélői segéd</p>
      </header>

      <nav className="flex flex-col gap-3">
        {game && (
          <Button className="h-18 flex-col gap-0.5 rounded-xl" onClick={() => actions.goto('game')}>
            <span className="text-lg">Játék folytatása</span>
            <span className="text-sm font-normal opacity-80">{gameStatus(game)}</span>
          </Button>
        )}
        <Button size="touch" variant={game ? 'secondary' : 'default'} onClick={newGame}>
          Új játék
        </Button>
        <Button size="touch" variant="ghost" onClick={() => actions.goto('library')}>
          Szerepek
        </Button>
      </nav>

      {confirm.dialog}

      <AlertDialog open={holding} onOpenChange={setHolding}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-2xl">
              Biztosan új játékot kezdesz?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Tartsd lenyomva a megerősítéshez
            </AlertDialogDescription>
          </AlertDialogHeader>
          <HoldButton
            onConfirm={() => {
              setHolding(false)
              actions.goto('setup')
            }}
          >
            Új játék kezdése
          </HoldButton>
          <AlertDialogFooter>
            <AlertDialogCancel size="touch">Mégse</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  )
}
