import { BUILT_IN_ORDER } from '@/domain/roles'
import type { Game, RoleDef } from '@/domain/types'
import type { Db, Prefs } from './db'

export const DEFAULT_PREFS: Prefs = {
  activeGameId: null,
  nightOrder: BUILT_IN_ORDER,
  lastSetup: null,
  knownPlayers: [],
  alerts: { sound: true, vibration: true },
}

const PREF_KEYS = Object.keys(DEFAULT_PREFS) as (keyof Prefs)[]

export async function loadPrefs(db: Db): Promise<Prefs> {
  const store = db.transaction('prefs').store
  const values = await Promise.all(PREF_KEYS.map((key) => store.get(key)))
  return Object.fromEntries(
    PREF_KEYS.map((key, i) => [key, values[i] === undefined ? DEFAULT_PREFS[key] : values[i]]),
  ) as unknown as Prefs
}

export const savePref = <K extends keyof Prefs>(db: Db, key: K, value: Prefs[K]) =>
  db.put('prefs', value, key)

export const loadGame = (db: Db, id: string) => db.get('games', id)
export const saveGame = (db: Db, game: Game) => db.put('games', game)
export const loadCustomRoles = (db: Db) => db.getAll('customRoles')
export const saveCustomRole = (db: Db, role: RoleDef) => db.put('customRoles', role)
export const deleteCustomRole = (db: Db, id: string) => db.delete('customRoles', id)
