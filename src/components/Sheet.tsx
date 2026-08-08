import type { ReactNode } from 'react'

/**
 * Bottom sheet. `locked` removes every dismiss affordance — used by
 * flows the user must answer (SkipFlow, reconcile confrontations).
 */
export function Sheet({
  open,
  onClose,
  children,
  locked = false,
  title,
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
  locked?: boolean
  title?: string
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="absolute inset-0 bg-black/70 animate-fade-in"
        onClick={locked ? undefined : onClose}
      />
      <div className="animate-slide-up relative max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border-t border-edge bg-bg pb-[max(env(safe-area-inset-bottom),16px)]">
        <div className="sticky top-0 z-10 bg-bg/95 px-5 pb-1 pt-3 backdrop-blur">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-edge" />
          <div className="flex items-center justify-between">
            {title ? <h3 className="text-[17px] font-black tracking-tight">{title}</h3> : <span />}
            {!locked && (
              <button
                onClick={onClose}
                className="rounded-full bg-surface-2 px-3 py-1 text-[12px] font-bold text-ink-dim"
              >
                Close
              </button>
            )}
          </div>
        </div>
        <div className="px-5 pt-2">{children}</div>
      </div>
    </div>
  )
}
