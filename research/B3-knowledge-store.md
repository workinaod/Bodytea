# B3 DESIGN: KNOWLEDGE STORE + RETRIEVAL ARCHITECTURE

Job B3 for BodyT. Design only, no production code changes. Grounded by reading the working
branch `claude/app-audit-refinement-sjw2va` at `67ceb91` and the live `gh-pages` deploy.

Standing constraints this design is built inside (BODYT_STATE.md sections 1, 5, 6):
deterministic core, zero runtime LLM calls, local-first PWA, suggest-only, layering law
`plan -> engine/store -> cloud/logic/platform -> components/screens`, file caps in
`src/structure.test.ts`, Supabase is `bodytea-prod` only.

Every number below is either MEASURED (stated with its source) or a BUDGET/TARGET
(stated as such). Nothing is a guess presented as a fact.

---

## 0. MEASURED BASELINE (what exists today)

Taken from `origin/gh-pages` (the live deploy, bundle `index-u6su8hMr.js`, which BODYT_STATE.md
records as the J2 deploy) and from the source tree at `67ceb91`.

| Thing | Measured |
|---|---|
| Total deployed bytes | **3,637,548** (3.47 MiB) across **131** workbox precache entries |
| Entry chunk `assets/index-u6su8hMr.js` | **1,184,535** bytes |
| Lazy chunk `assets/sync-B4ZTbmiW.js` (Supabase) | 224,689 bytes, dynamic-import only (`src/cloud/sync.ts` header) |
| Lazy chunk `assets/board-BYQk02VY.js` | 1,656 bytes |
| CSS | 91,763 bytes |
| Demo images | **1,984,304** bytes across **112** `.webp` files (`public/demo/`) |
| Fonts | 93,348 bytes, 2 `.woff2` |
| `src/plan/` source, comments stripped | **633,602** bytes (730,566 raw, 13% comments) |
| All non-test `src/` source, comments stripped | ~1,615,557 bytes; `plan/` is **39%** of it |

Derived budget-grade estimate (not a measurement, owed a real number in stage 0): with
React + ReactDOM + zustand + zod at roughly 150 KB minified, app code in the entry chunk is
~1.03 MB, of which the `plan/` layer's 39% source share puts today's in-bundle knowledge at
roughly **400 KB minified**. `scripts/bundleReport.mjs` in stage 0 replaces this estimate.

Record counts, counted from source:

| Corpus | File(s) | Records | Bytes/record (source, comments stripped) |
|---|---|---|---|
| Exercise guides (`ExerciseDef`) | `plan/exercises.ts` (77), `athleticExercises.ts` (71), `homeExercises.ts` (21), `gymExercises.ts` (16), `athleticCoverage.ts` (9) | **194 unique ids** | ~1,190 (exercises.ts: 91,771 / 77) |
| Movement graph (`MovementMeta`) | `plan/movement.ts` | **111** | ~210 |
| Foods (`FoodDef`) | `plan/foods.ts` | **85** | ~205 (file also holds meal templates + builders) |
| Role recipes | `plan/generator.ts` `RECIPES` | **8** (`power, speed, lowerStrength, push, pull, upperMix, fullBody, mobility`) | n/a |
| Weekly layouts | `plan/generator.ts` `LAYOUTS` | **16** (4 goal families x 4 day counts) | n/a |
| Day templates | `plan/templates.ts` `TEMPLATES` | 11 | n/a |
| Meal templates | `plan/foods.ts` `MEAL_TEMPLATES` | 10 | n/a |
| Demo keyframe entries | `plan/demos.ts` | 218 keys / 112 image files (56 movements x 2) | n/a |
| Evidence rules as records | none yet | **0** | R1 holds ~45 extractable rules over 28 sources; R6 holds ~42 over 13 |

Storage and cloud, as built:

- `src/store/storage.ts`: app state is ONE `localStorage` key `naod.state`; IndexedDB
  `naod-photos` **version 2** with stores `photos` and `meta`; `withStore()` helper;
  `storageUsage()` wraps `navigator.storage.estimate()`. `LocalStorageDriver.save()` returns
  `boolean` on purpose, because a silent failed write is the worst bug this app has.
- `src/store/schema.ts`: zod envelope, `SCHEMA_VERSION` = 20, `migrations[n] -> n+1`,
  `migrate()` then `envelopeSchema.safeParse`. Migrations only accumulate.
- `src/cloud/sync.ts`: dynamic import only, 10 s debounced push, `ENVELOPE_MAX_BYTES` cap.
- `supabase/migrations/0001_core_tables_rls.sql`: `profiles`, `states` (jsonb, hard
  `pg_column_size <= 2097152`), `board_stats`. All RLS on; `profiles` is service-role write only.
- `vite.config.ts`: `VitePWA` `injectManifest`, `globPatterns` covers
  `js,css,html,svg,png,webp,woff2` (note: no `.json`, no `.gz`),
  `maximumFileSizeToCacheInBytes: 4 * 1024 * 1024`, `base: '/Bodytea/'`.
- `src/structure.test.ts`: `HARD_MAX = 600` lines, shrink-only allowlist (`types.ts` 705,
  `plan/generator.ts` 941, `store/schema.ts` 649 are already at their ceilings), layering
  ranks `plan:0, engine:1, store:1, cloud:2, logic:2, platform:2, components:3, screens:3`,
  a platform-isolation allowlist, and a 48-entry dead-export allowlist.

---

## 1. SCALE REALITY CHECK: where millions actually come from

The mandate says millions of data points. The honest engineering answer is that **exactly two
domains are million-scale, and neither of them is on the planning path.** Everything the
planner reads is hundreds to low tens of thousands. Conflating those two facts is how a
project ends up with a vector database it does not need and an app that will not start offline.

| Domain | Today | Realistic ceiling | Scale class | Where it must live |
|---|---|---|---|---|
| Movement graph (`MovementMeta`: pattern, role, skill, fatigue, stress, chains, transfer) | 111 | 400 to 800 | **hundreds** | HOT, forever |
| Exercise guides (`ExerciseDef` with steps/why/mistakes/cue) | 194 | 1,000 to 1,500 distinct after dedup (see the measured corpus table below) | **thousands** | HOT stub + WARM prose |
| Program archetypes | 8 recipes + 16 layouts | 40 to 120 (R5 targets 4 to 6 typed families) | **hundreds** | HOT |
| Evidence rules (R1 + R6 + R3/R4/R5) | 0 as records | 2,000 to 5,000 across all domains | **thousands** | HOT (safety, nutrition constants) + WARM (prose, sources) |
| Recipes / meals | 10 templates | 5,000 to 50,000 (R4 corpus expansion) | **tens of thousands** | WARM |
| Demo media | 112 webp / 1.98 MB | 3,000 files / ~50 MB at 1,500 movements | media, not records | WARM (opt-in) or CDN, never precache |
| **FOOD** | 85 | USDA FoodData Central: Branded ~450k, SR Legacy 7,793, FNDDS ~15k, Foundation ~350. Open Food Facts: ~3.9M products, on the order of 1M with usable nutrition panels | **MILLIONS** | **COLD** (+ WARM top-N cache) |
| **Population / outcome events** (B1 decision log) | 0 | One athlete: ~3,700 set-events + ~1,500 decisions per year. 10k athletes: ~50M rows/year | **MILLIONS** | **COLD** (telemetry), derived aggregates promoted to WARM |

### The open exercise corpora are smaller than the mandate assumes (MEASURED)

Three open corpora were pulled in an earlier session of this project and are still on disk
(`fedb.json`, `w1.json` / `w2.json`, `exm.json`). Counted rather than estimated:

