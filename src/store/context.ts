import { createContext } from 'react'
import type { AppStore } from './appStore'

export const StoreContext = createContext<AppStore | null>(null)
