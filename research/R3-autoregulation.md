# R3 AUTOREGULATION, PLATEAU AND RECOVERY THRESHOLDS (feeds J8: learning loop completion)

Job: R3. Date: 2026-08-18. Scope: evidence + rules for progression and regression, plateau
detection, volume autoregulation, rest prescription, readiness and recovery cuts, missed
sessions and schedule fit, and intervention outcome learning. v12 sections 5, 6, 50.5-50.12.
NO production code here. Every number carries a source tag [S#] from section 1 or an explicit
HOUSE HEURISTIC label. Ranges over precision. Source disagreements are preserved, not averaged.

Conventions used throughout:

- RIR = reps in reserve. RPE here is always the RIR-anchored resistance-training scale [S4],
  never the 6-20 Borg scale, except where a source is explicitly cited as session-RPE [S20].
- "Exposure" = one logged, non-skipped working session on one movement, with at least one
  completed set carrying reps.
- "Comparable exposure" is defined in section 4.2 and is stricter than "exposure".
- Evidence = trial or meta-analysis backed. Consensus = guideline or position-stand body.
  HOUSE HEURISTIC = our choice where the literature is silent or does not transfer; shrink or
  replace when better data lands.
- Suggest-only is inviolable. Every threshold below is a threshold for SAYING something, not
  for doing it, with the two existing exceptions already shipped and defended in code
  (automatic equipment/limitation substitution, and mid-set load drop, section 2).

Contents: 1 sources (S1-S35) · 2 what BodyT already does, per engine · 3 progression and
regression · 4 plateau detection and the intervention ladder · 5 volume autoregulation ·
6 rest prescription · 7 recovery and readiness · 8 missed sessions and schedule fit ·
9 intervention outcome learning (the core of J8) · 10 thirty eval cases · 11 integration notes.

---

## 1. SOURCES (provenance table)

All accessed 2026-08-18 from this session via web search and fetch. "What was taken" is the
only thing this pack uses from each source; nothing else in it is attributed.

| ID | Source | URL | What was taken |
|----|--------|-----|----------------|
| S1 | ACSM Position Stand, "Progression Models in Resistance Training for Healthy Adults", Med Sci Sports Exerc 2009;41(3):687-708 | https://pubmed.ncbi.nlm.nih.gov/19204579/ (position-stand text read directly: https://www.sportgeneeskunde.com/wp-content/uploads/ACSM-Position-Stand-Progression-Models-in-Resistance-Training-for-Healthy-Adults.pdf) | VERBATIM from the stand: "When training at a specific RM load, it is recommended that 2-10% increase in load be applied when the individual can perform the current workload for one to two repetitions over the desired number." Loading: novice 8-12 RM; intermediate to advanced 1-12 RM periodised with eventual emphasis on heavy loading (1-6 RM) using 3 to 5 min rest between sets; hypertrophy 1-12 RM periodised with emphasis on 6-12 RM using 1 to 2 min rest; power light loads (0-60% 1RM lower body, 30-60% upper) fast, 3-5 min rest, 3-5 sets; local muscular endurance 40-60% 1RM for >15 reps with short rest (<90 s). Frequency: novice 2-3 d/wk, intermediate 3-4, advanced 4-5. Exercise order: large before small, multi-joint before single-joint, higher before lower intensity. The widely quoted extra qualifiers ("lower percent for small muscle mass exercises, higher for large", and "on two consecutive training sessions", i.e. the 2-for-2 rule) appear in the fuller statement of the recommendation and in the NSCA teaching literature, NOT in the abstract text read here. Marked accordingly wherever used |
| S2 | "Give it a rest: a systematic review with Bayesian meta-analysis on the effect of inter-set rest interval duration on muscle hypertrophy", Front Sports Act Living 2024 | https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2024.1429789/full | 9 RCTs, 19 measurements, 5-10 wk, n=12-28 each. Short (<=60 s) vs longer (>60 s): SMD 0.13 arm, 0.17 thigh, -0.08 whole body, all credible intervals crossing zero. "Hypertrophy can be achieved across a wide spectrum of rest interval ranges"; no appreciable further difference beyond ~90 s; trained lifters MIGHT benefit from longer rest but data insufficient |
| S3 | Grgic J, Schoenfeld BJ, Skrepnik M et al., "Effects of Rest Interval Duration in Resistance Training on Measures of Muscular Strength: A Systematic Review", Sports Med 2018;48(1):137-151 | https://pubmed.ncbi.nlm.nih.gov/28933024/ (also https://link.springer.com/article/10.1007/s40279-017-0788-x) | 23 studies, 491 participants. Robust strength gains are achievable even with short rest (<60 s), BUT resistance-TRAINED individuals need longer rest (>2 min) to maximise strength gains, while 60-120 s suffices for untrained. Training status is the moderator, not exercise type |
| S4 | Zourdos MC et al., "Novel Resistance Training-Specific Rating of Perceived Exertion Scale Measuring Repetitions in Reserve", J Strength Cond Res 2016;30(1):267-275 | https://pubmed.ncbi.nlm.nih.gov/26049792/ | The RIR-anchored RPE scale (RPE 10 = 0 RIR); velocity-RPE correlation r = -0.88 experienced, -0.77 novice; construct validity better in experienced lifters |
| S5 | Halperin I et al., meta-analysis of accuracy in predicting repetitions to task failure (2022), as reported in the RIR-validity literature | https://efsupit.ro/images/stories/november2025/Art%20262.pdf | RIR accuracy improves with heavier loads, in later sets, and closer to failure; it is worst in untrained lifters, in high-rep sets, and at low percentages of 1RM. Lifters systematically UNDER-estimate how many reps they have left |
| S6 | Refalo MC et al., "Influence of Resistance Training Proximity-to-Failure on Skeletal Muscle Hypertrophy: A Systematic Review with Meta-analysis", Sports Med 2023 | https://pubmed.ncbi.nlm.nih.gov/36334240/ | Small hypertrophy advantage to sets taken closer to failure (ES ~0.15-0.21); the advantage is small enough that non-failure training is not a failure of programming |
| S7 | Robinson ZP et al., "Exploring the Dose-Response Relationship Between Estimated Resistance Training Proximity to Failure, Strength Gain, and Muscle Hypertrophy: A Series of Meta-Regressions", Sports Med 2024 | https://pubmed.ncbi.nlm.nih.gov/38970765/ (also https://link.springer.com/article/10.1007/s40279-024-02069-2) | 55 hypertrophy and 67 strength studies. Hypertrophy improves as sets approach failure, with a flattening slope past ~2 RIR; STRENGTH gain is essentially independent of proximity to failure. This is the source of the "reps in reserve matters for growth, not for strength" split |
| S8 | "Effects of subjective and objective autoregulation methods for intensity and volume on enhancing maximal strength during resistance-training interventions: a systematic review", PeerJ 2021;9:e10663 | https://peerj.com/articles/10663/ | Autoregulated (RPE/RIR or velocity driven) load selection is at least as good as fixed percentage prescription for strength, with the advantage clearest when readiness varies day to day; evidence base is small and heterogeneous |
| S9 | "The Effect of Load and Volume Autoregulation on Muscular Strength and Hypertrophy: A Systematic Review and Meta-Analysis", Sports Med Open 2022 | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8762534/ | Autoregulation produces small favourable effects on strength; effects on hypertrophy are unclear; most studies autoregulate LOAD, few autoregulate VOLUME, so volume autoregulation is under-evidenced |
| S10 | Bell L et al., "Deloading Practices in Strength and Physique Sports: A Cross-sectional Survey", Sports Med Open 2024 | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10948666/ | n=246 competitive athletes. Deload duration 6.4 +/- 1.7 days, inserted every 5.6 +/- 2.3 weeks; volume down (sets and reps), intensity down, FREQUENCY UNCHANGED, effort down via higher RIR, exercise selection unchanged; triggers were stalled performance, soreness, joint aches, fatigue |
| S11 | Bell L et al., "A Practical Approach to Deloading: Recommendations and Considerations for Strength and Physique Sports" (accepted manuscript) | https://shura.shu.ac.uk/35313/3/Bell-APracticalApproach(AM).pdf | Deload as a planned OR autoregulated intervention; reduce volume first, then intensity; keep frequency and exercise selection so the athlete does not lose the habit or the skill |
| S12 | Mujika I, Padilla S, "Detraining: Loss of Training-Induced Physiological and Performance Adaptations. Part I", Sports Med 2000 | https://www.semanticscholar.org/paper/976e67d8710929b988ba84e15d4b1c10e4b09420 | Strength is largely retained across up to ~4 weeks of inactivity; eccentric force, sport-specific power and recently acquired strength decline first; longer layoffs produce progressively larger losses |
| S13 | Caterisano A et al., "CSCCa and NSCA Joint Consensus Guidelines for Transition Periods: Safe Return to Training Following Inactivity", Strength Cond J 2019;41(3) | https://www.nsca.com/contentassets/202023e9d6c440dab582d9d87c0f3729/cscca_and_nsca_joint_consensus_guidelines_for.1.pdf | The 50/30/20/10 rule: after >=2 weeks inactivity, cut volume >=50% in week 1 and 30% in week 2, then standard; new athletes or unknown history get the full 4-week 50/30/20/10 ramp. Work:rest >=1:4 week 1, >=1:3 week 2. FIT rule: max 3 sessions/wk in week 1, 4 in week 2. Post-rhabdo weight-training progression starts at 1-2 sets of 5-6 at <75% 1RM with 5 min rest, 1-2 days/wk. Detraining of 2-4 weeks measurably costs conditioning; brief detraining costs little strength; long inactivity costs much more |
| S14 | Soligard T et al., "How much is too much? (Part 1) IOC consensus statement on load in sport and risk of injury", Br J Sports Med 2016;50:1030-1041 | https://bjsm.bmj.com/content/50/17/1030 | Load changes should be individualised (large inter- and intra-individual variance) and applied in small increments; both excessive AND insufficient load raise injury risk; rapid load increases are the risk signal, not absolute load |
| S15 | Bourdon PC et al., "Monitoring Athlete Training Loads: Consensus Statement", Int J Sports Physiol Perform 2017;12(S2):161-170 | https://journals.humankinetics.com/view/journals/ijspp/12/s2/article-pS2-161.pdf | Internal vs external load framework; session-RPE and wellness questionnaires are the practical internal-load tools; monitoring is only useful if it changes a decision, and simple measures beat elaborate ones |
| S16 | Saw AE, Main LC, Gastin PB, "Monitoring the athlete training response: subjective self-reported measures trump commonly used objective measures: a systematic review", Br J Sports Med 2016;50:281-291 | https://pubmed.ncbi.nlm.nih.gov/26423706/ | Subjective wellness measures track acute and chronic load with greater sensitivity and consistency than common objective measures (resting HR, blood markers); supports asking the athlete over inferring from proxies |
| S17 | Craven J et al., "Effects of Acute Sleep Loss on Physical Performance: A Systematic and Meta-Analytical Review", Sports Med 2022 | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9584849/ | 69 studies, 227 outcomes; acute sleep loss (<=6 h) worsens performance overall (mean -7.6%), but strength and power are among the LEAST affected categories; effect scales with hours awake (~0.4% per hour) and is concentrated in PM sessions and in deprivation/late-restriction patterns |
| S18 | Pelland JC et al., "The Resistance Training Dose Response: Meta-Regressions Exploring the Effects of Weekly Volume and Frequency on Muscle Hypertrophy and Strength Gains", Sports Med 2025 | https://pubmed.ncbi.nlm.nih.gov/41343037/ (also https://link.springer.com/article/10.1007/s40279-025-02344-w) | 67 studies, 2,058 subjects; more weekly volume gives more hypertrophy with clearly diminishing returns, and strength plateaus at low volumes; frequency per se adds little once weekly volume is equated |
| S19 | Plotkin D et al., "Progressive overload without progressing load? The effects of load or repetition progression on muscular adaptations", PeerJ 2022;10:e14142 | https://peerj.com/articles/14142/ (PMC: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9528903/) | 8 weeks, resistance-trained subjects: progressing LOAD and progressing REPS produced comparable hypertrophy (6.7-12.9% across sites) and comparable strength and endurance changes. Adding reps is real progressive overload, not a placeholder for adding weight |
| S20 | Foster C et al., "A New Approach to Monitoring Exercise Training", J Strength Cond Res 2001;15(1):109-115; with Haddad M et al., "Session-RPE Method for Training Load Monitoring: Validity, Ecological Usefulness, and Influencing Factors", Front Neurosci 2017;11:612 | https://paulogentil.com/pdf/A%20New%20Approach%20to%20Monitoring%20Exercise%20Training.pdf and https://pmc.ncbi.nlm.nih.gov/articles/PMC5673663/ | session-RPE load = RPE x session minutes; monotony = weekly mean load / SD of daily load; strain = weekly load x monotony; high load combined with high monotony is the pattern associated with breakdown. sRPE is valid, cheap and sensitive to intensity and duration together |
| S21 | Grgic J et al., "Test-Retest Reliability of the One-Repetition Maximum (1RM) Strength Assessment: a Systematic Review", Sports Med Open 2020;6:31 | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7367986/ | 32 studies, pooled n=1595. Median ICC 0.97 (92% >= 0.90); median CV 4.2% (range 0.5-12.1%). This is the measurement-error floor for any plateau rule built on 1RM or e1RM |
| S22 | Peterson MD, Rhea MR, Alvar BA, "Maximizing strength development in athletes: a meta-analysis to determine the dose-response relationship", J Strength Cond Res 2004;18(2):377-382; and "Applications of the Dose-Response for Muscular Strength Development", JSCR 2005;19(4):950-958 | https://pubmed.ncbi.nlm.nih.gov/15142003/ and https://paulogentil.com/pdf/Applications%20of%20the%20Dose-Response%20for%20Muscular%20Strength%20Development%20A%20Review%20of%20Meta-Analytic%20Efficacy%20and%20Reliability%20for%20Designing%20Training%20Prescription.pdf | Optimal dose differs by training status: untrained ~60% 1RM, 3 d/wk, ~4 sets per muscle; recreationally trained ~80% 1RM, 2 d/wk, ~4 sets; athletes ~85% 1RM, 2 d/wk, ~8 sets. 177 studies, 1,803 effect sizes. The effort-to-benefit ratio itself changes with training age |
| S23 | Spiering BA, Mujika I, Sharp MA, Foulis SA, "Maintaining Physical Performance: The Minimal Dose of Exercise Needed to Preserve Endurance and Strength Over Time", J Strength Cond Res 2021;35(5):1449-1458 | https://journals.lww.com/nsca-jscr/fulltext/2021/05000/maintaining_physical_performance__the_minimal_dose.35.aspx | As little as 1 set per exercise, 1 session per week, maintains strength (young and older) and muscle size (young) for up to 32 weeks; endurance holds up to 15 weeks at 2 sessions/wk or with volume cut 33-66%. Maintenance is far cheaper than development |
| S24 | Meeusen R et al., "Prevention, diagnosis and treatment of the overtraining syndrome: joint consensus statement of ECSS and ACSM", Med Sci Sports Exerc 2013;45(1):186-205 / Eur J Sport Sci 2013;13(1):1-24 | https://onlinelibrary.wiley.com/doi/10.1080/17461391.2012.730061 | The overreaching spectrum: functional overreaching resolves in days to ~2 weeks and can improve performance afterwards; non-functional overreaching takes weeks to months; overtraining syndrome months to years. Distinguishing them requires performance decrement plus exclusion, which no app can do |
| S25 | Enes A et al., "Effects of Different Weekly Set Progressions on Muscular Adaptations in Trained Males: Is There a Dose-Response Effect?", Med Sci Sports Exerc 2024; and Enes A et al., "Training volume increases or maintenance based on previous volume: the effects on muscular adaptations in trained males", J Appl Physiol 2024 | https://pubmed.ncbi.nlm.nih.gov/37796222/ and https://journals.physiology.org/doi/full/10.1152/japplphysiol.00476.2024 | Progressively adding 4 or 6 sets per week every 2 weeks beat a fixed-volume control for lower-limb strength over 12 weeks; but in the follow-up, raising a trained lifter's PREVIOUS volume by 30% or 60% did not beat maintaining it for hypertrophy, and maintenance produced the best 1RM. Volume progression helps at low starting volumes and stops helping at high ones. Disagreement preserved |
| S26 | Hyldahl RD, Chen TC, Nosaka K, "Mechanisms and Mediators of the Skeletal Muscle Repeated Bout Effect", Exerc Sport Sci Rev 2017;45(1):24-33; with "Muscle Damage Induced by Eccentric Exercise, Recovery and Adaptations" (Springer 2023) | https://www.researchgate.net/publication/309469047_Mechanisms_and_Mediators_of_the_Skeletal_Muscle_Repeated_Bout_Effect and https://link.springer.com/chapter/10.1007/978-3-031-44270-4_8 | Unaccustomed eccentric work causes soreness peaking 24-72 h and strength loss that is largest immediately after and recovers over days; the two time courses differ. One prior bout confers protection against the next (repeated bout effect), so the SECOND exposure to a novel movement is expected to hurt much less |
| S27 | Impellizzeri FM, Tenan MS, Kempton T, Novak A, Coutts AJ, "Acute:Chronic Workload Ratio: Conceptual Issues and Fundamental Pitfalls", Int J Sports Physiol Perform 2020;15(6):907-913 | https://journals.humankinetics.com/view/journals/ijspp/15/6/article-p907.xml | No causal evidence supports ACWR-based load management; ratio statistics are unreliable and easy to misread. Directly contradicts the popular reading of S14. Preserved as a live disagreement: "ramp slowly" survives, "keep the ratio under 1.5" does not |
| S28 | "HRV-Guided Training for Professional Endurance Athletes: A Protocol for a Cluster-Randomized Controlled Trial", Int J Environ Res Public Health 2020;17(15):5465 (with the Vesterinen and Javaloyes trials it builds on) | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7432021/ | Daily-readiness-guided prescription can match or beat a predefined program while using FEWER hard sessions; evidence base is endurance, not resistance training, so it transfers only as a principle |
| S29 | Grgic J et al., "Effect of Resistance Training Frequency on Gains in Muscular Strength: A Systematic Review and Meta-Analysis", Sports Med 2018;48(5):1207-1220 | https://pubmed.ncbi.nlm.nih.gov/29470825/ | Unequated, strength effect sizes rose with frequency (0.74 / 0.82 / 0.93 / 1.08 for 1 / 2 / 3 / 4+ sessions per week), but the subgroup analysis of VOLUME-EQUATED studies found no significant effect of frequency. This is the licence to REDISTRIBUTE a missed session's work rather than treat the session as lost, provided the weekly volume survives |
| S30 | "Investigating the impact of less than or greater than 60 seconds of inter-set rest on muscle hypertrophy and strength increases in males with >1 year of resistance training experience: systematic review with meta-analysis" (2025 preprint) | https://www.medrxiv.org/content/10.1101/2025.09.22.25336351.full.pdf | Trained-only subgroup analysis of the short-vs-long rest question; used only to note that the trained-lifter answer is still unsettled, never for a number |
| S31 | Baz-Valle E et al., "A Systematic Review of the Effects of Different Resistance Training Volumes on Muscle Hypertrophy", J Hum Kinet 2022 | https://pmc.ncbi.nlm.nih.gov/articles/PMC8884877/ | 12-20 weekly sets per muscle group as a standard recommendation for trained young men; explicit inverted-U, i.e. past some point more sets is counterproductive |
| S32 | Per-session volume parallel project of the Pelland/Zourdos group, as reported in secondary coverage (the primary paper is referenced as [117] inside S18 and was not read directly) | https://rpstrength.com/blogs/podcasts/training-frequency-decoded-the-11-set-rule-every-lifter-should-know | A per-session "point of undetectable outcome superiority" around 11 fractional sets per muscle. PROVISIONAL, secondary reporting only. Used here solely to show BodyT's 8/10/+4 per-session ceilings are in the right neighbourhood, never as a number to code against |
| S33 | Schoenfeld BJ et al., "Longer Interset Rest Periods Enhance Muscle Strength and Hypertrophy in Resistance-Trained Men", J Strength Cond Res 2016;30(7):1805-1812 | https://journals.lww.com/nsca-jscr/fulltext/2016/07000/longer_interset_rest_periods_enhance_muscle.3.aspx | 21 trained men, 1 min vs 3 min rest, 8 weeks: 3 min produced greater strength AND greater anterior thigh thickness. Directly disagrees with the "short rest is fine for hypertrophy" reading of S2, in a trained population |
| S34 | Iversen VM et al., "No Time to Lift? Designing Time-Efficient Training Programs for Strength and Hypertrophy: A Narrative Review", Sports Med 2021;51(10):2079-2095 | https://pubmed.ncbi.nlm.nih.gov/34125411/ | Time-efficiency levers: fewer exercises with multi-joint bias, supersets/antagonist pairing and drop sets to compress a session, and accepting that cutting rest trades performance for minutes |
| S35 | Androulakis-Korakakis P et al., "The Minimum Effective Training Dose Required to Increase 1RM Strength in Resistance-Trained Men: A Systematic Review and Meta-Analysis", Sports Med 2020 | https://www.semanticscholar.org/paper/19d4521bad3f127e6488c322ca2538184139d2d3 | Meaningful 1RM strength gains are achievable in trained men on very small doses (as little as a couple of hard sets per lift per week); the floor for MAINTAINING or slowly improving strength is far below the floor people assume |

---

## 2. WHAT BODYT ALREADY DOES (per engine, constants quoted, sourced or invented)

Read on branch `claude/app-audit-refinement-sjw2va` at merge `eaf3519` + J2 (`d23e6d1`).
Every constant below is quoted from the file named. "SOURCED" means the number traces to a
citable source. "INVENTED" means it was chosen in-house and is defensible but unsourced.
"HOUSE" means it encodes a product rule (suggest-only, one rep number) rather than physiology.

### 2.1 `src/engine/adapt.ts` - the 14-day reading and the automatic/proposal split

| Constant | Value | Status |
|---|---|---|
| `SIGNAL_WINDOW_DAYS` | 14 | INVENTED. "Beyond two weeks it is history, not context." Section 4 gives it a defensible basis |
| `PAIN_PATTERN_COUNT` | 2 | INVENTED (house safety bias) |
| `MISS_PATTERN_COUNT` | 2 | INVENTED |
| `EXTRA_LOAD_MINUTES` | 60 | INVENTED. 60 min of unplanned sport = real training load |
| accumulated fatigue trigger | 3 sessions graded `heavy` inside the last 7 days | INVENTED |
| poor-sleep trigger | >=2 bad nights inside the last 3 days | INVENTED |
| `weekLoad` unplanned conversion | `minutes / 15` fatigue units | INVENTED, explicitly "deliberately coarse" |
| `MIN_SETS_AFTER_CUT` | 2 | INVENTED (floor, not a dose) |

Signals: `missed`, `extra-load`, `poor-sleep`, `earned-progression`, `joint-pain`,
`equipment-gap`, `accumulated-fatigue`. Adjustment kinds: `substitute`, `reduce-volume`,
`hold-load`, `reduce-load`.

The automatic/proposal line (HOUSE, and inviolable): automatic only when doing nothing hands
the athlete a session they cannot or should not perform - missing equipment, a blocked
movement, a flagged joint with a viable substitute, or a stated limitation whose pattern has
no substitute (then `reduce-load` + `lightMode`). Everything else is a proposal awaiting a tap.
Accepted proposals are stored in `data.adapt[date]: AdaptChoice[]` where
`AdaptChoice = 'hold-load' | 'reduce-volume'`. Declines are stored NOWHERE, deliberately:
"A proposal nobody took leaves no trace." Section 9 argues this is the one thing J8 must change.

The engine already encodes the correct asymmetry, and it is worth keeping verbatim because
section 7 and section 8 confirm it: short sleep costs SETS at the same weight; a training gap
costs LOAD while keeping the volume; unplanned load sits with sleep; accumulated fatigue is the
only case that gets both. That distinction is sourced (S17, S12, S13) even though the trigger
counts are invented.

### 2.2 `src/engine/fatigue.ts` - four reasons, the drop, and the 21-day memory

| Constant | Value | Status |
|---|---|---|
| `DROP_FRACTION` | 0.875, described as "the middle of the 10-15% band coaches use for a back-off set" | SOURCED in spirit (see section 3.4); the exact 0.875 is INVENTED |
| `dropTo` clamp | result is always at least one 5 lb step lower than the input | HOUSE (a button that changes nothing is worse than no button) |
| `LIGHT_DAY_FRACTION` | 0.85 | INVENTED |
| `RECENT_DAYS` | 21 | INVENTED |
| `PATTERN_COUNT` | 2 notes on one movement | INVENTED |
| `REGION_WATCH_COUNT` | 3 different movements on one muscle | INVENTED |
| `SHORT_SESSIONS_TO_ACT` | 3 short sessions inside the 21-day window raise the failing flag | INVENTED |
| `CLEAN_SESSIONS_TO_UNFLAG` | 2 clean sessions in a row clear it, and clearing wipes the ledger | INVENTED, and the hysteresis shape is right (section 4.5) |
| shortfall definition | `asked - achieved >= 2` on any set | INVENTED, matches `SHORTFALL_TO_ACT` |

Four can't-finish reasons and their semantics: `fried` (less load, same movement, finish the
set), `form` (exercise over), `pain` (out of the movement, never "push through"), `empty`
(whole-system, a question about the rest of the session). `endsTheExercise` = form or pain.
Suggestion kinds, ordered most serious first: `swap` (pain x2), `start-lighter` (fried/form x2,
or the failing flag), `watch-region` (3 different movements on one muscle).

