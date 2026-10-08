import { useState } from 'react'
import type { Winner } from '@/domain/types'
import { useActions } from '@/store/hooks'
import { BottomSheet } from '@/ui/components/BottomSheet'
import { ChoiceGroup } from '@/ui/components/ChoiceGroup'
import { Button } from '@/ui/primitives/button'
import type { SheetProps } from '../types'

const decode = (value: string): Winner =>
  value.startsWith('role:') ? { roleId: value.slice(5) } : (value as Winner)

function EndGameBody({ game }: Pick<SheetProps, 'game'>) {
  const actions = useActions()
  const [choice, setChoice] = useState<string>()
  const roles = Object.values(game.setup.roles)
  const options = [
    { value: 'town', label: 'A város' },
    ...(roles.some((r) => r.faction === 'killers')
      ? [{ value: 'killers', label: 'A gyilkosok' }]
      : []),
    ...roles
      .filter((r) => r.faction === 'neutral')
      .map((r) => ({ value: `role:${r.id}`, label: r.name })),
    { value: 'nobody', label: 'Senki' },
  ]
  return (
    <div className="flex flex-col gap-5">
      <p className="text-lg">Ki nyert?</p>
      <ChoiceGroup label="Ki nyert?" value={choice} options={options} onChange={setChoice} />
      <Button
        size="touch"
        disabled={!choice}
        onClick={() => choice && actions.endGame(decode(choice), true)}
      >
        Játék befejezése
      </Button>
    </div>
  )
}

export function EndGameSheet({ open, onClose, game }: SheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Játék befejezése">
      <EndGameBody game={game} />
    </BottomSheet>
  )
}
