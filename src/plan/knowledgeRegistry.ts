import type { ModuleRefs } from './knowledge'
import { BMR_REFS } from './bmr.refs'
import { NUTRITION_REFS } from './nutrition.refs'

// ============================================================
// Every knowledge module in the app.
//
// Its own file, not part of knowledge.ts, because a refs module needs
// confidenceOf and the registry needs the refs module: putting both in
// one file makes a cycle that leaves TIER_BASE undefined at import time.
// Types and arithmetic in knowledge.ts, the list here, and nothing
// imports upward.
//
// A registry rather than a convention, because a convention is something
// people remember and a registry is something the build checks. A module
// missing from this list is invisible to every check in
// knowledge.test.ts, so writing one and forgetting to add it here would
// look like coverage rather than the absence of it. The test walks the
// directory for `.refs.ts` files and fails on any this file does not
// name.
// ============================================================

export const KNOWLEDGE: ModuleRefs[] = [NUTRITION_REFS, BMR_REFS]
