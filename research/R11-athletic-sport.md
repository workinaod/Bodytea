# R11: Athletic Performance and Sport-Specific S&C Evidence Pack

Research job R11 for BodyT (v12 sections 21 to 24). Deterministic local-first coaching PWA, no runtime LLM, suggest-only, general wellness, never diagnoses.
Consumers of this pack: `plan/generator.ts` (quality emphasis, layout, recipe selection), `plan/followups.ts` (the sport and position answers), `plan/athletic.ts` (drill selection and progression), `engine/resolveDay.ts` (practice-as-load), `engine/phase.ts` (season state).
Access date for all sources: 2026-08-18. Researcher: Claude (session d21c12d6). NO production code in this pack, NO repo writes.

Conventions used throughout:
- **confidence: source** = grounded in a tier-A document captured below. **confidence: house** = HOUSE HEURISTIC, evidence-informed but not directly from a captured source. Every house call is marked inline.
- Repo facts are quoted from a read-only `git archive` of the deploy branch `claude/app-audit-refinement-sjw2va` (merge line `eaf3519` plus J2), extracted to a scratchpad. Nothing was written back.
- No em dashes anywhere, including in every proposed user-visible string.
- BodyT's own vocabulary is used for qualities (`AthleticQuality` in `src/plan/athletic.ts`), not the literature's, so that nothing here needs translating before it is typed.

---

## 1. SOURCES (provenance)

| ID | Name | Publisher | URL | Accessed | What was taken | Access quality |
|----|------|-----------|-----|----------|----------------|----------------|
| NSCA-LTAD | NSCA Position Statement on Long-Term Athletic Development. Lloyd RS, Cronin JB, Faigenbaum AD, Haff GG, Howard R, Kraemer WJ, Micheli LJ, Myer GD, Oliver JL. J Strength Cond Res 30(6):1491-1509, 2016 | National Strength and Conditioning Association | https://www.nsca.com/globalassets/about/position-statements/nsca_position_statement_long-term_athletic_development.pdf | 2026-08-18 | Full 19-page PDF text-extracted locally: definition of athleticism, the Ten Pillars table verbatim, early-sampling vs early-specialization argument, synergistic-adaptation passage on plyometric vs combined training around peak height velocity, monitoring pillar | FULL (primary, text-extracted locally with pypdf) |
| USAB-YOUTH | Youth Basketball Guidelines (Player Health and Wellness recommendations, Participation Guidelines, Rest Guidelines, Player Segmentation Model) | NBA and USA Basketball joint working groups | https://dt5602vnjxv0c.cloudfront.net/portals/25109/docs/coaches/140.usa_basketball_youth_basketball_guidelines.pdf (found via https://www.usab.com/youth/development/youth-basketball-guidelines) | 2026-08-18 | Full 11-page PDF text-extracted locally: all eight health and wellness recommendations, recommended and maximum participation tables (games/practices per week, max hours per week), rest table (minimum rest days per week, max months per year, sleep hours) | FULL (primary, text-extracted locally with pypdf) |
| PITCHSMART | Pitch Smart pitching guidelines (pitch count limits and required rest by age; age-band recommendations) | Major League Baseball and USA Baseball, with the American Sports Medicine Institute | https://www.mlb.com/pitch-smart/pitching-guidelines (age-band subpages such as /ages-15-18 return HTTP 406 through this session's proxy; age-band bullets captured via search snippets from mlb.com/pitch-smart/pitching-guidelines/ages-9-12, /ages-15-18, /ages-19-22) | 2026-08-18 | Full pitch-count and required-rest matrix for ages 7-8 through 19-22; months-off-per-year rules per age band | FULL (main table) + SNIPPET (per-age bullets) |
| USAB-PITCH-OLD | USA Baseball Recommendations, Pitch Count By Age (older ASMI-derived table) | USA Baseball, hosted by SportsEngine | https://cdn1.sportngin.com/attachments/document/0123/6166/pitch_count_recommendations.pdf | 2026-08-18 | Older max-pitch and monthly/annual limits, pitch-type-by-age guidance, catcher limit. Retained ONLY to record that it CONFLICTS with current Pitch Smart (e.g. 15-16 max 110 vs Pitch Smart 95). BodyT must use PITCHSMART | FULL (superseded document, flagged) |
| HAUGEN-SPRINT | The Training and Development of Elite Sprint Performance: an Integration of Scientific and Best Practice Literature. Haugen T, Seiler S, Sandbakk O, Tonnessen E. Sports Med Open 5:44, 2019 | Sports Medicine - Open (Springer) | https://link.springer.com/content/pdf/10.1186/s40798-019-0221-0.pdf (PDF redirected to an IdP authorize URL in this environment; content taken from the search abstract and the open-access record) | 2026-08-18 | Three-phase model of the 100 m (acceleration, maximal velocity, deceleration); statement that individualized sprint training should follow force-velocity profiles (velocity-deficient athletes get more max-velocity sprinting, force-deficient athletes get more horizontal strength); note that very few studies address how optimal sprint mechanics are achieved and that drills are used by best practice to isolate movement features | ABSTRACT + SNIPPET (PDF gated in this environment) |
| HARPER-DECEL | Biomechanical and Neuromuscular Performance Requirements of Horizontal Deceleration: A Review with Implications for Random Intermittent Multi-Directional Sports. Harper DJ, McBurnie AJ, Santos TD, Eriksrud O, Evans M, Cohen DD, Rhodes D, Carling C, Kiely J. Sports Med 52(10):2321-2354, 2022 | Sports Medicine (Springer) | https://pubmed.ncbi.nlm.nih.gov/35643876/ (PubMed HTML renders a cookie wall via WebFetch; MMU e-space PDF redirects to a handle. Content taken from search capture of the review and the Sportsmith review of it, https://www.sportsmith.co/reviews/july-2022/performance-requirements-of-horizontal-deceleration/) | 2026-08-18 | High-intensity decelerations occur MORE often than high-intensity accelerations in soccer; deceleration ability underpins change-of-direction ability; braking phase is the high-force phase | SNIPPET + SECONDARY REVIEW (primary gated) |
| CUTHBERT-FREQ | Effects of Variations in Resistance Training Frequency on Strength Development in Well-Trained Populations and Implications for In-Season Athlete Training: A Systematic Review and Meta-analysis. Cuthbert M, Haff GG, Arent SM, et al. Sports Med 51(9):1967-1982, 2021 | Sports Medicine (Springer), open via PMC | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8363540/ | 2026-08-18 | Over 6-12 weeks, no meaningful difference between resistance-training frequencies when total volume is equated (lower body p = 0.651, g = 0.061; upper body p = 0.505, g = 0.088); conclusion of "potential flexibility in resistance-training prescription across a micro-cycle"; caveat that most included work used 8-12 rep hypertrophy loading rather than 3-5 reps at 85%+ | FULL (open access) |
| CLEMENTE-LOWVOL | Impact of Lower-Volume Training on Physical Fitness Adaptations in Team Sports Players: A Systematic Review and Meta-analysis. Clemente FM, Ramirez-Campillo R, Moran J, Zmijewski P, Silva RM, Randers MB. Sports Med Open, 2025 | Sports Medicine - Open, open via PMC | https://pmc.ncbi.nlm.nih.gov/articles/PMC11747014/ | 2026-08-18 | Non-significant difference between higher and lower volume (ES -0.05, 95% CI -0.19 to 0.09, p = 0.506); per-outcome nulls: vertical jump 0.04, horizontal jump 0.01, 10 m sprint -0.22, 20-40 m sprint 0.03, change of direction -0.04, maximal strength -0.08; conclusion that lower volumes can achieve similar gains | FULL (open access) |
| BOSQUET-TAPER | Effects of tapering on performance: a meta-analysis. Bosquet L, Montpetit J, Arvisais D, Mujika I. Med Sci Sports Exerc 39(8):1358-1365, 2007 | ACSM / MSSE | https://www.semanticscholar.org/paper/Effects-of-tapering-on-performance:-a-Bosquet-Montpetit/a41517ab5fa06b92568b861e2b1aa32b3003d214 | 2026-08-18 | 27 of 182 studies included; optimal strategy is a 2-week taper with training volume decreased exponentially by 41-60%, with NO change to training intensity or frequency | ABSTRACT (primary paywalled; abstract consistent across three independent captures) |
| PLOS-TAPER | Effects of tapering on performance in endurance athletes: a systematic review and meta-analysis | PLOS ONE, open via PMC | https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0282838 and https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10171681/ | 2026-08-18 | Modern endurance-specific replication of the taper effect; used to check that the Bosquet prescription still holds shape | LISTING (used as corroboration only) |
| VANDYK-NHE | Including the Nordic hamstring exercise in injury prevention programmes halves the rate of hamstring injuries: a systematic review and meta-analysis of 8459 athletes. van Dyk N, Behan FP, Whiteley R. Br J Sports Med, 2019 | BJSM | https://www.researchgate.net/publication/331367089_Including_the_Nordic_hamstring_exercise_in_injury_prevention_programmes_halves_the_rate_of_hamstring_injuries_A_systematic_review_and_meta-analysis_of_8459_athletes | 2026-08-18 | 15 studies, 8459 athletes, 525 injuries; overall injury risk ratio 0.49 (95% CI 0.32 to 0.74, p = 0.0008) favouring programmes including the Nordic hamstring exercise | ABSTRACT + SECONDARY SUMMARY |
| IMPELLIZZERI-NHE | Why methods matter in a meta-analysis: a reappraisal showed inconclusive injury preventive effect of Nordic hamstring exercise. Impellizzeri FM, McCall A, van Smeden M. J Clin Epidemiol, 2021 | Journal of Clinical Epidemiology | https://pubmed.ncbi.nlm.nih.gov/34520846/ and https://www.sciencedirect.com/science/article/abs/pii/S0895435621002870 | 2026-08-18 | Reappraisal: more appropriate study selection and reanalysis accounting for between-study heterogeneity did not replicate the earlier claims; "the evidence underpinning the protective effect of Nordic hamstring exercise so far remains inconclusive". This is the pack's canonical example of thin evidence | ABSTRACT |
| FIFA-11PLUS | FIFA 11+ neuromuscular warm-up programme (structure and effect) | FIFA / FIFA Training Centre, plus peer-reviewed trials indexed at PMC | https://www.fifatrainingcentre.com/en/environment/resources/futsal/futsal-fitness-manual.php and https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5844920/ , https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7142544/ , https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10719933/ | 2026-08-18 | 11+ combines running, strength, balance, core and plyometric/football-specific movements in a standardised progression, run 2 to 3 times per week as the warm-up; trials report agility, jump and short-sprint improvements | SECONDARY (FIFA's own physical-development hub was not reachable directly; programme structure verified through indexed trials) |
| PLYO-CONTACTS | Plyometric training volume guidance: foot contacts per session by experience level, and the landing-first progression rule | NSCA-derived teaching materials and coaching-body guides (UKSCA; Australian Athletics; NSCA education) | https://www.uksca.org.uk/blog/55/understanding-plyometrics-a-coachs-guide , https://coachathletics.com.au/coaching-education/plyometrics-for-track-and-field-coaches-a-practical-guide , https://www.nsca.com/education/videos/plyometric-implementation-setup-and-execution-of-jump-landing-positions-to-decrease-likelihood-of-injuries , https://cdn3.sportngin.com/attachments/document/0041/5798/PlyometricTraining.pdf | 2026-08-18 | Commonly cited sessional contact bands: beginner 80-100, intermediate 100-120, advanced 120-140 (a more conservative variant gives beginners 50-80); bilateral before unilateral; 48 to 72 h between plyometric sessions; master landing mechanics before adding intensity or volume | SECONDARY / TEACHING CONSENSUS (numbers are convention, not a controlled dose-response; flagged wherever used) |
| SAMOZINO-FVP | Force-velocity profiling validity and reliability (Samozino method vs force plate) | Multiple, incl. PMC open access | https://pmc.ncbi.nlm.nih.gov/articles/PMC11235626/ and https://www.sportsmith.co/articles/force-velocity-profiling/ | 2026-08-18 | Method is reliable (ICC > 0.90, CV < 5.5%) but biased against force plates: overestimates mean force 0.5-4.5%, underestimates mean velocity 11.8-16.8% and mean power 2.3-7.9%; jump-height estimation inflates V0 and Pmax | FULL (open access) + SECONDARY commentary |
| CODVAGILITY | Change-of-direction speed and reactive agility as independent skills (incl. the change-of-direction deficit concept) | Multiple peer-reviewed, open via PMC / MDPI / Frontiers | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7037819/ , https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2021.708771/full , https://www.mdpi.com/2075-4663/8/4/51 | 2026-08-18 | Pre-planned change of direction and reactive agility load differently and correlate weakly; reactive sidestepping loads the knee more than pre-planned change of direction; training one does not reliably transfer to the other | FULL (open access) |

