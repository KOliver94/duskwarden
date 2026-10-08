import { newId } from '@/lib/random'
import { openDb, type Db } from '@/storage/db'
import { DEFAULT_PREFS, loadCustomRoles, loadGame, loadPrefs } from '@/storage/repo'
import { createAppStore, type InitialState } from './appStore'

async function load(db: Db): Promise<InitialState> {
  const prefs = await loadPrefs(db)
  const customRoles = await loadCustomRoles(db)
  const game = prefs.activeGameId ? ((await loadGame(db, prefs.activeGameId)) ?? null) : null
  return { prefs, customRoles, game }
}

export async function bootstrap(dbName?: string) {
  const deps = {
    now: () => Date.now(),
    newId,
    requestPersist: () => void navigator.storage?.persist?.(),
    reopen: () => openDb(dbName),
  }
  try {
    const db = await openDb(dbName)
    return createAppStore({ ...deps, db }, await load(db))
  } catch {
    const empty = { prefs: DEFAULT_PREFS, customRoles: [], game: null, saveFailed: true }
    return createAppStore({ ...deps, db: null }, empty)
  }
}
