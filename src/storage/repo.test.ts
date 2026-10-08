import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { ROLES, makeSetup } from '@/domain/fixtures'
import type { Game } from '@/domain/types'
import { openDb } from './db'
import {
  DEFAULT_PREFS,
  deleteCustomRole,
  loadCustomRoles,
  loadGame,
  loadPrefs,
  saveCustomRole,
  saveGame,
  savePref,
} from './repo'

const fresh = () => openDb(`test-${crypto.randomUUID()}`)

const game: Game = {
  schemaVersion: 1,
  id: 'g1',
  createdAt: 1,
  updatedAt: 2,
  setup: makeSetup(['killer', 'villager']),
  inputs: { 'n1:killer': { kind: 'target', targetId: 'p2' } },
  cursor: { phase: 0, stepId: 'n1:killer' },
  timers: { 'n1:killer': { startedAt: 5, accumulatedMs: 0 } },
  ending: null,
}

describe('repo', () => {
  it('round-trips a game', async () => {
    const db = await fresh()
    await saveGame(db, game)
    expect(await loadGame(db, 'g1')).toEqual(game)
  })

  it('falls back to defaults for prefs never written', async () => {
    const db = await fresh()
    await savePref(db, 'knownPlayers', ['Anna'])
    expect(await loadPrefs(db)).toEqual({ ...DEFAULT_PREFS, knownPlayers: ['Anna'] })
  })

  it('keeps an explicitly cleared active game id', async () => {
    const db = await fresh()
    await savePref(db, 'activeGameId', 'g1')
    await savePref(db, 'activeGameId', null)
    expect((await loadPrefs(db)).activeGameId).toBeNull()
  })

  it('stores and deletes custom roles', async () => {
    const db = await fresh()
    const witch = { ...ROLES.villager, id: 'witch', builtIn: false, action: 'other' as const }
    await saveCustomRole(db, witch)
    expect(await loadCustomRoles(db)).toEqual([witch])
    await deleteCustomRole(db, 'witch')
    expect(await loadCustomRoles(db)).toEqual([])
  })
})
