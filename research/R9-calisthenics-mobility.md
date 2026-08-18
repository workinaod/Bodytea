# R9: Calisthenics, Skill Progression, Mobility and Warm-Up Evidence Pack

Research job R9 for BodyT. Deterministic local-first coaching PWA, no runtime LLM, suggest-only, users never pick reps.
Covers v12 sections 18 and 20 plus 50.9. Consumers: `plan/movement.ts` (chains), `plan/homeExercises.ts` + a new skill catalog,
`engine/phase.ts` (promotion criteria), a NEW warm-up/ramp engine, and `engine/resolveDay.ts` (where it sits in the pipeline).

Access date for all sources: 2026-08-18. Researcher: Claude (session d21c12d6). No production code, no repo writes in this job.

Conventions used throughout:

- **confidence: source** = grounded in a document captured in section 1 with a URL and access date.
- **confidence: consensus** = agreed across two or more reputable coaching sources but not a controlled trial.
- **HOUSE HEURISTIC** = BodyT's own judgement call, evidence-informed, NOT from any source. Always marked in caps.
  Never presented to a user as fact, never used to justify an unsafe gate.
- Disagreements are preserved rather than averaged. Where the evidence is weak the pack says so.
- No em dashes anywhere, including in copy strings.
- Every rung criterion states whether it is source, consensus or HOUSE HEURISTIC.

---

## 1. SOURCES (provenance)

Two source classes, kept apart on purpose. **Tier A** is peer-reviewed or a formal consensus statement.
**Tier C** is reputable coaching practice: widely used, internally consistent, and NOT experimentally validated.
Every progression criterion in section 3 is tagged with which tier it came from. Nothing in this pack pretends
that a rep threshold from a coaching source is a research finding.

| ID | Source | Tier | URL | Accessed | What was taken | Access quality |
|----|--------|------|-----|----------|----------------|----------------|
| RR-GIST | r/bodyweightfitness Recommended Routine, full-text mirror | C | https://gist.github.com/sgup/f10f1d57e54b7876495f4bafb6d697eb | 2026-08-18 | Complete warm-up list with doses, three strength pairings, core triplet, 3 sets of 5-8 with 90 s rest, the advance rule (3x8 clean, restart at 3x5) and the regress rule (cannot make 3x5), and every named ladder for pull-up, dip, squat, hinge, row, push-up, three core axes | FULL |
| RR-ANT | r/bodyweightfitness Recommended Routine, Antranik mirror (older revision) | C | https://antranik.org/rr/ | 2026-08-18 | Cross-check of the pairings and the "5 reps but not more than 8, 3 sets" selection rule; older ladder naming (scapular pulls, arch hang, negatives, pull-ups) | PARTIAL (criteria absent from this revision) |
| LOW-FUND | Steven Low, The Fundamentals of Bodyweight Strength Training | C | https://stevenlow.org/the-fundamentals-of-bodyweight-strength-training/ | 2026-08-18 | Session template (warm-up/mobility, skill, strength/power, cool-down/flexibility/prehab); 3-8 reps for strength, 5-12 for hypertrophy; 25-50 push and 25-50 pull reps per session; rest 3-7 min straight sets, 1.5-3.5 min alternating; holds progress by DURATION not reps | FULL |
| LOW-OG | Steven Low, Overcoming Gravity 2nd ed. progression charts (index page) | C | https://stevenlow.org/overcoming-gravity/ | 2026-08-18 | Confirms the chart families exist and are levelled Basic to Elite: handstand, handstand push-up, planche, front lever, back lever, elbow lever, muscle-up, squat. **Chart CONTENTS could not be retrieved** (studylib returned only metadata, pdfcoffee 403) | METADATA ONLY |
| GMB-HS | GMB Fitness, How To Do A Handstand | C | https://gmb.io/handstand/ | 2026-08-18 | 10-step progression (elevated A-frame, frogger, high frogger, elevated L-stand, wall entries, wall float, wall line work, split-leg kick-up, straddle handstand, full handstand entries); freestanding hold "comfortably up to one minute" before one-arm work; practice 2-4x/wk, 15-20 min; four pre-checks (wrist, shoulder, wall walk, bail) | FULL |
| HS-ROM | Handstand prerequisite ROM, coaching consensus captured across Muscle and Motion, The Movement Athlete, Camilla Mia, Momentum Training | C | search capture, 2026-08-18; representative: https://www.muscleandmotion.com/blog/mastering-the-handstand-pose/ and https://themovementathlete.com/press-to-handstand-mobility/ | 2026-08-18 | Shoulder flexion 170-180 deg needed to stack without lumbar arch; deficit is the stated cause of the "banana" handstand; wrist extension at least 90 deg and ideally 20-30 deg past 90; five minutes of wrist work before every handstand session | CONSENSUS CAPTURE (orthopt.org primer PDF returned 403) |
| MU-PRE | Muscle-up prerequisites, coaching consensus across Calisthenics Association, Gymnase Tips, BodyProSkills, calisthenics.com | C | search capture, 2026-08-18; representative: https://calisthenicsassociation.org/blog/muscle-up-tutorial-zero-to-hero | 2026-08-18 | Minimum 10 strict pull-ups (chest to bar quality) plus 15 strict dips plus a 5 s hold at the top of a pull-up; ideal 15 / 20 / 10 s; 8-12 weeks of structured work from an 8-pull-up baseline | CONSENSUS CAPTURE |
| FL-HOLD | Front lever hold criteria, coaching sources (Gymless, ChunkItUp, Andry Strong, calisthenics.com, Cliff Culture) | C | search capture, 2026-08-18; representative: https://gymless.org/front-lever/ | 2026-08-18 | Ladder tuck > advanced tuck > single leg > straddle > half lay > full. **Criteria disagree**: 30 s per rung (one camp), 10-15 s advanced tuck (another), 30-60 s advanced tuck and single leg (a conservative camp), and working sets of 5-20 s x4 x3/wk | CONSENSUS CAPTURE, DISAGREEMENT PRESERVED |
| PISTOL | Pistol squat progression, coaching consensus (PowerliftingTechnique, TrainHeroic, Outside, Odin) | C | search capture, 2026-08-18; representative: https://powerliftingtechnique.com/pistol-squat-progression/ | 2026-08-18 | Stage order assisted > box (descending height) > counterbalance > full; 3-5 reps per leg with long rest; advance on control at depth rather than a session count; 4-8 months typical | CONSENSUS CAPTURE |
| WARNEKE-2024 | Warneke K, Lohmann LH. Revisiting the stretch-induced force deficit: systematic review with multilevel meta-analysis of acute effects. J Sport Health Sci, 2024 | A | https://pmc.ncbi.nlm.nih.gov/articles/PMC11336295/ | 2026-08-18 | 83 studies, >400 effect sizes, 2,012 participants. Overall static-stretch force effect ES = -0.21 (p = 0.003). Per bout >= 60 s: ES = -0.84 (p = 0.004). Per bout < 60 s: ES = -0.18 (p = 0.03). Session volume > 480 s: ES = -0.46 (p = 0.03); <= 480 s: not significant. Impairs isolated max strength testing, not athletic performance tests; jumping in adults ES = +0.15 (p = 0.006). Subsequent active warm-up counteracts the deficit. Blanket avoidance is "without evidence" | FULL |
| BEHM-2016 | Behm DG, Blazevich AJ, Kay AD, McHugh M. Acute effects of muscle stretching on physical performance, ROM and injury incidence in healthy active individuals: a systematic review. Appl Physiol Nutr Metab 2016;41(1):1-11 | A | https://cdnsciencepub.com/doi/10.1139/apnm-2015-0235 | 2026-08-18 | Mean performance change: static -3.7%, dynamic +1.3%, PNF -4.4% when tested immediately after. Dose response: >= 60 s per muscle -4.6% vs < 60 s -1.1%. Recommendation: stretching inside a warm-up that is FOLLOWED by dynamic activity reduces muscle injuries and increases ROM with inconsequential performance cost | ABSTRACT + SEARCH CAPTURE (publisher HTML not fetched, PDF mirror was binary) |
| KAY-2012 | Kay AD, Blazevich AJ. Effect of acute static stretch on maximal muscle performance: a systematic review. Med Sci Sports Exerc 2012 | A | https://pubmed.ncbi.nlm.nih.gov/21659901/ (numbers captured via Frontiers 2019 reproduction, https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2019.01468/full) | 2026-08-18 | 106 studies; >= 60 s static stretch per muscle group averaged a 7.5% decline in strength measures; < 45 s usable in a warm-up without significant risk | REPRODUCTION (primary paywalled) |
| BEHM-2023 | Behm DG et al. Acute effects of various stretching techniques on range of motion: a systematic review with meta-analysis. Sports Med Open 2023 | A | https://pmc.ncbi.nlm.nih.gov/articles/PMC10645614/ | 2026-08-18 | 47 studies, 110 effect sizes, 1,658 participants. Overall ROM effect ES = -0.555 (p < 0.001). Static -0.570, dynamic/ballistic -0.447, PNF -0.581, **no significant difference between techniques (p = 0.72)**. No effect of stretch intensity (p = 0.76), no duration relationship (R^2 = 0.00, p = 0.39), no difference by trained state (p = 0.99) or sex (p = 0.89). Hip adductors did not respond (p = 0.403) | FULL |
| THOMAS-2018 | Thomas E, Bianco A, Paoli A, Palma A. The relation between stretching typology and stretching duration: the effects on range of motion. Int J Sports Med 2018;39(4):243-254 | A | https://pubmed.ncbi.nlm.nih.gov/29506306/ | 2026-08-18 | All typologies improve ROM long term; static significantly better than ballistic or PNF (p < 0.05). WEEKLY time is what matters: >= 5 min per week per muscle group; per-session time did not matter. Weekly frequency positively associated with ROM gain; >= 5 days/wk suggested | ABSTRACT + SEARCH CAPTURE |
| DELPHI-2025 | Warneke K, Wilke J, et al. Practical recommendations on stretching exercise: a Delphi consensus statement of international research experts. J Sport Health Sci, online 2025-06-11, print vol 14, 2025-12-01 | A | https://www.sciencedirect.com/science/article/pii/S2095254625000468 (403 through this proxy; content captured via https://www.uni-bayreuth.de/en/press-release/scientific-recommendations-stretching and https://medicalxpress.com/news/2025-07-scientifically-grounded-published.html) | 2026-08-18 | 20 stretching researchers, > 80% agreement on every item. Consensus that stretching improves ROM (alternatives exist) and reduces muscle stiffness (not always desirable); chronic stretching may help vascular health. Consensus that stretch training does NOT meaningfully build muscle, is NOT an all-encompassing injury-prevention strategy, and does NOT improve posture | SUMMARY-LEVEL (primary blocked; flagged wherever used) |
| VANHOOREN-2018 | Van Hooren B, Peake JM. Do we need a cool-down after exercise? A narrative review. Sports Med 2018;48:1575-1595 | A | https://pmc.ncbi.nlm.nih.gov/articles/PMC5999142/ | 2026-08-18 | Active cool-down largely ineffective on most psychophysiological recovery markers; trivial to small negative non-significant effects on same-day (> 4 h) anaerobic performance; next-day mixed, mostly trivial; no significant DOMS effect in most studies; damage markers conflicting; does not affect injury rates; does not attenuate long-term adaptation; no substantial psychological effect (perceived benefit possibly placebo). Real effects: faster lactate clearance (practical relevance questionable), faster cardiorespiratory normalisation, partial immune protection. If done: dynamic, low to moderate intensity, low impact, under about 30 min, preferred exercise | FULL |
| WIEWELHOVE-2019 | Wiewelhove T, Doweling A, Schneider C, et al. A meta-analysis of the effects of foam rolling on performance and recovery. Front Physiol 2019;10:376 | A | https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2019.00376/full | 2026-08-18 | 21 studies. Pre-rolling: sprint +0.7% (g = 0.28), flexibility +4.0% (g = 0.34), jump -1.9% (g = 0.09) and strength +1.8% (g = 0.12) both negligible. Post-rolling: attenuates sprint decrement +3.1% (g = 0.34) and strength +3.9% (g = 0.21), reduces muscle pain +6.0% (g = 0.47) | FULL |
| LAUERSEN-2014 | Lauersen JB, Bertelsen DM, Andersen LB. The effectiveness of exercise interventions to prevent sports injuries: systematic review and meta-analysis of RCTs. Br J Sports Med 2014;48(11):871-877 | A | https://pubmed.ncbi.nlm.nih.gov/24100287/ | 2026-08-18 | 25 RCTs, 26,610 participants, 3,464 injuries. Strength training the strongest single intervention; proprioception RR about 0.55 (95% CI 0.35-0.87); overuse injuries RR 0.527 (0.373-0.746). **Stretching did not show a significant protective effect.** The frequently quoted per-arm risk ratios (stretching about 0.96) could NOT be verified directly here: PDF mirrors returned binary, publisher HTML not fetched | ABSTRACT + SEARCH CAPTURE, PARTIAL |
| SSH-2024 | Stretching intervention can prevent muscle injuries: a systematic review and meta-analysis. Sport Sciences for Health, 2024 | A | https://link.springer.com/article/10.1007/s11332-024-01213-9 | 2026-08-18 | Only 4 RCTs of 5,575 screened. Static stretching intervention reduced MUSCLE injuries specifically: OR 0.37 (95% CI 0.16-0.85, p < 0.01). Authors distinguish this from the all-cause-injury null result. A published Comment exists (Springer, 2025, doi 10.1007/s11332-025-01324-x), so the finding is contested | ABSTRACT + SEARCH CAPTURE |
| FRADKIN-2010 | Fradkin AJ, Zazryn TR, Smoliga JM. Effects of warming-up on physical performance: a systematic review with meta-analysis. J Strength Cond Res 2010;24(1):140-148 | A | https://journals.lww.com/nsca-jscr/fulltext/2010/01000/effects_of_warming_up_on_physical_performance__a.21.aspx | 2026-08-18 | 30 high-quality studies (quality 6.5-9 of 10). Warm-up improved performance in 79% of the criteria examined; harm was rare | ABSTRACT + SEARCH CAPTURE |
| MCGOWAN-2015 | McGowan CJ, Pyne DB, Thompson KG, Rattray B. Warm-up strategies for sport and exercise: mechanisms and applications. Sports Med 2015;45:1523-1546 | A | https://link.springer.com/article/10.1007/s40279-015-0376-x | 2026-08-18 | Warm-up acts through temperature, metabolic, neural and psychological routes, including elevated oxygen-uptake kinetics and post-activation potentiation. Structure recommended as the three-stage RAMP model: Raise, Activate and Mobilise, Potentiate, with general then context-specific exercises plus dynamic flexibility | ABSTRACT + SEARCH CAPTURE |
| ENES-2025 | Enes A, Mohan A, Pinero A, et al. Warming up to improved performance? Effects of different specific warm-up protocols on neuromuscular performance in trained individuals. 2025 | A | https://sportrxiv.org/index.php/server/preprint/view/559 and https://www.sciencedirect.com/science/article/pii/S2666337625000988 | 2026-08-18 | 29 trained participants (4.5 +/- 3.9 y experience), crossover. 1SET (1 x 3-4 at 75% of 10RM), 2SET (55% then 75%, 3-4 reps each), CON (no specific warm-up). Working sets: 4 x 10RM to concentric failure, bench press and leg press. Standardised mean differences vs CON negligible to small on reps, fatigue index, volume load, readiness and RPE. Conclusion: a specific warm-up can be skipped at about 10RM loads for time efficiency | FULL (preprint record) |
| RIBEIRO-2020 | Ribeiro B, Pereira A, Neves PP, et al. The role of specific warm-up during bench press and squat exercises: a novel approach. Int J Environ Res Public Health 2020 | A | https://pmc.ncbi.nlm.nih.gov/articles/PMC7558980/ | 2026-08-18 | Three specific warm-ups before 3 x 6 at 80% 1RM with 3 min rest. WU = 2 x 6 at 40% then 80% of training load, 1 min rest. WU80 = 1 x 6 at 80%. WU40 = 1 x 6 at 40%. Squat: WU80 gave higher mean propulsive velocity in sets 2-3 vs WU40 (p = 0.02-0.05) and less velocity loss. Bench: progressive WU gave higher total work (4749.9 +/- 1313.0 vs 4631.8 +/- 1355.0 J, p = 0.01). 40% alone is insufficient | FULL |
| SOUZA-2024 | Souza D et al. Effect of warm-up protocols using lower and higher loads on multiple-set back squat volume-load. PeerJ 2024 | A | https://pmc.ncbi.nlm.nih.gov/articles/PMC11243969/ | 2026-08-18 | 14 trained men. HL-CA 1 x 3 at 90% 1RM then 10 min rest; LL-CA 1 x 6 at 45% then 10 min; CON 1 x 8 at 45% then 2 min. Main work 75% 1RM to failure, 90 s rest. Total reps 21 +/- 5 vs 19 +/- 5 vs 19 +/- 6 (p = 0.17); volume load 1826 vs 1723 vs 1668 kg (p = 0.15). Only set 1 volume load favoured HL-CA (p = 0.04). Conclusion: heavy or light conditioning activity did not potentiate multi-set performance over a usual warm-up | FULL |
| PAPE-REST | Effects of rest interval and training intensity on jumping performance: systematic review and meta-analysis investigating post-activation performance enhancement (2023), plus PAP enhancement induction strategies with different rest intervals on jump performance: a meta-analysis | A | https://pmc.ncbi.nlm.nih.gov/articles/PMC10328417/ and https://pmc.ncbi.nlm.nih.gov/articles/PMC12852009/ | 2026-08-18 | Rest 4-9 min beneficial for jump height, 4-7 min the best window; 0-1 min rest is DETRIMENTAL. Low and moderate intensity conditioning activity had no significant effect; high intensity did. Team-sport athletes: 70-80% 1RM, 1-3 short sets, about 4-5 min rest, peak velocity up to +7%, peak power up to +15.9%. Optimal interval varies by conditioning activity type (about 3 min after plyometrics, 7-10 min after high-intensity kicking) | FULL |
| SBS-WARMUP | Stronger by Science, "Heavier warm-ups are best, new study suggests" | C | https://www.strongerbyscience.com/heavier-warm-ups/ | 2026-08-18 | Listed for provenance only. **403 through this proxy, content NOT retrieved.** The underlying finding (a second warm-up set at 90% 1RM beating one at 45%) was captured instead from search snippets and is contradicted by SOUZA-2024 above | BLOCKED |