| Corpus | Records | Raw bytes | Bytes/record | Notes |
|---|---|---|---|---|
| free-exercise-db | **873** | 1,001,472 | **1,147** | 868 (99%) carry `instructions`, avg 655 bytes of prose; 1,746 image refs; 13 equipment values; levels 523 beginner / 293 intermediate / 57 expert |
| wger exercise bases | **869** | paged | n/a | First page of 500 bases holds 1,962 translations, of which **493 English**. So ~3.9 translation rows per base but roughly one English exercise per base |
| exercemus-style dump (`exm.json`) | **872** | 865,869 | ~993 | Fields: category, description, equipment, instructions, name, primary/secondary muscles, variations_on, video |

Two things fall out of this, and both are load-bearing:

1. **All three corpora are ~870 records and they overlap heavily** (they are largely the same
   public exercise list re-published). The union is on the order of **1,000 to 1,500 distinct
   English movements**, not thousands, and certainly not millions. wger's "thousands" is a
   translation-row count, not an exercise count. Anyone sizing storage from the raw API count
   will over-build by 4x.
2. **Their bytes/record (1,147 and ~993) matches BodyT's own measured 1,190** bytes/record in
   `plan/exercises.ts` almost exactly. That is a useful corroboration: the warm-pack sizing in
   section 2 is built on a per-record cost that two independent corpora agree on.

Media is the part that actually grows: free-exercise-db alone references **1,746 images**. At
BodyT's own measured average of 17,717 bytes per demo webp (1,984,304 / 112), that is **~31 MB**,
which is 8.5x today's entire precache. Media is therefore never precached and never a pack
default; it is an opt-in warm install or a runtime-cached CDN fetch.

Three consequences that drive every later section:

1. **The planner never needs a million rows.** Generating a plan reads the movement graph
   (hundreds), the recipes (tens), the equipment table (hundreds), the safety rules (tens),
   and the nutrition constants (tens). That whole working set is under 100 KB. It ships in
   the bundle and it stays there.
2. **Food is the only genuine million-row query workload**, and it is user-initiated, not
   engine-initiated. That is what makes a server-side catalog acceptable: it sits behind a
   gesture, degrades offline, and the plan does not depend on it (T21 already states the rule,
   "manual fallback never blocks logging").
3. **Outcome events are telemetry, not knowledge.** Their knowledge product is a few thousand
   derived aggregate rules, not 50M raw rows. Never retrieve raw events at decision time;
   B1 writes them, an offline job derives rules from them, and the rules ship as a warm pack.

Size arithmetic that decides the tiers (BUDGETS, computed from the measured bytes/record above):

- 1,500 exercise guides x ~1.15 KB = **~1.7 MB** decoded, roughly 500 KB gzipped. Too big for
  the bundle, comfortable as a single warm pack and inside the 2 MB per-pack budget with room.
  (At the pessimistic 3,000-record ceiling: ~3.5 MB decoded, which is where the pack splits by
  domain rather than growing.)
- 1M food records x ~180 bytes projected (id, name, brand, barcode, serving, kcal, P/C/F, fibre)
  = **~180 MB**. Never lands on a phone.
- A US-only Open Food Facts subset at ~250k rows = **~45 MB**. Still cold.
- The top 2,000 foods by this athlete's own log frequency = **~360 KB**. That is a warm pack,
  and it is the distribution that actually gets logged.

---

## 2. TIERED STORAGE MODEL

Three tiers, one rule each. The rule is what makes the tier decidable without a meeting.

### HOT: in the bundle, precached, parsed at import

**Rule: HOT is anything on the critical path of "generate a plan, resolve today, or classify a
safety red flag, with zero network and zero IndexedDB reads."**

| Lives here | Why |
|---|---|
| `MOVEMENT` graph + `EXERCISE_EQUIP` + `SUBSTITUTIONS` + `muscles.ts` | Every substitution and every adaptation reads it. `engine/adapt.ts` calls `substitutesFor` three times per exercise. |
| `RECIPES` + `LAYOUTS` + `TEMPLATES` | Plan generation. |
| R6 safety rules: RED classifier table, GYR decision table, FC constraint rows | A RED must fire on a first-run device with no network and no installed pack. This is the strongest HOT argument in the whole design. |
| R1 nutrition constants (the `KCAL_PER_LB_TISSUE`, `FAT_MIN_GKG`, `FIBER_G_PER_1000` block R1 section 9 already names) | Every calorie number the app renders. |
| `ExerciseDef` stubs: `id`, `name`, `kind`, `equipment`, `targets`, `restSec` | Needed to build and render a session. |
| `FOODS` (85) + `MEAL_TEMPLATES` | The offline logging floor. |
| Copy pools (`messages.ts`, `debrief.ts`, `followups.ts`) | Rendered every session. |
| `packRegistry.ts` (generated, ~40 lines) | The pinned pack versions. |

**Size budget:** hot knowledge **<= 450 KB minified** (estimated ~400 KB today). Entry chunk
**<= 1,250,000 bytes** (measured 1,184,535 today, so +5%). Total precache **<= 4,000,000 bytes**
(measured 3,637,548 today; also the existing per-file `maximumFileSizeToCacheInBytes`).
Past the hot ceiling, a new kilobyte must displace an old one. Same discipline as the
`OVERSIZE_ALLOWED` allowlist: shrink-only pressure, applied to bytes instead of lines.

**Load timing:** at module import, during the existing boot. **Cold-start budget:** first paint
of Today <= 1.5 s on a mid-range Android over the service worker cache, <= 400 ms on repeat.

**Offline:** always, by construction. **Invalidation:** app deploy. `src/sw.ts` already does
`precacheAndRoute(self.__WB_MANIFEST)` + `cleanupOutdatedCaches()`; nothing changes.

### WARM: versioned packs in IndexedDB, lazy-loaded, content-addressed

**Rule: WARM is knowledge a real user will eventually want, that no first render needs.**

| Lives here | Trigger |
|---|---|
| Exercise-guide prose (`steps`, `why`, `mistakes`, `cue`) for the long tail | Opening a guide, or the exercise library screen |
| The guide corpus past the shipped 194 | Same |
| Demo keyframes + image manifests beyond the core 56 | Opening a demo |
| R1 / R6 full records with source tables and provenance prose | Opening "why this number", or the owner debug view |
| Program archetype families past the shipped 8 (R5) | Generating a plan whose family is not hot |
| Recipe corpus (R4) | Opening Meals alternates |
| Food cache: top-N by this athlete's log frequency, plus every cold hit ever made | First food search; written on every cold hit |
| Derived population rules (post-B1) | Plan regeneration, opportunistically |

**Size budget:** per pack **<= 2 MB decoded / <= 600 KB transferred (gzip)**. Total warm store
**<= 25 MB**, LRU-evicted. Before any install, call the existing `storageUsage()`
(`store/storage.ts:233`) and refuse when free quota is under **3x** the pack size, because a
half-written pack in a full quota is the same failure class the `save(): boolean` contract
exists to prevent.

**Load timing:** never during boot. A `PackNeed` is raised by a demand event, the fetch runs on
idle (`requestIdleCallback`, timeout fallback 2 s). A test asserts no `ensurePack` call
happens before first paint.

**Offline behavior:** whatever is installed works completely. A missing pack degrades to the hot
fallback and says so in plain copy, never an error state. Example copy, no em dashes:
"Full guide is still downloading. Here is the short version." A missing pack must never block
starting a session.

**Invalidation:** content-addressed. Pack URLs carry the version
(`packs/exercise-guides@3/records.jsonl.gz`), so a version is a new immutable URL and stale
cache is structurally impossible. The bundle pins `{packId -> version, sha256}` in the
generated `packRegistry.ts`; on the next demand event, a version mismatch installs the new
pack and deletes the old rows in the same IndexedDB transaction.

### COLD: Supabase Postgres behind a query API

**Rule: COLD is anything too large to install, that only a user gesture ever asks for.**

| Lives here | Access path |
|---|---|
| The food catalog (USDA FDC + Open Food Facts projections) | barcode exact, name prefix, fuzzy |
| B1's outcome event log | write-only from the client; read by offline jobs |
| Derived-but-not-yet-promoted aggregates | offline job reads, promotes to a warm pack |

