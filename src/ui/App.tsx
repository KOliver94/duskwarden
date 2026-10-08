import { MotionConfig } from 'motion/react'
import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { unlockAudio } from '@/lib/alert'
import { useApp } from '@/store/hooks'
import { SaveFailedBanner } from '@/ui/components/SaveFailedBanner'
import { UpdateBanner } from '@/ui/components/UpdateBanner'
import { EndScreen } from '@/ui/screens/end/EndScreen'
import { GameScreen } from '@/ui/screens/game/GameScreen'
import { HomeScreen } from '@/ui/screens/HomeScreen'
import { LibraryScreen } from '@/ui/screens/library/LibraryScreen'
import { SetupScreen } from '@/ui/screens/setup/SetupScreen'

export function App() {
  const screen = useApp((s) => s.screen)
  const saveFailed = useApp((s) => s.saveFailed)
  const hasGame = useApp((s) => s.game !== null)
  const ended = useApp((s) => s.game?.ending != null)
  // Registered here so the worker installs on the first visit; the reload offer stays on Home.
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW()
  useEffect(() => {
    // A touch counts as a user gesture only once it ends, so pointerup is the one that unlocks on phones.
    const events = ['pointerdown', 'pointerup'] as const
    events.forEach((event) => window.addEventListener(event, unlockAudio))
    return () => events.forEach((event) => window.removeEventListener(event, unlockAudio))
  }, [])

  return (
    <MotionConfig reducedMotion="user">
      <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col">
        {saveFailed && <SaveFailedBanner />}
        {screen === 'home' && needRefresh && (
          <UpdateBanner onUpdate={() => void updateServiceWorker(true)} />
        )}
        {screen === 'home' && <HomeScreen />}
        {screen === 'setup' && <SetupScreen />}
        {screen === 'library' && <LibraryScreen />}
        {screen === 'game' && hasGame && !ended && <GameScreen />}
        {screen === 'game' && hasGame && ended && <EndScreen />}
        {screen === 'game' && !hasGame && <HomeScreen />}
      </div>
    </MotionConfig>
  )
}
