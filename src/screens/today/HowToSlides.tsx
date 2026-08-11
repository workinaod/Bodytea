import { useMemo, useState } from 'react'
import type { ExerciseDef } from '../../types'
import { ExerciseDemo } from '../../components/ExerciseDemo'
import { demoFor } from '../../plan/demos'
import { photosFor } from '../../plan/demoPhotos'

// ============================================================
// "How do I do this?": one step per screen, swipe-simple.
// Lives apart from FocusView because it is a whole reader, not
// part of the set loop.
// ============================================================

export function HowToSlides({ def, onClose }: { def: ExerciseDef; onClose: () => void }) {
  const [i, setI] = useState(0)
  const slides = useMemo(() => {
    const s = def.steps.map((text, n) => ({ tag: `Step ${n + 1}`, text, tone: 'text-accent' }))
    for (const m of def.mistakes.slice(0, 2)) s.push({ tag: "Don't", text: m, tone: 'text-danger' })
    if (def.cue) s.push({ tag: 'Remember', text: def.cue, tone: 'text-gold' })
    return s
  }, [def])
  const last = i === slides.length - 1
  const slide = slides[i]

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-bg px-5 pb-[max(env(safe-area-inset-bottom),16px)] pt-[max(env(safe-area-inset-top),14px)]">
      <div className="flex items-center justify-between py-1">
        <div className="min-w-0 truncate pr-3 text-[13px] font-bold uppercase tracking-[0.14em] text-ink-dim">
          {def.name}
        </div>
        <button
          aria-label="Close"
          onClick={onClose}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.07] text-ink-dim"
        >
          <svg viewBox="0 0 24 24" className="h-[14px] w-[14px]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      <div className="mt-2">
        <ExerciseDemo spec={demoFor(def.id)} photos={photosFor(def.id)} />
      </div>

      {/* the slide: one idea at a time, big enough to read mid-set */}
      <div className="flex flex-1 flex-col items-center justify-center px-2 text-center">
        <div className={`text-[11px] font-black uppercase tracking-[0.22em] ${slide.tone}`}>{slide.tag}</div>
        <p className="mt-3 text-[19px] font-bold leading-snug">{slide.text}</p>
      </div>

      <div className="mb-3 flex items-center justify-center gap-1.5">
        {slides.map((_: unknown, n: number) => (
          <span key={n} className={`h-1.5 rounded-full transition-all ${n === i ? 'w-5 bg-accent' : 'w-1.5 bg-edge'}`} />
        ))}
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => setI((n) => Math.max(0, n - 1))}
          disabled={i === 0}
          className="flex-1 rounded-2xl bg-white/[0.07] py-4 text-[14px] font-black text-ink-dim disabled:opacity-30"
        >
          Back
        </button>
        <button
          onClick={() => (last ? onClose() : setI((n) => n + 1))}
          className="sheen flex-[2] rounded-2xl bg-gradient-to-b from-accent to-accent-deep py-4 text-[14px] font-black text-black shadow-lg shadow-accent/20"
        >
          {last ? 'Got it' : 'Next'}
        </button>
      </div>
    </div>
  )
}

// ---------- Break screen: countdown → back to the gate ----------
