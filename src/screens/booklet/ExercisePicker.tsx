import { useMemo, useState } from 'react'
import { EXERCISES } from '../../plan/exercises'
import { EXERCISE_MUSCLES } from '../../plan/muscles'
import { athleticFor, QUALITY_LABELS, type AthleticQuality } from '../../plan/athletic'
import { photosFor } from '../../plan/demoPhotos'
import { Chip } from '../../components/ui'
import { Sheet } from '../../components/Sheet'

// ============================================================
// The catalog browser: search, muscle families, athletic-quality
// filters, a photo per movement. Born inside the booklet editor;
// its own file since the own-workout builder started picking
// from the same shelf.
// ============================================================

const FAMILY_ORDER: [string, (id: string) => boolean][] = [
  ['Squat & legs', (id) => (EXERCISE_MUSCLES[id]?.primary ?? []).some((m) => m === 'quads' || m === 'adductors')],
  ['Hinge & posterior', (id) => (EXERCISE_MUSCLES[id]?.primary ?? []).some((m) => m === 'glutes' || m === 'hamstrings')],
  ['Push', (id) => (EXERCISE_MUSCLES[id]?.primary ?? []).some((m) => ['chest', 'chest-upper', 'delts-front', 'delts-side', 'triceps'].includes(m))],
  ['Pull & arms', (id) => (EXERCISE_MUSCLES[id]?.primary ?? []).some((m) => ['lats', 'mid-back', 'delts-rear', 'biceps', 'traps', 'forearms'].includes(m))],
  ['Jumps & sprints', (id) => ['jump', 'sprint'].includes(EXERCISES[id].kind)],
  ['Core', (id) => EXERCISES[id].kind === 'core' || (EXERCISE_MUSCLES[id]?.primary ?? []).some((m) => m === 'abs' || m === 'obliques')],
  ['Calves & carries', (id) => (EXERCISE_MUSCLES[id]?.primary ?? []).some((m) => m === 'calves') || EXERCISES[id].kind === 'carry'],
  ['Cardio & conditioning', (id) => EXERCISES[id].kind === 'cardio'],
  ['Mobility', (id) => EXERCISES[id].kind === 'mobility'],
]

/** Athletic-quality browse groups (curated order: control → force → elastic → complexity). */
const QUALITY_FILTERS: { label: string; qualities: AthleticQuality[] }[] = [
  { label: '⚡ Acceleration', qualities: ['acceleration', 'sprint-mechanics'] },
  { label: '💨 Max speed', qualities: ['max-velocity'] },
  { label: '🦘 Vertical', qualities: ['vertical-power'] },
  { label: '➡️ Horizontal', qualities: ['horizontal-power'] },
  { label: '🔄 Lateral & COD', qualities: ['lateral-power', 'cod', 'reactive-agility'] },
  { label: '🪀 Elastic', qualities: ['elastic-reactive', 'ankle-stiffness'] },
  { label: '🛬 Landing', qualities: ['force-absorption', 'deceleration'] },
  { label: '🧘 Balance', qualities: ['balance-stability', 'coordination'] },
  { label: '🏋️ Power', qualities: ['explosive-strength', 'rotational-power', 'athletic-strength'] },
]

const LEVEL_BADGE: Record<string, string> = {
  foundation: 'F',
  intermediate: 'I',
  advanced: 'A',
}
const LEVEL_TONE: Record<string, string> = {
  foundation: 'bg-lime/15 text-lime',
  intermediate: 'bg-cyan/15 text-cyan',
  advanced: 'bg-accent/15 text-accent',
}

