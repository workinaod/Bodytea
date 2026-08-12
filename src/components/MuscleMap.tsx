// ============================================================
// Muscle activation map: front and back figures with
// individually fillable regions. Inline SVG, fully offline.
//
// Three rules keep it a body rather than an action figure:
//
// 1. AT REST IT IS A SILHOUETTE. An unlit muscle sits a hair
//    above the body fill and carries no outline at all. Outlining
//    every group all the time is what turned the old figure into
//    plate armour: a mannequin assembled from panels, with the
//    seams doing more work than the anatomy.
// 2. LIMBS ARE ONE PIECE. An arm is a single outline from
//    shoulder to fingertips, a leg one from hip to toe. Stacked
//    segments leave a visible cut at every joint no matter how
//    far they overlap.
// 3. BIG MUSCLES HAVE HEADS. A quad is three bellies, not a slab;
//    a hamstring is two; a calf is two. Drawing each group as one
//    rounded rectangle is what made the thighs read as shin pads.
//    `belly()` gives every head the same organic profile: narrow
//    at the tendon, widest through the middle, able to lean so it
//    follows the bone.
// ============================================================

import type { MuscleRegion } from '../plan/muscleRegions'
export type { MuscleRegion } from '../plan/muscleRegions'

export const ALL_REGIONS: MuscleRegion[] = [
  'delts-front', 'delts-side', 'delts-rear', 'traps', 'chest-upper', 'chest',
  'biceps', 'triceps', 'forearms', 'abs', 'obliques', 'hip-flexors', 'quads',
  'adductors', 'tibialis', 'calves', 'achilles-feet', 'lats', 'mid-back',
  'lower-back', 'glutes', 'hamstrings', 'full-body', 'heart',
]

type Paint = { fill: string; opacity: number }
type FillFn = (r: MuscleRegion) => Paint

const BODY = 'rgba(255,255,255,0.055)'
/** Barely above the body: relief you can see, not a panel you can count. */
const BASE: Paint = { fill: 'rgba(255,255,255,0.075)', opacity: 1 }
const PRIMARY: Paint = { fill: 'var(--color-accent)', opacity: 0.95 }
const SECONDARY: Paint = { fill: 'var(--color-accent)', opacity: 0.34 }
const FULLBODY: Paint = { fill: 'var(--color-accent)', opacity: 0.5 }

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
 * Separation between muscles, and only where there is something to
 * separate. A lit group gets a real edge so its heads read; an unlit
 * one gets almost nothing and melts back into the silhouette.
 */
function edge(p: Paint) {
  return p.fill === BASE.fill
    ? { stroke: 'rgba(0,0,0,0.16)', strokeWidth: 0.3 }
    : { stroke: 'rgba(0,0,0,0.3)', strokeWidth: 0.45 }
}

/**
 * A muscle belly. Narrow where it becomes tendon, widest through the
 * middle, and able to lean so a limb muscle follows the bone rather
 * than standing straight up.
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
  // A control point is not on the curve. Putting it at the intended
  // half-width leaves the drawn belly about a quarter thinner than
  // asked for, which is why the quads came out as three separate
  // stalks with the thigh showing between them. Solve for the control
  // offset that puts the CURVE where wMid says it should be:
  // x(0.5) = 0.25 * mean(ends) + 0.75 * control.
  const ctrl = (target: number, e0: number, e1: number) => (target - 0.25 * ((e0 + e1) / 2)) / 0.75
  const lTop = xTop - wTop / 2
  const lBot = xBot - wBot / 2
  const rTop = xTop + wTop / 2
  const rBot = xBot + wBot / 2
  const cl = ctrl(xMid - wMid / 2, lTop, lBot)
  const cr = ctrl(xMid + wMid / 2, rTop, rBot)
  return [
    `M${lTop},${yTop}`,
    `C${cl},${c1} ${cl},${c2} ${lBot},${yBot}`,
    `L${rBot},${yBot}`,
    `C${cr},${c2} ${cr},${c1} ${rTop},${yTop}`,
    'Z',
  ].join(' ')
}

/**
 * The body underneath. Head, torso, one arm and one leg, each limb a
 * single continuous outline so no joint shows a cut.
 */
