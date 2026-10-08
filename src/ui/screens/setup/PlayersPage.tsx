import { Plus, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cn } from 'cn'
import type { NameIssue } from '@/domain/setup'
import { newId } from '@/lib/random'
import { SortableList } from '@/ui/components/SortableList'
import { Button } from '@/ui/primitives/button'
import { Input } from '@/ui/primitives/input'

export interface PlayerRow {
  key: string
  name: string
}

const ISSUE_TEXT: Record<NameIssue, string> = {
  noPlayers: 'Adj hozzá legalább egy játékost.',
  emptyName: 'Minden játékosnak adj nevet.',
  duplicateName: 'Két játékosnak ugyanaz a neve.',
}

const nameKey = (name: string) => name.trim().toLocaleLowerCase('hu')

export function PlayersPage({
  rows,
  onRowsChange,
  issue,
  knownPlayers,
  onForget,
}: {
  rows: PlayerRow[]
  onRowsChange(rows: PlayerRow[]): void
  issue: NameIssue | null
  knownPlayers: string[]
  onForget(name: string): void
}) {
  const [editingPool, setEditingPool] = useState(false)
  const inputs = useRef(new Map<string, HTMLInputElement>())
  const focusKey = useRef<string | null>(null)

  useEffect(() => {
    if (!focusKey.current) return
    inputs.current.get(focusKey.current)?.focus()
    focusKey.current = null
  })

  const add = (name = '') => {
    const key = newId()
    if (!name) focusKey.current = key
    onRowsChange([...rows, { key, name }])
  }
  const rename = (key: string, name: string) =>
    onRowsChange(rows.map((r) => (r.key === key ? { ...r, name } : r)))

  const taken = new Set(rows.map((r) => nameKey(r.name)))
  const pool = knownPlayers.filter((name) => !taken.has(nameKey(name)))

  return (
    <div className="flex flex-col gap-6">
      <p className="text-muted-foreground">Add meg a játékosokat ülésrend szerint.</p>

      <SortableList
        items={rows}
        getId={(r) => r.key}
        onReorder={onRowsChange}
        renderItem={(row, handle) => (
          <div className="flex items-center gap-1 rounded-xl bg-card pr-1">
            {handle}
            <Input
              ref={(el) => {
                if (el) inputs.current.set(row.key, el)
                else inputs.current.delete(row.key)
              }}
              placeholder="Név"
              value={row.name}
              enterKeyHint="next"
              className="h-14 flex-1 border-0 bg-transparent text-lg shadow-none dark:bg-transparent"
              onChange={(e) => rename(row.key, e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return
                e.preventDefault()
                if (row.name.trim()) add()
              }}
            />
            <Button
              variant="ghost"
              size="icon-touch"
              aria-label="Törlés"
              onClick={() => onRowsChange(rows.filter((r) => r.key !== row.key))}
            >
              <X />
            </Button>
          </div>
        )}
      />

      <Button variant="outline" size="touch" onClick={() => add()}>
        <Plus />
        Játékos hozzáadása
      </Button>

      {issue && (rows.length > 0 || issue !== 'noPlayers') && (
        <p role="alert" className="text-blood">
          {ISSUE_TEXT[issue]}
        </p>
      )}

      {(pool.length > 0 || editingPool) && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm tracking-wider text-muted-foreground uppercase">
              Korábbi játékosok
            </h2>
            <Button variant="link" className="h-11" onClick={() => setEditingPool(!editingPool)}>
              {editingPool ? 'Kész' : 'Szerkesztés'}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {pool.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => (editingPool ? onForget(name) : add(name))}
                className={cn(
                  'flex h-11 items-center gap-1 rounded-full bg-secondary px-4',
                  editingPool && 'pr-3 text-muted-foreground',
                )}
              >
                {name}
                {editingPool && <X className="size-4" aria-label="Elfelejtés" />}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
