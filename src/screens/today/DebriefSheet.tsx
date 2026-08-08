import type { DebriefData } from '../../types'
import { Sheet } from '../../components/Sheet'
import { Btn } from '../../components/ui'

function Section({ icon, title, lines }: { icon: string; title: string; lines: string[] }) {
  if (!lines.length) return null
  return (
    <section className="rounded-2xl border border-edge bg-surface p-4">
      <h4 className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-ink-faint">
        <span className="text-[14px]">{icon}</span> {title}
      </h4>
      <ul className="space-y-2">
        {lines.map((l, i) => (
          <li key={i} className="text-[13.5px] leading-relaxed text-ink">
            {l}
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Post-session debrief: recap → recovery → eat now → sleep → tomorrow. */
export function DebriefSheet({
  debrief,
  coachLine,
  onClose,
}: {
  debrief: DebriefData | null
  coachLine?: string
  onClose: () => void
}) {
  if (!debrief) return null
  return (
    <Sheet open onClose={onClose} title="Session debrief">
      <div className="space-y-3 pb-6">
        <div className="text-[12px] font-semibold text-ink-faint">{debrief.title}</div>
        {coachLine && (
          <div className="rounded-2xl border border-accent/30 bg-accent/10 p-4 text-[14px] font-bold leading-snug text-accent-soft">
            {coachLine}
          </div>
        )}
        <Section icon="📊" title="The work" lines={debrief.recap} />
        <Section icon="🔋" title="Recovery" lines={debrief.recovery} />
        <Section icon="🍽" title="Eat now" lines={debrief.eat} />
        <Section icon="😴" title="Sleep" lines={debrief.sleep} />
        <Section icon="⏭" title="Tomorrow" lines={[debrief.tomorrow]} />
        <Btn className="w-full" onClick={onClose}>
          Done
        </Btn>
      </div>
    </Sheet>
  )
}