| SOCCER-MLS | The physical demands of Major League Soccer match-play with specific reference to high-intensity activity by position, venue and opposition quality | PLOS ONE, open via PMC | https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0334460 and https://pmc.ncbi.nlm.nih.gov/articles/PMC12551844/ | 2026-08-18 | Match means: total distance 9950 +/- 990 m, high-speed running 519 +/- 171 m, sprint distance 166 +/- 98 m, 10 +/- 5 sprints per match; central midfielders highest total distance (10510 +/- 1000 m); full backs and wide midfielders highest high-speed running (599 +/- 147 m) and sprint distance (225 +/- 98 m); venue and opposition effects | FULL (open access) |
| SOCCER-HSR | High-speed running and sprinting in professional adult soccer: current thresholds definition, match demands and training strategies. A systematic review | Frontiers in Sports and Active Living, open via PMC | https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2023.1116293/full and https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9968809/ | 2026-08-18 | Threshold definitions and the elite 10 to 13 km total-distance range; used to corroborate SOCCER-MLS rather than as a separate claim | LISTING / CORROBORATION |
| BBALL-JUMPS | Basketball match jump demands (jumps per game, one action every ~52 s in professional play) and basketball vs volleyball vertical comparison | Peer-reviewed and aggregated sources incl. Frontiers, PMC and Journal of Men's Health | https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2024.1399399/full , https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10049463/ , https://www.jomh.org/articles/10.22514/jomh.2023.101 , https://www.topendsports.com/head2head/sports/basketball-volleyball.htm | 2026-08-18 | Roughly 40 to 60 jumps per game by position and style; more than 50 explosive jumping actions per professional game (about one every 52 s); volleyball players average higher verticals than basketball players in comparative samples | SNIPPET + SECONDARY (figures vary by sample; treated as order-of-magnitude) |
| SHAH-SPRINT | The Influence of Weekly Sprint Volume and Maximal Velocity Exposures on Eccentric Hamstring Strength in Professional Football Players. Shah S, Collins K, Macgregor LJ. Sports (Basel) 10(8):125, 2022 | Sports (MDPI), open via PMC | https://pmc.ncbi.nlm.nih.gov/articles/PMC9414047/ | 2026-08-18 | Eccentric hamstring strength declined significantly at 7 to 8 weekly efforts above 90% max velocity vs 0-2 (p = 0.03) and 5-6 (p = 0.03); weekly sprint distance (212.1 +/- 188.6 m) showed no relationship; squad mean exposures above 90% = 0.96 +/- 1.39/wk, above 95% = 0.02 +/- 0.14/wk | FULL (open access) |
| SPRINT-HAM-SR | Sprint Training for Hamstring Injury Prevention: A Scoping Review | Applied Sciences (MDPI) | https://www.mdpi.com/2076-3417/15/16/9003 (returned HTTP 403 through this session's proxy; content from search capture only) | 2026-08-18 | U-shaped exposure argument: insufficient exposure leaves tissue underprepared, excessive or poorly progressed loading precipitates injury; exposure aggregated over weekly and 1 to 4 week rolling windows; sessions at >= 90% max speed | SNIPPET ONLY (primary blocked; every claim taken from it is flagged low confidence in-line) |
| YOUNG-TRANSFER | Transfer of Strength and Power Training to Sports Performance. Young WB. Int J Sports Physiol Perform 1(2):74-83, 2006 | Human Kinetics / IJSPP | https://journals.humankinetics.com/view/journals/ijspp/1/2/article-p74.xml | 2026-08-18 | Bilateral vertical exercises (squat, jump squat) transfer minimally to sprint performance; unilateral and horizontal plyometric work produces sprint acceleration gains; large gains in non-specific power can accompany small changes in sprint performance; general strength training remains useful for mass, soft-tissue injury risk and core stability | ABSTRACT + SNIPPET (paywalled full text) |
| SQUAT-TRANSFER | Relationship of squat strength to sprint and jump performance (492-player cross-sectional analysis; plus the meta-analytic lower-body-strength-to-sprint transfer review) | MDPI / IJERPH and PMC | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9140541/ , https://www.mdpi.com/1660-4601/19/10/5835 , https://pubmed.ncbi.nlm.nih.gov/25059334/ | 2026-08-18 | Relative squat strength explains roughly 45 to 53% of variance in squat jump, countermovement jump and linear sprint; correlations r ~0.65 to 0.79 depending on bilateral vs unilateral; relationship described as S-shaped rather than linear; increases in lower-body strength transfer positively to sprint performance at meta-analytic level | FULL (open access) + ABSTRACT |
| PJT-DOSE | Plyometric-jump training dose: minimal effective dose and in-season effectiveness (maturity meta-analysis; soccer meta-analysis; basketball meta-analysis; in-season frequency trials) | Sports Medicine - Open, ScienceDirect, PMC | https://sportsmedicine-open.springeropen.com/articles/10.1186/s40798-023-00568-6 , https://sportsmedicine-open.springeropen.com/articles/10.1186/s40798-024-00720-w , https://www.sciencedirect.com/science/article/pii/S2095254620301691 , https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12036856/ | 2026-08-18 | Minimal effective dose around 2 weekly sessions for 4 weeks (8 sessions) and roughly 92 weekly jumps; benefits reported in season as well as preseason; most soccer studies used 2 sessions/wk with pooled ES 0.58 (95% CI 0.28 to 0.87); >2 vs <=2 weekly sessions favoured horizontal jump distance (ES 2.12 vs 0.39) | FULL / ABSTRACT mix |
| MYJUMP | Validity and reliability of smartphone jump-height apps (My Jump 2 family) | MDPI Applied Sciences, PeerJ, PMC | https://www.mdpi.com/2076-3417/10/11/3805 , https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9884043/ , https://pmc.ncbi.nlm.nih.gov/articles/PMC11679296/ | 2026-08-18 | Between-observer ICC ~0.99, test-retest ICC > 0.93, r = 0.98 vs Optojump for countermovement jump HEIGHT; velocity and power estimates show impractical or poor validity | FULL (open access) |
| COD-505 | Reliability of the 505 change-of-direction test and of the change-of-direction deficit | PMC, Taylor and Francis, ResearchGate | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8162567/ , https://www.tandfonline.com/doi/full/10.1080/24733938.2018.1526402 , https://www.researchgate.net/publication/281342796_Reliability_of_the_505_Change_of_Direction_Test_in_Netball_Players | 2026-08-18 | 505 reliability: ICC 0.75 with typical error under 5% in prepubertal soccer; ICC 0.90 to 0.97 in netball; r = 0.26 to 0.82 with typical error 2.0 to 3.2% in elite youth football. Change-of-direction deficit sensitivity described as marginal and judged unsuitable in elite youth football | FULL / ABSTRACT mix |
| ACL-NMT | Neuromuscular training for ACL injury prevention in female athletes (umbrella review and meta-analyses) | MDPI IJERPH, PMC, Taylor and Francis | https://www.mdpi.com/1660-4601/19/8/4648 , https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9027388/ , https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12581765/ | 2026-08-18 | Reported relative risk reductions of 73.4% (non-contact ACL) and 43.8% (overall ACL); a separate meta-analysis reports a 64% reduction in non-contact ACL in youth females; effective programmes combine plyometrics, strengthening, balance and movement-pattern correction with at least three exercise types plus technique feedback. Effect sizes vary widely across reviews, which is itself the finding | FULL (open access), heterogeneous |
| SPORT-INJ | Sport-specific injury epidemiology: tennis shoulder, golf low back, swimming shoulder | Multiple peer-reviewed, open via PMC / IJSPT / Wiley | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4647145/ , https://link.springer.com/article/10.1186/s12891-020-03571-0 , https://esskajournals.onlinelibrary.wiley.com/doi/abs/10.1007/s00167-023-07310-5 , https://pubmed.ncbi.nlm.nih.gov/25741420/ , https://pmc.ncbi.nlm.nih.gov/articles/PMC9219256/ , https://pmc.ncbi.nlm.nih.gov/articles/PMC6961642/ , https://pmc.ncbi.nlm.nih.gov/articles/PMC11297363/ | 2026-08-18 | Tennis: three defined shoulder risk factors (glenohumeral internal rotation deficit, rotator cuff especially external rotators, scapular dyskinesis); high in-season prevalence of shoulder alterations in professionals. Golf: low back pain accounts for 18 to 54% of documented ailments; 15 to 35% of amateurs and up to 55% of professionals; annual prevalence 18 to 36%, recurrence to 55%. Swimming: shoulder pain prevalence reported up to 91%, highest in adolescents (91.3%), roughly half of surveyed swimmers affected, rising with age, experience and prior injury | FULL / ABSTRACT mix |

Blocked or degraded in this environment, recorded so a future session does not re-burn usage: `mlb.com/pitch-smart/pitching-guidelines/ages-*` returns HTTP 406; `pubmed.ncbi.nlm.nih.gov` article pages render a cookie wall through WebFetch (abstracts still arrive via search snippets); `link.springer.com` PDF links 303 to an IdP authorize URL; `e-space.mmu.ac.uk` PDFs 302 to a handle resolver. NSCA and USA Basketball PDFs downloaded fine and were text-extracted locally.

---

## 2. WHAT BODYT HAS, INCLUDING THE DEAD WIRE

All line numbers and counts below are from the deploy branch tree, read-only.

### 2.1 The athletic library is real and it is bigger than advertised

`src/plan/athletic.ts` (737 lines) defines the `AthleticMeta` sidecar and 91 entries. `src/plan/athleticCoverage.ts` (324 lines) defines 9 more and merges them in at module load:

```ts
Object.assign(ATHLETIC, ATHLETIC_COVERAGE_META)
```

So the live `ATHLETIC` map holds **100 entries**, not the ~106 in the brief. Of those, 80 have a matching `ExerciseDef` in the athletic exercise files (71 in `athleticExercises.ts`, 9 in `athleticCoverage.ts`); the other 20 are base-catalog strength movements classified athletically (the block commented `EXISTING STRENGTH, CLASSIFIED ATHLETICALLY`: `front-squat`, `romanian-deadlift`, `hip-thrust`, `bulgarian-split-squat`, `single-leg-calf-raise`, `dynamic-warmup` and so on).

Each entry carries: `qualities` (first is primary and drives substitution), `direction`, `laterality`, optional `footing`, `emphasis`, `level`, `impact` 0-3, `cns` 0-3, `fresh`, an `AthleticProgram` (sets, reps, distance, duration, restSec, intensity), optional `regressions`, `progressions`, `reactiveCues`, `warning`.

Distribution as it actually stands (computed over the merged 100):

- Levels, merged: foundation 37, intermediate 40, advanced 23 (the 9 coverage drills contribute 5 foundation, 2 intermediate, 2 advanced).
- `fresh: true` on 64 of the merged 100. Almost two thirds of the library is flagged must-be-done-fresh, which is a scheduling constraint nothing currently enforces.
- `cns: 3` on exactly 13 drills: `accel-20`, `max-velocity-sprint`, `flying-sprint`, `flying-20`, `penultimate-approach-jump`, `one-foot-jump`, `dunk-attempt`, `power-bound`, `single-leg-bound`, `depth-jump`, `shuttle-5-10-5`, `trap-bar-jump`, and `accel-to-flying` from the coverage file.
- `impact: 3` on 16 drills merged.
- Coverage by primary quality is uneven, and the coverage file's own header comment names the holes it was written to close. Post-merge the counts are:

| primary quality | F | I | A | total primary | total appearances |
|---|---|---|---|---|---|
| vertical-power | 3 | 4 | 3 | 10 | 19 |
| acceleration | 2 | 6 | 1 | 9 | 12 |
| cod | 0 | 3 | 5 | 8 | 10 |
| athletic-strength | 4 | 3 | 0 | 7 | 12 |
| horizontal-power | 2 | 2 | 2 | 6 | 14 |
| elastic-reactive | 0 | 3 | 3 | 6 | 19 |
| lateral-power | 2 | 2 | 2 | 6 | 9 |
| max-velocity | 1 | 1 | 3 | 5 | 9 |
| sprint-mechanics | 3 | 1 | 1 | 5 | 9 |
| ankle-stiffness | 3 | 2 | 0 | 5 | 10 |
| force-absorption | 2 | 3 | 0 | 5 | 9 |
| explosive-strength | 2 | 2 | 1 | 5 | 7 |
| sprint-hamstring | 2 | 2 | 1 | 5 | 6 |
| deceleration | 2 | 1 | 0 | 3 | 8 |
| reactive-agility | 1 | 1 | 1 | 3 | 3 |
| rotational-power | 2 | 1 | 0 | 3 | 3 |
| foot-ankle | 2 | 1 | 0 | 3 | 3 |
| balance-stability | 1 | 2 | 0 | 3 | 12 |
| coordination | 3 | 0 | 0 | 3 | 11 |

Three qualities appear only three times in the entire library and never as a secondary on anything else: `reactive-agility`, `rotational-power` and `foot-ankle`. Those are the three the sport profiles in section 4 lean on hardest for baseball, cricket, golf, tennis and combat sports. Two qualities still have ZERO foundation entries after the coverage pass: `cod` and `elastic-reactive`. For `cod` that is arguably correct by design, because the entry point is now `deceleration`, which the coverage file gave two foundation drills. For `elastic-reactive` it is a real hole: the only way in is an intermediate drill.

`athleticSubsFor(id)` returns same-primary-quality drills at or below the source drill's level, sorted hardest-first. `progressionChain(id)` walks regressions back up to 4 and progressions forward up to 4. `programLine(meta)` renders the compact guide line. These are consumed: `plan/subs.ts` uses `athleticFor` and `athleticSubsFor` in real substitution; `screens/today/ExerciseGuideSheet.tsx` renders `progressionChain` and `programLine`; `screens/booklet/BookletEditor.tsx` filters the library by quality and level. The library is not dead. What is dead is the thing that should be choosing FROM it.

### 2.2 The transfer axis: declared 52 times, read by one test

`src/plan/movement.ts` (487 lines) defines `MovementMeta` for 111 strength movements across five axes plus a sixth, `transfer?: AthleticQuality[]`. The file's own header says exactly what it is for:

> TRANSFER connects this file to athletic.ts, so the app can say why a lift is in a jumper's plan in the jumper's own terms.

`transfer` is populated on 52 entries. The accessor exists:

```ts
/** Everything in the library that feeds one athletic quality. */
export function transfersTo(quality: AthleticQuality): string[] {
  return Object.entries(MOVEMENT)
    .filter(([, m]) => m.transfer?.includes(quality))
    .map(([id]) => id)
}
```

Grep for every reader of the field and of the function:

```
$ grep -rn "\.transfer\b" src --include=*.ts --include=*.tsx
src/plan/movement.test.ts:235:      for (const q of m.transfer ?? []) {
src/plan/movement.ts:485:    .filter(([, m]) => m.transfer?.includes(quality))

$ grep -rn "transfersTo" src
src/plan/movement.test.ts:16:  transfersTo,
src/plan/movement.test.ts:227:    expect(transfersTo('sprint-hamstring')).toContain('seated-leg-curl')
src/plan/movement.test.ts:228:    expect(transfersTo('ankle-stiffness')).toContain('single-leg-calf-raise')
src/plan/movement.test.ts:229:    expect(transfersTo('vertical-power')).toContain('goblet-squat')
src/plan/movement.ts:483:export function transfersTo(quality: AthleticQuality): string[] {
```

So the transfer axis has exactly one consumer, `movement.test.ts`, and that consumer is a validity check ("every declared transfer is a quality the athletic library knows") plus three spot assertions. No engine, no generator, no screen reads it. The bridge between the strength library and the athletic library is built and nothing drives across it.

### 2.3 The explosive goal family: layouts and recipes exist, sport does not touch them

`src/plan/generator.ts` (940 lines) maps `vertical` and `speed` goals to `GoalFamily = 'explosive'`. `LAYOUTS.explosive` is:

| days | Mon | Tue | Wed | Thu | Fri | Sat |
|---|---|---|---|---|---|---|
| 3 | power | | lowerStrength | | upperMix | |
| 4 | power | | lowerStrength | | upperMix | speed |
| 5 | power | push | lowerStrength | | pull | speed |
| 6 | power | push | lowerStrength | mobility | pull | speed |

Two recipes carry `cns: true`, and they are the only two: `power` ("Power + First Step": `falling-start-sprint` 5x2, `box-jump` 4x3, then squat slot, lower accessory, calf, core) and `speed` ("Speed + Reactive": `dynamic-warmup`, `max-velocity-sprint` 5 x 30-40 yd, `pogo-hop` 3x20, `approach-jump` 1x6, curl slot, `farmer-carry`). `cnsWeekdays` is derived from those two roles and stored on the plan as an anchor.

The whole explosive family therefore programs exactly six athletic drill ids out of 100: `falling-start-sprint`, `box-jump`, `dynamic-warmup`, `max-velocity-sprint`, `pogo-hop`, `approach-jump`. Everything else in the library is reachable only through a manual booklet edit or a substitution.

`GOAL_FIRST` promotes exercises per goal for `strength` and `muscle` only. There is no explosive entry, no sport entry, and no quality-weighted slot pool anywhere in the generator.

### 2.4 The vertical milestone ladder

