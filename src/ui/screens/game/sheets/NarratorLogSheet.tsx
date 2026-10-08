import { useState } from 'react'
import { phaseLabel } from '@/domain/copy'
import { narratorLog, type LogEntry } from '@/domain/history'
import type { GameSetup } from '@/domain/types'
import { BottomSheet } from '@/ui/components/BottomSheet'
import { SwitchRow } from '@/ui/components/fields'
import { displayName } from '@/ui/names'
import type { SheetProps } from '../types'

function describe(entry: LogEntry, setup: GameSetup, masked: boolean): string {
  const n = (id: string) => displayName(setup, id, masked)
  switch (entry.kind) {
    case 'action': {
      const actor = `${setup.roles[entry.roleId].name} (${entry.actorIds.map(n).join(', ')})`
      if (entry.targetId === null) return `${actor}: senkit sem választott`
      const result = entry.suspicious === null ? '' : entry.suspicious ? ': gyanús' : ': nem gyanús'
      return `${actor} → ${n(entry.targetId)}${result}`
    }
    case 'vest': {
      const role = setup.roles[setup.players.find((p) => p.id === entry.playerId)!.roleId]
      return `${role.name} (${n(entry.playerId)}): ${entry.use ? 'felvette a mellényt' : 'nem vette fel a mellényt'}`
    }
    case 'attack':
      return `Támadás → ${n(entry.attack.targetId)}: ${entry.attack.result === 'killed' ? 'meghalt' : 'túlélte'}`
    case 'adjustment':
      return `Mesélői módosítás → ${n(entry.playerId)}: ${entry.dead ? 'halott' : 'él'}`
    case 'nomination':
      return `Jelölés → ${n(entry.playerId)}: ${entry.votes} szavazat`
    case 'verdict':
      switch (entry.tally.outcome) {
        case 'executed':
          return `Kivégzés → ${n(entry.tally.playerId)}`
        case 'tie':
          return 'Döntetlen – nem volt kivégzés'
        case 'noMajority':
          return 'Nincs többség – nem volt kivégzés'
        case 'none':
          return 'Nem volt jelölt'
      }
  }
}

function LogBody({ game, derived }: Pick<SheetProps, 'game' | 'derived'>) {
  const [show, setShow] = useState(false)
  const phases = narratorLog(game.setup, derived, game.cursor, false)
  return (
    <div className="flex flex-col gap-5">
      <SwitchRow label="Nevek mutatása" checked={show} onChange={setShow} />
      {phases.map((phase) => (
        <section key={phase.phase} className="flex flex-col gap-1">
          <h3 className="font-display text-lg text-primary">{phaseLabel(phase.phase)}</h3>
          {phase.entries.length === 0 && (
            <p className="text-muted-foreground">Nem történt semmi.</p>
          )}
          {phase.entries.map((entry, i) => (
            <p key={i}>{describe(entry, game.setup, !show)}</p>
          ))}
        </section>
      ))}
    </div>
  )
}

export function NarratorLogSheet({ open, onClose, ...props }: SheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Mesélői napló">
      <LogBody {...props} />
    </BottomSheet>
  )
}
