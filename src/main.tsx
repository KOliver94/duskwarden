import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/index.css'
import { bootstrap } from '@/store/bootstrap'
import { StoreProvider } from '@/store/StoreProvider'
import { App } from '@/ui/App'

void bootstrap().then((store) =>
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <StoreProvider store={store}>
        <App />
      </StoreProvider>
    </StrictMode>,
  ),
)