**Budget:** p95 <= 250 ms server-side, <= 400 ms wall clock on 4G. Page size <= 25 rows /
<= 8 KB. **At most one cold query per user gesture.**

**Load timing:** only on explicit user action. Never on boot. Never during plan generation.
This is enforceable by the layering test that already exists: nothing in `plan/` or `engine/`
may import `platform/foodLookup.ts` (rank 2 > rank 0/1, so the existing `layering` test in
`structure.test.ts` already fails such an import without a new rule).

**Offline behavior:** degrade to warm food cache, then to the hot 85, then to manual entry.
Never an error, never a blocked log.

**Invalidation:** server is truth. Every cold hit is written into the warm `food_cache` with its
`source_version` and a 90-day TTL.

---

## 3. KNOWLEDGE PACK FORMAT

Three files per pack, versioned in the path so the URL is immutable:

```
public/packs/{domain}/{packId}@{version}/
  manifest.json          # ~1 KB, fetched first, cheap
  records.jsonl.gz       # one KnowledgeRecord per line
  index.{name}.json      # 0..n sidecars, each its own hash
```

JSONL rather than one JSON array, for three reasons that all matter at 100k records: it streams,
a single malformed record is one skipped line rather than a dead parse, and `wc -l` is a free
integrity check in CI.

### manifest.json

```json
{
  "packId": "exercise-guides",
  "version": 3,
  "domain": "exercise",
  "recordCount": 1204,
  "bytes": { "records": 1384600, "gzip": 402180 },
  "sha256": "…",
  "schemaVersion": 2,
  "engineMin": 21,
  "builtAt": "2026-08-18",
  "builtFrom": "git:67ceb91",
  "provenance": {
    "sources": 14, "tierA": 9, "tierB": 3, "tierC": 1, "house": 5,
    "licenses": ["ODbL-1.0", "CC0-1.0"],
    "auditSample": { "n": 50, "passed": 49, "reviewedAt": "2026-08-18" }
  },
  "indexes": [
    { "name": "byPattern", "file": "index.byPattern.json", "sha256": "…", "bytes": 8112 }
  ]
}
```

`version` is a monotonic integer, not semver. A pack is data; there is no such thing as a minor
version of a corpus. `engineMin` is the lowest app `SCHEMA_VERSION` that can read it, so an old
installed app never tries to parse a newer envelope. `sha256` is over the uncompressed JSONL,
verified after decompression, before the write transaction commits.

### Index sidecars

An index sidecar is a plain inverted map, built at CI time from the same records, so the client
never scans to build one:

```json
{ "byPattern": { "squat": [17, 41, 88, …], "hinge": [3, 9, …] } }
```

Values are **line ordinals**, not ids, because ordinals are integers and an index of 100k ids
costs 4x more bytes than an index of 100k ordinals. The client reads the sidecar, resolves
ordinals to ids from the pack's own id array, and writes both to IndexedDB.

### Build, at CI time

`scripts/buildPacks.ts`, run in the deploy workflow before `vite build`:

1. **Import the same typed modules the app imports.** One source of truth. There is never a
   parallel copy of the data, which is the failure mode that makes data pipelines rot.
2. Map each record through a per-domain `toRecord()` adapter that lives beside its data in
   `src/plan/` (so the adapter is subject to the same layering and size rules).
3. Validate every record against the zod `knowledgeRecordSchema`, reusing the exact style of
   `store/schema.ts`.
4. Assert domain invariants, all of which must fail the build:
   - every `source_refs[].id` resolves in the pack's source table;
   - every record with `evidence_tier` A or B has at least one `source_ref`;
   - every `contradiction_group` has >= 2 members;
   - `valid_from < valid_to` when both present;
   - **no em dash in any user-visible string** (R6 section 7.5 already asks for this lint;
     `store/schema.ts` migration 17 exists because it was missed once);
   - `confidence` equals the derivation function's output (section 4), never a hand-typed value.
5. Emit JSONL, gzip, hash, write manifest and sidecars.
6. Regenerate `src/plan/packRegistry.ts` (~40 lines, committed), pinning
   `{packId, version, sha256, bytes}`. This generated file is the ONLY pack artefact that ships
   in the bundle, so a pack change is a small reviewable diff and `structure.test.ts` sees an
   ordinary file well under the 600-line cap.

### Publish

Packs are static files under `public/packs/`, deployed with the app to gh-pages. No new
infrastructure, works with the existing `base: '/Bodytea/'`.

Two service-worker changes, both small:
- `vite.config.ts` `globPatterns` stays as it is, so `.jsonl.gz`, `.json` sidecars and manifests
  are deliberately **not** precached.
- `src/sw.ts` gains one `CacheFirst` route for `/packs/`. Cache-first is safe precisely because
  the URL carries the version. Cache name `bodyt-packs-v1`, max entries 40, purged by the same
  LRU that governs the warm ceiling.

### How the app decides it needs a pack

`src/store/packs.ts` (new, budget <= 220 lines):

```ts
export type PackState =
  | { kind: 'ready'; version: number }
  | { kind: 'installing'; version: number }
  | { kind: 'absent'; reason: 'never-installed' | 'quota' | 'offline' | 'checksum' }

export async function ensurePack(packId: PackId): Promise<PackState>
export function packStateSync(packId: PackId): PackState   // no await, for render paths
```

`ensurePack` is a pure function of (installed version from the `packs` object store, pinned
version from `packRegistry`), plus a fetch. Render paths call `packStateSync` and branch on
`absent` into the hot fallback. Nothing throws into a render, and nothing awaits inside one.

---

## 4. RECORD ENVELOPE

New file `src/plan/knowledge.ts` (budget <= 150 lines, plan layer, pure types plus two pure
functions). The envelope **wraps** the existing typed shapes. `MovementMeta` does not change.
`FoodDef` does not change. R1's `NutritionRule` and R6's `SafetyRule` land exactly as those
packs sketched them. That is what makes stage 1 a pure addition.

```ts
import type { ISODate } from '../types'

export type Domain =
  | 'movement' | 'exercise' | 'program' | 'nutrition'
  | 'safety' | 'food' | 'recipe' | 'population'

/** A: position stand, guideline body, systematic review, or primary screening instrument.
 *  B: single trial, or an authoritative reproduction of a primary.
 *  C: summary-level access to a paywalled primary, or evidence contested on reanalysis.
 *  D: HOUSE HEURISTIC. source_refs may be empty. */
export type EvidenceTier = 'A' | 'B' | 'C' | 'D'

export type ReviewStatus = 'draft' | 'reviewed' | 'published' | 'retired'

export interface SourceRef {
  /** Stable within the pack's source table: 'S9', 'PARQ-2025', 'CDC-ARTH'. */
  id: string
  /** Where inside it: 'Box 3', 'Q6', 'Table 2'. */
  locator?: string
  /** True when the primary was paywalled and content came from summaries. */
  summaryLevel?: boolean
}

export interface KnowledgeRecord<D extends Domain = Domain, P = unknown> {
  /** '{domain}:{slug}'. Globally unique, stable forever, never reused. */
  id: string
  domain: D
  /** The domain's own typed shape, unchanged. */
  payload: P
  /** Empty ONLY when evidence_tier === 'D'. */
  source_refs: SourceRef[]
  evidence_tier: EvidenceTier
  /** 0..1, two decimals. DERIVED by confidenceOf(), never hand-typed. */
  confidence: number
  /** Records that cannot both be applied. Ranking returns at most one per group. */
  contradiction_group?: string
  valid_from: ISODate
  /** Absent means open-ended. */
  valid_to?: ISODate
  /** Envelope version, not payload version. */
  schema_version: number
  review_status: ReviewStatus
  /** Cheap secondary index keys. */
  tags?: string[]
}

const TIER_BASE: Record<EvidenceTier, number> = { A: 0.95, B: 0.8, C: 0.6, D: 0.4 }

/**
 * Confidence is computed, not asserted. A hand-typed confidence is a vibe with a
 * decimal point on it, and the build refuses one (section 3, invariant 6).
 */
export function confidenceOf(r: Omit<KnowledgeRecord, 'confidence'>, groupSize = 1): number {
  const access = r.source_refs.some((s) => s.summaryLevel) ? 0.85 : 1
  const agreement = r.contradiction_group && groupSize > 1 ? 0.75 : 1
  return Math.round(TIER_BASE[r.evidence_tier] * access * agreement * 100) / 100
}
```