### 2.3 `src/engine/sessionFatigue.ts` - within-session response

`SHORTFALL_TO_ACT = 2` reps below the ask. `isAutomatic('drop-load') === true` is the second
sanctioned automatic: the load for the remaining sets of THAT movement drops to `dropTo(weight)`
when the set came up 2+ short, or when RIR <= 0 and the set missed its number. Bodyweight work
has no bar to lower, so it returns `offer-ease` (a volume question, always offered). If the
athlete already dropped the weight themselves inside the movement, the engine says nothing about
load and offers to shorten the day instead. INVENTED thresholds, HOUSE boundary.

### 2.4 `src/engine/reps.ts` - double progression and the layoff give-back

| Constant | Value | Status |
|---|---|---|
| double progression | start at range low, +1 rep per cleared session, at range high wrap to low and hand the step to load | SOURCED (S1: the 2-for-2 / RM-progression model; section 3.1) |
| `STALE_DAYS` | 21 days without training the movement resets reps to the bottom of the range | INVENTED; partially supported (S12, S13) |
| `LAYOFF_STEP_DAYS` | 28: one load step given back per further 4 weeks away | INVENTED; direction supported (S13) |
| `MAX_STALE_STEPS` | 3 | INVENTED (floor on the give-back) |
| `loadStepLb` | 10 lb if any primary muscle is lower-body (quads, hamstrings, glutes, calves, adductors), else 5 lb | SOURCED in principle (S1: small percentage for small-muscle exercises, larger for large-muscle), calibrated in-house to plate granularity |
| clear condition | every completed set at or above target, and no set logged short | HOUSE |
| hold condition | cleared but `feltHeavy` (RIR <= 0, else per-exercise `hard`, else session `heavy`) | INVENTED, and section 3.3 argues it is nearly right |
| back-off condition | fell short AND felt heavy | INVENTED, deliberately conjunctive to stop the load spiral |

