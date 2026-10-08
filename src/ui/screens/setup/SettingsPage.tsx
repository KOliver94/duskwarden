import type { Settings } from '@/domain/types'
import { NumberField, SwitchRow } from '@/ui/components/fields'

export function SettingsPage({
  settings,
  onChange,
}: {
  settings: Settings
  onChange(settings: Settings): void
}) {
  const set = (patch: Partial<Settings>) => onChange({ ...settings, ...patch })
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col">
        <SwitchRow
          label="A gyilkosok ismerik egymást"
          checked={settings.killersKnowEachOther}
          onChange={(killersKnowEachOther) => set({ killersKnowEachOther })}
        />
        <SwitchRow
          label="Győzelemkor automatikusan vége a játéknak"
          checked={settings.autoEnd}
          onChange={(autoEnd) => set({ autoEnd })}
        />
        <SwitchRow
          label="Halottak szerepének felfedése"
          checked={settings.revealRoleOnDeath}
          onChange={(revealRoleOnDeath) => set({ revealRoleOnDeath })}
        />
        <SwitchRow
          label="A bolond győzelmével véget ér a játék"
          checked={settings.jesterWinEndsGame}
          onChange={(jesterWinEndsGame) => set({ jesterWinEndsGame })}
        />
      </div>
      <div className="flex flex-col gap-2">
        <NumberField
          label="Vitaidő (perc)"
          min={1}
          max={60}
          value={settings.discussionMinutes ?? undefined}
          onChange={(minutes) => set({ discussionMinutes: minutes ?? null })}
        />
        <p className="text-sm text-muted-foreground">Üresen hagyva nincs időkorlát.</p>
      </div>
    </div>
  )
}
