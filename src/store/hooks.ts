import { useContext, useMemo } from 'react'
import { useStore } from 'zustand'
import { deriveGame } from '@/domain/derive'
import type { App, AppActions, AppStore } from './appStore'
import { StoreContext } from './context'

function useAppStore(): AppStore {
  const store = useContext(StoreContext)
  if (!store) throw new Error('StoreProvider is missing')
  return store
}

// Selectors must return stable references; zustand v5 loops on a fresh object per call.
export const useApp = <T>(selector: (state: App) => T): T => useStore(useAppStore(), selector)

// Actions are created once, so the first state object carries stable function references.
export function useActions(): AppActions {
  const store = useAppStore()
  return useMemo(() => store.getState(), [store])
}

export function useGame() {
  const game = useApp((s) => s.game)
  const derived = useMemo(
    () => (game ? deriveGame(game.setup, game.inputs, game.cursor.phase) : null),
    [game],
  )
  if (!game || !derived) throw new Error('No active game')
  return { game, derived }
}