### Tier vocabulary maps straight onto what R1 and R6 already wrote

R1 uses `Confidence = 'evidence' | 'consensus' | 'house'`. R6 uses
`confidence: 'source' | 'house-heuristic'`. Both collapse into the tier ladder without loss:

| Source pack says | Tier | Example |
|---|---|---|
| R1 `'evidence'` on a position stand, R6 `'source'` on a tier-A doc | **A** | R1 S7/S9/S11 (ISSN stands), R6 `PARQ-2025`, `ACSM-ALG`, CDC pages |
| Single trial, or authoritative reproduction | **B** | R1 S10 (Garthe 2011), R6 `AHA-MI` (heart.org proxy-blocked, captured via a state EMS reproduction) |
| Summary-level access to a paywalled primary; contested on reanalysis | **C** | R6 `ACOG-804` (acog.org and the journal both 402), R1 S19 (headline FFM benefit contested) |
| R1 `'house'`, R6 `'house-heuristic'` | **D** | R1's clamp bounds 150 to 400 kcal, R6's 3-flags-in-14-days escalation threshold |

### R1 records

```ts
{
  id: 'nutrition:protein.cut.gPerKgFFM',
  domain: 'nutrition',
  payload: { range: [2.3, 3.1], units: 'g/kg FFM/day',
             appliesWhen: 'goal=cut && bfKnown', explainKey: 'protein' },
  source_refs: [{ id: 'S9' }, { id: 'S7' }],
  evidence_tier: 'A', confidence: 0.95,
  valid_from: '2026-08-18', schema_version: 1, review_status: 'published',
  tags: ['macro', 'protein', 'cut'],
}
```

The interesting ones are the disagreements R1 explicitly refused to flatten:

- `nutrition:refeed.twoDaysPerWeek` (S19, tier C, `contradiction_group: 'nutrition/diet-breaks'`,
  confidence `0.6 x 1 x 0.75 = 0.45`) and `nutrition:dietBreak.twoWeekBlocks` (S20, tier B, same
  group, confidence `0.8 x 0.75 = 0.60`). Retrieval returns the higher-confidence one and puts
  the group id in the packet's `contradictions` array, so the explain layer can say the evidence
  disagrees without shipping both rules into the engine.
- The fat floor is three records, not one: `nutrition:fat.floor.gPerKg` `{value:0.5}` (S11,
  tier A), `nutrition:fat.floor.pctKcal` `{value:0.20}` (S23, tier A), and
  `nutrition:fat.floor.combined` (tier **D**, `source_refs` pointing at both), because R1
  section 5.2 is explicit that "the blend of the two floors into one `max()` is HOUSE; each
  floor is sourced." The envelope is where that stops being a table note and becomes queryable.
- `nutrition:kcalPerLbTissue` `{value:3500, horizon:'short-only'}` carries S15 as its source and
  S13, S14, S16 as caveat refs in the payload, so the record itself encodes the reason it may
  only be used as a step size and never as a forecast.

### R6 records

```ts
{
  id: 'safety:RF-CHEST',
  domain: 'safety',
  payload: { /* the SafetyRule from R6 section 7.4, verbatim */
    tier: 'RED', triggers: ['chest pain', 'chest tightness', /* … */],
    constraint: null, emergencyNow: true,
    userCopy: 'Thanks for telling me. Chest pressure or tightness is something a doctor '
            + 'should check before we plan any workouts. …' },
  source_refs: [{ id: 'AHA-MI' }, { id: 'ACSM-ALG' }, { id: 'PARQ-2025', locator: 'Q2' }],
  evidence_tier: 'A', confidence: 0.95,
  valid_from: '2026-08-18', schema_version: 1, review_status: 'published',
  tags: ['red-flag', 'cardiac'],
}
```

Two structural things R6 forces, and the envelope handles cleanly:

1. **The umbrella/specifics split.** R6 section 5 keeps saying "CDC-ARTH umbrella + H specifics."
   That becomes two records: `safety:FC-KNEE.umbrella` (tier A, CDC-ARTH: activity reduces
   arthritis joint pain, mild start-up soreness is normal, worsening pain is provider territory)
   and `safety:FC-KNEE.constraints` (tier D: partial range to comfortable depth, slow eccentrics,
   cap jumps and high-rep rebounding). Retrieval can then return the sourced claim to the user
   and the house constraint to the engine, and the audit trail is honest about which is which.
2. **Preserved disagreements become contradiction groups.** R6 section 3.3 enumerates six
   PAR-Q+ vs ACSM disagreements. Each becomes one group with three members: the PAR-Q+ position,
   the ACSM position, and the house resolution as a tier-D record citing both. The pregnancy
   contraindication record is tier C with `summaryLevel: true` (ACOG paywalled), so
   `confidenceOf` returns `0.6 x 0.85 = 0.51`, and it ships `review_status: 'reviewed'` rather
   than `'published'` until a session gains primary access, which the stage-5 validator (section 5)
   turns into a hard rule: it cannot reach a user-visible packet.

---

## 5. DETERMINISTIC RETRIEVAL PIPELINE

New file `src/engine/retrieve.ts` (engine layer: pure, imports `plan/` only, budget <= 300 lines).
No I/O. Warm records are resolved by `store/packs.ts` and passed in, so `retrieve()` stays a
function of its arguments and is therefore lockable by `golden.test.ts`.

```ts
export function retrieve(q: Query, k: KnowledgeView): DecisionPacket
```

### Stage 1: structured filter

Exact predicates over declared axes only. No free text, no scoring.

`domain`, `goal`, `equipment` (via `canDo(id, owned)` from `plan/equip.ts`), `constraints`
(joints from `limitedJoints(prefs)` in `prefsTypes.ts`, plus R6 `ConstraintId`s),
`population` (sex, age band, training age, pregnancy stage), `validAt` (so
`valid_from <= d < valid_to`), `review_status === 'published'`, `evidence_tier >= floor`.

Index-driven, so cost is O(result), not O(corpus). This is the stage that makes a 100k-record
corpus behave like a 100-record one.

### Stage 2: relationship / graph expansion, bounded

Deterministic walks over structures the repo already has: `substitutesFor` (pattern-preserving),
`movementChain` (regressions to progressions), `SUBSTITUTIONS` (the curated equipment-decreasing
chains in `plan/equip.ts`), `oppositePattern` (balance), `transfersTo` (athletic quality).
Bounded: `maxHops: 2`, `maxExpanded: 64`. Every candidate records its `via` edge, which is what
the explain layer reads.

Expansion carries a **fixed relaxation ladder**, fired only when the level above returns nothing:

| Level | What it relaxes |
|---|---|
| L0 | exact: pattern + role + skill cap + equipment + joints |
| L1 | drop role match, keep pattern |
| L2 | raise skill cap by 1, never past 2 (skill 2+ is where coaching starts, per `movement.ts:339`) |
| L3 | drop pattern, keep the movement's `transfer` qualities |
| L4 | stop substituting. Return the R6 `FC-*` constraint record, which says how to keep the original safely |

The packet always reports which level fired. **A silent relaxation is the bug this ladder exists
to prevent**: an athlete offered a hinge in place of a squat, with no mention that the pattern
changed, learns not to trust the app.

