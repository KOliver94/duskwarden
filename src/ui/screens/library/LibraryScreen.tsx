import { Plus } from 'lucide-react'
import { useState } from 'react'
import { cn } from 'cn'
import { BUILT_IN_ROLES } from '@/domain/roles'
import type { RoleDef } from '@/domain/types'
import { newId } from '@/lib/random'
import { useActions, useApp } from '@/store/hooks'
import { ScreenHeader } from '@/ui/components/ScreenHeader'
import { useBackGuard } from '@/ui/hooks/useBackGuard'
import { useConfirm } from '@/ui/hooks/useConfirm'
import { ACTION_LABEL, FACTION_BORDER } from '@/ui/labels'
import { Button } from '@/ui/primitives/button'
import { RoleDetailsSheet } from './RoleDetailsSheet'
import { RoleEditor } from './RoleEditor'
import { blankRole, copyOfRole } from './roleDrafts'

export function RoleRow({ role, onOpen }: { role: RoleDef; onOpen(): void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'flex h-14 w-full items-center justify-between gap-3 rounded-xl border-l-4 bg-card px-4 text-left',
        FACTION_BORDER[role.faction],
      )}
    >
      <span className="truncate font-medium">{role.name}</span>
      <span className="shrink-0 text-sm text-muted-foreground">{ACTION_LABEL[role.action]}</span>
    </button>
  )
}

const customId = () => `custom-${newId()}`

export function LibraryScreen() {
  const customRoles = useApp((s) => s.customRoles)
  const actions = useActions()
  const confirm = useConfirm()
  const [details, setDetails] = useState<RoleDef | null>(null)
  const [editing, setEditing] = useState<RoleDef | null>(null)
  const sorted = [...customRoles].sort((a, b) => a.name.localeCompare(b.name, 'hu'))

  useBackGuard(() => {
    if (confirm.isOpen) confirm.dismiss()
    else if (editing) setEditing(null)
    else if (details) setDetails(null)
    else actions.goto('home')
  })

  if (editing) {
    return (
      <RoleEditor
        initial={editing}
        onCancel={() => setEditing(null)}
        onSave={(role) => {
          actions.saveCustomRole(role)
          setEditing(null)
          setDetails(null)
        }}
      />
    )
  }

  const edit = (role: RoleDef) => {
    setDetails(null)
    setEditing(role)
  }

  return (
    <main className="flex flex-1 flex-col">
      <ScreenHeader title="Szerepek" closeLabel="Vissza" onClose={() => actions.goto('home')} />
      <div className="flex flex-col gap-8 px-4 py-4">
        <section className="flex flex-col gap-2">
          <h2 className="text-sm tracking-wider text-muted-foreground uppercase">
            Beépített szerepek
          </h2>
          {BUILT_IN_ROLES.map((role) => (
            <RoleRow key={role.id} role={role} onOpen={() => setDetails(role)} />
          ))}
        </section>
        <section className="flex flex-col gap-2">
          <h2 className="text-sm tracking-wider text-muted-foreground uppercase">Saját szerepek</h2>
          {sorted.length === 0 && (
            <p className="text-muted-foreground">Még nincs saját szereped.</p>
          )}
          {sorted.map((role) => (
            <RoleRow key={role.id} role={role} onOpen={() => setDetails(role)} />
          ))}
          <Button size="touch" variant="outline" onClick={() => edit(blankRole(customId()))}>
            <Plus />
            Új szerep
          </Button>
        </section>
      </div>

      <RoleDetailsSheet
        role={details}
        onClose={() => setDetails(null)}
        actions={
          details?.builtIn ? (
            <Button
              size="touch"
              variant="secondary"
              onClick={() => edit(copyOfRole(details, customId()))}
            >
              Másolat készítése
            </Button>
          ) : (
            details && (
              <>
                <Button size="touch" variant="secondary" onClick={() => edit(details)}>
                  Szerkesztés
                </Button>
                <Button
                  size="touch"
                  variant="ghost"
                  className="text-blood"
                  onClick={() =>
                    confirm.ask({
                      title: 'Biztosan törlöd ezt a szerepet?',
                      body: details.name,
                      cancelLabel: 'Mégse',
                      confirmLabel: 'Törlés',
                      destructive: true,
                      onConfirm: () => {
                        actions.deleteCustomRole(details.id)
                        setDetails(null)
                      },
                    })
                  }
                >
                  Törlés
                </Button>
              </>
            )
          )
        }
      />
      {confirm.dialog}
    </main>
  )
}
