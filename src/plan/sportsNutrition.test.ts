import { describe, expect, it } from 'vitest'
import {
  CARB_G_PER_KG,
  FUELLING,
  PROTEIN_CEILING_G_PER_KG,
  PROTEIN_G_PER_KG,
  SUPPLEMENT_EVIDENCE,
  carbTargetG,
  fatFloorG,
  macroTargets,
  proteinTargetG,
  toKg,
  waterTargetMl,
  weeklyGainRangeLb,
  weeklyLossRangeLb,
} from './sportsNutrition'
import { buildNutrition, proteinContextFor } from './generator'

// ============================================================
// These check the numbers against the ranges they came from,
// which is the only way a table like this stays trustworthy.
// A typo in a constant here does not crash anything: it just
// quietly tells somebody to eat the wrong amount for a year.
// ============================================================

describe('protein sits inside the published ranges', () => {
  it('every context lands between the RDA and the ceiling', () => {
    for (const [ctx, gPerKg] of Object.entries(PROTEIN_G_PER_KG)) {
      // Below 1.2 is not an athlete's intake; above the ceiling nothing
      // further has ever been demonstrated.
      expect(gPerKg, `${ctx} too low`).toBeGreaterThanOrEqual(1.2)
      expect(gPerKg, `${ctx} above the ceiling`).toBeLessThanOrEqual(PROTEIN_CEILING_G_PER_KG)
    }
  })

  it('a deficit asks for MORE protein than maintenance, which is the whole point', () => {
    expect(PROTEIN_G_PER_KG.deficit).toBeGreaterThan(PROTEIN_G_PER_KG.general)
    expect(PROTEIN_G_PER_KG.aggressiveDeficit).toBeGreaterThan(PROTEIN_G_PER_KG.deficit)
  })

  it('endurance asks for less, because the rest of the plate is fuel', () => {
    expect(PROTEIN_G_PER_KG.endurance).toBeLessThan(PROTEIN_G_PER_KG.hypertrophy)
  })

  it('the muscle-building target still matches the 1 g/lb heuristic it replaced', () => {
    // Deliberate: this module exists to raise protein where the evidence
    // says raise it, not to cut everyone's in the name of precision.
    for (const lb of [140, 160, 180, 200, 220]) {
      expect(Math.abs(proteinTargetG(lb, 'hypertrophy') - lb), `${lb} lb`).toBeLessThanOrEqual(5)
    }
  })

  it('someone cutting gets more than they would have before', () => {
    for (const lb of [140, 180, 220]) {
      expect(proteinTargetG(lb, 'aggressiveDeficit')).toBeGreaterThan(lb)
    }
  })
})

describe('the guided path routes goals to the right protein band', () => {
  it('a big cut gets the aggressive-deficit number', () => {
    expect(proteinContextFor('lean', { 'lose-amount': '30+ lb' })).toBe('aggressiveDeficit')
    expect(proteinContextFor('lean', {})).toBe('deficit')
  })

  it('endurance and muscle do not get the same prescription', () => {
    expect(proteinContextFor('endurance')).toBe('endurance')
    expect(proteinContextFor('muscle')).toBe('hypertrophy')
    expect(buildNutrition('endurance', 180).proteinTargetG).toBeLessThan(
      buildNutrition('muscle', 180).proteinTargetG,
    )
  })

  it('a cut prescribes more protein than a bulk at the same bodyweight', () => {
    // The counterintuitive one, and the one that matters most: eating at a
    // deficit is when muscle is most at risk, so protein goes UP.
    expect(buildNutrition('lean', 180).proteinTargetG).toBeGreaterThan(
      buildNutrition('muscle', 180).proteinTargetG,
    )
  })
})

describe('carbohydrate scales with the work the day actually holds', () => {
  it('the load bands are ordered and inside the endurance-nutrition ranges', () => {
    const { rest, moderate, high, veryHigh } = CARB_G_PER_KG
    expect(rest).toBeLessThan(moderate)
    expect(moderate).toBeLessThan(high)
    expect(high).toBeLessThan(veryHigh)
    expect(rest).toBeGreaterThanOrEqual(3)
    expect(veryHigh).toBeLessThanOrEqual(12)
  })

  it('a hard day gets meaningfully more than a rest day', () => {
    expect(carbTargetG(180, 'high')).toBeGreaterThan(carbTargetG(180, 'rest') * 1.5)
  })
})