Blocked or degraded in this environment, recorded so a future session does not re-burn usage: sciencedirect.com (403),
strongerbyscience.com (403), pdfcoffee.com (403), orthopt.org PDF (403), springer link/article deep links (303 to an
auth IdP), studylib (metadata only), and PDF mirrors on paulogentil.com and squarespace (returned raw binary,
not text-extractable through WebFetch). PMC and Frontiers both fetched cleanly.



---

## 2. WHAT BODYT HAS TODAY

Read from `origin/claude/app-audit-refinement-sjw2va` (the deploy branch, merge line after J1 and J2).
Files: `src/plan/movement.ts` (487 lines), `src/plan/homeExercises.ts` (547), `src/engine/phase.ts` (226),
`src/engine/reps.ts` (246), `src/plan/blocks.ts` (114), `src/engine/sequence.ts`, `src/engine/resolveDay.ts` (599),
`src/plan/generator.ts` (940), `src/plan/equip.ts`, `src/logic/prescription.ts` (241).

### 2.1 The movement graph, counted

`MOVEMENT` holds **111 entries**. Distribution by pattern:

| pattern | entries | pattern | entries |
|---|---|---|---|
| pull-horizontal | 14 | lunge | 11 |
| hinge | 13 | conditioning | 11 |
| push-horizontal | 12 | squat | 7 |
| isolation | 11 | pull-vertical | 6 |
| calf | 6 | mobility | 6 |
| push-vertical | 4 | brace | 3 |
| carry | 3 | anti-rotation | 2 |
| flexion | 2 | | |

**90 of 111 movements have an empty `progressions` array.** They are terminal nodes. `movementChain()` walks
`regressions[0]` back and `progressions[0]` forward, capped at 4 each way, so chain length is the real measure:

| chain length | movements |
|---|---|
| 1 (isolated, no ladder at all) | 59 |
| 2 | 22 |
| 3 | 18 |
| 4 | 11 |
| 5 | 1 |

The single length-5 chain is `incline-push-up > push-up > floor-press > flat-db-press > incline-db-press`,
and it is only that long because it crosses from bodyweight into dumbbells. There is no length-5 chain that
one person with one set of equipment can actually walk.

### 2.2 Every ladder that exists, in full

These are all 13 roots (entries with no regressions and at least one progression), expanded along first edges:

```
leg-press > hack-squat                                              (2)
wall-sit > goblet-squat > db-front-squat > front-squat              (4, 3 rungs need load)
glute-bridge > single-leg-glute-bridge > hip-thrust                 (3, top rung needs barbell)
cable-pull-through > db-rdl > romanian-deadlift                     (3, all loaded)
band-good-morning > db-rdl > romanian-deadlift                      (3, all loaded)
slider-leg-curl > nordic-curl                                       (2)
split-squat > bulgarian-split-squat                                 (2)
incline-push-up > push-up > decline-push-up > archer-push-up        (4, the ONLY 4-rung unloaded ladder)
band-overhead-press > db-shoulder-press > standing-ohp              (3, loaded)
band-row > inverted-row                                             (2)
assisted-pull-up > pull-up                                          (2)
lat-pulldown > pull-up                                              (2)
double-leg-calf-raise > single-leg-calf-raise                       (2)
```

That is the entire progression surface of the app. Thirteen ladders, average depth 2.7, one of them four rungs deep
and unloaded.

### 2.3 Where it dead-ends, per pattern

- **Push horizontal.** Ends at `archer-push-up`. No one-arm work, no pseudo-planche, no ring push-up, no
  deficit or elevated variants, no negatives, no tempo rung. `diamond-push-up` is a side branch off `push-up`
  with no forward edge.
- **Push vertical.** Ends at `pike-push-up`, which has `regressions: ['db-shoulder-press','band-overhead-press']`
  and **no progressions at all**. The entire vertical-push bodyweight ladder is one rung. There is no elevated
  pike, no wall handstand, no handstand of any kind. `handstand` appears nowhere in any catalog.
- **Pull vertical.** `assisted-pull-up > pull-up`, and `pull-up` is terminal (`loadable: false`,
  `progressions: []`). A user who reaches 15 strict pull-ups has nowhere to go inside the graph. No scapular
  pull-up, no negatives, no archer, no weighted (blocked by `loadable: false`), no L-sit pull-up, no muscle-up.
- **Pull horizontal.** `band-row > inverted-row`, terminal. `inverted-row` has neither regressions nor
  progressions, so it is an isolated node reachable only by walking forward from `band-row`. No feet-elevated
  row, no tuck front-lever row, no archer row, no one-arm row progressions.
- **Squat.** The only unloaded rung is `wall-sit`. There is no plain bodyweight squat, no box squat, no
  split-squat-to-pistol path. `single-leg-squat-box` and `shrimp-squat` exist but are both terminal, and
  `single-leg-squat-box` lives in `athleticExercises.ts`, not the strength catalog. The word `pistol` appears
  in the repo only in prose.
- **Hinge.** Unloaded path is `glute-bridge > single-leg-glute-bridge > hip-thrust`, and the top rung needs a
  barbell and a bench. `slider-leg-curl > nordic-curl` is the only other unloaded hinge ladder, two rungs.
- **Brace / flexion / carry.** `plank-side-plank`, `hollow-hold`, `dead-bug`, `bird-dog`, `superman-hold`,
  `dead-hang`, `towel-hang` are ALL isolated single nodes. `weighted-situp > hanging-leg-raise` is the one
  core ladder and its top rung needs a dumbbell at the bottom. No L-sit anywhere; the only `l-sit` string hits
  are substring noise. No front lever, no back lever, no planche, no tuck holds, no toes-to-bar.
- **Dips.** There is no dip in any catalog. Not parallel-bar, not bench, not ring. The `dip` grep hits are
  the word inside prose.

Absent from every catalog, verified by id listing across `exercises.ts` (76 ids), `gymExercises.ts` (16),
`homeExercises.ts` (21) and `athleticExercises.ts` (72): **dip, pistol squat, handstand, L-sit, muscle-up,
front lever, back lever, planche, ring anything, parallettes, scapular pull-up, negative/eccentric-only rung,
tuck hold, tempo rung.** The `EquipTag` union has no `rings`, no `parallettes`, no `dip-bars` and no `wall`.

### 2.4 The unloaded dead-end problem, which is J2's ceiling

47 of the 111 movements are `loadable: false`. **40 of those 47 have no progressions at all.**

```
nordic-curl, shrimp-squat, cossack-squat, single-leg-squat-box, band-lateral-walk, archer-push-up,
diamond-push-up, pike-push-up, inverted-row, underhand-inverted-row, prone-rear-delt-raise, pull-up,
chin-up, bodyweight-calf-raise, tibialis-raise, plank-side-plank, hollow-hold, dead-bug, bird-dog,
superman-hold, hanging-leg-raise, towel-hang, dead-hang, hip-9090-switch, deep-squat-hold,
ankle-wall-mobilization, couch-stretch, t-spine-opener, dynamic-warmup, easy-walk, brisk-walk, easy-jog,
incline-walk, parking-lot-sprint, stair-run, hill-sprint, circuit-a, circuit-b, bike-erg, rowing-erg
```

Only 7 unloaded movements have anywhere to go: `wall-sit`, `glute-bridge`, `single-leg-glute-bridge`,
`slider-leg-curl`, `push-up`, `incline-push-up`, `decline-push-up`.

### 2.5 What J2 can now consume that it could not before

`engine/phase.ts` `verdictFor()` now has two branches. When `liftSeries()` (loaded e1RM) returns nothing for a
phase, it falls through to `repMaxSeries()` and judges on reps:

```
needed = max(REP_GAIN_TO_PROMOTE=2, ceil(first * GAIN_TO_PROMOTE=0.05))
earned when  max(last 3 rep-maxes) - first >= needed,   given >= MIN_SESSIONS_TO_JUDGE = 8 sessions in the phase
```

So the app can, for the first time, say "this bodyweight lift got stronger over sixteen weeks". What it does
with that answer is `nextUp()`, which walks `progressions`, filters by `canDo(id, owned)` and refuses a jump of
more than one skill level. **For 40 of the 47 unloaded movements `nextUp()` returns null and the verdict
collapses to `topped-out`.** The measurement landed; the thing it was supposed to feed is empty.

Concretely: a pull-up athlete who goes from 3 reps to 9 over a phase is correctly judged `earned`, then
`topped-out`, and phase 3 hands them the identical pull-up prescription. The J2 checkpoint records untested
verdicts falling 41/80 to 2/80 and push-up athletes promoting to decline push-ups. The push-up ladder is the
one that worked because it is the one ladder with four rungs. Everything else in that population had nowhere to promote to.

Also newly consumable, and currently unused by any skill logic:

- `repMaxSeries(data, exerciseId)` gives a dated rep-max series per exercise. That is exactly the shape a
  hold-time or rep criterion needs, and nothing but `phase.ts` reads it.
- `respondToSet` returns offer-ease for unloaded shortfalls (in-session), so an unloaded rung can now fail
  gracefully without a load drop.
- `SetLog.targetReps` is on disk, so `reps.ts` derives the next number from history rather than a stored offset.
  A hold criterion would need the same field to accept "45 sec", which `parseRepRange` already tolerates
  ("40-60 sec" parses; "10 / leg" correctly does not).

### 2.6 Warm-up: there is no engine

Grep across `src/` for `warm`, `ramp`, `primer`, `potentiation`, `cooldown`:

- `ExerciseKind` includes `'warmup'`. Exactly **one** catalog entry uses it: `dynamic-warmup`
  (`exercises.ts` line 1114, `equip: ['none']`, `MOVEMENT` pattern `mobility`, role `mobility`, terminal node).
- It is scheduled in exactly **one** place: `generator.ts` line 252, `fx('dynamic-warmup', 1, '8 min')`, inside
  the `speed` template only. The `power`, `lowerStrength`, `push`, `pull`, `upperMix`, `fullBody` templates
  have no warm-up entry at all. A heavy squat day starts on set 1 of the working weight.
- `sequence.ts` `band()` gives `warmup` band 0, so IF a warm-up existed it would sort first. The rail is
  there; nothing rides it.
- `transforms.ts` `UNTOUCHED_BY_DELOAD = {'mobility','cardio','warmup'}` and `volume.ts` scores `warmup: 0`
  sets, so a warm-up would correctly not count as training volume. Again, rail without train.
- `applyWeekRamp` is block-level set periodisation, NOT warm-up ramp sets. Nothing named ramp set exists.
- `focus.ts` gives `warmup` and `mobility` a 20-second per-set time estimate.
- The `mobility` day template is 7 fixed entries (`hip-9090-switch`, `deep-squat-hold`,
  `ankle-wall-mobilization`, `couch-stretch`, `t-spine-opener`, `dead-hang`, `easy-walk 20-30 min`) with a
  note "This is recovery, not training". It is a fixed list, identical for every user, unresponsive to what
  they trained, what hurts, or what they are working toward.
