import { Btn } from '../../components/ui'
import { Glyph, type GlyphName } from '../../components/glyphs'

// ============================================================
// The first screen anyone sees.
//
// It used to be a headline, a four-line paragraph, four more
// paragraphs in a rule, two buttons and a footnote: about ninety
// words claiming the app handles any goal. Nobody reads that, and
// claiming range is not the same as showing it.
//
// Now the range IS the interface. Five deliberately unlike goals
// sit there as buttons, so "name any goal" is something you see
// rather than something you are told, and the first tap seeds the
// wizard instead of just advancing it. The four glyphs below are
// the app's real navigation icons, so this doubles as a map.
// ============================================================

/** A goal you can start from. `chip` indexes GOAL_CHIPS in the wizard. */
export interface QuickGoal {
  label: string
  /** Pre-fills the "in your own words" box, editable at the next step. */
  statement: string
  chip: number
}

const FEATURES: { name: GlyphName; label: string }[] = [
  { name: 'week', label: 'Plan' },
  { name: 'meals', label: 'Meals' },
  { name: 'track', label: 'Track' },
  { name: 'coach', label: 'Coach' },
]

export function Welcome({
  rebuilding,
  quickGoals,
  onPickGoal,
  onBuild,
  onOwnRoutine,
}: {
  rebuilding: boolean
  quickGoals: QuickGoal[]
  onPickGoal: (g: QuickGoal) => void
  onBuild: () => void
  onOwnRoutine: () => void
}) {
  return (
    <div className="flex flex-1 flex-col justify-center">
      <div className="eyebrow text-accent">Bodytea</div>
      <h1 className="mt-2 text-display font-black">
        Name any goal
        <br />
        Get the exact plan
      </h1>

      {/* The proof, not the pitch: five goals with nothing in common. */}
      <div className="enter-stagger mt-7 flex flex-wrap gap-2">
        {quickGoals.map((g) => (
          <button
            key={g.label}
            type="button"
            onClick={() => onPickGoal(g)}
            className="press rounded-full bg-gradient-to-b from-white/[0.12] to-white/[0.05] px-4 py-2.5 text-[13.5px] font-semibold text-ink shadow-[0_1px_0_rgba(255,255,255,0.13)_inset,0_6px_16px_-10px_rgba(0,0,0,0.9)] ring-1 ring-white/[0.1]"
          >
            {g.label}
          </button>
        ))}
      </div>

      {/* What the app is, at a glance, in its own icons. */}
      <div className="mt-8 flex justify-between px-1">
        {FEATURES.map((f) => (
          <div key={f.label} className="flex flex-1 flex-col items-center gap-2">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/[0.05] text-ink-dim ring-1 ring-white/[0.06]">
              <Glyph name={f.name} size={22} />
            </span>
            <span className="text-micro font-bold tracking-normal text-ink-faint">{f.label}</span>
          </div>
        ))}
      </div>

      {rebuilding && (
        <p className="mt-7 border-l-2 border-accent/60 py-1 pl-3 text-label leading-snug text-ink-dim">
          <span className="font-bold text-accent-soft">Your plan is being rebuilt.</span> The engine got a lot
          smarter. Answer again and you get the better version. Every session, meal, run and measurement you
          logged is untouched.
        </p>
      )}

      <Btn size="lg" shimmer className="mt-8 w-full" onClick={onBuild}>
        {rebuilding ? 'Rebuild my plan' : 'Build my plan'}
      </Btn>
      <Btn kind="subtle" size="lg" className="mt-3 w-full" onClick={onOwnRoutine}>
        I already have a routine
      </Btn>
    </div>
  )
}
