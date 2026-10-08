import { cn } from 'cn'

export function ChoiceGroup<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T | undefined
  options: { value: T; label: string }[]
  onChange(value: T): void
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          onClick={() => onChange(option.value)}
          className={cn(
            'h-12 rounded-xl border-2 px-4 text-sm font-medium transition-colors',
            option.value === value
              ? 'border-primary bg-primary/15 text-foreground'
              : 'border-border bg-secondary text-muted-foreground',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
