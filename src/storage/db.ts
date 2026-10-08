import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { SetupDraft } from '@/domain/setup'
import type { Game, RoleDef } from '@/domain/types'

export interface Prefs {
  activeGameId: string | null
  nightOrder: string[]
  lastSetup: SetupDraft | null
  knownPlayers: string[]
}

interface Schema extends DBSchema {
  games: { key: string; value: Game }
  customRoles: { key: string; value: RoleDef }
  prefs: { key: keyof Prefs; value: Prefs[keyof Prefs] }
}

export type Db = IDBPDatabase<Schema>

export function openDb(name = 'duskwarden'): Promise<Db> {
  return openDB<Schema>(name, 1, {
    upgrade(db, oldVersion) {
      // One block per released version. Never edit a released block; append a new one.
      if (oldVersion < 1) {
        db.createObjectStore('games', { keyPath: 'id' })
        db.createObjectStore('customRoles', { keyPath: 'id' })
        db.createObjectStore('prefs')
      }
    },
  })
}
