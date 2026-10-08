import { browserDevice, canVibrate, fireAlert } from '@/lib/alert'
import { useActions, useApp } from '@/store/hooks'
import { BottomSheet } from '@/ui/components/BottomSheet'
import { SwitchRow } from '@/ui/components/fields'
import { Button } from '@/ui/primitives/button'

export function AppSettingsSheet({ open, onClose }: { open: boolean; onClose(): void }) {
  const alerts = useApp((s) => s.prefs.alerts)
  const actions = useActions()
  return (
    <BottomSheet open={open} onClose={onClose} title="Beállítások">
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
        <Button variant="outline" size="touch" onClick={() => fireAlert(alerts, browserDevice)}>
          Próba
        </Button>
      </div>
    </BottomSheet>
  )
}
