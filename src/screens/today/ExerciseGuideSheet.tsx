import { useEffect, useState } from 'react'
import { Sheet } from '../../components/Sheet'
import { Chip } from '../../components/ui'
import { MuscleMap } from '../../components/MuscleMap'
import { ExerciseDemo } from '../../components/ExerciseDemo'
import { YouTubeEmbed } from '../../components/YouTubeEmbed'
import { getExercise } from '../../plan/exercises'
import { musclesFor } from '../../plan/muscles'
import { demoFor } from '../../plan/demos'
import { photosFor } from '../../plan/demoPhotos'
import { athleticFor, LEVEL_LABELS, programLine, progressionChain, QUALITY_LABELS } from '../../plan/athletic'
import { useAppStore } from '../../store/appStore'

const LEVEL_TONE = {
  foundation: 'lime',
  intermediate: 'cyan',
  advanced: 'accent',
} as const

/** The full "how / what / why / don't" guide for one exercise. */
export function ExerciseGuideSheet({
  exerciseId,
  onClose,
}: {
  exerciseId: string | null
  onClose: () => void
}) {
  // Progression-chain taps navigate within the sheet
  const [viewId, setViewId] = useState<string | null>(exerciseId)
  useEffect(() => setViewId(exerciseId), [exerciseId])
  const id = viewId ?? exerciseId
  const rationale = useAppStore((s) => (id ? s.data.plan.rationale[id] : undefined))
  if (!id || !exerciseId) return null
  const def = getExercise(id)
  const muscles = musclesFor(id)
  const why = rationale ?? def.why
  const meta = athleticFor(id)
  const chain = meta ? progressionChain(id) : []
  return (
    <Sheet open onClose={onClose} title={def.name}>
      <div className="space-y-5 pb-6">
        <div className="flex flex-wrap gap-1.5">
          {meta && <Chip tone={LEVEL_TONE[meta.level]}>{LEVEL_LABELS[meta.level]}</Chip>}
          {meta
            ? meta.qualities.map((q) => (
                <Chip key={q} tone="cyan">{QUALITY_LABELS[q]}</Chip>
              ))
            : def.targets.qualities.map((q) => (
                <Chip key={q} tone="cyan">{q}</Chip>
              ))}
          {def.targets.muscles.map((m) => (
            <Chip key={m} tone="accent">{m}</Chip>
          ))}
        </div>

        <section className="rounded-2xl bg-white/[0.05] ring-1 ring-white/[0.05] p-4">
          <h4 className="mb-1 text-[11px] font-black uppercase tracking-[0.14em] text-ink-faint">
            The movement
          </h4>
          <ExerciseDemo spec={demoFor(id)} photos={photosFor(id)} />
        </section>

        <section className="rounded-2xl bg-white/[0.05] ring-1 ring-white/[0.05] p-4">
          <h4 className="mb-2 text-[11px] font-black uppercase tracking-[0.14em] text-ink-faint">
            Muscles activated
          </h4>
          <MuscleMap primary={muscles.primary} secondary={muscles.secondary} />
        </section>

        {def.cue && (
          <div className="rounded-xl border border-gold/30 bg-gold/8 px-3.5 py-3 text-[13px] font-semibold leading-snug text-gold">
            {def.cue}
          </div>
        )}

        {meta && (
          <div className="rounded-xl bg-white/[0.05] ring-1 ring-white/[0.05] px-3.5 py-3">
            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-ink-faint">
              How to program it (defaults, not law)
            </div>
            <div className="mt-1 text-[12.5px] font-semibold text-ink">{programLine(meta)}</div>
            {meta.warning && (
              <p className="mt-1.5 text-[11.5px] font-semibold leading-snug text-danger">⚠ {meta.warning}</p>
            )}
          </div>
        )}

        <section>
          <h4 className="mb-2 text-[11px] font-black uppercase tracking-[0.14em] text-ink-faint">
            How to do it
          </h4>
          <ol className="space-y-2.5">
            {def.steps.map((s, i) => (
              <li key={i} className="flex gap-3 text-[13.5px] leading-snug text-ink">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-[12px] font-black text-accent">
                  {i + 1}
                </span>
                <span className="pt-0.5">{s}</span>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <h4 className="mb-2 text-[11px] font-black uppercase tracking-[0.14em] text-ink-faint">
            Why it's in YOUR plan
          </h4>
          <p className="text-[13.5px] leading-relaxed text-ink-dim">{why}</p>
        </section>

        <section>
          <h4 className="mb-2 text-[11px] font-black uppercase tracking-[0.14em] text-ink-faint">
            Common mistakes
          </h4>
          <ul className="space-y-2">
            {def.mistakes.map((m, i) => (
              <li key={i} className="flex gap-2.5 text-[13px] leading-snug text-ink-dim">
                <span className="mt-0.5 text-danger">✕</span>
                <span>{m}</span>
              </li>
            ))}
          </ul>
        </section>

        {chain.length > 1 && (
          <section>
            <h4 className="mb-2 text-[11px] font-black uppercase tracking-[0.14em] text-ink-faint">
              Progression ladder
            </h4>
            <div className="space-y-1.5">
              {chain.map((cid, i) => (
                <button
                  key={cid}
                  onClick={() => cid !== id && setViewId(cid)}
                  className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left ${
                    cid === id ? 'border-accent/50 bg-accent/10' : 'border-edge bg-white/[0.05] active:bg-white/[0.09]'
                  }`}
                >
                  <span className="w-4 text-[11px] font-black text-ink-faint">{i + 1}</span>
                  <span className={`min-w-0 flex-1 truncate text-[13px] font-bold ${cid === id ? 'text-accent-soft' : ''}`}>
                    {getExercise(cid).name}
                  </span>
                  {athleticFor(cid) && (
                    <Chip tone={LEVEL_TONE[athleticFor(cid)!.level]}>{LEVEL_LABELS[athleticFor(cid)!.level]}</Chip>
                  )}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[10.5px] leading-snug text-ink-faint">
              Earn each rung: control → force → elasticity → complexity. Tap any step to read its guide.
            </p>
          </section>
        )}

        <section>
          <h4 className="mb-2 text-[11px] font-black uppercase tracking-[0.14em] text-ink-faint">
            Watch it done
          </h4>
          <YouTubeEmbed videoId={def.videoId} query={def.videoQuery} />
        </section>

        <div className="text-[11px] text-ink-faint">
          Equipment: {def.equipment}
          {def.restSec > 0 && ` · Rest ~${def.restSec >= 60 ? `${Math.round(def.restSec / 60)} min` : `${def.restSec}s`}`}
        </div>
      </div>
    </Sheet>
  )
}
