import { useState, type ReactNode } from 'react'
import { cn } from 'cn'
import { isSuspicious } from '@/domain/roles'
import type { RoleDef } from '@/domain/types'
import { BottomSheet } from '@/ui/components/BottomSheet'
import { ACTION_LABEL, FACTION_LABEL, FACTION_TONE, GOAL_LABEL } from '@/ui/labels'

function rules(role: RoleDef): string[] {
  const { constraints } = role
  const wakes = role.action !== 'none'
  const targets = wakes && role.action !== 'vest'
  return [
    isSuspicious(role) ? 'Gyanús a nyomozónak' : 'Nem gyanús a nyomozónak',
    ...(targets && constraints.canTargetSelf ? ['Saját magát is választhatja'] : []),
    ...(targets && constraints.noRepeatTarget
      ? ['Ugyanazt két egymást követő éjjel nem választhatja']
      : []),
    ...(targets && constraints.canTargetSelf && constraints.selfTargetMax !== undefined
      ? [`Saját magát legfeljebb ${constraints.selfTargetMax} alkalommal választhatja`]
      : []),
    ...(wakes && constraints.maxUses !== undefined
      ? [`Legfeljebb ${constraints.maxUses} alkalommal használhatja a képességét`]
      : []),
    ...(wakes ? [`Időzítő: ${role.stepSeconds} mp`] : []),
  ]
}

export function RoleDetailsSheet({
  role,
  onClose,
  actions,
}: {
  role: RoleDef | null
  onClose(): void
  actions?: ReactNode
}) {
  // Keeps the content visible while the sheet animates closed.
  const [last, setLast] = useState(role)
  if (role !== null && role !== last) setLast(role)
  const shown = role ?? last

  return (
    <BottomSheet open={role !== null} onClose={onClose} title={shown?.name ?? ''}>
      {shown && (
        <div className="flex flex-col gap-5">
          <p className="text-sm">
            <span className={cn('font-semibold', FACTION_TONE[shown.faction])}>
              {FACTION_LABEL[shown.faction]}
            </span>
            {' · '}
            {ACTION_LABEL[shown.action]}
            {shown.faction === 'neutral' && shown.neutralGoal && (
              <> · {GOAL_LABEL[shown.neutralGoal]}</>
            )}
          </p>
          {shown.description && <p className="text-base leading-relaxed">{shown.description}</p>}
          {shown.gmHint && (
            <div className="rounded-xl bg-secondary p-4">
              <h3 className="mb-1 text-sm font-semibold text-primary">Mesélői tipp</h3>
              <p className="text-sm leading-relaxed">{shown.gmHint}</p>
            </div>
          )}
          <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-muted-foreground">
            {rules(shown).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          {actions && <div className="flex flex-col gap-3">{actions}</div>}
        </div>
      )}
    </BottomSheet>
  )
}