- `adapt.ts` line 226 explicitly notes there is no evidence base wired in for prescribing recovery work
  (foam rolling, extra mobility).

So: six mobility movements in the catalog, one nominal warm-up entry, zero warm-up construction logic,
zero ramp sets, zero cool-down, zero per-exercise movement prep, zero coupling between what the day contains
and what precedes it.

### 2.7 Two structural facts the rest of this pack has to respect

1. **`loadable: false` is doing double duty.** Its docstring says it means "has no load lever at all and
   progresses by leverage or reps". But `pull-up` and `chin-up` are tagged `loadable: false` and a weight belt
   is the single most standard progression there is. Deepening the chains means deciding whether
   `loadable` stays a hard property of the movement or becomes a function of movement plus available equipment.
2. **Promotion is judged per anchor slot, not per movement.** `ANCHOR_SLOTS = ['squatVariation','press1',
   'rowVariation','hamstring']`. There is no anchor slot for vertical pull, vertical push or core, so a
   pull-up, a pike push-up and a hollow hold are never phase-judged at all, however deep their chains get.
   Skill work does not currently have a slot to live in.

---
## 3. SKILL PROGRESSION GRAPHS

### 3.0 Three things that are not the same thing

The single biggest modelling error available here is treating a handstand like a set of push-ups. LOW-FUND
separates them explicitly and so must BodyT:

| | SKILL practice | STRENGTH work | VOLUME / hypertrophy |
|---|---|---|---|
| what it trains | motor pattern, balance, position tolerance | force at a hard leverage | tissue and work capacity |
| where in the session | FIRST, after warm-up, before anything fatiguing | after skill, before accessories | last |
| how it is dosed | short efforts, long rest, never near failure. GMB-HS: 15-20 min, 2-4x/wk | LOW-FUND: 3-8 reps, 3-7 min rest straight sets or 1.5-3.5 min alternating | LOW-FUND: 5-12 reps, 40-100 total reps per push/pull family |
| how it progresses | quality of position, then duration, then reduced assistance | harder leverage at a fixed rep band | more reps then more sets at a fixed leverage |
| what "failure" means | position breaks. STOP. | cannot complete the rep band | reached the top of the band |
| frequency | high, daily is fine | 2-3x/wk per pattern | 2x/wk per muscle |
| BodyT today | does not exist | double progression via `reps.ts` | `volume.ts` set caps |

**Consequence for the engine:** a rung needs a `progressionMode` field. `'reps'` (existing double progression),
`'hold'` (seconds, same double-progression shape over a seconds range), `'skill'` (practice time and quality,
never auto-advanced, promoted only on an explicit user-confirmed criterion), and `'assisted'` (progress by
reducing assistance, which is a third axis the app has no representation for at all).

**HOUSE HEURISTIC: skill rungs are never auto-promoted.** A rep rung can promote on logged evidence.
A skill rung asks. The app cannot see whether a handstand was straight, and inventing a verdict about a position
it cannot observe is exactly the fabricated certainty BODYT_STATE section 1 forbids. Skill rungs surface a
"can you hold this for N seconds with the wall barely touched?" prompt, one tap, suggest-only.

### 3.1 The default advance and regress rule

Adopted from RR-GIST, which is the most widely used single standard in the space, and consistent with
LOW-FUND's 5-12 selection band.

```
REP RUNG   advance when 3 sets x 8 clean reps are logged in one session
           hold    when between 3x5 and 3x8
           regress when 3 sets x 5 cannot be made in two consecutive sessions
HOLD RUNG  advance when 3 sets x <rungSeconds> are logged in one session
           regress when the top set falls below 50% of rungSeconds twice in a row
```

Tier: **C (RR-GIST)** for the rep rule. The hold rule shape is **HOUSE HEURISTIC** built on LOW-FUND's
"holds progress by duration"; the per-rung seconds come from the family tables below and carry their own tier tag.

Two BodyT-specific adjustments, both **HOUSE HEURISTIC**:

1. **The 3x8 gate is a phase-independent in-block promotion**, separate from `phase.ts`'s 16-week anchor
   promotion. Sixteen weeks is far too slow for a beginner going incline push-up to push-up, and far too fast
   to be the only gate for a lever. Two clocks, both suggest-only.
2. **Hysteresis on regression, matching J2's failing-flag pattern**: regress only after two consecutive
   sessions under the floor, and clear the ledger on regression. The J2 checkpoint proved this shape works.

### 3.2 Push-up family

Pattern `push-horizontal`. All rungs unloaded unless noted. Existing BodyT ids marked (have).

| # | rung | prerequisite | advance criterion | tier | common failure mode | regression |
|---|---|---|---|---|---|---|
| 1 | `wall-push-up` | none | 3x8 | C RR-GIST | hips lead, elbows flare to 90 deg | none, this is the floor |
| 2 | `incline-push-up` (have) | rung 1 | 3x8, then lower the surface one step before advancing | C RR-GIST | surface too high to be honest work | raise the surface |
| 3 | `knee-push-up` | rung 2 at a low surface | 3x8 | C | hips sag, knees behind hips | back to incline |
| 4 | `push-up` (have) | rung 2 or 3 | 3x8 | C RR-GIST | lumbar sag, partial depth (chest not to fist height), head-first descent | `incline-push-up` |
| 5 | `diamond-push-up` (have) | rung 4 at 3x8 | 3x8 | C RR-GIST | wrist and elbow pain, shoulders internally rotating | `push-up` |
| 6 | `decline-push-up` (have) | rung 4 at 3x8 | 3x8 | C | shoulder shrugging as the angle steepens | `push-up` |
| 7 | `archer-push-up` (have) | rung 6 | 3x8 per side | C RR-GIST | straight arm doing half the work; torso rotating | `decline-push-up` |
| 8 | `pseudo-planche-push-up` | rung 6 plus 30 s planche lean | 3x8 | C RR-GIST | not leaning, so it is just a push-up; wrist extension pain | `push-up` with a lean, or rung 6 |
| 9 | `one-arm-push-up-elevated` | rung 7 and rung 8 | 3x5 per side | C | spine rotating; this rung is genuinely a different skill | rung 7 |
| 10 | `one-arm-push-up` | rung 9 | 3x5 per side | C | as above | rung 9 |

Isometric side branch used by rungs 8-10 and by the planche family: `planche-lean` (hold), rung criterion 30 s.

**Note the ordering disagreement.** RR-GIST places diamond before pseudo-planche and treats decline as optional;
Overcoming Gravity's chart order could not be retrieved to cross-check (LOW-OG is metadata only). BodyT already
has `decline-push-up` between push-up and archer. **HOUSE HEURISTIC: keep BodyT's existing order and add
diamond and pseudo-planche as SIDE BRANCHES off `push-up` and `decline-push-up` respectively**, so the golden
snapshot's existing first-edge chain is untouched (see section 9).

### 3.3 Pull-up family

Pattern `pull-vertical`. This is where BodyT's graph is thinnest: two rungs today.

| # | rung | prerequisite | advance criterion | tier | common failure mode | regression |
|---|---|---|---|---|---|---|
| 1 | `dead-hang` (have) | grip tolerance | 3 x 30 s | C RR-GIST | grip fails before shoulders learn anything | towel-assisted or feet-supported hang |
| 2 | `scapular-pull` | rung 1 at 30 s | 3x8 | C RR-GIST | bending elbows, which makes it a bad pull-up | `dead-hang` |
| 3 | `arch-hang` (active hang) | rung 2 | 3x8, or 3 x 20 s | C RR-GIST | shrugging instead of depressing; no thoracic extension | `scapular-pull` |
| 4 | `band-assisted-pull-up` OR `assisted-pull-up` (have, machine) | rung 3 | 3x8 with the band one step lighter each time | C | band doing the top half; kipping | thicker band |
| 5 | `negative-pull-up` | rung 3 | 3 x 5 at a 5 s lowering count | C RR-GIST | dropping through the bottom third, which is the part being trained | 3 s lowering, or rung 4 |
| 6 | `pull-up` (have) | rung 4 or 5 | 3x8 | C RR-GIST | chin over bar only, no chest proximity; not returning to a full hang | `negative-pull-up` |
| 7 | `chin-up` (have) | side branch off rung 6, easier for most | 3x8 | C | elbow pain at the bottom | `negative-pull-up` |
| 8 | `wide-pull-up` / `l-sit-pull-up` / `archer-pull-up` | rung 6 at 3x8 | 3x8 (archer: 3x5 per side) | C RR-GIST | archer becomes a lopsided normal pull-up | `pull-up` |
| 9 | `weighted-pull-up` | rung 6 at 3x8 | double progression on LOAD from here, the normal engine | C RR-GIST | none specific; this is where calisthenics rejoins loaded lifting | remove weight |

**This is the single most valuable chain to add.** BODYT_STATE records that untested phase verdicts fell to
2/80 while pull-up athletes still cannot promote. Rung 9 also resolves the `loadable: false` problem noted in
2.7: a pull-up IS loadable once a belt or a dumbbell between the feet is available, so `loadable` has to become
a function of movement AND equipment (see section 9).

### 3.4 Dip family

Pattern `push-vertical` (BodyT has no `push-vertical` bodyweight ladder past pike, and no dip at all).

| # | rung | prerequisite | advance criterion | tier | common failure mode | regression |
|---|---|---|---|---|---|---|
| 1 | `bench-dip` | none | 3x8 | C | shoulders rolling forward; this rung is the one most likely to hurt shoulders, keep it short | reduce depth |
| 2 | `support-hold` (parallel bars or rings) | none | 3 x 30 s | C RR-GIST | shrugged shoulders; rings shaking (that is the point on rings) | feet touching floor |
| 3 | `negative-dip` | rung 2 at 30 s | 3 x 5 at a 5 s lowering count | C RR-GIST | falling through the bottom | 3 s count |
| 4 | `band-assisted-dip` | rung 2 | 3x8 | C | band carrying the bottom third | thicker band |
| 5 | `parallel-bar-dip` | rung 3 or 4 | 3x8 | C RR-GIST | not reaching upper-arm-parallel depth; excessive forward lean turning it into a press | `negative-dip` |
| 6 | `ring-dip` | rung 5 at 3x8 plus rung 2 held 30 s ON RINGS | 3x8 | C RR-GIST | rings turning out at the bottom; elbows flaring | `parallel-bar-dip` |
| 7 | `weighted-dip` | rung 5 at 3x8 | load double progression | C | | remove weight |

**Safety note, tier C consensus and worth encoding:** the dip bottom position is the most shoulder-provocative
common calisthenics position. R6's shoulder routing already exists (`stress: ['shoulder']`); every dip rung
should carry `stress: ['shoulder','elbow']` and be excluded outright when the shoulder is flagged, rather than
depth-limited by copy.

### 3.5 Squat and pistol family

Pattern `squat` and `lunge`. BodyT's only unloaded squat rung today is `wall-sit`.

| # | rung | prerequisite | advance criterion | tier | common failure mode | regression |
|---|---|---|---|---|---|---|
| 1 | `assisted-squat` (holding a support) | none | 3x8 | C RR-GIST | using the arms to pull rather than balance | higher support |
| 2 | `bodyweight-squat` | rung 1 | 3x8 to a depth where the hip crease passes the knee | C RR-GIST | heels lifting (an ankle issue, gate it, see 4.4); knees collapsing in | box squat to a higher box |
| 3 | `split-squat` (have) | rung 2 | 3x8 per leg | C RR-GIST | front knee wandering; torso collapsing | `bodyweight-squat` |
| 4 | `bulgarian-split-squat` (have) | rung 3 | 3x8 per leg | C RR-GIST | rear foot too high, becomes a hip-flexor stretch | `split-squat` |
| 5 | `step-down` / `box-pistol` (descending box height) | rung 4 | 3x8 per leg at a given box height, then lower the box one step | C PISTOL | dropping onto the box rather than controlling down | raise the box |
| 6 | `skater-squat` or `shrimp-squat` (have) | rung 4 | 3x8 per leg | C RR-GIST | back knee slamming down; hips rotating | `bulgarian-split-squat` |
| 7 | `counterbalance-pistol` (holding a light plate or the arms far forward) | rung 5 at a low box | 3x5 per leg | C PISTOL | ankle mobility, not strength, is the limiter for most | back to rung 5 |
| 8 | `pistol-squat` | rung 7 | 3x5 per leg | C PISTOL | heel lift; falling backward at the bottom | `counterbalance-pistol` |

PISTOL flags a real timeline: 4-8 months of consistent work for a first clean pistol. **HOUSE HEURISTIC:
any rung whose consensus timeline exceeds one 16-week phase must not be presented as a phase target.**
It is a multi-phase project and the copy should say so.

RR-GIST orders the squat ladder assisted > squat > split > Bulgarian > shrimp (beginner/intermediate/advanced),
i.e. it routes to the shrimp squat rather than the pistol. PISTOL routes through descending box height.
**Both are defensible; preserve both as parallel forks off rung 4** rather than picking one.

### 3.6 Hinge family

Pattern `hinge`. This is the weakest family in every bodyweight source, RR-GIST included, because there is no
good unloaded hip hinge with meaningful resistance.

| # | rung | prerequisite | advance criterion | tier | common failure mode | regression |
|---|---|---|---|---|---|---|
| 1 | `glute-bridge` (have) | none | 3x8 | C | lumbar extension substituting for hip extension | reduce range |
| 2 | `single-leg-glute-bridge` (have) | rung 1 | 3x8 per side | C | hips rotating | `glute-bridge` |
| 3 | `hip-hinge-pattern` / `band-good-morning` (have) | rung 1 | 3x8 | C | rounding, which is the whole thing this rung exists to teach | dowel-on-spine cue drill |
| 4 | `single-leg-rdl` (have, bodyweight version) | rung 2 and rung 3 | 3x8 per side | C RR-GIST | balance failing before hamstrings do | hand on a support |
| 5 | `slider-leg-curl` (have) | rung 2 | 3x8 | C | hips dropping | reduce range |
| 6 | `banded-nordic-curl` | rung 5 | 3x8 | C RR-GIST | band too strong to be work | stronger band |
| 7 | `nordic-curl` (have) | rung 6 | 3x5 | C RR-GIST | falling rather than lowering; this rung has a high acute-soreness cost, ramp volume slowly | `banded-nordic-curl` |
| 8 | `reverse-hyper` / `back-extension` | rung 3 | 3x8-12 | C RR-GIST | lumbar hyperextension at the top | reduce range |