### Stage 3: deterministic ranking

Lexicographic, not a weighted sum. A weighted sum with hand-tuned coefficients is a model you
cannot debug, and it cannot be defended in a bug report.

1. `evidence_tier` (A > B > C > D)
2. **specificity**: number of query axes the record explicitly matched. A rule scoped to
   `goal=cut && bfKnown` outranks one scoped to `goal=cut`
3. **individual-memory match**: `pinned` > previously-accepted > neutral > previously-declined
   (from B1's decline log). `blocked` never reaches here; stage 1 removed it
4. **recency**: `valid_from` descending
5. `confidence` descending
6. `id` ascending

Rule 6 is load-bearing. It makes the total order total, which is what lets `golden.test.ts` and
`goldenLife.test.ts` lock retrieval output the way they lock plans today.

### Stage 4: bounded decision packet

```ts
export const PACKET_MAX_RECORDS = 24
export const PACKET_MAX_BYTES = 32_768

export interface DecisionPacket {
  query: string                          // fingerprint hash of the normalized query, for B1
  records: PackedRecord[]                // <= 24, each projected to <= 2 KB
  truncated: boolean
  relaxation: 0 | 1 | 2 | 3 | 4
  contradictions: string[]               // groups present but suppressed
  provenance: SourceRef[]                // deduped union, <= 12
  packVersions: Record<string, number>   // what answered this, for reproducibility
  builtAtMs: number                      // time spent, for the latency budget
}
```

The cap is mechanical, not advisory: `retrieve()` truncates and sets `truncated`. A projection
step drops prose fields the caller did not request, so 24 records land at <= 32 KB rather than
the 48 KB an unprojected worst case would cost. **This is the anti-giant-context rule made into
a number a test can assert.** There is no code path by which a corpus of any size produces a
packet larger than 32 KB.

### Stage 5: validators

Assertions that throw in dev and degrade in prod:

- every returned record still satisfies the stage-1 predicate. This catches expansion leaking
  past a constraint, which is the exact bug where a knee-avoid movement returns through a
  substitution chain;
- no two records share a live `contradiction_group`;
- no record with `review_status !== 'published'` in a user-visible packet;
- **if `q.constraints.tier === 'RED'`, the packet contains zero plan-constructing records.**
  R6 section 7.3 asks for this to be unbypassable by type; here it is also unbypassable by
  validator, which is belt and braces on the one rule that matters most;
- packet under both caps.

### Worked example: a squat substitute, bad knee, dumbbells only

Athlete state, using the app's real shapes: `Prefs.limitations = [{ label: 'Bad knee',
joints: ['knee'], since: '2026-07-02' }]` (`prefsTypes.ts`), `plan.equipment = ['dumbbell']`.
Query: replace `goblet-squat`.

**Stage 1.** Filter to `pattern === 'squat'`, `canDo(id, {'none','dumbbell'})`,
`skill <= max(meta.skill, 1) = 1`, `stress` disjoint from `{knee}`.

The squat pattern in `plan/movement.ts` holds exactly seven movements, and **every one of them
lists `knee` in `stress`**:

| id | skill | role | stress | equipment | passes equipment |
|---|---|---|---|---|---|
| `goblet-squat` | 1 | primary | `['knee']` | dumbbell | yes (self) |
| `db-front-squat` | 2 | primary | `['knee']` | dumbbell | yes, cut by skill |
| `front-squat` | 3 | primary | `['knee','wrist','lower-back']` | barbell | no |
| `heels-elevated-goblet` | 1 | secondary | `['knee']` | dumbbell, plate | no |
| `hack-squat` | 1 | secondary | `['knee']` | machine | no |
| `leg-press` | 0 | secondary | `['knee']` | machine | no |
| `wall-sit` | 0 | accessory | `['knee']` | none | yes |

Without the knee constraint the survivor is `wall-sit`. With it, the survivor set is **empty**.
This is not hypothetical: `substitutesFor('goblet-squat', { can, avoid: ['knee'] })` returns `[]`
against today's tables, and `engine/adapt.ts` section 2b exists **because of exactly this case**
(its comment: "a bodyweight athlete [has] six of these for the knee").

**Stage 2, ladder.**
- L0 empty (above). L1 (drop role) still empty: every squat-pattern movement stresses the knee.
- L2 (skill cap 2) admits `db-front-squat`, which also stresses the knee. Empty.
- L3 drops the pattern and keeps `goblet-squat`'s `transfer: ['athletic-strength','vertical-power']`.
  Walking hinge and lunge for knee-sparing, dumbbell-legal movements yields **exactly four**:

  | id | pattern | role | skill | stress | equipment |
  |---|---|---|---|---|---|
  | `db-rdl` | hinge | primary | 2 | `['lower-back','hip']` | dumbbell |
  | `single-leg-rdl` | hinge | secondary | 3 | `['lower-back','hip']` | dumbbell |
  | `glute-bridge` | hinge | accessory | 0 | `[]` | none |
  | `single-leg-glute-bridge` | hinge | accessory | 1 | `[]` | none |

- L4 also fires, because a pattern change is a demotion the athlete should hear about. It adds
  `safety:FC-KNEE.umbrella` (tier A, CDC-ARTH) and `safety:FC-KNEE.constraints` (tier D: partial
  range to comfortable depth, slow eccentrics, cap jumps).

**Stage 3.** Movement metadata is tier D today (B2 attaches refs later), so tier does not
separate the four. Specificity does: the slot being replaced is a `primary`, and only `db-rdl`
carries `role: 'primary'`. Memory is neutral, recency equal, so `db-rdl` leads, with
`single-leg-glute-bridge` behind it as the zero-equipment option. The two safety records rank
above all four on tier A / tier D.

**Stage 4.** Six records, `relaxation: 3`, `truncated: false`, `contradictions: []`,
`provenance: [{ id: 'CDC-ARTH' }]`, `packVersions: { 'movement-graph': 1, 'safety-rules': 1 }`,
roughly 3 KB serialized.

**What the engine does with it**, in the shape `engine/adapt.ts` already uses: two suggestions,
one tap each, evidence attached, suggest-only. First, swap to the RDL, with the reason naming
the pattern change. Second, keep the squat with the FC-KNEE constraints applied.

**The delta this example proves:** today `substitutesFor` returns `[]`, section 2b writes a
generic keep-training-drop-load note, and the athlete gets no cross-pattern option and no cited
constraint. The pipeline turns the same data into two defensible, sourced offers. That is B3's
value in one screen, and it needs zero new corpus to be true.

---

## 6. INDEXING

### HOT: in-memory maps, derived at module init

All derived from data already in the bundle. Never hand-authored: a hand-maintained index is a
second source of truth and it will drift.

| Index | Shape | Replaces |
|---|---|---|
| `byPattern` | `Map<MovementPattern, string[]>`, ~15 keys | The `Object.entries(MOVEMENT)` full scan inside `substitutesFor` (`movement.ts:364`) |
| `byJointStress` | `Map<Joint, Set<string>>`, 7 keys | The filter inside `stressing()` (`movement.ts:477`) |
| `byEquip` | `Map<EquipTag, Set<string>>` | Repeated `canDo` scans |
| `byTransfer` | `Map<AthleticQuality, string[]>` | `transfersTo()` (`movement.ts:483`), currently a full scan |
| `byRole`, `byLevel` | `Map<_, string[]>` | Stage-1 filters |

At 111 records the current scans are free. At 3,000 they are 27x the work on **every**
substitution, and `engine/adapt.ts` calls `substitutesFor` up to three times per exercise per
adaptation pass, per session, across 20 personas x 20 weeks in the sim harness. That is where
the cost shows up first.

**Budget:** all hot index builds <= 5 ms total at 3,000 records; <= 1.5 MB resident.

### WARM: IndexedDB object stores + compound keys

Bump `openDB()` in `store/storage.ts` from version 2 to **3**. The upgrade shape already exists
(`storage.ts:74-86` creates missing stores idempotently), so this is an additive change with no
migration risk to `photos` or `meta`.

| Store | keyPath | Indexes |
|---|---|---|
| `packs` | `packId` | none. Value: `{packId, version, sha256, installedAt, bytes, recordCount}` |
| `records` | `['packId','id']` | `by_domain` on `['packId','domain']`; `by_tag` on `['packId','tags']` with `multiEntry: true`; `by_tier` on `['packId','evidence_tier']` |
| `food_cache` | `id` | `by_barcode` (unique); `by_name_key` (lowercased, punctuation-stripped name, for prefix ranges); `by_last_used` (LRU eviction) |

Compound keys lead with `packId` on purpose: a pack upgrade then deletes exactly its own rows
with one `IDBKeyRange.bound([id, ''], [id, '￿'])` cursor delete, not a scan of the store.

Prefix search in the warm cache uses the standard IndexedDB idiom, no library:
`IDBKeyRange.bound(prefix, prefix + '￿')` on `by_name_key`.

**Budget:** primary-key lookup <= 5 ms; index range of <= 200 rows <= 25 ms. Warm reads never
happen inside a render; they resolve into the store first.

### COLD: Postgres, the million-row food workload

New migration `supabase/migrations/0002_foods.sql`, in the same RLS-first posture as `0001`:

```sql
create extension if not exists pg_trgm;

