import type { CohortStat } from './cohort'
import type { PeriodHighlight, PeriodReview, PhotoPair } from './periodReview'

// ============================================================
// A period review, turned into story cards.
//
// Separate from the review itself because the review is facts
// and this is the telling: which facts are worth a card, in
// what order, and what to say when there are none. A Wrapped
// that opens on a card the athlete cannot fill is worse than no
// Wrapped, so every card here declares its own precondition and
// is dropped rather than shown empty.
//
// It is also the only place the tone lives. One file to change
// when the coach's voice changes, instead of four screens.
// ============================================================

export type StoryKind = 'stat' | 'list' | 'cohort' | 'photos' | 'ask' | 'close'

export interface StoryItem {
  icon?: string
  label: string
  detail: string
}

export interface StoryCard {
  id: string
  kind: StoryKind
  eyebrow: string
  /** The one big number. Absent on cards that are a list or a picture. */
  big?: string
  caption: string
  /** CSS colour for the bloom behind the card. */
  glow: string
  items?: StoryItem[]
  cohort?: CohortStat[]
  photos?: PhotoPair[]
}

const ACCENT = 'var(--color-accent)'
const LIME = 'var(--color-lime)'
const CYAN = 'var(--color-cyan)'
const GOLD = 'var(--color-gold)'

const PERIOD_NOUN = {
  week: 'week',
  month: 'month',
  quarter: 'quarter',
  year: 'year',
} as const

function openingCaption(r: PeriodReview): string {
  const noun = PERIOD_NOUN[r.bounds.kind]
  if (r.sessionsDone === 0) return `No sessions logged this ${noun}. The record says what happened, not what was meant to.`
  if (r.sessionsScheduled > 0 && r.sessionsDone >= r.sessionsScheduled) {
    return `Every session the plan asked for, and then some. That is a ${noun} that counts.`
  }
  if (r.sessionsDone === 1) return `One session. It is on the record, and one beats none every time.`
  return `${r.sessionsDone} sessions banked. Nothing here was given to you.`
}

function toItems(highlights: PeriodHighlight[]): StoryItem[] {
  return highlights.map((h) => ({ icon: h.icon, label: h.label, detail: h.detail }))
}

export function storyCards(r: PeriodReview): StoryCard[] {
  const cards: StoryCard[] = []
  const noun = PERIOD_NOUN[r.bounds.kind]

  cards.push({
    id: 'open',
    kind: 'stat',
    eyebrow: r.bounds.label,
    big: String(r.sessionsDone),
    caption: openingCaption(r),
    glow: ACCENT,
  })

  if (r.tonnageLb > 0) {
    cards.push({
      id: 'tonnage',
      kind: 'stat',
      eyebrow: 'Weight moved',
      big: r.tonnageLb.toLocaleString(),
      caption: `Pounds, across ${r.setsDone} ${r.setsDone === 1 ? 'set' : 'sets'}. Every rep counted once, honestly.`,
      glow: LIME,
    })
  }

  if (r.prCount > 0) {
    cards.push({
      id: 'prs',
      kind: 'stat',
      eyebrow: 'Personal records',
      big: String(r.prCount),
      caption:
        r.prCount === 1
          ? 'One number you had never hit before. It is yours now.'
          : `${r.prCount} numbers you had never hit before. They are yours now.`,
      glow: GOLD,
    })
  }

  const strength = r.strength.filter((s) => s.pct !== 0)
  if (strength.length > 0) {
    cards.push({
      id: 'strength',
      kind: 'list',
      eyebrow: 'Strength',
      caption: `Estimated maxes, start of the ${noun} to the end of it.`,
      glow: LIME,
      items: strength.map((s) => ({
        icon: s.pct > 0 ? '📈' : '📉',
        label: `${s.label} ${s.pct > 0 ? '+' : ''}${s.pct}%`,
        detail: `${s.beforeE1rm} lb to ${s.afterE1rm} lb.`,
      })),
    })
  }

  const moved = r.progression.filter((d) => typeof d.delta === 'number' && d.delta !== 0)
  if (moved.length > 0) {
    cards.push({
      id: 'progression',
      kind: 'list',
      eyebrow: 'The body',
      caption: `What the tape and the scale said across the ${noun}.`,
      glow: CYAN,
      items: moved.map((d) => {
        const good = d.better === 'up' ? d.delta! > 0 : d.delta! < 0
        return {
          icon: good ? '✅' : '•',
          label: `${d.label} ${d.delta! > 0 ? '+' : ''}${d.delta}${d.unit === '%' ? '%' : ` ${d.unit}`}`,
          detail: `${d.before} to ${d.after}.`,
        }
      }),
    })
  }

  if (r.goals.length > 0) {
    cards.push({
      id: 'goals',
      kind: 'list',
      eyebrow: 'Goals accomplished',
      caption: 'Things that were not true when this started.',
      glow: GOLD,
      items: r.goals.map((g) => ({ icon: '🎯', label: g.label, detail: g.detail })),
    })
  }

  if (r.highlights.length > 0) {
    cards.push({
      id: 'highlights',
      kind: 'list',
      eyebrow: 'Highlights',
      caption: `The ${noun} in the parts worth repeating.`,
      glow: ACCENT,
      items: toItems(r.highlights),
    })
  }

  if (r.cohort.length > 0) {
    cards.push({
      id: 'cohort',
      kind: 'cohort',
      eyebrow: 'How that compares',
      caption: 'Against published population data, not a leaderboard. Each line says who it is measured against.',
      glow: CYAN,
      cohort: r.cohort,
    })
  }

  if (r.photos.length > 0) {
    const widest = [...r.photos].sort((a, b) => b.weeksApart - a.weeksApart)[0]
    cards.push({
      id: 'photos',
      kind: 'photos',
      eyebrow: 'Then and now',
      caption: `${widest.weeksApart} weeks between these. The scale argues, the camera does not.`,
      glow: GOLD,
      photos: r.photos,
    })
  }

  if (r.askForPhotos) {
    const never = r.missingAngles.length === 2
    cards.push({
      id: 'ask',
      kind: 'ask',
      eyebrow: 'Photos',
      caption: never
        ? 'Take a front and a side shot. Same spot, same light, same time of day. In three months this is the picture you will want, and it only exists if you take it now.'
        : 'Front and side, same spot and same light. One minute now, and the quarter review has something real to show.',
      glow: CYAN,
    })
  }

  cards.push({
    id: 'close',
    kind: 'close',
    eyebrow: `Next ${noun}`,
    big: '→',
    caption:
      r.sessionsDone === 0
        ? 'One session is the whole ask. Start there.'
        : `Same inputs, one more time. That is the entire method.`,
    glow: LIME,
  })

  return cards
}
