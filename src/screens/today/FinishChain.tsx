import { useEffect, useMemo, useRef, useState } from 'react'
import type { AppData, ISODate } from '../../types'
import { addDaysISO } from '../../engine/calendar'
import { resolveDay } from '../../engine/resolveDay'
import { GRADE_LABEL, detectPRs, sessionGrade, sessionSetsDone, sessionTonnage } from '../../engine/stats'
import { streakDays } from '../../engine/streak'
import { athleteFacts } from '../../engine/achievementFacts'
import { evaluateAchievements, nextUp } from '../../engine/achievements'
import { flameFor, nextFlameTier } from '../../plan/achievements'
import { Btn } from '../../components/ui'
import { Flame } from '../../components/Flame'
import { Odometer } from '../../components/Odometer'
import { ConfettiBurst } from '../../components/ConfettiBurst'
import { useCountUp } from '../../components/useCountUp'
import { buzzAlert } from '../../platform/haptics'

// ============================================================
// The finish chain: the beat between the last set and the
// debrief sheet.
//
// Every number in here was produced by an engine, and every
// beat that has nothing true to say REMOVES ITSELF. That is
// the whole design. A ceremony that plays identically after a
// record and after a half-finished Tuesday teaches people to
// tap through it, and once they do, the record has nowhere
// left to land.
//
// So: work banked and tomorrow always play, because both are
// always true. A PR beat needs a PR. A streak beat needs a
// scheduled day that just banked. A badge beat needs a bar
// that actually moved. Confetti fires at most once, only for
// a record, a tier-up or an unlock.
//
// Any tap advances, a Skip jumps to the end, and the whole
// thing is under six seconds at its longest.
// ============================================================

type BeatId = 'work' | 'pr' | 'streak' | 'badge' | 'tomorrow'

/** How long each beat holds before the next one takes over. Tomorrow waits for a tap. */
const BEAT_MS: Record<BeatId, number> = { work: 1500, pr: 1400, streak: 1800, badge: 1200, tomorrow: 0 }
/** The breath in. Long enough to read as deliberate, short enough that nobody waits. */
const DIP_MS = 120

export interface ChainData {
  beats: BeatId[]
  work: { done: number; total: number; tonnage: number; grade: string }
  pr: { name: string; line: string } | null
  streak: { days: number; tier: string; lit: 'first' | 'up' | null; pull: string | null } | null
  badge: { name: string; icon: string; from: number; to: number; target: number; unlocked: boolean } | null
  tomorrow: { title: string; line: string }
}

function pullLine(days: number): string | null {
  const next = nextFlameTier(days)
  if (!next) return null
  return `${next.daysAway} more day${next.daysAway === 1 ? '' : 's'} to ${next.tier.name}.`
}

/**
 * Reads the two states either side of the finish write and decides what
 * there is to celebrate. Returns null when the answer is nothing, and
 * the caller goes straight to the debrief.
 *
 * `before` must be the store's data from BEFORE finishSession ran. The
 * store clones on every update, so holding the old object is safe.
 */
