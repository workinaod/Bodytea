// ============================================================
// Muscle activation map: front and back figures with
// individually fillable regions. Inline SVG, fully offline.
//
// Two rules make it read as a body rather than an action figure:
//
// 1. The silhouette is built from OVERLAPPING shapes in one fill.
//    Butted shapes leave hairline seams at every joint, which is
//    what made the old figure look like moulded plastic parts.
// 2. Muscles are BELLIES, not rounded rectangles: narrow at the
//    tendon, widest through the middle. `belly()` generates that
//    shape so every group is consistently organic.
//
// Regions are separated by a faint dark line rather than a
// background-coloured stroke, so the body stays continuous and
// the anatomy reads on top of it.
// ============================================================

import type { MuscleRegion } from '../plan/muscleRegions'
export type { MuscleRegion } from '../plan/muscleRegions'

export const ALL_REGIONS: MuscleRegion[] = [
  'delts-front', 'delts-side', 'delts-rear', 'traps', 'chest-upper', 'chest',
  'biceps', 'triceps', 'forearms', 'abs', 'obliques', 'hip-flexors', 'quads',
  'adductors', 'tibialis', 'calves', 'achilles-feet', 'lats', 'mid-back',
  'lower-back', 'glutes', 'hamstrings', 'full-body', 'heart',
]

type FillFn = (r: MuscleRegion) => { fill: string; opacity: number }

const BASE = { fill: 'rgba(255,255,255,0.085)', opacity: 1 }
const PRIMARY = { fill: 'var(--color-accent)', opacity: 0.95 }
const SECONDARY = { fill: 'var(--color-accent)', opacity: 0.34 }
const FULLBODY = { fill: 'var(--color-accent)', opacity: 0.5 }

function makeFill(primary: MuscleRegion[], secondary: MuscleRegion[]): FillFn {
  const full = primary.includes('full-body') || secondary.includes('full-body')
  return (r) => {
    if (primary.includes(r)) return PRIMARY
    if (secondary.includes(r)) return SECONDARY
    if (full) return FULLBODY
    return BASE
  }
}

/**
 * Separation between adjacent muscles. Deliberately faint: outlining
 * every group at full strength turns the figure into plate armour, which
 * is the other way to fail at looking like a body.
 */
const S = { stroke: 'rgba(0,0,0,0.28)', strokeWidth: 0.4 }

/**
 * A muscle belly. Narrow where it becomes tendon, widest through the
 * middle, and able to lean so a limb muscle follows the bone rather than
 * standing straight up.
 */
function belly(
  xTop: number,
  yTop: number,
  xBot: number,
  yBot: number,
  wTop: number,
  wMid: number,
  wBot: number,
  bulge = 0.5,
): string {
  const xMid = xTop + (xBot - xTop) * 0.5
  const yMid = yTop + (yBot - yTop) * bulge
  const c1 = yTop + (yMid - yTop) * 0.55
  const c2 = yMid + (yBot - yMid) * 0.45
  return [
    `M${xTop - wTop / 2},${yTop}`,
    `C${xMid - wMid / 2},${c1} ${xMid - wMid / 2},${c2} ${xBot - wBot / 2},${yBot}`,
    `L${xBot + wBot / 2},${yBot}`,
    `C${xMid + wMid / 2},${c2} ${xMid + wMid / 2},${c1} ${xTop + wTop / 2},${yTop}`,
    'Z',
  ].join(' ')
}

/**
 * The body underneath. Every piece overlaps its neighbour and shares one
 * fill, so the figure has no seams: shoulders melt into arms, hips into
 * thighs, exactly as a silhouette should.
 */
function Silhouette({ back = false }: { back?: boolean }) {
  return (
    <g fill="rgba(255,255,255,0.055)">
      {/* head + neck */}
      <ellipse cx="50" cy="14" rx="7.6" ry="9.2" />
      <path d="M45.6,20 L54.4,20 L55.5,30 L44.5,30 Z" />
      {/* torso: shoulders, waist, hips, all one sweep */}
      <path
        d="M44,27 C38,28.5 32,30.5 29.6,34.5 C27.4,38.5 28.4,45 30.6,52
           C32.6,58.5 34.4,66 35.6,74 C36.4,80 36.2,86 35.2,92
           C34.6,96 35.4,98.5 38,99 L62,99 C64.6,98.5 65.4,96 64.8,92
           C63.8,86 63.6,80 64.4,74 C65.6,66 67.4,58.5 69.4,52
           C71.6,45 72.6,38.5 70.4,34.5 C68,30.5 62,28.5 56,27 Z"
      />
      {/* arms: upper, fore, hand, each overlapping the last */}
      {[1, -1].map((s) => (
        <g key={s} transform={s === 1 ? undefined : 'translate(100,0) scale(-1,1)'}>
          <path d="M31.5,31 C26.5,32.5 24,36.5 23.2,42.5 L21,62 L27.5,63 L29.5,44 C30.2,38.5 31.8,34.5 34,32.5 Z" />
          <path d="M21.2,60.5 L27.6,61.5 L25.4,84 C25,88 24.4,91.5 23.6,93.5 L19.4,93 C18.8,90.5 18.6,86.5 19,82.5 Z" />
          <path d="M19.6,90.5 L23.8,91 C24.6,94 24.8,97.5 23.8,99.5 C22.4,101 20,100.6 19,99 C18.4,96.5 18.8,93 19.6,90.5 Z" />
        </g>
      ))}
      {/* legs: thigh into shin into foot, overlapping */}
      {[1, -1].map((s) => (
        <g key={s} transform={s === 1 ? undefined : 'translate(100,0) scale(-1,1)'}>
          <path d="M35.4,95 C33.6,104 33.2,116 34,128 C34.5,136 35,142 35.6,147 L44.4,147 C44.6,141 44.8,133 45,124 C45.2,113 45.6,103 46,95 Z" />
          <path d="M35.4,144 C34.8,152 35.4,163 36.4,172 C37,178 37.4,182 37.8,185 L44.2,185 C44.4,181 44.6,175 44.8,168 C45,159 45,151 44.8,144 Z" />
          <path d="M37.4,182 C36.6,186 36.4,189 36.8,190.5 L47.5,190.5 C48.2,189 48,186.5 46.6,182 Z" />
        </g>
      ))}
      {back && null}
    </g>
  )
}

