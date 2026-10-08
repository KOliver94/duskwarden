import { MotionConfig } from 'motion/react'
import { useApp } from '@/store/hooks'
import { SaveFailedBanner } from '@/ui/components/SaveFailedBanner'
import { HomeScreen } from '@/ui/screens/HomeScreen'

export function App() {
  const screen = useApp((s) => s.screen)
  const saveFailed = useApp((s) => s.saveFailed)
  return (
    <MotionConfig reducedMotion="user">
      <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col">
        {saveFailed && <SaveFailedBanner />}
        {screen === 'home' && <HomeScreen />}
      </div>
    </MotionConfig>
  )
}