export function buildFinishChain(before: AppData, after: AppData, date: ISODate): ChainData | null {
  const session = after.sessions[date]
  if (!session) return null
  // A reopened day that gets finished again is not a first time. The
  // moment belonged to the day it was banked; replaying it would
  // celebrate work that has already been celebrated once.
  if (before.coach.feed.some((f) => f.kind === 'debrief' && f.debrief?.date === date)) return null

  const { done, total } = sessionSetsDone(session)
  const grade = sessionGrade(session)
  const work = { done, total, tonnage: sessionTonnage(session), grade: GRADE_LABEL[grade] }

  const prs = detectPRs(after, session)
  const pr = prs.length
    ? {
        name: prs[0].name,
        line:
          prs[0].kind === 'e1rm'
            ? `est. 1RM ${prs[0].value} lb, was ${prs[0].prev}`
            : `${prs[0].value} reps, was ${prs[0].prev}`,
      }
    : null

  // Yesterday's run against today's. A rest day was already holding the
  // streak before anybody trained on it, so extra work on one has no new
  // day to announce and the beat stays quiet.
  const held = streakDays(after, addDaysISO(date, -1))
  const now = streakDays(after, date)
  const tier = flameFor(now)
  const banked = resolveDay(date, after).kind !== 'rest' && now > held && tier
  const streak = banked
    ? {
        days: now,
        tier: tier.name,
        // Day one has no tier to have climbed from. It gets the moment
        // anyway, under the name of what actually happened.
        lit: held === 0 ? ('first' as const) : flameFor(held)?.name !== tier.name ? ('up' as const) : null,
        pull: pullLine(now),
      }
    : null

  // The badge delta is measured against a world WITHOUT today's session,
  // not against the state a second ago. Sets are written as they are
  // logged, so by the time FINISH is pressed the counters have already
  // moved and a before/after diff across the write is empty every time.
  // Removing the day answers the question the beat actually asks: what
  // moved because of this session.
  const without: AppData = { ...after, sessions: { ...after.sessions } }
  delete without.sessions[date]
  const was = evaluateAchievements(without, date, athleteFacts(without, date))
  const nowStates = evaluateAchievements(after, date, athleteFacts(after, date))
  const wasById = new Map(was.map((s) => [s.def.id, s]))
  const unlocked = nowStates.find((s) => s.earned && !wasById.get(s.def.id)?.earned)
  const moved = nextUp(nowStates, 3).find((s) => s.progress > (wasById.get(s.def.id)?.progress ?? 0))
  const picked = unlocked ?? moved
  const badge = picked
    ? {
        name: picked.def.name,
        icon: picked.def.icon,
        from: wasById.get(picked.def.id)?.progress ?? 0,
        to: picked.progress,
        target: picked.target,
        unlocked: !!unlocked,
      }
    : null

  const t = resolveDay(addDaysISO(date, 1), after)
  const tomorrow = {
    title: t.kind === 'rest' ? 'Full rest' : t.title,
    line: t.kind === 'rest' ? 'Eat to rest day numbers, walk if you like, lift nothing.' : t.tagline,
  }

  // A day that barely happened gets the honest recap and the hook, and
  // none of the theatre. Nothing here is a lie either way; the quiet
  // version is what keeps the loud one worth watching.
  const beats: BeatId[] =
    grade === 'extremely-light'
      ? ['work', 'tomorrow']
      : [
          'work',
          ...(pr ? (['pr'] as BeatId[]) : []),
          ...(streak ? (['streak'] as BeatId[]) : []),
          ...(badge ? (['badge'] as BeatId[]) : []),
          'tomorrow',
        ]

  return { beats, work, pr, streak, badge, tomorrow }
}