**Honest limitation, tier C consensus:** RR-GIST's own hinge column starts at "Romanian Deadlift" with a
weight, which is an admission that the unloaded hinge ladder runs out. **HOUSE HEURISTIC: for a no-equipment
user, hinge is the pattern where BodyT should say out loud that the ladder is short**, rather than inventing
rungs. Nordic curls and single-leg RDLs, plus honesty, are the whole offer.

### 3.7 Row family (horizontal pull)

Pattern `pull-horizontal`. Today: `band-row > inverted-row`, then nothing.

| # | rung | prerequisite | advance criterion | tier | common failure mode | regression |
|---|---|---|---|---|---|---|
| 1 | `vertical-row` (near-upright, feet close to the anchor) | none | 3x8 | C RR-GIST | standing too far back to be vertical | step in |
| 2 | `incline-row` | rung 1 | 3x8, then lower the anchor or step the feet forward | C RR-GIST | hips sagging; partial range | raise the anchor |
| 3 | `inverted-row` (have, horizontal body) | rung 2 | 3x8 | C RR-GIST | not touching the bar; head leading | `incline-row` |
| 4 | `feet-elevated-inverted-row` | rung 3 | 3x8 | C | lumbar sag | rung 3 |
| 5 | `wide-row` | rung 3 | 3x8 | C RR-GIST | shoulders shrugging | rung 3 |
| 6 | `archer-row` | rung 4 or 5 | 3x8 per side | C RR-GIST | assisting arm doing real work | rung 4 |
| 7 | `tuck-front-lever-row` | rung 6 plus 15 s tuck front lever | 3x5 | C RR-GIST | hips dropping, so it becomes a normal row | rung 6 |
| 8 | `front-lever-row` (straddle then full) | the corresponding lever hold | 3x5 | C | | previous lever rung |

`underhand-inverted-row` (have) is a side branch off rung 3, not a rung.

### 3.8 Handstand family (SKILL, not strength)

**This family must be `progressionMode: 'skill'`.** It is the clearest case where a rep counter is the wrong
instrument. GMB-HS: 2-4 sessions a week, 15-20 minutes, never to failure.

| # | rung | prerequisite | criterion to advance | tier | common failure mode | regression |
|---|---|---|---|---|---|---|
| 0 | `wrist-prep` | none, and it is mandatory | 5 min before EVERY handstand session, not a rung to leave behind | C HS-ROM, GMB-HS | skipping it, which is the stated near-universal cause of handstand wrist pain | none |
| 1 | `elevated-a-frame` / `downward-dog` | wrist and shoulder gates (section 4.3) | 3 x 30 s with a straight line from hands to hips | C GMB-HS | bent knees are fine; a rounded upper back is not | feet further from hands |
| 2 | `frogger` (crow) | rung 1 | 3 x 20 s | C GMB-HS | face-planting, hence the mandatory bail practice | knees lower on the arms |
| 3 | `high-frogger` / `tuck-planche-lean` | rung 2 at 20 s | 3 x 15 s | C GMB-HS | wrist pain, which means rung 0 is being skipped | `frogger` |
| 4 | `elevated-l-stand` (feet on a box, hips stacked) | rung 1 | 3 x 30 s | C GMB-HS | hips behind the hands, so no stacking is learned | lower box |
| 5 | `wall-walk` / `wall-entry` | rung 4 plus a REHEARSED bail | 3 x 5 walks to a hands-close-to-wall position | C GMB-HS | walking in only halfway, so the shoulders never stack | rung 4 |
| 6 | `chest-to-wall-handstand` | rung 5 | 3 x 30 s with a flat back | C GMB-HS | banana back, which is a shoulder flexion deficit, not effort (gate 4.3) | rung 5 |
| 7 | `wall-float` (heels off the wall) | rung 6 at 30 s | 3 x 5 floats of 3 s | C GMB-HS | not actually leaving the wall | rung 6 |
| 8 | `freestanding-handstand` | rung 7 | accumulate 30 s of freestanding hold across a session | C GMB-HS | chasing the hold before the entry is reliable | rung 7 |
| 9 | `freestanding-handstand-60s` | rung 8 | 60 s comfortably, the stated gate before one-arm work | C GMB-HS | | rung 8 |

Handstand push-up is a SEPARATE strength ladder that branches off rung 6, not a continuation of the balance
ladder: `pike-push-up` (have) > `elevated-pike-push-up` (descending box height) > `wall-hspu-partial` >
`wall-hspu` > `deficit-wall-hspu` > `freestanding-hspu`. Advance criterion 3x8 per rung, tier C.
Prerequisite for the wall rungs: rung 6 of the balance ladder held 30 s, **HOUSE HEURISTIC**, on the reasoning
that pressing in a position you cannot hold statically is how people land on their necks.

### 3.9 L-sit family (core compression, hold-mode)

| # | rung | prerequisite | advance criterion | tier | common failure mode | regression |
|---|---|---|---|---|---|---|
| 1 | `foot-supported-l-sit` (both feet down) | shoulder depression | 3 x 30 s | C RR-GIST | not pushing the floor away, so shoulders stay shrugged | hands on blocks |
| 2 | `one-foot-supported-l-sit` | rung 1 | 3 x 20 s per side | C RR-GIST | hips sinking behind the hands | rung 1 |
| 3 | `tuck-l-sit` | rung 2 | 3 x 20 s | C RR-GIST | knees not lifted, so it is a support hold | rung 2 |
| 4 | `advanced-tuck-l-sit` / `one-leg-l-sit` | rung 3 | 3 x 15 s | C | hamstring cramp, which is normal and not a fault | rung 3 |
| 5 | `l-sit` | rung 4 | 3 x 15 s with legs at or above horizontal | C RR-GIST | legs below horizontal, hips rounded back | rung 4 |
| 6 | `v-sit` / `manna` | rung 5 held 30 s | multi-year project, do not present as a phase target | C | | rung 5 |

Hands on parallettes or blocks is one full step easier than hands on the floor at every rung. That is an
EQUIPMENT axis, not a rung (section 5).

### 3.10 Muscle-up

The clearest prerequisite gate in the whole pack, and the one with the best consensus numbers.

| gate | minimum | ideal | tier |
|---|---|---|---|
| strict pull-ups, chest to bar | 10 | 15 | C MU-PRE |
| strict dips, parallel bars | 15 | 20 | C MU-PRE |
| hold at the top of a pull-up | 5 s | 10 s | C MU-PRE |

Ladder once gated: `high-pull-to-sternum` > `explosive-pull-up` > `jumping-muscle-up` (or band-assisted) >
`negative-muscle-up` (5 s transition) > `kipping-muscle-up` (bar) > `strict-muscle-up`. Advance criterion 3x5
per rung, tier C. Typical timeline 8-12 weeks from an 8-pull-up baseline (MU-PRE).

Common failure mode across every rung: attempting the transition without the pulling range. MU-PRE is explicit
that a chin-height pull-up is not enough, the pull must reach chest to bar. **This is directly encodable**:
BodyT logs pull-up reps but not pull height, so the gate has to be a user-confirmed quality question, not an
inferred one (section 4.6).

### 3.11 Front lever

Ladder (agreed across all FL-HOLD sources): `tuck-front-lever` > `advanced-tuck-front-lever` >
`one-leg-front-lever` > `straddle-front-lever` > `half-lay-front-lever` > `front-lever`.

**The criterion is genuinely disputed and this pack does not resolve it:**

| camp | criterion per rung | source |
|---|---|---|
| conventional | 30 s hold before advancing | FL-HOLD (Gymless and others) |
| working-set | 4 sets of 5-20 s, 3x/wk, advance on the top of that band | FL-HOLD (ChunkItUp: adv tuck 5-20 s; straddle 3-15 s) |
| conservative | 30-60 s on advanced tuck AND single leg before straddle | FL-HOLD |

**HOUSE HEURISTIC for BodyT: take the middle, 3 x 15 s per rung to advance, and show the disagreement.**
15 s is above the working-set camp's floor and below the conventional camp's 30 s. Copy should say the number
is a convention, not a law. Prerequisite before rung 1: 3x8 `pull-up` plus 3 x 30 s `hollow-hold`
(**HOUSE HEURISTIC**, on the reasoning that a lever is a hollow body held by the lats, and neither half alone
gets there). Common failure mode at every rung: hips dropping and the position silently becoming the previous
rung, which is why the criterion is a hold-quality question and not just a stopwatch.

Back lever ladder: `german-hang` (3 x 30 s, and this is a shoulder-extension mobility gate as much as a strength
rung) > `tuck-back-lever` > `advanced-tuck` > `straddle` > `full`. Same 3 x 15 s house rule.
**Explicit safety note, tier C consensus:** the german hang loads the shoulder and biceps tendon in end-range
extension. It should be gated behind shoulder health harder than any other rung in this pack, and refused
outright on a shoulder or elbow flag.

### 3.12 Planche

Ladder: `planche-lean` (3 x 30 s) > `tuck-planche` > `advanced-tuck-planche` > `straddle-planche` >
`full-planche`. Same 3 x 15 s house rule per rung.

Two things BodyT must say honestly rather than gamify:

1. **Wrist load is the limiter for most people, not shoulders.** Every rung is a maximal wrist-extension
   weight-bearing position. Rung 0 is the same `wrist-prep` block as the handstand family, mandatory,
   tier C HS-ROM.
2. **Timeline is measured in years, not phases.** LOW-OG levels the planche to "Elite". A plan that offers a
   full planche as a 16-week phase target is lying. **HOUSE HEURISTIC: cap the offered target at
   `advanced-tuck-planche` for any user under two years of training age, and present anything beyond it as a
   long project with no date.**

### 3.13 What deepening buys, in numbers

| pattern | rungs today | rungs proposed | unloaded rungs proposed |
|---|---|---|---|
| push-horizontal | 4 (incline > push-up > decline > archer) | 10 + 2 side branches | 10 |
| pull-vertical | 2 | 9 | 8 (rung 9 is loaded) |
| push-vertical (dip) | 0 | 7 | 6 |
| push-vertical (handstand push-up) | 1 (pike, terminal) | 6 | 6 |
| squat / pistol | 1 unloaded (wall-sit) | 8 | 8 |
| hinge | 3 (2 unloaded) | 8 | 7 |
| pull-horizontal | 2 | 8 | 8 |
| handstand (skill) | 0 | 10 | 10 |
| L-sit | 0 | 6 | 6 |
| muscle-up | 0 | 6 | 6 |
| front lever | 0 | 6 | 6 |
| back lever | 0 | 5 | 5 |
| planche | 0 | 5 | 5 |
| **total** | **13 ladders, 90/111 terminal** | **~94 rungs across 13 families** | |

---

## 4. PREREQUISITES AND GATES

A gate is a testable condition BodyT evaluates from data it ACTUALLY HAS before offering a rung. Everything
below is expressed against real fields: `data.sessions[].exercises[].sets[]` (`done`, `achieved`, `targetReps`,
`weightLb`, `light`, `rir`, `feel`), `repMaxSeries()`, `liftSeries()`, `data.prefs.pinned`,
`data.prefs.limitations` (R6/J6), `plan.equipment`, and `settings.phaseStartDate`.

### 4.1 Gate vocabulary (proposed shape)

```
type Gate =
  | { kind: 'reps';       exerciseId: string; sets: number; reps: number; withinDays: number }
  | { kind: 'hold';       exerciseId: string; sets: number; seconds: number; withinDays: number }
  | { kind: 'sessions';   exerciseId: string; count: number; withinDays: number }
  | { kind: 'noFlag';     joint: Joint }
  | { kind: 'equipment';  any: EquipTag[] }
  | { kind: 'confirmed';  question: string; freshDays: number }   // user tap, never inferred
  | { kind: 'trainingAge'; minMonths: number }
```

`confirmed` is the load-bearing one. Position quality, wrist comfort, shoulder overhead range and pull height
are all things the app cannot see. Asking once and caching the answer with a freshness window is honest;
inferring it is not. This mirrors the existing `Prefs` source/confidence/recency direction in J7.

### 4.2 Universal gates (apply to every skill rung)

| gate | rule | rationale | tier |
|---|---|---|---|
| exposure | `{kind:'sessions', exerciseId: currentRung, count: 4, withinDays: 42}` | a rung cleared once on a good day is not cleared. J2's `MIN_SESSIONS_TO_JUDGE = 8` over 16 weeks is the phase analogue; 4 in 6 weeks is the in-block analogue | HOUSE HEURISTIC |
| freshness | the qualifying session must be within 21 days | matches `STALE_DAYS` in `reps.ts` exactly, so promotion and prescription agree about what "recent" means | source (repo constant) |
| not-light | qualifying sets must not carry `light: true` | the load-provenance rule in BODYT_STATE section 1. A rung cleared on a deliberately easy day is not cleared | source (repo rule) |
| not-pinned | `!data.prefs.pinned.includes(currentRung)` | already respected by `phase.ts` | source (repo) |
| joint clear | no active limitation naming a joint in the rung's `stress[]` | R6 routing | source (R6) |

### 4.3 Handstand gates (the case the brief asks for)

| gate | testable form | why | tier |
|---|---|---|---|
| wrist preparation | `{kind:'sessions', exerciseId:'wrist-prep', count: 6, withinDays: 21}` | HS-ROM: 5 min of wrist work before every session is called non-negotiable; wrist pain is described as almost always a preparation failure | C HS-ROM |
| wrist extension | `{kind:'confirmed', question:'Kneel with your palms flat and fingers forward. Can you sit back over your hands without pain?', freshDays: 90}` | proxy for the 90 deg plus 20-30 deg criterion. BodyT cannot measure degrees; it CAN ask a position question with a yes/no answer | C HS-ROM, framing HOUSE HEURISTIC |
| shoulder flexion | `{kind:'confirmed', question:'Lie on your back, knees bent, low back flat. Can you touch the floor overhead with straight arms?', freshDays: 90}` | the standard supine flexion screen, a proxy for 170-180 deg. HS-ROM names this deficit as the cause of the banana handstand | C HS-ROM, framing HOUSE HEURISTIC |
| bail rehearsed | `{kind:'confirmed', question:'Have you practised stepping out of a handstand safely?', freshDays: 365}` | GMB-HS lists bail practice as a pre-check | C GMB-HS |
| joint clear | no wrist and no shoulder limitation flag | | source (R6) |
| entry gate | 3 x 30 s `elevated-a-frame` logged | rung 1 criterion | C GMB-HS |

