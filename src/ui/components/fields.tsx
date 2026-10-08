import type { ReactNode } from 'react'
import { Input } from '@/ui/primitives/input'
import { Switch } from '@/ui/primitives/switch'

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  placeholder,
}: {
  label: string
  value: number | undefined
  onChange(value: number | undefined): void
  min: number
  max: number
  placeholder?: string
}) {
  return (
    <Field label={label}>
      <Input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        placeholder={placeholder}
        value={value ?? ''}
        className="h-14 text-base"
        onChange={(event) => {
          const raw = event.target.value
          if (raw === '') return onChange(undefined)
          const n = Math.round(Number(raw))
          if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)))
        }}
      />
    </Field>
  )
}

export function SwitchRow({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange(checked: boolean): void
}) {
  return (
    <label className="flex min-h-16 items-center justify-between gap-4 border-b border-border py-2">
      <span>{label}</span>
      <Switch size="lg" checked={checked} onCheckedChange={onChange} />
    </label>
  )
}
