import confetti from 'canvas-confetti'
import { useEffect } from 'react'
import { useActions, useGame } from '@/store/hooks'
import { Button } from '@/ui/primitives/button'
import { GameReport } from './GameReport'

export function EndScreen() {
  const { game, derived } = useGame()
  const actions = useActions()
  const { winner } = game.ending!

  useEffect(() => {
    if (winner === 'nobody') return
    void confetti({
      particleCount: 140,
      spread: 80,
      origin: { y: 0.3 },
      colors: ['#f2c26b', '#e9e6f5', '#c0392b'],
      disableForReducedMotion: true,
    })
  }, [winner])

  return (
    <GameReport game={game} derived={derived} onBack={() => {}}>
      <Button size="touch" variant="secondary" onClick={actions.resumeGame}>
        Vissza a játékhoz
      </Button>
      <div className="grid grid-cols-2 gap-3">
        <Button size="touch" variant="outline" onClick={() => actions.goto('setup')}>
          Új játék
        </Button>
        <Button size="touch" variant="ghost" onClick={() => actions.goto('home')}>
          Kezdőlap
        </Button>
      </div>
    </GameReport>
  )
}
