# R14: Wearables, Passive Signals and Integration Boundaries

Research job R14 for BodyT. Deterministic local-first coaching PWA, no runtime LLM, general wellness, never diagnoses.
Covers playbook v12 sections 32 (health data, wearables, migration and interoperability) and 33 (fitness assessments), with the parts of section 6 (recovery, fatigue, sleep, readiness and monitoring), 50.20 (data quality and anomaly detection), 50.22 (user and trainer overrides) and 51.8 (athlete monitoring) that decide what a sensor is allowed to do.
Consumers of this pack: `src/platform/` (the adapter layer a Capacitor build swaps), `src/engine/adapt.ts` (the 14-day signal reader), `src/engine/calibration.ts` (the athlete-wins learning pattern already shipped), `src/store/schema.ts` (envelope and migrations), and whoever eventually builds the import path for HealthKit, Health Connect, FIT and GPX.
Access date for all sources: 2026-08-18. Researcher: Claude (session d21c12d6). Read-only against the worktree. No production code in this pack.

Conventions used throughout:

- **confidence: source** means grounded in a document captured in section 1. **HOUSE HEURISTIC** means evidence-informed but not stated by any source captured here. Every number BodyT would ship is marked one way or the other.
- Ranges over precision. Where the literature disagrees, both positions are recorded rather than averaged into a fake consensus.
- No em dashes anywhere, including in copy strings.
- Every repo claim carries a `file:line`. Every science claim carries a source id.
- Nothing here is a threshold until an engine adopts it. Section 10 says which engine and in what order.

The three load-bearing honesty statements in this pack, up front, because the rest of the document is the argument for them:

1. **BodyT is a PWA, and in 2026 a PWA cannot read Apple Health at all.** There is no HealthKit web API, there never has been one, and Safari on iOS does not implement Web Bluetooth. Everything in this pack that reads a wearable requires the planned Capacitor wrapper. Section 5 is the matrix that says exactly which line needs which build.
2. **Day-to-day HRV is mostly noise, and the app should not read it daily even after it can.** The measurement error of a single morning reading is the same size as the effect anyone wants to detect (S-PLEWS-2013, S-ALHADDAD-2011). The literature that supports HRV-guided training uses 7-day rolling means and a smallest-worthwhile-change band, and the largest and best-controlled trials in that literature are split, with several finding no benefit over a well-designed fixed plan (S-NUUTTILA-2017, S-DUKING-2021, S-MANRESA-2021).
3. **The best readiness instrument BodyT could ship is the one it already ships.** A four-item self-report tracks training load with better sensitivity and consistency than resting heart rate and the other common objective markers (S-SAW-2016). The audit in section 4 therefore mostly says KEEP THE QUESTION, which is not the answer a wearables pack is expected to produce and is the answer the evidence supports.

---

## Contents

1. Sources (provenance)
2. Platform reality: what a PWA can and cannot read in 2026
3. The signal table: every candidate, its error bars, and its verdict
4. The "asked a human for what a sensor knows" audit
5. Platform reality matrix (signal x build target x latency x permission)
6. The integration fence: what an integration may write, and the conflict rule
7. Typed schema proposal
8. Eval fixtures
9. What this pack rejects, restated for the owner
10. Integration notes: which file changes, in what order

---