**What happens when a gate fails is the important part.** A failed shoulder-flexion gate must NOT block
handstand work outright. It reroutes: wall-facing rungs (chest-to-wall) demand MORE flexion than back-to-wall,
so a failed gate routes to `elevated-l-stand` and box-supported work plus a thoracic and lat mobility block,
and re-asks in 30 days. **HOUSE HEURISTIC**, but the direction (limited flexion causes lumbar compensation
and wrist overload) is HS-ROM.

### 4.4 Other family gates

| family | gate | testable form | tier |
|---|---|---|---|
| dip | shoulder clear, plus support hold | `{noFlag:'shoulder'}` + `{hold:'support-hold', 3 x 30 s}` | C RR-GIST |
| muscle-up | the three MU-PRE gates | `{reps:'pull-up', 3x10}` + `{reps:'parallel-bar-dip', 3x15}` + `{hold:'pull-up-top-hold', 1 x 5 s}` + `{confirmed:'Do your pull-ups reach chest to bar?'}` | C MU-PRE |
| front lever | pull plus hollow | `{reps:'pull-up', 3x8}` + `{hold:'hollow-hold', 3 x 30 s}` | HOUSE HEURISTIC |
| back lever | german hang tolerance | `{hold:'german-hang', 3 x 30 s}` + `{noFlag:'shoulder'}` + `{noFlag:'elbow'}` | C, gate strictness HOUSE HEURISTIC |
| planche | wrist prep plus lean | `{sessions:'wrist-prep', 6 in 21d}` + `{hold:'planche-lean', 3 x 30 s}` + `{noFlag:'wrist'}` | C |
| pistol | ankle range | `{confirmed:'Can you squat all the way down with your heels flat on the floor?', freshDays: 90}` | C PISTOL (heel lift named as the usual limiter) |
| squat depth | same ankle question, softer consequence | route to `heels-elevated` variants rather than blocking | HOUSE HEURISTIC |
| nordic curl | volume ramp | cap at 3x5 for the first 3 sessions regardless of clearance | HOUSE HEURISTIC (high acute soreness) |
| any hold rung | grip is not the limiter | `{hold:'dead-hang', 3 x 30 s}` before any hanging skill rung | C RR-GIST |

### 4.5 What must NEVER be inferred

- Position quality (straight handstand, flat-back lever, chest-to-bar pull height). Ask.
- Pain. R6 owns this and it is never inferred from a missed rep.
- Range of motion in degrees. BodyT has no camera in core scope (post-core fence) and should not pretend.
- "Ready for a skill." Readiness for a handstand is a gate conjunction, not a level label. This is BODYT_STATE
  section 1's "no global beginner/intermediate/advanced label where a domain-specific state matters", applied.

### 4.6 The one honest hole

Every criterion in section 3 that says "clean" or "with good form" is unverifiable by this app. RR-GIST's own
rule is "3 sets of 8 **with good form**", and the form clause is doing as much work as the number. BodyT's
options are: (a) ignore form and promote on reps alone, which over-promotes; (b) ask a one-tap quality question
at the promotion moment, which is what the `confirmed` gate is for; (c) demand video, which is post-core.
**Recommendation: (b), and the promotion copy should carry the uncertainty rather than hide it.**
A suggestion that says "if those last sets were clean, you have earned the next step" is honest and is one tap,
which is exactly the standing suggest-only contract.

---
## 5. EQUIPMENT-CONSTRAINED PATHS

BodyT's `EquipTag` union today has no `rings`, no `parallettes`, no `dip-bars`, no `wall` and no `floor-space`.
Section 3's ladders need four new tags at minimum: `rings`, `dip-bars` (parallel bars, or two solid chairs),
`parallettes` (or two blocks), and `noise-ok` (a constraint, not a possession, see 5.5).

### 5.1 No equipment at all (floor and a wall)

| family | reachable | ceiling |
|---|---|---|
| push-up | rungs 1-10, the whole ladder | none, it goes to one-arm |
| squat / pistol | rungs 1-8, the whole ladder | none |
| handstand | rungs 0-9, whole ladder | needs wall for rungs 5-7 |
| planche | lean > tuck > adv tuck (floor), straddle and full need parallettes for most wrists | wrist, not strength |
| L-sit | rungs 1-5 on the floor | floor L-sit is HARDER than parallettes; many people cannot clear the floor at all |
| hinge | glute bridge > SL bridge > slider curl > nordic (a partner or a fixed edge is needed to anchor the feet) | short by admission, section 3.6 |
| core | full, all three RR-GIST axes | anti-extension tops out without a wheel |
| **vertical pull** | **NOTHING** | this is the hole |
| **horizontal pull** | table rows and towel-in-a-door rows only, and both are unmeasurable and load-limited | |
| dip | bench dip only, and it is the most shoulder-provocative rung in the pack | |

**The vertical pull hole is the defining fact of a no-equipment plan** and BodyT should say so out loud during
onboarding rather than silently building a push-heavy week. `movement.ts` already has `patternImbalances()` with
`IMBALANCE_RATIO = 2` and `IMBALANCE_MIN_SETS = 4`; a no-equipment plan will trip it structurally, forever,
and the correct response is a one-line honest explanation plus a concrete suggestion (a doorway bar is the
cheapest fix in fitness), NOT a silent flag or a fabricated substitute.

Partial mitigations, all tier C consensus and all worse than a bar: `underhand-inverted-row` (have, tagged
"sturdy table or low bar"), towel-around-a-door-handle rows, prone Y-T raises (have), band rows if a band exists.
None of them progress far. **HOUSE HEURISTIC: cap the no-equipment pull ladder at `inverted-row` and mark the
pattern `limited: true` so the imbalance banner explains itself instead of nagging.**

### 5.2 Doorway pull-up bar

Unlocks, immediately: the entire pull-up ladder rungs 1-9, `hanging-leg-raise` (have), `dead-hang` (have),
`toes-to-bar`, the front lever ladder, the bar muscle-up ladder, and `german-hang` (with care).

Does NOT unlock: dips, ring work, support holds, false-grip work.

Three real constraints, tier C consensus, that BodyT should encode rather than ignore:

1. **Chest-to-bar is often geometrically impossible** in a doorframe, because the frame is in the way.
   That directly blocks the MU-PRE chest-to-bar quality gate (4.4). A doorway-bar user gets the muscle-up
   ladder marked as needing a different bar.
2. **Load limits and mounting.** Tension-mounted bars are rated for static bodyweight, not for kipping or
   dynamic muscle-up attempts. **HOUSE HEURISTIC: with `equipment` containing `doorway-bar` and not
   `pullup-bar`, refuse to offer any explosive bar rung (`jumping-muscle-up`, `kipping-muscle-up`) and say why.**
3. **Head clearance.** Many doorways do not allow a full dead hang for taller users, which quietly turns every
   rep into a partial. That is a `confirmed` gate, one question, cached.

### 5.3 Rings

The best single purchase in this whole pack, and worth saying so.

- **Rings turn discrete rungs into a continuous dial.** A ring row's difficulty is a foot position, so
  section 3.7's rungs 1-4 collapse into one movement with an angle. Same for ring push-ups.
  This matters for the engine: a ring exercise progresses by an ANALOGUE parameter, which is a fifth
  `progressionMode` (`'angle'`), or it is modelled as an assisted rung with a numeric assist level.
- Unlocks: `support-hold`, `ring-dip`, `ring-push-up`, `ring-row` at any angle, `false-grip-hang`,
  `ring-muscle-up`, `german-hang` at a controlled height, ring L-sit, ring front lever.
- Costs: every ring rung is one step harder than its fixed-bar equivalent because of the instability. RR-GIST
  puts `ring-dip` AFTER `parallel-bar-dip` for exactly this reason. **The graph must not treat a ring variant as
  a substitute for its fixed counterpart in `substitutesFor()`**, because it is harder, and `substitutesFor()`
  is explicitly documented as never handing back something harder to execute.
- Needs an anchor. A ring user without a doorway bar, a beam or a tree has nothing.

### 5.4 Bands

`homeExercises.ts` already carries the honest note about band loading (resistance climbs as it stretches, so it
is easiest where the muscle is weakest). Extend that reasoning to the skill ladders:

- **Bands as ASSISTANCE are excellent** for pull-up rung 4 and dip rung 4, because the band gives most help at
  the bottom, which is exactly where those movements are hardest. This is the band's ideal use case in the
  whole pack.
- **Bands as ASSISTANCE need a discrete ladder**, not a continuum, because BodyT cannot know a band's actual
  resistance. Model it as `assistLevel: 0..N` per band the user owns, and progress by dropping a level.
  Advance criterion: 3x8 at a level, then drop a level and expect to restart near 3x5.
- **Bands as RESISTANCE** stay where `homeExercises.ts` already puts them: pull-aparts, pressdowns, face pulls,
  rows, good mornings. They do not build a skill ladder.
- Bands for the banded nordic curl (rung 6 of the hinge ladder) are the one place a band assists a LEGS
  movement usefully.

### 5.5 Small apartment with noise limits

This is a constraint, not an equipment shortage, and it is the case BodyT currently has no representation for
at all. `athleticExercises.ts` is full of jumps, bounds, hops and sprints; `MOVEMENT` tags `impact` nowhere
(only `athletic.ts` has an impact axis for the 91 drills).

Becomes impossible or antisocial:

| blocked | why | substitute |
|---|---|---|
| every jump, bound, hop, depth drop, pogo | floor impact, downstairs neighbour | isometric and slow-eccentric squat and calf work; `wall-sit`; long-lever core |
| sprints, stair runs, shuttle work | needs distance | none indoors, reschedule outdoors |
| kipping anything, dropping out of a hang | impact plus mount stress | strict rungs only |
| dropping dumbbells | | lower under control, cue it |
| skipping rope | | |
| any barbell floor work | | |

Stays fully available: the entire push-up ladder, the squat and pistol ladder, handstand rungs 0-4 (5-7 need a
clear wall and a bail path, and a bail IS a noise event), all holds, all mobility, band work, and every isometric
rung in the pack. **A noise-limited apartment is close to the ideal environment for skill and hold work**, which
is a genuinely nice thing for the copy to say instead of listing losses.

**HOUSE HEURISTIC: model this as `constraints: { impact: 'none' | 'low' | 'any', spaceM2?: number, ceilingLow?: boolean }`
on `Prefs`, evaluated in the generator as a filter, and gate it by TIME OF DAY when the user has said so.**
The 10pm case in section 8 needs the time-of-day half; the flat "I live in a flat" case needs only the filter.

Ceiling height matters for exactly two things: overhead pressing for tall users, and the handstand kick-up.
It is one `confirmed` question ("can you reach overhead with straight arms without touching the ceiling?"),
asked once, and it routes handstand work to `chest-to-wall` entries (which need less vertical clearance than a
kick-up) rather than blocking it.

### 5.6 The equipment-conditioned `loadable` fix

`MOVEMENT.loadable` is documented as a property of the MOVEMENT ("has no load lever at all"). Section 3.3 rung 9
breaks that: a pull-up is unloadable with nothing and loadable with a belt, a vest or a dumbbell between the feet.

Proposed, minimal, and additive:

```
loadable: boolean                    // unchanged, the default answer
loadableWith?: EquipTag[]            // NEW: tags that give this movement a load lever
```

`pull-up`, `chin-up`, `dip`, `push-up` (vest), `pistol-squat`, `nordic-curl` all get
`loadableWith: ['weight-belt','vest','dumbbell']`. Everything else keeps today's behaviour exactly. The rep
engine's "top of the range means the next step is load" branch then becomes reachable for a bodyweight athlete
who owns a dumbbell, which is the cheapest possible extension of the ladder and needs no new rungs at all.

---

## 6. WARM-UP AND RAMP-SET ENGINE

BodyT has none. This section is the design, with the evidence for each number and an explicit mark on every
number that is craft rather than evidence.

### 6.1 What the evidence actually supports

**Warming up in general: supported.** FRADKIN-2010 pooled 30 high-quality studies and found performance
improved in 79% of the criteria examined, with harm rare. MCGOWAN-2015 gives the mechanisms (temperature,
metabolic, neural, psychological, including elevated oxygen-uptake kinetics and post-activation potentiation)
and the standard structure, the three-stage **RAMP** model: **R**aise, **A**ctivate and **M**obilise,
**P**otentiate.

**Specific ramp sets: contested, and the disagreement is real.**

| finding | study | says |
|---|---|---|
| a specific warm-up can be SKIPPED at about 10RM loads | ENES-2025, 29 trained participants, crossover, bench and leg press, 4 sets to failure | 1 ramp set and 2 ramp sets both gave negligible to small differences vs no ramp at all, on reps, volume load, fatigue index, readiness and RPE |
| heavier ramp beats lighter ramp | RIBEIRO-2020, 3x6 at 80% 1RM | 1x6 at 80% of the training load gave higher mean propulsive velocity in sets 2-3 than 1x6 at 40%; on bench, a progressive 2x6 at 40% then 80% gave more total work than either single set. 40% alone is not enough |
| heavy conditioning does NOT potentiate multi-set work | SOUZA-2024, 14 trained men, 3 sets of squat to failure at 75% 1RM | 1x3 at 90% vs 1x6 at 45% vs usual warm-up: total reps 21 vs 19 vs 19 (p = 0.17), volume load 1826 vs 1723 vs 1668 kg (p = 0.15). Only set 1 favoured the heavy version |
| potentiation is real but has a narrow window | PAPE-REST meta-analyses | 4-7 min rest is the best window after a HIGH-intensity conditioning activity; 0-1 min is DETRIMENTAL; low and moderate intensity conditioning activities did nothing |

**The honest synthesis, and it is what BodyT should build to:**

1. The general warm-up is the part with the best evidence. Do not skip it.
2. Specific ramp sets matter MORE as the working load gets heavier and the rep target gets lower, and matter
   LESS as the work moves toward 10RM. ENES-2025 and RIBEIRO-2020 do not actually contradict each other:
   ENES tested 10RM work, RIBEIRO tested 80% 1RM work.
3. Ramping with light loads and high reps is the classic error. RIBEIRO-2020 is direct evidence that 40% alone
   is insufficient.
4. A heavy near-max single as a potentiator is a DIFFERENT intervention from a ramp set, it needs 4-7 minutes
   of rest to pay off, and SOUZA-2024 says it does not survive into set 2 and 3 anyway. **BodyT should not
   build PAP protocols into general strength days.** It is a competition-day tool.
5. Nothing in this literature supports more than about 4 ramp sets for any normal working load.

### 6.2 Inputs

