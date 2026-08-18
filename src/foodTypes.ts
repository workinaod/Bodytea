// ============================================================
// What somebody cannot eat, as opposed to what they choose not to.
//
// Dairy is its own flag rather than a diet style because it crosses all
// of them: plenty of omnivores and most vegetarians-who-are-really-
// vegans-about-milk need it. Allergies are free text because every chip
// list is missing somebody's allergy, and being missing from that list
// is the moment an app stops feeling like it is for you.
//
// Its own file, beside journeyTypes and prefsTypes, for the same reason
// they got one: the rules that read this shape are a subsystem now
// (plan/foodLimits.ts), not a field somebody glances at.
// ============================================================

export interface FoodLimits {
  /** Excludes milk, cheese, yogurt, butter, cream, whey, the lot. */
  dairyFree?: boolean
  /**
   * In their words. Read as exclusions and nothing else: a word we do not
   * recognise still removes every meal containing it, and one we do
   * removes its whole family. Never read as permission.
   */
  allergies?: string
}
