import { describe, expect, it } from 'vitest'
import { emptyAppData, type AppData } from '../types'
import type { SessionLog } from '../sessionTypes'
import { appendDecision } from './decisions'
import {
  DOWNGRADES_BEFORE_EASING,
  downgradeThreshold,
  earlyFlagOffer,
  readinessDecision,
} from './readiness'

// ============================================================
// Two of four readiness flags dials the day back: a set off every lift,
// lighter weights, a third less jumping. Right for most people. For
// somebody who sleeps badly and has sore legs most Mondays it fires on
// an ordinary week, cuts a session that would have been fine, and does
// it again next Monday forever, because nothing watched what happened
// after.
//
// R3 s9.2 makes this pattern-level and nothing else: a downgrade
// FOLLOWED by a completed day and a normal next session was one nobody
// needed. A single one says nothing, because people have bad days.
// ============================================================

const TODAY = '2026-06-01'
const DAYS = [
  '2026-05-04', '2026-05-06', '2026-05-08', '2026-05-11', '2026-05-13',
  '2026-05-15', '2026-05-18', '2026-05-20', '2026-05-22', '2026-05-25',
]

function log(
  d: AppData,
  date: string,
  o: { down: boolean; finished?: boolean },
): AppData {
  d.sessions[date] = {
    date,
    templateId: 't',
    status: o.finished === false ? 'partial' : o.down ? 'downgraded-completed' : 'completed',
    exercises: [],
    readiness: { flags: o.down ? [true, true, false, false] : [false, false, false, false], downgraded: o.down },
  } as unknown as SessionLog
  return d
}

/** n downgrades, each finished and each followed by a normal session. */
function wasted(n: number): AppData {
  let d = emptyAppData(TODAY, TODAY)
  d.settings.onboarded = true
  for (let i = 0; i < n; i++) {
    d = log(d, DAYS[i * 2], { down: true })
    d = log(d, DAYS[i * 2 + 1], { down: false })
  }
  return d
}

describe('what counts as a downgrade nobody needed', () => {
  it('starts at two flags of four for everybody', () => {
    expect(downgradeThreshold(emptyAppData(TODAY, TODAY))).toBe(2)
  })

  it('says nothing until it is a pattern', () => {
    expect(DOWNGRADES_BEFORE_EASING).toBe(4)
    expect(earlyFlagOffer(wasted(3), TODAY)).toBeNull()
    expect(earlyFlagOffer(wasted(4), TODAY)?.count).toBe(4)
  })

  it('does not count a rough patch as a false alarm', () => {
    // Dialled back, finished it, then dialled back AGAIN. That is what
    // the flags are for, not evidence against them.
    let d = emptyAppData(TODAY, TODAY)
    for (let i = 0; i < 8; i++) d = log(d, DAYS[i], { down: true })
    expect(earlyFlagOffer(d, TODAY)).toBeNull()
  })

  it('does not count a dialled-back day that was not finished', () => {
    // Half the test is "the day was completed". A downgrade followed by
    // an abandoned session is the flags being right.
    let d = emptyAppData(TODAY, TODAY)
    for (let i = 0; i < 4; i++) {
      d = log(d, DAYS[i * 2], { down: true, finished: false })
      d = log(d, DAYS[i * 2 + 1], { down: false })
    }
    expect(earlyFlagOffer(d, TODAY)).toBeNull()
  })

  it('does not count one that has no next session yet', () => {
    // The newest downgrade is still unjudged: nothing has happened after
    // it. Counting it would let today's bad morning tip the pattern.
    let d = wasted(3)
    d = log(d, DAYS[6], { down: true })
    expect(earlyFlagOffer(d, TODAY)).toBeNull()
  })
})

describe('taking the offer', () => {
  const accept = (): AppData => {
    const d = wasted(4)
    appendDecision(d, readinessDecision(earlyFlagOffer(d, TODAY)!, 'accepted', TODAY, 0))
    return d
  }

  it('raises the bar by exactly one flag', () => {
    expect(downgradeThreshold(accept())).toBe(3)
  })

  it('stops asking once it has been answered yes', () => {
    expect(earlyFlagOffer(accept(), '2026-07-01')).toBeNull()
  })

  it('leaves the bar alone on a no, and does not ask again tomorrow', () => {
    const d = wasted(4)
    appendDecision(d, readinessDecision(earlyFlagOffer(d, TODAY)!, 'declined', TODAY, 0))
    expect(downgradeThreshold(d)).toBe(2)
    expect(earlyFlagOffer(d, '2026-06-02')).toBeNull()
  })
})
