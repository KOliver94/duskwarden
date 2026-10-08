import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/ui/primitives/alert-dialog'

export interface ConfirmRequest {
  title: string
  body?: string
  cancelLabel: string
  confirmLabel: string
  destructive?: boolean
  onConfirm(): void
  onCancel?(): void
}

export function useConfirm() {
  const [request, setRequest] = useState<ConfirmRequest | null>(null)
  // A handler may open the next dialog before Radix reports the close; keep that newer request.
  const close = (closed: ConfirmRequest) =>
    setRequest((current) => (current === closed ? null : current))

  const dialog = (
    <AlertDialog
      open={request !== null}
      onOpenChange={(open) => !open && request && close(request)}
    >
      {request && (
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-2xl">{request.title}</AlertDialogTitle>
            {request.body && (
              <AlertDialogDescription className="text-base">{request.body}</AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel size="touch" onClick={() => request.onCancel?.()}>
              {request.cancelLabel}
            </AlertDialogCancel>
            <AlertDialogAction
              size="touch"
              variant={request.destructive ? 'destructive' : 'default'}
              onClick={() => request.onConfirm()}
            >
              {request.confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      )}
    </AlertDialog>
  )

  return { ask: setRequest, dialog, isOpen: request !== null, dismiss: () => setRequest(null) }
}
