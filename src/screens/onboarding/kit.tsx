import type { ReactNode } from 'react'

// ============================================================
// The onboarding kit: a race bib, pinned over a dark room.
//
// Onboarding had been built out of the app's general UI — soft
// cards, rounded pills, a glowing accent on near-black — which
// is the look every generated app has. This is a deliberate
// break, and it only applies to the screens before somebody
// starts training. The app itself keeps its own components;
// nothing here is exported upward.
//
//   PAPER, NOT GLASS. Bone stock, black ink, one flat red. The
//   room behind it goes out of focus so the paper is the only
//   thing in focus. Ink on paper cannot glow, so nothing does.
//
//   RULES, NOT CARDS. Sections are hairlines and numbers, the
//   way a start list is. A card is a box you reach for when you
//   have not decided how things relate.
//
//   HARD EDGES. Nothing is rounded. A rounded rectangle on a
//   dark ground is the most-used shape in software and it says
//   nothing at all.
//
//   TYPE CARRIES IT. Condensed, uppercase, tight, large. The
//   question is the biggest thing on the screen because the
//   question IS the screen.
// ============================================================

/** Bone stock. Warm enough to read as paper, not as "light mode". */
export const PAPER = '#EAE7E0'
/** The ink. Never pure black — printed black never is. */
export const INK = '#0D0D0C'
/** One red, flat. Deeper than the app's screen accent, which glares on paper. */
export const RED = '#D8341A'

/**
 * The bib itself.
 *
 * Inset on every side so the blurred room shows as a frame: the paper
 * is pinned over the tunnel, not painted onto it. The grain is what
 * stops a flat #EAE7E0 fill from reading as a white div.
 */
export function Bib({ children }: { children: ReactNode }) {
  return (
    <div
      className="enter relative flex flex-1 flex-col px-6 pb-7 pt-6 shadow-[0_28px_60px_-20px_rgba(0,0,0,0.85)]"
      style={{ background: PAPER, color: INK }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.55] mix-blend-multiply"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/></filter><rect width='120' height='120' filter='url(%23n)' opacity='0.42'/></svg>\")",
        }}
      />
      <div className="relative flex flex-1 flex-col">{children}</div>
    </div>
  )
}

/**
 * Paper, or not.
 *
 * The landing screen IS the room, and the routine builder is a tool
 * rather than a question — both keep the app's own dark chrome. Every
 * question in between arrives on the bib.
 */
export function OnPaper({ on, step, children }: { on: boolean; step: number; children: ReactNode }) {
  // Keyed on the step so every screen re-mounts and plays its entrance:
  // the paper turns like a page rather than its contents swapping under
  // a sheet that never moves.
  return on ? <Bib key={step}>{children}</Bib> : <>{children}</>
}

/** The line above a title: where you are, in the app's voice. */
export function Kicker({ children }: { children: ReactNode }) {
  return (
    <div className="mb-3 text-[10px] font-black uppercase tracking-[0.26em]" style={{ color: RED }}>
      {children}
    </div>
  )
}

/** The question. One per screen, and the loudest thing on it. */
export function Title({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div>
      <h2 className="headline text-[40px] uppercase leading-[0.86] tracking-[-0.045em]">{children}</h2>
      {sub && <p className="mt-3 text-[13px] font-medium leading-snug opacity-60">{sub}</p>}
    </div>
  )
}

/**
 * A section label, ruled.
 *
 * The hairline running to the edge is what makes this a printed sheet
 * rather than a form: it says the section continues past the words.
 */
export function Label({ children, note }: { children: ReactNode; note?: string }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <span className="shrink-0 text-[10px] font-black uppercase tracking-[0.2em]">{children}</span>
      {note && <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.12em] opacity-45">{note}</span>}
      <span className="h-[1.5px] flex-1" style={{ background: 'rgba(13,13,12,0.22)' }} />
    </div>
  )
}

/**
 * A selectable option.
 *
 * Unselected is an outline on paper; selected is a solid block of ink.
 * No tint, no ring, no middle state — you can tell across a room which
 * one is on, which is the only job this control has.
 */
export function Tag({
  children,
  selected = false,
  onClick,
  className = '',
}: {
  children: ReactNode
  selected?: boolean
  onClick: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`press px-3.5 py-2.5 text-[12.5px] font-black uppercase leading-none tracking-[0.05em] transition-colors ${className}`}
      style={
        selected
          ? { background: INK, color: PAPER }
          : { boxShadow: `inset 0 0 0 1.5px rgba(13,13,12,0.28)`, color: INK }
      }
    >
      {children}
    </button>
  )
}

/**
 * A numbered row, edge to edge.
 *
 * The number is not decoration: these are an ordered list of things you
 * can pick, and a start list numbers its entries.
 */
export function Lane({
  n,
  children,
  onClick,
  selected = false,
}: {
  n: number
  children: ReactNode
  onClick: () => void
  selected?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className="press -mx-6 flex w-[calc(100%+3rem)] items-center justify-between px-6 py-4 text-left transition-colors"
      style={{
        background: selected ? INK : 'transparent',
        color: selected ? PAPER : INK,
        borderBottom: `1.5px solid ${selected ? INK : 'rgba(13,13,12,0.16)'}`,
      }}
    >
      <span className="headline text-[21px] uppercase leading-none tracking-[-0.025em]">{children}</span>
      <span
        className="num text-[13px] font-black tabular-nums"
        style={{ color: selected ? RED : 'rgba(13,13,12,0.35)' }}
      >
        {String(n).padStart(2, '0')}
      </span>
    </button>
  )
}

/** A tear-line. Marks the end of the questions and the start of the act. */
export function Perf() {
  return <div className="-mx-6 my-6" style={{ borderTop: `2px dashed rgba(13,13,12,0.28)` }} />
}

/** The way forward. A block, not a lozenge, and it never glows. */
export function Bar({
  children,
  onClick,
  disabled = false,
  tone = 'red',
  className = '',
}: {
  children: ReactNode
  onClick: () => void
  disabled?: boolean
  tone?: 'red' | 'ink'
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`press w-full py-[18px] text-[14px] font-black uppercase tracking-[0.12em] transition-opacity disabled:opacity-25 ${className}`}
      style={tone === 'red' ? { background: RED, color: '#fff' } : { background: INK, color: PAPER }}
    >
      {children}
    </button>
  )
}

/** The quiet door out of a screen. */
export function Quiet({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="press w-full py-3 text-[11px] font-black uppercase tracking-[0.18em] opacity-50"
    >
      {children}
    </button>
  )
}

/** A typed answer. A ruled blank to fill in, the way a form on paper is. */
export const fieldCls =
  'w-full border-b-2 bg-transparent px-0.5 py-3 text-[17px] font-bold outline-none transition-colors placeholder:font-medium ring-owned'
export const fieldStyle: React.CSSProperties = { borderColor: 'rgba(13,13,12,0.28)', color: INK }