function FrontFigure({ f, showHeart, heartHot }: { f: FillFn; showHeart: boolean; heartHot: boolean }) {
  const both = (d: string, fill: ReturnType<FillFn>) => (
    <>
      <path d={d} {...S} {...fill} />
      <path d={d} {...S} {...fill} transform="translate(100,0) scale(-1,1)" />
    </>
  )
  return (
    <svg viewBox="0 0 100 200" className="h-full w-auto">
      <Silhouette />

      {/* traps: the slope from neck to shoulder */}
      {both('M45.5,25.5 C41,27 35,29 31.5,31.5 C34,33.5 40,32.5 45.5,31 Z', f('traps'))}

      {/* deltoid cap, wrapping the shoulder */}
      {both(
        'M31.2,31.2 C26.6,32.8 23.9,36.6 23.2,42.4 C25.6,45.4 30.4,45.6 33.4,43 C34.4,38.4 34.6,34.4 34.2,32.4 Z',
        bestOf(f, ['delts-front', 'delts-side']),
      )}

      {/* upper chest, then the main fan */}
      {both('M35.4,32.6 C39.6,31.4 44.6,31 47.4,31.6 L47.4,39.4 C43.4,40.2 38,39.6 34.6,38.2 Z', f('chest-upper'))}
      {both('M34.4,39.6 C38.4,41 43.6,41.6 47.4,41 L47.4,53.6 C43.2,56.4 36.8,53.4 33.6,46.6 Z', f('chest'))}

      {showHeart && (
        <path
          d="M50,49 C48.2,45.8 44.6,45.6 43.6,48.2 C42.8,50.4 44.8,52.6 50,56 C55.2,52.6 57.2,50.4 56.4,48.2 C55.4,45.6 51.8,45.8 50,49 Z"
          fill={heartHot ? 'var(--color-danger)' : 'var(--color-surface-2)'}
          stroke="var(--color-danger)"
          strokeWidth="1"
          opacity={heartHot ? 1 : 0.6}
        />
      )}

      {/* biceps: a real belly, peaking above the elbow */}
      {both(belly(28.8, 41, 25.4, 61, 6.4, 8.6, 4.4, 0.42), f('biceps'))}
      {/* forearm: thick under the elbow, tapering into the wrist */}
      {both(belly(25, 62.5, 21.6, 88, 6.4, 7.4, 3.6, 0.3), f('forearms'))}

      {/* abs: two columns of segments, not a grid on a box */}
      {[57.5, 64.5, 71.5, 78].map((y, i) => (
        <g key={y}>
          {both(
            `M43.2,${y} C45.6,${y - 0.9} 48.4,${y - 0.9} 48.9,${y}
             L48.9,${y + 5.4} C48,${y + 6.3} 45,${y + 6.3} 43.4,${y + 5.4} Z`,
            f('abs'),
          )}
          {i === 3 && null}
        </g>
      ))}

      {/* obliques: the wedge from ribs to hip */}
      {both('M36.4,56.5 C39.6,57.8 41.4,58.4 42.4,58.8 L42,80.4 C39.4,81 37.4,78.6 36.2,73 C35.6,67 35.8,60.6 36.4,56.5 Z', f('obliques'))}

      {/* hip flexors: the V into the groin */}
      {both('M37.6,83.4 C40.4,87.4 44,91.2 47.6,93.8 L45.2,96.8 C41,94 37.4,89.6 36,85.4 Z', f('hip-flexors'))}

      {/* adductors: the inner thigh */}
      {both(belly(46.8, 98, 45.6, 124, 4.2, 5.2, 2.2, 0.3), f('adductors'))}

      {/* quads: sweeping out then in above the knee */}
      {both(belly(39.4, 97, 40.6, 141, 11.6, 13.4, 8, 0.45), f('quads'))}

      {/* tibialis: the shin muscle, thin and long */}
      {both(belly(40.6, 150, 42.4, 180, 5.4, 6, 3, 0.32), f('tibialis'))}
    </svg>
  )
}