export function ExercisePicker({
  onPick,
  onClose,
  exclude,
}: {
  onPick: (id: string) => void
  onClose: () => void
  exclude: Set<string>
}) {
  const [q, setQ] = useState('')
  const [qualityFilter, setQualityFilter] = useState<number | null>(null)

  const groups = useMemo(() => {
    const query = q.trim().toLowerCase()
    const all = Object.keys(EXERCISES).filter((id) => !exclude.has(id))
    let matches = query
      ? all.filter((id) => {
          const def = EXERCISES[id]
          const muscles = (EXERCISE_MUSCLES[id]?.primary ?? []).join(' ')
          const meta = athleticFor(id)
          const athletic = meta ? `${meta.qualities.join(' ')} ${meta.level} ${meta.direction} ${meta.laterality}` : ''
          return `${def.name} ${muscles} ${def.targets.qualities.join(' ')} ${athletic}`.toLowerCase().includes(query)
        })
      : all

    // Athletic-quality browsing: group by quality, ordered foundation → advanced
    if (qualityFilter !== null) {
      const filter = QUALITY_FILTERS[qualityFilter]
      const rank = { foundation: 0, intermediate: 1, advanced: 2 }
      matches = matches.filter((id) => {
        const meta = athleticFor(id)
        return meta && meta.qualities.some((qq) => filter.qualities.includes(qq))
      })
      return filter.qualities
        .map((qq) => ({
          label: QUALITY_LABELS[qq],
          ids: matches
            .filter((id) => athleticFor(id)!.qualities[0] === qq || (athleticFor(id)!.qualities.includes(qq) && !filter.qualities.includes(athleticFor(id)!.qualities[0])))
            .sort((a, b) => rank[athleticFor(a)!.level] - rank[athleticFor(b)!.level]),
        }))
        .filter((g) => g.ids.length > 0)
    }

    const used = new Set<string>()
    return FAMILY_ORDER.map(([label, test]) => {
      const ids = matches.filter((id) => !used.has(id) && test(id))
      ids.forEach((id) => used.add(id))
      return { label, ids }
    }).filter((g) => g.ids.length > 0)
  }, [q, exclude, qualityFilter])

  return (
    <Sheet open onClose={onClose} title="Pick an exercise">
      <div className="pb-8">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, muscle, or quality (e.g. acceleration)…"
          className="mb-2.5 w-full rounded-xl bg-white/[0.05] ring-1 ring-white/[0.05] px-3.5 py-3 text-[14px] font-semibold outline-none focus:ring-accent/45"
        />
        <div className="no-scrollbar -mx-1 mb-2.5 overflow-x-auto px-1">
          <div className="flex w-max gap-1.5">
            {QUALITY_FILTERS.map((f, i) => (
              <Chip
                key={f.label}
                tone={qualityFilter === i ? 'accent' : 'default'}
                onClick={() => setQualityFilter(qualityFilter === i ? null : i)}
              >
                {f.label}
              </Chip>
            ))}
          </div>
        </div>
        <p className="mb-3 text-[11px] leading-snug text-ink-faint">
          Every exercise ships with a full guide, demo, and muscle map. Athletic drills carry a level:{' '}
          <b className="text-lime">F</b>oundation · <b className="text-cyan">I</b>ntermediate ·{' '}
          <b className="text-accent">A</b>dvanced. Progress control → force → elasticity → complexity.
        </p>
        {groups.map((g) => (
          <div key={g.label} className="mb-4">
            <div className="mb-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-ink-faint">{g.label}</div>
            <div className="space-y-1.5">
              {g.ids.map((id) => {
                const def = EXERCISES[id]
                const photo = photosFor(id)
                return (
                  <button
                    key={id}
                    onClick={() => onPick(id)}
                    className="flex w-full items-center gap-3 rounded-xl bg-white/[0.05] ring-1 ring-white/[0.05] px-3 py-2 text-left active:border-accent/50"
                  >
                    {photo ? (
                      <img
                        src={`${import.meta.env.BASE_URL}demo/${photo.frames[0].file}`}
                        alt=""
                        loading="lazy"
                        className="h-10 w-14 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <span className="flex h-10 w-14 shrink-0 items-center justify-center rounded-lg bg-white/[0.07] text-[16px]">🏃</span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-bold">{def.name}</span>
                      <span className="block truncate text-[11px] text-ink-dim">
                        {athleticFor(id)
                          ? athleticFor(id)!.qualities.map((qq) => QUALITY_LABELS[qq]).join(' · ')
                          : (EXERCISE_MUSCLES[id]?.primary ?? []).join(' · ') || def.kind}
                      </span>
                    </span>
                    {athleticFor(id) && (
                      <span
                        className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-black ${LEVEL_TONE[athleticFor(id)!.level]}`}
                      >
                        {LEVEL_BADGE[athleticFor(id)!.level]}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </Sheet>
  )
}
