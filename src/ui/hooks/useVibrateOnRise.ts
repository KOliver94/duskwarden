import { useEffect, useRef } from 'react'

export function useVibrateOnRise(flag: boolean) {
  const previous = useRef(flag)
  useEffect(() => {
    if (flag && !previous.current) navigator.vibrate?.([200, 100, 200])
    previous.current = flag
  }, [flag])
}
