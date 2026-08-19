// ============================================================
// The renderer behind MuscleMap: one figure, drawn as a stack of
// real muscles instead of a silhouette with panels on it.
//
// What makes it read as a body rather than a diagram:
//
// 1. EVERY PART IS SCULPTED. A muscle at rest is not a flat fill;
//    it carries a gradient across its belly, so the figure shows
//    its anatomy the way an ecorche model does, lit or not.
// 2. ONE LIGHT SOURCE. A key light from the upper left and an
//    ambient shadow on the lower right are painted over the whole
//    body, clipped to its outline. Shared lighting is what fuses
//    forty shapes into one figure.
// 3. LIT MUSCLES GLOW. A working muscle takes the accent gradient
//    and a soft bloom, an assisting one a dimmer wash over its
//    sculpted base, so primary and assisting stay tellable apart
//    at a glance and at 72px.
//
// Draw order in `parts` IS anatomy: traps overlap delts, delts
// overlap pec and biceps, glutes overlap hamstrings. Later paths
// cover earlier ones, exactly like the tissue they stand for.
// ============================================================

import type { MuscleRegion } from '../../plan/muscleRegions'

/** How a piece's belly is lit: from above, the left, the right, or a radial dome. */
export type Sculpt = 'v' | 'l' | 'r' | 'c'

export interface Piece {
  /** Region that lights this piece; null = body that never lights (head, hands, bone). */
  r: MuscleRegion | null
  /** Path for the viewer-left side (or the whole width when `mid` is set). */
  d: string
  /** Gradient orientation. Defaults to 'v'. */
  g?: Sculpt
  /** Fiber and definition lines drawn over the fill, faint at rest, darker when lit. */
  f?: string[]
  /** A centred shape spanning both sides: drawn once, never mirrored. */
  mid?: boolean
}

export interface FigureData {
  /** Unique def prefix per figure ('af' front, 'ab' back) so clip ids never collide. */
  id: string
  /** The whole-body outline: ground fill behind the muscles and the clip for the light pass. */
  outline: string
  parts: Piece[]
}

export type PieceState = 'base' | 'primary' | 'secondary' | 'wash'
export type StateFn = (r: MuscleRegion | null) => PieceState

/** Neutral sculpt: dark warm clay, readable on the app's near-black cards. */
const SCULPT_STOPS = (
  <>
    <stop offset="0" stopColor="#4a4a52" />
    <stop offset="0.45" stopColor="#36363d" />
    <stop offset="1" stopColor="#232327" />
  </>
)

/** Working muscle: the brand heat, hottest where the light hits. */
const LIT_STOPS = (
  <>
    <stop offset="0" stopColor="#ff9b70" />
    <stop offset="0.45" stopColor="#ff5430" />
    <stop offset="1" stopColor="#b52c12" />
  </>
)

const GRAD_AXES: Record<Sculpt, { x1: number; y1: number; x2: number; y2: number }> = {
  v: { x1: 0.25, y1: 0, x2: 0.6, y2: 1 },
  l: { x1: 0, y1: 0.1, x2: 1, y2: 0.7 },
  r: { x1: 1, y1: 0.1, x2: 0, y2: 0.7 },
  c: { x1: 0.3, y1: 0, x2: 0.7, y2: 1 },
}

const MIRROR = 'translate(100,0) scale(-1,1)'

function Defs({ id, outline }: { id: string; outline: string }) {
  return (
    <defs>
      {(Object.keys(GRAD_AXES) as Sculpt[]).map((k) => {
        const a = GRAD_AXES[k]
        return (
          <linearGradient key={k} id={`${id}-m${k}`} x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2}>
            {SCULPT_STOPS}
          </linearGradient>
        )
      })}
      {(Object.keys(GRAD_AXES) as Sculpt[]).map((k) => {
        const a = GRAD_AXES[k]
        return (
          <linearGradient key={k} id={`${id}-a${k}`} x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2}>
            {LIT_STOPS}
          </linearGradient>
        )
      })}
      {/* Key light and ambient shadow, painted over the whole body. */}
      <linearGradient id={`${id}-key`} x1="0" y1="0" x2="1" y2="0.35">
        <stop offset="0" stopColor="#ffffff" stopOpacity="0.14" />
        <stop offset="0.45" stopColor="#ffffff" stopOpacity="0.02" />
        <stop offset="1" stopColor="#000000" stopOpacity="0.22" />
      </linearGradient>
      <clipPath id={`${id}-clip`}>
        <path d={outline} />
        <path d={outline} transform={MIRROR} />
      </clipPath>
      <filter id={`${id}-glow`} x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0" dy="0" stdDeviation="1.3" floodColor="#ff4f30" floodOpacity="0.5" />
      </filter>
    </defs>
  )
}

