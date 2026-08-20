import { describe, expect, it } from 'vitest'
import { boundsFor, lastClosed, PERIOD_KINDS } from './periods'

// ============================================================
// Period boundaries are the one thing the review engine and the
// surface that offers reviews must agree on exactly. A month
// that ends a day early reviews February twice and March never.
// ============================================================

describe('the period a date falls in', () => {
  it('runs a week Monday to Sunday', () => {
    const b = boundsFor('week', '2026-08-13') // a Thursday
    expect(b.from).toBe('2026-08-10')
    expect(b.to).toBe('2026-08-16')
    expect(b.label).toBe('Week of Aug 10')
  })

  it('keeps Sunday in the week that started the Monday before', () => {
    // Sunday is day 0 in JS, which is exactly how weeks get split wrong.
    expect(boundsFor('week', '2026-08-16').from).toBe('2026-08-10')
  })

  it('runs a month from the 1st to the real last day', () => {
    expect(boundsFor('month', '2026-08-13')).toMatchObject({
      from: '2026-08-01',
      to: '2026-08-31',
      label: 'August 2026',
    })
    // 30-day months and February are where hardcoded 31s go wrong.
    expect(boundsFor('month', '2026-09-15').to).toBe('2026-09-30')
    expect(boundsFor('month', '2026-02-15').to).toBe('2026-02-28')
  })

  it('knows a leap February', () => {
    expect(boundsFor('month', '2028-02-15').to).toBe('2028-02-29')
  })

  it('groups quarters three months at a time', () => {
    expect(boundsFor('quarter', '2026-01-01')).toMatchObject({ from: '2026-01-01', to: '2026-03-31', label: 'Q1 2026' })
    expect(boundsFor('quarter', '2026-08-13')).toMatchObject({ from: '2026-07-01', to: '2026-09-30', label: 'Q3 2026' })
    expect(boundsFor('quarter', '2026-12-31')).toMatchObject({ from: '2026-10-01', to: '2026-12-31', label: 'Q4 2026' })
  })

  it('runs a year end to end', () => {
    expect(boundsFor('year', '2026-08-13')).toMatchObject({ from: '2026-01-01', to: '2026-12-31', label: '2026' })
  })

  it('gives every period a stable, storable id', () => {
    const ids = PERIOD_KINDS.map((k) => boundsFor(k, '2026-08-13').id)
    expect(ids).toEqual(['w-2026-08-10', 'm-2026-08', 'q-2026-3', 'y-2026'])
    // Same date, same ids, forever: these get persisted as "already seen".
    expect(PERIOD_KINDS.map((k) => boundsFor(k, '2026-08-13').id)).toEqual(ids)
  })
})

describe('the last closed period', () => {
  it('is the week before the one today sits in', () => {
    expect(lastClosed('week', '2026-08-13')).toMatchObject({ from: '2026-08-03', to: '2026-08-09' })
  })

  it('does not roll over early: on the last day of a month, last month is still last month', () => {
    // The trap: month arithmetic on the 31st reviewing the wrong month.
    expect(lastClosed('month', '2026-03-31').label).toBe('February 2026')
    expect(lastClosed('month', '2026-03-01').label).toBe('February 2026')
  })

  it('crosses the year boundary in every unit', () => {
    expect(lastClosed('week', '2026-01-01').to).toBe('2025-12-28')
    expect(lastClosed('month', '2026-01-15').label).toBe('December 2025')
    expect(lastClosed('quarter', '2026-01-15').label).toBe('Q4 2025')
    expect(lastClosed('year', '2026-01-01').label).toBe('2025')
  })

  it('is always actually finished, and never the one today sits in', () => {
    for (const today of ['2026-01-01', '2026-02-28', '2026-08-13', '2026-12-31']) {
      for (const kind of PERIOD_KINDS) {
        const closed = lastClosed(kind, today)
        expect(closed.to < today, `${kind} on ${today} is not over yet`).toBe(true)
        expect(closed.id, `${kind} on ${today} reviewed itself`).not.toBe(boundsFor(kind, today).id)
      }
    }
  })
})