`src/plan/milestones.ts` holds `VERT_LADDER`, five landmarks measured as reach above standing reach so the numbers are height-independent: touch the net (0 in of gap closed), touch the backboard (6), touch the rim (12), grab the rim (18), dunk (24). `vertStages(fromIn, toIn)` filters the ladder into stage specs. Modelled rate is `VERT_IN_PER_WEEK` = new 0.2, returning 0.12, casual 0.09, trained 0.05 in/week, with a documented rationale ("Meta-analytic gains from plyometric training run roughly 3-8 cm over 8-12 weeks in previously untrained subjects... Anybody quoting +10 inches in 12 weeks is selling something"), a `NOISE_FLOOR.vertIn` of 0.5 in, `STAGE_DECAY` 0.85 and `MAX_ETA_WEEKS` 104. This is the one place in the repo where athletic progress is already modelled honestly, and it is sport-blind: a volleyball player's one-foot approach jump and a lineman's standing vertical run the same ladder.

### 2.5 THE DEAD WIRE: the sport answer is collected and consumed by nothing

`src/plan/followups.ts` (567 lines) contains, in order: `SPORTS` (29 options, 28 real sports plus "Something else"), `SPORT_QUALITIES` (28 keyed profiles of 2 to 5 `AthleticQuality` strings each), `DEFAULT_SPORT_QUALITIES`, `qualitiesForSport()`, a `POSITIONS` table for 14 sports, the question bank including `sport`, `sport-other`, `sport-level`, `in-season`, and the `buildFollowups` splice that inserts a `sport-role` question when `POSITIONS[sport]` exists. It also exports `sportOf(answers)`.

Here is the grep, complete and unedited:

```
$ grep -rn "SPORT_QUALITIES" src e2e scripts tools
src/plan/followups.test.ts:4:import { buildFollowups, GOAL_FOLLOWUPS, qualitiesForSport, readStatement, SPORTS, SPORT_QUALITIES, targetsFromAnswers } from './followups'
src/plan/followups.test.ts:142:      expect(SPORT_QUALITIES[s], `${s} has no quality profile`).toBeTruthy()
src/plan/followups.test.ts:143:      expect(SPORT_QUALITIES[s].length).toBeGreaterThan(1)
src/plan/followups.ts:76: * `DEFAULT_SPORT_QUALITIES` is what an unrecognised answer gets: the
src/plan/followups.ts:80:export const SPORT_QUALITIES: Record<string, string[]> = {
src/plan/followups.ts:117:export const DEFAULT_SPORT_QUALITIES = ['acceleration', 'athletic-strength', 'cod', 'balance-stability']
src/plan/followups.ts:122:  return SPORT_QUALITIES[sport] ?? DEFAULT_SPORT_QUALITIES

$ grep -rn "qualitiesForSport" src e2e scripts tools
src/plan/followups.test.ts:4:import { buildFollowups, GOAL_FOLLOWUPS, qualitiesForSport, readStatement, SPORTS, SPORT_QUALITIES, targetsFromAnswers } from './followups'
src/plan/followups.test.ts:150:    const q = qualitiesForSport('Korfball')
src/plan/followups.test.ts:152:    expect(qualitiesForSport('Climbing')).toContain('athletic-strength')
src/plan/followups.test.ts:153:    expect(qualitiesForSport(null)).toEqual([])
src/plan/followups.ts:120:export function qualitiesForSport(sport: string | null): string[] {

$ grep -rn "sportOf" src e2e scripts
src/plan/followups.ts:536:export function sportOf(answers: Record<string, string>): string | null {

$ grep -rn "sport-role" src e2e scripts
src/plan/followups.test.ts:125:    expect(withBall.map((q) => q.id)).toContain('sport-role')
src/plan/followups.test.ts:128:    expect(golf.map((q) => q.id)).not.toContain('sport-role')
src/plan/followups.ts:519:      id: 'sport-role',

$ grep -rn "in-season\|inSeason" src e2e scripts
src/plan/followups.ts:326:  inSeason: {
src/plan/followups.ts:327:    id: 'in-season',
src/plan/followups.ts:412:  speed: [Q.sport, Q.sportOther, Q.sportLevel, Q.inSeason, Q.speedWhat, Q.sprintFeel, Q.sprintSpace],
```

The finding in the brief is confirmed, and it is worse than stated on four counts:

