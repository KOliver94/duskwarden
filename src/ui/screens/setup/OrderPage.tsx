import type { RoleDef } from '@/domain/types'
import { SortableList } from '@/ui/components/SortableList'
import { ACTION_LABEL } from '@/ui/labels'

export function OrderPage({
  order,
  roles,
  onChange,
}: {
  order: string[]
  roles: Record<string, RoleDef>
  onChange(order: string[]): void
}) {
  if (order.length === 0) {
    return <p className="text-muted-foreground">Ebben a játékban éjjel senki sem ébred.</p>
  }
  return (
    <div className="flex flex-col gap-6">
      <p className="text-muted-foreground">
        Húzd a szerepeket abba a sorrendbe, ahogy éjjel ébrednek.
      </p>
      <SortableList
        items={order}
        getId={(id) => id}
        onReorder={onChange}
        renderItem={(id, handle) => (
          <div className="flex h-14 items-center gap-2 rounded-xl bg-card pr-4">
            {handle}
            <span className="flex-1 font-medium">{roles[id].name}</span>
            <span className="text-sm text-muted-foreground">{ACTION_LABEL[roles[id].action]}</span>
          </div>
        )}
      />
    </div>
  )
}
