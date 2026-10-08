import { useState } from 'react'
import { cn } from 'cn'
import { fillWithVillagers, hasHostile, totalRoles, type SetupDraft } from '@/domain/setup'
import type { Faction, RoleDef } from '@/domain/types'
import { Stepper } from '@/ui/components/Stepper'
import { ACTION_LABEL, FACTION_BORDER } from '@/ui/labels'
import { Button } from '@/ui/primitives/button'
import { RoleDetailsSheet } from '@/ui/screens/library/RoleDetailsSheet'

const GROUPS: [Faction, string][] = [
  ['town', 'Város'],
  ['killers', 'Gyilkosok'],
  ['neutral', 'Semlegesek'],
]

const byLibraryOrder = (a: RoleDef, b: RoleDef) =>
  a.builtIn === b.builtIn
    ? a.builtIn
      ? 0
      : a.name.localeCompare(b.name, 'hu')
    : a.builtIn
      ? -1
      : 1

export function RolesPage({
  draft,
  roles,
  playerCount,
  onChange,
}: {
  draft: SetupDraft
  roles: Record<string, RoleDef>
  playerCount: number
  onChange(draft: SetupDraft): void
}) {
  const [details, setDetails] = useState<RoleDef | null>(null)
  const assigned = totalRoles(draft.roleCounts)
  const mismatch = assigned !== playerCount
  const all = Object.values(roles).sort(byLibraryOrder)

  const setCount = (id: string, n: number) => {
    const roleCounts = { ...draft.roleCounts }
    if (n > 0) roleCounts[id] = n
    else delete roleCounts[id]
    onChange({ ...draft, roleCounts })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className={cn('text-lg font-semibold', mismatch ? 'text-blood' : 'text-primary')}>
          {assigned} / {playerCount} szerep kiosztva
        </p>
        {mismatch && (
          <p className="text-sm text-muted-foreground">
            A szerepek számának meg kell egyeznie a játékosok számával.
          </p>
        )}
        {assigned > 0 && !hasHostile(draft.roleCounts, roles) && (
          <p role="alert" className="text-sm text-blood">
            Nincs gyilkos szerep a játékban.
          </p>
        )}
        <Button
          variant="outline"
          size="touch"
          onClick={() =>
            onChange({ ...draft, roleCounts: fillWithVillagers(draft.roleCounts, playerCount) })
          }
        >
          Feltöltés városlakókkal
        </Button>
      </div>

      {GROUPS.map(([faction, title]) => (
        <section key={faction} className="flex flex-col gap-2">
          <h2 className="text-sm tracking-wider text-muted-foreground uppercase">{title}</h2>
          {all
            .filter((role) => role.faction === faction)
            .map((role) => (
              <div
                key={role.id}
                className={cn(
                  'flex items-center gap-2 rounded-xl border-l-4 bg-card py-1 pr-1 pl-4',
                  FACTION_BORDER[role.faction],
                )}
              >
                <button
                  type="button"
                  className="flex min-h-14 flex-1 flex-col justify-center text-left"
                  onClick={() => setDetails(role)}
                >
                  <span className="font-medium">{role.name}</span>
                  <span className="text-xs text-muted-foreground">{ACTION_LABEL[role.action]}</span>
                </button>
                <Stepper
                  label={role.name}
                  value={draft.roleCounts[role.id] ?? 0}
                  onChange={(n) => setCount(role.id, n)}
                />
              </div>
            ))}
        </section>
      ))}

      <RoleDetailsSheet role={details} onClose={() => setDetails(null)} />
    </div>
  )
}