create table public.foods (
  id            text primary key,          -- 'usda:2341234' | 'off:0012345678905' | 'house:chicken'
  source        text not null check (source in ('usda','off','house')),
  barcode       text,
  name          text not null,
  brand         text,
  serving_g     numeric,
  kcal          numeric not null,
  protein_g     numeric not null,
  carbs_g       numeric not null,
  fat_g         numeric not null,
  fibre_g       numeric,
  source_version text not null,
  updated_at    timestamptz not null default now()
);
alter table public.foods enable row level security;
create policy "foods read all" on public.foods for select to authenticated using (true);
-- no insert/update/delete policies: service role only, same as profiles in 0001

create unique index foods_barcode_uq on public.foods (barcode) where barcode is not null;
create index foods_prefix on public.foods (lower(name) text_pattern_ops);
create index foods_trgm   on public.foods using gin (name gin_trgm_ops);
create index foods_fts    on public.foods using gin
  (to_tsvector('simple', name || ' ' || coalesce(brand, '')));
```

Three access paths, three indexes, because they are three genuinely different workloads:

| Path | Query | Index | Target p95 (server) |
|---|---|---|---|
| **barcode exact** | `where barcode = $1` | `foods_barcode_uq`, partial so nulls stay out and it stays small | **<= 60 ms** |
| **name prefix** | `where lower(name) like $1 \|\| '%' limit 25` | `foods_prefix` with `text_pattern_ops` (a plain btree index will not serve `like` prefix under non-C collation) | **<= 120 ms** |
| **fuzzy** | `order by similarity(name, $1) desc` | `foods_trgm` GIN; `foods_fts` for multi-word | **<= 250 ms** |

**Escalation is deterministic, not parallel:** fuzzy fires only when prefix returns fewer than 5
rows. One gesture, at most two queries, and the second only on a demonstrated miss.

Ranking is server-side and deterministic, with the same reproducibility tie-break as stage 3:

```sql
order by (source = 'house') desc,
         (barcode is not null) desc,
         similarity(name, $1) desc,
         id asc
