import type { ReactNode } from 'react'

export function StepCard({
  title,
  aside,
  children,
}: {
  title: string
  aside?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-5 rounded-2xl bg-card p-5 shadow-lg">
      <header className="flex items-start justify-between gap-3">
        <h2 className="font-display text-3xl leading-tight text-primary">{title}</h2>
        {aside}
      </header>
      {children}
    </section>
  )
}

export function Say({ children }: { children: ReactNode }) {
  return (
    <div className="border-l-4 border-primary/70 pl-3">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">Mondd:</p>
      <p className="text-lg italic">{children}</p>
    </div>
  )
}
