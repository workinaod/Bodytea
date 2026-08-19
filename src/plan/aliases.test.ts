import { describe, expect, it } from 'vitest'
import { ALIASES, CONFIRM_THRESHOLD, nameScore, normalizeName, resolveExercise } from './aliases'
import { EXERCISES } from './exercises'
import { MOVEMENT } from './movement'
import { equipFor } from './equip'

// ============================================================
// R-ONT sized this with real data and the number is the argument:
// with an aggressive normalizer, only 26 of BodyT's 194 names matched
// free-exercise-db exactly, and "bulgarian" returns ZERO hits there
// because the movement is filed under a different family name.
//
// So the whole design is a candidate generator with a human gate. What
// these guard is the gate, not the matching: the dangerous failure is
// not "did not recognise it", it is "recognised it as the wrong thing
// and said nothing".
// ============================================================

describe('the normalizer, step by step', () => {
  it('folds case, accents and punctuation', () => {
    expect(normalizeName('  Góblet   Squat!! ').key).toBe('goblet squat')
  })

  it('expands the abbreviations people actually type', () => {
    expect(normalizeName('DB RDL').key).toBe(normalizeName('dumbbell romanian deadlift').key)
    expect(normalizeName('BB OHP').key).toBe(normalizeName('barbell overhead press').key)
    expect(normalizeName('CGBP').key).toBe(normalizeName('close grip bench press').key)
  })

  it('eats the longer abbreviation first', () => {
    // 'db' inside 'db rdl' must not consume the 'rdl' and leave a stub.
    expect(normalizeName('db rdl').key).toContain('romanian')
    expect(normalizeName('db rdl').key).toContain('dumbbell')
  })

  it('singularizes without mangling a word that ends in s', () => {
    expect(normalizeName('push ups').key).toBe(normalizeName('push up').key)
    // The one that a general stemmer gets wrong: press must stay press.
    expect(normalizeName('press').key).toBe('press')
    expect(normalizeName('bench press').key).toContain('press')
  })

  it('token-sorts, so word order stops mattering', () => {
    expect(normalizeName('flat db press').key).toBe(normalizeName('press db flat').key)
  })

  it('KEEPS the parenthetical instead of throwing it away', () => {
    // R-ONT: stripping parentheticals creates four name collisions inside
    // free-exercise-db alone, and every time the parenthetical was the
    // whole distinction. Turkish Get-Up (Lunge) is not (Squat).
    const lunge = normalizeName('Turkish Get-Up (Lunge style)')
    const squat = normalizeName('Turkish Get-Up (Squat style)')
    expect(lunge.key).toBe(squat.key)
    expect(lunge.qualifier).not.toBe(squat.qualifier)
    expect(lunge.qualifier).toBe('lunge')
    expect(squat.qualifier).toBe('squat')
  })
})

describe('the ladder resolves only what it is sure of', () => {
  it('takes an id as an id', () => {
    expect(resolveExercise('goblet-squat')).toEqual({ kind: 'resolved', id: 'goblet-squat', how: 'id' })
  })

  it('takes a catalog name however it was typed', () => {
    const r = resolveExercise('  goblet   SQUAT ')
    expect(r).toEqual({ kind: 'resolved', id: 'goblet-squat', how: 'name' })
  })

  it('takes an authored alias', () => {
    const r = resolveExercise('DB bench')
    expect(r.kind).toBe('resolved')
    expect(r.kind === 'resolved' && r.id).toBe('flat-db-press')
  })

  it('SUGGESTS rather than resolves when a word is genuinely ambiguous', () => {
    // "press" is bench, overhead and leg. A map would have to pick a
    // winner; a flat array gets to say it does not know.
    const r = resolveExercise('press')
    expect(r.kind).toBe('suggest')
    expect(r.kind === 'suggest' && r.ids.length).toBeGreaterThan(1)
  })

  it('SUGGESTS rather than resolves below the confidence threshold', () => {
    // A hip thrust is not a glute bridge. It is close enough to be worth
    // offering and not close enough to write into somebody's week.
    const r = resolveExercise('hip thrust')
    expect(r.kind).toBe('suggest')
    expect(r.kind === 'suggest' && r.ids).toContain('glute-bridge')
  })

  it('lets the catalog answer before the alias table gets a turn', () => {
    // "Romanian deadlift" IS a catalog name, so step 2 resolves it and
    // step 3 never runs. The first draft of the alias table had a row
    // for it pointing at db-rdl, which could never fire and read as
    // coverage. The guard below stops that class coming back.
    const r = resolveExercise('romanian deadlift')
    expect(r).toEqual({ kind: 'resolved', id: 'romanian-deadlift', how: 'name' })
  })

  it('offers near misses instead of silence', () => {
    const r = resolveExercise('bulgarian split squats')
    expect(r.kind === 'resolved' || r.kind === 'suggest').toBe(true)
  })

  it('says it does not know rather than guessing', () => {
    expect(resolveExercise('qzxwv nothing')).toEqual({ kind: 'unknown' })
    expect(resolveExercise('   ')).toEqual({ kind: 'unknown' })
  })

  it('never resolves anything to an id the catalog does not have', () => {
    const probes = ['db bench', 'press', 'goblet squat', 'bulgarian split squat', 'romanian deadlift', 'plank']
    for (const p of probes) {
      const r = resolveExercise(p)
      const ids = r.kind === 'resolved' ? [r.id] : r.kind === 'suggest' ? r.ids : []
      for (const id of ids) expect(EXERCISES[id], `${p} -> ${id}`).toBeTruthy()
    }
  })
})