```

Pagination is keyset on `(similarity desc, id)`, not `limit/offset`. C1 already lists
"indexes + pagination day one" as a requirement; `offset` at a million rows is exactly what that
requirement is about.

The edge function (`supabase/functions/food-search/`) keeps the USDA key server-side, per C1.
Client entry point is `src/platform/foodLookup.ts`, the file T21 already names, at layer rank 2,
so the existing `layering` test in `structure.test.ts` mechanically forbids `plan/` or `engine/`
from importing it. **The planner staying offline is enforced by a rule that already ships.**

---

## 7. MIGRATION PATH FROM TODAY

Five stages. No stage breaks the working app, and every stage is independently shippable and
independently revertible.

### Stage 0: today keeps working (ships nothing, owes one measurement)

Nothing changes. What this stage owes is `scripts/bundleReport.mjs`, wired as `npm run bundle`,
printing the byte share of `src/plan/` in the entry chunk. Today's estimate of ~400 KB of
1,184,535 is derived from a source-share ratio, not measured, and every later budget leans on it.

**Proof:** existing 1,194 unit tests, golden lock, `npm run sim`, `npm run poison`.
**Risk:** none.

### Stage 1: record envelope + provenance, added in place

**Ships:** `src/plan/knowledge.ts` (types + `confidenceOf`, <= 150 lines); per-module sibling
`*.refs.ts` files mapping ids to `SourceRef[]` and tiers (this IS job B2, "source_refs
annotations, module registry, lift-to-data rule"); R1's `NutritionRule` records and R6's
`SafetyRule` records as new typed modules with envelopes from birth.

The data modules themselves are **not rewritten**. `MOVEMENT` stays exactly as it is; a sibling
`movement.refs.ts` carries the provenance. That keeps the diff reviewable and keeps
`plan/movement.ts` (487 lines) under the 600-line cap.

**Proof:** new `plan/knowledge.test.ts` asserting every record round-trips through zod; every
`source_refs` id resolves; every tier A/B record has >= 1 ref; every tier D record has
`confidence <= 0.5`; `confidenceOf` output equals the stored value; **no em dash in any
user-visible string**. Prove the guard bites by planting a tier-A record with no refs and
watching it fail, per the standing constraint.

**Bundle cost:** +8 to +15 KB (refs are short strings).

**What could go wrong.** (1) `types.ts` is at its 705-line allowance and `plan/generator.ts` at
941; new types must go in NEW files or `structure.test.ts` fails, which is the correct outcome
and needs no negotiation. (2) Somebody hand-writes a `confidence`. The build invariant is the
guard, and `confidenceOf` being the only writer is the design that makes the guard enforceable.
(3) R6 tier assignment drifts from R6's own text. Mitigation: the refs file cites the R6 section
number in a comment beside each row.

### Stage 2: pack builder + IndexedDB warm tier, with one real pack

**Ships:** `scripts/buildPacks.ts`; `public/packs/`; generated `src/plan/packRegistry.ts`;
`src/store/packs.ts` (IndexedDB v3, `ensurePack`, `packStateSync`); one `CacheFirst` route for
`/packs/` in `src/sw.ts`.

**The one real pack is `exercise-guides`.** Move `steps`, `why`, `mistakes`, `cue` for the guide
long tail out of the bundle and into the pack; keep `id`, `name`, `kind`, `equipment`, `targets`,
`restSec` hot. The five exercise modules total 205,853 bytes of comment-stripped source, and the
prose is the majority of it. **Target: entry chunk down by >= 120 KB**, measured by
`npm run bundle` against the stage-0 baseline. Note the direction: stage 2 makes the app
*smaller*, which is the argument that gets it shipped.

**Proof:**
1. A Playwright spec that clears the pack store, loads Today, starts a session, and asserts the
   plan renders and the guide screen shows a loading state, never an error.
2. A unit test that a version bump deletes the old rows and writes the new ones in one
   transaction, with a checksum mismatch aborting the write entirely.
3. A test asserting no `ensurePack` call happens before first paint.
4. The existing 38-spec e2e suite unchanged and green, including offline.

**What could go wrong.** (1) IndexedDB unavailable (private mode, quota). `store/storage.ts`
already models this honestly for localStorage: `save()` returns `false` and appStore raises a
banner. Packs must inherit that posture: `PackState.absent` with a reason, hot fallback, plain
copy, never a blank screen. (2) The pack fetch racing boot; test 3 is the guard. (3) A pack
install partially completing on a full quota; the `3x free space` precondition plus a
single-transaction write is the guard, and both should be proven with a forced-failure test.

### Stage 3: cold tier for food

**Ships:** `supabase/migrations/0002_foods.sql`; an `ingest-foods` batch job (service role,
chunked upserts, resumable); the `food-search` edge function (USDA key server-side, per C1);
`src/platform/foodLookup.ts` (per T21); the `food_cache` warm store; Open Food Facts keyless
first, USDA behind the proxy, exactly as T21 specifies.

**Proof:**
1. Latency harness against a seeded 1M-row table exercising all three index paths against the
   section 8 targets, with `explain analyze` output committed as the baseline.
2. An offline Playwright spec asserting food logging completes with the network down, using the
   hot 85 plus warm cache plus manual entry. This is T21's "manual fallback never blocks
   logging" turned into a test.
3. A structure assertion that nothing in `plan/` or `engine/` imports `platform/foodLookup`.
   The existing layering test already does this; add a named test so the intent is documented.
4. An RLS test proving `anon` and `authenticated` cannot write `foods`.

**What could go wrong.** (1) Licensing. Open Food Facts is ODbL, which carries attribution and
share-alike obligations; USDA FDC data is public domain but the API has terms. Both go into the
manifest's `provenance.licenses` and a visible credit line, and **ingesting a source with no
recorded license fails the build.** (2) Scope creep into "search everything." The cold tier
answers three queries; a fourth is a decision, not a patch. (3) Nutrition-panel quality in
crowd-sourced data. Ingest only records passing a sanity filter (kcal within 20% of
`4P + 4C + 9F`, all macros non-negative, serving present), and record the rejection rate in the
manifest.

### Stage 4: ingestion waves (post-J12, per the IW row in BODYT_STATE.md)

Order by value per unit of risk:

1. **Exercise guides to ~1,200** (free-exercise-db 873 + wger 869 + exm 872, deduped; section 1
   measures all three at ~870 with heavy overlap, so budget the union at 1,000 to 1,500 and
   treat anything above that as a signal the dedup is broken). The guide *payload* maps
   automatically: free-exercise-db already carries `instructions`, `equipment`, `level`,
   `primaryMuscles`, `mechanic`, `force`, which is most of `ExerciseDef`. The *movement graph*
   does not map: `stress`, `skill`, `regressions`, `progressions` and `level` are judgement
   calls, they are what R6's entire constraint system reads, and `movement.ts`'s own header
   records that close calls deliberately took the conservative option because "the cost of
   calling something advanced that is not is one extra week of an easier movement, and the cost
   of the reverse is an injury." **The graph stays hand-curated.** Budget 400 to 800
   `MovementMeta` entries, authored, over several sessions. A guide with no graph entry is
   still useful (it renders, it is searchable) but is not programmable, and the pack builder
   must mark it so rather than defaulting it into the planner.
2. **Evidence rules** from R3, R4, R5.
3. **Recipes** (R4).
4. **Food catalog to full scale.**

Each wave is a pack version bump and nothing else. No app code changes, which is the entire
point of having done stages 1 to 3 first.

**Proof:** the scale harness at the wave's target cardinality, plus the poison suite. A new
corpus that changes no golden output is a corpus that is not wired in, which is precisely the
owner rule about knowledge collected but not consumed.

**What could go wrong.** Quality collapse at volume. Every wave ships with a sampling audit
(n = 50 random records reviewed against source, result recorded in `manifest.provenance.auditSample`),
and `review_status` defaults to `'draft'`, so an unaudited record cannot reach a user-visible
packet (stage-5 validator). That is the mechanism that lets the corpus grow by 10x without the
trust in it falling by 10x.

---

## 8. SCALE + LATENCY TESTS

`scripts/bench.ts`, wired as `npm run bench` beside the existing `sim`, `sim:sessions`, `poison`.

**Synthetic corpora**, generated from a fixed seed so runs are comparable the way
`goldenLife.test.ts` is comparable: `synth(10_000)`, `synth(100_000)`, `synth(1_000_000)` per
domain, with realistic distributions rather than uniform noise (pattern frequencies taken from
the real `MOVEMENT` distribution, name lengths from the real `FOODS` distribution, a Zipf
popularity curve for food lookups). Uniform synthetic data makes indexes look better than they are.

**Targets.** All are budgets, ratcheted down over time and never up, on the same shrink-only
discipline as `OVERSIZE_ALLOWED`.

| Measurement | Corpus | Target | Why this number |
|---|---|---|---|
| `retrieve()` planning decision, p95 | 100k | **<= 20 ms** | One adaptation pass calls it per exercise; a 6-exercise session must finish under 120 ms |
| Full `generatePlan`, p95 | 100k | **<= 250 ms** | Onboarding renders a generated preview; under the 300 ms "instant" threshold |
| Food search, barcode, p95 | 1M | **<= 150 ms** wall on 4G | The athlete is standing in a shop |
| Food search, prefix, p95 | 1M | **<= 250 ms** wall | Typing feels live under 300 ms |
| Food search, fuzzy, p95 | 1M | **<= 500 ms** wall | Only fires on a miss, and the miss already cost time |
| Warm pack install, 2 MB | n/a | **<= 3 s** on 4G; **<= 800 ms** parse + write | Past 3 s needs different UX, not a faster parser |
| Hot index build | 3k movement records | **<= 5 ms** | Must be invisible inside boot |
| Boot to first paint of Today | full precache | **<= 1.5 s** mid-range Android; **<= 400 ms** repeat | The PWA promise. Baseline: 3,637,548 bytes / 131 entries today |
| Entry chunk | n/a | **<= 1,250,000 bytes** | Measured 1,184,535 today. Stage 2 should push it DOWN |
| Total precache | n/a | **<= 4,000,000 bytes** | Measured 3,637,548 today; also the existing `maximumFileSizeToCacheInBytes` |
| Warm store total | n/a | **<= 25 MB** | `storageUsage()` already reads the quota; refuse install when free < 3x pack |
| Peak heap during retrieve | 1M cold / 100k warm | **<= 80 MB** | Below the ~150 MB where mobile Safari starts discarding tabs |
| Packet | any | **<= 32 KB and <= 24 records** | The anti-context-dump cap, asserted by the stage-5 validator |

**CI wiring.** The bench runs in the same workflow as `npx vitest run`, as a separate job, with
a deliberate split:

- **Blocking (deterministic, no runner variance):** packet caps, entry chunk bytes, total
  precache bytes, warm store ceiling, hot index build cost at fixed record counts, memory
  ceiling. These fail the build.
- **Non-blocking but tracked:** wall-clock latencies, against a committed `bench/baseline.json`
  with a +/- 30% regression alarm, reviewed like the structure allowlist. CI runner variance
  will flake a 20 ms p95, and a flaky gate gets disabled, which is worse than no gate.

**Retrieval poison set**, modelled on the existing 81-mutation poison harness. Mutate the
pipeline and assert each mutation is caught by a named test:

| Mutation | Must be caught by |
|---|---|
| Drop the joint filter in stage 1 | the knee-substitute case (section 5) returning `wall-sit` |
| Remove the `id` tie-break in stage 3 | a run-twice determinism test |
| Raise `PACKET_MAX_RECORDS` | the packet-cap assertion |
| Skip the relaxation-level report | a test asserting `relaxation` matches the level that fired |
| Return both members of a contradiction group | the stage-5 contradiction validator |
| Let a `draft` record into a packet | the stage-5 review-status validator |
| Allow a plan-constructing record under RED | the stage-5 RED validator |

Per the standing constraint: feed each guard a known-bad input, watch it fail, then trust it.

---

## 9. WHAT NOT TO BUILD YET

### Vector database or embeddings: no, and here is the deterministic alternative

Every retrieval this app performs is over **declared axes**: pattern, joint, equipment, goal,
evidence tier, validity window, population. Those are exact predicates. Approximate nearest
neighbour over them is strictly worse on three counts:

1. **It cannot express the constraint that matters most.** "Never a movement that stresses this
   joint" is a hard exclusion. ANN returns a ranked neighbourhood; a knee-stressing squat is
   *semantically nearest* to a squat, which is exactly the wrong answer. The worked example in
   section 5 is the proof: the correct output is empty at L0 through L2, and an embedding search
   will confidently return `db-front-squat`.
2. **It breaks reproducibility.** ANN index construction is not bit-reproducible across builds
   or library versions. `golden.test.ts` and `goldenLife.test.ts` are tripwires that depend on
   byte-identical output. An approximate index turns both into flaky tests, and a flaky tripwire
   gets deleted.
3. **The one real use case is already solved deterministically.** Fuzzy free-text matching for
   food names is genuinely fuzzy, and Postgres `pg_trgm` (section 6) handles it with an index
   Postgres already ships, a `similarity()` score you can print in a bug report, and a
   deterministic tie-break.

**Condition to revisit:** a retrieval need appears whose query axes genuinely cannot be
enumerated, and a measured eval set shows name and tag matching failing. For example, matching an
athlete's free-text description of a movement they saw against a 50,000-entry catalog. Even then
the answer is not a vector database: embed offline at CI time, ship quantized vectors as a warm
pack, do exact brute-force cosine over <= 50k vectors (roughly 10 ms, fully reproducible). A
*hosted* vector service would put a network dependency in the planning path, which is the exact
line B3 exists to hold.

### RAG: no, by construction

RAG's second half is a generation call, and Q1 locks this app to zero runtime LLM calls. The
retrieval half is what B3 already is, and it is better than RAG for this problem: bounded, cited,
auditable, testable, and incapable of hallucinating.

**Condition to revisit:** the owner explicitly reopens Q1 at the explain layer only, which
BODYT_STATE.md section 5 already scopes as the single permitted path. In that world the
`DecisionPacket` is precisely the right input to hand a model, and `PACKET_MAX_BYTES` is
precisely the right context budget. **Building the packet now buys that option for free**, which
is a good reason to build it and a bad reason to build the rest.

### Server-side planner: no

The reason is a product promise, not a performance one. The app installs to a phone and generates
plans offline. Moving planning to a server makes the core feature network-dependent and makes
`sim`, `poison` and the golden locks run against a service instead of a pure function.

**Condition to revisit:** a planning decision genuinely requires the million-row corpus. It does
not today; section 1 shows the planner's whole working set is hundreds of records and under
100 KB. If population-derived rules ever need recomputation over data too large to ship, the
right move is server-side **derivation into a warm pack**, not server-side planning.

### Full-catalog offline food: no

1M records at ~180 bytes projected is ~180 MB. Even a US-only subset at ~250k rows is ~45 MB
against a 25 MB warm ceiling. The warm cache holds the top-N by this athlete's own log frequency
plus every cold hit they have ever made, which is the distribution that actually gets logged.

**Condition to revisit:** measured warm cache hit rate for returning users falls below ~85%,
which would mean the tail matters more than assumed.

### Per-user cloud knowledge personalization: no

`states` already caps at 2 MB per user (`0001_core_tables_rls.sql`). Individual memory (pinned,
blocked, accepted, declined) is small, local, and already modelled in `Prefs`.

**Condition to revisit:** B1's event log reaches volume where a cohort aggregate beats the
athlete's own history. On the order of 10k users x 12 weeks before it is anything but noise.

### A knowledge admin UI or CMS: no

Packs build from typed modules at CI time; the review surface is a git diff, which is a better
review tool than any CMS this project could afford to build, and it composes with the existing
ship ritual.

**Condition to revisit:** a non-engineer needs to author records weekly.

### Streaming or incremental pack deltas: no

At <= 2 MB per pack and infrequent version bumps, a delta format buys bandwidth the users are not
short of and costs a diff/patch implementation nobody will maintain. Replace the whole pack.

**Condition to revisit:** a pack exceeds 5 MB or bumps more than weekly.

---

## 10. FILE PLAN AND LAYERING CHECK

Every new file, its layer, and its size budget against `structure.test.ts`'s 600-line cap:

| File | Layer (rank) | Budget | Notes |
|---|---|---|---|
| `src/plan/knowledge.ts` | plan (0) | <= 150 | Envelope types + `confidenceOf` |
| `src/plan/packRegistry.ts` | plan (0) | <= 40 | **Generated**, committed |
| `src/plan/*.refs.ts` (per data module) | plan (0) | <= 200 each | B2's provenance annotations |
| `src/plan/safetyRules.ts` | plan (0) | <= 550 | R6 section 7.4 shape; may need a `safetyCopy.ts` split |
| `src/plan/nutritionRules.ts` | plan (0) | <= 400 | R1 section 9 shape |
| `src/engine/retrieve.ts` | engine (1) | <= 300 | Stages 1 to 5, pure |
| `src/engine/indexes.ts` | engine (1) | <= 180 | Hot in-memory maps, derived |
| `src/store/packs.ts` | store (1) | <= 220 | IndexedDB v3, `ensurePack` |
| `src/platform/foodLookup.ts` | platform (2) | <= 200 | T21's file, cold tier client |
| `scripts/buildPacks.ts` | scripts | n/a | Not under `src/`, not size-capped |
| `scripts/bench.ts` | scripts | n/a | Same |
| `supabase/migrations/0002_foods.sql` | n/a | n/a | |
| `supabase/functions/food-search/index.ts` | n/a | n/a | C1 owns the key handling |

Layering verification against the ranks in `structure.test.ts`:

- `engine/retrieve.ts` (rank 1) imports `plan/knowledge`, `plan/movement`, `plan/equip` (rank 0). Down. OK.
- `store/packs.ts` (rank 1) imports `plan/packRegistry` (rank 0). Down. OK.
- `platform/foodLookup.ts` (rank 2) imports `plan/foods` and `store/packs` (ranks 0, 1). Down. OK.
- Nothing in `plan/` or `engine/` imports `platform/` or `cloud/`. The existing layering test
  already fails such an import; no new rule is needed, which is the point.
- Two allowlist consequences to expect: `store/storage.ts` gains lines for the v3 upgrade
  (currently 243, far under the cap), and `src/sw.ts` gains the packs route (currently 251,
  same). Neither is on `OVERSIZE_ALLOWED`, and neither should join it.

---

## 11. SUMMARY: THE FIVE DECISIONS THIS DESIGN MAKES

1. **Millions is a food problem and a telemetry problem.** Everything the planner reads is
   hundreds to low tens of thousands and stays in the bundle. Sizing the whole system for a
   million rows would be sizing it for a workload the planner never runs.
2. **Three tiers with one decidable rule each.** HOT = the offline critical path. WARM = wanted
   eventually, needed by no first render. COLD = too large to install, only ever behind a gesture.
3. **Packs are content-addressed static files built from the same typed modules the app imports.**
   No parallel copy of the data, no new infrastructure, versioned URLs so cache invalidation is
   structurally impossible.
4. **Retrieval is five stages with a hard 32 KB / 24-record cap and a total order ending in
   `id` ascending.** Reproducible, lockable by the golden tests, and mechanically incapable of
   dumping a corpus into a decision.
5. **The envelope wraps, it does not rewrite.** `MovementMeta`, `FoodDef`, `SafetyRule` and
   `NutritionRule` land unchanged inside it, which is what makes stage 1 a pure addition to a
   working, deployed app.

The worked example in section 5 is the argument in miniature: with today's 111 movements and
today's tables, a knee-limited athlete with dumbbells gets nothing from `substitutesFor` and a
generic note from `adapt.ts`. The same data through this pipeline produces a ranked cross-pattern
option and a cited constraint. B3 is worth building on 111 records. It then survives 3,000.
