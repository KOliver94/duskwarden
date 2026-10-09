import { useState } from 'react'
import { browserDevice, canVibrate, fireAlert, type VibrationResult } from '@/lib/alert'
import { useActions, useApp } from '@/store/hooks'
import { BottomSheet } from '@/ui/components/BottomSheet'
import { SwitchRow } from '@/ui/components/fields'
import { Button } from '@/ui/primitives/button'

const PROBE_TEXT: Partial<Record<VibrationResult, string>> = {
  blocked: 'A böngésző nem engedte a rezgést.',
  sent: 'Ha nem rezgett, nézd meg a telefon rezgésbeállításait és a Ne zavarjanak módot.',
}

function AlertSettings() {
  const alerts = useApp((s) => s.prefs.alerts)
  const actions = useActions()
  const [probe, setProbe] = useState<VibrationResult | null>(null)
  const probeText = probe && PROBE_TEXT[probe]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col">
        <SwitchRow
          label="Hang"
          checked={alerts.sound}
          onChange={(sound) => actions.setAlerts({ ...alerts, sound })}
        />
        <SwitchRow
          label="Rezgés"
          checked={alerts.vibration}
          onChange={(vibration) => actions.setAlerts({ ...alerts, vibration })}
        />
      </div>
      {!canVibrate() && (
        <p className="text-sm text-muted-foreground">
          Ezen az eszközön a böngésző nem tud rezegni.
        </p>
      )}
      <Button
        variant="outline"
        size="touch"
        onClick={() => setProbe(fireAlert(alerts, browserDevice))}
      >
        Próba
      </Button>
      {probeText && (
        <p role="status" className="text-sm text-muted-foreground">
          {probeText}
        </p>
      )}
    </div>
  )
}

export function AppSettingsSheet({ open, onClose }: { open: boolean; onClose(): void }) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Beállítások">
      <AlertSettings />
    </BottomSheet>
  )
}
