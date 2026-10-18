import { Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { winnerLabel } from '@/domain/copy'
import { deriveGame } from '@/domain/derive'
import type { Game } from '@/domain/types'
import { useActions, useApp } from '@/store/hooks'
import { HoldButton } from '@/ui/components/HoldButton'
import { ScreenHeader } from '@/ui/components/ScreenHeader'
import { useBackGuard } from '@/ui/hooks/useBackGuard'
import { useConfirm, type ConfirmRequest } from '@/ui/hooks/useConfirm'
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
import { GameReport } from '../end/GameReport'

const startedAt = (game: Game) =>
  new Date(game.createdAt).toLocaleString('hu-HU', { dateStyle: 'medium', timeStyle: 'short' })

const deleteRequest = (onConfirm: () => void): ConfirmRequest => ({
  title: 'Törlöd ezt a játékot?',
  body: 'Nem lehet visszaállítani.',
  cancelLabel: 'Mégse',
  confirmLabel: 'Törlés',
  destructive: true,
  onConfirm,
})

function ArchiveList({ games }: { games: Game[] | null }) {
  const actions = useActions()
  const confirm = useConfirm()
  const [clearing, setClearing] = useState(false)

  useBackGuard(() => {
    if (confirm.isOpen) confirm.dismiss()
    else if (clearing) setClearing(false)
    else actions.goto('home')
  })

  return (
    <main className="flex flex-1 flex-col">
      <ScreenHeader
        title="Korábbi játékok"
        closeLabel="Vissza"
        onClose={() => actions.goto('home')}
      />
      {games && (
        <div className="flex flex-col gap-8 px-4 py-4">
          {games.length === 0 ? (
            <p className="text-muted-foreground">Még nincs korábbi játék.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {games.map((game) => (
                <li key={game.id} className="flex items-center rounded-xl bg-card">
                  <button
                    type="button"
                    onClick={() => actions.viewGame(game.id)}
                    className="flex min-h-16 flex-1 flex-col justify-center gap-0.5 py-2 pl-4 text-left"
                  >
                    <span className="font-medium">
                      {game.ending
                        ? winnerLabel(game.ending.winner, game.setup.roles)
                        : 'Félbehagyva'}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {startedAt(game)} · {game.setup.players.length} játékos
                    </span>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon-touch"
                    aria-label="Törlés"
                    className="mr-1 text-muted-foreground"
                    onClick={() => confirm.ask(deleteRequest(() => actions.deleteGame(game.id)))}
                  >
                    <Trash2 />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          {games.length > 0 && (
            <Button
              size="touch"
              variant="ghost"
              className="text-blood"
              onClick={() => setClearing(true)}
            >
              Összes törlése
            </Button>
          )}
        </div>
      )}

      {confirm.dialog}
      <AlertDialog open={clearing} onOpenChange={setClearing}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-2xl">
              Biztosan törlöd az összes korábbi játékot?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Tartsd lenyomva a megerősítéshez
            </AlertDialogDescription>
          </AlertDialogHeader>
          <HoldButton
            onConfirm={() => {
              setClearing(false)
              actions.deleteArchive()
            }}
          >
            Összes törlése
          </HoldButton>
          <AlertDialogFooter>
            <AlertDialogCancel size="touch">Mégse</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  )
}

function PastGame({ game }: { game: Game }) {
  const actions = useActions()
  const confirm = useConfirm()
  const derived = useMemo(() => deriveGame(game.setup, game.inputs, game.cursor.phase), [game])
  const close = () => actions.viewGame(null)

  // The list may have been scrolled far down; the report reads from the top.
  useEffect(() => {
    // Chromium's scrollTo returns a promise, which React would call as the cleanup.
    window.scrollTo(0, 0)
  }, [])

  return (
    <GameReport
      game={game}
      derived={derived}
      onBack={() => (confirm.isOpen ? confirm.dismiss() : close())}
    >
      <div className="grid grid-cols-2 gap-3">
        <Button size="touch" variant="secondary" onClick={close}>
          Vissza
        </Button>
        <Button
          size="touch"
          variant="ghost"
          className="text-blood"
          onClick={() => confirm.ask(deleteRequest(() => actions.deleteGame(game.id)))}
        >
          Törlés
        </Button>
      </div>
      {confirm.dialog}
    </GameReport>
  )
}

export function ArchiveScreen() {
  const archive = useApp((s) => s.archive)
  const viewingId = useApp((s) => s.viewingId)
  const viewing = archive?.find((g) => g.id === viewingId)
  return viewing ? <PastGame key={viewing.id} game={viewing} /> : <ArchiveList games={archive} />
}