### 2.5 `src/engine/phase.ts` - 16-week phases and promotion

`PHASE_WEEKS = 16`; `MIN_SESSIONS_TO_JUDGE = 8` exposures inside the phase before a trend means
anything; `GAIN_TO_PROMOTE = 0.05` (5% estimated 1RM gain, measured first point vs best of the
last three); `REP_GAIN_TO_PROMOTE = 2` reps on the rep-max series for unloaded work, with the
needed gain `max(2, ceil(first * 0.05))`. Verdicts: `promoted`, `stalled`, `untested`,
`topped-out`, `pinned`. Promotion is one skill step at a time (`up.skill - here.skill > 1`
blocks a two-level jump) and compounds across phases. All INVENTED numbers; the shape (evidence
before calendar, refuse to promote a stalled lift) is exactly right and section 4 keeps it.
`e1RM` is Epley with reps capped at `E1RM_MAX_REPS = 12` (`src/engine/stats.ts`), which is a
real and correct constraint on using estimated maxes as a plateau signal.

### 2.6 `src/engine/transforms.ts` - the deterministic dose transforms

Order in `resolveDay`: slots -> A/B -> dedupe -> deload -> gig scaling -> readiness. Scaling
stacks multiplicatively by design, floored at 1 set / 1 rep.

| Transform | Effect | Status |
|---|---|---|
| `applyWeekRamp` | week 3 of 4 only, +1 set on the day's lead lift, and only if `overloadedRegions` is empty afterwards | INVENTED |
| `applyDeload` | week 4 of every block: lifting/core/carry sets halved (`ceil(sets/2)`), weight unchanged; explosive halved; mobility/cardio/warmup untouched | PARTLY SOURCED (S10, S11: volume down, intensity kept, frequency unchanged, selection unchanged - BodyT matches the surveyed practice closely) |
| `applyReadinessDowngrade` | 2+ readiness flags: explosive x 2/3, minus one set per lift with `MIN_WORKING_SETS = 2` floor, all lifts `lightMode` | INVENTED |
| `applyBadSleepCut` | two consecutive bad nights: whole day x 2/3, lifts flagged light | INVENTED; direction supported (S17) but the size is not |
| `applyLongShiftMonday` | minus one jump set, floor 2 | INVENTED |

Readiness flags (`src/screens/today/ReadinessSheet.tsx`), asked only before CNS days: slept
under 6 hours; wired or run-down; legs sore or heavy; genuinely low energy. Downgrade at >= 2
flags (`src/logic/sessionStart.ts`), or when the athlete picks "Normal" intensity themselves.

### 2.7 `src/engine/calibration.ts` - the proven suggest-only learning pattern

The shape J8 should copy, in its own words: ask once, never overwrite the answer, never argue
with it, and learn only from the GAP between the athlete's answer and the measured proxy.

| Constant | Value | Role |
|---|---|---|
| `MIN_ACTIVITY_SAMPLES` | 4 | per-sport personalisation needs its own evidence |
| `MIN_BIAS_SAMPLES` | 3 | a cross-sport lean shows up sooner than a per-sport one |
| `BIAS_STEP` | 0.18 | one tier of disagreement moves the band 18% |
| `MAX_DRIFT` | 0.5 | the personal band may never stray more than 50% from the researched one |
| `PRIOR_STRENGTH` | 6 | at 6 samples the band is half personal, half population: `w = n / (n + 6)` |

Also: memoised on `AppData` identity; refuses to produce an inverted band; `calibrationNote`
always says what moved and why; and it explicitly refuses to let perceived effort touch
calories, because a MET is a physical claim and a feeling is not. That refusal is the template
for section 9's rule about which outcomes an intervention is allowed to move.

### 2.8 `src/engine/volume.ts` - per-muscle session ceilings

`PRIMARY_WEIGHT = 1`, `SECONDARY_WEIGHT = 0.5` (SOURCED in convention: fractional counting of
indirect volume is the accounting the hypertrophy dose-response work uses, S18/S19).
`KIND_WEIGHT`: lift 1, carry 0.6, core 0.6, jump 0.3, sprint 0.3, mobility/cardio/warmup 0
(INVENTED). `SMALL_CEILING = 8` for the small assisting muscles, `LARGE_CEILING = 10` for the
rest, `FOCUS_BONUS = +4` for the muscles the first `PROTECTED_LEAD = 2` movements train
directly. Ceilings are PER SESSION, not per week, and the file says so. `trimForVolume` drops a
redundant late isolation movement first, then shaves single sets off the last contributor,
never touching the opening two, with `MIN_SETS = 2` and `MIN_MOVEMENTS = 4`. `preFatigued`
threshold 3 fractional sets. `MAX_TIME_SLACK = 6` extra ceiling reduction chasing a time budget
via `trimToFit`. `weightDropped` flags an intra-exercise load drop. All ceiling numbers
INVENTED, and section 5 is where they get sourced or changed.

### 2.9 `src/logic/prescription.ts` - what actually reaches the bar

