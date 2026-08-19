import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { confidenceOf, type KnowledgeRecord } from './knowledge'
import { KNOWLEDGE } from './knowledgeRegistry'

// ============================================================
// The three rules the envelope exists to enforce, and a fourth that
// stops the whole thing being decorative.
//
// A convention nobody checks is a comment. These are the checks.
// ============================================================

const ALL: KnowledgeRecord[] = KNOWLEDGE.flatMap((m) => m.records)

describe('provenance or a confession', () => {
  it('never lets a sourced tier ship without a source', () => {
    // The one rule that matters. Tier A, B or C is a claim that somebody
    // else stands behind it, and a claim with nothing behind it is the
    // thing this file exists to make impossible.
    const naked = ALL.filter((r) => r.evidence_tier !== 'D' && r.source_refs.length === 0)
    expect(naked.map((r) => r.id)).toEqual([])
  })

  it('resolves every source id against its own module table', () => {
    const dangling: string[] = []
    for (const m of KNOWLEDGE) {
      for (const r of m.records) {
        for (const s of r.source_refs) {
          if (!m.sources[s.id]) dangling.push(`${r.id} cites ${s.id}, which ${m.pack} does not list`)
        }
      }
    }
    expect(dangling).toEqual([])
  })

  it('gives every source a citation somebody could go and read', () => {
    const thin = KNOWLEDGE.flatMap((m) =>
      Object.entries(m.sources)
        .filter(([, s]) => s.cite.trim().length < 20)
        .map(([id]) => `${m.pack}:${id}`),
    )
    expect(thin).toEqual([])
  })

  it('never claims a better tier than its best source', () => {
    // Cite a single trial, you are tier B. Cite a summary, you are C. The
    // one thing a record may not do is dress its sources up.
    const RANK = { A: 3, B: 2, C: 1, D: 0 }
    const inflated: string[] = []
    for (const m of KNOWLEDGE) {
      for (const r of m.records) {
        if (r.evidence_tier === 'D' || r.source_refs.length === 0) continue
        const best = Math.max(...r.source_refs.map((s) => RANK[m.sources[s.id]?.tier ?? 'D']))
        if (RANK[r.evidence_tier] > best) {
          inflated.push(`${r.id} claims ${r.evidence_tier} on sources no better than tier ${best}`)
        }
      }
    }
    expect(inflated).toEqual([])
  })

  it('lists no source that nothing cites', () => {
    // A source table that drifts ahead of the records is how a pack ends
    // up looking better evidenced than the code actually is.
    const unused = KNOWLEDGE.flatMap((m) => {
      const cited = new Set(m.records.flatMap((r) => r.source_refs.map((s) => s.id)))
      return Object.keys(m.sources).filter((id) => !cited.has(id)).map((id) => `${m.pack}:${id}`)
    })
    expect(unused).toEqual([])
  })
})

/**
 * WHAT NO TEST HERE CAN CATCH, written down so nobody mistakes green for
 * safe: a number we invented, cited to real sources that do not actually
 * name it, and labelled A. `nutrition:kcalFloor.training` is exactly that
 * shape done honestly. The REDs consensus and the AHA guideline are why a
 * floor exists; neither says 1500. It is tier D and the sources are
 * attached as context, not as authority.
 *
 * Relabel it A and every check in this file still passes, because "do
 * these sources contain this number" is a question about the documents
 * and not about the record. The defence is that the shape makes the claim
 * legible to a reviewer, which is more than a bare `= 1500` ever did. It
 * is not that the build knows.
 */
describe('confidence is computed, never typed', () => {
  it('matches what confidenceOf derives for every record', () => {
    const wrong = ALL.filter((r) => {
      const group = r.contradiction_group
        ? ALL.filter((o) => o.contradiction_group === r.contradiction_group).length
        : 1
      const { confidence, ...rest } = r
      return confidence !== confidenceOf(rest, group)
    })
    expect(wrong.map((r) => r.id)).toEqual([])
  })

  it('keeps a house heuristic visibly below a sourced rule', () => {
    // The number has to be legible at a glance, or nobody reads it.
    for (const r of ALL) {
      if (r.evidence_tier === 'D') expect(r.confidence, r.id).toBeLessThanOrEqual(0.5)
      if (r.evidence_tier === 'A') expect(r.confidence, r.id).toBeGreaterThanOrEqual(0.8)
    }
  })

  it('discounts a record we could only read a summary of', () => {
    const base = { id: 'x', domain: 'nutrition' as const, payload: {}, evidence_tier: 'A' as const,
      valid_from: '2026-08-18', schema_version: 1, review_status: 'published' as const }
    expect(confidenceOf({ ...base, source_refs: [{ id: 'S1' }] })).toBe(0.95)
    expect(confidenceOf({ ...base, source_refs: [{ id: 'S1', summaryLevel: true }] })).toBe(0.81)
  })

  it('discounts a record the evidence disagrees about', () => {
    const base = { id: 'x', domain: 'nutrition' as const, payload: {}, evidence_tier: 'A' as const,
      source_refs: [{ id: 'S1' }], valid_from: '2026-08-18', schema_version: 1,
      review_status: 'published' as const }
    expect(confidenceOf({ ...base, contradiction_group: 'g' }, 2)).toBe(0.71)
    // Alone in its group is not a disagreement.
    expect(confidenceOf({ ...base, contradiction_group: 'g' }, 1)).toBe(0.95)
  })
})

describe('ids are permanent', () => {
  it('has no duplicates across every module', () => {
    const ids = ALL.map((r) => r.id)
    expect(ids.length).toBe(new Set(ids).size)
  })

  it('names every record {domain}:{slug}', () => {
    const bad = ALL.filter((r) => !new RegExp(`^${r.domain}:[a-zA-Z0-9.]+$`).test(r.id))
    expect(bad.map((r) => r.id)).toEqual([])
  })
})

describe('the registry is the whole registry', () => {
  const PLAN = join(import.meta.dirname, '.')
  function walk(dir: string): string[] {
    return readdirSync(dir).flatMap((n) => {
      const full = join(dir, n)
      return statSync(full).isDirectory() ? walk(full) : full.endsWith('.refs.ts') ? [full] : []
    })
  }

  it('imports every refs module that exists on disk', () => {
    // Writing a refs file and forgetting to register it would make the
    // module invisible to every check above, which is worse than not
    // having written it: it would look covered.
    const registry = readFileSync(join(PLAN, 'knowledgeRegistry.ts'), 'utf8')
    const orphans = walk(PLAN)
      .map((f) => f.split('/').pop()!.replace('.refs.ts', ''))
      .filter((name) => !registry.includes(`./${name}.refs`))
    expect(orphans).toEqual([])
  })

  it('is not empty, which would pass every other test in this file', () => {
    expect(KNOWLEDGE.length).toBeGreaterThan(0)
    expect(ALL.length).toBeGreaterThan(0)
  })
})

describe('no em dash reaches a record', () => {
  it('keeps the tell out of anything that could be shown', () => {
    const dashed = ALL.filter((r) => JSON.stringify(r).includes('—'))
    expect(dashed.map((r) => r.id)).toEqual([])
  })
})
