import { stepId } from '@/domain/timeline'
import { useActions } from '@/store/hooks'
import { BottomSheet } from '@/ui/components/BottomSheet'
import { SwitchRow } from '@/ui/components/fields'
import type { SheetProps } from '../types'

export function AdjustSheet({ game, derived, open, onClose }: SheetProps) {
  const actions = useActions()
  const phase = derived.phases[game.cursor.phase]
  const day = phase.day

  const toggle = (id: string) => {
    if (!day) return
    const wantDead = day.aliveAfterMorning.includes(id)
    const deadAtDayStart = !phase.aliveAtStart.includes(id)
    const rest = day.adjustments.filter((a) => a.playerId !== id)
    const adjustments =
      wantDead === deadAtDayStart ? rest : [...rest, { playerId: id, dead: wantDead }]
    actions.setInput(stepId(game.cursor.phase, 'morning'), { kind: 'morning', adjustments })
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Mesélői módosítás">
      {day && (
        <div className="flex flex-col">
          {game.setup.players.map((p) => (
            <SwitchRow
              key={p.id}
              label={`${p.seat}. ${p.name} – él`}
              checked={day.aliveAfterMorning.includes(p.id)}
              onChange={() => toggle(p.id)}
            />
          ))}
        </div>
      )}
    </BottomSheet>
  )
}