function PiecePath({ piece, state, id }: { piece: Piece; state: PieceState; id: string }) {
  const g = piece.g ?? 'v'
  const lit = state === 'primary'
  const fill = lit ? `url(#${id}-a${g})` : `url(#${id}-m${g})`
  const stroke = lit ? 'rgba(60,8,0,0.5)' : 'rgba(0,0,0,0.42)'
  const overlay =
    state === 'secondary' ? 0.4 : state === 'wash' ? 0.32 : 0
  return (
    <>
      <path
        d={piece.d}
        fill={fill}
        stroke={stroke}
        strokeWidth={lit ? 0.4 : 0.3}
        strokeLinejoin="round"
        {...(lit ? { filter: `url(#${id}-glow)`, 'data-m': 'p' } : {})}
      />
      {overlay > 0 && (
        <path
          d={piece.d}
          fill="var(--color-accent)"
          opacity={overlay}
          data-m={state === 'secondary' ? 's' : 'w'}
        />
      )}
      {piece.f?.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke={lit ? 'rgba(80,12,0,0.55)' : 'rgba(0,0,0,0.3)'}
          strokeWidth={lit ? 0.4 : 0.3}
          strokeLinecap="round"
        />
      ))}
    </>
  )
}

export function AnatomyFigure({
  data,
  state,
  heart,
}: {
  data: FigureData
  state: StateFn
  /** undefined = no heart drawn; 'hot' = working, 'listed' = present but assisting. */
  heart?: 'hot' | 'listed'
}) {
  return (
    <svg viewBox="0 0 100 200" className="h-full w-auto" aria-hidden="true">
      <Defs id={data.id} outline={data.outline} />
      {/* A soft pool of shadow keeps the figure standing on something. */}
      <ellipse cx="50" cy="196.4" rx="15" ry="2" fill="#000000" opacity="0.4" />
      {/* Ground: the whole body in deep shadow, so nothing shows through a seam. */}
      <path d={data.outline} fill="#1a1a1e" />
      <path d={data.outline} fill="#1a1a1e" transform={MIRROR} />
      {data.parts.map((p, i) => {
        const s = state(p.r)
        const el = <PiecePath piece={p} state={s} id={data.id} />
        return p.mid ? (
          <g key={i}>{el}</g>
        ) : (
          <g key={i}>
            {el}
            <g transform={MIRROR}>{el}</g>
          </g>
        )
      })}
      {heart && (
        <path
          d="M53.2,49.6 C51.9,47.6 49.5,47.5 48.8,49.3 C48.2,50.8 49.6,52.4 53.2,54.7 C56.8,52.4 58.2,50.8 57.6,49.3 C56.9,47.5 54.5,47.6 53.2,49.6 Z"
          fill={heart === 'hot' ? 'var(--color-danger)' : 'var(--color-surface-2)'}
          stroke="var(--color-danger)"
          strokeWidth="0.8"
          opacity={heart === 'hot' ? 1 : 0.7}
          {...(heart === 'hot' ? { filter: `url(#${data.id}-glow)` } : {})}
        />
      )}
      {/* The shared light pass that fuses the stack into one body. */}
      <g clipPath={`url(#${data.id}-clip)`}>
        <rect x="0" y="0" width="100" height="200" fill={`url(#${data.id}-key)`} />
      </g>
    </svg>
  )
}
