import 'fake-indexeddb/auto'
import { describe, expect, it, vi } from 'vitest'
import { BUILT_IN_ORDER, rolesById } from '@/domain/roles'
import { DEFAULT_SETTINGS, type SetupDraft } from '@/domain/setup'
import type { Player, RoleDef } from '@/domain/types'
import { openDb } from '@/storage/db'
import { DEFAULT_PREFS, loadGame, loadPrefs } from '@/storage/repo'
import { createAppStore, type Deps } from './appStore'
import { bootstrap } from './bootstrap'

const witch: RoleDef = {
  ...rolesById([]).villager,
  id: 'witch',
  builtIn: false,
  name: 'Boszorkány',
  namePlural: 'boszorkányok',
  action: 'other',
  stepSeconds: 20,
}

const draft: SetupDraft = {
  names: ['Anna', 'Bence', 'Csilla'],
  roleCounts: { killer: 1, witch: 1, villager: 1 },
  settings: DEFAULT_SETTINGS,
}

const players: Player[] = [
  { id: 'a', name: 'Anna', seat: 1, roleId: 'killer' },
  { id: 'b', name: 'Bence', seat: 2, roleId: 'witch' },
  { id: 'c', name: 'Csilla', seat: 3, roleId: 'villager' },
]

async function setup(overrides: Partial<Deps> = {}) {
  const name = `test-${crypto.randomUUID()}`
  const db = await openDb(name)
  let clock = 1000
  const store = createAppStore(
    { db, now: () => clock, newId: () => 'g1', requestPersist: () => {}, ...overrides },
    {
      game: null,
      customRoles: [witch],
      prefs: { ...DEFAULT_PREFS, knownPlayers: ['Dani', 'anna'] },
    },
  )
  const start = () => store.getState().startGame(draft, players, ['witch', 'killer'])
  return { db, name, store, start, tick: (ms: number) => (clock += ms) }
}

describe('app store', () => {
  it('starts a game on night 1', async () => {
    const { store, start } = await setup()
    start()
    const { game, screen } = store.getState()
    expect(screen).toBe('game')
    expect(game?.cursor).toEqual({ phase: 0, stepId: 'n1:dusk' })
    expect(Object.keys(game!.setup.roles).sort()).toEqual(['killer', 'villager', 'witch'])
  })

  it('keeps the role snapshot when the library changes', async () => {
    const { store, start } = await setup()
    start()
    store.getState().saveCustomRole({ ...witch, name: 'Javasasszony' })
    expect(store.getState().game!.setup.roles.witch.name).toBe('Boszorkány')
  })

  it('remembers players and the merged night order', async () => {
    const { db, store, start } = await setup()
    start()
    await store.getState().flush()
    const prefs = await loadPrefs(db)
    expect(prefs.knownPlayers).toEqual(['Anna', 'Bence', 'Csilla', 'Dani'])
    expect(prefs.nightOrder).toEqual([...BUILT_IN_ORDER, 'witch'])
    expect(prefs.activeGameId).toBe('g1')
    expect(prefs.lastSetup).toEqual(draft)
  })

  it('persists every game change', async () => {
    const { db, store, start } = await setup()
    start()
    store.getState().setInput('n1:killer', { kind: 'target', targetId: 'b' })
    store.getState().moveCursor({ phase: 0, stepId: 'n1:killer' })
    await store.getState().flush()
    expect(await loadGame(db, 'g1')).toEqual(store.getState().game)
  })

  it('runs timers on the injected clock', async () => {
    const { store, start, tick } = await setup()
    start()
    store.getState().timer('n1:killer', 'start')
    tick(5000)
    store.getState().timer('n1:killer', 'pause')
    expect(store.getState().game!.timers['n1:killer']).toEqual({
      startedAt: null,
      accumulatedMs: 5000,
    })
  })

  it('ends and resumes a game', async () => {
    const { store, start } = await setup()
    start()
    store.getState().endGame('town', true)
    expect(store.getState().game!.ending).toEqual({ winner: 'town', manual: true, phase: 0 })
    store.getState().resumeGame()
    expect(store.getState().game!.ending).toBeNull()
  })

  it('restores the active game on bootstrap', async () => {
    const { name, store, start } = await setup()
    start()
    await store.getState().flush()
    const restored = (await bootstrap(name)).getState()
    expect(restored.screen).toBe('game')
    expect(restored.game?.id).toBe('g1')
  })

  it('reopens a lost database connection and keeps saving', async () => {
    const name = `test-${crypto.randomUUID()}`
    const db = await openDb(name)
    const store = createAppStore(
      {
        db,
        now: () => 1000,
        newId: () => 'g1',
        requestPersist: () => {},
        reopen: () => openDb(name),
      },
      { game: null, customRoles: [witch], prefs: DEFAULT_PREFS },
    )
    store.getState().startGame(draft, players, ['witch', 'killer'])
    await store.getState().flush()
    db.close()
    store.getState().setInput('n1:killer', { kind: 'target', targetId: 'b' })
    await store.getState().flush()
    expect(store.getState().saveFailed).toBe(false)
    const stored = await loadGame(await openDb(name), 'g1')
    expect(stored?.inputs['n1:killer']).toEqual({ kind: 'target', targetId: 'b' })
  })

  it('persists alert preferences', async () => {
    const { db, store } = await setup()
    expect(store.getState().prefs.alerts).toEqual({ sound: true, vibration: true })
    store.getState().setAlerts({ sound: false, vibration: true })
    await store.getState().flush()
    expect((await loadPrefs(db)).alerts).toEqual({ sound: false, vibration: true })
  })

  it('flags failed saves and keeps playing in memory', async () => {
    const { store, start } = await setup({ db: null })
    start()
    await store.getState().flush()
    expect(store.getState().saveFailed).toBe(true)
    expect(store.getState().game?.id).toBe('g1')
  })
})

describe('past games', () => {
  async function playThree() {
    let n = 0
    const ctx = await setup({ newId: () => `g${++n}` })
    ctx.start()
    ctx.store.getState().endGame('town', false)
    ctx.tick(1000)
    ctx.start()
    ctx.tick(1000)
    ctx.start()
    await ctx.store.getState().flush()
    await ctx.store.getState().openArchive()
    return ctx
  }
  const ids = (games: { id: string }[] | null) => games?.map((g) => g.id)

  it('lists finished and abandoned games newest first, without the active one', async () => {
    const { store } = await playThree()
    const { screen, archive, game } = store.getState()
    expect(screen).toBe('archive')
    expect(game?.id).toBe('g3')
    expect(ids(archive)).toEqual(['g2', 'g1'])
    expect(archive![1].ending?.winner).toBe('town')
  })

  it('deletes a past game and leaves the view', async () => {
    const { db, store } = await playThree()
    store.getState().viewGame('g1')
    store.getState().deleteGame('g1')
    expect(ids(store.getState().archive)).toEqual(['g2'])
    expect(store.getState().viewingId).toBeNull()
    await vi.waitFor(async () => expect(await loadGame(db, 'g1')).toBeUndefined())
    expect(await loadGame(db, 'g2')).toBeDefined()
  })

  it('deletes every past game but keeps the active one', async () => {
    const { db, store } = await playThree()
    store.getState().deleteArchive()
    expect(store.getState().archive).toEqual([])
    await vi.waitFor(async () => expect(await loadGame(db, 'g2')).toBeUndefined())
    expect(await loadGame(db, 'g1')).toBeUndefined()
    expect(await loadGame(db, 'g3')).toBeDefined()
  })
})
