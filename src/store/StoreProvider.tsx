import type { ReactNode } from 'react'
import type { AppStore } from './appStore'
import { StoreContext } from './context'

export function StoreProvider({ store, children }: { store: AppStore; children: ReactNode }) {
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}
