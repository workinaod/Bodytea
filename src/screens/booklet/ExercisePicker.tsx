import { useMemo, useState } from 'react'
import { resolveExercise } from '../../plan/aliases'
import type { EquipTag } from '../../types'
import { EXERCISES } from '../../plan/exercises'
import { EXERCISE_MUSCLES } from '../../plan/muscles'
import { canDo, equipFor } from '../../plan/equip'
import { athleticFor, QUALITY_LABELS, type AthleticQuality } from '../../plan/athletic'
import { photosFor } from '../../plan/demoPhotos'
import {
  groupCoverage,
  GROUP_LABEL,
  GROUP_ORDER,
  groupsOf,
  staleGroups,
  type MuscleGroup,
} from '../../engine/pickHelp'
import { useAppStore } from '../../store/appStore'
import { useToday } from '../../logic/clock'
import { Chip } from '../../components/ui'
import { Sheet } from '../../components/Sheet'

// ============================================================
// Choosing an exercise, with help.
//
// This was a catalog: 194 movements, one search box, and chips
// for athletic qualities. Two things were wrong with it.
//
// It offered work nobody could do. On a bare floor, 138 of the
// 194 need gear the athlete does not own, and the picker was
// the only part of the app that never asked, so somebody with a
// mat scrolled past sled pushes and hurdle hops to find the
// push-up. Now the list is what you can actually do, and the
// rest is one tap away, labelled with what it would take.
//
// And it asked the wrong question. Nobody arrives wanting a
// movement whose prime mover is the latissimus dorsi. They
// arrive wanting to train their back, or wanting to be told
// what they have been neglecting, which the app can answer from
// their own logged sets.
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

const EQUIP_LABEL: Partial<Record<EquipTag, string>> = {
  dumbbell: 'dumbbells',
  barbell: 'a barbell',
  bench: 'a bench',
  'incline-bench': 'an incline bench',
  rack: 'a rack',
  'pullup-bar': 'a pull-up bar',
  box: 'a box',
  plate: 'a plate',
  machine: 'a machine',
  'open-space': 'open space',
  'hill-stairs': 'a hill or stairs',
  court: 'a court',
  treadmill: 'a treadmill',
  cones: 'cones',
  band: 'a band',
  hurdle: 'hurdles',
  'med-ball': 'a med ball',
  kettlebell: 'a kettlebell',
  'trap-bar': 'a trap bar',
  sled: 'a sled',
  partner: 'a partner',
  track: 'a track',
  trail: 'a trail',
  pool: 'a pool',
  bike: 'a bike',
}

/** What this movement would need that the athlete has not got. */
function missingGear(id: string, owned: Set<EquipTag>): string {
  const need = equipFor(id).filter((t) => t !== 'none' && !owned.has(t))
  if (need.length === 0) return ''
  return need.map((t) => EQUIP_LABEL[t] ?? t).join(' + ')
}