`prefillFor` reads history (never a stored offset), takes the best set by e1RM, and applies:
`wrapStep` (+`loadStepLb`, cancelled by an accepted `hold-load`), `backOff` (-`loadStepLb`),
`staleGiveBack` (-`staleSteps * loadStepLb`), then softening. Softening is `lightLoad` (x0.85)
for a light day, else `dropTo` (x0.875) for a movement carrying the failing flag, never both,
floored at `max(loadStepLb, round5(0.6 * baseline))` (J2's proportional floor). `light` sets
never establish a baseline unless nothing else exists. Legacy per-exercise feel can still move
5 lb for old logs only.

### 2.10 What is missing, stated plainly

1. No outcome is recorded for any intervention. Nothing anywhere asks "did the thing we
   suggested work?" (section 9).
2. Declines are discarded by design, so a rejected proposal can be re-offered every day
   forever, and the app cannot tell an athlete who disagrees from one who never saw it.
3. Volume ceilings are static constants. Nothing moves them per athlete, ever (section 5).
4. Rest is a per-exercise constant (`restSec` in `src/plan/exercises.ts`, distribution: 90 s
   x17, 120 s x17, 150 s x14, 0 s x10, 60 s x6, 30 s x5, 180 s x5, 240 s x2, 45 s x1). Nothing
   varies it by goal, by load, by proximity to failure, or by the day's time budget, and
   nothing learns an individual's rest response (section 6).
5. Missed sessions produce one signal (`missed`, at 2 in 14 days) and one proposal
   (`hold-load`). Nothing reschedules, redistributes, compresses, or notices that the misses
   are all the same weekday (section 8).
6. Plateau is only judged at the 16-week phase boundary. There is no in-block plateau
   detector at all (section 4).

---

## 3. PROGRESSION AND REGRESSION RULES

### 3.1 The progression trigger

Sourced [S1], verbatim: increase load by 2-10% when the athlete can perform the current workload
for ONE TO TWO REPETITIONS OVER the desired number. The two extra qualifiers everyone quotes with
it, "on two consecutive sessions" and "lower percent for small muscle mass, higher for large",
are in the fuller recommendation and the NSCA teaching literature rather than in the stand's own
abstract text; this pack uses them but labels them as the 2-for-2 convention rather than as
position-stand wording. That convention is BodyT's double progression with a different accounting:
ACSM lets the extra reps happen at a fixed target; BodyT walks the target up one rep at a time
until the top of the range, then converts. Both end at the same place, and BodyT's version is
the one compatible with "users never pick reps" (section 3.6).

Sourced [S19]: progressing reps at a fixed load and progressing load at fixed reps produced
comparable hypertrophy and comparable strength over 8 weeks in trained lifters. So the rep half
of double progression is not a stalling tactic. This retires any argument that a lift adding
reps is "not really progressing" and it is direct support for `phase.ts` judging unloaded work
on the rep-max series.

### 3.2 Increment sizing

| Situation | Increment | Basis |
|---|---|---|
| Large-muscle compound (squat, deadlift, hip thrust, leg press, row, bench) | 5-10% of working load, at the plate granularity available | S1 for the 2-10% band; the large-muscle-takes-the-higher-end split is the 2-for-2 convention |
| Small-muscle or single-joint (curl, lateral raise, triceps, calf, rear delt) | 2-5% of working load | S1 for the band; same convention caveat |
| Any lift where the smallest available increment exceeds 10% | Add a rep instead, and convert only when the range tops out twice | S1 + S19; HOUSE for the "twice" |
| Bodyweight / unloaded | +1 rep per cleared session; convert to a harder variation only on the section 4 promotion rule | S19 for reps-as-overload; HOUSE for the conversion |

BodyT's `loadStepLb` (10 lb lower body, 5 lb elsewhere) lands inside the sourced band for
typical working loads: 10 lb on a 135 lb squat is 7.4%; 5 lb on a 60 lb curl is 8.3%; but 5 lb
on a 20 lb lateral raise is 25%, which is far outside S1 for a small-muscle exercise. That is a
real, sourced defect and section 11 lists it as a change J8 may make: below roughly 40 lb on a
small-muscle single-joint movement, the honest step is a rep, not a plate. HOUSE HEURISTIC for
the 40 lb line; the 2-10% band that motivates it is sourced.

Training age modifies the RATE, not the rule [S22]: untrained lifters progress at lower relative
intensity and higher frequency, recreationally trained at ~80% 1RM, athletes at ~85% with more
sets. Practically for BodyT: a novice should be expected to clear the range and convert almost
every exposure for the first several weeks; a trained lifter converting every exposure on a
compound is evidence the range or the starting load was wrong, not evidence of talent.
HOUSE HEURISTIC for using conversion frequency as that diagnostic.

### 3.3 When to hold

BodyT holds when the athlete cleared the target but the movement `feltHeavy` (RIR <= 0). Sourced
partly, and worth restating precisely:

- [S7] strength gain is essentially independent of proximity to failure, while hypertrophy
  improves as sets approach failure with the slope flattening past ~2 RIR. So a set finished at
  RIR 0 is not a better set than the same reps at RIR 2 for strength purposes, and is only
  marginally better for growth.
- [S5] RIR self-reports are least accurate in untrained lifters, at high rep counts, and far
  from failure, and lifters tend to UNDER-estimate the reps they have left. A reported RIR 0 on
  a set of 12 from a novice is weak evidence; a reported RIR 0 on a set of 5 from an experienced
  lifter is strong evidence.

Rule (HOUSE, sourced inputs): hold the ask when the athlete cleared it at RIR <= 1 AND the set
was in the lower half of its rep range or the athlete has >= 6 months of training history;
otherwise treat a cleared set at RIR 0-1 on a high-rep small-muscle movement as a clear and
progress it. BodyT today holds on any RIR <= 0 regardless of rep count and training age; that is
conservative in the safe direction and is not a bug, but it costs progression on high-rep
accessory work where RIR is least trustworthy.

### 3.4 When to regress

Three distinct regressions, and they must not stack (BodyT already enforces this):

1. WITHIN a session: a set missing its ask by >= 2 reps, or RIR 0 with the reps missed, drops the
   remaining sets 10-15% [S1 gives the increment band; the back-off convention is coaching
   practice, HOUSE for using the same band downward]. BodyT: `dropTo` at 0.875 with a mandatory
   one-step minimum. Keep.
2. BETWEEN sessions: fell short AND felt heavy gives one step back. Keep the conjunction; it is
   the guard that stopped the documented load spiral, and section 7's evidence on subjective
   measures [S16] says the feel is signal, while section 3.3's [S5] says it is noisy signal.
   Two noisy signals agreeing is the cheapest available approximation to a reliable one.
3. AFTER TIME AWAY: see section 8.4.

Never regress on: one bad session alone, a "heavy" answer alone, soreness alone, or a
single missed rep. All four are within normal day-to-day variation (section 4.3).

### 3.5 What must never move the load

[S1, S7, S9] Load selection responds to performance, not to mood, not to soreness, and not to
sleep. Sleep and readiness move VOLUME (section 7). This is already BodyT's split and it is the
single most defensible thing in the current engine.

### 3.6 Reconciling with "users never pick reps"

The literature prescribes ranges (8-12, 6-10). The house rule forbids showing one. The
reconciliation BodyT already ships is correct and should be stated as doctrine in J8:

- The RANGE is programming data and lives in the plan.
- The single number shown is the current rung of double progression, derived from history.
- The athlete's only rep-side input is what they actually achieved, recorded only when it
  differs from the ask (`setAchievedReps` stores nothing when the ask was met).
- Therefore "hit 8-12" becomes "do 9", and the app owns the arithmetic. Any J8 proposal that
  would show a range, a "pick one", or an "or more" is out of bounds. AMRAP-style asks remain
  legal only where the plan authored a fixed non-range prescription ("max"), because that is an
  instruction, not a choice.

---

## 4. PLATEAU DETECTION

### 4.1 How many exposures before the word "plateau" is allowed

The literature does not give a plateau rule. It gives a noise floor, and the noise floor sets the
rule. [S21]: 1RM test-retest median CV 4.2%, ICC 0.97, across trained and untrained, upper and
lower body. e1RM computed from working sets is noisier than a supervised 1RM test, never less.
So a single session's e1RM difference of under ~5% carries no information at all, and BodyT's
existing `GAIN_TO_PROMOTE = 0.05` sits exactly at one CV: it is the smallest defensible
threshold, not a conservative one.

Rules (HOUSE HEURISTIC, built on S21 and S1):

| Call | Requires | Why |
|---|---|---|
| "Not enough data" | fewer than 3 comparable exposures | one point is a measurement, two is a line through noise |
| "Watch" (internal only, nothing said) | 3 comparable exposures with best-set e1RM inside +/-5% of the first | inside the measurement band [S21] |
| "Plateau" (may be said, once) | 4+ comparable exposures spanning >= 3 weeks, with no comparable exposure exceeding the window's opening value by more than 5%, AND the other four explanations in 4.3 ruled out | 4 points and 3 weeks make a run rather than a bad fortnight; ACSM's own progression trigger needs 2 consecutive sessions [S1], and a stall is the harder claim so it costs more |
| "Regression" | 2 consecutive comparable exposures more than 5% BELOW the window best, or the failing flag already raised | matches `fatigue.ts` hysteresis, which is the shipped precedent |

Cap: never call plateau on a window longer than 8 weeks of history. Past that the comparison is
against a different athlete [S12, S22].

For unloaded work, substitute the rep-max series and `REP_GAIN_TO_PROMOTE = 2` reps as the noise
band, exactly as `phase.ts` already does. A percentage band on a set of 10 is half a rep, which
no set can express [in-code reasoning, and correct].

### 4.2 What counts as a comparable exposure

A plateau claim compares like with like. An exposure is COMPARABLE only when all of these hold:

1. Same `exerciseId`. A substitution (automatic or accepted) starts a new series. BodyT already
   records `swappedFrom`.
2. The prescription was not deliberately softened: no `light` sets, no `lightMode`, not a
   `deload` week (block week 4), not `readiness.downgraded`, not `dayLoad === 'trimmed'`, not a
   `minimum` intensity session. Every one of these flags already exists.
3. The movement was actually worked: at least one completed set with reps, not `skipped`.
4. Position in the session is roughly stable: `preFatigued` prior load on the movement's prime
   mover within about 3 fractional sets of the series' typical value. A lift that moved from
   first to fifth in the day is a different test [supported in principle by volume.ts's own
   pre-fatigue reasoning; HOUSE HEURISTIC for the tolerance].
5. Rest was not materially different (section 6): a session run to a 25-minute budget is not
   comparable to a 70-minute one. [S3] makes this concrete for strength.

If fewer than 3 exposures survive the filter, the correct output is "not enough comparable
sessions", and that sentence is worth saying to the athlete because it is also the fix.

### 4.3 Plateau versus the four things that impersonate it

| Impostor | Discriminator | Signal already in BodyT |
|---|---|---|
| Measurement error | Change inside +/-5% e1RM or +/-1 rep | `liftSeries`, `repMaxSeries` |
| Fatigue (acute or accumulated) | MANY movements flat or down inside a SHORT window, with readiness or sleep signals or intra-session weight drops; regions rather than a lift | `readSignals` accumulated-fatigue, `weightDropped`, `readiness.flags`, badSleepDates |
| Technique or tolerance | ONE movement failing while its pattern siblings progress; `form` or `pain` notes attached; shortfalls concentrated in the last set | `FatigueNote.reason`, `failingFlags`, `sameGroupAhead` |
| Inconsistent exposure | Fewer exposures than the plan asked for; gaps > 10 days; repeated same-weekday misses | `loggedSessions`, `missed` signal, section 8 |
| A real plateau | Comparable exposures, adequate frequency, no readiness or pain signals, metric flat over 3+ weeks | the conjunction of the above being false |

The ordering matters: check exposure count, then comparability, then fatigue, then technique,
and only then call it a plateau. Three of the four impostors are cheaper to fix than a plateau
is, and two of them (fatigue, technique) get WORSE if you respond to them with more load.

[S24] adds the boundary case: a performance decrement that persists across weeks together with
low mood, poor sleep and elevated effort is the overreaching spectrum, not a programming
plateau, and the response is reduced load and time, not a new exercise. An app cannot diagnose
non-functional overreaching (it requires exclusion of medical causes), so the correct behaviour
is to stop escalating and say plainly that this is now a question for a human.

### 4.4 The intervention ladder, in order

Cheapest and most reversible first. Each rung names its observation window and its revert rule
(section 9 formalises them). Never skip a rung, never run two rungs at once on the same lift.

| # | Intervention | What changes | Observe | Basis |
|---|---|---|---|---|
| 0 | Say nothing, wait one more comparable exposure | nothing | 1 exposure | S21 noise band |
| 1 | Effort and rest check | rest to the top of the movement's band; target RIR 1-2 on the last set | 2 exposures | S3, S2, S7 |
| 2 | Rep-side progression | hold the load, climb reps within range | 2-3 exposures | S19 |
| 3 | Rung reset (back-off and re-climb) | drop ~10% load, restart the range at its bottom | 3 exposures | S1 increment band applied downward; deload survey lists load reduction as standard practice S10 |
| 4 | Targeted deload | one week, that lift or that muscle: volume down 40-50%, load down modestly, FREQUENCY AND SELECTION UNCHANGED | 1 week + 2 exposures after | S10 (6.4 +/- 1.7 days, every 5.6 +/- 2.3 weeks), S11 |
| 5 | Volume move | add or remove sets per the section 5 rules | 2-3 weeks | S18, S25 |
| 6 | Exercise variation | swap to a sibling pattern with a different loading profile, keeping the slot | 3-4 exposures | S1 (planned variation), S10 (athletes keep selection during deload, so variation is a step BEYOND deload) |
| 7 | Movement promotion or regression | the phase engine's chain step, or one step back down it | next phase | in-house; unchanged |

Rungs 1-3 are the ones J8 should ship first: they are cheap, reversible, explainable in one
sentence, and three of the four impostors in 4.3 are harmless if a rung 1-3 intervention fires
on them by mistake. Rungs 4-7 change the plan's shape and each one needs the outcome ledger of
section 9 before it is allowed to fire twice.

### 4.5 Hysteresis, and why the shipped shape is right

`fatigue.ts` raises the failing flag at 3 short sessions in 21 days and clears it only after 2
clean sessions in a row, wiping the ledger on clearing. That asymmetry (slow to accuse, slow to
forgive, but forgiveness is total) is the correct general shape for every threshold in this pack,
for a reason that is not physiological but statistical: a rule that can flip on the calendar
alone produces changes the athlete cannot attribute to anything they did. Apply the same shape to
plateau: once a plateau is declared, it clears only on one comparable exposure exceeding the
window best by more than 5%, or on the athlete accepting an intervention that then succeeds
(section 9). It does not clear because time passed.

---

## 5. VOLUME AUTOREGULATION

### 5.1 What the accounting should be (and BodyT already is)

[S18] tested three ways of counting indirect sets (`total` = 1, `fractional` = 0.5, `direct` = 0)
across 67 studies and 2,058 participants, and the FRACTIONAL method predicted both hypertrophy
and strength best. BodyT's `PRIMARY_WEIGHT = 1` / `SECONDARY_WEIGHT = 0.5` is therefore no
longer an in-house convention: it is the best-supported quantification in the current
literature, and section 11 promotes it from INVENTED to SOURCED. Nothing about it should change.

Reference anchors from the same source, useful because they say what the evidence base actually
did rather than what it recommends: median training-group values were 10.5 fractional sets per
week and 2 sessions per week for hypertrophy effects, 6 sets per week and 2 sessions for
strength effects, with median inter-set rest 1.75-2 min and ~10 reps per set.

### 5.2 The bands

| Scope | Band | Source |
|---|---|---|
| Weekly, per muscle, trained | 12-20 direct sets as a standard recommendation, inverted-U past that | S31 |
| Weekly, per muscle, general | more volume gives more hypertrophy with clear diminishing returns; strength diminishes much faster and plateaus low | S18 |
| Per session, per muscle | around 11 fractional sets before extra sets stop being detectably better | S32, PROVISIONAL |
| Maintenance floor | 1 set per exercise, 1 session per week holds strength and (in the young) size for up to 32 weeks | S23 |
| Minimum useful dose | meaningful 1RM gains on a very small number of hard sets per week in trained men | S35 |

BodyT's per-session ceilings (small 8, large 10, focus +4 giving 12 or 14) sit inside these
bands, with the focus bonus deliberately pushing the day's target muscle past the provisional
per-session point of diminishing returns. That is defensible for a muscle the day exists for
and indefensible as collateral, which is exactly the distinction `volume.ts` already draws.
Keep the numbers. Change only how they move.

### 5.3 What justifies moving a per-muscle ceiling

Moving a ceiling is a claim about THIS athlete's tolerance, and [S9] is blunt that volume
autoregulation is the under-evidenced half of the autoregulation literature. So the bar is high,
the steps are small, and the whole thing is a suggestion.

RAISE the per-session ceiling for one muscle by +1 fractional set when ALL of these hold over
the last 4 weeks (HOUSE HEURISTIC, thresholds chosen to mirror `calibration.ts`):

1. Adherence: at least 75% of planned sessions completed, no gap over 10 days.
2. No shortfall evidence on that region: no failing flag on any movement whose primary is that
   region, and fewer than 2 short sessions inside the 21-day window.
3. No pain or form notes on that region inside `RECENT_DAYS`.
4. Effort headroom: where RIR was reported on that region's movements, the median is >= 2 on
   the last set. Where it was not reported, treat as absent evidence and do not raise.
5. The athlete's weekly fractional total for that muscle is still below the weekly band [S31].
6. The last 2 weeks contained no deload week, no readiness downgrade and no bad-sleep cut, so
   the tolerance being claimed was actually tested.

LOWER the ceiling by 1 fractional set when ANY of these holds:

1. `watch-region` fires (3 different movements on that muscle ran out inside 21 days).
2. Two consecutive weeks where planned sets on that region were not completed.
3. A failing flag raised on a movement whose primary is that region.
4. Two readiness downgrades or two bad-sleep cuts inside 14 days (the athlete's week is not
   supporting the current dose, whatever the muscle thinks).

Lowering needs one signal, raising needs six. That asymmetry is the same shape as
`fatigue.ts`'s flag hysteresis and is deliberate.

### 5.4 How far, and how fast

- Step size: 1 fractional set. Never 2.
- Rate: at most one change per muscle per 2 weeks. [S25]'s progression trial added 4-6 sets per
  week every 2 weeks at the WEEKLY level and found benefit at moderate starting volumes; its
  companion trial found that raising an already-trained lifter's volume 30-60% did not beat
  maintaining it. One fractional set per muscle per fortnight is inside the slower of the two.
- Total drift cap: +/-2 fractional sets from the base ceiling, so the effective range is 6-10
  small / 8-12 large, plus the unchanged `FOCUS_BONUS`. This mirrors `calibration.ts`'s
  `MAX_DRIFT = 0.5` in spirit: a personal number that can never wander far from the researched
  one. HOUSE HEURISTIC on the exact cap.
- Direction of first move: down. A raised ceiling is an invitation to more fatigue, and [S25]
  says maintenance is a live winner for trained lifters. When the evidence is ambiguous, hold.

### 5.5 Anti-spiral guards (non-negotiable)

The load-spiral bug family is documented in this repo (`reps.ts`: backing off on feel alone took
25 lb to 0 in five weeks). Volume has the same failure mode in both directions. Guards:

1. NEVER raise off a softened week. Deload weeks, readiness downgrades, bad-sleep cuts, light
   days and `minimum` sessions are excluded from the evidence window entirely, on both sides.
   (Same rule `prescription.ts` already applies to `light` baselines.)
2. NEVER let a lowered ceiling become the new base. Store the base and the delta separately,
   exactly as `dayLoad`/`adapt` are stored separately from the plan today.
3. Cap the delta, both directions (5.4).
4. One change per muscle per 2 weeks, and no change at all inside an open intervention window
   (section 9). Two interventions on one muscle at once cannot be attributed.
5. A raise expires. If the muscle's ceiling was raised and adherence then falls below 75% for
   2 weeks, it reverts to base without ceremony and says so.
6. The weekly band [S31] is a hard outer wall for the SUM of the per-session ceilings across a
   week. A per-session raise that would push the weekly total past the band is refused.
7. Ceiling changes are proposals with evidence, never silent. "Your chest work has finished
   clean for four weeks, want one more set on push days?" is the shape; auto-applying it is not.

### 5.6 Volume versus load when both are candidates

[S18]: strength gain plateaus at low volumes and is much more sensitive to diminishing returns
than hypertrophy is; [S7]: strength gain is roughly independent of proximity to failure while
hypertrophy is not. Practical ordering for J8, per goal:

- Goal is strength: fix load progression and rest first (sections 3, 6); volume is the last
  lever, not the first.
- Goal is size: volume is a legitimate first lever once effort and rest are adequate, within the
  bands, and only through the 5.3 gate.
- Goal is fat loss or general health: do not chase volume at all; adherence and total activity
  are the levers, and this pack has nothing to add over R1.

---

## 6. REST PRESCRIPTION

### 6.1 The sourced bands

| Goal / context | Rest | Source |
|---|---|---|
| Heavy strength work (1-6 RM), multi-joint | 3-5 min per the position stand; 3 min beat 1 min in trained men on BOTH strength and thigh hypertrophy | S1, S3, S33 |
| Power (light and fast, 0-60% 1RM) | 3-5 min | S1 |
| Hypertrophy, compound (6-12 RM zone) | 1-2 min by position stand; the meta finds no appreciable further benefit past ~90 s; the trained-men RCT disagrees and favours 3 min | S1 vs S2 vs S33 |
| Hypertrophy, isolation / small muscle | 60-120 s | S1, S2 |
| Local muscular endurance (40-60% 1RM, >15 reps) | short, under 90 s | S1 |
| What the evidence base actually used | median inter-set rest 1.75-2.0 min | S18 |
| TRAINED lifter, any goal | >2 min to maximise strength gains | S3 |
| UNTRAINED lifter, any goal | 60-120 s is sufficient for strength; even <60 s produces robust gains | S3 |

Note the gap between the position stand (3-5 min for heavy multi-joint work) and both what the
studies did (median ~2 min) and what BodyT prescribes (max 240 s, mostly 90-150 s). BodyT's
current defaults are short of the stand for heavy compound work and inside the band for
everything else.

DISAGREEMENT, preserved deliberately: [S2] (9 RCTs, Bayesian, mostly untrained, 5-10 weeks)
finds rest length barely matters for hypertrophy and explicitly says the data are insufficient
for trained lifters; [S33] (21 trained men, 8 weeks) finds 3 min clearly better than 1 min for
both outcomes; [S30] revisits the trained-only question and leaves it open. BodyT should not
resolve this. It should default to the longer end for trained lifters and compound work, treat
short rest as a legitimate time-saving trade rather than an equal option, and say so honestly
when it shortens rest for a time budget.

### 6.2 The modifiers

Rest is a function of what the set cost, not of the exercise's name alone. Ordered by how much
they should move the number (HOUSE HEURISTIC in the sizes, sourced in the directions):

| Modifier | Direction | Basis |
|---|---|---|
| Multi-joint vs single-joint | +30 to +60 s for multi-joint | S1 exercise-order and loading guidance; HOUSE HEURISTIC on the size. Note that S3's moderator was TRAINING STATUS, not exercise type |
| Training age: 6+ months of consistent training | +30 to +60 s over the untrained band | S3 (23 studies, 491 participants) |
| Load: heavy low-rep (<= 6 reps) vs moderate (8-15) | +60 to +120 s for heavy; the stand's own gap between its heavy band (3-5 min) and its hypertrophy band (1-2 min) is that big | S1 |
| Proximity to failure: set taken to 0-1 RIR | +30 s over the same set at 2-3 RIR | S7 (effort is what costs), S5 (RIR is most trustworthy exactly here) |
| Set that missed its ask by >= 2 reps | +30 s before the next set, before any load drop is considered | in-house, consistent with `sessionFatigue.ts` |
| Small isolation, high rep | -30 s | S1, S2 |
| Time budget binding | cut rest only after cutting sets, and only on isolation work | S34, S33 |

Prescribe RANGES, never a single second count: "2 to 3 minutes" with the timer starting at the
bottom of the range. BodyT currently stores a single `restSec` per exercise (90 s x17, 120 s x17,
150 s x14, 60 s x6, 180 s x5, 240 s x2, 45 s x1, 30 s x5, 0 x10), which is a reasonable point
estimate per movement but carries no goal, no load and no failure-proximity awareness. The
minimal honest upgrade is a band per movement class plus the modifiers above, resolved to a
range at prescription time.

### 6.3 Rest and the time budget

`trimToFit` currently buys minutes by lowering the volume ceiling (up to `MAX_TIME_SLACK = 6`),
which is the RIGHT first move: [S33] and [S3] both say the sets you keep are worth less if you
rush them, and [S34] lists exercise-count reduction and pairing before rest compression.
Order of operations when the budget binds (HOUSE, sourced inputs):

1. Drop redundant late isolation work (already implemented).
2. Shave sets from the bottom (already implemented).
3. Pair non-competing movements (antagonist or unrelated-muscle supersets) so total rest per
   muscle is preserved while wall-clock time falls [S34].
4. Only then shorten rest, isolation first, never on the day's lead compound.
5. Never below 45-60 s on compound work, and say what was traded.

### 6.4 Learning an individual's rest response, the calibration.ts way

This is a genuine gap and a genuine opportunity, and the literature gives no personal-response
model at all, so every number here is HOUSE HEURISTIC with a sourced skeleton.

The sample: for each completed set with a preceding rest interval measured by the app's own
timer, record (movement class, load relative to the movement's recent best, rest seconds
actually taken, reps asked, reps achieved, RIR if given). The measurable question is the one
`calibration.ts` asks: where does THIS athlete's rest stop buying reps?

- Signal: reps achieved on set N given rest before set N, holding load and set index roughly
  constant. A rest that preserves the ask is "sufficient"; one that does not is "short".
- Minimum evidence: 4 samples per movement class before a personal band is used, 3 for a global
  lean across classes (mirrors `MIN_ACTIVITY_SAMPLES = 4` / `MIN_BIAS_SAMPLES = 3`).
- Blend: `w = n / (n + 6)` toward the personal value, capped at +/-50% drift from the sourced
  band (mirrors `PRIOR_STRENGTH = 6`, `MAX_DRIFT = 0.5`).
- Floor and ceiling: never learn below 45 s on a compound or above 5 min for a working set.
  (The 5 min figure appears in [S13] only as a post-rhabdomeolysis rehabilitation protocol, so
  it is an outer bound, not a target.)
- What it may move: the SUGGESTED rest range and the timer's default. What it may never move:
  the load, the rep target, or the set count. The precedent is `calibration.ts` refusing to let
  perceived intensity touch calories.
- What it says: "You hit your reps on 90 seconds on curls all month, so the timer starts there
  now" is legible; a silent change is not.

Honest limit: an athlete who rests exactly as long as the timer says produces no variance and
therefore no learning. This model only learns from an athlete who varies, which most will,
because life does it for them.

---

## 7. RECOVERY AND READINESS

### 7.1 What actually predicts a session that should be cut

| Predictor | What the evidence says | Strength of evidence |
|---|---|---|
| Acute sleep loss (<= 6 h) | overall performance -7.6%; strength and power are among the LEAST affected categories; effect grows ~0.4% per additional hour awake; concentrated in PM sessions and in deprivation / late-restriction patterns, with AM tasks largely unaffected | Strong [S17]: 69 studies, 227 outcomes |
| Subjective wellness (self-report) | tracks acute and chronic load with better sensitivity and consistency than resting HR, blood markers and other common objective measures | Strong [S16] |
| Session-RPE load, monotony, strain | monotony = weekly mean load / SD of daily load; high load combined with high monotony is the pattern associated with breakdown | Moderate [S20] |
| Daily readiness-guided prescription | can match or beat a fixed program while using fewer hard sessions | Moderate, and endurance-only [S28] |
| Persistent multi-week decrement + malaise | overreaching spectrum: functional (days to ~2 weeks), non-functional (weeks to months), overtraining syndrome (months to years); diagnosis needs exclusion of medical causes | Consensus [S24] |
| Load spikes | ramp in small, individualised increments; both too much AND too little load raise injury risk | Consensus [S14], CONTESTED by [S27], which finds no causal support for ratio-based load management |
| Soreness | poor proxy for readiness: DOMS peaks 24-72 h and its time course is distinct from the strength-loss time course | Moderate [S26] |

The single most useful reading of [S17] for BodyT: sleep loss costs REPEATED efforts and raises
perceived exertion far more than it costs a single maximal effort. That is exactly the sentence
already written in `adapt.ts`, and it is correct. The refinement the source adds is that a
morning session after a bad night is much less compromised than an evening one.

### 7.2 Reconciling with the four flags and the 2-flag downgrade

The four shipped flags are: slept under 6 hours; wired or run-down; legs sore or heavy;
genuinely low energy. Downgrade at 2 of 4. Evaluated against the evidence:

| Flag | Verdict |
|---|---|
| Slept under 6 hours | The best-supported item on the list [S17], and the 6 h line matches the source's own operational definition of acute sleep loss. Keep, and keep it worth a full point |
| Genuinely low energy | Subjective wellness items of this kind are the ones that track load [S16]. Keep at full weight |
| Wired or run-down | Overlaps "low energy" and imports a resting-HR intuition that [S16] specifically finds inferior to plain self-report. Keep the item, weight it lower |
| Legs sore or heavy | Soreness is the weakest predictor on the list: its time course does not match the performance-loss time course, and after a novel movement it is expected rather than diagnostic [S26]. Keep the item, weight it lower |

PROPOSED (HOUSE HEURISTIC, sourced inputs): weight sleep and low energy 1.0, wired and sore 0.5,
downgrade at >= 1.5. Behaviour changes in exactly one place: sore + wired alone stops triggering
a downgrade, while every pair containing sleep or low energy still does. Two weak items should
not outvote the two strong ones. This is a golden-lock-visible change and section 11 flags it.

Second refinement, cheap and sourced: if the session is scheduled in the morning, a lone
sleep flag should carry less weight than the same flag before an evening session [S17]. BodyT
knows session time only loosely today, so this is a J8-optional item, not a requirement.

### 7.3 What a cut may and may not touch

Sourced and already correct in BodyT, restated so J8 cannot drift:

- Readiness moves VOLUME (sets, explosive volume), never the progression ladder.
- A readiness-lightened day is marked `light` and never becomes the next baseline. Load
  provenance is what killed the load-spiral family and it applies to every new intervention in
  this pack.
- The load may come down for a lightened day, but the rung does not reset; the plan owes the
  athlete the same rep target next time it is a real session.
- Never take a rest day as the response to poor readiness. [S17] says the session is worth
  doing at lower volume; [S23] says even one set maintains. Cancelling is the worst option on
  the list and the one an anxious app reaches for first.

### 7.4 Overreaction guards

1. Two nights, not one. One bad night is inside normal variation and the effect size on strength
   is small [S17]. BodyT already requires two consecutive nights for the automatic cut and >= 2
   inside 3 days for the signal. Keep.
2. Never stack. One cut per session, whichever fires first, and the app must be able to say
   which one. `resolveDay` and `sessionStart` already guard this in three places; every new
   intervention must join that guard rather than add a fourth path.
3. Cap the total reduction. No combination of guards may remove more than about a third of a
   day's working sets, and no lift may fall below 2 working sets. Both floors exist today.
4. Do not punish honesty. If every flagged day shrinks, athletes stop flagging, and the app
   loses the best predictor it has [S16]. Countermeasure: a downgraded day must still produce a
   completed session and must be described as a smaller version of the same day, never as a
   failure, and the debrief should confirm the trade was worth it (section 9).
5. Do not diagnose. The overreaching spectrum needs medical exclusion [S24]. BodyT's ceiling is
   "this has been going on for weeks, that is a question for a human", said once, not repeatedly.
6. Do not build an ACWR. [S14] supports gradual individualised ramping; [S27] shows the ratio
   metric itself has no causal support. Ramp rules yes, ratio thresholds no.

---

## 8. MISSED SESSIONS AND SCHEDULE FIT

### 8.1 The four responses, and when each is right

| Response | Use when | Basis |
|---|---|---|
| SKIP (let it go, no catch-up) | the week is nearly over, or the missed day's muscles are trained again inside the next 3 days anyway, or the athlete missed for recovery reasons (illness, readiness) | S23 (a missed session is not a lost adaptation), S18 (volume is a weekly-scale variable) |
| RESCHEDULE (same session, later day) | there is a free day in the same week, and moving it does not put two hard sessions on the same muscle back to back | S29, S18 |
| REDISTRIBUTE (fold the day's lead work into the next session) | no free day, but the next session can absorb 2-4 fractional sets without breaching its ceilings | S29 (frequency is largely interchangeable at equal weekly volume for hypertrophy), constrained by section 5 |
| COMPRESS (shorter version of the session, same day) | the athlete has less time, not less capacity | S34, S35, S23; already shipped as `minimumViableFor` |

DISAGREEMENT, preserved: [S29] finds no independent effect of frequency on strength once weekly
volume is equated, which licenses redistribution; [S18] finds a positive frequency-strength
dose-response with 100% posterior probability while finding frequency negligible for hypertrophy.
Both cannot be flatly true. The safe synthesis for a suggest-only app: redistribute freely for
size-driven work, prefer rescheduling over redistribution for strength-driven work, and never
claim the redistributed week is equivalent.

Hard rule against catch-up stacking: never add a missed session's whole volume onto another day.
It breaches the per-session ceilings (section 5), and it is exactly the rapid load increase
[S14] warns about, in the one place an app can cause it single-handedly.

### 8.2 When repeated misses become a schedule proposal

A 14-day window contains only 2 chances to miss a given weekday, so `SIGNAL_WINDOW_DAYS` cannot
see a schedule problem. Schedule fit needs its own longer window (HOUSE HEURISTIC):

- Look back 6 weeks per weekday slot.
- Propose a schedule change when a weekday is missed on 3 of its last 4 scheduled occurrences,
  or 4 of the last 6, AND the athlete's other days are being completed at a materially higher
  rate. Otherwise it is an adherence problem, not a schedule problem, and moving the day will
  not fix it.
- The proposal names the specific swap, states the evidence in one sentence, and is offered
  ONCE. A decline is recorded and the proposal does not return for at least 6 weeks or until
  the pattern changes materially (section 9).
- Frequency preservation is the goal: propose moving the day, not deleting it [S18, S29].

### 8.3 Absence and what it costs

| Away | Expected loss | Response |
|---|---|---|
| <= 7 days | none worth modelling | nothing; keep the rung, keep the load |
| 8-14 days | negligible strength loss; conditioning starts to slip | keep load, expect one slightly harder session; no reset |
| 2-4 weeks | strength largely retained [S12]; but [S13] mandates >= 50% volume reduction in week 1 and 30% in week 2 after >= 2 weeks inactivity | KEEP THE LOAD, CUT THE VOLUME 50% then 30% over two weeks, then normal |
| 4-12 weeks | measurable strength loss, larger for recently acquired strength and for eccentric/power qualities [S12]; retraining is fast [S13] | cut volume as above, and give load back in steps; expect the rung to be re-earned within 2-4 weeks |
| > 12 weeks | treat as unknown capacity | the full 4-week 50/30/20/10 volume ramp [S13], conservative starting load, double progression does the rest |

### 8.4 Reconciling with `STALE_DAYS` and `LAYOFF_STEP_DAYS`

BodyT today: at 21 days away the rep target resets to the bottom of the range; past 28 days one
load step is given back per further 4 weeks, capped at 3 steps. Nothing cuts VOLUME on return.

The sourced correction is that BodyT has the two levers backwards for the 2-4 week case. [S12]
says strength is largely retained to about 4 weeks, so handing back load at 28 days is more
conservative than the evidence requires; [S13] says the thing that must come down on return is
VOLUME, by half, for a week. Recommended (and section 11 lists it as the change with the most
evidence behind it):

- 0-14 days: unchanged behaviour.
- 15-28 days: keep the load, reset the rep rung to the bottom of the range (BodyT's existing
  `STALE_DAYS` behaviour, one week early), AND cut the first week back to ~50% of normal sets,
  the second to ~70%. Say why, in one sentence, once.
- 29-90 days: as above plus the existing per-4-week load give-back, capped at
  `MAX_STALE_STEPS = 3`.
- 90+ days: a 4-week volume ramp (50/30/20/10 style), and treat the movement's history as a
  prior, not a prescription.

The DOMS asymmetry matters for the copy: the first session back is the one that causes the
damage, and the receipt arrives 24-72 h later [S26]. So the honest sentence is not "take it easy
today because you are weak", it is "today will feel fine and Thursday will not, so this week is
half volume". The repeated bout effect means the SECOND session back is much cheaper, which is
also why the ramp is short.

---

## 9. INTERVENTION OUTCOME LEARNING (the core of J8)

### 9.1 The five rules that make an outcome readable

1. PRE-REGISTER. The metric, the window and the revert rule are fixed WHEN the intervention is
   offered, never chosen afterwards. An outcome picked after the fact is a story, not a result.
2. ISOLATE. One open intervention per target at a time (target = exercise, muscle region,
   schedule slot, or whole plan). A second one on the same target closes the first as
   `unattributable`.
3. COMPARE LIKE WITH LIKE. Baseline = the comparable exposures (section 4.2) immediately before
   the intervention; outcome = comparable exposures inside the window. Softened sessions
   (deload, readiness, bad sleep, light, minimum) are excluded from both sides.
4. EVERY INTERVENTION MUST BE ABLE TO FAIL. If no observation could mark it "did not work", it
   does not ship. This is the rule that keeps the ledger from becoming a compliment generator.
5. REVERT IS A FIRST-CLASS OUTCOME AND IS SAID OUT LOUD. "That did not help, so it is back to
   how it was" is the sentence that makes an app trustworthy; silent reversion is a bug.

### 9.2 Per intervention type

| Intervention | Outcome watched | Minimum window | Success | Revert / escalate rule |
|---|---|---|---|---|
| In-session load drop (`drop-load`, automatic) | remaining sets of that movement completed at the ask | rest of that exercise | remaining sets completed | none needed (per-set, and `light` provenance keeps it out of the baseline). If the drop repeats on the same movement in 3 sessions inside 21 days, escalate to the failing flag, which already exists |
| Failing-flag softening (`start-lighter`) | shortfalls stop | 2 consecutive clean sessions | flag clears, full prescription returns | shipped and correct: raise at 3 shorts in 21 days, clear at 2 clean, clearing wipes the ledger. If 2 clean sessions never arrive within 6 exposures, escalate to plateau ladder rung 3 |
| Accepted `reduce-volume` | day completed; next comparable session not short | that session + the next comparable one | completed and next session clean | if the next session is also short, the problem was not that day's volume: escalate to section 5 ceiling review |
| Accepted `hold-load` | the held ask is cleared next time | 1 comparable exposure | cleared | if not cleared, the load is too high independent of the week: rung 3 (back-off and re-climb) |
| Automatic substitution (equipment) | session completed | 1 exposure | completed | reverts by itself when the equipment returns; if the athlete keeps the substitute for 4 exposures, offer to make it the slot's default |
| Automatic substitution (joint pain) | no new pain notes on that joint | 3 exposures or 21 days | no pain notes | if pain notes continue on the substitute, the substitution was not the fix: stop substituting, offer the reduce-load path, and say plainly that two weeks of this is a physio question (`adapt.ts` already writes that sentence) |
| Reduce-load for a stated limitation | pain-free completion | 3 exposures | completed without pain notes | on 3 clean exposures, offer ONE step of load back, never automatically; on any pain note, stay down and stop offering |
| Readiness downgrade | the day was completed, and the next comparable session is not degraded | that session + next | completed, next session normal | pattern-level learning only: if downgrades are followed by normal sessions >= 4 times, the flags are firing early for this athlete; propose (never impose) treating single weak flags as informational. HOUSE HEURISTIC |
| Deload week | rebound: best e1RM or rep-max in the 2-3 comparable exposures after exceeds the pre-deload window best | 2-3 comparable exposures after the deload | any exceedance | no rebound and adherence was fine: the deload was not the missing piece, escalate to ladder rung 5 (volume) and record that scheduled deloads are not this athlete's bottleneck |
| Volume ceiling raise | completion rate holds, no new failing flags, no region pain notes | 2 weeks / 4 comparable sessions | all three hold | any one fails: revert to base ceiling immediately, and do not re-offer for 6 weeks |
| Volume ceiling lower | shortfalls stop and completion returns | 2 weeks | shortfalls stop | if shortfalls continue at the lower ceiling, volume was not the cause: check rest, effort and sleep before touching volume again |
| Rest change | reps achieved on sets 2+ of the movement | 3-4 exposures | reps held or improved at the new rest | revert to the sourced band; a personal rest band that fails twice is abandoned for that movement class |
| Schedule change | adherence on the moved slot | 4 occurrences of that weekday | attendance improves by >= 2 of 4 | revert to the original day and stop proposing schedule changes for 8 weeks |
| Exercise variation for plateau | progress on the new movement over its own first 4 exposures, compared with the stalled movement's last 4 | 4 exposures | progress resumes | return to the original movement and escalate to rung 7, recording that variation is not this athlete's answer for that pattern |
| Phase promotion | the promoted lift is not `stalled` at the next judgement, and no failing flag appears | mid-phase check at `MIN_SESSIONS_TO_JUDGE` exposures, full check at the phase boundary | not stalled, no flag | demote one chain step if the promoted lift both stalls and raises a failing flag. A promotion the athlete cannot execute is worse than no promotion |
| Any proposal DECLINED | whether the same evidence recurs | n/a | n/a | see 9.3 |

### 9.3 Declines: recorded, not re-nagged

Today declines leave no trace, which is defended in `types.ts` as keeping a rejected suggestion
from shaping next week. That defence is right about the PLAN and wrong about the CONVERSATION:
with no record, the same proposal can be re-offered every single day off the same evidence.

Proposed (HOUSE HEURISTIC, shaped like `surfacedInsights` cooldowns, which already exist):

- Record `(proposalType, target, evidenceSnapshot, declinedAt)` in the append-only decision log
  (B1). Store the DECLINE, not a plan change. Nothing about the prescription moves.
- Cooldown: do not re-offer the same `(type, target)` for at least 14 days.
- Materially-changed exception: re-offer sooner only if the evidence strengthened by a real step
  (e.g. the pain count went from 2 to 4, or a new signal kind joined), and say what changed:
  "You said no to this two weeks ago. It has happened twice more since."
- Three declines of the same `(type, target)`: stop offering it for 8 weeks and record it as a
  preference, visible and reversible in settings. Four is nagging in any language.
- Declines never feed the load or volume engines. They feed only the offering policy.

### 9.4 What the ledger must store (feeds B1, schema v21)

Per decision: id; type; target; rule version; the evidence snapshot as VALUES not prose (counts,
dates, metric values); offered_at; response (`accepted` / `declined` / `expired-unseen`);
applied_at; pre-registered metric id; window definition; window_closes_at; baseline value;
outcome value; verdict (`worked` / `no-change` / `worse` / `unattributable` / `abandoned`);
revert_action_taken. Append-only, never edited; a later correction is a new row.

Two properties make it useful rather than decorative: (1) the verdict is computed by the same
deterministic code that computed the trigger, so a golden test can pin both; (2) `unattributable`
is a real, common outcome and must be as easy to record as success.

### 9.5 What learning is allowed to change

Allowed: which proposals are offered, in what order, at what thresholds, and the personal bands
(rest, volume ceiling delta, readiness flag weighting) inside their capped drift.

Not allowed, ever: silently changing the load, the rep rung, the plan's structure, or the safety
rules (R6's red flags, limitation routing). The precedent is `calibration.ts` refusing to let a
felt intensity touch a calorie number: a learned preference may move a SUGGESTION, never a
physical claim or a safety boundary.

---

## 10. EVAL CASES

Table tests for J8. Each is a state transition: what is on disk, what the engine should decide,
and what it must NOT do. "Says" means one sentence to the athlete; everything is suggest-only
unless marked automatic. These are written to be portable into `adapt.test.ts`,
`progression.test.ts`, `volume.test.ts` and a new `intervention.test.ts`.

| # | Given | Expect | Must not | Basis |
|---|---|---|---|---|
| E1 | Bench 8x3 clean for 6 weeks, then one session: set 3 came out 6 of 8, athlete answered `heavy` | in-session `drop-load` for the remaining sets; next session one load step back (fell short AND heavy); rep rung held | no plateau call, no volume change, no deload, no failing flag (1 of 3) | S21 noise band; sections 3.4, 4.1 |
| E2 | Same lift, 3 comparable exposures, best-set e1RM down 7%, 9%, 6% vs the window opening | regression call: failing-flag softening path, ladder rungs 1-2 offered; plateau/regression recorded with a pre-registered 2-clean-session outcome | do not promote at the phase boundary; do not raise any ceiling | sections 4.1, 4.4, 9.2 |
| E3a | 3x10 cleared at reported RIR 4 | rep rung +1 (or wrap to load if at range top) | no hold | S7, section 3.3 |
| E3b | Same 3x10 cleared at reported RIR 0 | hold the ask; no load step | do not back off (nothing was missed) | S7, `reps.ts` shipped logic |
| E4 | Novice, set of 15 lateral raises, reports RIR 0, hit the ask | progress the rung anyway on the second occurrence; treat RIR 0 at high reps from an untrained lifter as weak evidence | do not hold indefinitely on repeated RIR 0 at high reps | S5 |
| E5 | Same movement, same load: on 90 s rest set 3 comes up 2+ short in 3 of 4 exposures; on 180 s it holds | learn a personal rest lean for that movement class after >= 4 samples; suggest the longer rest and say why | do not change load; do not exceed +/-50% drift from the sourced band | S3, S33, calibration pattern |
| E6 | Same comparison, reps identical at 90 s and 180 s across 4 exposures | keep the shorter rest, say the trade is neutral for this athlete and that it buys minutes | do not "upgrade" rest by default | S2 |
| E7 | Friday session missed on 5 of its last 6 scheduled occurrences; Mon/Wed completion 90% | ONE schedule proposal naming a specific swap | do not delete the session; do not reduce the week's volume; do not re-offer inside 6 weeks after a decline | S18, S29, section 8.2 |
| E8 | Friday missed 2 of 6, and Mon/Wed also at 60% completion | no schedule proposal; adherence framing only | do not move the day (the day is not the problem) | section 8.2 |
| E9 | Athlete states 25 minutes for a 70-minute session | `trimToFit`: drop redundant late isolation, shave from the bottom, pair non-competing movements, keep the lead compound's sets and full rest | never shorten rest on the lead compound; never claim the short day equals the full one | S34, S33, S3 |
| E10 | Squat load flat at 135 for 4 weeks while the rep target climbed 8 -> 11 and all sets cleared | no plateau, no intervention: this is double progression working, and the wrap will pay the load step | do not call it a stall; do not add volume; do not vary the exercise | S19, `reps.ts` |
| E11 | Squat: 4 comparable exposures over 3.5 weeks, e1RM within +/-3%, reps not climbing, adherence 90%, no pain, no readiness flags | plateau declared once; ladder rung 0 then 1 | do not jump to exercise variation or promotion | sections 4.1, 4.4 |
| E12 | First ever exposure to a novel eccentric-heavy movement (RDL, split squat); next session on it comes up short and soreness reported | discount the FIRST exposure to any movement from the shortfall counter; expect the second exposure to be markedly better | do not raise a failing flag off exposures 1-2; do not cut the plan | S26 |
| E13 | Returning after 6 weeks off, week 1 back feels great, athlete asks for more weight | hold the ramp: keep load, ~50% of normal sets week 1, ~70% week 2; explain that the bill arrives 24-72 h later | do not add load or sets on the athlete's feel alone in week 1 | S13, S26, S12 |
| E14 | Returning after 10 days off | nothing changes: same load, same rung | no reset, no volume cut, no commentary that implies decay | S12 |
| E15 | A `reduce-volume` proposal is declined | record `(type, target, evidence, declinedAt)`; do not re-offer for 14 days; re-offer sooner only if evidence strengthened, and then name what changed; 3 declines = 8 weeks silence plus a stored preference | never change the plan because of a decline; never re-offer the same proposal the next day | section 9.3 |
| E16 | Two consecutive bad nights before a Monday CNS day, and the athlete also ticks 2 readiness flags | exactly ONE cut applies; the day's note names which one | never stack the bad-sleep cut and the readiness downgrade | shipped guard in `resolveDay`/`sessionStart`, section 7.4 |
| E17 | Readiness: only "legs sore" and "wired" ticked | under the proposed weighting (1.0 / 1.0 / 0.5 / 0.5, downgrade at >= 1.5) this does NOT downgrade; sleep + low energy still does | do not silently change behaviour without updating the golden lock | S16, S17, S26, section 7.2 |
| E18 | Four times running: athlete flags readiness, takes the trimmed day, and completes it easily with RIR >= 2 | propose relaxing the weighting for this athlete, once, reversibly | never impose it; never stop asking the question | S16, calibration pattern |
| E19 | Chest weekly fractional volume already at the top of the sourced weekly band; athlete asks for more chest work | refuse the ceiling raise, explain the weekly wall, offer redistribution across the week instead | do not raise the per-session ceiling past the weekly wall | S31, section 5.5 guard 6 |
| E20 | 4 clean weeks on back work: adherence 90%, no failing flags, no pain notes, median last-set RIR 2, weekly volume mid-band | offer +1 fractional set on that region; on acceptance open a 2-week / 4-session window with pre-registered outcome | do not raise by 2; do not raise two regions at once | S18, S25, section 5.3 |
| E21 | A raised ceiling is in effect, then adherence falls below 75% for two weeks | revert to base ceiling and say so plainly | do not keep the raise "because they earned it once" | section 5.5 guard 5 |
| E22 | An open plateau intervention window overlaps block week 4 (deload) | pause the window; exclude deload sessions from both baseline and outcome; extend `window_closes_at` | do not judge an intervention on deload sessions | sections 4.2, 9.1 |
| E23 | Knee flagged twice on split squats; a substitute exists and was applied automatically; 21 days pass with no pain notes | offer the original movement back, one step lighter, once | do not restore it silently; do not restore at the old load | `adapt.ts`, section 9.2 |
| E24 | Shoulder flagged 3 times on overhead press; no substitute spares the joint | `reduce-load` proposal with the shipped sentence, including the two-week physio line | do not keep escalating past two weeks; do not repeat the referral line every session | `adapt.ts`, S24 (do not diagnose) |
| E25 | Two hours of basketball logged the day before a lower day | propose one set off each lift at the same weight, and hold the load | do not propose a rest day; do not cut the load | S17 (repeated efforts vs maximal), `adapt.ts` |
| E26 | Athlete takes the minimum-viable option 3 times in one week | treat as a TIME signal: propose a shorter default plan or fewer movements per day | do not read it as fatigue; do not reduce load or call a plateau | S34, S23 |
| E27 | A single heavy double is logged inside a set-of-10 block, pushing e1RM 12% above the series | it is one point, capped at `E1RM_MAX_REPS`; it does not become the next opening weight for every set, and it clears a declared plateau only if it qualifies as a comparable exposure | do not treat a one-off max attempt inside a hypertrophy block as proof the plateau broke | `stats.ts`, `prescription.ts`, section 4.2 |
| E28 | Bodyweight athlete: pull-ups 6 reps -> 9 reps across a phase, 10 exposures | phase verdict `promoted` on the rep-max series (gain >= max(2, ceil(6 x 0.05)) = 2) | no load logic; do not score `untested` | `phase.ts` (J2), S19 |
| E29 | Athlete accepts `hold-load`, then clears the held ask comfortably next session | close the intervention as `worked`; resume normal progression the following session | do not hold a second time by default | section 9.2 |
| E30 | Deload week completed, then 3 comparable exposures show no rebound, adherence was 95% | close as `no-change`; escalate to ladder rung 5 (volume); record that scheduled deloads are not this athlete's bottleneck | do not deload again immediately | S10, S11, section 9.2 |

---

## 11. INTEGRATION NOTES

### 11.1 Constants that change status

| Constant | Was | Becomes | Source |
|---|---|---|---|
| `PRIMARY_WEIGHT = 1`, `SECONDARY_WEIGHT = 0.5` (volume.ts) | in-house convention | SOURCED. The fractional method (indirect = 0.5) was the best predictor of both hypertrophy and strength across 67 studies | S18 |
| `GAIN_TO_PROMOTE = 0.05` (phase.ts) | invented | SOURCED as a NOISE FLOOR, not a target: median 1RM test-retest CV is 4.2%, so 5% is the smallest defensible threshold | S21 |
| `loadStepLb` 10 lb lower / 5 lb upper | invented | SOURCED IN BAND (2-10%, larger for large-muscle exercises), with a known defect: 5 lb on a sub-40 lb single-joint movement is 12-25%, outside the band | S1 |
| Deload = volume down, weight kept, frequency and selection unchanged | invented | SOURCED: matches surveyed practice (6.4 +/- 1.7 days, every 5.6 +/- 2.3 weeks) and the practical recommendations | S10, S11 |
| Sleep response = fewer sets, same load | invented | SOURCED: sleep loss costs repeated efforts and raises perceived exertion much more than it costs maximal strength | S17 |
| Readiness check = subjective self-report | invented | SOURCED as an approach: subjective measures outperform common objective ones for tracking training response | S16 |
| Rest defaults (`restSec` per exercise) | invented point estimates | REPLACED BY SOURCED BANDS by goal, exercise size, load and failure proximity; the literature's own median is 1.75-2.0 min | S1, S2, S3, S33, S18 |
| Layoff handling (`STALE_DAYS`, `LAYOFF_STEP_DAYS`) | invented | PARTLY SOURCED, and partly wrong: the sourced response to 2-4 weeks away is to cut VOLUME 50% then 30% while KEEPING load, which BodyT does not do | S12, S13 |
| Per-session ceilings 8 / 10 / +4 | invented | STILL HOUSE, but now bracketed: ~11 fractional sets per session as a provisional point of diminishing returns, and a 12-20 weekly set wall | S32 (provisional), S31 |
| `SHORT_SESSIONS_TO_ACT = 3` / `CLEAN_SESSIONS_TO_UNFLAG = 2` | invented | STILL HOUSE, endorsed as the canonical hysteresis shape for every new threshold in this pack | - |
| `SIGNAL_WINDOW_DAYS = 14`, `RECENT_DAYS = 21` | invented | STILL HOUSE. Keep both; add a THIRD, longer window (6 weeks) for schedule fit and plateau, because a 14-day window cannot see a weekday pattern | section 8.2 |

### 11.2 Typed rule tables J8 needs (knowledge, not code branches)

House form per B2: typed data modules with build-time validation and a `source_refs` field on
every row, living in `src/plan/` (knowledge layer) so engines import downward only.

1. `ProgressionRule[]`: movement class x training-age band -> increment percent band, absolute
   min/max step, hold predicate, back-off predicate. Replaces the hard-coded 5/10 lb split.
2. `RestRule[]`: movement class x goal x rep band x failure proximity -> `{minSec, maxSec}` plus
   the section 6.2 modifiers. Replaces scalar `restSec`.
3. `VolumeCeilingRule[]`: region class -> base per-session ceiling, focus bonus, delta cap,
   weekly wall band, raise gate list, lower trigger list.
4. `PlateauRule`: metric id -> noise band, minimum comparable exposures, window days, the
   comparability predicate (which softening flags disqualify an exposure).
5. `LayoffRule[]`: days-away band -> rep reset yes/no, load give-back steps, week-1 and week-2
   volume factors, copy id.
6. `ReadinessFlagWeight[]`: flag id -> weight, plus the downgrade threshold, so the 2-of-4 rule
   becomes data rather than a `>= 2` in `sessionStart.ts`.
7. `InterventionSpec[]`: intervention type -> pre-registered metric id, window (exposures and/or
   days), success predicate, revert action, decline cooldown, escalation target. This is the
   table J8 is actually built around; sections 9.2 and 9.3 are its first rows.
8. `SourceRef[]`: the S-ids in this pack, with URL and access date, so a rule row can cite its
   evidence and the explain layer can quote it.

### 11.3 What J8 implements, in order

Smallest and least physiological first, so the ledger is proven before it is trusted:

1. B1 append-only decision/intervention log (section 9.4). Nothing else can be evaluated without
   it. Includes the SCHEMA_VERSION bump; coordinate in BODYT_STATE section 9.
2. Decline recording plus the cooldown policy (section 9.3). Pure offering-policy change, zero
   physiological risk, fixes a real nagging bug.
3. Outcome evaluation for interventions THAT ALREADY EXIST: `drop-load`, failing-flag softening,
   `reduce-volume`, `hold-load`, both substitution kinds, deload. No new interventions. This
   proves the ledger against shipped behaviour.
4. Plateau detector, shipped read-only first: compute, log, surface nothing. Then ladder rungs
   0-3 as proposals.
5. Volume ceiling delta: six-gate raise, one-signal lower, capped drift, weekly wall, expiry.
6. Rest bands and modifiers as sourced data; personal rest learning only after the bands land.
7. Schedule-fit proposal on the 6-week window.
8. Layoff volume ramp correction (section 8.4), which is the change with the most evidence
   behind it and touches `reps.ts` + `prescription.ts` + `transforms.ts`.

### 11.4 What must not change without golden review

- `golden.test.ts` and `goldenLife.test.ts` snapshots. Every item in 11.3 steps 5-8 moves them.
  Deliberate changes update the lock and state the reason in the same commit, per the standing
  constraint.
- The readiness flag weighting (section 7.2, case E17) is a deliberate behaviour change with a
  visible golden diff. It is the one item in this pack that changes what a shipped screen does
  on identical input, and it should ship alone, not bundled.
- The automatic/proposal boundary. Two automatic paths exist (equipment/limitation substitution,
  in-session load drop). J8 adds none. Anything that would auto-apply a volume, schedule or
  exercise change is out of scope by house rule, not by preference.
- Load provenance. Every load a rule lightens is marked `light` and never becomes a baseline;
  every new intervention that touches load must join that convention or it will resurrect the
  load-spiral family.
- Layering: rule tables in `src/plan`, engines in `src/engine`, no upward imports.
  `adapt.ts` (592 lines) and `volume.ts` (427) must not absorb the intervention engine;
  structure.test.ts allowances are shrink-only, so new behaviour goes in new files.
- The one-rep-number rule and the no-em-dash rule apply to every sentence this pack implies.
- Prove every new guard bites: feed the 6-week schedule detector a clean 6 weeks and watch it
  stay silent, feed it 5 misses and watch it fire once; do the same for the ceiling raise gate
  and the decline cooldown. Add each to the poison suite so a mutation that removes the guard
  fails a test.
- Simulation coverage: the 20x20 and 20x8 harnesses must exercise plateau, ceiling change,
  layoff return and decline cooldown at least once each across the persona set, with zero
  invariant failures, before J8 claims done.

### 11.5 Open questions this pack could not close

1. Per-session volume ceilings rest on one provisional secondary report [S32]. If the primary
   per-session paper becomes readable, the 8 / 10 / +4 numbers should be re-derived from it.
2. The trained-lifter rest question is genuinely unsettled [S2 vs S33 vs S30]. BodyT should
   default long for compounds and treat short rest as a stated trade, not resolve the dispute.
3. Frequency: [S29] says it does not matter at equal volume for strength, [S18] says it does.
   Redistribution policy (section 8.1) is written to be safe under either.
4. Volume autoregulation is the least-evidenced area in this pack [S9]. Every number in
   section 5 is a house heuristic wrapped around sourced outer bands, and the ledger in
   section 9 exists precisely so that these are the first thresholds the app corrects with its
   own data.
5. Nothing in the literature describes learning an individual's rest response. Section 6.4 is
   an extrapolation of `calibration.ts` into an unstudied space and should be labelled as such
   wherever it reaches the athlete.
