import type { ReactNode } from 'react'

// ============================================================
// A section that does not exist until the one before it is done.
//
// A form shows you everything and dares you to finish. A
// conversation shows you one thing, waits, then shows the next —
// and the same person who abandons the form answers every
// question in the conversation. That is the whole idea here.
//
// Two rules keep it from becoming a trap:
//
//   1. Nothing that gates the NEXT BUTTON is ever hidden. A
//      section can wait its turn; the way forward cannot.
//   2. Every gate has a way past it that costs nothing. An
//      optional box opens the next section when you type in it
//      OR when you tap away from it, so leaving it blank — the
//      whole point of optional — still moves you along.
//
// Mounting is the animation trigger: `when` false renders
// nothing, and the node plays `.enter` exactly once when it
// first arrives. Re-renders after that leave it alone, so
// nothing re-animates while somebody is typing.
// ============================================================

export function Reveal({
  when,
  children,
  className = '',
}: {
  when: boolean
  children: ReactNode
  className?: string
}) {
  if (!when) return null
  return <div className={`enter ${className}`}>{children}</div>
}
