import { useEffect, useRef } from 'react'
import { browserDevice, fireAlert } from '@/lib/alert'
import { useApp } from '@/store/hooks'

export function useExpiryAlert(expired: boolean) {
  const alerts = useApp((s) => s.prefs.alerts)
  const previous = useRef(expired)
  useEffect(() => {
    if (expired && !previous.current) fireAlert(alerts, browserDevice)
    previous.current = expired
  }, [expired, alerts])
}
