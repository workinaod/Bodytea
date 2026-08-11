// ============================================================
// Inline-SVG muscle activation map: stylized front + back
// figures with individually fillable regions. Fully offline,
// no images. Primary = accent, secondary = dimmed accent.
// ============================================================

export type MuscleRegion =
  | 'delts-front'
  | 'delts-side'
  | 'delts-rear'
  | 'traps'
  | 'chest-upper'
  | 'chest'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'abs'
  | 'obliques'
  | 'hip-flexors'
  | 'quads'
  | 'adductors'
  | 'tibialis'
  | 'calves'
  | 'achilles-feet'
  | 'lats'
  | 'mid-back'
  | 'lower-back'
  | 'glutes'
  | 'hamstrings'
  | 'full-body'
  | 'heart'

export const ALL_REGIONS: MuscleRegion[] = [
  'delts-front', 'delts-side', 'delts-rear', 'traps', 'chest-upper', 'chest',
  'biceps', 'triceps', 'forearms', 'abs', 'obliques', 'hip-flexors', 'quads',
  'adductors', 'tibialis', 'calves', 'achilles-feet', 'lats', 'mid-back',
  'lower-back', 'glutes', 'hamstrings', 'full-body', 'heart',
]

type FillFn = (r: MuscleRegion) => { fill: string; opacity: number }

const BASE = { fill: 'var(--color-surface-2)', opacity: 1 }
const PRIMARY = { fill: 'var(--color-accent)', opacity: 0.95 }
const SECONDARY = { fill: 'var(--color-accent)', opacity: 0.35 }
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

const S = { stroke: 'var(--color-edge)', strokeWidth: 0.8 }
const OUTLINE = { fill: 'none', stroke: 'var(--color-ink-faint)', strokeWidth: 0.9, opacity: 0.55 }

/** Mirror an x coordinate around the figure's center line. */
const mx = (x: number) => 100 - x