```
WarmupRequest {
  // the session
  exercises: ResolvedExercise[]      // already ordered by sequence.ts
  dateISO: ISODate
  kind: 'session' | 'mobility' | 'cardio-backup' | 'rest'
  cns: boolean                       // template flag, already exists

  // per exercise, from prescription.ts
  firstWorkingLoadLb?: number
  workingReps: number
  estimated1RM?: number              // liftSeries() / e1RM(), already computed
  loadable: boolean

  // the athlete
  trainingAgeMonths: number          // the four-tier TrainingAge table already exists
  limitations: Limitation[]          // R6 / J6
  functionalConstraints: string[]    // R6
  goal: Goal
  sessionMinutes: number             // prefs.sessionMinutes, already drives trimToFit

  // context
  priorPatternsToday: MovementPattern[]   // from the exercises ALREADY placed above this one
  readiness?: 'low' | 'normal' | 'high'   // ReadinessSheet already collects this; resolveDay already trims on it
  minutesSinceWaking?: number             // optional, only if known; drives the raise duration
  ambientCold?: boolean                   // optional
  constraints: { impact: 'none'|'low'|'any', ceilingLow?: boolean }
}
```

Everything in that list except `minutesSinceWaking`, `ambientCold` and `constraints` already exists in the repo
today. That is the point: the warm-up engine is mostly a consumer, not a new data requirement.

**Readiness moves the warm-up in the opposite direction to the workout.** `resolveDay` already trims the
session on a low readiness answer. The warm-up should LENGTHEN on a low readiness day (extra raise minutes,
one extra ramp set, lower first ramp percentage) while the work shrinks. **HOUSE HEURISTIC**, and it is the
one place where "do more" is the right answer to feeling bad.

### 6.3 Outputs

```
WarmupPlan {
  raise:      WarmupItem[]    // 3-5 min, general, pulse and temperature
  prep:       WarmupItem[]    // movement prep, targeted at today's patterns and today's flags
  rampSets:   RampSet[]       // per exercise, only for exercises that earn them
  totalMin:   number
  why:        string          // one sentence, no jargon, states the reason
}
RampSet { exerciseId: string; loadLb?: number; reps: number; restSec: number; isLast: boolean }
```

Rendered as `kind: 'warmup'` exercises so `sequence.ts` band 0 puts them first, `volume.ts` scores them 0,
and `transforms.ts` leaves them alone in a deload. **All three rails already exist and are currently unused.**

### 6.4 The raise stage

| input | output |
|---|---|
| default | 3-5 min of easy continuous movement raising the heart rate: `brisk-walk`, `easy-jog`, `bike-erg`, `rowing-erg`, or 3 rounds of a no-impact circuit if `impact: 'none'` |
| `impact: 'none'` (apartment, 10pm) | marching in place, air squats, arm circles, band pull-aparts. No skipping, no jogging |
| cold environment, or first thing in the morning | extend to 8-10 min. HOUSE HEURISTIC; MCGOWAN-2015 supports temperature as a mechanism but gives no minute count for this case |
| `kind: 'mobility'` | 2 min only, the session IS the warm-up |
| time budget under 30 min | 3 min, and the prep stage shrinks first (6.7) |

Tier: structure is MCGOWAN-2015 (RAMP). The 3-5 minute figure is **consensus, widely used, not a specific
finding in the sources captured here.**

### 6.5 The movement prep stage

Selected from today's patterns, not from a fixed list. This is where BodyT's existing graph earns its keep:
`patternLoad(exercises)` already tells you what today is, and `MOVEMENT[id].stress[]` already tells you which
joints are being asked for.

```
for each pattern with sets > 0 in today's session:
    add 1-2 prep items whose `transfer` or joint coverage matches
for each joint in the union of stress[] across today's exercises:
    add 1 preparation item for that joint
for each active limitation:
    add its prescribed prep item, and do NOT add anything that stresses the flagged joint
dedupe, cap at 6 items, cap at 6 minutes
```

Pattern to prep-item map (**HOUSE HEURISTIC in its specifics, standard practice in its content**):

| pattern in today's session | prep items |
|---|---|
| squat, lunge | `ankle-wall-mobilization` (have), `deep-squat-hold` (have) short version, `glute-bridge` (have), leg swings |
| hinge | `glute-bridge` (have), `bird-dog` (have), `band-good-morning` (have) light |
| push-horizontal, push-vertical | `band-pull-apart` (have), `t-spine-opener` (have), scap push-ups, shoulder circles |
| pull-vertical, pull-horizontal | `scapular-pull`, `dead-hang` (have) short, `band-face-pull` (have) |
| any handstand or planche rung | `wrist-prep`, mandatory, 5 min, tier C HS-ROM. This is the one prep item that is a GATE and not a suggestion |
| sprint, jump | see 6.8 |
| carry | grip, `dead-hang` (have) |

**The static stretching rule lives here**, and it is section 7.2.

### 6.6 The ramp-set rule

**HOUSE HEURISTIC in its exact thresholds, built directly on RIBEIRO-2020 and ENES-2025.** Stated as an
algorithm because that is what BodyT needs:

```
rampCountFor(exercise):
  if !loadable                       -> 0 loaded ramps; use ONE easier rung for 5 reps instead (6.9)
  if role is 'isolation' | 'prehab'  -> 0
  if this pattern already had a ramped exercise today -> at most 1
  if workingReps >= 10               -> 1        // ENES-2025: at ~10RM the specific warm-up is near-worthless
  if workingReps in 6..9             -> 2
  if workingReps in 3..5             -> 3
  if workingReps <= 2                -> 4
  +1 if trainingAgeMonths < 6        // a novice benefits from rehearsal reps, not from potentiation
  +1 if this is the FIRST exercise of the session
  cap at 4
```

Load and rep ladder for N ramp sets, as a fraction of the first working load, **HOUSE HEURISTIC on the exact
percentages**, anchored on RIBEIRO-2020's finding that 40% alone is insufficient and 80% works:

| N | ramp 1 | ramp 2 | ramp 3 | ramp 4 |
|---|---|---|---|---|
| 1 | 75% x 4 | | | |
| 2 | 50% x 6 | 80% x 3 | | |
| 3 | 45% x 6 | 65% x 4 | 85% x 2 | |
| 4 | 40% x 6 | 60% x 4 | 75% x 3 | 90% x 1 |

Rest between ramp sets: 45-60 s for ramps below 70%, 90-120 s for the last ramp before the first working set.
**HOUSE HEURISTIC.** PAPE-REST's 4-7 minute window is deliberately NOT used here: that window belongs to a
potentiation protocol, and waiting 5 minutes after a warm-up set is a different (and much longer) session.

Rounding: to the nearest available increment from `loadStepLb()` and the user's actual dumbbell set, never
below the empty implement.

### 6.7 Not warming up into fatigue

Six rules, all **HOUSE HEURISTIC**, and all of them are the difference between a warm-up and a workout.
`homeExercises.ts` and the `dynamic-warmup` catalog entry already carry "turning the warm-up into a workout"
as a listed mistake, so the app already believes this; it just cannot act on it.

1. **Total ramp reps budget: 15 per exercise, 30 per session.** Cross it and cut the lowest ramp set.
2. **No ramp set within 4 reps of failure.** Reps come DOWN as load goes up, never the reverse. The classic
   error named in the coaching literature is multiple sets of 8-12 with a light weight.
3. **One ramp ladder per pattern per day.** The second press of a push day inherits the first press's warm-up
   and gets at most one ramp set. This is `priorPatternsToday`, and it is exactly the input that makes the
   engine session-aware rather than exercise-aware.
4. **Ramp sets are `light: true`.** They must never become a baseline. This is the existing load-provenance
   rule that killed the load-spiral bug family, and it applies verbatim.
5. **Ramp sets score 0 volume.** `volume.ts` already returns 0 for `warmup` kind. Preserve that by emitting
   ramps as `kind: 'warmup'`.
6. **The time budget cuts prep before it cuts ramps, and cuts the raise last.** A 30-minute session gets a
   3-minute raise, 2 prep items and full ramps on the first lift only. Losing the ramp on a heavy first lift is
   the worst available cut; losing three mobility drills is the cheapest. **HOUSE HEURISTIC, and it inverts
   what most apps do.**

### 6.8 Modality cases

| modality | raise | prep | potentiate | notes |
|---|---|---|---|---|
| **heavy compound** (working reps <= 5) | 5 min | pattern prep for the lift, 3-4 items | 3-4 ramp sets per 6.6 | the case the table above is built for |
| **hypertrophy** (working reps 8-12) | 3-5 min | 2-3 items | 1 ramp set, and it is honestly optional (ENES-2025) | say the ramp is optional rather than pretending it is essential |
| **power / plyometric** | 5-8 min | ankle, hip, landing prep | LOW-VOLUME, high-quality: 2-3 submaximal jumps at ascending intent, full recovery. NEVER to fatigue | `athleticCoverage.ts` already carries the "never on tired legs" warning for top-speed work; plyos deserve the same. Depth drops and depth jumps must be gated behind the landing rungs |
| **sprint** | 8-10 min, the longest warm-up in the app | A-march, A-skip, wall drive (all already in `athleticExercises.ts`), leg swings, ankle prep | 3-5 build-up runs at ascending percentage (roughly 60, 70, 80, 90, 95% of top speed) with full walk-back recovery | `athleticCoverage.ts` line 322 already says top-speed running is the highest-force thing most people do and must never happen without a full warm-up. That warning currently has no engine behind it |
| **conditioning / easy cardio** | 3-5 min of the same modality at a lower intensity | 0-2 items | none | the warm-up IS the first 5 minutes of the run |
| **mobility session** | 2 min | none, the session is prep | none | this is the one modality where a longer static hold is appropriate (7.4) |
| **bodyweight / skill day** | 3-5 min | wrist prep if any handstand or planche rung is present (mandatory), scap and shoulder prep otherwise | one set of the rung BELOW today's rung, 5 reps, plus one set of today's rung at 50% of the target reps | 6.9 |

### 6.9 Ramping an unloaded movement

The case BodyT hits constantly and the loaded ramp table cannot serve. There is no percentage to take of a
push-up. **HOUSE HEURISTIC, built by analogy on the same principle (approach the working difficulty from below,
in descending reps):**

```
ramp for an unloaded rung R with target reps T:
  set 1: the rung one step BELOW R (regressions[0]), 5 reps
  set 2: R itself, ceil(T/2) reps, stopping well short
  then the first working set
  if R is a HOLD rung: set 1 = the rung below, 15 s; set 2 = R for 5 s
  if R has no regression (a floor rung): one set of R at ceil(T/2) only
```

For skill rungs this is not a ramp at all, it is the first practice set, and it should be labelled as practice.

---
## 7. MOBILITY AND STRETCHING

### 7.1 The four modalities, classified by what they are FOR

| modality | purpose it actually serves | when | target | dose | evidence |
|---|---|---|---|---|---|
| **dynamic** | raise temperature, rehearse the pattern, get acute ROM without a force cost | before anything | today's patterns and joints | 5-10 movements, 8-12 reps or 20-30 s each, 3-6 min total | BEHM-2016: dynamic stretching averaged **+1.3%** on performance where static averaged -3.7%. BEHM-2023: acute ROM gain from dynamic is statistically indistinguishable from static (ES -0.447 vs -0.570, p = 0.72). Dynamic gets the same range for none of the cost |
| **static** | long-term range at a joint that genuinely lacks it | AWAY from lifting, or after it, or on its own day | one or two specific restrictions, not a whole-body tour | THOMAS-2018: **at least 5 min per week per muscle group**, spread over **at least 5 days a week**; per-session duration did not matter, weekly total did | THOMAS-2018 for the dose. BEHM-2023 found no acute duration or intensity relationship, which is consistent with "the weekly total is the thing" |
| **PNF** (contract-relax) | same as static, sometimes faster acutely | same as static | same | typically 3-5 cycles of 5-10 s contract, 20-30 s relax. Dose figure is **consensus, not from a source captured here** | BEHM-2023: acute ROM ES -0.581, no better than static or dynamic (p = 0.72). BEHM-2016: acute performance cost -4.4%, the WORST of the three. THOMAS-2018: chronically, static beat PNF and ballistic (p < 0.05) |
| **loaded mobility** (full-ROM strength work, and stretch-loaded lifts) | range you can produce force in, plus strength, in one exposure | it IS the training | whatever the lift trains | it is the working sets | DELPHI-2025 states consensus that stretching improves ROM "although alternatives exist", which is the polite version of this. **BodyT already models it**: `MOVEMENT.stretchLoaded` is on 20+ entries and is currently read only for substitution scoring |

**The headline that follows: for most users, most of the time, the mobility answer is a dynamic warm-up plus
full-range lifting, and static stretching is a targeted tool for a specific restriction, not a daily tax.**
That is a defensible reading of DELPHI-2025 and it is also the position that costs the user the least time.

### 7.2 The pre-lifting static stretching rule

**The rule, in the form BodyT should encode:**

> Do not prescribe static stretching of a muscle immediately before that muscle's heavy working sets.
> Any static stretching in a warm-up must be under 60 seconds per muscle, must not target today's prime
> movers at long duration, and must be followed by dynamic activity before the first working set.

The evidence, and it is a dose-response story, not a prohibition:

| dose per muscle | effect on strength / power | source |
|---|---|---|
| < 45 s | usable in a warm-up without significant risk | KAY-2012 |
| < 60 s per bout | ES = **-0.18** (trivial), or **-1.1%** | WARNEKE-2024, BEHM-2016 |
| >= 60 s per bout | ES = **-0.84** (large), or **-4.6%**, or **-7.5%** on average across 106 studies | WARNEKE-2024, BEHM-2016, KAY-2012 |
| session volume > 480 s total | ES = **-0.46** | WARNEKE-2024 |
| session volume <= 480 s | not significant | WARNEKE-2024 |

Three qualifiers that matter and that a lazy version of this rule gets wrong:

1. **The deficit shows up on isolated maximal strength tests, not on athletic performance tests.**
   WARNEKE-2024 found no impairment in athletic performance overall, and a small POSITIVE effect on jumping in
   adults (ES = +0.15, p = 0.006). The cost is most real for the thing BodyT actually programs (heavy sets),
   which is why the rule survives, but the copy must not claim stretching ruins your workout.
2. **A subsequent active warm-up counteracts it.** Both WARNEKE-2024 and BEHM-2016 say so explicitly.
   That is why the rule is about ORDER, not about banning. Static stretch then dynamic work then lift is fine.
3. **Blanket avoidance is not supported.** WARNEKE-2024's own words are that rigorous avoidance of any type of
   stretching before performance "seems to be without evidence". BEHM-2016 goes further and RECOMMENDS
   stretching inside a warm-up that includes post-stretch dynamic activity, for injury reduction and ROM,
   with inconsequential performance cost.

