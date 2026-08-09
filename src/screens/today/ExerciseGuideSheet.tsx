import { Sheet } from '../../components/Sheet'
import { Chip } from '../../components/ui'
import { MuscleMap } from '../../components/MuscleMap'
import { ExerciseDemo } from '../../components/ExerciseDemo'
import { YouTubeEmbed } from '../../components/YouTubeEmbed'
import { getExercise } from '../../plan/exercises'
import { musclesFor } from '../../plan/muscles'
import { demoFor } from '../../plan/demos'

/** The full "how / what / why / don't" guide for one exercise. */
export function ExerciseGuideSheet({
  exerciseId,
  onClose,
}: {
  exerciseId: string | null
  onClose: () => void
}) {
  if (!exerciseId) return null
  const def = getExercise(exerciseId)
  const muscles = musclesFor(exerciseId)
  return (
    <Sheet open onClose={onClose} title={def.name}>
      <div className="space-y-5 pb-6">
        <div className="flex flex-wrap gap-1.5">
          {def.targets.muscles.map((m) => (
            <Chip key={m} tone="accent">{m}</Chip>
          ))}
          {def.targets.qualities.map((q) => (
            <Chip key={q} tone="cyan">{q}</Chip>
          ))}
        </div>

        <section className="rounded-2xl border border-edge bg-surface p-4">
          <h4 className="mb-1 text-[11px] font-black uppercase tracking-[0.14em] text-ink-faint">
            The movement
          </h4>
          <ExerciseDemo spec={demoFor(exerciseId)} />
        </section>

        <section className="rounded-2xl border border-edge bg-surface p-4">
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
          <p className="text-[13.5px] leading-relaxed text-ink-dim">{def.why}</p>
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