export function ExercisePicker({
  onPick,
  onClose,
  exclude,
  equipment,
  browse = false,
}: {
  onPick: (id: string) => void
  onClose: () => void
  exclude: Set<string>
  /** The gear to filter against. Defaults to the athlete's own plan. */
  equipment?: EquipTag[]
  /**
   * Reading the library rather than building a workout. Same list, same
   * filters, two differences: a tap opens the movement's guide instead
   * of adding it, and the gear filter starts OFF, because somebody
   * browsing what exists wants what exists.
   */
  browse?: boolean
}) {
  const planEquipment = useAppStore((s) => s.data.plan.equipment)
  const data = useAppStore((s) => s.data)
  const today = useToday()
  const owned = useMemo(
    () => new Set<EquipTag>(equipment ?? planEquipment),
    [equipment, planEquipment],
  )

  const [q, setQ] = useState('')
  const [group, setGroup] = useState<MuscleGroup | null>(null)
  const [qualityFilter, setQualityFilter] = useState<number | null>(null)
  const [showQualities, setShowQualities] = useState(false)
  // On by default: a list you cannot act on is not a shorter list, it
  // is a longer one with the useful part buried in it.
  const [gearOnly, setGearOnly] = useState(!browse)

  const stale = useMemo(() => staleGroups(data, today).slice(0, 2), [data, today])
  // Once a group is chosen, say where it stands. Somebody adding a third
  // chest movement this week is better off knowing it is the third.
  const groupStatus = useMemo(
    () => (group ? (groupCoverage(data, today).find((c) => c.group === group) ?? null) : null),
    [group, data, today],
  )
  const hiddenByGear = useMemo(
    () => Object.keys(EXERCISES).filter((id) => !exclude.has(id) && !canDo(id, owned)).length,
    [exclude, owned],
  )

  const groups = useMemo(() => {
    const query = q.trim().toLowerCase()
    let all = Object.keys(EXERCISES).filter((id) => !exclude.has(id))
    if (gearOnly) all = all.filter((id) => canDo(id, owned))
    if (group) all = all.filter((id) => groupsOf(id).includes(group))

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

    // A literal substring search misses things people actually type.
    // "bulgarian split squats" does not contain "Bulgarian Split Squat"
    // because of one letter, and the athlete is told nothing matches
    // while the movement sits right there. So when the plain search
    // comes back empty, ask the resolver, which normalizes and then
    // falls back to near misses.
    //
    // It only ever SUGGESTS here, and the label says so. The resolver
    // does not get to pick for somebody: it narrows a catalog of 194 to
    // a handful, and the tap is still theirs.
    if (query && matches.length === 0) {
      const r = resolveExercise(q.trim())
      const ids = (r.kind === 'resolved' ? [r.id] : r.kind === 'suggest' ? r.ids : [])
        .filter((id) => EXERCISES[id] && all.includes(id))
      if (ids.length) return [{ label: 'Closest I can find', ids }]
    }

    const used = new Set<string>()
    return FAMILY_ORDER.map(([label, test]) => {
      const ids = matches.filter((id) => !used.has(id) && test(id))
      ids.forEach((id) => used.add(id))
      return { label, ids }
    }).filter((g) => g.ids.length > 0)
  }, [q, exclude, qualityFilter, group, gearOnly, owned])

  const shown = groups.reduce((n, g) => n + g.ids.length, 0)

  return (
    <Sheet open onClose={onClose} title={browse ? 'Exercise library' : 'Pick an exercise'}>
      <div className="pb-8">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search a name, a muscle, a quality…"
          className="mb-2.5 w-full rounded-xl bg-white/[0.05] ring-1 ring-white/[0.05] px-3.5 py-3 text-[14px] font-semibold outline-none focus:ring-accent/45"
        />

        {/* What you have been skipping, from your own logged sets. */}
        {stale.length > 0 && !group && !q && (
          <div className="mb-2.5 rounded-xl border border-cyan/25 bg-cyan/[0.06] px-3.5 py-2.5">
            <div className="text-[11px] font-black uppercase tracking-wider text-cyan">
              Due some work
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {stale.map((s) => (
                <Chip key={s.group} tone="cyan" onClick={() => setGroup(s.group)}>
                  {s.label} · {s.daysSince === null ? 'not yet' : `${s.daysSince}d ago`}
                </Chip>
              ))}
            </div>
          </div>
        )}

        {/* The question people actually arrive with. */}
        <div className="no-scrollbar -mx-1 mb-2 overflow-x-auto px-1">
          <div className="flex w-max gap-1.5">
            {GROUP_ORDER.map((g) => (
              <Chip
                key={g}
                tone={group === g ? 'accent' : 'default'}
                pressed={group === g}
                onClick={() => {
                  setGroup(group === g ? null : g)
                  setQualityFilter(null)
                }}
              >
                {GROUP_LABEL[g]}
              </Chip>
            ))}
          </div>
        </div>

        {groupStatus && (
          <p className="mb-2 px-1 text-[11.5px] leading-snug text-ink-faint">
            <b className="text-ink-dim">{groupStatus.label}:</b>{' '}
            {groupStatus.daysSince === null
              ? 'nothing logged in the last month.'
              : `${groupStatus.sets} ${groupStatus.sets === 1 ? 'set' : 'sets'} in the last 7 days, last trained ${
                  groupStatus.daysSince === 0 ? 'today' : `${groupStatus.daysSince}d ago`
                }.`}
          </p>
        )}

        <div className="mb-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <button
            onClick={() => setGearOnly(!gearOnly)}
            className={`rounded-full px-3 py-1.5 text-[11.5px] font-bold ring-1 ${
              gearOnly ? 'bg-lime/12 text-lime ring-lime/30' : 'bg-white/[0.06] text-ink-dim ring-white/[0.08]'
            }`}
          >
            {gearOnly ? '✓ Only what I can do' : 'Showing everything'}
          </button>
          {gearOnly && hiddenByGear > 0 && (
            <span className="text-[11px] text-ink-faint">{hiddenByGear} need gear you have not got</span>
          )}
          <button
            onClick={() => {
              setShowQualities(!showQualities)
              setQualityFilter(null)
            }}
            className="text-[11.5px] font-semibold text-cyan underline"
          >
            {showQualities ? 'hide athletic filters' : 'athletic qualities'}
          </button>
        </div>

        {showQualities && (
          <div className="no-scrollbar -mx-1 mb-2.5 overflow-x-auto px-1">
            <div className="flex w-max gap-1.5">
              {QUALITY_FILTERS.map((f, i) => (
                <Chip
                  key={f.label}
                  tone={qualityFilter === i ? 'accent' : 'default'}
                  pressed={qualityFilter === i}
                  onClick={() => {
                    setQualityFilter(qualityFilter === i ? null : i)
                    setGroup(null)
                  }}
                >
                  {f.label}
                </Chip>
              ))}
            </div>
          </div>
        )}

        {shown === 0 && (
          <p className="py-8 text-center text-[13px] font-semibold leading-snug text-ink-faint">
            {q.trim() ? `I do not have ${q.trim()}.` : 'Nothing here matches.'}
            {gearOnly && hiddenByGear > 0 && ' Tap "Only what I can do" to see the rest.'}
            {/* Said plainly, because the alternative is letting somebody
                think they typed it wrong. R17 is explicit that the fix is
                NOT to invent a custom exercise record to absorb this. */}
            {q.trim() && !(gearOnly && hiddenByGear > 0) && ' Try a muscle or a shorter word, or pick the closest thing.'}
          </p>
        )}

        {groups.map((g) => (
          <div key={g.label} className="mb-4">
            <div className="mb-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-ink-faint">{g.label}</div>
            <div className="space-y-1.5">
              {g.ids.map((id) => {
                const def = EXERCISES[id]
                const photo = photosFor(id)
                const missing = missingGear(id, owned)
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
                      {/* Only ever shown when the gear filter is off, which is
                          the only time an unusable movement is on screen. */}
                      {missing && (
                        <span className="mt-0.5 block truncate text-[10.5px] font-semibold text-gold">
                          needs {missing}
                        </span>
                      )}
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

        <p className="px-1 pt-1 text-[11px] leading-snug text-ink-faint">
          Every exercise ships with a full guide, demo and muscle map. Athletic drills carry a
          level: <b className="text-lime">F</b>oundation · <b className="text-cyan">I</b>ntermediate ·{' '}
          <b className="text-accent">A</b>dvanced.
        </p>
      </div>
    </Sheet>
  )
}
