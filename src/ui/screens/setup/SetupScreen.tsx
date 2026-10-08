import { useMemo, useState } from 'react'
import { assignRoles } from '@/domain/assign'
import { rolesById, wakingOrder } from '@/domain/roles'
import { EMPTY_DRAFT, nameIssue, sanitizeDraft, totalRoles, type SetupDraft } from '@/domain/setup'
import type { Player } from '@/domain/types'
import { newId, random } from '@/lib/random'
import { useActions, useApp } from '@/store/hooks'
import { ScreenHeader } from '@/ui/components/ScreenHeader'
import { useBackGuard } from '@/ui/hooks/useBackGuard'
import { Button } from '@/ui/primitives/button'
import { DrawPage } from './DrawPage'
import { OrderPage } from './OrderPage'
import { PlayersPage, type PlayerRow } from './PlayersPage'
import { RolesPage } from './RolesPage'
import { SettingsPage } from './SettingsPage'

const TITLES = ['Játékosok', 'Szerepek', 'Ébredési sorrend', 'Beállítások', 'Sorsolás']

export function SetupScreen() {
  const customRoles = useApp((s) => s.customRoles)
  const lastSetup = useApp((s) => s.prefs.lastSetup)
  const globalOrder = useApp((s) => s.prefs.nightOrder)
  const knownPlayers = useApp((s) => s.prefs.knownPlayers)
  const actions = useActions()
  const roles = useMemo(() => rolesById(customRoles), [customRoles])

  const [draft, setDraft] = useState(() => sanitizeDraft(lastSetup ?? EMPTY_DRAFT, roles))
  const [rows, setRows] = useState<PlayerRow[]>(() =>
    draft.names.map((name) => ({ key: newId(), name })),
  )
  const [page, setPage] = useState(0)
  const [order, setOrder] = useState<string[]>([])
  const [assignment, setAssignment] = useState<Player[] | null>(null)

  const named = rows.filter((r) => r.name.trim() !== '')
  const issue = nameIssue(named.map((r) => r.name))
  const roleIdsInGame = Object.keys(draft.roleCounts)

  const update = (next: SetupDraft) => {
    setDraft(next)
    setAssignment(null)
    actions.updateDraft(next)
  }
  const updateRows = (next: PlayerRow[]) => {
    setRows(next)
    update({ ...draft, names: next.map((r) => r.name) })
  }
  const draw = () =>
    setAssignment(
      assignRoles(
        named.map((r) => ({ id: newId(), name: r.name })),
        draft.roleCounts,
        random,
      ),
    )

  const goTo = (target: number) => {
    if (page === 0 && named.length !== rows.length) updateRows(named)
    if (target === 2) {
      const waking = wakingOrder(globalOrder, roleIdsInGame, roles)
      const same = order.length === waking.length && waking.every((id) => order.includes(id))
      if (!same) setOrder(waking)
    }
    if (target === 4 && !assignment) draw()
    setPage(target)
    window.scrollTo(0, 0)
  }

  useBackGuard(() => (page > 0 ? goTo(page - 1) : actions.goto('home')))

  const canContinue =
    page === 0 ? issue === null : page === 1 ? totalRoles(draft.roleCounts) === named.length : true
  const start = () =>
    assignment &&
    actions.startGame({ ...draft, names: named.map((r) => r.name.trim()) }, assignment, order)

  return (
    <main className="flex min-h-dvh flex-col">
      <ScreenHeader
        title={TITLES[page]}
        closeLabel="Kilépés"
        onClose={() => actions.goto('home')}
        right={`${page + 1}/${TITLES.length}`}
      />
      <div className="flex-1 px-4 py-4">
        {page === 0 && (
          <PlayersPage
            rows={rows}
            onRowsChange={updateRows}
            issue={issue}
            knownPlayers={knownPlayers}
            onForget={actions.forgetPlayer}
          />
        )}
        {page === 1 && (
          <RolesPage draft={draft} roles={roles} playerCount={named.length} onChange={update} />
        )}
        {page === 2 && <OrderPage order={order} roles={roles} onChange={setOrder} />}
        {page === 3 && (
          <SettingsPage
            settings={draft.settings}
            onChange={(settings) => update({ ...draft, settings })}
          />
        )}
        {page === 4 && assignment && (
          <DrawPage players={assignment} roles={roles} onRedraw={draw} />
        )}
      </div>
      <footer className="sticky bottom-0 grid grid-cols-2 gap-3 bg-background/95 p-4 backdrop-blur">
        {page > 0 ? (
          <Button variant="outline" size="touch" onClick={() => goTo(page - 1)}>
            Vissza
          </Button>
        ) : (
          <span />
        )}
        {page < TITLES.length - 1 ? (
          <Button size="touch" disabled={!canContinue} onClick={() => goTo(page + 1)}>
            Tovább
          </Button>
        ) : (
          <Button size="touch" onClick={start}>
            Indulhat a játék
          </Button>
        )}
      </footer>
    </main>
  )
}