1. **`SPORT_QUALITIES` and `qualitiesForSport` have zero production call sites.** Their only readers are the definition itself and `followups.test.ts`. The test asserts the table is well formed; nothing asserts it does anything.
2. **`sportOf` is fully dead.** It is exported at line 536 and called from nowhere at all, not even from the test. It is the accessor for the answer, and nothing has ever asked for the answer.
3. **`in-season` is fully dead.** It is asked (it is fourth in the `speed` goal's question list, with the informs string "In season the plan protects your legs for games. Off season it goes after the gap.") and read by nothing. That informs string is currently false.
4. **`sport-role` is fully dead.** `POSITIONS` covers 14 sports, `buildFollowups` splices the position question in ahead of `sport-level`, and no consumer ever reads the answer. The `informs` string, "A keeper and a midfielder are not the same athlete", is also currently false.

For contrast, other goal answers ARE wired. `deepGoalStrategy` in `generator.ts` branches on `limiting`, `jump-history`, `vert-now`, `speed-what`, `sprint-feel`, `sprint-space`, `bar-years`, `maxes-known`, `lift-focus`, `race-what`, `run-now`, `race-when`, `matters-most`, `barrier`, `day-movement` and writes personal strategy lines from them. Not one of those branches mentions sport, position, level or season. The single answer whose own `informs` string calls it "the biggest single lever there is" produces no line and no plan change.

### 2.6 Two adjacent bugs found while confirming the above

**A typo'd key means one arm of `gentleExplosive` can never fire.** `generator.ts` lines 758-762:

```ts
const gentleExplosive =
  explosive &&
  (a.goalAnswers?.['jump-history'] === 'Never' ||
    a.goalAnswers?.['speed-now'] === 'Have not sprinted in years')
```

There is no question with id `speed-now` anywhere in `followups.ts`. The sprint question is `sprint-feel` with options `Fine | Stiff | It has been years`. Grep confirms `speed-now` appears exactly once in the entire repo, on that line. So a `speed` athlete who says they have not sprinted in years gets the strategy sentence (that branch reads `sprint-feel` correctly at line 639) but does NOT get the one-set-lighter programming change. Only the `vertical` path through `jump-history === 'Never'` actually softens the plan. `scripts/personas.mjs:89` compounds this by seeding `'sprint-feel': 'Smooth'` and `'speed-for': 'My sport'`, neither of which is an option any question offers, so the simulation harness has never exercised this branch either.

**The practice-as-load machinery exists and the generator never turns it on.** `PlanConfig.sportMode` is `'ball' | 'generic'`. `engine/resolveDay.ts` reads it and does real work with it: `week.ballDates` suppresses scheduled conditioning entirely (`week.cardio && ... && week.ballDates.length === 0`), raises a banner, and raises a second banner on the eve of a CNS day. `plan/cardio.ts` knows which logged activities count as intense play (`isIntenseSport`, with per-mode intensity flags for basketball, soccer, football, hockey, tennis, volleyball, combat and more). But `generator.ts:930` and `bookletOps.ts:126` both hardcode `sportMode: 'generic'`. The only place `'ball'` is ever set is `plan/presets/naod.ts:70`, the owner's own preset. A user who answers "Basketball" gets the generic mode.

**The dead-export guard cannot see any of this.** `src/structure.test.ts` filters its dead-export scan to `engine/` and `logic/` only:

```ts
const targets = REFERENCE_FILES.filter(
  (f) => f.path.startsWith('engine/') || f.path.startsWith('logic/'),
)
```

`plan/` is outside the net, which is why `sportOf` and `qualitiesForSport` could sit dead through a full audit. That is a one-line widening and it belongs with this job (see section 10).

---

## 3. ATHLETIC QUALITY MODEL

Twelve qualities, each with: what it is, what develops it, how it is trained, how BodyT can test it with a phone and a park, and how it interacts with the rest. The right-hand mapping is to BodyT's existing `AthleticQuality` union so nothing here needs a new vocabulary.

### 3.0 The mapping, and the two holes in the enum

| Quality (this model) | BodyT `AthleticQuality` value(s) | Notes |
|---|---|---|
| Max strength | `athletic-strength` | |
| Relative strength | none | Derived: strength per unit bodyweight. Not a drill property, an athlete property. HOUSE |
| Rate of force development | `explosive-strength` | |
| Power (directional) | `vertical-power`, `horizontal-power`, `lateral-power`, `rotational-power` | BodyT already splits power by direction, which most models do not. Keep it |
| Acceleration | `acceleration` | |
| Max velocity | `max-velocity`, `sprint-mechanics` | |
| Deceleration | `deceleration`, `force-absorption` | BodyT correctly separates braking a body in motion from absorbing a landing |
| Change of direction | `cod`, `reactive-agility` | BodyT correctly separates pre-planned from reactive |
| Reactive strength | `elastic-reactive` | |
| Elasticity / stiffness | `ankle-stiffness`, `foot-ankle` | |
| Work capacity | **none** | Gap |
| Mobility | **none** | Gap |
| (BodyT extras) | `balance-stability`, `coordination`, `sprint-hamstring` | Motor control and tissue robustness. Keep, they earn their place |

**The two holes matter.** `MovementPattern` in `movement.ts` has `mobility` and `conditioning` values, so those concepts exist on the strength axis, but no drill can declare itself a work-capacity or mobility drill on the athletic axis. Every sport profile in section 4 needs to say something about conditioning (soccer and rugby are conditioning-led, golf and powerlifting are not) and several need to say something about mobility (swimming shoulders, hockey hips, golf thoracic rotation). Adding `work-capacity` and `mobility` to the union is a two-line change that unblocks the sport profiles. HOUSE HEURISTIC, but a cheap one.

### 3.1 Max strength (`athletic-strength`)

**What develops it.** Progressive heavy external load through full ranges, mostly bilateral compounds plus loaded single-leg work, at 80%+ of one-rep max for 1 to 6 reps, or to close proximity to failure at lower loads. Sufficient protein and calories. Time: months, not weeks.

**How it is trained in BodyT terms.** The `lowerStrength`, `push`, `pull`, `fullBody` recipes already do this. The `squatVariation` and `hamstring` slot pools already resolve by equipment. Nothing new is needed.

**How it is tested without lab equipment.** BodyT already has the answer: it does not test max strength, it estimates it from logged work. `engine/` computes rep-max series and e1RM from real sets. That is better than a field test for this population because a true one-rep max is a risk and a skill. Where a number is needed, use the heaviest set actually logged in the last 6 weeks and its reps.

**Interactions.** Max strength is the substrate under acceleration, vertical power and deceleration, and its correlation with sprint and jump is real but ceilinged: relative squat strength explains roughly 45 to 53% of the variance in squat jump, countermovement jump and linear sprint in youth soccer players, and the relationship is S-shaped rather than linear, so it flattens at high strength levels (see sources; MDPI/PMC 492-player analysis and the Wisloff-line correlational work). Increases in lower-body strength do transfer positively to sprint performance at the meta-analytic level, but Young's transfer review is the necessary counterweight: bilateral vertical exercises such as squats and jump squats transfer minimally to sprint performance on their own, while unilateral and horizontal plyometric work produces the sprint acceleration gains. **The practical rule for BodyT: strength is a permission, not a cause.** Below roughly a bodyweight squat it is the limiting factor and should lead; above roughly 1.5x bodyweight it stops being the limiting factor and directional power and elasticity should lead. HOUSE HEURISTIC on the exact thresholds, sourced on the shape.

### 3.2 Relative strength (derived)

**What develops it.** Either end: numerator up (max strength work) or denominator down (body composition). For jumpers, sprinters, climbers and combat athletes at weight, the denominator is often the faster lever and BodyT already owns it through the nutrition engine.

**How it is trained.** No separate training. It is a reporting and prioritisation axis.

**How it is tested.** Logged e1RM divided by logged bodyweight. Both numbers already exist in the store. No new instrument.

**Interactions.** This is the axis that decides whether "get stronger" or "get lighter" is the honest advice for a jumper, and BodyT currently has no opinion on that question despite holding both numbers. A lineman wanting to be immovable wants absolute strength and mass; a guard wanting a vertical wants relative strength. Same goal word, opposite prescription. See fixture F2 in section 9.

### 3.3 Rate of force development (`explosive-strength`)

**What develops it.** Maximal-intent efforts against submaximal loads, ballistic work where the load leaves the body or the body leaves the ground, and heavy work performed with maximal intent. Short exposures, long rests, stop on quality.

**How it is trained in BodyT terms.** `jump-squat`, `trap-bar-jump`, `kb-swing`, the medicine-ball throws, and heavy compounds cued for intent. All already in the library.

**How it is tested without lab equipment.** A true RFD number needs a force plate. The field proxy is the **eccentric utilisation ratio**: countermovement jump height versus squat jump height (a non-countermovement jump from a paused position). A small difference means the athlete is concentric-dominant and needs elastic work; a large difference means the opposite. Both jumps are already in the library (`squat-jump`, `countermovement-jump`) and both are phone-measurable. Flag as approximate.

**Interactions.** RFD is what converts max strength into acceleration and jump height when ground contact is short. It is the quality that decays fastest with detraining and recovers fastest with re-exposure, which is why in-season maintenance protects it cheaply (section 6).

### 3.4 Power, split by direction (`vertical-power`, `horizontal-power`, `lateral-power`, `rotational-power`)

**What develops it.** Maximal-intent work in the direction that matters, because direction is the specificity that actually transfers. Vertical: jumps and jump variants. Horizontal: broad jumps, bounds, sled and hill work, hip thrusts. Lateral: bounds, skaters, cuts. Rotational: throws.

**How it is trained.** The library covers vertical (10 primary drills), horizontal (6) and lateral (6) well and rotational (3 primary, and only 3 appearances anywhere) thinly. Rotational is the single biggest content gap for the sports people actually play: baseball, softball, cricket, golf, tennis, combat sports and lacrosse are all rotational-led, and the library has `mb-rotational-throw`, `mb-side-throw` and `mb-step-through-throw`. That is three drills for six sports and no progression past intermediate.

**How it is tested without lab equipment.** Vertical: chalk-and-wall reach differential, or a phone jump app. My Jump 2 style apps are reliable for jump HEIGHT (ICC ~0.99 between observers, r = 0.98 against Optojump) and poor for velocity and power, so use height only. Horizontal: standing broad jump measured in inches, which needs a tape and nothing else, and which BodyT can store as a proper metric. Lateral: single lateral bound for distance, per side, which also exposes asymmetry. Rotational: seated or standing medicine-ball side throw for distance, per side.

**Interactions.** Directional power is the quality where "sport-specific" is genuinely true and it is also where gimmickry lives. Training a rotational throw develops rotational power; swinging a weighted bat does not reliably develop a better swing and can degrade the motor pattern. **Rule for BodyT: the sport answer selects the DIRECTION of power work, never a mimicry of the sport skill.**

### 3.5 Acceleration (`acceleration`)

**What develops it.** Horizontal force production over 0 to 20 yards from a low body angle: starts, short sprints, resisted starts, hill and sled work, plus the strength base under it (hip extension, calf, hamstring).

**How it is trained.** The library's acceleration branch is its best-built: `wall-drive` -> `a-march` -> `a-skip` -> `falling-start-sprint` -> `two-point-start` / `three-point-start` / `push-up-start` -> `resisted-start` / `sled-sprint` / `hill-sprint` -> `accel-20`. Eight primary drills, foundation through intermediate, with a coherent chain.

**How it is tested without lab equipment.** A 10 or 20 yard time from a static two-point start, hand-timed or phone-timed, run twice on the same surface. Hand timing carries roughly 0.2 s of systematic bias, so it can be used for CHANGE against itself, never against published norms. Simpler and honest: mark a fixed distance, count the touches, or use "how far do you get in 3 seconds" against a tape.

**Interactions.** Acceleration correlates with max strength more strongly than max velocity does, and is the quality most sports actually need (soccer sprints are 10 to 30 yards, basketball sprints are shorter still). It is also cheaper and safer than max velocity: lower peak hamstring strain, lower CNS cost. **For most team-sport users, acceleration should lead and max velocity should be a small dose.**

### 3.6 Max velocity (`max-velocity`, `sprint-mechanics`)

**What develops it.** Running at or above 95% of max speed. There is no substitute. Build-ups, flying runs, wicket runs, and the mechanics drills that shape posture.

**How it is trained.** Library chain: `dribble-run` -> `build-up-sprint` -> `wicket-run` / `max-velocity-sprint` -> `flying-sprint` -> `flying-20`, with `relaxed-stride` from the coverage file as the missing foundation entry and `accel-to-flying` as the advanced bridge. Note the library's own honesty on `flying-20`: "The most CNS- and hamstring-expensive drill in the library. Tiny doses, long rests, never tired."

**How it is tested without lab equipment.** A flying 10 or 20 yard segment, phone-timed off video, compared only against itself. Or the plainest field test there is: run 40 yards on grass and see whether the last 15 yards feel like they are still accelerating. Mark as subjective.

**Interactions.** This is the highest-risk quality in the library and the one where dose evidence is most specific. In professional footballers, eccentric hamstring strength declined significantly when players accumulated 7 to 8 weekly sprint efforts above 90% of maximum velocity, compared with 0 to 2 and 5 to 6 efforts, while weekly sprint DISTANCE (squad mean 212 m) showed no relationship. So the dangerous variable is number of near-maximal exposures, not metres. Squad means were under 1 exposure per week above 90%. Separately, the exposure literature is U-shaped: too little sprint exposure leaves tissue underprepared and too much or too rapidly progressed precipitates injury, with rapid week-on-week increases relative to the recent 4-week average being the specific risk. Haugen's review adds that individualisation should follow a force-velocity profile: velocity-deficient athletes get more max-velocity sprinting, force-deficient athletes get more horizontal strength.

### 3.7 Deceleration (`deceleration`, `force-absorption`)

**What develops it.** Braking under control at progressively higher approach speeds, plus eccentric strength in the quadriceps and the ability to accept load on one leg.

**How it is trained.** The coverage file exists precisely because this branch had no foundation entry. Chain now: `jog-to-stop` -> `decel-to-backpedal` -> `decel-stick` -> `plant-and-go` / `turn-180`. Landing side: `snap-down` -> `snap-down-stick` -> `drop-landing` -> `single-leg-landing` -> `depth-drop`.

**How it is tested without lab equipment.** Approach at a marked speed and stop inside a 2-yard box, scored pass or fail on: two-foot stop, hips sink, knees track over the middle of the foot, no extra step. Then progress to a one-foot stop. This is a competency gate, not a number, and that is the correct shape (see section 8).

**Interactions.** Deceleration is upstream of change of direction, not downstream of it, and BodyT's own coverage-file comment already says so: "stopping is the prerequisite for cutting, not a refinement of it". The evidence agrees: high-intensity decelerations occur more frequently than high-intensity accelerations in soccer, and deceleration ability is thought to underpin change-of-direction ability. The braking step is the high-force step.

### 3.8 Change of direction (`cod`) and reactive agility (`reactive-agility`)

**What develops COD.** Pre-planned cutting at increasing entry speeds and decreasing cut angles, on top of a deceleration base.

**What develops reactive agility.** The same movements driven by an external cue the athlete cannot pre-plan. These are separate skills: pre-planned COD and reactive agility correlate weakly and training one does not reliably improve the other.

**How they are trained.** COD: `cut-45` -> `cut-90` -> `turn-180` -> `shuttle-5-10-5` -> `l-drill`. Reactive: `reaction-start` -> `mirror-drill` -> `reactive-shuttle`, all three carrying `reactiveCues`, with `'app'` already listed as a cue type. That scaffold is a free feature: BodyT can BE the cue (a screen flash or a beep at a random interval) without any hardware.

**How they are tested without lab equipment.** The 505 is the practical field test: 10 m approach, turn at a line, 5 m out and 5 m back, timed over the last 5 m each way. Reliability is population-dependent: good in prepubertal soccer players (ICC 0.75, typical error under 5%) and high in netball (ICC 0.90 to 0.97), but only low to high in elite youth football (r = 0.26 to 0.82, typical error 2.0 to 3.2%). The change-of-direction deficit (505 time minus a 10 m sprint time) is theoretically the cleaner measure but its sensitivity to small changes is described as marginal and it was judged unsuitable in elite youth football. **BodyT should use 505 left versus right for ASYMMETRY, which is robust, and treat the absolute time as noisy.** Flag both.

**Interactions.** Reactive sidestepping loads the knee more than pre-planned cutting does, which is exactly why the progression must be pre-planned before reactive and why reactive drills belong late in a block, not in week one.

### 3.9 Reactive strength (`elastic-reactive`)

**What develops it.** Short-ground-contact rebounding: pogos, hurdle hops, bounds, depth jumps, repeated jumps. The quality is the ability to reverse from eccentric to concentric fast without losing force.

**How it is trained.** `ankle-hop` -> `pogo-hop` -> `alternating-pogo` / `single-leg-pogo` -> `rudiment-hop` / `low-hurdle-hop` -> `snap-down-rebound` -> `depth-jump` / `repeated-cmj`. The library gates `depth-jump` behind an explicit warning, correctly.

**How it is tested without lab equipment.** Reactive strength index needs contact time, which needs a mat or slow-motion video. The field proxy is the **countermovement jump versus 5-rebound continuous jump** comparison, or simply the "10-second pogo count at constant height" test: more contacts at the same height is more stiffness. Phone video at 240 fps makes contact time measurable but the analysis burden is real. Mark as approximate.

**Interactions.** Reactive strength is what separates a strong athlete who jumps 24 inches from a strong athlete who jumps 30. It is also the quality that most needs a landing base first, which is why the library's absorption branch feeds it.

### 3.10 Elasticity and stiffness (`ankle-stiffness`, `foot-ankle`)

**What develops it.** High-frequency, low-amplitude bouncing (ankle hops, pogos, jump rope, skipping), plus direct calf and tibialis work through full range.

**How it is trained.** `tibialis-raise`, `single-leg-calf-raise`, `ankle-hop`, `pogo-hop`, `line-hop`, `single-leg-pogo-hold`.

**How it is tested without lab equipment.** Single-leg calf raise to failure (reps at full range, per side) is the most useful and most under-used field test BodyT could offer: it is safe, needs nothing, exposes asymmetry, and is a genuine limiter for runners and jumpers. Secondary: 30-second double-leg pogo count at a fixed rope height.

**Interactions.** Stiffness is the transmission between the strength engine and the ground. It is also the quality that lets sprint mechanics hold up at speed. Under-trained ankles are why some strong people jump badly.

### 3.11 Work capacity (**missing from the enum**)

**What develops it.** Aerobic base plus repeated-effort tolerance: the ability to do the session and then do the next one. For team sports this is repeated-sprint ability on an aerobic foundation, not steady-state jogging alone.

**How it is trained.** BodyT already has the machinery: `plan/cardio.ts` with per-activity METs and modes, the `conditioningWeekday` anchor, and `week.cardio`. What it does not have is a sport-driven dose.

**How it is tested without lab equipment.** Any repeatable field test the user can redo: a 12-minute run distance, a 1-mile time, or (better for team sport) a repeated-sprint drop-off test, six by 20 yards on 30 seconds, scoring the percentage slower the last rep is than the first. Drop-off percentage is the number that actually means something for a footballer.

**Interactions.** Work capacity is the quality that most competes with the others for weekly time, and the one most often already covered by the sport itself. Section 7 is entirely about not double-counting it.

### 3.12 Mobility (**missing from the enum**)

**What develops it.** Loaded range work, positional holds, and the specific ranges a sport demands, not generic stretching.

**How it is trained.** BodyT has a `mobility` role and recipe, plus `MovementPattern = 'mobility'`.

**How it is tested without lab equipment.** Pass or fail positional screens the user can self-assess from a phone photo: overhead reach against a wall with the back flat (shoulder, for swimmers and overhead athletes), a deep squat hold with heels down (hip and ankle), a seated thoracic rotation reach (golf, baseball, tennis), and a half-kneeling hip flexor position (sprinters, cyclists).

**Interactions.** Mobility is the quality where sport-specific need is most real and most narrow. A golfer needs thoracic rotation and hip internal rotation. A swimmer needs shoulder flexion without lumbar extension. A hockey player needs hip range. Generic "mobility day" work serves none of them well; the sport answer should select the two ranges that matter.

---

## 4. SPORT NEEDS ANALYSIS

### 4.1 The repeatable template

Every sport gets exactly these eight fields. The template is deliberately small enough that a future session can add sport number 29 in ten minutes and large enough that the generator can act on every field.

1. **Movement demands.** The primary directions of force (vertical, horizontal, lateral, rotational, multi) and whether the sport is dominated by a small number of maximal actions or many submaximal ones.
2. **Energy systems.** Rough split of alactic (under 10 s), glycolytic (10 s to 2 min) and aerobic, expressed as a lead system and a support system. Never a percentage; the percentages in circulation are position- and level-dependent guesses.
3. **Sprint frequency.** How often, how far, and from what entry speed.
4. **Jump frequency and type.** Count per game, one-foot or two-foot, and whether landings are contested.
5. **Change of direction and deceleration frequency.** How often, at what angle, pre-planned or reactive.
6. **Contact.** None, incidental, or collision. Collision changes recovery arithmetic more than any other field.
7. **Common injury sites.** The two or three that drive prehab selection and the contraindication list.
8. **Seasonal structure and position differences.** Season shape, and whether position materially changes the profile (and if so, how).

Every profile ends with two machine-readable lines BodyT can consume directly: **quality weights** (the existing `SPORT_QUALITIES` list, upgraded to weights) and **guards** (what to deprioritise or gate).

**Ordering note.** The twelve profiles below are ordered by likely pick frequency among BodyT's users, which is a mix of participation numbers and who installs a training app. HOUSE HEURISTIC on the order; the content of each profile is sourced where marked.

### 4.2 Basketball

- **Movement.** Vertical-led, multi-directional, short bursts. Repetitive high-intensity jumping, sprinting and change-of-direction.
- **Energy.** Alactic lead, glycolytic support, aerobic base for recovery between efforts.
- **Sprint.** Very frequent, very short. Almost never a max-velocity exposure; 0 to 15 feet is the working range.
- **Jump.** High and repeated: roughly 40 to 60 jumps per game depending on position and style, with more than 50 explosive jumping actions reported in professional play (about one every 52 seconds). Mixed one-foot (layups, transition) and two-foot (rebounds, contested finishes). Landings are contested, so absorption on one leg matters.
- **COD and decel.** Constant, mostly reactive, mostly short-angle. The 505 and shuffle tests are the standard field assessments.
- **Contact.** Incidental to heavy, but not collision-scheduled.
- **Injuries.** Ankle (lateral sprain) is the highest-frequency site; knee (patellar tendon, and non-contact ACL on decel and landing) is the highest-cost. Neuromuscular prevention programmes are effective in other sports with early evidence of similar benefit in basketball (USAB-YOUTH recommendation 7).
- **Season and position.** Long season, high game density. Guard: acceleration, reactive agility, one-foot jumping off the dribble. Wing: mixed. Big: two-foot repeat jumping, absorption, and the strength to hold position. **This is the single position split with the clearest programming consequence in the whole list.**

**Weights (0 to 3):** `vertical-power` 3, `elastic-reactive` 3, `cod` 2, `reactive-agility` 2, `acceleration` 2, `force-absorption` 2, `foot-ankle` 2, `athletic-strength` 2, `deceleration` 2, `max-velocity` 0.
**Guards:** max-velocity work is near-useless here and costs the most; cap it. Ankle work is non-optional. Landing competency gates one-foot jumping.

### 4.3 Soccer

- **Movement.** Horizontal-led, high total volume, repeated accelerations and decelerations.
- **Energy.** Aerobic base is the largest single component with a decisive alactic overlay.
- **Sprint.** Frequent and short: MLS match data gives 9950 +/- 990 m total distance, 519 +/- 171 m high-speed running, 166 +/- 98 m sprint distance and 10 +/- 5 sprints per match; elite ranges are commonly cited at 10 to 13 km total. Sprints are typically 10 to 30 yards.
- **Jump.** Low frequency, mostly one-foot running jumps, contested headers for some positions.
- **COD and decel.** Very high. High-intensity decelerations occur more often than high-intensity accelerations.
- **Contact.** Incidental with tackles.
- **Injuries.** Hamstring (the sport's signature), groin/adductor, ankle, knee. The Nordic hamstring literature applies here and is contested (section 6.5).
- **Season and position.** Long season, one to two matches per week. Full backs and wide midfielders cover the most high-speed running and sprint distance (599 +/- 147 m and 225 +/- 98 m); central midfielders cover the most total distance (10510 +/- 1000 m). Keepers are a different sport: short reactive, lateral, absorption, upper-body.

**Weights:** `acceleration` 3, `sprint-hamstring` 3, `deceleration` 3, `cod` 2, `max-velocity` 2, `work-capacity` 3, `horizontal-power` 2, `lateral-power` 1.
**Guards:** in season, added conditioning is almost always wrong (section 7). Keeper profile replaces max-velocity and work-capacity with `reactive-agility` 3, `lateral-power` 3, `force-absorption` 3.

### 4.4 Football (American)

- **Movement.** Wildly position-dependent. This is the sport where a single quality profile is most wrong.
- **Energy.** Alactic lead with long rests. Almost no sustained aerobic demand in-play.
- **Sprint.** Skill positions: frequent, up to true max velocity on some plays. Line: rarely above 10 yards.
- **Jump.** Low, except specific roles.
- **COD and decel.** High for skill positions, moderate and heavily loaded for line.
- **Contact.** Collision, scheduled, every play. This changes everything about recovery.
- **Injuries.** Knee and ankle across the board; shoulder and hand for linemen; hamstring for skill positions.
- **Season and position.** Defined offseason, camp, season, and a real taper into playoffs. Position split is already in BodyT's `POSITIONS`: `Skill / back`, `Line`, `Both ways`.

**Weights, skill:** `acceleration` 3, `max-velocity` 2, `cod` 3, `deceleration` 3, `explosive-strength` 2, `sprint-hamstring` 3.
**Weights, line:** `athletic-strength` 3, `explosive-strength` 3, `horizontal-power` 3, `force-absorption` 2, `balance-stability` 2, `acceleration` 1, `max-velocity` 0.
**Guards:** the line profile is the pack's clearest case of a user goal that should NOT be converted into a vertical-jump plan. See fixture F2.

### 4.5 Baseball and softball

- **Movement.** Rotational-led, with short linear accelerations. Almost purely alactic.
- **Energy.** Alactic, long rests, no meaningful conditioning demand from play itself.
- **Sprint.** Short and frequent for position players (home to first is roughly 27 yards); base-stealing is an acceleration event.
- **Jump.** Minimal.
- **COD and decel.** Moderate: rounding bases, fielding.
- **Contact.** Incidental.
- **Injuries.** Elbow (ulnar collateral ligament) and shoulder for throwers; this is the sport where an external workload rule exists and must be respected.
- **Season and position.** Long season, near-daily games at higher levels. Position matters enormously: pitcher versus position player is the split, and BodyT's `POSITIONS` table does not currently include baseball at all.

**Workload rules (source: PITCHSMART).** Daily maximum pitches: 7-8 = 50; 9-10 = 75; 11-12 = 85; 13-14 = 95; 15-16 = 95; 17-18 = 105; 19-22 = 120. Required rest, ages 7-14: 1-20 pitches 0 days, 21-35 one day, 36-50 two days, 51-65 three days, 66+ four days. Required rest, ages 15-18: 1-30 zero days, 31-45 one, 46-60 two, 61-80 three, 81+ four. Ages 9-12 should take at least 4 months off from throwing per year with 2 to 3 continuous; ages 15-18 at least 4 months off from competitive pitching with 2 to 3 continuous months off all overhead throwing; ages 19-22 at least 3 months off competitive pitching with at least 4 continuous weeks off all overhead throwing. **Conflict recorded:** an older USA Baseball table still circulating (USAB-PITCH-OLD) gives ages 15-16 a 110 maximum and 17-18 a 120 maximum with different rest breaks, plus monthly caps and pitch-type-by-age rules. Where the two disagree, BodyT uses PITCHSMART and says which it is using.

**Weights, position player:** `rotational-power` 3, `acceleration` 3, `explosive-strength` 2, `coordination` 2, `athletic-strength` 2, `mobility` 2.
**Weights, pitcher:** `rotational-power` 3, `athletic-strength` 2, `mobility` 3, `balance-stability` 2, `work-capacity` 1, `max-velocity` 0, `vertical-power` 0.
**Guards:** BodyT does not count pitches and should not pretend to. What it CAN do is never schedule heavy overhead pressing or high-CNS lower-body work the day before or after a start, and surface the rest rule as information (section 9, fixture F4).

### 4.6 Tennis

- **Movement.** Lateral-led with a rotational overlay, repeated short efforts, long total duration.
- **Energy.** Alactic efforts on an aerobic base; matches are long but points are short.
- **Sprint.** Frequent, very short, almost always with a directional change inside them.
- **Jump.** Low, except the serve.
- **COD and decel.** The defining demand. Mostly reactive, mostly lateral, with open-stance braking on one leg.
- **Contact.** None.
- **Injuries.** Shoulder is the headline: professional players show a high prevalence of shoulder alterations across a season, and the three repeatedly identified risk factors are glenohumeral internal rotation deficit, rotator cuff strength (external rotators especially) and scapular dyskinesis. Also lateral elbow, lumbar spine, ankle.
- **Season and position.** Year-round with no true offseason for competitive players, which makes taper and deload logic more important, not less. No position split.

**Weights:** `lateral-power` 3, `reactive-agility` 3, `deceleration` 3, `rotational-power` 2, `cod` 2, `mobility` 2, `athletic-strength` 2.
**Guards:** with a shoulder history, overhead pressing is deprioritised in favour of horizontal pressing plus external rotation and scapular upward-rotation work, and the plan says why. See fixture F5.

### 4.7 Volleyball

- **Movement.** Vertical-led, more purely than any other common sport.
- **Energy.** Alactic, with long rests; conditioning demand from play is low.
- **Sprint.** Almost none.
- **Jump.** The sport. Very high count, mostly two-foot approach jumps for hitters and blockers, with repeated landings. Volleyball players average higher verticals than basketball players in comparative studies.
- **COD and decel.** Short, lateral, within a small court area.
- **Contact.** None, but landing on a foot under the net is the classic ankle mechanism.
- **Injuries.** Patellar tendon ("jumper's knee") is the signature overuse injury and it is a volume-of-landings problem; ankle sprains; shoulder for hitters.
- **Season and position.** Club and school seasons with tournament density. Position: setter versus hitter versus libero changes jump count substantially.

**Weights:** `vertical-power` 3, `elastic-reactive` 3, `force-absorption` 3, `lateral-power` 2, `coordination` 2, `ankle-stiffness` 2, `max-velocity` 0.
**Guards:** this is the profile most at risk of BodyT adding plyometric volume on top of an already enormous landing count. Practice jump volume must suppress added jumps (section 7).

### 4.8 Running (distance)

- **Movement.** Sagittal, cyclical, enormous volume of low-amplitude contacts.
- **Energy.** Aerobic, decisively.
- **Sprint.** Only as a training input, not a demand of the event (except the finish).
- **Jump.** None.
- **COD and decel.** None (trail running excepted).
- **Contact.** None.
- **Injuries.** Bone stress (tibia, metatarsal, femoral neck), Achilles, patellofemoral, plantar fascia. All volume-and-progression injuries.
- **Season and position.** Race-driven. This is the one profile where BodyT already has real structure: the `endurance` goal, `race-what`, `race-when`, `run-now`, and the 10%-per-week strategy line.

**Weights:** `work-capacity` 3, `foot-ankle` 3, `sprint-hamstring` 2, `elastic-reactive` 2, `sprint-mechanics` 2, `athletic-strength` 2, `vertical-power` 0, `cod` 0.
**Guards:** strength work here is injury insurance and running economy, not a second sport. Never let lifting volume compromise the long run. BodyT's existing endurance strategy lines already say this; the sport wiring should not contradict them.

### 4.9 Swimming

- **Movement.** Horizontal in water, upper-body-led propulsion, minimal ground contact.
- **Energy.** Event-dependent: 50 m is alactic, 100 to 200 m is glycolytic, 400 m and up is aerobic. The `POSITIONS` entry already asks Sprint / Distance / Mixed, which is the right question.
- **Sprint.** In-water only.
- **Jump.** Only the start. Dryland vertical power has a narrow, real role for starts and turns.
- **COD and decel.** Turns only.
- **Contact.** None.
- **Injuries.** Shoulder, overwhelmingly: prevalence up to 91% reported, with adolescent swimmers highest (91.3%), and roughly half of surveyed swimmers reporting shoulder pain, higher with age, experience and prior injury. Low back for butterfly and breaststroke.
- **Season and position.** Meet-driven with a strong taper tradition; swimming is where taper practice is most developed.

**Weights:** `athletic-strength` 2, `mobility` 3, `balance-stability` 2, `rotational-power` 1, `work-capacity` 2, `foot-ankle` 0, `cod` 0, `max-velocity` 0.
**Guards:** ground-based impact work is nearly pointless here and the shoulder is the whole ballgame. Overhead pressing volume should be low; pulling volume and scapular control should be high. Note BodyT's current profile for Swimming is `['rotational-power','athletic-strength','coordination','balance-stability']`, which does not mention the shoulder at all.

### 4.10 Combat sports (martial arts, boxing, wrestling)

- **Movement.** Rotational and multi-directional, with heavy isometric and grappling demands in the wrestling family.
- **Energy.** Glycolytic-led on an aerobic base; rounds are the unit.
- **Sprint.** None.
- **Jump.** None as a demand; useful as a training input.
- **COD and decel.** Constant, short, reactive.
- **Contact.** Collision, and in the striking family, head contact. BodyT must never program around concussion; it is a professional-care topic (this is R6's territory, cross-reference it).
- **Injuries.** Hands and wrists (striking), shoulders and neck (grappling), knees, ribs. Weight cutting is a real and dangerous adjacent behaviour.
- **Season and position.** Fight-camp shaped: a long general phase, a sharpening camp, a weight-making week, a fight, a layoff. `POSITIONS` already splits Striking / Grappling / Both.

**Weights:** `rotational-power` 3, `explosive-strength` 3, `athletic-strength` 3, `reactive-agility` 2, `work-capacity` 3, `balance-stability` 2, `max-velocity` 0.
**Guards:** if the user mentions making weight, nutrition rules dominate and BodyT should defer to R1's territory and refuse to help engineer a rapid cut. Grip and neck work matter more here than anywhere else, and BodyT's library has almost none of either.

### 4.11 Hockey (ice)

- **Movement.** Lateral-led with a deep hip position; skating is a lateral push, not a running gait.
- **Energy.** Alactic shifts on an aerobic base; 30 to 60 second shifts with full recovery on the bench.
- **Sprint.** On-ice only; off-ice sprinting transfers to the underlying qualities but not to skating mechanics.
- **Jump.** None as a demand.
- **COD and decel.** High, on edges.
- **Contact.** Collision in the checking codes.
- **Injuries.** Groin and adductor (the sport's signature), hip (including femoroacetabular impingement in long-term players), knee (MCL), shoulder, concussion.
- **Season and position.** Long season, high game density. `POSITIONS` splits Keeper / Defence / Forward, and the keeper profile is again a different sport: extreme hip range, reactive, lateral, low aerobic.

**Weights:** `lateral-power` 3, `acceleration` 2, `balance-stability` 3, `cod` 2, `athletic-strength` 3, `work-capacity` 2, `mobility` 3, `max-velocity` 0.
**Guards:** adductor and hip work is non-optional. Off-ice running volume should stay modest; the transfer is to qualities, not to skating.

### 4.12 Rugby

- **Movement.** Horizontal, collision-led, with repeated efforts.
- **Energy.** Glycolytic and aerobic in roughly equal measure with an alactic overlay.
- **Sprint.** Frequent for backs, less so for forwards; both up to high speeds in open play.
- **Jump.** Lineout only, and only for specific forwards.
- **COD and decel.** High, often into contact.
- **Contact.** Collision, repeated, the defining feature. Collision load is the recovery driver.
- **Injuries.** Shoulder, knee, head, hamstring, ankle.
- **Season and position.** Long season. `POSITIONS` splits Back / Forward, which is the correct minimum split.

**Weights, forward:** `athletic-strength` 3, `explosive-strength` 3, `force-absorption` 3, `work-capacity` 3, `acceleration` 2, `max-velocity` 0.
**Weights, back:** `acceleration` 3, `max-velocity` 2, `cod` 3, `deceleration` 3, `sprint-hamstring` 3, `athletic-strength` 2.
**Guards:** in-season lower-body volume must fall sharply. A collision game costs more recovery than any training session BodyT will ever write.

### 4.13 Golf

- **Movement.** Rotational, single maximal-intent action repeated with very long rests, plus hours of low-intensity walking.
- **Energy.** Alactic with an aerobic walking base.
- **Sprint, jump, COD, decel, contact.** None, none, none, none, none.
- **Injuries.** Low back is the signature: golf-related low back pain accounts for between 18% and 54% of documented ailments; 15 to 35% of amateurs and up to 55% of professionals report low back pain at some point, with annual prevalence commonly cited at 18 to 36% and recurrence as high as 55%. Also lead-side wrist and elbow.
- **Season and position.** Weather-driven seasons in most climates; no positions, and BodyT correctly does not ask (the `POSITIONS` table has no golf entry and `buildFollowups` has a comment saying "Asking a golfer their position is noise").

**Weights:** `rotational-power` 3, `mobility` 3, `balance-stability` 2, `athletic-strength` 2, `coordination` 2, everything else 0.
**Guards:** the plan should protect the lumbar spine, not train it as a rotator. Thoracic rotation and hip internal rotation are the target ranges; heavy loaded spinal rotation is contraindicated. Golf is also the profile most likely to be picked by an older user, so the strength work should read as general health work that happens to help the swing.

### 4.14 The gimmick line

Across all twelve, one rule holds and it is the rule that keeps this pack honest: **BodyT selects the QUALITY and the DIRECTION from the sport, and picks the drill from the library on merit.** It never invents a movement that imitates the sport skill. Young's transfer review is the citation: general strength work is useful for mass, soft-tissue robustness and core stability even when it is not movement-specific, while the specificity that actually transfers is direction and contraction velocity, not visual resemblance. Concretely, BodyT never programs: weighted bat or club swings, weighted-vest jump shooting, resisted swimming on land with bands as a strength exercise, punching with dumbbells, ankle weights for sprinting, or any drill whose justification is that it "looks like" the sport. Every one of those is a familiar seller and none of them survives the direction-and-velocity test.

---

## 5. WIRING THE SPORT ANSWER

This is the highest-value item in the pack because the data already exists. Nothing below requires new research, a new corpus, or a new screen. It requires the generator to read four answers it already collects.

### 5.1 The one-sentence insight

**`SPORT_QUALITIES` and `MOVEMENT.transfer` are two halves of the same dead bridge.** One says which qualities a basketball player needs. The other says which lifts feed which qualities. Neither is read. Joining them gives sport-aware exercise selection with zero new data:

```
sport -> weights over AthleticQuality
          |                        |
          v                        v
   ATHLETIC (drill pick)    transfersTo(quality) -> re-rank POOLS (lift pick)
```

Ship that join first. It is the smallest change that makes two different sports produce two different plans.

### 5.2 What a sport plus position answer should change, in five places

**(1) Quality emphasis weights.** `qualitiesForSport` currently returns an unordered `string[]`. Upgrade to `Partial<Record<AthleticQuality, 0 | 1 | 2 | 3>>`. Ordered lists cannot express "volleyball needs absorption as much as it needs vertical power, and needs max velocity not at all", which is exactly the distinction that changes a plan. A weight of 0 is a real instruction, not an absence.

**(2) Drill selection from the athletic library.** Today the explosive recipes hardcode six drill ids. Replace the fixed ids with quality slots resolved at build time:

- `pickDrill(quality, ctx)` filters `ATHLETIC` by: primary quality equals target (fall back to any-quality match), `level` rank at or below the athlete's athletic level, `impact` at or below the athlete's impact cap, equipment-legal via `canDo`, and `fresh` compatible with the slot's position in the session.
- Ties break deterministically on the existing `hashStr(userSeed + slotName)` pattern already used by `pickSlots`, so two users with the same sport get different but equally legal drills, exactly as the generator already does for strength slots.
- The result: a basketball plan's power day opens with a two-foot jump progression and a landing drill; a soccer plan's opens with a start and a deceleration drill; a baseball plan's opens with a rotational throw. Same recipe skeleton, different content, all from the existing library.

**(3) Strength slot re-ranking through `transfer`.** `pickSlots` currently orders `POOLS` by a per-goal `GOAL_FIRST` promotion and then a seeded rotation. Insert one step: score each legal candidate by the sum of the sport's weights over that movement's `transfer` array, and promote the highest scorer to block 1. A soccer player's `hamstring` slot promotes `nordic-curl` or `db-rdl` (both `transfer: ['sprint-hamstring']`); a basketball player's `squatVariation` promotes the entries carrying `vertical-power`; a lineman's promotes the entries carrying `athletic-strength` with the highest `fatigue`. This is a scoring function of about eight lines and it is the first ever consumer of `transfer`.

**(4) Session structure.** Weight-driven, not sport-name-driven:

- If the top-weighted quality is `fresh: true` in the library, it leads the session, before any strength work. The library already carries the flag; the generator already sorts `cns: true` recipes to specific weekdays. Connect them.
- One high-CNS quality per session, maximum two per week, which matches the existing `cnsWeekdays` anchor derived from `power` and `speed` roles.
- Absorption and landing work goes BEFORE the power work it gates in a beginner's plan and after it in an advanced plan. HOUSE HEURISTIC, but it follows directly from the landing-first rule in section 8.

**(5) Contraindicated and deprioritised work.** Two mechanisms already exist and are unused for this purpose:

- `MOVEMENT.stress: Joint[]` plus the sport's injury watch list. A tennis player with a shoulder history deprioritises everything with `stress: ['shoulder']` in the overhead-press family and promotes horizontal pressing and pulling.
- `AthleticMeta.impact` plus the sport's own impact exposure. A volleyball player in season already accumulates enormous landing volume; drills with `impact: 3` should be capped or removed, not added to.
- A weight of 0 means "do not program", not "program last". `max-velocity` at 0 for a basketball player should remove `max-velocity-sprint` from the speed recipe entirely, not sort it downward.

### 5.3 Weekly ordering around practice

The sport answer implies a week shape even before the user tells BodyT their schedule. Rules, all HOUSE HEURISTIC in their exact numbers but each following from a sourced principle:

- **High-CNS quality work never the day before a game or a competitive practice.** The existing `resolveDay` banner "Tomorrow is a max-effort speed day" already recognises this collision; it currently fires off `ballDates` after the fact instead of scheduling around it.
- **Heavy lower-body strength lands 48 to 72 hours after a collision game** for collision sports, and 24 to 48 hours after a non-collision game.
- **The day after a game is a mobility or upper-body day**, never a plyometric day.
- **Two games a week collapses the plan to one quality session plus one maintenance strength session**, and says so out loud. This is the in-season case and section 6 gives it the evidence.
- **Practice days count as the sport's own quality exposure.** A soccer player who trains twice and plays once has already had three deceleration exposures and does not need a fourth.

### 5.4 The unknown-sport path

`readStatement` already keyword-matches sport names from free text, and `sportOf` already returns the typed answer or the free-text one. Extend, do not fork:

1. Exact match on the 28 known keys.
2. Alias match on a small synonym table ("hoops" -> Basketball, "footy" and "soccer" -> the right one by region ambiguity, "BJJ" and "jiu jitsu" and "MMA" -> Martial arts / boxing, "ultimate" -> a horizontal running profile). HOUSE.
3. Otherwise `DEFAULT_SPORT_QUALITIES`, and the plan SAYS so in the user's own words: something like "I do not know korfball, so I built you a general athletic base: acceleration, strength, changing direction, balance. Tell me what it actually asks of you and I will bias it." Suggest-only, honest about uncertainty, and it preserves the north star that the app never pretends.

The existing test already covers this path (`qualitiesForSport('Korfball')` returns the default), so the guard is half written.

### 5.5 What ships first, in order

1. **Read the answer at all.** `generator.ts` takes `sport`, `sport-role`, `sport-level`, `in-season` off `goalAnswers` via `sportOf` and a new `positionOf`. One import, four reads. Nothing else changes yet. This alone kills the dead-export status of `sportOf`.
2. **Weights, and one strategy line per sport.** `deepGoalStrategy` gains a sport branch, which is the cheapest visible proof to the user that the answer landed. Every other goal answer already produces a line; sport should not be the exception.
3. **Slot re-ranking through `transfer`.** Eight-line scoring function. First consumer of `MOVEMENT.transfer`.
4. **Quality-resolved drill slots in the explosive recipes.** Bigger change, needs the fixtures in section 9 as regressions.
5. **`sportMode` set from the sport answer** instead of hardcoded `'generic'`, which switches on the ball-day machinery in `resolveDay` that is already written and already tested.
6. **Season state and practice load** (sections 6 and 7).

Steps 1 to 3 are one session's work and produce measurably different plans for two different sports, which is the guard test in section 10.

### 5.6 Fix the two adjacent bugs in the same pass

- `generator.ts:761` reads `a.goalAnswers?.['speed-now']`, a key no question produces. It should read `['sprint-feel'] === 'It has been years'`. Until then the sprint arm of `gentleExplosive` is unreachable.
- `scripts/personas.mjs:89` seeds `'sprint-feel': 'Smooth'` and `'speed-for': 'My sport'`, neither of which is a real option, so the simulation harness never exercises the branch either. Fix the persona to a real option value so the sims can catch this class of bug in future.

---

## 6. SEASONAL STRUCTURE

### 6.1 The five states and what changes

| State | Volume | Intensity | Quality emphasis | Notes |
|---|---|---|---|---|
| Offseason | Highest | Builds toward high | Max strength, work capacity, and whatever the needs analysis says is the biggest gap. Technical rebuild is cheapest here | The only window where a real training effect on max strength is available without competing with games |
| Preseason | High, falling | High | Shift from strength toward power, then toward speed and reactive work. Conditioning peaks early and tapers | The classic error is peaking conditioning in week one of season instead of week one of preseason |
| In season | Lowest | **Maintained** | Maintain everything, develop nothing except the one quality the athlete is worst at | The evidence below is unambiguous that intensity is the variable to protect |
| Competition taper | Sharply reduced | **Unchanged** | Whatever the event needs, in tiny sharp doses | Two weeks, volume down 41 to 60%, intensity and frequency held |
| Post-season | Near zero for 1 to 3 weeks, then rebuild | Low | Nothing. Tissue and motivation recovery | Then straight back to offseason |

### 6.2 The evidence on in-season maintenance dose

This is the best-evidenced part of the pack.

- **Frequency does not matter much when volume is equated.** Over 6 to 12 weeks in well-trained populations there was no meaningful difference between resistance-training frequencies at matched volume (lower body p = 0.651, g = 0.061; upper body p = 0.505, g = 0.088). The authors' own in-season conclusion: "There appears to be no clear difference between resistance-training frequencies when volume is equated, suggesting potential flexibility in resistance-training prescription across a micro-cycle." Practical read: a congested week can be one session or three, whichever the athlete can actually attend.
- **Lower volume is not worse.** In team-sport players, higher versus lower volume produced a non-significant overall difference (ES -0.05, 95% CI -0.19 to 0.09, p = 0.506) and non-significant per-outcome differences across vertical jump (0.04), horizontal jump (0.01), 10 m sprint (-0.22), 20 to 40 m sprint (0.03), change of direction (-0.04) and maximal strength (-0.08). Practical read: cutting in-season volume roughly in half is not a compromise, it is the plan.
- **Intensity is the variable that must survive the cut.** The minimal-dose literature is consistent that high relative load and high effort matter more than accumulated volume for maintaining performance.
- **Plyometric maintenance is cheap.** A minimal effective plyometric dose is around 2 sessions per week for 4 weeks, and roughly 92 weekly jumps has been reported as sufficient to produce fitness and sport-specific benefits, with benefits reported in season as well as preseason. So an in-season jumper needs about 90 quality contacts a week, not 300.

**BodyT's in-season prescription (HOUSE synthesis of the above).** Two sessions per week. Each session: one heavy compound at in-season intensity for 2 to 3 hard sets, one directional power or plyometric block of about 40 to 50 contacts, one prehab item drawn from the sport's injury watch list, done. Total under 40 minutes. Zero added conditioning unless the user logs no practice at all.

### 6.3 Taper

The canonical prescription: a 2-week taper with training volume decreased exponentially by 41 to 60%, with **no modification of either training intensity or training frequency** (27 of 182 studies, Bosquet et al. 2007). Modern endurance replications agree in shape.

Translated for BodyT: in taper mode, keep the same days, keep the same top-set loads, cut set counts and drill contacts by about half, and keep the sharp work sharp. The one thing the plan must not do is what most people do, which is take the last week off entirely and arrive flat. The copy should say that plainly.

BodyT already has the machinery for this: blocks, deload weeks (`isDeload`, `blockMathFor`) and phase logic. A taper is a deload with the intensity protected instead of dropped, which is a small variant on an existing shape rather than a new system.

### 6.4 Asking about season state without a questionnaire

The `in-season` question exists and is unread. But asking once at onboarding is the wrong shape anyway, because seasons change and onboarding does not repeat. Four sources, in order of preference:

1. **Infer from logged play.** `week.ballDates` and the sport activities in `cardio.ts` already record games. Two or more intense sport logs per week for three consecutive weeks is in season. Zero for four weeks is offseason. One to two per week with rising frequency is preseason. This is free, it is deterministic, it updates itself, and it needs no question. HOUSE HEURISTIC on the exact thresholds.
2. **Infer from the calendar for school-shaped sports.** Only if the user has stated a level of "Club or school". Weak, region-dependent, and it should never override observed logs. Flag as low confidence.
3. **Read it from what they typed.** `readStatement` already keyword-matches; "season starts in March", "playoffs", "offseason", "preseason", "we just finished" are all cheap matches into the same answer key.
4. **Ask once, then never again unless the inference disagrees.** Keep the existing `in-season` question, but make it a confirmation of the inference rather than a cold question: the app's own north star is that it asks only questions whose answers would change the plan, and it never re-asks.

**The suggestion, not the switch.** When the inference flips, BodyT suggests: "Looks like your season started, you have played twice a week for three weeks. Want me to switch to the in-season plan? Less volume, same intensity, legs saved for games." One tap, reversible, evidence stated. That is the `engine/calibration.ts` pattern the repo already treats as the proven shape.

### 6.5 Where the evidence is thin, stated plainly

- **The Nordic hamstring case.** The famous meta-analysis (15 studies, 8459 athletes, 525 injuries) reported an injury risk ratio of 0.49 (95% CI 0.32 to 0.74, p = 0.0008) for programmes including the Nordic hamstring exercise, which is where the "halves hamstring injuries" line comes from. A methodological reappraisal then found that more appropriate study selection and reanalysis accounting for between-study heterogeneity did not replicate the result, concluding that the protective effect "so far remains inconclusive". **BodyT should still program eccentric hamstring work for sprint-heavy sports, because the mechanistic and adherence arguments hold and the cost is near zero, but it must never tell a user that it halves their injury risk.** Copy: "Hamstring work like this is standard for sprinting sports. The research on how much it prevents injuries is genuinely mixed, so I am not going to promise you a number."
- **Plyometric contact counts.** The 80-100 / 100-120 / 120-140 beginner-intermediate-advanced bands are teaching convention repeated across coaching bodies, not the output of a dose-response trial, and a more conservative variant puts beginners at 50 to 80. Use them as a ceiling, not a target, and mark them house-adopted.
- **Force-velocity profiling.** The concept is sound and the individualisation logic (velocity-deficient athletes get max-velocity work, force-deficient athletes get horizontal strength) is directly usable. The MEASUREMENT is the problem for BodyT: the accessible method is reliable (ICC > 0.90, CV < 5.5%) but biased against force plates, overestimating mean force by 0.5 to 4.5% and underestimating mean velocity by 11.8 to 16.8% and mean power by 2.3 to 7.9%, with jump-height estimation inflating V0 and Pmax. **BodyT should adopt the LOGIC of force-velocity profiling without ever printing an F-V number.** The eccentric utilisation ratio and the squat-strength-versus-jump-height comparison in section 3 give the same routing decision using two measurements the app can honestly take.
- **Acute versus chronic workload.** The idea that a rapid rise in this week's load against the recent 4-week average raises injury risk is widely used and widely criticised on methodological grounds (spurious correlation, arbitrary ratio construction, and the coupling of numerator and denominator). BodyT should use the DIRECTION of the idea (do not spike, progress gradually) and must never print a ratio or a threshold number to a user as if it were a diagnosis. The claim in this pack is deliberately limited to "do not raise it fast", which survives the criticism.
- **Change-of-direction deficit.** Theoretically the right measure, marginal sensitivity to real change, judged unsuitable in at least one elite youth football sample. Use 505 asymmetry instead.
- **Sport-quality profiles themselves.** The twelve profiles in section 4 are informed by match-demand data where it exists (soccer and basketball are well quantified) and by coaching consensus where it does not (surfing, dance, climbing). Every profile should carry a confidence field so the app can be honest about which ones are guesses.

---

## 7. SPORT PRACTICE AS LOAD

### 7.1 The problem

A user who plays two games and trains twice a week has already done more accelerating, decelerating, cutting, jumping and conditioning than any plan BodyT will write. If the plan does not know about it, the plan is additive on top of a full week, and additive is how people get hurt and how they quit. This is the single most common failure mode of a fitness app applied to an athlete.

### 7.2 What BodyT already has

More than expected, all of it built and none of it switched on for real users:

- `PlanConfig.sportMode: 'ball' | 'generic'`, hardcoded `'generic'` at `generator.ts:930` and `bookletOps.ts:126`, set to `'ball'` only in the owner's own preset at `presets/naod.ts:70`.
- `WeekState.ballDates: ISODate[]`, toggled by `logic/actions.ts:503` and `logic/cardioActions.ts:73`.
- `engine/resolveDay.ts` reads both: `ballDates` suppresses the whole week's scheduled conditioning (`week.cardio && week.cardio.weekdays.includes(weekday) && week.ballDates.length === 0`), raises a "that's this week's conditioning, do not stack" banner, and raises a second banner on the eve of a CNS day.
- `plan/cardio.ts` classifies logged activities as intense play per mode: basketball games vs shooting around, soccer match vs kickaround, tennis singles vs rally, football tackle vs throwing around, hockey game vs skate, combat sparring vs bag work, volleyball beach/competitive vs casual. `isIntenseSport(activityId, mode)` is the accessor and it is already unit-tested.

So the plumbing exists and the generator simply never opens the valve.

### 7.3 The model: practice as quality exposure, not just calories

Extend the existing ball-day concept from a boolean into a small typed exposure. Each logged sport session, or each declared recurring practice, contributes an exposure vector over the same `AthleticQuality` space:

```
PracticeExposure = Partial<Record<AthleticQuality, 0 | 1 | 2 | 3>> + minutes + intensity
```

The sport profile from section 5 supplies the default vector, so a logged "Basketball, running games, 90 min" writes `vertical-power 3, cod 3, reactive-agility 3, acceleration 2, force-absorption 3, work-capacity 3` without asking the user anything. `isIntenseSport` already decides whether the mode counts.

Then the suppression rules, all suggest-only:

- **Conditioning.** Any intense sport log in the week suppresses scheduled conditioning entirely. This rule already exists in `resolveDay` and simply needs `sportMode` set correctly to apply to non-owner users.
- **Plyometric and jump volume.** Each intense session of a jump-heavy sport (basketball, volleyball, netball) subtracts from the week's programmed contact budget. Two games in a week should take the programmed jump work to a maintenance floor, not zero: the floor exists because quality landing practice under supervision is different from 200 uncontrolled landings in a game. HOUSE HEURISTIC on the arithmetic; the in-season plyometric evidence in 6.2 supports keeping about two short sessions.
- **Sprint exposure.** Each intense session of a sprint-heavy sport (soccer, rugby, football, lacrosse) counts as at least one near-maximal exposure. This matters because the hamstring evidence counts EXPOSURES, not metres: 7 to 8 weekly efforts above 90% of max velocity was where eccentric hamstring strength declined, against a squad mean under 1 exposure per week. A footballer playing twice and training twice is already near the top of that range before BodyT adds anything.
- **COD and deceleration.** Suppress added reactive agility work in weeks with two or more competitive sessions. The sport is the reactive agility training, and it is better at it than any drill.
- **Strength.** Do NOT suppress. This is the asymmetry that matters: the sport provides the speed, jumping, cutting and conditioning stimulus and provides almost no strength stimulus. In-season strength work is the thing that should survive a congested week, and the evidence in 6.2 says a low-volume, high-intensity dose is sufficient.

### 7.4 Practices the user never logs

Most users will not log practice, and asking them to log every practice is a losing battle. Three graceful degradations, in order:

1. **Ask once, in the sport follow-up, in one question.** "How many times a week do you play or practise?" with chips 0 / 1 to 2 / 3 to 4 / 5+. That single answer sets a standing weekly exposure baseline for the whole plan and needs no ongoing logging. It belongs next to `sport-level` in the existing question bank, and it is the highest-value question BodyT is not asking.
2. **Infer from what does get logged.** Cardio entries with sport activity ids, plus the `ballDates` toggle, plus the existing "played today" flow.
3. **Notice the shape of adherence.** A user who consistently misses the Thursday session and reports fatigue on Fridays is telling you when practice is. Surface it as a suggestion, never a silent change: "You have skipped Thursday four weeks running. Is that a practice night? I can move the hard session."

### 7.5 The copy rule

Everything here is suggest-only and every suppression states its evidence, because a suppressed session looks like a broken app unless the reason is visible. The existing banner is the right voice: "Ball logged today, that's this week's conditioning. Don't stack extra cardio on top." Keep that register, drop the apostrophe-free contractions only where house style demands, and never use an em dash.

---

## 8. READINESS AND PROGRESSION FOR HIGH-CNS WORK

### 8.1 What the library already encodes

`AthleticMeta` carries `impact: 0 | 1 | 2 | 3`, `cns: 0 | 1 | 2 | 3`, `fresh: boolean`, `level`, `regressions`, `progressions` and free-text `warning`. Thirteen drills in the merged map carry `cns: 3` and sixteen carry `impact: 3`. Fifty-six of ninety-one entries in `athletic.ts` plus eight of nine coverage drills carry `fresh: true`. The data is there. What is missing is a gate: nothing stops a brand-new user's plan containing a `cns: 3` drill, because nothing reads `cns` at generation time at all.

### 8.2 Landing competency gates

The rule the coverage file already states in prose should become a rule the generator enforces: stopping before cutting, landing before jumping, two feet before one.

Proposed gates, expressed as things the user has actually done in the log rather than things they claim:

| Gate | Unlocks | Requirement |
|---|---|---|
| G1 Two-foot landing | `depth-drop`, `box-jump`, `broad-jump-stick` | 3 sessions of `snap-down-stick` or `jog-to-stop` logged, no pain flag |
| G2 Two-foot braking | `decel-stick`, `plant-and-go`, `cut-45` | G1, plus 2 sessions of `jog-to-stop` or `decel-to-backpedal` |
| G3 One-foot landing | `single-leg-broad-jump`, `lateral-bound-stick`, `one-foot-jump` | G1, plus 3 sessions of `single-leg-landing`, plus a single-leg calf-raise count above a floor |
| G4 Reactive elasticity | `low-hurdle-hop`, `snap-down-rebound`, `repeated-cmj` | G1, plus 4 sessions of `pogo-hop` family |
| G5 Shock method | `depth-jump`, `single-leg-bound`, `flying-20` | G3 and G4, plus a stated base of months not weeks, plus no current lower-limb pain flag |

These map exactly onto the `regressions` arrays already in the data, so the gate is mostly a matter of requiring the regression to have been LOGGED rather than merely to EXIST. HOUSE HEURISTIC on the session counts; the ordering is the library's own and is well supported by the plyometric progression consensus (bilateral before unilateral, master landing before adding intensity, 48 to 72 hours between plyometric sessions).

### 8.3 Plyometric contact progression

Contacts are the unit. Weekly ceiling by athletic level, adopting the teaching-consensus bands as CEILINGS and starting well below them:

| Level | Per session ceiling | Sessions per week | Weekly ceiling |
|---|---|---|---|
| Foundation | 60 | 2 | 120 |
| Intermediate | 100 | 2 | 200 |
| Advanced | 120 | 2 to 3 | 300 |
| In season, any level | 50 | 2 | 100 |

The in-season row is set from the minimal-effective-dose finding of roughly 92 weekly jumps, rounded to 100. The other rows sit at or below the commonly cited bands (beginner 80 to 100, intermediate 100 to 120, advanced 120 to 140) because those bands assume a supervised athlete and BodyT's user is alone in a park. Progression: no more than about 20% week on week, and never a week that both raises contacts and introduces a new gate. HOUSE HEURISTIC on the percentage; sourced on the bands.

Contacts should be counted from the library rather than guessed: `AthleticProgram.sets` and `reps` are already strings like `'3-4'` and `'10-12'`, so a small parser gives a per-drill contact estimate. That parser is also what makes the ceiling enforceable rather than decorative.

### 8.4 Sprint exposure progression

The evidence is unusually specific and it counts EXPOSURES above a percentage of max, not distance.

- Professional footballers showed a significant decline in eccentric hamstring strength at 7 to 8 weekly efforts above 90% of maximum velocity versus 0 to 2 and 5 to 6 efforts, with weekly sprint distance (squad mean 212 +/- 189 m) showing no relationship. Squad mean exposures above 90% were 0.96 +/- 1.39 per week; above 95% they were 0.02 +/- 0.14, too rare to analyse.
- Exposure is U-shaped: too little leaves tissue underprepared, too much or too rapidly progressed precipitates injury, and the specific risk is a rapid rise in this week's high-speed running against the recent 4-week average.

**BodyT's rule (HOUSE synthesis, sourced inputs).** Count near-maximal sprint exposures per week, where one exposure is one rep at or above roughly 90% effort. Cap at 6 per week for a trained athlete, 4 for intermediate, 2 for someone returning. Include the sport's own exposures from section 7. Never raise the weekly count by more than about 30% over the trailing 4-week average. Any true `max-velocity` drill costs its exposures at face value; acceleration work under 20 yards costs half an exposure each because peak velocity is never reached. Copy for the user is in reps and feel, never in percentages of max velocity, which BodyT cannot measure.

### 8.5 How this interacts with `cns` and `gentleExplosive`

`cns` should become a real budget rather than a label:

- Weekly CNS budget by level: foundation 3 points, intermediate 5, advanced 7. A drill costs its `cns` value; a heavy top-set day costs 2 (HOUSE). The generator already knows which weekdays are CNS days (`cnsWeekdays`); making the budget explicit is what stops a five-day explosive plan quietly containing four `cns: 3` drills.
- `fresh: true` becomes an ordering constraint the generator enforces rather than a note the guide sheet prints.
- `gentleExplosive` should widen from "drop one set" into "drop one level". Today it subtracts a set from `jump` and `sprint` kind entries with `sets >= 3`. Better: when the athlete is new to jumping or years off sprinting, resolve every athletic slot one `level` lower and one `impact` lower, which the library supports natively through `regressions`. That is a more honest intervention than removing a set from a drill the athlete should not be doing at all.
- And fix the key bug at `generator.ts:761` (`speed-now` should be `sprint-feel`), or the whole sprint arm of this never fires.

### 8.6 Pain and the hard stop

Everything in this section is subordinate to R6's safety tiers. A current lower-limb pain flag removes all `impact >= 2` drills and all gates above G1 until it clears; it does not merely reduce them. The library's own `single-leg-rdl-hop` warning is the right instinct in the right voice: "Skip it entirely on any hamstring that is currently sore. Lengthened load on an irritated hamstring is how a niggle becomes a tear."

---

## 9. EVAL FIXTURES

Twenty fixtures. Each is written as Given / Expect / Fail if, so it converts to a Vitest case with minimal translation. Answer keys are the real ones from `followups.ts`. Several are deliberately written against behaviour that does not exist yet; those are the specification, and they should fail today.

**F1. Basketball guard who wants a vertical.**
Given: `goal: 'vertical'`, statement "want to dunk by summer", `vert-now: 'Touch it'`, `jump-history: 'A bit'`, `jump-for: 'Basketball'`, `sport: 'Basketball'`, `sport-role: 'Guard'`, `sport-level: 'Club or school'`.
Expect: explosive family; `VERT_LADDER` stages from touch-the-rim to grab-the-rim (not to dunk in twelve weeks); one-foot jump progression present because a guard jumps off one foot from a run; `penultimate-drill` and `approach-jump` reachable; ankle and calf work present; `max-velocity-sprint` ABSENT (weight 0 for basketball); at least one landing drill present; strategy text names basketball.
Fail if: the plan is identical to a volleyball player's; `max-velocity-sprint` appears; the ETA promises the dunk inside the noise floor.

**F2. Lineman who wants to be immovable.**
Given: `goal: 'strength'` or free text "I play D-line, want to be impossible to move", `sport: 'Football'`, `sport-role: 'Line'`, `sport-level: 'Competitive'`.
Expect: `athletic-strength` and `explosive-strength` lead; heavy bilateral compounds first; horizontal power (`sled-push`, `hip-thrust`) present; short acceleration present; `max-velocity` absent; bodyweight target is NOT a cut; nutrition leans surplus not deficit; vertical-jump content minimal.
Fail if: BodyT converts "immovable" into a vertical-jump plan, prescribes a calorie deficit, or programs `flying-20`. This fixture exists because relative strength and absolute strength point in opposite directions and the app currently has no way to tell them apart.

**F3. Soccer player in season, two games a week.**
Given: `goal: 'speed'`, `sport: 'Soccer'`, `sport-role: 'Midfield'`, `in-season: 'In season'`, practice frequency 3 to 4, two intense soccer logs in each of the last three weeks.
Expect: two gym sessions per week maximum; each is short, heavy-ish, low volume; ZERO added conditioning; sprint exposures counted as already met by matches; hamstring eccentric work present; reactive agility work suppressed; deceleration work kept but low; no CNS session on the day before either game; a visible line explaining that the plan got smaller on purpose.
Fail if: the plan schedules conditioning, adds a max-velocity day, or keeps offseason volume.

**F4. Baseball pitcher.**
Given: free text "I pitch varsity, want more velo", `sport: 'Baseball / softball'`, age 16, `in-season: 'In season'`.
Expect: rotational power and mobility lead; no heavy overhead pressing the day before or after a start; no lower-body CNS work within 24 h of a start; the plan surfaces the Pitch Smart rest rule as INFORMATION, quoting the age band, and states which guideline it is using; it does not attempt to count pitches or issue a medical opinion; strategy line says arm care is the point.
Fail if: BodyT prescribes weighted-ball or long-toss protocols (out of scope, higher risk, needs a coach), claims to track workload, or cites the superseded USA Baseball numbers.

**F5. Tennis player with a shoulder history.**
Given: `sport: 'Tennis'`, `injuries: 'Shoulders'`, `sport-level: 'Club or school'`.
Expect: everything with `stress: ['shoulder']` in the vertical-press family deprioritised; horizontal pressing and pulling promoted; external rotation and scapular work added; lateral power, deceleration and reactive agility still lead the athletic side; rotational throws kept but started at the foundation level; copy states the substitution reason without naming a diagnosis.
Fail if: the plan contains `standing-ohp` in block 1, or drops all upper-body work, or says anything diagnostic.

**F6. Sprinter in the offseason.**
Given: `goal: 'speed'`, `sport: 'Track & field'`, `sport-role: 'Sprints'`, `in-season: 'Off season'`, `sprint-feel: 'Fine'`, `sprint-space: 'Track or field'`.
Expect: the one profile where `max-velocity` genuinely leads; max strength volume at its highest; acceleration and max-velocity separated across the week; hamstring work heavy and eccentric; weekly near-maximal exposures capped at 6 and progressed no faster than about 30% over the trailing average; `flying-20` reachable only through the gates in section 8.
Fail if: max-velocity work is scheduled on consecutive days, or exposures are uncapped, or the plan looks like a general explosive plan.

**F7. General-fitness user who plays pickup basketball on Sundays.**
Given: `goal: 'general'`, statement "just want to feel better, I play pickup ball on Sundays", `sport` inferred as Basketball by `readStatement`, `sport-level` absent, practice frequency 1.
Expect: the plan stays a general plan. Sport influences it lightly: ankle and landing work appear, Monday is not a heavy lower day, conditioning is reduced on weeks Sunday ball is logged. It does NOT become an athletic development programme.
Fail if: a casual mention converts a general-health user into an explosive family plan. This is the over-triggering fixture and it is as important as the under-triggering ones. The `sport-level` answer is what separates F7 from F1 and it must be allowed to be absent.

**F8. A sport BodyT has never heard of.**
Given: `sport: 'Something else'`, `sport-other: 'korfball'`.
Expect: `DEFAULT_SPORT_QUALITIES` applied; a coherent general athletic plan; the coach text names korfball and says plainly that BodyT does not know the sport and has built a general base, and invites a correction. No crash, no empty plan, no silent fallback.
Fail if: the app pretends to know, or produces the identical text it would give a known sport.

**F9. Volleyball middle in season.**
Given: `sport: 'Volleyball'`, `in-season: 'In season'`, practice 4+, jump-heavy.
Expect: programmed plyometric contacts drop to the in-season floor of about 100 per week; landing and absorption work retained; added vertical jump volume suppressed with a stated reason; patellar-tendon-friendly ordering; strength retained.
Fail if: BodyT adds a jump day on top of four practices.

**F10. Soccer keeper.**
Given: identical to F3 except `sport-role: 'Keeper'`.
Expect: a materially different plan from the midfielder: `reactive-agility`, `lateral-power` and `force-absorption` lead; `work-capacity` and `max-velocity` drop to near zero; upper-body and landing volume rise.
Fail if: keeper and midfielder produce the same booklet. This is a direct guard test for the position table.

**F11. Golfer, 52, previous low back trouble.**
Given: `sport: 'Golf'`, `injuries: 'Lower back'`, age 52, `goal: 'general'`.
Expect: rotational power present but through throws, never loaded spinal rotation; thoracic and hip mobility promoted; `stress: ['lower-back']` movements deprioritised (`romanian-deadlift`, `good-morning`) in favour of hinge regressions; no impact work; the plan reads as health-first.
Fail if: the plan contains loaded rotation, or heavy conventional hinging in block 1, or treats golf as an explosive sport.

**F12. Distance runner who also wants to lift.**
Given: `goal: 'endurance'`, `race-what: 'Half marathon'`, `race-when: 'Under 3 months'`, `sport: 'Running'`, `run-now: '10 to 25'`.
Expect: running structure dominates; lifting is two short sessions positioned away from the long run and the quality run; calf, foot and hamstring work present; plyometric volume very low and low-impact; the existing 80/20 and 10%-per-week strategy lines are preserved and NOT contradicted by the sport wiring.
Fail if: the sport wiring overrides the endurance goal's structure, or adds jump volume to a runner three months out.

**F13. Swimmer three weeks from a meet.**
Given: `sport: 'Swimming'`, `sport-role: 'Sprint'`, competition date known, `in-season: 'In season'`.
Expect: taper triggered at two weeks out; set counts cut roughly in half; top-set loads and session frequency unchanged; dryland impact work removed; shoulder mobility and scapular work retained; a copy line explaining that the last week is not a week off.
Fail if: the plan zeroes the last week, or reduces intensity, or changes the training days.

**F14. Hockey player, minimal equipment, nowhere to sprint.**
Given: `sport: 'Hockey'`, `sport-role: 'Forward'`, `equipProfile: 'minimal'`, `sprint-space: 'Nowhere really'`.
Expect: lateral power delivered through bodyweight bounds and skaters rather than sled work; hip and adductor work present; every drill equipment-legal via `canDo`; the existing "no space means hills and gym work" strategy line fires; plan still resolves with zero missing exercises.
Fail if: the plan contains a sled, or fails to resolve, or silently drops lateral work because the preferred drill was illegal.

**F15. Rugby forward, congested week.**
Given: `sport: 'Rugby'`, `sport-role: 'Forward'`, two matches logged in seven days, `in-season: 'In season'`.
Expect: one strength session survives; all plyometric and reactive work suppressed; conditioning zero; the day after each match is mobility or upper-body only; the plan explains that collisions cost more recovery than any session it could write.
Fail if: the plan keeps two lower-body sessions, or schedules anything with `impact: 3`.

**F16. Fourteen-year-old who plays three sports.**
Given: age 14, `sport: 'Basketball'`, plus free text mentioning soccer and track, `sport-level: 'Club or school'`.
Expect: broad motor-skill and strength emphasis over specialisation; no `cns: 3` drills; landing and coordination work prominent; total weekly load conservative; copy explicitly supportive of playing several sports rather than picking one, matching the NSCA pillar on early sampling and the USA Basketball recommendation to delay single-sport specialisation until at least 14.
Fail if: BodyT writes a specialised programme, or programs shock-method plyometrics, or encourages dropping the other sports.

**F17. Combat athlete making weight.**
Given: `sport: 'Martial arts / boxing'`, `sport-role: 'Both'`, statement mentions "cutting to 155 for a fight in five weeks".
Expect: BodyT declines to engineer a rapid cut, defers to the nutrition rules and to professional guidance, keeps strength and power maintenance, reduces volume into fight week, and never produces an aggressive dehydration or crash-deficit plan. Copy is kind and non-alarmist.
Fail if: the app produces a rapid weight-cut protocol of any kind. Cross-reference R6 and R1.

**F18. Returning athlete, years off sprinting.**
Given: `goal: 'speed'`, `sprint-feel: 'It has been years'`, `sport: 'Soccer'`.
Expect: `gentleExplosive` fires; every athletic slot resolves one level lower; near-maximal exposures capped at 2 per week; `relaxed-stride` and `a-skip` present before anything flying; the strategy line about a runway appears AND the programming actually changes.
Fail if: the strategy line appears but the plan is unchanged, which is exactly the current behaviour caused by the `speed-now` key bug at `generator.ts:761`. This fixture is the regression for that bug.

**F19. Divergence guard: two sports, everything else identical.**
Given: two `OnboardingAnswers` identical in goal, days, equipment, experience, bodyweight and seed, differing only in `sport` (`'Basketball'` versus `'Soccer'`).
Expect: the generated `PlanConfig` objects differ in at least: the set of athletic exercise ids programmed, the block-1 pick for at least one strength slot, and the strategy text. A structural diff, not just a string diff.
Fail if: the plans are identical. **Today they are identical, and that is the entire finding of this pack.**

**F20. Position guard: one sport, two positions.**
Given: two identical answer sets differing only in `sport-role` (`'Guard'` versus `'Big'` for Basketball; repeat for Soccer `'Keeper'` versus `'Midfield'`).
Expect: at least one differing athletic exercise id and at least one differing quality weight in the plan's stored rationale.
Fail if: identical. Today they are identical.

---

## 10. INTEGRATION NOTES

### 10.1 The typed shape, extending `followups.ts` rather than forking it

`followups.ts` already owns `SPORTS`, `SPORT_QUALITIES`, `DEFAULT_SPORT_QUALITIES`, `qualitiesForSport`, `POSITIONS` and `sportOf`. The extension keeps every one of those names and grows them in place. It does NOT create a parallel `sports.ts` with a second list, which is the failure mode the repo's own owner rule warns about.

```ts
// plan/followups.ts, extended in place. Types only, no logic shown.

export type SportId = (typeof SPORTS)[number]          // already exists
export type QualityWeight = 0 | 1 | 2 | 3
export type SportContact = 'none' | 'incidental' | 'collision'
export type EnergyLead = 'alactic' | 'glycolytic' | 'aerobic'
export type SeasonState = 'offseason' | 'preseason' | 'in-season' | 'taper' | 'post-season'

export interface SportProfile {
  /** Replaces the string[] in SPORT_QUALITIES. 0 is a real instruction. */
  weights: Partial<Record<AthleticQuality, QualityWeight>>
  energyLead: EnergyLead
  contact: SportContact
  /** What the sport itself already trains, per intense session. Feeds section 7. */
  practiceExposure: Partial<Record<AthleticQuality, QualityWeight>>
  /** Joints the needs analysis says to watch. Joins MOVEMENT.stress. */
  injuryWatch: Joint[]
  /** Never program these for this sport, even if a goal asks. */
  deprioritise?: AthleticQuality[]
  /** 'ball' switches on the existing resolveDay practice machinery. */
  sportMode: 'ball' | 'generic'
  /** An external governing-body rule the app surfaces but never enforces. */
  externalWorkload?: 'pitch-smart'
  /** How confident this profile is. Sourced sports differ from guessed ones. */
  confidence: 'source' | 'house'
  positions?: Record<string, PositionOverride>
}

/** A position edits the base profile; it never replaces it. */
export interface PositionOverride {
  weights?: Partial<Record<AthleticQuality, QualityWeight>>
  practiceExposure?: Partial<Record<AthleticQuality, QualityWeight>>
  injuryWatch?: Joint[]
  note?: string
}

export const SPORT_PROFILES: Record<SportId, SportProfile>
export function profileForSport(sport: string | null, position?: string | null): SportProfile
export function positionOf(answers: Record<string, string>): string | null
```

Migration notes that keep this cheap:

- `SPORT_QUALITIES` becomes a derived export: `Object.fromEntries(entries(SPORT_PROFILES).map(([k, p]) => [k, orderedKeys(p.weights)]))`. Every existing test keeps passing untouched, which is what makes this a safe first commit.
- `qualitiesForSport` keeps its exact signature and return type and simply reads the new table. `DEFAULT_SPORT_QUALITIES` becomes the `weights` of a `DEFAULT_SPORT_PROFILE`.
- `POSITIONS` becomes derived from `Object.keys(profile.positions ?? {})`, so the question bank keeps working and there is exactly one source of truth for which sports have positions.
- Two values get added to `AthleticQuality` in `athletic.ts`: `work-capacity` and `mobility`, with `QUALITY_LABELS` entries. `movement.test.ts` line 233 already asserts every declared transfer is a quality the athletic library knows, and line 301 flags qualities with fewer than 2 drills, so adding the values without adding drills WILL bite. That is correct behaviour: add the drills, or accept the guard's complaint and record why.
- Baseball needs a `positions` entry (`Pitcher`, `Position player`, `Catcher`) which the current `POSITIONS` table lacks despite baseball being one of the most position-divergent sports in the list.

### 10.2 Which engines consume it

| Consumer | Reads | Does what |
|---|---|---|
| `plan/generator.ts` `pickSlots` | `weights` plus `MOVEMENT.transfer` | Re-ranks `POOLS`, promotes the highest-transfer legal candidate to block 1 |
| `plan/generator.ts` `RECIPES` build | `weights`, `ATHLETIC`, athlete level and gates | Resolves quality slots to real drill ids instead of hardcoded ids |
| `plan/generator.ts` `deepGoalStrategy` | `SportProfile` | One or two sport-named strategy lines, the visible proof the answer landed |
| `plan/generator.ts` plan assembly | `sportMode` | Sets `PlanConfig.sportMode` instead of hardcoding `'generic'` |
| `engine/resolveDay.ts` | `ballDates`, `sportMode`, `practiceExposure` | Already suppresses conditioning; extends to suppressing plyometric and reactive volume |
| `engine/phase.ts` and the block math | `SeasonState` | Taper is a deload with intensity protected; in-season is a volume state |
| `plan/milestones.ts` | `weights` | Which ladder to show. A volleyball middle and a soccer full back should not both get the vertical ladder |
| `plan/subs.ts` | `weights` | Already preserves primary quality on substitution; can prefer the sport's weighted qualities on ties |
| `engine/coach.ts` and the debrief pools | `SportProfile` | Sport-named lines, which is also the cheapest fix for the 181-distinct-lines explain ceiling in the state file |

Layering check: `plan -> engine -> logic -> screens` is respected throughout. `SportProfile` lives in `plan/`, every consumer is at or below it in the stack, nothing imports upward.

### 10.3 What ships first

The ordered list from section 5.5 is the ship order, and step 1 alone is worth its own commit: reading the answer, with no behaviour change, converts three dead exports into live ones and makes the next four steps small. Suggested job shape for the status board: this is one engines-lane job that depends on nothing currently in flight, touches `plan/` and `engine/` only, and hands the product lane nothing to coordinate on except the one new follow-up question in 7.4.

**A caveat about goal collision, worth deciding before step 4.** BodyT's `Goal` and `GoalFamily` are orthogonal to sport. A basketball player can pick `muscle`. Today the family decides the layout and the goal decides the promotions. The proposal here is that **goal keeps deciding the layout and sport decides the content within it**. A basketball player on the `muscle` goal gets a hypertrophy week with basketball-flavoured slot picks and ankle work, not an explosive week. If that is wrong, it is wrong in a way that needs an owner decision, not a code change, and it should be recorded as an open question rather than assumed.

### 10.4 Guard tests

Prove every guard bites, per the standing constraint. Feed each a known-bad input first, watch it fail, then trust it.

1. **`sportsDiverge`** (F19). Generate two plans identical but for `sport`, assert the sets of athletic exercise ids differ AND at least one block-1 strength pick differs. Known-bad input: run it against today's generator, watch it fail. This is the test that makes the whole job real.
2. **`positionsDiverge`** (F20). Same, differing only in `sport-role`, over at least three sports with position tables.
3. **`everySportProfileIsComplete`.** Every id in `SPORTS` except `'Something else'` has a profile; every profile has at least one weight of 3 and at least one explicit 0; every `injuryWatch` joint is a valid `Joint`; every quality key is a valid `AthleticQuality`. This is the existing `followups.test.ts` shape, extended.
4. **`everyWeightedQualityIsReachable`.** For every quality with weight >= 2 in any profile, `ATHLETIC` contains at least two drills with it as PRIMARY, at a foundation level, that are legal with the `minimal` equipment profile. Known-bad input: `rotational-power`, `reactive-agility` and `foot-ankle` each have exactly three drills in the entire merged library, and `elastic-reactive` has no foundation entry at all, so this test will immediately tell the truth about the library's thin spots rather than letting a profile promise something the library cannot deliver.
5. **`noGimmicks`.** A denylist assertion: no exercise id programmed by any sport profile has a name matching sport-implement patterns (bat, club, racket, glove, puck, weighted ball). Cheap, and it locks in the section 4.14 rule against a future session's good intentions.
6. **`highCnsGated`.** No plan for a `new` or `returning` athlete contains a drill with `cns: 3` or `impact: 3`; no plan contains more than two `cns: 3` drills in a week at any level.
7. **`inSeasonIsSmaller`.** For the same athlete, the in-season plan has strictly fewer total sets and strictly fewer plyometric contacts than the offseason plan, and the same or higher top-set intensity.
8. **`practiceSuppresses`.** With three intense sport logs in a week, scheduled conditioning is zero and programmed plyometric contacts are at or below the in-season floor.
9. **`taperKeepsIntensity`.** In taper, set counts fall by roughly half while the top-set load and the number of training days are unchanged.
10. **`unknownSportIsHonest`.** A free-text sport produces a plan plus a copy line containing the sport's name and an explicit statement of uncertainty, and never contains the word that would imply BodyT knows the sport.
11. **Widen the dead-export guard.** `structure.test.ts` currently scans only `engine/` and `logic/`:
    ```ts
    const targets = REFERENCE_FILES.filter(
      (f) => f.path.startsWith('engine/') || f.path.startsWith('logic/'),
    )
    ```
    Add `f.path.startsWith('plan/')`. Known-bad input: it will immediately flag `sportOf` and `qualitiesForSport` and `transfersTo`, which is the point. Allowlist nothing from this list; fix them by wiring them, which is this job. The allowlist is shrink-only and this job should be the reason it shrinks.

### 10.5 Copy notes

Every user-visible string proposed in this pack is checked for the house rules: no em dashes, casual and short, suggest-only, evidence stated, never medical. Three examples to set the register:

- Sport landed: "You play basketball, so this leans on jumping, landing and changing direction. Top-end sprinting is not what basketball asks for, so I left it out."
- In-season switch: "Looks like your season started. Want me to shrink the plan? Same weights, half the sets, legs saved for games."
- Honest uncertainty: "I do not know korfball, so I built you a general athletic base. Tell me what it actually asks of you and I will bias it."

### 10.6 Open questions for the owner

1. Does sport override goal, or bias within goal? (Section 10.3. The pack assumes bias-within-goal.)
2. Should the practice-frequency question in 7.4 be added to onboarding, or only surfaced later once the app has noticed a pattern? Onboarding is one more question; later is one more inference that can be wrong.
3. Baseball positions are missing from `POSITIONS` and pitching carries a real external rule. Is surfacing the Pitch Smart rest table as information acceptable, or does anything referencing a governing-body guideline need owner sign-off in the same way Sergeant quotes do?
4. `AthleticQuality` gains `work-capacity` and `mobility`. That is a widening of a core union that several tests read. Confirm before it lands.
