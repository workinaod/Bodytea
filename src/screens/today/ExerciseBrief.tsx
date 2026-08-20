import type { ExerciseDef } from '../../types'
import { ExerciseDemo } from '../../components/ExerciseDemo'
import { MuscleMap } from '../../components/MuscleMap'
import { demoFor } from '../../plan/demos'
import { photosFor } from '../../plan/demoPhotos'
import { musclesFor } from '../../plan/muscles'

// ============================================================
// The reference half of the set screen, and the blind it rides on.
//
// Before a set this is the whole middle of the screen: clip, cue,
// photo sequence, muscle map, the numbered steps. The moment work
// starts it rolls up on itself and leaves a STEPS tab, and the
// clock takes the space.
//
// The roll is a grid-template-rows transition from 1fr to 0fr.
// That is the only way to animate to an intrinsic height without
// measuring the content first, which matters here because the
// block is a different height for every exercise.
// ============================================================

/**
 * The video, capped by HEIGHT rather than width.
 *
 * A 16:9 clip at full width eats ~200px of a phone screen, which
 * pushed the numbered steps down far enough that step 3 was below the
 * fold — on the one screen whose whole job is telling you how to do
 * the movement.
 *
 * Capping height directly would letterbox or crop it, so the WIDTH is
 * limited to whatever keeps 16:9 inside the height budget, and the box
 * is centred. The clip stays whole, just smaller, and on a wide screen
 * `min()` hands it back the full width it can afford.
 */
const VIDEO_BOX = { width: 'min(100%, calc(22vh * 16 / 9))' } as const

export function ExerciseBrief({
  def,
  vid,
  videoOpen,
  onOpenVideo,
  rolled,
  live,
  stepsOpen,
  onToggleSteps,
  clock,
  clockNote,
}: {
  def: ExerciseDef
  vid: string | null
  videoOpen: boolean
  onOpenVideo: () => void
  /** How-to hidden, clock showing. */
  rolled: boolean
  live: boolean
  stepsOpen: boolean
  onToggleSteps: () => void
  clock: string
  clockNote: string
}) {
  return (
      <div className="mx-4 mt-3 flex min-h-0 flex-1 flex-col">
        {rolled && (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
            <div className="num text-[86px] font-extrabold leading-none tracking-[-0.04em] text-ink">
              {clock}
            </div>
            <div className="eyebrow mt-2 text-ink-faint">
              {clockNote}
            </div>
          </div>
        )}

        {/* The blind */}
        <div
          // `flex-1 min-h-0` while open is what BOUNDS this block to the
          // space the screen actually has. Without it the how-to sized
          // itself to its own content, overflowed the column, and painted
          // straight over the weight stepper below: the stepper looked
          // washed out because the steps were sitting on top of it, and
          // it could not be tapped for the same reason.
          className={`grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
            rolled ? 'shrink-0' : 'min-h-0 flex-1'
          }`}
          style={{ gridTemplateRows: rolled ? '0fr' : '1fr' }}
        >
          {/* Scrolls again. Any non-visible overflow still clips for the
              roll-up, so `auto` collapses exactly like `hidden` did. */}
          <div className="min-h-0 overflow-y-auto overscroll-contain">
        <div className="rounded-2xl bg-surface-2 border-2 border-edge p-4">
          {vid ? (
            videoOpen ? (
              <div className="mx-auto overflow-hidden rounded-xl" style={VIDEO_BOX}>
                <iframe
                  className="aspect-video w-full"
                  src={`https://www.youtube-nocookie.com/embed/${vid}?autoplay=1`}
                  title="How to"
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <button
                onClick={() => onOpenVideo()}
                className="relative mx-auto block overflow-hidden rounded-xl"
                style={VIDEO_BOX}
              >
                <img
                  src={`https://i.ytimg.com/vi/${vid}/hqdefault.jpg`}
                  alt="How to do it"
                  className="aspect-video w-full object-cover opacity-85"
                  loading="lazy"
                />
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent shadow-[0_4px_0_var(--lip-accent)]">
                    <svg viewBox="0 0 24 24" className="ml-0.5 h-6 w-6 fill-black">
                      <path d="M8 5v14l11-7L8 5Z" />
                    </svg>
                  </span>
                </span>
              </button>
            )
          ) : null}

          {def.cue && (
            <div className={`${vid ? 'mt-3' : ''} px-1 pb-1 text-center text-[13px] font-bold leading-snug text-gold`}>
              {def.cue}
            </div>
          )}

          <div className={`${vid || def.cue ? 'mt-3' : ''} flex items-center gap-2`}>
            <div className="min-w-0 flex-1">
              <ExerciseDemo compact spec={demoFor(def.id)} photos={photosFor(def.id)} />
            </div>
            <div className="w-[36%] shrink-0">
              <MuscleMap
                compact
                primary={musclesFor(def.id).primary}
                secondary={musclesFor(def.id).secondary}
              />
            </div>
          </div>

          <ol className="mt-3 space-y-2">
            {def.steps.slice(0, 3).map((s, i) => (
              <li key={i} className="flex gap-2.5 text-[13px] leading-snug text-ink-dim">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-[10.5px] font-black text-accent">
                  {i + 1}
                </span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </div>
          </div>
        </div>

        {/* The tab the blind leaves behind */}
        {live && (
          <button
            onClick={onToggleSteps}
            className="press mt-2 flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-surface-2 py-2.5 border-2 border-edge"
          >
            <span className="eyebrow text-ink-dim">Steps</span>
            <svg
              viewBox="0 0 24 24"
              className={`h-3.5 w-3.5 text-ink-faint transition-transform duration-300 ${stepsOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 15l6-6 6 6" />
            </svg>
          </button>
        )}
      </div>
  )
}
