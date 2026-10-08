import confetti from 'canvas-confetti'
import { Trophy } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cn } from 'cn'
import { lowerFirst, phaseLabel, winnerLabel } from '@/domain/copy'
import { chronicle, individualWinners, type ChronicleEntry } from '@/domain/history'
import { aliveAt } from '@/domain/navigation'
import type { GameSetup } from '@/domain/types'
import { isMainWinner } from '@/domain/win'
import { exportPng } from '@/lib/exportImage'
import { useActions, useGame } from '@/store/hooks'
import { useBackGuard } from '@/ui/hooks/useBackGuard'
import { FACTION_TONE } from '@/ui/labels'
import { playerById } from '@/ui/names'
import { Button } from '@/ui/primitives/button'

function describe(entry: ChronicleEntry, setup: GameSetup): string {
  if (entry.kind === 'noExecution') return 'Senkit sem végeztek ki.'
  const name = playerById(setup, entry.playerId).name
  switch (entry.kind) {
    case 'saved':
      return entry.by === 'vest'
        ? `${name} túlélte a támadást – golyóálló mellény`
        : `${name} túlélte a támadást – védte: ${lowerFirst(setup.roles[entry.protectorRoleId ?? '']?.name ?? 'valaki')}`
    case 'killerKilledKiller':
      return `${name} – egy másik gyilkos ölte meg`
    case 'died':
      return `${name} – éjjel halt meg`
    case 'executed':
      return `${name} – kivégezték`
  }
}

export function EndScreen() {
  const { game, derived } = useGame()
  const actions = useActions()
  const card = useRef<HTMLDivElement>(null)
  const [exporting, setExporting] = useState(false)
  const [exportFailed, setExportFailed] = useState(false)
  const { setup } = game
  const ending = game.ending!
  const finalAlive = new Set(aliveAt(derived, game.cursor, true))
  const soloWinners = individualWinners(setup, derived, [...finalAlive])
  const timeline = chronicle(setup, derived, game.cursor)
  const day = new Date(game.createdAt)

  useBackGuard(() => {})

  useEffect(() => {
    if (ending.winner === 'nobody') return
    void confetti({
      particleCount: 140,
      spread: 80,
      origin: { y: 0.3 },
      colors: ['#f2c26b', '#e9e6f5', '#c0392b'],
      disableForReducedMotion: true,
    })
  }, [ending.winner])

  const save = async () => {
    setExporting(true)
    setExportFailed(false)
    try {
      await exportPng(card.current!, `duskwarden-${day.toISOString().slice(0, 10)}.png`)
    } catch {
      setExportFailed(true)
    } finally {
      setExporting(false)
    }
  }

  return (
    <main className="flex flex-col gap-4 pb-8">
      <div ref={card} className="flex flex-col gap-8 bg-background px-5 pt-10 pb-6">
        <header className="flex flex-col items-center gap-2 text-center">
          <p className="text-sm tracking-[0.3em] text-muted-foreground uppercase">Játék vége</p>
          <h1 className="font-display text-4xl leading-tight text-primary">
            {winnerLabel(ending.winner, setup.roles)}
          </h1>
          {soloWinners.length > 0 && (
            <p className="text-muted-foreground">
              Szintén nyert:{' '}
              {soloWinners
                .map((id) => {
                  const player = playerById(setup, id)
                  return `${player.name} (${lowerFirst(setup.roles[player.roleId].name)})`
                })
                .join(', ')}
            </p>
          )}
        </header>

        <ul className="flex flex-col gap-1.5">
          {setup.players.map((p) => {
            const role = setup.roles[p.roleId]
            const alive = finalAlive.has(p.id)
            const won = isMainWinner(setup, p.id, ending.winner) || soloWinners.includes(p.id)
            return (
              <li key={p.id} className="flex h-12 items-center gap-3 rounded-xl bg-card px-4">
                <span className="w-5 text-sm text-muted-foreground">{p.seat}.</span>
                <span className={cn('flex-1 truncate font-semibold', !alive && 'opacity-60')}>
                  {p.name}
                </span>
                <span className={cn('text-sm', FACTION_TONE[role.faction])}>{role.name}</span>
                <span className="w-5 text-center" aria-label={alive ? 'él' : 'halott'}>
                  {alive ? '✓' : '☠'}
                </span>
                <Trophy
                  className={cn('size-4 shrink-0', won ? 'text-primary' : 'invisible')}
                  aria-hidden={!won}
                />
              </li>
            )
          })}
        </ul>

        {timeline.length > 0 && (
          <section className="flex flex-col gap-4">
            <h2 className="font-display text-2xl">Krónika</h2>
            {timeline.map((phase) => (
              <div key={phase.phase} className="flex flex-col gap-1 border-l-2 border-border pl-4">
                <h3 className="text-sm font-semibold text-primary">{phaseLabel(phase.phase)}</h3>
                {phase.entries.map((entry, i) => (
                  <p key={i}>{describe(entry, setup)}</p>
                ))}
              </div>
            ))}
          </section>
        )}

        <p className="text-center text-xs text-muted-foreground">
          Duskwarden · {day.toLocaleDateString('hu-HU')}
        </p>
      </div>

      <div className="flex flex-col gap-3 px-4">
        <Button size="touch" disabled={exporting} onClick={save}>
          {exporting ? 'Készül…' : 'Kép mentése'}
        </Button>
        {exportFailed && (
          <p role="alert" className="text-center text-blood">
            Nem sikerült a képet elkészíteni.
          </p>
        )}
        <Button size="touch" variant="secondary" onClick={actions.resumeGame}>
          Vissza a játékhoz
        </Button>
        <div className="grid grid-cols-2 gap-3">
          <Button size="touch" variant="outline" onClick={() => actions.goto('setup')}>
            Új játék
          </Button>
          <Button size="touch" variant="ghost" onClick={() => actions.goto('home')}>
            Kezdőlap
          </Button>
        </div>
      </div>
    </main>
  )
}