function FrontFigure({ f, showHeart, heartHot }: { f: FillFn; showHeart: boolean; heartHot: boolean }) {
  return (
    <svg viewBox="0 0 100 200" className="h-full w-auto">
      {/* head + neck (outline only) */}
      <circle cx="50" cy="12" r="8" {...OUTLINE} />
      <rect x="45.5" y="19.5" width="9" height="6" rx="2" {...OUTLINE} />

      {/* traps (front slivers) */}
      <path d="M33,30.5 L45.5,25 L45.5,30.5 Z" {...S} {...f('traps')} />
      <path d={`M${mx(33)},30.5 L${mx(45.5)},25 L${mx(45.5)},30.5 Z`} {...S} {...f('traps')} />

      {/* delts, front caps light up for front AND side emphasis */}
      <ellipse cx="23" cy="34.5" rx="8" ry="6.5" {...S} {...bestOf(f, ['delts-front', 'delts-side'])} />
      <ellipse cx={mx(23)} cy="34.5" rx="8" ry="6.5" {...S} {...bestOf(f, ['delts-front', 'delts-side'])} />

      {/* chest upper */}
      <path d="M31,33 C37,30 45,30.5 48.8,32 L48.8,40 C42,41.5 34,40.5 31,38 Z" {...S} {...f('chest-upper')} />
      <path d={`M${mx(31)},33 C${mx(37)},30 ${mx(45)},30.5 ${mx(48.8)},32 L${mx(48.8)},40 C${mx(42)},41.5 ${mx(34)},40.5 ${mx(31)},38 Z`} {...S} {...f('chest-upper')} />

      {/* chest */}
      <path d="M31,39.5 C35,41.5 44,42.5 48.8,41.5 L48.8,53 C42,56.5 33.5,53 31,46 Z" {...S} {...f('chest')} />
      <path d={`M${mx(31)},39.5 C${mx(35)},41.5 ${mx(44)},42.5 ${mx(48.8)},41.5 L${mx(48.8)},53 C${mx(42)},56.5 ${mx(33.5)},53 ${mx(31)},46 Z`} {...S} {...f('chest')} />

      {/* heart (cardio) */}
      {showHeart && (
        <path
          d="M50,49 C48.2,45.8 44.6,45.6 43.6,48.2 C42.8,50.4 44.8,52.6 50,56 C55.2,52.6 57.2,50.4 56.4,48.2 C55.4,45.6 51.8,45.8 50,49 Z"
          fill={heartHot ? 'var(--color-danger)' : 'var(--color-surface-2)'}
          stroke="var(--color-danger)"
          strokeWidth="1"
          opacity={heartHot ? 1 : 0.6}
        />
      )}

      {/* biceps */}
      <rect x="12.5" y="40" width="9.5" height="21" rx="4.7" {...S} {...f('biceps')} />
      <rect x={mx(22)} y="40" width="9.5" height="21" rx="4.7" {...S} {...f('biceps')} />

      {/* forearms */}
      <rect x="11.5" y="62.5" width="8.5" height="22" rx="4" {...S} {...f('forearms')} />
      <rect x={mx(20)} y="62.5" width="8.5" height="22" rx="4" {...S} {...f('forearms')} />
      <circle cx="15.5" cy="89" r="3.4" {...OUTLINE} />
      <circle cx={mx(15.5)} cy="89" r="3.4" {...OUTLINE} />

      {/* abs (segmented) */}
      <rect x="42.5" y="55" width="15" height="27" rx="3.5" {...S} {...f('abs')} />
      {[62, 69, 76].map((y) => (
        <line key={y} x1="43.5" x2="56.5" y1={y} y2={y} stroke="var(--color-bg)" strokeWidth="1.1" opacity="0.7" />
      ))}

      {/* obliques */}
      <rect x="35.5" y="56.5" width="6" height="24" rx="2.8" {...S} {...f('obliques')} />
      <rect x={mx(41.5)} y="56.5" width="6" height="24" rx="2.8" {...S} {...f('obliques')} />

      {/* hip flexors */}
      <path d="M37.5,83 C40,86.5 43.5,89.5 47,92 L44.5,95 C40.5,92 37,88 35.8,84.8 Z" {...S} {...f('hip-flexors')} />
      <path d={`M${mx(37.5)},83 C${mx(40)},86.5 ${mx(43.5)},89.5 ${mx(47)},92 L${mx(44.5)},95 C${mx(40.5)},92 ${mx(37)},88 ${mx(35.8)},84.8 Z`} {...S} {...f('hip-flexors')} />

      {/* adductors */}
      <rect x="46.5" y="96" width="3.2" height="25" rx="1.6" {...S} {...f('adductors')} />
      <rect x={mx(49.7)} y="96" width="3.2" height="25" rx="1.6" {...S} {...f('adductors')} />

      {/* quads */}
      <rect x="32.5" y="95" width="13" height="46" rx="6.2" {...S} {...f('quads')} />
      <rect x={mx(45.5)} y="95" width="13" height="46" rx="6.2" {...S} {...f('quads')} />
      <circle cx="39" cy="145.5" r="3.8" {...OUTLINE} />
      <circle cx={mx(39)} cy="145.5" r="3.8" {...OUTLINE} />

      {/* tibialis (front shin) */}
      <rect x="35" y="151" width="6.5" height="30" rx="3.2" {...S} {...f('tibialis')} />
      <rect x={mx(41.5)} y="151" width="6.5" height="30" rx="3.2" {...S} {...f('tibialis')} />

      {/* feet */}
      <rect x="33" y="183.5" width="11" height="7" rx="3" {...OUTLINE} />
      <rect x={mx(44)} y="183.5" width="11" height="7" rx="3" {...OUTLINE} />
    </svg>
  )
}