export function FinishChain({ chain, onDone }: { chain: ChainData; onDone: () => void }) {
  // -1 is the dark dip: the screen takes a breath before the first beat.
  const [i, setI] = useState(-1)
  const [barFull, setBarFull] = useState(false)
  const done = useRef(false)
  const last = chain.beats.length - 1
  const current = i < 0 ? null : chain.beats[i]

  function finish() {
    if (done.current) return
    done.current = true
    onDone()
  }
  function advance() {
    if (i < 0) setI(0)
    else if (i >= last) finish()
    else setI(i + 1)
  }

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []
    if (i < 0) {
      timers.push(setTimeout(() => setI(0), DIP_MS))
    } else {
      const beat = chain.beats[i]
      if (beat === 'pr') buzzAlert()
      // The bar has to paint where it started before it is told to move,
      // or the transition has nothing to transition from.
      if (beat === 'badge') timers.push(setTimeout(() => setBarFull(true), 90))
      if (BEAT_MS[beat] > 0) {
        timers.push(setTimeout(() => setI((v) => Math.min(v + 1, last)), BEAT_MS[beat]))
      }
    }
    return () => timers.forEach(clearTimeout)
  }, [i, chain.beats, last])

  // Confetti belongs to ONE beat per ceremony. Three earned things in a
  // day is a great day, not three parades.
  const burstAt = useMemo<BeatId | null>(() => {
    const plays = (b: BeatId) => chain.beats.includes(b)
    if (chain.pr && plays('pr')) return 'pr'
    if (chain.streak?.lit && plays('streak')) return 'streak'
    if (chain.badge?.unlocked && plays('badge')) return 'badge'
    return null
  }, [chain])

  const sets = useCountUp(chain.work.done, current === 'work')
  const lb = useCountUp(chain.work.tonnage, current === 'work')

  return (
    <div
      onClick={advance}
      className="fixed inset-0 z-[90] flex flex-col items-center justify-center bg-bg px-8 animate-fade-in"
    >
      <div role="status" aria-live="polite" className="w-full max-w-[320px]">
        {current === 'work' && (
          <div key="work" className="enter text-center">
            <div className="eyebrow text-ink-faint">Work banked</div>
            <div className="num mt-3 text-[64px] font-black leading-none">{sets}</div>
            <div className="mt-1 text-[13px] font-bold text-ink-dim">
              of {chain.work.total} set{chain.work.total === 1 ? '' : 's'}
            </div>
            <div className="mx-auto mt-5 h-1.5 w-44 overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full bg-lime"
                style={{ width: `${chain.work.total ? (sets / chain.work.total) * 100 : 0}%` }}
              />
            </div>
            {chain.work.tonnage > 0 && (
              <div className="num mt-5 text-[22px] font-extrabold">
                {lb.toLocaleString()} <span className="text-[13px] font-bold text-ink-dim">lb moved</span>
              </div>
            )}
            <div className="mt-4 text-[13.5px] font-black text-accent-soft">{chain.work.grade}</div>
          </div>
        )}

        {current === 'pr' && chain.pr && (
          <div key="pr" className="relative text-center">
            {burstAt === 'pr' && <ConfettiBurst />}
            <div className="drop mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gold/15 ring-1 ring-gold/45">
              <span className="num text-[21px] font-black text-gold">PR</span>
            </div>
            <div className="eyebrow mt-4 text-gold">Personal record</div>
            <div className="mt-1.5 text-[26px] font-black leading-tight">{chain.pr.name}</div>
            <div className="num mt-1.5 text-[13.5px] text-ink-dim">{chain.pr.line}</div>
          </div>
        )}

        {current === 'streak' && chain.streak && (
          <div key="streak" className="relative text-center">
            {burstAt === 'streak' && <ConfettiBurst />}
            <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
              <span className="shockwave absolute inset-2 rounded-full ring-2 ring-accent/55" aria-hidden />
              <Flame streak={chain.streak.days} size={52} ignite alive />
            </div>
            <div className="eyebrow mt-3 text-ink-faint">Day</div>
            <div className="num mt-0.5 text-[56px] font-black leading-none">
              <Odometer value={chain.streak.days} play />
            </div>
            <div className="mt-2 text-[15px] font-black text-accent-soft">{chain.streak.tier}</div>
            {chain.streak.lit && (
              <div className="eyebrow mt-1 text-lime">
                {chain.streak.lit === 'first' ? 'Flame lit' : 'New tier'}
              </div>
            )}
            {chain.streak.pull && (
              <div className="mt-2 text-[12.5px] text-ink-dim">{chain.streak.pull}</div>
            )}
          </div>
        )}

        {current === 'badge' && chain.badge && (
          <div key="badge" className="relative text-center">
            {burstAt === 'badge' && <ConfettiBurst />}
            <div className="eyebrow text-ink-faint">{chain.badge.unlocked ? 'Badge unlocked' : 'Next up'}</div>
            <div
              className={`mx-auto mt-3 flex h-16 w-16 items-center justify-center rounded-2xl text-[28px] ring-1 ${
                chain.badge.unlocked ? 'flip-y bg-lime/15 ring-lime/50' : 'bg-surface-2 ring-edge grayscale'
              }`}
            >
              {chain.badge.icon}
            </div>
            <div className="mt-4 text-[20px] font-black leading-tight">{chain.badge.name}</div>
            <div className="mx-auto mt-3 h-1.5 w-44 overflow-hidden rounded-full bg-surface-2">
              <div
                className="grow h-full rounded-full bg-lime"
                style={{
                  width: `${Math.min(100, ((barFull ? chain.badge.to : chain.badge.from) / chain.badge.target) * 100)}%`,
                }}
              />
            </div>
            <div className="num mt-1.5 text-[11.5px] text-ink-faint">
              {chain.badge.unlocked
                ? 'Earned'
                : `${Math.floor(chain.badge.to)}/${chain.badge.target}, ${Math.max(0, Math.ceil(chain.badge.target - chain.badge.to))} to go`}
            </div>
          </div>
        )}

        {current === 'tomorrow' && (
          <div key="tomorrow" className="enter text-center">
            <div className="eyebrow text-ink-faint">Tomorrow</div>
            <div className="mt-2 text-[27px] font-black leading-tight">{chain.tomorrow.title}</div>
            <p className="mt-2 text-[13.5px] leading-snug text-ink-dim">{chain.tomorrow.line}</p>
          </div>
        )}
      </div>

      <div className="absolute inset-x-8 bottom-10">
        {current === 'tomorrow' ? (
          <Btn size="lg" className="breathe-in w-full" onClick={finish}>
            Continue
          </Btn>
        ) : (
          <button
            onClick={(e) => {
              // Without this the root's advance-by-one runs after it and
              // wins, so Skip would step one beat instead of ending.
              e.stopPropagation()
              setI(last)
            }}
            className="press w-full py-2 text-center text-[12.5px] font-semibold text-ink-faint underline underline-offset-2"
          >
            Skip
          </button>
        )}
      </div>
    </div>
  )
}