describe('the alias table itself', () => {
  it('only ever points at exercises that exist', () => {
    const missing = ALIASES.filter((a) => !EXERCISES[a.id]).map((a) => `${a.key} -> ${a.id}`)
    expect(missing).toEqual([])
  })

  it('stores every key already normalized', () => {
    // A row whose key is not in normal form can never be hit, which is a
    // dead row that looks like coverage.
    const raw = ALIASES.filter((a) => normalizeName(a.key).key !== a.key).map((a) => a.key)
    expect(raw).toEqual([])
  })

  it('has no row the catalog already answers', () => {
    // Step 2 runs before step 3, so a row whose key is an exact catalog
    // name can never fire. It is a dead row that looks like coverage,
    // which is the same failure the dead-export ledger exists for.
    const catalogKeys = new Set(Object.values(EXERCISES).map((e) => normalizeName(e.name).key))
    const shadowed = ALIASES.filter((a) => catalogKeys.has(a.key)).map((a) => `${a.key} -> ${a.id}`)
    expect(shadowed).toEqual([])
  })

  it('keeps confidence meaningful at both ends', () => {
    for (const a of ALIASES) {
      expect(a.confidence, a.key).toBeGreaterThan(0)
      expect(a.confidence, a.key).toBeLessThanOrEqual(1)
    }
    expect(ALIASES.some((a) => a.confidence >= CONFIRM_THRESHOLD)).toBe(true)
    expect(ALIASES.some((a) => a.confidence < CONFIRM_THRESHOLD)).toBe(true)
  })

  it('never lets one key resolve to two different exercises', () => {
    // If two rows share a key and both sit above the threshold, the
    // resolver would silently pick one. That is the exact failure this
    // whole file exists to prevent.
    const byKey = new Map<string, Set<string>>()
    for (const a of ALIASES.filter((x) => x.confidence >= CONFIRM_THRESHOLD)) {
      byKey.set(a.key, new Set([...(byKey.get(a.key) ?? []), a.id]))
    }
    const forked = [...byKey.entries()].filter(([, ids]) => ids.size > 1).map(([k]) => k)
    expect(forked).toEqual([])
  })
})

describe('the discriminator rule', () => {
  it('never merges two movements that differ on pattern or laterality', () => {
    // R-ONT s5.4: two names merge only if every discriminator agrees.
    // Squats and squat jumps score high on name similarity and are not
    // the same movement.
    for (const a of ALIASES.filter((x) => x.confidence >= CONFIRM_THRESHOLD)) {
      const also = ALIASES.filter((b) => b.key === a.key && b.id !== a.id)
      for (const b of also) {
        const ma = MOVEMENT[a.id]
        const mb = MOVEMENT[b.id]
        if (!ma || !mb) continue
        expect(ma.pattern, `${a.key}: ${a.id} vs ${b.id}`).toBe(mb.pattern)
        expect(ma.laterality ?? 'bilateral').toBe(mb.laterality ?? 'bilateral')
      }
    }
  })

  it('does not confuse a barbell row with a dumbbell one', () => {
    // Equipment class is a discriminator, and these two names are one
    // token apart.
    const bb = resolveExercise('barbell bent over row')
    expect(bb.kind === 'resolved' && bb.id).toBe('barbell-row')
    expect(equipFor('barbell-row')).not.toEqual(equipFor('one-arm-db-row'))
  })
})

describe('the score behaves', () => {
  it('is 1 for a string against itself and low for strangers', () => {
    expect(nameScore('goblet squat', 'goblet squat')).toBeCloseTo(1, 5)
    expect(nameScore('goblet squat', 'lat pulldown')).toBeLessThan(0.2)
  })

  it('ranks a near miss above an unrelated movement', () => {
    expect(nameScore('goblet squat', 'goblet squats')).toBeGreaterThan(nameScore('goblet squat', 'face pull'))
  })
})