function Silhouette() {
  return (
    <g fill={BODY}>
      <ellipse cx="50" cy="13.6" rx="7.4" ry="9" />
      <path d="M45.8,19.6 L54.2,19.6 L55.4,29.4 L44.6,29.4 Z" />

      {/* torso: shoulders, ribs, waist, hips, one sweep */}
      <path
        d="M44.4,27.2 C39.4,28 34,29.4 30.4,32.4 C28.4,35.6 28.6,41.6 30.8,49
           C32.6,55.4 34,62 34.7,69.6 C35.2,75.2 35.8,81.6 35.9,87.4
           C36,92.4 35.6,96.4 35.4,99.4 L64.6,99.4
           C64.4,96.4 64,92.4 64.1,87.4 C64.2,81.6 64.8,75.2 65.3,69.6
           C66,62 67.4,55.4 69.2,49 C71.4,41.6 71.6,35.6 69.6,32.4
           C66,29.4 60.6,28 55.6,27.2 Z"
      />

      {/* arm: shoulder to fingertips, one outline */}
      {[1, -1].map((s) => (
        <path
          key={s}
          transform={s === 1 ? undefined : 'translate(100,0) scale(-1,1)'}
          d="M31.6,30.4 C27,31.8 24.2,35 23.4,39.8 C22.9,45.6 23,52 23.2,58.6
             C22.6,65 21.8,72 21.4,79.6 C21.1,84.6 20.9,89 20.7,92.6
             C20.4,96.6 20.6,99.4 21.6,100.6 C22.8,101.6 24.2,101 24.8,99
             C25.4,96 25.9,92 26.4,87.6 C27.1,81 27.9,74 28.6,67.4
             C29.2,61.4 29.8,55.4 30.4,49.6 C31,44 31.8,39 33,35.6
             C33.8,33.4 34.4,32.2 34.8,31.6 Z"
        />
      ))}

      {/* leg: hip to toe, one outline */}
      {[1, -1].map((s) => (
        <path
          key={s}
          transform={s === 1 ? undefined : 'translate(100,0) scale(-1,1)'}
          d="M35.4,95.6 C33.6,102 33.2,110.8 33.9,120.4 C34.4,128 35.1,135.6 35.6,141.8
             C35.9,145.6 35.4,149.4 34.9,154.4 C34.4,160.4 34.7,167.6 35.5,174.6
             C36,179 36.4,182.6 36.6,185.2 C35.8,187.2 35.6,189.2 36.1,190.6
             L48.2,190.6 C48.6,189 48.2,186.6 46.8,184.6 C46.4,181.4 46,177 45.8,172
             C45.6,166 45.5,159.6 45.6,154 C45.7,149.2 45.8,145.4 46,141.8
             C46.4,135.6 46.9,128 47.2,120.4 C47.5,110.8 47.4,102 47.2,96 Z"
        />
      ))}
    </g>
  )
}

/**
 * Draws a muscle group: one outline, plus optional SEAMS.
 *
 * The heads of a big muscle are drawn as lines over a single shape
 * rather than as separate overlapping shapes. Stacking bellies left
 * gaps between them wherever the widths did not quite meet, so a
 * quad rendered as three stalks with thigh showing through. One
 * outline cannot do that, and the seams still give the definition.
 *
 * Seams only appear on a lit group. On a resting body they would be
 * scratches on a silhouette.
 */
function group(shape: string | string[], p: Paint, seams: string[] = [], mirror = true) {
  const e = edge(p)
  const shapes = Array.isArray(shape) ? shape : [shape]
  const lit = p.fill !== BASE.fill
  const half = (
    <>
      {shapes.map((d, i) => (
        <path key={i} d={d} {...e} {...p} />
      ))}
      {lit &&
        seams.map((d, i) => (
          <path key={`s${i}`} d={d} fill="none" stroke="rgba(0,0,0,0.34)" strokeWidth="0.5" strokeLinecap="round" />
        ))}
    </>
  )
  return (
    <>
      <g>{half}</g>
      {mirror && <g transform="translate(100,0) scale(-1,1)">{half}</g>}
    </>
  )
}

