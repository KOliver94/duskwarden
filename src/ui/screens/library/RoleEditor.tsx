import { useState } from 'react'
import { defaultPrompt } from '@/domain/copy'
import type { ActionKind, Faction, NeutralGoal, RoleConstraints, RoleDef } from '@/domain/types'
import { ChoiceGroup } from '@/ui/components/ChoiceGroup'
import { Field, NumberField, SwitchRow } from '@/ui/components/fields'
import { ScreenHeader } from '@/ui/components/ScreenHeader'
import { ACTION_LABEL, FACTION_LABEL, GOAL_LABEL } from '@/ui/labels'
import { Button } from '@/ui/primitives/button'
import { Input } from '@/ui/primitives/input'
import { Textarea } from '@/ui/primitives/textarea'

const options = <T extends string>(labels: Record<T, string>) =>
  (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }))

export function RoleEditor({
  initial,
  onSave,
  onCancel,
}: {
  initial: RoleDef
  onSave(role: RoleDef): void
  onCancel(): void
}) {
  const [role, setRole] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const patch = (changes: Partial<RoleDef>) => setRole((r) => ({ ...r, ...changes }))
  const patchConstraints = (changes: Partial<RoleConstraints>) =>
    setRole((r) => ({ ...r, constraints: { ...r.constraints, ...changes } }))

  const wakes = role.action !== 'none'
  const targets = wakes && role.action !== 'vest'
  const suspiciousDefault = role.action === 'kill'

  const setFaction = (faction: Faction) =>
    setRole(({ neutralGoal, ...rest }) =>
      faction === 'neutral'
        ? { ...rest, faction, neutralGoal: neutralGoal ?? 'none' }
        : { ...rest, faction },
    )

  const save = () => {
    const name = role.name.trim()
    const namePlural = role.namePlural.trim()
    if (!name) return setError('Adj nevet a szerepnek.')
    if (!namePlural) return setError('Add meg a többes számot is.')
    onSave({
      ...role,
      name,
      namePlural,
      description: role.description.trim(),
      gmHint: role.gmHint?.trim() || undefined,
      promptOverride: role.promptOverride?.trim() || undefined,
    })
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <ScreenHeader
        title={initial.name === '' ? 'Új szerep' : 'Szerep szerkesztése'}
        closeLabel="Mégse"
        onClose={onCancel}
      />
      <form
        className="flex flex-1 flex-col gap-6 px-4 py-4"
        onSubmit={(event) => {
          event.preventDefault()
          save()
        }}
      >
        <Field label="Név">
          <Input
            className="h-14 text-base"
            value={role.name}
            onChange={(e) => patch({ name: e.target.value })}
          />
        </Field>
        <Field label="Többes szám">
          <Input
            className="h-14 text-base"
            placeholder="pl. orvosok"
            value={role.namePlural}
            onChange={(e) => patch({ namePlural: e.target.value })}
          />
        </Field>
        <Field label="Csapat">
          <ChoiceGroup
            label="Csapat"
            value={role.faction}
            options={options(FACTION_LABEL)}
            onChange={setFaction}
          />
        </Field>
        {role.faction === 'neutral' && (
          <Field label="Cél">
            <ChoiceGroup<NeutralGoal>
              label="Cél"
              value={role.neutralGoal}
              options={options(GOAL_LABEL)}
              onChange={(neutralGoal) => patch({ neutralGoal })}
            />
          </Field>
        )}
        <Field label="Képesség">
          <ChoiceGroup<ActionKind>
            label="Képesség"
            value={role.action}
            options={options(ACTION_LABEL)}
            onChange={(action) => patch({ action })}
          />
        </Field>
        <Field label="Leírás">
          <Textarea
            className="min-h-24 text-base"
            value={role.description}
            onChange={(e) => patch({ description: e.target.value })}
          />
        </Field>
        <Field label="Mesélői tipp">
          <Textarea
            className="min-h-20 text-base"
            value={role.gmHint ?? ''}
            onChange={(e) => patch({ gmHint: e.target.value })}
          />
        </Field>
        {targets && (
          <Field label="Egyéni kérdés">
            <Input
              className="h-14 text-base"
              placeholder={defaultPrompt(role.action, false)}
              value={role.promptOverride ?? ''}
              onChange={(e) => patch({ promptOverride: e.target.value })}
            />
          </Field>
        )}
        {wakes && (
          <NumberField
            label="Időzítő (mp)"
            min={0}
            max={300}
            value={role.stepSeconds}
            onChange={(stepSeconds) => patch({ stepSeconds: stepSeconds ?? 0 })}
          />
        )}

        <div className="flex flex-col">
          <SwitchRow
            label="Gyanús a nyomozónak"
            checked={role.suspiciousOverride ?? suspiciousDefault}
            onChange={(value) =>
              patch({ suspiciousOverride: value === suspiciousDefault ? undefined : value })
            }
          />
          {targets && (
            <>
              <SwitchRow
                label="Választhatja saját magát"
                checked={role.constraints.canTargetSelf}
                onChange={(canTargetSelf) => patchConstraints({ canTargetSelf })}
              />
              <SwitchRow
                label="Nem választhatja ugyanazt két egymást követő éjjel"
                checked={role.constraints.noRepeatTarget}
                onChange={(noRepeatTarget) => patchConstraints({ noRepeatTarget })}
              />
            </>
          )}
        </div>

        {targets && role.constraints.canTargetSelf && (
          <NumberField
            label="Saját magát legfeljebb ennyiszer választhatja"
            min={1}
            max={99}
            placeholder="Korlátlan"
            value={role.constraints.selfTargetMax}
            onChange={(selfTargetMax) => patchConstraints({ selfTargetMax })}
          />
        )}
        {wakes && (
          <NumberField
            label="Ennyiszer használhatja a képességét"
            min={1}
            max={99}
            placeholder="Korlátlan"
            value={role.constraints.maxUses}
            onChange={(maxUses) => patchConstraints({ maxUses })}
          />
        )}

        {error && (
          <p role="alert" className="text-blood">
            {error}
          </p>
        )}
        <Button type="submit" size="touch" className="mt-auto">
          Mentés
        </Button>
      </form>
    </div>
  )
}
