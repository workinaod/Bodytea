// ============================================================
// Inputs: the two controls that carry real data entry.
// ============================================================

export function Stepper({
  value,
  onChange,
  step = 5,
  min = 0,
  suffix,
  width = 'w-16',
}: {
  value: number | undefined
  onChange: (v: number) => void
  step?: number
  min?: number
  suffix?: string
  width?: string
}) {
  const v = value ?? 0
  const btn =
    'press-down grid h-9 w-9 place-items-center rounded-xl border-2 border-edge bg-surface-2 text-lg font-black text-ink-dim [--lip:var(--lip-quiet)]'
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label="Decrease"
        className={btn}
        onClick={() => onChange(Math.max(min, +(v - step).toFixed(1)))}
      >
        −
      </button>
      <div className={`${width} text-center`}>
        <input
          inputMode="decimal"
          className="num w-full rounded-lg bg-transparent text-center text-[15px] font-extrabold text-ink outline-none"
          value={value === undefined ? '' : String(value)}
          placeholder="0"
          onChange={(e) => {
            const n = parseFloat(e.target.value)
            if (!Number.isNaN(n)) onChange(n)
            else if (e.target.value === '') onChange(min)
          }}
        />
        {suffix && <div className="text-[9px] font-semibold uppercase text-ink-faint">{suffix}</div>}
      </div>
      <button
        type="button"
        aria-label="Increase"
        className={btn}
        onClick={() => onChange(+(v + step).toFixed(1))}
      >
        +
      </button>
    </div>
  )
}

export function Toggle({
  on,
  onChange,
  label,
  sub,
}: {
  on: boolean
  onChange: (v: boolean) => void
  label: string
  sub?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`press-soft flex w-full items-center justify-between rounded-2xl border p-3.5 text-left ${
        on ? 'border-accent/35 bg-accent/10' : 'border-transparent bg-white/[0.06]'
      }`}
    >
      <div className="pr-3">
        <div className={`text-[14px] font-bold ${on ? 'text-accent-soft' : 'text-ink'}`}>{label}</div>
        {sub && <div className="mt-0.5 text-label leading-snug text-ink-faint">{sub}</div>}
      </div>
      <div
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-(--dur-base) ${on ? 'bg-accent' : 'bg-edge'}`}
      >
        <div
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform duration-(--dur-base) ease-(--ease-spring) ${on ? 'translate-x-[22px]' : 'translate-x-0.5'}`}
        />
      </div>
    </button>
  )
}

// ============================================================
// The segmented switch.
//
// Two screens carry one: My Plan (Training / Nutrition) and
// Progress (Progress / Record / The Board). Both had their own
// translucent pill, which is the same defect the buttons had:
// a control drawn with opacity instead of with edges.
//
// Geometry per research/OP12-visual-law.md: 2px line, radius 14,
// panel fill, 3px pad, a lip; the active half is a heat fill at
// radius 10 with its own lip.
// ============================================================

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { id: T; label: string }[]
  onChange: (id: T) => void
}) {
  return (
    <div className="flex gap-[3px] rounded-[14px] border-2 border-edge bg-surface p-[3px] shadow-[0_3px_0_var(--color-edge)]">
      {options.map((o) => {
        const on = o.id === value
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.id)}
            className={`flex-1 rounded-[10px] px-1 py-2 text-[12px] font-black transition-colors duration-150 ${
              on ? 'bg-accent text-white shadow-[0_2px_0_var(--lip-accent)]' : 'text-ink-faint'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