function BackFigure({ f }: { f: FillFn }) {
  const both = (d: string, fill: ReturnType<FillFn>) => (
    <>
      <path d={d} {...S} {...fill} />
      <path d={d} {...S} {...fill} transform="translate(100,0) scale(-1,1)" />
    </>
  )
  return (
    <svg viewBox="0 0 100 200" className="h-full w-auto">
      <Silhouette back />

      {/* traps: the real kite, neck to shoulders to mid-back */}
      <path
        d="M50,24 C44,25.5 36,28.5 31.6,31.6 C35,34.4 41,35.6 46.4,36.4 L50,54.5
           L53.6,36.4 C59,35.6 65,34.4 68.4,31.6 C64,28.5 56,25.5 50,24 Z"
        {...S}
        {...f('traps')}
      />

      {/* rear deltoid */}
      {both(
        'M31.2,31.2 C26.6,32.8 23.9,36.6 23.2,42.4 C25.6,45.4 30.4,45.6 33.4,43 C34.4,38.4 34.6,34.4 34.2,32.4 Z',
        bestOf(f, ['delts-rear', 'delts-side']),
      )}

      {/* lats: the wing, wide at the armpit, tapering to the waist */}
      {both(
        'M33.6,40.4 C36.6,45.6 41.4,48.6 46.6,50 L46.6,68.4 C41,70.6 36.2,66.4 34,58 C32.8,52 32.8,45.4 33.6,40.4 Z',
        f('lats'),
      )}

      {/* mid-back: between the shoulder blades */}
      {both('M46.8,52.4 C44.4,52 42.4,51.4 41,50.6 L41,63.6 C42.6,64.6 44.8,65.2 46.8,65.4 Z', f('mid-back'))}

      {/* lower back: the erectors, two columns into the sacrum */}
      {both(belly(45.6, 67, 46.4, 86, 6.4, 7.2, 4.6, 0.4), f('lower-back'))}

      {/* glutes */}
      {both(
        'M35.8,85 C33.6,88.8 33.4,94.4 35,98.8 C37,102 42,102.6 45.8,100.4 C48.2,97.4 48.8,91.6 47.6,87.4 C44.6,84.2 39.2,83.4 35.8,85 Z',
        f('glutes'),
      )}

      {/* hamstrings */}
      {both(belly(39.8, 101, 40.8, 140, 11.4, 12.4, 7.4, 0.42), f('hamstrings'))}

      {/* calves: the diamond, high and wide, into the achilles */}
      {both(belly(40.2, 147, 41.8, 175, 9, 10.6, 3.8, 0.34), f('calves'))}

      {/* achilles into the heel */}
      {both('M40.6,173 C40,177.5 39.8,181 40,183.5 L44,183.5 C44.2,180.5 44.2,177 44,173 Z', f('achilles-feet'))}
      {both('M37.6,182.5 C36.8,186.5 36.6,189.2 37,190.5 L47.4,190.5 C48,189 47.8,186.6 46.6,182.5 Z', f('achilles-feet'))}
    </svg>
  )
}

/** The strongest fill among several regions (shared shapes like shoulder caps). */
function bestOf(f: FillFn, regions: MuscleRegion[]) {
  let best = BASE
  for (const r of regions) {
    const v = f(r)
    if (v.fill !== BASE.fill && (best.fill === BASE.fill || v.opacity > best.opacity)) best = v
  }
  return best
}

export function MuscleMap({
  primary,
  secondary = [],
  compact = false,
}: {
  primary: MuscleRegion[]
  secondary?: MuscleRegion[]
  compact?: boolean
}) {
  const f = makeFill(primary, secondary)
  const heartListed = primary.includes('heart') || secondary.includes('heart')
  const heartHot = primary.includes('heart')

  return (
    <div>
      <div className={`flex items-stretch justify-center gap-4 ${compact ? 'h-36' : 'h-56'}`}>
        <div className="flex flex-col items-center">
          <FrontFigure f={f} showHeart={heartListed} heartHot={heartHot} />
          {!compact && <span className="eyebrow mt-1 text-ink-faint">front</span>}
        </div>
        <div className="flex flex-col items-center">
          <BackFigure f={f} />
          {!compact && <span className="eyebrow mt-1 text-ink-faint">back</span>}
        </div>
      </div>
      {!compact && (
        <div className="mt-2 flex items-center justify-center gap-4 text-[10px] font-semibold text-ink-faint">
          <span className="flex items-center gap-1.5">
            <i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: 'var(--color-accent)' }} />
            primary
          </span>
          <span className="flex items-center gap-1.5">
            <i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: 'var(--color-accent)', opacity: 0.34 }} />
            assisting
          </span>
        </div>
      )}
    </div>
  )
}