**Implementation in BodyT: a `staticStretchBudget` on the prep stage.** Default 0 seconds on the prime movers
of today's session, up to 30 seconds per muscle elsewhere, hard cap 480 s across the whole warm-up, and always
at least one dynamic item AFTER any static item. All three thresholds come from the table above; the choice of
zero on prime movers is **HOUSE HEURISTIC**, on the reasoning that the benefit is a general one and the cost is
concentrated exactly there.

### 7.3 Foam rolling: small, real, and cheap

WIEWELHOVE-2019, 21 studies:

| use | effect | magnitude |
|---|---|---|
| BEFORE training | flexibility +4.0% (g = 0.34), sprint +0.7% (g = 0.28) | small but positive |
| BEFORE training | jump -1.9% (g = 0.09), strength +1.8% (g = 0.12) | negligible either way |
| AFTER training | sprint decrement attenuated +3.1% (g = 0.34), strength +3.9% (g = 0.21) | small |
| AFTER training | muscle pain perception +6.0% (g = 0.47) | the largest single effect in the paper |

**The useful reading: foam rolling is the one pre-training modality that buys acute range with no measurable
strength cost, and its best-supported use is post-training for soreness.** That makes it the correct thing to
offer a user who says they feel stiff before a heavy day, and the correct thing to offer after a hard one.
`adapt.ts` line 226 currently notes there was no evidence base for prescribing foam rolling. There is now,
it is small, and it should be presented as small.

### 7.4 What a daily mobility prescription should actually contain, and for whom

**The honest default for most users is: nothing daily.** THOMAS-2018's dose is 5 minutes per week per muscle
group over at least 5 days, which is 1 minute a day per targeted muscle, and the whole point is that it should
be TARGETED. A generic seven-item daily mobility routine for a user with no restriction is time spent on a
problem they do not have. BodyT's current fixed `mobility` day template (7 identical entries for every user) is
exactly that.

Who should get one, and what:

| user | prescription | dose | why |
|---|---|---|---|
| no identified restriction | none. Full-range lifting plus the dynamic warm-up | 0 extra | DELPHI-2025 alternatives-exist consensus |
| a named restriction (cannot squat to depth without heels lifting, cannot reach overhead) | the 2 muscle groups implicated, static or PNF | 5 min/wk each, 5+ days/wk, so about 1 min/day each | THOMAS-2018 |
| handstand or planche work in the plan | `wrist-prep`, 5 min, EVERY handstand session | 5 min per session, mandatory | C HS-ROM, GMB-HS |
| a desk job and a stiffness complaint | movement snacks, dynamic, not static holds | 2-3 min, 2-3x/day | consensus, no captured source, HOUSE HEURISTIC |
| in-season athlete or a sore day | foam rolling post-session | 60-90 s per area | WIEWELHOVE-2019 |
| an injury or a red flag | R6 owns this. Mobility work is not a treatment | | source R6 |

**Three things a mobility prescription must NOT claim**, all DELPHI-2025 consensus at >80% agreement:
stretching does not substantively build muscle, is not an all-encompassing injury prevention strategy, and
does not improve posture. BodyT's copy currently has no claims to fix here, and it must not acquire any.

### 7.5 Does stretching prevent injury? Preserved disagreement

| position | evidence | strength |
|---|---|---|
| **No, or not usefully** | LAUERSEN-2014: 25 RCTs, 26,610 participants, 3,464 injuries. Strength training was the strongest single intervention; proprioception RR about 0.55 (0.35-0.87); overuse RR 0.527 (0.373-0.746). Stretching showed no significant protective effect | large, most cited |
| **No, as a general strategy** | DELPHI-2025: expert consensus that stretch training does not serve as an all-encompassing injury prevention strategy | consensus statement, >80% agreement |
| **Yes, for muscle injuries specifically** | SSH-2024: static stretching intervention reduced MUSCLE injuries, OR 0.37 (0.16-0.85, p < 0.01) | only 4 RCTs of 5,575 screened, and a published Comment exists (Springer 2025), so it is contested |
| **Yes, inside a warm-up followed by dynamic work** | BEHM-2016 explicitly recommends this for reducing muscle injuries | systematic review, recommendation rather than pooled RR |

**BodyT's position should be:** never promise injury prevention from stretching. Do offer it for range.
Do point out, when a user asks how to avoid getting hurt, that the intervention with the best evidence is
strength training itself (LAUERSEN-2014), which the app is already selling them.

### 7.6 The honest verdict on cool-downs

VANHOOREN-2018 is a narrative review, not a meta-analysis, and it is the most complete synthesis available.
Its findings, plainly:

- Active cool-down is **largely ineffective for improving most psychophysiological markers of recovery**.
- **Same-day performance** (more than 4 h later): trivial to small NEGATIVE non-significant effects on
  anaerobic measures.
- **Next-day performance**: mixed, mostly trivial, occasionally small-to-moderate benefit.
- **DOMS**: most studies in both recreational and professional athletes found no significant effect.
- **Damage markers** (creatine kinase and similar): conflicting.
- **Injury rates**: a cool-down generally does not affect them.
- **Long-term adaptation**: preliminary evidence says a regular active cool-down does not blunt it, which is
  reassurance rather than a benefit.
- **Psychological recovery**: no substantial influence, though most participants PERCEIVE benefit, which the
  authors flag as possibly placebo.
- What it does do: faster blood lactate clearance (practical relevance questionable), faster cardiorespiratory
  normalisation, partial immune protection immediately post-exercise.

**So the verdict BodyT should ship: a cool-down is optional, it is mostly for how you feel, and that is a fine
reason to do it.** The perceived-benefit finding is not nothing for an adherence-driven app; it is just not a
physiological claim.

If offered, follow the authors' own four criteria verbatim in substance: dynamic activity, low to moderate
intensity, low mechanical impact, under about 30 minutes, and an exercise the person likes.

**What BodyT should NOT do:** schedule a mandatory cool-down, count it as training, claim it prevents soreness,
claim it prevents injury, or let it eat the time budget ahead of the warm-up. The warm-up has FRADKIN-2010
behind it (79% of criteria improved). The cool-down has a narrative review saying "largely ineffective".
They are not the same bet and the app should not spend the same minutes on them.

**One genuine use case, and it is a good one:** the cool-down is the natural slot for the static stretching that
7.2 pushed OUT of the warm-up. The muscle is warm, the acute force deficit no longer matters because there is no
more lifting, and THOMAS-2018's weekly minutes have to happen somewhere. **HOUSE HEURISTIC, but it resolves
two problems with one slot.**

---
## 8. EVAL FIXTURES

Table-test shaped, in the style of R1's 14 cases and R6's 28. Every one is a case a future session can turn
into a failing test before writing the feature. "Expect" is behaviour, not copy.

| # | fixture | given | expect | why / source |
|---|---|---|---|---|
| 1 | **Cannot do one push-up** | new user, `plan.equipment = ['none']`, no push history, goal general fitness | prescribe `incline-push-up` at a HIGH surface (or `wall-push-up`), 3x5, NOT `push-up` at 3x8. Warm-up = 3 min raise + 2 prep items, ramp = one set of the rung below at 5 reps (6.9). No promotion offer for at least 4 logged sessions | RR-GIST selection rule: pick the rung you can do 5 but not 8 of. Exposure gate 4.2 |
| 2 | **Stuck at 5 pull-ups** | 14 logged pull-up sessions over 9 weeks, best set 5, 5, 4, 5, 5; no equipment beyond a bar | do NOT offer a harder rung (5 < 8). DO offer volume and density changes and `negative-pull-up` as a supplementary rung, and say the plateau is being watched. At the 16-week phase boundary, `verdictFor` reads the rep-max series, sees no +2 gain, returns `stalled`, and the anchor holds | `phase.ts` `REP_GAIN_TO_PROMOTE = 2`; RR-GIST 3x8 gate. This is the case J2 measures correctly and currently cannot act on |
| 3 | **Handstand with limited shoulder ROM** | user asks for handstand work; the supine shoulder-flexion `confirmed` gate answers "no" | do NOT block handstand work. Route to `elevated-l-stand` and box-supported rungs, add a thoracic and lat mobility block to the daily prescription, skip `chest-to-wall` rungs, re-ask the gate in 30 days. `wrist-prep` still mandatory | HS-ROM: 170-180 deg needed; the deficit causes the banana handstand and loads the wrist. Reroute rather than refuse is HOUSE HEURISTIC |
| 4 | **Small apartment, 10pm** | `constraints.impact = 'none'`, local time 22:00, plan day is `power` (box jumps, falling-start sprints) | swap every jump and sprint for a non-impact equivalent, or offer to move the day. Raise stage becomes marching and air squats, no skipping, no jogging. Banner states the reason. Nothing auto-applies | 5.5. Suggest-only is the standing constraint |
| 5 | **Heavy squat day needing ramp sets** | first working set 185 lb x 5, `trainingAgeMonths = 30`, first exercise of the session, squat pattern not yet trained today | 3 ramp sets: 85 lb x 6, 120 lb x 4, 155 lb x 2, rounded to the available increment, rests 60 / 60 / 120 s, all `light: true`, all `kind: 'warmup'`, 12 ramp reps total | 6.6 table for N = 3 at 45/65/85%; RIBEIRO-2020 (80% works, 40% alone does not) |
| 6 | **Sprint session needing movement prep** | `speed` template, `cns: true`, outdoors | 8-10 min raise, A-march / A-skip / wall drive (all already in the catalog), then 3-5 build-ups at ascending percentage with full walk-back. Refuse to shorten below 8 min even under a tight `sessionMinutes`; cut a lift instead | `athleticCoverage.ts` already warns top-speed work must never happen without a full warm-up; the refusal-to-shorten is HOUSE HEURISTIC and follows from that warning |
| 7 | **Mobility-only day** | `template.kind = 'mobility'` | 2 min raise, no ramps, no volume score, untouched by deload. The session content should be selected from the user's ACTUAL restrictions, not the current fixed 7-item list. A user with no restriction gets a short session and is told why it is short | 7.4; `transforms.ts` already exempts mobility from deload |
| 8 | **Wrist limitation, plank progression** | active limitation naming `wrist`; plan contains `plank-side-plank` and a push-up rung | offer forearm variants of every wrist-loaded rung, exclude `wrist-prep`-gated families (handstand, planche, pseudo-planche) entirely, and route push-ups to a fist or handle variant. Do NOT silently drop the pattern | R6 routing plus `MOVEMENT.stress` already carrying `wrist` on push-up, incline push-up, decline, archer, diamond, pike |
| 9 | **Hypertrophy day, 10RM work** | first working set at a 10-12 rep target, second exercise of the session | ONE ramp set, and the copy says it is optional | ENES-2025: specific warm-up negligible at about 10RM |
| 10 | **Second press of a push day** | `incline-db-press` already ramped and completed; `flat-db-press` is next, same pattern | at most 1 ramp set on the second press | 6.7 rule 3, `priorPatternsToday` |
| 11 | **25 minute time budget** | `prefs.sessionMinutes = 25`, heavy lower day | cut prep items first (down to 2), keep the 3 min raise, keep full ramps on the first lift only. Never cut the raise to zero | 6.7 rule 6, HOUSE HEURISTIC and deliberately inverted from common practice |
| 12 | **Bodyweight athlete clears 3x8 push-ups** | week 6 of phase 1, `push-up` logged at 8/8/8 clean, 5 prior sessions in 5 weeks, none `light` | offer promotion to `decline-push-up` NOW, in block, with a one-tap confirm and a form question. Do not make them wait for week 17 | 3.1; today `phase.ts` is the only promotion path and phase 1 returns `base` unchanged |
| 13 | **Pull-up athlete at 15 reps with a dumbbell** | `pull-up` rep-max series at 15, `plan.equipment` includes `dumbbell` | offer `weighted-pull-up`; `loadableWith` makes the load lever reachable and double progression resumes on weight | 5.6, 3.3 rung 9. Today `loadable: false` makes this unreachable and `nextUp` returns null |
| 14 | **Muscle-up requested at 6 pull-ups** | user asks for a muscle-up; best pull-up set 6, no dip history | refuse the rung, show the three gates and the current numbers against them, and offer the pull-up and dip ladders as the route. State the honest timeline | MU-PRE: 10 strict pull-ups, 15 dips, 5 s top hold; 8-12 weeks from an 8-pull-up baseline |
| 15 | **Front lever rung** | `tuck-front-lever` logged at 3 x 15 s | offer `advanced-tuck-front-lever`, and say in one sentence that 15 s is a convention and sources range from 10 to 60 | 3.11, disagreement preserved per the standing rule |
| 16 | **No-equipment user, push/pull imbalance** | `plan.equipment = ['none']`, week of 12 push sets and 3 pull sets | `patternImbalances()` fires. The banner must EXPLAIN the structural cause and name the cheapest fix once, then stop repeating | 5.1; `IMBALANCE_RATIO = 2`, `IMBALANCE_MIN_SETS = 4` already exist |
| 17 | **Shoulder flag plus dip family** | active shoulder limitation, dip in the plan | remove every dip rung including `bench-dip`, do not merely reduce depth. `substitutesFor` should find a horizontal push that does not stress the shoulder, and if none exists, say so | 3.4 safety note; `substitutesFor` already filters on `stress` |
| 18 | **Static stretch requested before a heavy day** | user asks to add hamstring stretching; today is heavy squats | accept, but place it in the cool-down slot, not the warm-up, and explain in one sentence. If they insist on pre-session, cap it under 60 s per muscle and follow it with a dynamic item | 7.2; WARNEKE-2024 dose response and the follow-with-dynamic finding |
| 19 | **Cool-down requested** | user asks whether to cool down | offer it, describe it honestly as optional and mostly about how you feel, follow the four criteria (dynamic, low to moderate, low impact, under 30 min, preferred exercise). Never claim it prevents soreness or injury | VANHOOREN-2018 |
| 20 | **First nordic curl exposure** | hinge ladder promotes to `nordic-curl` | cap at 3x5 for the first three sessions regardless of clearance, and warn about next-day soreness | HOUSE HEURISTIC, high acute soreness cost |
| 21 | **Return after 90 days away** | last pull-up session 92 days ago at 8 reps | `reps.ts` already restarts at the bottom of the range and hands back load steps. The skill layer must ALSO drop one rung, not just reduce reps, and the warm-up must lengthen | `STALE_DAYS = 21`, `LAYOFF_STEP_DAYS = 28`, `MAX_STALE_STEPS = 3` exist; the rung drop is new and HOUSE HEURISTIC |
| 22 | **Doorway bar plus muscle-up** | equipment includes `doorway-bar`, not `pullup-bar`; muscle-up gates otherwise passed | refuse the explosive rungs and say why (mount rating, and the doorframe blocks chest-to-bar). Offer the strict ladder and the negatives | 5.2, HOUSE HEURISTIC on the refusal |
| 23 | **Foam roller before a heavy day** | user reports feeling stiff, owns a roller | offer 60-90 s per area, framed as a small effect: some extra range, no strength cost | WIEWELHOVE-2019: pre-rolling flexibility +4.0% (g = 0.34), strength effect negligible |
| 24 | **Rings substituted for a fixed bar** | user acquires rings; `ring-dip` and `parallel-bar-dip` both exist | `substitutesFor('parallel-bar-dip')` must NOT return `ring-dip`, because rings are harder and substitution never hands back something harder | `substitutesFor` docstring is explicit about this; 5.3 |
| 25 | **Skill day inside a normal week** | handstand practice scheduled alongside a heavy lower day | handstand practice goes FIRST, after the warm-up, before anything fatiguing, and is capped at 15-20 min. It must not be trimmed by `trimToFit` as if it were accessory volume | LOW-FUND session order; GMB-HS dose; `volume.ts` scores skill work as it does mobility, at 0 |
| 26 | **Promotion offered on an unclean set** | 3x8 logged but the user answers "no" to the form question | hold the rung, log the answer, do not re-ask for at least 2 sessions, and do not treat the decline as a failure | 4.6; suggest-only, and BODYT_STATE's rule that interventions carry follow-up |

