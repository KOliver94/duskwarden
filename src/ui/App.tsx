import { MotionConfig } from 'motion/react'
import { useApp } from '@/store/hooks'
import { SaveFailedBanner } from '@/ui/components/SaveFailedBanner'
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
  return (
    <MotionConfig reducedMotion="user">
      <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col">
        {saveFailed && <SaveFailedBanner />}
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
