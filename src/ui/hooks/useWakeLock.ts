import { useEffect } from 'react'

export function useWakeLock() {
  useEffect(() => {
    if (!('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    let disposed = false
    const acquire = async () => {
      try {
        lock = await navigator.wakeLock.request('screen')
        if (disposed) void lock.release()
      } catch {
        // Denied in battery saver or without a user gesture; the game works without it.
      }
    }
    // The browser drops the lock whenever the page is hidden.
    const onVisibility = () => document.visibilityState === 'visible' && void acquire()
    void acquire()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      disposed = true
      document.removeEventListener('visibilitychange', onVisibility)
      void lock?.release()
    }
  }, [])
}