function BackFigure({ f }: { f: FillFn }) {
  return (
    <svg viewBox="0 0 100 200" className="h-full w-auto">
      <circle cx="50" cy="12" r="8" {...OUTLINE} />
      <rect x="45.5" y="19.5" width="9" height="6" rx="2" {...OUTLINE} />

      {/* traps kite */}
      <path d="M50,23.5 L31,33.5 L50,54 L69,33.5 Z" {...S} {...f('traps')} />

      {/* rear delts */}
      <ellipse cx="23" cy="34.5" rx="8" ry="6.5" {...S} {...bestOf(f, ['delts-rear', 'delts-side'])} />
      <ellipse cx={mx(23)} cy="34.5" rx="8" ry="6.5" {...S} {...bestOf(f, ['delts-rear', 'delts-side'])} />

      {/* lats */}
      <path d="M30,40 C33.5,44.5 39.5,47.5 45.5,48.5 L45.5,66 C38.5,69.5 32.5,64 29.8,51 Z" {...S} {...f('lats')} />
      <path d={`M${mx(30)},40 C${mx(33.5)},44.5 ${mx(39.5)},47.5 ${mx(45.5)},48.5 L${mx(45.5)},66 C${mx(38.5)},69.5 ${mx(32.5)},64 ${mx(29.8)},51 Z`} {...S} {...f('lats')} />

      {/* mid-back band (under the traps kite) */}
      <rect x="41" y="55.5" width="18" height="10" rx="4.5" {...S} {...f('mid-back')} />

      {/* lower back */}
      <rect x="41.5" y="67" width="17" height="14" rx="4" {...S} {...f('lower-back')} />
      <line x1="50" x2="50" y1="68.5" y2="79.5" stroke="var(--color-bg)" strokeWidth="1.1" opacity="0.7" />

      {/* triceps */}
      <rect x="12.5" y="40" width="9.5" height="21" rx="4.7" {...S} {...f('triceps')} />
      <rect x={mx(22)} y="40" width="9.5" height="21" rx="4.7" {...S} {...f('triceps')} />

      {/* forearms */}
      <rect x="11.5" y="62.5" width="8.5" height="22" rx="4" {...S} {...f('forearms')} />
      <rect x={mx(20)} y="62.5" width="8.5" height="22" rx="4" {...S} {...f('forearms')} />
      <circle cx="15.5" cy="89" r="3.4" {...OUTLINE} />
      <circle cx={mx(15.5)} cy="89" r="3.4" {...OUTLINE} />

      {/* glutes */}
      <path d="M35.5,84 C32.8,91 34.5,99 43,101 C47.5,100.5 48.8,95 48.5,89 C45.5,84.5 39,82.5 35.5,84 Z" {...S} {...f('glutes')} />
      <path d={`M${mx(35.5)},84 C${mx(32.8)},91 ${mx(34.5)},99 ${mx(43)},101 C${mx(47.5)},100.5 ${mx(48.8)},95 ${mx(48.5)},89 C${mx(45.5)},84.5 ${mx(39)},82.5 ${mx(35.5)},84 Z`} {...S} {...f('glutes')} />

      {/* hamstrings */}
      <rect x="32.5" y="103.5" width="13" height="38" rx="6.2" {...S} {...f('hamstrings')} />
      <rect x={mx(45.5)} y="103.5" width="13" height="38" rx="6.2" {...S} {...f('hamstrings')} />

      {/* calves */}
      <rect x="34" y="147.5" width="10.5" height="26" rx="5.2" {...S} {...f('calves')} />
      <rect x={mx(44.5)} y="147.5" width="10.5" height="26" rx="5.2" {...S} {...f('calves')} />

      {/* achilles + heel */}
      <rect x="37.2" y="174.5" width="4" height="11" rx="2" {...S} {...f('achilles-feet')} />
      <rect x={mx(41.2)} y="174.5" width="4" height="11" rx="2" {...S} {...f('achilles-feet')} />
      <rect x="33" y="185.5" width="11" height="6" rx="2.8" {...S} {...f('achilles-feet')} />
      <rect x={mx(44)} y="185.5" width="11" height="6" rx="2.8" {...S} {...f('achilles-feet')} />
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
      <div className={`flex items-stretch justify-center gap-3 ${compact ? 'h-36' : 'h-56'}`}>
        <div className="flex flex-col items-center">
          <FrontFigure f={f} showHeart={heartListed} heartHot={heartHot} />
          {!compact && <span className="mt-1 text-[9px] font-bold uppercase tracking-wider text-ink-faint">front</span>}
        </div>
        <div className="flex flex-col items-center">
          <BackFigure f={f} />
          {!compact && <span className="mt-1 text-[9px] font-bold uppercase tracking-wider text-ink-faint">back</span>}
        </div>
      </div>
      {!compact && (
        <div className="mt-1.5 flex items-center justify-center gap-4 text-[10px] font-semibold text-ink-faint">
          <span className="flex items-center gap-1.5">
            <i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: 'var(--color-accent)' }} />
            primary
          </span>
          <span className="flex items-center gap-1.5">
            <i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: 'var(--color-accent)', opacity: 0.35 }} />
            assisting
          </span>
        </div>
      )}
    </div>
  )
}
