import { createStore } from 'zustand/vanilla'
import { rolesById } from '@/domain/roles'
import { mergeNightOrder, rememberPlayers, type SetupDraft } from '@/domain/setup'
import { firstStepId } from '@/domain/timeline'
import { IDLE_TIMER, pauseTimer, startTimer } from '@/domain/timer'
import type { Cursor, Game, Player, RoleDef, StepInput, Winner } from '@/domain/types'
import type { Db, Prefs } from '@/storage/db'
import * as repo from '@/storage/repo'
import { createWriteQueue, type WriteQueue } from '@/storage/writeQueue'

export type Screen = 'home' | 'setup' | 'library' | 'game'

export interface AppState {
  screen: Screen
  game: Game | null
  customRoles: RoleDef[]
  prefs: Prefs
  saveFailed: boolean
}

export interface AppActions {
  goto(screen: Screen): void
  updateDraft(draft: SetupDraft): void
  forgetPlayer(name: string): void
  startGame(draft: SetupDraft, players: Player[], nightOrder: string[]): void
  setInput(stepId: string, input: StepInput): void
  moveCursor(cursor: Cursor): void
  timer(stepId: string, op: 'start' | 'pause' | 'reset'): void
  endGame(winner: Winner, manual: boolean): void
  resumeGame(): void
  saveCustomRole(role: RoleDef): void
  deleteCustomRole(id: string): void
  flush(): Promise<void>
}

export type App = AppState & AppActions

export interface Deps {
  db: Db | null
  now(): number
  newId(): string
  requestPersist(): void
}

export interface InitialState {
  game: Game | null
  customRoles: RoleDef[]
  prefs: Prefs
  saveFailed?: boolean
}

export function createAppStore(deps: Deps, initial: InitialState) {
  const requireDb = () => {
    if (!deps.db) throw new Error('IndexedDB is unavailable')
    return deps.db
  }
  let report: (ok: boolean) => void = () => {}
  const gameQueue = createWriteQueue<Game>(
    (game) => repo.saveGame(requireDb(), game),
    (ok) => report(ok),
  )
  const prefQueues = new Map<keyof Prefs, WriteQueue<Prefs[keyof Prefs]>>()
  const prefQueue = (key: keyof Prefs) => {
    let queue = prefQueues.get(key)
    if (!queue) {
      queue = createWriteQueue(
        (value) => repo.savePref(requireDb(), key, value),
        (ok) => report(ok),
      )
      prefQueues.set(key, queue)
    }
    return queue
  }
  const writeNow = (op: (db: Db) => Promise<unknown>) =>
    void (async () => {
      try {
        await op(requireDb())
        report(true)
      } catch {
        report(false)
      }
    })()

  const store = createStore<App>()((set, get) => {
    const patchGame = (patch: (game: Game) => Partial<Game>) => {
      const { game } = get()
      if (game) set({ game: { ...game, ...patch(game), updatedAt: deps.now() } })
    }
    const patchPrefs = (patch: Partial<Prefs>) => set({ prefs: { ...get().prefs, ...patch } })

    return {
      screen: initial.game ? 'game' : 'home',
      game: initial.game,
      customRoles: initial.customRoles,
      prefs: initial.prefs,
      saveFailed: initial.saveFailed ?? false,

      goto: (screen) => set({ screen }),
      updateDraft: (draft) => patchPrefs({ lastSetup: draft }),
      forgetPlayer: (name) =>
        patchPrefs({ knownPlayers: get().prefs.knownPlayers.filter((n) => n !== name) }),

      startGame: (draft, players, nightOrder) => {
        const library = rolesById(get().customRoles)
        const roleIds = [...new Set(players.map((p) => p.roleId))]
        const now = deps.now()
        const game: Game = {
          schemaVersion: 1,
          id: deps.newId(),
          createdAt: now,
          updatedAt: now,
          setup: {
            players,
            roles: Object.fromEntries(roleIds.map((id) => [id, library[id]])),
            nightOrder,
            settings: draft.settings,
          },
          inputs: {},
          cursor: { phase: 0, stepId: firstStepId(0) },
          timers: {},
          ending: null,
        }
        const { prefs } = get()
        set({
          game,
          screen: 'game',
          prefs: {
            ...prefs,
            activeGameId: game.id,
            lastSetup: draft,
            nightOrder: mergeNightOrder(prefs.nightOrder, nightOrder),
            knownPlayers: rememberPlayers(
              prefs.knownPlayers,
              players.map((p) => p.name),
            ),
          },
        })
        deps.requestPersist()
      },

      setInput: (stepId, input) => patchGame((g) => ({ inputs: { ...g.inputs, [stepId]: input } })),
      moveCursor: (cursor) => patchGame(() => ({ cursor })),
      timer: (stepId, op) =>
        patchGame((g) => {
          const current = g.timers[stepId] ?? IDLE_TIMER
          const now = deps.now()
          const updated =
            op === 'start'
              ? startTimer(current, now)
              : op === 'pause'
                ? pauseTimer(current, now)
                : IDLE_TIMER
          return { timers: { ...g.timers, [stepId]: updated } }
        }),
      endGame: (winner, manual) =>
        patchGame((g) => ({ ending: { winner, manual, phase: g.cursor.phase } })),
      resumeGame: () => patchGame(() => ({ ending: null })),

      saveCustomRole: (role) => {
        set({ customRoles: [...get().customRoles.filter((r) => r.id !== role.id), role] })
        writeNow((db) => repo.saveCustomRole(db, role))
      },
      deleteCustomRole: (id) => {
        set({ customRoles: get().customRoles.filter((r) => r.id !== id) })
        writeNow((db) => repo.deleteCustomRole(db, id))
      },
      flush: async () => {
        await Promise.all([gameQueue.flush(), ...[...prefQueues.values()].map((q) => q.flush())])
      },
    }
  })

  report = (ok) => {
    if (store.getState().saveFailed === ok) store.setState({ saveFailed: !ok })
  }

  store.subscribe((state, prev) => {
    if (state.game && state.game !== prev.game) gameQueue.push(state.game)
    for (const key of Object.keys(state.prefs) as (keyof Prefs)[]) {
      if (state.prefs[key] !== prev.prefs[key]) prefQueue(key).push(state.prefs[key])
    }
  })

  return store
}

export type AppStore = ReturnType<typeof createAppStore>