---

## 9. INTEGRATION NOTES

### 9.1 The size wall (deal with this first)

`structure.test.ts` sets `HARD_MAX = 600` lines and states plainly that nothing new may join the oversize
allowlist. Current sizes: `plan/movement.ts` 487, `plan/homeExercises.ts` 547, `plan/exercises.ts` 1836 against
an allowance of **1840**, which is four lines of headroom, and allowlisted files may not grow.

**Therefore section 3's roughly 94 rungs cannot go into any existing file.** The shape that fits the repo's
own conventions (gym and home catalogs already live in their own modules and are spread into the main one):

```
plan/skillMovement.ts     // MovementMeta entries for the new rungs, spread into MOVEMENT
plan/skillExercises.ts    // ExerciseDef entries (steps, why, mistakes, cue), spread into the catalog
plan/skillGates.ts        // the Gate table from section 4
engine/warmup.ts          // raise + prep + the pure rampSetsFor() function
```

Each must land under 600 lines, which for roughly 94 rungs means `skillExercises.ts` will itself need splitting
by family (`skillPush.ts`, `skillPull.ts`, `skillHold.ts`) since each `ExerciseDef` runs 20+ lines. Budget this
before writing, not after. And the two wiring lines in `plan/exercises.ts` consume half its remaining headroom.

### 9.2 Extending MOVEMENT without breaking `substitutesFor` or the golden snapshot

**The real risk, stated precisely.** `substitutesFor()` iterates all of `MOVEMENT`, filtered by pattern, skill,
fatigue, stress and equipment. `adapt.ts` calls it at three live sites, and `adaptSession()` runs inside
`resolveDay` for every `session` day. So adding entries to `MOVEMENT` can change what a session substitutes,
which changes `golden.test.ts` (16 weeks) and `goldenLife.test.ts` (8 weeks). New rungs are mostly
skill-0 and skill-1 unloaded movements in the same patterns as existing lifts, which is exactly the profile
that scores WELL in the substitution ranking. This will move the golden snapshot unless it is handled.

Three mitigations, in order of preference:

1. **A `catalog` discriminator.** Give every new rung `catalog: 'skill'` and have `substitutesFor` default to
   `catalog: 'strength'` only, with an opt-in query flag. One field, one filter line, zero behaviour change for
   existing ids. This is the recommendation.
2. **Equipment gating.** Rungs needing `rings`, `dip-bars`, `parallettes` are already invisible to users who do
   not own them, because `canDo` filters them. That covers the ring and dip families but NOT the push-up,
   squat, handstand or lever floor rungs, which need nothing.
3. **Skill ceilings.** `substitutesFor` never returns something above `maxSkill`, which defaults to
   `max(meta.skill, 1)`. Tagging lever and planche rungs skill 3 keeps them out of most substitution results,
   but it does not help for `wall-push-up` (skill 0) which would become a candidate substitute for a
   dumbbell bench press.

**Existing invariants the new rungs must satisfy** (all already enforced in `movement.test.ts`, so they will
fail loudly, which is good):

- a regression never raises `skill` or `level`;
- a progression satisfies `RANK[level] + skill` non-decreasing;
- **every regression AND progression edge stays inside the same `pattern`.** This is the one that bites hardest.
  A muscle-up cannot be a `progressions` entry on `pull-up`, because the muscle-up is not purely `pull-vertical`.
  **Model the muscle-up as its own root with the pull-up requirement expressed as a GATE, not as a graph edge.**
  Same for anything that crosses patterns.
- `movementChain` must not repeat an id.

**Two new patterns are probably needed**: a hold/skill pattern for handstand, L-sit, lever and planche holds
(reusing `brace` is defensible and cheaper). Whatever is chosen, `patternLoad()` must skip it the way it
already skips `mobility` and `conditioning`, or push/pull imbalance maths will be polluted by holds.

**`movementChain` caps at 4 back and 4 forward.** A 9-rung ladder renders fully only from its middle.
Either raise the cap or make it a parameter; note that raising it changes UI output for existing chains,
so snapshot it first.

### 9.3 Where the warm-up engine sits in the `resolveDay` pipeline

The pipeline today, in order: template selection, life events, ball rules, readiness trim, conditioning stack,
`orderSession` + `capAccessorySets`, `applyWeekRamp`, `trimToFit` (volume cap), `adaptSession` + re-order,
rep collapse via `repLabel`, cardio append.

**Split the warm-up in two, because loads live in a different layer.**

| piece | layer | where | why |
|---|---|---|---|
| raise + movement prep | `engine/warmup.ts`, pure | inside `resolveDay`, AFTER `adaptSession` and its re-order, BEFORE the rep collapse | prep must target the movements ACTUALLY being done, which is only settled after adaptation and after the volume cap. Emitting before the rep collapse keeps every exercise going through the same label path |
| ramp sets | `engine/warmup.ts` exports a pure `rampSetsFor(firstWorkingLoadLb, workingReps, opts)`; `logic/prescription.ts` calls it | at session start, in the logic layer | `resolveDay` is pure and has no store access; the first working load comes from `prefillFor`, which reads the store. Engine stays pure, logic wires. This is the layering rule (plan > engine/store > logic > screens) satisfied without an upward import |

Prepending is enough for ordering: `sequence.ts` `band()` already returns 0 for `kind: 'warmup'`, and
`orderSession` is stable, so warm-up items sort first without a second sort pass. `volume.ts` already scores
`warmup: 0`. `transforms.ts` `UNTOUCHED_BY_DELOAD` already contains `warmup`. `focus.ts` already estimates
20 s per warm-up set. **Four rails exist and are unused; use them rather than adding a parallel concept.**

One ordering trap: `trimToFit` runs BEFORE the warm-up would be inserted, so the warm-up's minutes are not in
the trim maths. Either insert the warm-up before `trimToFit` and teach `trimToFit` to never cut band 0, or
reserve the warm-up's estimated minutes from `prefs.sessionMinutes` before trimming. **The second is simpler
and matches 6.7 rule 6.**

### 9.4 What J2's phase logic needs from the new criteria

1. **A hold series.** `verdictFor` has a loaded branch (`liftSeries`) and a rep branch (`repMaxSeries`).
   Hold rungs need a third: `holdMaxSeries(data, exerciseId)` in `engine/stats.ts`, reading seconds out of
   `targetReps` / `achieved`. `parseRepRange` already tolerates "40-60 sec", so the plan side is ready;
   the stats side is not. Promotion floor by analogy with `REP_GAIN_TO_PROMOTE = 2`:
   **HOUSE HEURISTIC, +5 seconds or +5%, whichever is larger.**
2. **`nextUp` must not double-promote.** Once an in-block 3x8 promotion exists (3.1), a slot may already have
   moved up during the phase. `phase.ts` reads `plan.slots[1][slot]` as the phase-1 baseline; if in-block
   promotions are recorded anywhere else, the two clocks will fight. **Cleanest: in-block promotions rewrite the
   booklet slot through the existing `bookletOps` path with a diff for approval (the J5 shape), so `phase.ts`
   keeps seeing one source of truth.**
3. **`nextUp`'s one-skill-level rule needs the new rungs to be sanely levelled.** With 9 rungs and 4 skill
   values, most edges are skill delta 0, which passes. The rungs that should be hard stops
   (`freestanding-hspu`, `full-planche`) get skill 3 and will be refused from a skill-1 predecessor, which is
   the desired behaviour.
4. **`ANCHOR_SLOTS` has no vertical-pull, vertical-push or core slot.** `['squatVariation','press1',
   'rowVariation','hamstring']` means a pull-up, a pike push-up and a hollow hold are never phase-judged at all,
   however deep their ladders get. Either add anchor slots or give skill work its own slot type. This is a
   `PlanConfig` change and needs coordinating in BODYT_STATE section 4 alongside any `SCHEMA_VERSION` change.
5. **`loadableWith` (5.6)** is the smallest change with the biggest reach: it makes the existing
   double-progression load branch reachable for pull-ups and dips without adding a single rung.

### 9.5 Guard tests to write FIRST, before any rung exists

BODYT_STATE section 6: prove every new guard bites by feeding it a known-bad input and watching it fail.

1. **`substitutesFor` full snapshot.** Every id in `MOVEMENT`, under three fixed equipment profiles (none /
   home / full gym), snapshotted. Plant one new skill rung and watch the snapshot move. This is the test that
   protects the golden lock from the whole of section 3. Write it before touching `MOVEMENT`.
2. **`movementChain` snapshot** for every id, same reasoning.
3. **Graph integrity**: every `progressions` and `regressions` target exists in `MOVEMENT`; no cycles; every
   rung is reachable from at least one root; no rung is orphaned (currently 59 movements have chain length 1,
   so this test must start as an allowlist that shrinks, matching the dead-export guard's proven pattern).
4. **Gate refusal tests**, one per gate in section 4, each with a known-bad fixture: muscle-up at 6 pull-ups
   refuses, handstand with a failed shoulder gate reroutes rather than blocks, dip with a shoulder flag
   disappears entirely, planche without `wrist-prep` exposure refuses.
5. **Warm-up invariants**, as one property test over generated sessions:
   ramp loads strictly ascending and all strictly below the first working load; ramp reps strictly descending;
   total ramp reps <= 15 per exercise and <= 30 per session; every ramp set carries `light: true` and
   `kind: 'warmup'`; no warm-up item stresses a joint the user has flagged; `volume.ts` score of the warm-up
   is exactly 0; one ramp ladder per pattern per session.
6. **Static stretch budget**: 0 seconds on today's prime movers, <= 480 s total across the warm-up, and at
   least one dynamic item after any static item. Feed it a warm-up with a 90 s hamstring hold before heavy
   squats and watch it fail.
7. **Time budget**: at `sessionMinutes = 25`, prep is cut before ramps and the raise survives.
   At `sessionMinutes = 90`, nothing is cut.
8. **Sprint refusal**: a `cns: true` sprint day cannot produce a warm-up under 8 minutes, even under a tight
   time budget.
9. **Skill ordering**: skill practice always lands before the first strength exercise, and `trimToFit` never
   removes it.
10. **`goldenLife.test.ts` extension**: a second persona, bodyweight-only with a doorway bar, run 8 deterministic
    weeks and snapshotted, so the skill ladders get the same tripwire the minimal-equipment persona already has.

### 9.6 Sequencing recommendation

The pack decomposes into four jobs of roughly equal size, and the order matters:

1. **Guards first** (9.5 items 1-3). Nothing else is safe without them, and they are cheap.
2. **`loadableWith` plus the pull-up and dip ladders.** Highest value per line: it directly unblocks the
   `topped-out` collapse J2 exposed, and it needs no new patterns, no new equipment tags beyond `dip-bars`,
   and no skill-mode machinery.
3. **The warm-up and ramp engine.** Independent of the ladders, uses four existing unused rails, and it is the
   larger user-visible win of the two halves of this pack.
4. **Skill mode, holds and gates** (handstand, L-sit, levers, planche). The biggest and the one with the most
   new machinery (`progressionMode`, `holdMaxSeries`, the `confirmed` gate, a new pattern, anchor slots).
   Do it last, when the guards have been proven by the three jobs before it.

Sections 3 and 4 are also where an R-job most easily becomes shelfware. **Every rung added must be reachable by
a real generated plan for at least one persona in the 20x20 harness, or it should not be added.**
That is the owner rule from BODYT_STATE section 1, applied to this pack: knowledge that is collected but not
consumed gets wired in or redone, never preserved for its own sake.

### 9.7 Coverage against the v12 brief

| v12 requirement | where |
|---|---|
| 18: push/pull/dip/squat, handstand, L-sit, muscle-up, planche, front and back lever, rings | 3.2 to 3.12, 5.3 |
| 18: progression graphs, not flat lists | 3.2-3.12 rung tables plus 9.2 graph invariants |
| 18: separate skill practice, strength, volume | 3.0, and the `progressionMode` field |
| 18: mobility prerequisites | 4.3, 4.4 |
| 18: no-equipment, bands, doorway bar, rings, small space | 5.1 to 5.5 |
| 20: classify dynamic, static, PNF, loaded mobility by purpose, timing, target, dose, evidence | 7.1 |
| 20: build selection around the actual workout, not a generic five-stretch list | 6.5 (prep selected from `patternLoad` and `stress`), 7.4 |
| 20: ramp-up sets for lifting | 6.6, 6.9 |
| 20: movement prep for speed and jump work | 6.8 sprint and power rows |
| 20: keep cooldown claims evidence-aware | 7.6 |
| 20: foam rolling | 7.3 |
| 20: potentiation vs fatigue | 6.1 (PAPE-REST, SOUZA-2024) and 6.7 |
| 50.9: inputs first working load, exercise, training age, prior exercises, temperature and readiness, injury and function constraints, goal | 6.2 |
| 50.9: minimise unnecessary warm-up fatigue while reaching readiness | 6.7, six rules, plus guard test 9.5 item 5 |

Two v12 items this pack deliberately does NOT cover, so a future session does not assume they are done:
rings as a full modality with its own programming (5.3 sketches the graph consequences only), and the
overlap with v12 section 50.15 (technique, cueing and motor learning), which is R10's job and which owns the
"with good form" clause this pack flags as its honest hole in 4.6.
