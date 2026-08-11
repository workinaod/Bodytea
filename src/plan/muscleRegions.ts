// ============================================================
// The muscle regions the body map can light up. Data, not
// drawing: plan/muscles.ts maps every exercise onto these, so
// the vocabulary lives with the mapping rather than with the
// SVG that paints it.
// ============================================================

export type MuscleRegion =
  | 'delts-front'
  | 'delts-side'
  | 'delts-rear'
  | 'traps'
  | 'chest-upper'
  | 'chest'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'abs'
  | 'obliques'
  | 'hip-flexors'
  | 'quads'
  | 'adductors'
  | 'tibialis'
  | 'calves'
  | 'achilles-feet'
  | 'lats'
  | 'mid-back'
  | 'lower-back'
  | 'glutes'
  | 'hamstrings'
  | 'full-body'
  | 'heart'