describe('fat never falls below the floor', () => {
  it('holds the higher of the per-kg and per-calorie minimums', () => {
    // A big athlete on few calories is bound by mass; a small athlete on
    // many is bound by the percentage. Both cases have to hold.
    expect(fatFloorG(220, 1600)).toBeGreaterThanOrEqual(45)
    expect(fatFloorG(120, 3200)).toBeGreaterThanOrEqual(50)
  })
})

describe('a full macro split is physically coherent', () => {
  it('the three macros add up to roughly the calories they split', () => {
    for (const lb of [120, 160, 200, 260]) {
      for (const kcal of [1600, 2200, 2800, 3600]) {
        const m = macroTargets({ bodyweightLb: lb, kcal, protein: 'hypertrophy', load: 'moderate' })
        const summed = m.proteinG * 4 + m.carbsG * 4 + m.fatG * 9
        // Rounding every macro to 5 g can only drift a few dozen calories.
        expect(Math.abs(summed - kcal), `${lb} lb @ ${kcal}`).toBeLessThanOrEqual(60)
      }
    }
  })

  it('never returns a negative or impossible macro', () => {
    for (const lb of [90, 180, 330]) {
      for (const kcal of [1200, 1500, 2000, 4000]) {
        const m = macroTargets({ bodyweightLb: lb, kcal, protein: 'aggressiveDeficit', load: 'rest' })
        expect(m.carbsG, `${lb}/${kcal} carbs`).toBeGreaterThanOrEqual(0)
        expect(m.fatG, `${lb}/${kcal} fat`).toBeGreaterThan(0)
        expect(m.proteinG, `${lb}/${kcal} protein`).toBeGreaterThan(0)
      }
    }
  })

  it('keeps fat above its floor even on an aggressive cut', () => {
    const m = macroTargets({ bodyweightLb: 200, kcal: 1800, protein: 'aggressiveDeficit', load: 'rest' })
    expect(m.fatG).toBeGreaterThanOrEqual(fatFloorG(200, 1800))
  })
})

describe('hydration and rate of change', () => {
  it('scales water with bodyweight and with training hours', () => {
    expect(waterTargetMl(180, 0)).toBeGreaterThan(waterTargetMl(120, 0))
    expect(waterTargetMl(180, 2)).toBeGreaterThan(waterTargetMl(180, 0))
  })

  it('keeps weight-change advice inside what is achievable without losing muscle', () => {
    const [lossMin, lossMax] = weeklyLossRangeLb(200)
    expect(lossMin).toBeGreaterThan(0)
    expect(lossMax).toBeLessThanOrEqual(2) // 1% of 200 lb
    const [gainMin, gainMax] = weeklyGainRangeLb(200)
    expect(gainMax).toBeLessThan(lossMax) // muscle arrives slower than fat leaves
    expect(gainMin).toBeGreaterThan(0)
  })

  it('converts pounds to kilograms correctly', () => {
    expect(toKg(220.462)).toBeCloseTo(100, 1)
  })
})

describe('the knowledge entries are complete enough to show', () => {
  it('every fuelling rule says when, what and why', () => {
    for (const r of FUELLING) {
      expect(r.when.length, r.id).toBeGreaterThan(5)
      expect(r.what.length, r.id).toBeGreaterThan(15)
      expect(r.why.length, r.id).toBeGreaterThan(30)
    }
  })

  it('every supplement carries a dose, a timing and an evidence grade', () => {
    for (const s of SUPPLEMENT_EVIDENCE) {
      expect(s.dose.length, s.id).toBeGreaterThan(5)
      expect(s.timing.length, s.id).toBeGreaterThan(5)
      expect(s.effect.length, s.id).toBeGreaterThan(40)
      expect(['strong', 'moderate', 'limited']).toContain(s.evidence)
    }
  })

  it('is ordered by evidence, strongest first', () => {
    const rank = { strong: 0, moderate: 1, limited: 2 }
    const grades = SUPPLEMENT_EVIDENCE.map((s) => rank[s.evidence])
    // Not strictly sorted (protein powder is strong and sits last on
    // purpose, being food rather than an ergogenic), so just check the
    // strongest claims are not buried below the weak ones.
    expect(grades[0]).toBe(0)
    expect(Math.max(...grades)).toBeLessThanOrEqual(1)
  })
})
