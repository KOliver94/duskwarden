import { useEffect, useRef } from 'react'

export function useBackGuard(onBack: () => void) {
  const handler = useRef(onBack)
  useEffect(() => {
    handler.current = onBack
  })
  useEffect(() => {
    // Chrome skips history entries that never saw a user activation; the GM taps constantly, so ours stick.
    history.pushState({ duskwardenGuard: true }, '')
    const onPop = () => {
      history.pushState({ duskwardenGuard: true }, '')
      handler.current()
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
}