function FrontFigure({ f, showHeart, heartHot }: { f: FillFn; showHeart: boolean; heartHot: boolean }) {
  return (
    <svg viewBox="0 0 100 200" className="h-full w-auto">
      <Silhouette />

      {/* trapezius: the slope off the neck onto the shoulder */}
      {group('M45.6,25.4 C41.2,26.6 35.2,28.4 31.4,31.4 C34.4,33 40,32.2 45.6,30.6 Z', f('traps'))}

      {/* deltoid: a three-headed cap, not a pad */}
      {group(
        [
          'M31.4,30.8 C27.6,32 25,34.6 23.8,38.2 C26,39.6 29.6,39.2 32,37.4 C32.6,34.6 33.2,32.6 34,31.4 Z',
          'M23.6,38.8 C23,42.4 23.1,46 23.4,49.4 C26.4,49.6 30,48 31.2,45 C31.4,42 31.6,39.6 31.9,37.9 C29.4,39.8 25.8,40.2 23.6,38.8 Z',
        ],
        bestOf(f, ['delts-front', 'delts-side']),
      )}

      {/* pectoral: clavicular head above, the sternal fan below it */}
      {group(
        'M48.9,30.9 C43.6,30.9 38.6,31.8 35.2,33.4 L34.8,38.4 C39.4,37.1 44.2,36.9 48.9,37.5 Z',
        f('chest-upper'),
      )}
      {group(
        [
          `M48.9,38.4 C44,37.9 38.8,38.2 34.8,39.6
           C35.7,43.5 38.4,47.6 42,50.6 C44.4,52.5 47,53.3 48.9,52.9 Z`,
        ],
        f('chest'),
      )}

      {showHeart && (
        <path
          d="M50,48.4 C48.2,45.4 44.8,45.2 43.8,47.7 C43,49.8 44.9,51.9 50,55.2 C55.1,51.9 57,49.8 56.2,47.7 C55.2,45.2 51.8,45.4 50,48.4 Z"
          fill={heartHot ? 'var(--color-danger)' : 'var(--color-surface-2)'}
          stroke="var(--color-danger)"
          strokeWidth="1"
          opacity={heartHot ? 1 : 0.6}
        />
      )}

      {/* biceps: short and high, peaking well above the elbow */}
      {group(belly(28.4, 40.5, 26.2, 60, 6, 8, 3.6, 0.4), f('biceps'))}
      {/* forearm: thick under the elbow, tapering into the wrist */}
      {group(belly(25.6, 61.5, 22.8, 87, 6.2, 7.2, 3.2, 0.26), f('forearms'))}

      {/* rectus abdominis: segments shrink and close up going down */}
      {group(
        `M49.1,55.6 C47,55.4 44.8,55.6 43.3,56.2
         C43,63 43.2,70 43.8,76.4 C44.2,80.4 44.7,83 45.2,84.6
         C46.6,85.2 48,85.2 49.1,84.8 Z`,
        f('abs'),
        [
          'M43.5,62.4 L49.1,62.4',
          'M43.9,68.8 L49.1,68.8',
          'M44.4,75.2 L49.1,75.2',
        ],
      )}

      {/* obliques: the wedge from the lower ribs onto the hip */}
      {group(
        'M36.2,56.8 C39,57.8 40.8,58.4 42,58.8 C42.2,66.4 42,73.6 41.6,80.6 C39.2,80.8 37.4,78 36.4,72.8 C35.8,67 35.8,61 36.2,56.8 Z',
        f('obliques'),
      )}

      {/* hip flexors: the V running into the groin */}
      {group('M38.4,84.6 C40.8,88.4 43.8,91.6 46.8,93.8 L45.2,96.4 C41.6,94 38.6,90.4 37.2,86.4 Z', f('hip-flexors'))}

      {/* adductors: the inner thigh, high and narrow */}
      {group(belly(46.6, 98, 45.4, 122, 4, 5, 2.2, 0.28), f('adductors'))}

      {/* quadriceps: lateralis sweeping outside, rectus down the middle,
          medialis as the teardrop that sits low above the knee */}
      {group(
        belly(40.6, 97.5, 41, 139, 10.2, 12, 8.4, 0.38),
        f('quads'),
        [
          // vastus lateralis off the rectus femoris
          'M38.4,100 C37.4,110 37.6,124 38.9,136',
          // and the medialis teardrop, which only shows low
          'M44.4,112 C44.6,122 43.8,130 43,136.6',
        ],
      )}

      {/* tibialis: thin and long down the outside of the shin */}
      {group(belly(40.4, 150, 42.2, 179, 4.8, 5.4, 2.6, 0.3), f('tibialis'))}
    </svg>
  )
}

