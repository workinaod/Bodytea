import { useState } from 'react'

// ============================================================
// Two numbers, typed.
//
// Both of these were steppers: a minus, a number, a plus. A
// stepper is right for a value you nudge — adding 5 lb to a
// working set — and wrong for a value you already know. Nobody
// discovers their own height by pressing plus eleven times.
//
// So they are text fields, sized like the answer matters, with
// the unit next to the number instead of underneath it.
// ============================================================

const wrap =
  'mx-auto flex w-full max-w-[15rem] items-center justify-center gap-2 rounded-2xl bg-white/[0.05] px-5 py-3.5 ring-1 ring-white/[0.07] transition-[background,box-shadow] focus-within:bg-white/[0.08] focus-within:ring-accent/55'
const digits =
  'num min-w-0 flex-1 bg-transparent text-center text-[30px] font-black text-ink outline-none placeholder:text-ink-faint/60 focus-visible:outline-none'
const unit = 'shrink-0 text-[14px] font-bold text-ink-faint'

/** Inches → the way people say it. */
export const formatHeight = (inches: number): string => `${Math.floor(inches / 12)}' ${inches % 12}"`

/**
 * Digits → inches, the way a height gets typed.
 *
 * You type 5 1 0 and mean five foot ten, so the first digit is feet and
 * whatever follows is inches. That is why this is ONE field rather than
 * two: nobody thinks of their height as two separate numbers, and a
 * pair of boxes makes you tab between halves of a single fact.
 *
 * Null while the digits cannot yet be a height, so a half-typed "5"
 * never briefly becomes five foot nothing and moves the plan.
 */
export function parseHeightDigits(raw: string): number | null {
  const d = raw.replace(/\D/g, '').slice(0, 3)
  if (d.length < 2) return null
  const ft = Number(d[0])
  const inch = Number(d.slice(1))
  if (ft < 4 || ft > 7 || inch > 11) return null
  return ft * 12 + inch
}

/** The feet mark appears on the first keystroke, so the split is visible
 *  before it is explained. */
function showHeight(d: string): string {
  if (!d) return ''
  if (d.length === 1) return `${d}'`
  return `${d[0]}' ${d.slice(1)}"`
}

/**
 * Keep the digits, not the formatting.
 *
 * The field displays `5' 10"`, so a backspace can land on a quote mark
 * and strip back to the same digits it started with — which would make
 * the key do nothing. When the digits survive a keystroke that made the
 * text shorter, the keystroke was a delete, so take a digit off.
 */
function nextDigits(typed: string, current: string): string {
  const d = typed.replace(/\D/g, '').slice(0, 3)
  if (d === current && typed.length < showHeight(current).length) return current.slice(0, -1)
  return d
}

export function HeightField({
  value,
  onChange,
}: {
  /** Inches, or null when nothing valid has been typed yet. */
  value: number | null
  onChange: (inches: number | null) => void
}) {
  // What they typed, kept as typed. Deriving the digits back out of the
  // inches would fight them mid-entry.
  const [raw, setRaw] = useState(value === null ? '' : `${Math.floor(value / 12)}${value % 12}`)

  return (
    <div className={wrap}>
      <input
        inputMode="numeric"
        aria-label="Height"
        value={showHeight(raw)}
        placeholder={`5' 10"`}
        onChange={(e) => {
          const d = nextDigits(e.target.value, raw)
          setRaw(d)
          onChange(parseHeightDigits(d))
        }}
        className={digits}
      />
    </div>
  )
}

export function WeightField({
  value,
  onChange,
}: {
  value: number | null
  onChange: (lb: number | null) => void
}) {
  const [raw, setRaw] = useState(value === null ? '' : String(value))
  return (
    <div className={wrap}>
      <input
        inputMode="numeric"
        aria-label="Weight"
        value={raw}
        placeholder="165"
        onChange={(e) => {
          const d = e.target.value.replace(/\D/g, '').slice(0, 3)
          setRaw(d)
          const n = Number(d)
          onChange(d.length >= 2 && n >= 70 && n <= 500 ? n : null)
        }}
        className={digits}
      />
      <span className={unit}>lb</span>
    </div>
  )
}