function BackFigure({ f }: { f: FillFn }) {
  return (
    <svg viewBox="0 0 100 200" className="h-full w-auto">
      <Silhouette />

      {/* trapezius: the kite, neck to both shoulders down to mid-back */}
      {group(
        [
          `M50,24 C44.4,25.2 37.4,27.6 32,31.4 C35.6,33.4 41.2,34.8 46.6,35.6
           L50,50.4 L53.4,35.6 C58.8,34.8 64.4,33.4 68,31.4 C62.6,27.6 55.6,25.2 50,24 Z`,
        ],
        f('traps'),
        [],
        false,
      )}

      {/* rear deltoid, same cap as the front */}
      {group(
        [
          'M31.4,30.8 C27.6,32 25,34.6 23.8,38.2 C26,39.6 29.6,39.2 32,37.4 C32.6,34.6 33.2,32.6 34,31.4 Z',
          'M23.6,38.8 C23,42.4 23.1,46 23.4,49.4 C26.4,49.6 30,48 31.2,45 C31.4,42 31.6,39.6 31.9,37.9 C29.4,39.8 25.8,40.2 23.6,38.8 Z',
        ],
        bestOf(f, ['delts-rear', 'delts-side']),
      )}

      {/* triceps: the long head down the back of the arm */}
      {group(belly(28.6, 39.5, 26.4, 60.5, 6, 7.4, 3.8, 0.45), f('triceps'))}
      {group(belly(25.8, 62, 22.9, 87, 6, 7, 3.2, 0.26), f('forearms'))}

      {/* latissimus: a wing off the armpit that narrows into the waist,
          not the vest it used to draw */}
      {group(
        [
          `M34.6,43.4 C36.6,47.6 39.6,50.4 42.6,52
           C43,56 43,60 42.4,63.8 C40,64.6 37.8,62.6 36.2,58.6
           C34.9,54.8 34.4,48.6 34.6,43.4 Z`,
        ],
        f('lats'),
      )}

      {/* rhomboids between the blades */}
      {group('M46.6,53.6 C44.8,53.2 43.4,52.6 42.4,51.9 L42.4,62.2 C43.6,63 45.1,63.4 46.6,63.6 Z', f('mid-back'))}

      {/* erectors: two columns down into the sacrum */}
      {group(belly(45.4, 66.5, 46.2, 86, 5.8, 6.8, 4.4, 0.42), f('lower-back'))}

      {/* gluteus: a shield off the hip crest, tucking under at the fold */}
      {group(
        [
          `M48.8,83.6 L37.4,84.4
           C35.6,87.2 34.9,91 35.4,94.8 C36,98.6 38.8,101.4 42.8,101.6
           C45.8,101.6 48,100 48.7,97.2 Z`,
        ],
        f('glutes'),
      )}

      {/* hamstrings: two heads, splitting as they reach the knee */}
      {group(belly(40.8, 101.5, 41.2, 138, 10.4, 11.6, 8, 0.4), f('hamstrings'), [
        'M41,104 C40.4,114 40.6,126 41.4,135.6',
      ])}

      {/* calves: two gastroc heads, the inner one lower and fuller */}
      {group(belly(40.4, 145, 41.6, 174, 8.2, 10.2, 3.4, 0.3), f('calves'), [
        'M40.6,148 C40.2,155 40.8,162 41.4,168',
      ])}

      {/* achilles into the heel */}
      {group('M40.8,172 C40.2,176.5 40.1,180 40.3,183 L44,183 C44.2,180 44.2,176.5 44,172 Z', f('achilles-feet'))}
      {group('M37.2,182.6 C36.4,186.4 36.2,189 36.6,190.4 L47.6,190.4 C48.2,189 47.8,186.4 46.6,182.6 Z', f('achilles-feet'))}
    </svg>
  )
}

/** The strongest fill among several regions (shared shapes like shoulder caps). */
function bestOf(f: FillFn, regions: MuscleRegion[]): Paint {
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
