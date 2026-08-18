# R8: Endurance, Conditioning and Concurrent Training Evidence Pack

Research job R8 for BodyT. Deterministic local-first coaching PWA, no runtime LLM, general wellness, never diagnoses.
Covers v12 sections 15 to 17. Consumers of this pack: the plan generator (endurance goal currently falls through to a lifting layout), a new endurance planner module, the session resolver, and the existing cardio/intensity/calibration engines.
Access date for all sources: 2026-08-18. Researcher: Claude (session d21c12d6). Read-only against /home/user/Bodytea. No production code in this pack, no repo writes.

Conventions used throughout:

- **confidence: source** means grounded in a document captured in section 1. **HOUSE HEURISTIC** means evidence-informed but not stated by any source captured here. Every number that BodyT would ship is marked one way or the other.
- Ranges over precision. Where the literature disagrees, both positions are recorded rather than averaged into a fake consensus.
- No em dashes anywhere, including in the userCopy strings.
- Nothing in this pack is a threshold until an engine adopts it. Section 10 says which engine, and in what order.

The single most load-bearing honesty statement in this pack: **the 10 percent rule is folk wisdom, not evidence.** It has been tested and failed (Buist 2008), the systematic review of the whole question found the evidence base does not exist (Damsted 2018), and the largest cohort to date found weekly progression ratios carried no signal at all while single-session spikes did (Frandsen 2025). BodyT's `weeksToLongRun` already says this in a code comment; the planner must say it in copy too, or it inherits a claim it cannot support.

---
## 1. SOURCES (provenance)

All accessed 2026-08-18 unless stated. Access quality: FULL = primary text read; PDF = primary PDF text-extracted locally; ABSTRACT = abstract or authoritative summary only; SUMMARY = assembled from search captures because the primary was unreachable in this environment.

| ID | Source | Publisher / journal | URL | What was taken | Access |
|----|--------|---------------------|-----|----------------|--------|
| NHS-C25K | Couch to 5K running plan, week by week | NHS Better Health | https://www.nhs.uk/better-health/get-active/get-running-with-couch-to-5k/couch-to-5k-running-plan/ and https://www.nhs.uk/live-well/exercise/running-and-aerobic-exercises/get-running-with-couch-to-5k/ | Complete 9-week structure, every interval, both warm-up and cool-down walks, 3 runs/week with rest days between, "you can complete the program in 9 weeks or longer" | FULL |
| BAA-M2 | Boston Marathon Training Plan, Level Two | Boston Athletic Association | https://www.baa.org/sites/default/files/2018-07/Boston%20Marathon%20Level%20Two%20Training.pdf | All 20 weeks verbatim: 3-week prep, 6-week half marathon phase, 9-week marathon specific phase, 2-week taper; session vocabulary; MP/HMP/10k pace notation; hill sessions "on a 3-5% incline" | PDF (6 pages extracted locally) |
| BAA-M1 | Boston Marathon Training Plan, Level One | Boston Athletic Association | https://www.baa.org/sites/default/files/2018-07/Boston%20Marathon%20Level%20One%20Training.pdf | Same 20-week phase architecture at ~4 run days/week with cross or strength training on 2-3 days | PDF (6 pages extracted locally) |
| BAA-HM1 | B.A.A. Half Marathon Training Plan, Level One | Boston Athletic Association | https://www.baa.org/sites/default/files/2018-07/2018_BAA_HalfMarathon_Training_Level1.pdf | All 12 weeks verbatim: 3 easy runs + 1 long run, strides as "4 x 30 seconds hard with 60 seconds rest" appended after an easy run, alternating long run and half-marathon simulation, week 11 cutback, week 12 race | PDF (3 pages extracted locally) |
| BAA-10K1 | B.A.A. 10K Training Plan, Level One | Boston Athletic Association | https://www.baa.org/sites/default/files/2018-07/B.A.A.%2010K%20Level%20One%20Training.pdf | All 12 weeks verbatim, prescribed entirely in MINUTES not miles, with 5k / 10k / half-marathon pace anchors and cross training on Wednesdays | PDF (4 pages extracted locally) |
| BAA-INDEX | Boston Marathon Training / Boston Half Training / B.A.A. 10K Training landing pages | Boston Athletic Association | https://www.baa.org/races/boston-marathon/info-for-athletes/boston-marathon-training/ | Level definitions: Level One ~4 days/week from 25 mi/wk; Level Three 6 days/week 35 to 55 mi/wk, long runs to 20 mi; Level Four 6-7 days/week 35 to 60 mi/wk; "merely a guide" framing | SUMMARY (search capture) |
| HIGDON-N1 | Novice 1 Marathon Training Program | Hal Higdon | https://www.halhigdon.com/training-programs/marathon-training/novice-1-marathon/ and https://www.trainingpeaks.com/training-plans/running/marathon/tp-139218/hal-higdon-marathon-novice-1 | 18 weeks; 4 runs + 1 cross-training + 2 rest days; average 24 mi/wk; long run 6 mi in week 1 to 20 mi in week 15; 3-week taper | SUMMARY (halhigdon.com renders its tables via JS and returned no text through this proxy; structure confirmed from two independent reproductions) |
| BUIST-2008 | Buist I, Bredeweg SW, van Mechelen W, Lemmink KAPM, Pepping GJ, Diercks RL. No Effect of a Graded Training Program on the Number of Running-Related Injuries in Novice Runners: A Randomized Controlled Trial. Am J Sports Med 2008;36(1):33-39 | AJSM (GRONORUN) | https://pubmed.ncbi.nlm.nih.gov/17940147/ | 532 novice runners, 2 arms: standard 8-week vs graded 13-week program built on the 10 percent rule. No difference in running-related injury incidence | ABSTRACT |
| NIELSEN-2014 | Nielsen RO, Parner ET, Nohr EA, Sorensen H, Lind M, Rasmussen S. Excessive Progression in Weekly Running Distance and Risk of Running-Related Injuries: An Association Which Varies According to Type of Injury. J Orthop Sports Phys Ther 2014;44(10):739-747 | JOSPT | https://www.jospt.org/doi/10.2519/jospt.2014.5164 | 874 healthy novice runners, GPS watches. Progression bands: under 10 percent or regression, 10 to 30 percent, over 30 percent across 2 weeks. Over 30 percent associated with distance-related injuries (patellofemoral pain, ITB syndrome, medial tibial stress syndrome, patellar tendinopathy, greater trochanteric bursitis, gluteus medius / TFL injury) | ABSTRACT |
| DAMSTED-2018 | Damsted C, Glad S, Nielsen RO, Sorensen H, Malisoux L. Is there evidence for an association between changes in training load and running-related injuries? A systematic review. Int J Sports Phys Ther 2018;13(6):931-942 | IJSPT | https://pubmed.ncbi.nlm.nih.gov/30534459/ | Only 4 eligible articles. "The compiled evidence for an association between change in training load and running-related injury does not exist"; very limited evidence that sudden changes matter; 3 of the 4 did find an association | ABSTRACT |
| FRANDSEN-2025 | Frandsen JSB, et al. How much running is too much? Identifying high-risk running sessions in a 5200-person cohort study. Br J Sports Med 2025;59(17):e109380 (Garmin-RUNSAFE) | BJSM | https://pmc.ncbi.nlm.nih.gov/articles/PMC12421110/ | 5,205 runners, 588,071 sessions, 18 months. Single-session spike vs longest run of the previous 30 days: over 10 to 30 percent HRR 1.64 (1.31-2.05), over 30 to 100 percent HRR 1.52 (1.16-2.00), over 100 percent HRR 2.28 (1.50-3.48). ACWR showed INVERSE associations; week-to-week ratios showed NO significant relationship. Authors recommend a "single-session paradigm" | FULL |
| DANIELS-VDOT | Daniels' Running Formula (Daniels J, Gilbert J), VDOT system and the five training paces | Human Kinetics, 3rd ed.; secondary explainers | https://denstarfitness.com/jack-daniels-running-formula/ and https://runningtimecalculator.com/en/training-paces.html | Five paces and their percent-VO2max bands: Easy 65-78, Marathon 80-84, Threshold 88-92 ("comfortably hard", about one hour race pace), Interval 95-100, Repetition over 100. Volume split: 70-80 percent Easy, 10-15 percent M+T, 10-15 percent I+R | SUMMARY (book is not open access; two independent reproductions agreed on the bands) |
| SEILER-POL | Seiler S. What is best practice for training intensity and duration distribution in endurance athletes? Int J Sports Physiol Perform 2010;5(3):276-291, and the polarized literature it seeded | IJSPP | https://www.researchgate.net/publication/46403553_What_is_Best_Practice_for_Training_Intensity_and_Duration_Distribution_in_Endurance_Athletes | Descriptive finding that successful endurance athletes distribute roughly 80 percent of sessions at low intensity and 20 percent at high | SUMMARY |
| FOSTER-2022 | Foster C, Casado A, Esteve-Lanao J, Haugen T, Seiler S. Polarized Training Is Optimal for Endurance Athletes. Med Sci Sports Exerc 2022;54(6):1028-1031 | MSSE point | https://pubmed.ncbi.nlm.nih.gov/35136001/ | The "for" side of the formal 2022 debate | ABSTRACT |
| BURNLEY-2022 | Burnley M, Bearden SE, Jones AM. Polarized Training Is Not Optimal for Endurance Athletes. Med Sci Sports Exerc 2022;54(6):1032-1034, plus the two responses | MSSE counterpoint | https://pubmed.ncbi.nlm.nih.gov/35135998/ and https://pubmed.ncbi.nlm.nih.gov/35576139/ | "There is presently no evidence that a specifically polarized training intensity distribution is optimal"; elite athletes more often train pyramidal; the descriptive base carries survivorship bias | ABSTRACT |
| ROSENBLAT-2019 | Rosenblat MA, Perrotta AS, Vicenzino B. Polarized vs. Threshold Training Intensity Distribution on Endurance Sport Performance: A Systematic Review and Meta-Analysis of Randomized Controlled Trials. J Strength Cond Res 2019;33(12):3491-3500 | JSCR | https://journals.lww.com/nsca-jscr/fulltext/2019/12000/polarized_vs__threshold_training_intensity.34.aspx | Only 4 RCTs comparing polarized with threshold in trained endurance athletes (over 2 years experience, VO2max over 50). Moderate effect favouring polarized on time trial; evidence base rated limited | ABSTRACT |
| MILANOVIC-2015 | Milanovic Z, Sporis G, Weston M. Effectiveness of High-Intensity Interval Training (HIT) and Continuous Endurance Training for VO2max Improvements: A Systematic Review and Meta-Analysis of Controlled Trials. Sports Med 2015;45(10):1469-1481 | Sports Medicine | https://research.tees.ac.uk/ws/files/6460688/561180.pdf | 28 studies, 723 participants, age 25.1 +/- 5, baseline VO2max 40.8 +/- 7.9. Endurance training +4.9 mL/kg/min (CL +/- 1.4) vs no exercise; HIT +5.5 (+/- 1.2); HIT over endurance +1.2 (+/- 0.9). Lower baseline fitness gains more from both. **"The modifying effects of age and work:rest ratio were unclear"** | PDF (23 pages extracted locally) |
| WESTON-2014 | Weston M, Taylor KL, Batterham AM, Hopkins WG. Effects of Low-Volume High-Intensity Interval Training (HIT) on Fitness in Adults: A Meta-Analysis of Controlled and Non-Controlled Trials. Sports Med 2014;44(7):1005-1017. Companion: Weston KS, Wisloff U, Coombes JS. HIT in patients with lifestyle-induced cardiometabolic disease. Br J Sports Med 2014;48(16):1227-1234 | Sports Medicine / BJSM | https://research.tees.ac.uk/en/publications/effects-of-low-volume-high-intensity-interval-training-hit-on-fit-3/ | Low-volume HIT is an efficient and practical way to develop aerobic power and sprint fitness; the BJSM companion covers cardiometabolic disease populations | ABSTRACT |
| GIBALA-SIT | Gibala MJ and colleagues on low-volume sprint interval training; Burgomaster KA et al. J Physiol 2008;586(1):151-160; Gillen JB, Gibala MJ. Physiol and health-related adaptations to low-volume interval training. Appl Physiol Nutr Metab 2014 | J Physiol / APNM / GSSI | https://pmc.ncbi.nlm.nih.gov/articles/PMC2375551/ and https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4213388/ | Classic SIT protocol: 4 to 6 x 30 s all-out with 4 min recovery. Low-volume interval training defined as sessions with 10 min or less of intense exercise. Metabolic adaptations comparable to much higher-volume endurance training | ABSTRACT |
| TABATA-1996 | Tabata I, Nishimura K, Kouzaki M, Hirai Y, Ogita F, Miyachi M, Yamamoto K. Effects of moderate-intensity endurance and high-intensity intermittent training on anaerobic capacity and VO2max. Med Sci Sports Exerc 1996;28(10):1327-1330 | MSSE | https://pubmed.ncbi.nlm.nih.gov/8933488/ | 20 s work at about 170 percent VO2max / 10 s rest, 8 rounds, 4 min total, 4 d/wk for 6 weeks vs 60 min at 70 percent VO2max 5 d/wk. Reported VO2max +14 percent and anaerobic capacity +28 percent in the interval group | SUMMARY (primary not read; the protocol and headline results are reproduced consistently across independent secondary sources) |
| BUCHHEIT-2013 | Buchheit M, Laursen PB. High-Intensity Interval Training, Solutions to the Programming Puzzle. Part I: Cardiopulmonary Emphasis. Sports Med 2013;43(5):313-338. Part II: Anaerobic Energy, Neuromuscular Load and Practical Applications. Sports Med 2013;43(10):927-954 | Sports Medicine | https://link.springer.com/article/10.1007/s40279-013-0029-x and https://pubmed.ncbi.nlm.nih.gov/23539308/ | The canonical variable list for interval design: work interval intensity and duration, relief interval intensity and duration, number of repetitions, number of series, between-series relief, exercise mode | ABSTRACT |
| SCHUMANN-2022 | Schumann M, Feuerbacher JF, Sunkeler M, Freitag N, Ronnestad BR, Doma K, Lundberg TR. Compatibility of Concurrent Aerobic and Strength Training for Skeletal Muscle Size and Function: An Updated Systematic Review and Meta-Analysis. Sports Med 2022;52(3):601-612 | Sports Medicine | https://pmc.ncbi.nlm.nih.gov/articles/PMC8891239/ | 43 studies, ~1,090 participants. Maximal strength SMD -0.06 (-0.20 to 0.09, p=0.446); hypertrophy SMD -0.01 (-0.16 to 0.18, p=0.919); explosive strength SMD -0.28 (-0.48 to -0.08, p=0.007). No modality difference (running vs cycling) for max or explosive strength. No difference by frequency (over vs under 5 sessions/wk). Attenuation "more pronounced when concurrent training was performed within the same session" versus "separated by at least 3 h" | FULL |
| WILSON-2012 | Wilson JM, Marin PJ, Rhea MR, Wilson SMC, Loenneke JP, Anderson JC. Concurrent Training: A Meta-Analysis Examining Interference of Aerobic and Resistance Exercises. J Strength Cond Res 2012;26(8):2293-2307 | JSCR | https://journals.lww.com/nsca-jscr/fulltext/2012/08000/concurrent_training___a_meta_analysis_examining.35.aspx | 21 studies, 422 effect sizes. Hypertrophy ES: strength only 1.23, endurance only 0.27, concurrent 0.85. Power ES: strength only 0.91, endurance only 0.11, concurrent 0.55. Interference significant with RUNNING but not cycling. Negative correlations with endurance frequency (-0.26 to -0.35) and duration (-0.29 to -0.75) | ABSTRACT |
| EDDENS-2018 | Eddens L, van Someren K, Howatson G. The Role of Intra-Session Exercise Sequence in the Interference Effect: A Systematic Review with Meta-Analysis. Sports Med 2018;48(1):177-188 | Sports Medicine | https://pmc.ncbi.nlm.nih.gov/articles/PMC5752732/ | Resistance-before-endurance favoured for lower-body dynamic strength: weighted mean difference 6.91 percent change, p=0.006. No difference for hypertrophy (1.15 percent, p=0.40), static strength (-0.04 percent, p=0.98), aerobic capacity or body fat. Applies to programs of 5 weeks or more | FULL |
| ZHANG-2025 | Zhang F, Wang Y, Wang J. The effects, mechanisms, and influencing factors of concurrent strength and endurance training with different sequences: a semi-systematic review. Front Sports Act Living 2025;7:1692399 | Frontiers | https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2025.1692399/full | Sequence shows no consistent association with hypertrophy or maximal strength in humans; strength-first favours countermovement jump and explosive power; aerobic endurance improvement is unrelated to sequence. For an endurance-then-strength sequence, "ensure an interval of at least 3 h to eliminate molecular interference", justified on AMPK returning to baseline in about 3 h. Low-intensity endurance before strength shows no obvious interference. **No weekly volume or frequency threshold is established** | FULL |
| DOMA-2017 | Doma K, Deakin GB, Bentley DJ. Implications of Impaired Endurance Performance following Single Bouts of Resistance Training: An Alternate Concurrent Training Perspective. Sports Med 2017;47(11):2187-2200 | Sports Medicine | https://link.springer.com/article/10.1007/s40279-017-0758-3 and https://pubmed.ncbi.nlm.nih.gov/28702901/ | Resistance training produces residual fatigue that can impair a subsequent endurance session "for several hours to days" through impaired neural recruitment, worse movement efficiency and raised energy cost, muscle soreness, and reduced glycogen. The interference runs in the direction most concurrent-training papers ignore | ABSTRACT |
| LLANOS-2024 | Llanos-Lagos C, Ramirez-Campillo R, Moran J, Saez de Villarreal E. The Effect of Strength Training Methods on Middle-Distance and Long-Distance Runners' Athletic Performance: A Systematic Review with Meta-analysis. Sports Med 2024;54(7):1801-1833 | Sports Medicine | https://pmc.ncbi.nlm.nih.gov/articles/PMC11258194/ | High load (80 percent 1RM or more) improved running performance ES -0.469 (p=0.029) and running economy ES -0.266 (p=0.039). Combined methods ES -1.035 (p=0.036) performance, -0.426 (p=0.018) economy. Plyometrics alone not significant. No effect on VO2max for any method. Typical dose: 6-40 weeks, 1-4 sessions/wk, representative protocol 2-3 sets x 4-10 reps at 80-90 percent 1RM with 2-3 min rest | FULL |
| BLAGROVE-2018 | Blagrove RC, Howatson G, Hayes PR. Effects of Strength Training on the Physiological Determinants of Middle- and Long-Distance Running Performance: A Systematic Review. Sports Med 2018;48(5):1117-1149 | Sports Medicine | https://link.springer.com/article/10.1007/s40279-024-02018-z (successor meta-analysis; the 2018 review itself is paywalled) | Framing of the determinants: VO2max, velocity at VO2max, maximum metabolic steady state, running economy, sprint capacity | ABSTRACT |
| COMPENDIUM-2024 | Herrmann SD, Willis EA, Ainsworth BE, Barreira TV, Hastert M, Kracht CL, Schuna JM, Cai Z, Quan M, Tudor-Locke C, Whitt-Glover MC, Jacobs DR. 2024 Adult Compendium of Physical Activities: A third update of the energy costs of human activities. J Sport Health Sci 2024;13(1):6-12 | JSHS | https://pubmed.ncbi.nlm.nih.gov/38242596/ and https://pmc.ncbi.nlm.nih.gov/articles/PMC10818113/ and https://pacompendium.com/ | Third update; over 300 new activities; MET values revised; scoped to adults 19-59 by removing data from those 60 and over. pacompendium.com returned HTTP 403 through this session's proxy, so individual 2024 MET rows were NOT re-read | ABSTRACT (the per-activity table was NOT accessible; see section 7) |
| TANAKA-2001 | Tanaka H, Monahan KD, Seals DR. Age-predicted maximal heart rate revisited. J Am Coll Cardiol 2001;37(1):153-156 | JACC | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5862813/ (validation study reproducing the equation) | HRmax = 208 - 0.7 x age, from a meta-analysis of 351 studies / 18,712 subjects plus a 500-subject validation. Standard error of estimate around 10 bpm; 220-age SEE around 7-12 bpm. Neither removes the +/- 7-12 bpm individual variation | ABSTRACT |
| ACSM-ALG | ACSM Exercise Preparticipation Health Screening Questionnaire and algorithm (ACSM's Guidelines for Exercise Testing and Prescription, 10th ed.) | ACSM, reproduced by ACE | https://www.acefitness.org/images/webcontent/assets/certification/ace-answers/forms/pt/21_Exercise_Preparticipation_Health-Screening_Questionnaire_For_Exercise_Pros.pdf | Intensity definitions: light 30-39 percent HRR / 2-2.9 METs / RPE 9-11; moderate 40-59 percent HRR / 3-5.9 METs / RPE 12-13; vigorous 60 percent HRR or more / 6 METs or more / RPE 14 or more. Full text already captured in research/R6-safety.md | PDF (captured in R6) |
| CDC-INTENSITY | Measuring Physical Activity Intensity | CDC | https://www.cdc.gov/physical-activity-basics/measuring/index.html | Talk test: moderate = can talk but not sing; vigorous = cannot say more than a few words without pausing. METs 3-5.9 moderate, 6.0 or more vigorous. 0-10 relative effort scale: moderate 5-6, vigorous 7-8 | FULL (captured in R6) |
| CDC-ADULTS | Adult Activity: An Overview | CDC | https://www.cdc.gov/physical-activity-basics/guidelines/adults.html | 150 min/wk moderate or 75 min/wk vigorous, plus muscle strengthening on 2 days; "some physical activity is better than none" | FULL (captured in R6) |
| CDC-RHABDO | About Rhabdomyolysis | CDC / NIOSH | https://www.cdc.gov/niosh/rhabdo/about/index.html | Symptom triad: muscle pain "more severe than expected"; dark tea- or cola-colored urine; weakness or inability to complete a previously completable workout. "Seek medical treatment right away" | FULL (captured in R6) |
| RHABDO-RISK | Risk factors and future directions for preventing and diagnosing exertional rhabdomyolysis; plus Exertional Rhabdomyolysis After CrossFit Exercise and the ultra-trail eccentric-load systematic review | Current Opinion in Physiology / PMC case and review literature | https://www.sciencedirect.com/science/article/abs/pii/S0960896621001218 , https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7872485/ , https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12225290/ | Risk pattern: regimens targeting total muscular fatigue and high eccentric load (downhill running, plyometrics, high-rep eccentric circuits); heat and humidity; recent viral illness; alcohol and some drugs; sickle cell trait; both untrained and elite affected. Reported incidence heterogeneous (0 to 43.5 percent depending on sport and definition), true incidence unknown | ABSTRACT |
| HOTTENROTT-2016 | Hottenrott K, Ludyga S, Schulze S, Gronwald T, Jager FS. Does a run/walk strategy decrease cardiac stress during a marathon in non-elite runners? J Sci Med Sport 2016;19(1):64-68 | JSAMS | https://www.jsams.org/article/S1440-2440(14)00218-7/abstract | 42 recreational marathoners. Run/walk vs run only finished at statistically indistinguishable times (04:14:25 +/- 00:19:51 vs 04:07:40 +/- 00:27:15, p=0.377); run/walk reported less muscle pain and fatigue (p=0.006); cardiac biomarkers similar | ABSTRACT |
| POSTPARTUM-2019 | Donnelly G, Brockwell E, Goom T. Returning to running postnatal: guidelines for medical, health and fitness professionals managing this population | Independent guideline, BJSM-supported dissemination | https://absolute.physio/wp-content/uploads/2019/09/returning-to-running-postnatal-guidelines.pdf | No return to running before 12 weeks postpartum; criteria-based screen of strength, impact tolerance and symptoms before progression. **Named here only to mark the interaction; the authoritative treatment belongs to R7** | ABSTRACT |
| WHO-2020 | WHO Guidelines on physical activity and sedentary behaviour, referenced through CDC-ADULTS | WHO / CDC | https://www.cdc.gov/physical-activity-basics/guidelines/adults.html | 150-300 min moderate or 75-150 min vigorous weekly plus 2 days muscle strengthening | FULL (via CDC) |
| R6-PACK | BodyT research pack R6: Safety Boundaries and Functional Constraints | this repo | `research/R6-safety.md` on branch `claude/app-audit-refinement-sjw2va` | Red-flag classifier (`RF-RHABDO`, `RF-HEAT`, and the rest), GREEN/YELLOW/RED decision rules, the PAR-Q+ 2025 verbatim capture (`PARQ-2025`) including the 20 to 60 min low-to-moderate 3-5 d/wk starting dose and the over-45 vigorous caution, and the ACSM intensity bands. R8 depends on it and never overrides it | FULL (in-repo) |
| R7-PACK | BodyT research pack R7 (pregnancy, postpartum and related), not yet written at time of this pack | this repo | pending | Named as the owner of every postpartum decision R8 touches | N/A |

Any id in this pack beginning `RF-` (red flags), `FC-` (functional constraints), `TQ-` (targeted questions), or the id `PARQ-2025` belongs to **R6-PACK** and is used here exactly as R6 defines it. R8 never redefines an R6 id and never weakens an R6 rule.

Blocked or degraded in this environment, recorded so a future session does not re-burn usage:

- `pacompendium.com` returns HTTP 403 through the session proxy. The per-activity 2024 MET tables could not be re-read. BodyT's current MET values come from the 2011 Compendium and this pack could not verify them against 2024. That is an open item, not a finding.
- `halhigdon.com` serves its plan tables through client-side script; WebFetch receives an empty document. Structure was reconstructed from two independent reproductions and is marked SUMMARY.
- `nhs.uk` overview page does not carry the week table; the Better Health plan page does and was read in full.
- PubMed article pages generally render a cookie wall to WebFetch; abstracts came through search captures. PMC mirrors work after following the `ncbi.nlm.nih.gov` to `pmc.ncbi.nlm.nih.gov` redirect manually.
- Daniels' Running Formula is a book. The VDOT percent-VO2max bands are reproduced consistently across independent calculators and explainers, but no primary text was read. Treated as SUMMARY throughout.

---
## 2. WHAT BODYT DOES TODAY FOR CARDIO

Read on branch `claude/app-audit-refinement-sjw2va` (the deploy branch). All paths below are repo-relative to `/home/user/Bodytea`.

### 2.1 The catalog and the MET model

`src/plan/cardio.ts` (479 lines) holds `CARDIO_ACTIVITIES`, 18 entries not 11 (run, bike, walk, swim, row-erg, stairs, jump-rope, hike, basketball, pickleball, tennis, volleyball, soccer, football, hockey, combat, snow, custom). Each carries a Compendium MET for the moderate case plus per-mode METs where the mode genuinely changes the cost (soccer match 10.0 vs kickaround 7.0, beach volleyball 8.0 vs rec 3.0, combat martial arts 10.3 vs bag work 5.5). Flags: `sport` (marks a "played" day), `conditioning` (satisfies the weekly conditioning rule), `gps` (has a live recorder). `metFor(activityId, modeId)` is the single lookup. `FLOOR_HEIGHT_M = 3.05` for stair machines.

The same file holds `ACTIVITY_TRACKING`, which is the genuinely unusual part: per-activity `steps` (does a pocket pedometer see anything), `distance` source (`gps` | `steps` | `none`), `stride` as a fraction of standing height (walking 0.415, running 0.55, soccer 0.513, basketball 0.342, tennis and volleyball 0.285, pickleball 0.228, combat 0.200), a steps-per-hour `band` {low, high}, and a per-tier `met` {low, standard, high}. The header documents provenance per sport (Premier League tracking distances, 3,322 steps/hr measured on 53 recreational pickleball players, CADENCE-Adults 100 and 130 steps/min moderate and vigorous thresholds) and explicitly refuses the corporate step-conversion charts as thresholds.

### 2.2 The intensity read

`src/engine/intensity.ts` (236 lines):

- `stepsPerHour(steps, minutes)`, the rate everything is judged on.
- `classifyIntensity(activityId, steps, minutes) -> 'low' | 'standard' | 'high' | null`. Returns null when the activity has no band, when `steps < MIN_STEPS_TO_JUDGE` (200), or when `minutes < MIN_MINUTES_TO_JUDGE` (5). Silence over a confident wrong number.
- `stepDistanceMi(activityId, steps, heightIn)` at the sport's own stride, gated by `MIN_STEPS_FOR_DISTANCE` (20, deliberately far below the intensity gate because distance is arithmetic and not a verdict). `usableHeightIn` clamps to 40 to 90 in, default 69.
- `cardioKcal(CardioMeasure) -> KcalEstimate {kcal, met, basis, intensity, climbKcal}`. The measured tier's MET and the user's claimed mode MET both compete and **the higher wins**, because a pedometer can miss work but cannot invent it. `basis` records which one paid. Floors are charged as vertical work through `climbKcal`.
- `intensityLabel` maps low/standard/high to Easy/Solid/All out, matching the words the end-of-session question uses.
- `intensityNote` renders the one explaining sentence ("8,400 steps an hour, well above normal for basketball.").

### 2.3 The calibration, which is the part worth protecting

`src/engine/calibration.ts` (309 lines) learns what THIS person's "hard" is:

- After every tracked session the app asks once (`needsIntensityAnswer`), and the answer (`feltIntensity`) is never overwritten and never argued with.
- `intensityBias(data)` averages the signed rank gap between felt and measured across every sport with a band. Needs `MIN_BIAS_SAMPLES` (3).
- `personalBand(data, activityId)` returns `{low, high, samples, source}` where source is `population` | `bias` | `activity`. Per-sport personalization needs `MIN_ACTIVITY_SAMPLES` (4); before that the cross-sport bias scales the researched band by `1 - bias * BIAS_STEP` (BIAS_STEP 0.18), clamped to `MAX_DRIFT` 0.5 in either direction. Per-sport bands are built from `meansByTier` midpoints and shrunk toward the population band by `n / (n + PRIOR_STRENGTH)` with PRIOR_STRENGTH 6. An inverted band (easy sessions faster than hard ones) falls back to the researched one rather than shipping nonsense.
- `perceivedIntensity(...)`: the athlete's own answer wins outright where given; otherwise the calibrated band predicts it.
- Hard architectural line, stated in the header and worth keeping: **calibration never touches calories.** A MET is an absolute physical claim about work done. Perceived effort moves the intensity tier the app talks about, not the kcal it credits. `cardioKcal` stays on the population band.
- `calibrationNote` surfaces the adjustment in one sentence, because an adjustment nobody can see is indistinguishable from a bug.
- `BAND_CACHE` is a `WeakMap` keyed on the `AppData` identity, because the screens were calling this once per session shown and it walks the whole history.

Consumers: `src/engine/activityStats.ts:108`, `src/logic/cardioActions.ts:68`, `src/screens/today/CardioSheet.tsx`, `src/screens/today/CardioTimerSheet.tsx`.

### 2.4 GPS math

`src/engine/runs.ts` (407 lines): `acceptFix` (rejects accuracy > 50 m, teleports over 45 mph, jitter under ~8 m) and the stricter `creditsDistance` (`MIN_MOVE_MI` 0.005, no 20-second escape clause, so sideline time does not become mileage). `haversineMi` lives in `src/engine/geoMath.ts`. `paceSecPerMi`, `fmtPace`, `avgMph`, `mileSplits`, `compressTrack` (600 points), `weeklyMiles(data, todayISO, weeks)`, `buildRunLog`, and the Web Mercator projection for the route map.

Calories: `estKcal(activity, distanceMi, durationSec, bodyweightLb, climbGainM)` uses running MET = `max(3.5, 1.65 * mph)`, hiking `max(4.5, 6.0 + max(0, mph - 3) * 1.2)`, walking a four-step speed bracket, cycling a five-step bracket. Zero-distance sessions (treadmill) fall back to the activity's moderate MET rather than scoring zero. `climbKcal(gainM, bodyweightLb)` is physics, not a table: `m*g*h / CLIMB_EFFICIENCY / 4184` with `CLIMB_EFFICIENCY = 0.23`, ascent only.

`src/engine/elevation.ts` (250 lines): reject fixes with no `altitudeAccuracy` or worse than `MAX_ALT_ACCURACY_M` (12 m), then median filter (window 5) then a short mean, then ratchet gain only past `GAIN_THRESHOLD_M` (3 m). Gaps are skipped, never interpolated. Computed from the full track before `compressTrack` runs.

### 2.5 The one thing that looks like a running plan

`src/engine/runs.ts` also holds `RACES` and `runGoalReview`. `RACES` is a five-row regex table with, per race, `mi`, `peakLong`, `peakWeek`:

| race | mi | peakLong (mi) | peakWeek (mi/wk) |
|---|---|---|---|
| 5K | 3.1 | 2.5 | 10 |
| 10K | 6.2 | 5 | 15 |
| Half marathon | 13.1 | 11 | 22 |
| Marathon | 26.2 | 20 | 36 |
| Ultra | 31 | 26 | 48 |

`runGoalReview(data, log)` fires after a saved run, compares this run / longest run / this week's miles against the race row, and emits up to three notes. It contains the app's only in-code prescription of the 10 percent rule: "Add gently, about 10% at a time." It also does a crude easy/hard read against the median of the last 5 runs (`< median * 0.92` = fast, `> median * 1.05` = good easy pace). Consumed only by `src/screens/today/RunTrackerSheet.tsx:201`.

**This is a post-hoc review, not a plan.** It tells you where you are against a target after you already chose the run.

### 2.6 The milestone ladders

`src/plan/milestones.ts` (569 lines), layer 0, pure week arithmetic:

- `RUN_LADDER`: 1 mi, 5K (3.1), 10K (6.2), half (13.1), marathon (26.2), each with a label and one honest sentence.
- `WEEKLY_MI_STAGES`: 10, 15, 20, 30, 40 mi/wk with rationale copy ("20 is the base most half-marathon plans assume you already have").
- `weeksToLongRun(fromMi, toMi) = ceil(log(to/from) / log(1.08) * 4/3)`. Roughly 8 percent per week on the long run, times a `DELOAD_TAX` of 4/3 for one cutback week in four. The docstring already states the honest position: the 10 percent rule is folk standard, Buist 2008 found no injury benefit, compounding it for a block is +33 percent, and what the literature does support is cutback weeks.
- `TRACKS_FOR_GOAL.endurance = ['engine', 'body', 'consistency']`; `StageMetric` includes `longRunMi` and `weeklyMi`.
- Honesty guards worth reusing for endurance: `NOISE_FLOOR`, `MAX_ETA_WEEKS` 104, `STAGE_DECAY` 0.85, `MIN_OBSERVED_POINTS` 3, `MIN_OBSERVED_DAYS` 21, `OBSERVED_CAP_MULTIPLE` 1.5.

Consumed by `src/engine/journey.ts:300` and `:317`.

### 2.7 How cardio reaches the generated plan

`src/plan/generator.ts`:

- `FAMILY` at line ~121 maps `endurance -> 'general'`. There is no endurance goal family. An endurance user gets the general LAYOUTS: 3 days push/pull/lower, 4 days push/lower/pull/fullbody, and so on. Lifting templates.
- `pickCardio(owned)` at line 401 returns at most 3 per group from a fixed list of 10 `CardioOption` rows: group A steady (`easy-jog` 25-30 min, `brisk-walk` 30-45 min, `incline-walk` 25-30 min, `bike-erg` 25-30 min, `rowing-erg` 20-25 min), group B hard (`hill-sprint` 6-10 sprints, `parking-lot-sprint` 6-10 reps, `stair-run` 8-12 rounds), circuit (`circuit-a` 4-5 rounds, `circuit-b` 8-10 rounds). Filtered only by equipment (`canDo`). Not by goal, not by fitness, not by week, not by anything the user said.
- `CardioOption` in `src/types.ts:79` is `{ exerciseId, repText, group }`. Three fields. `repText` is a display string. No duration, no intensity target, no session type, no week index, no progression.
- Line 822 assigns `cardioOptions`; line 921 puts them on the `PlanConfig`.
- `PlanConfig.anchors.conditioningWeekday` is a single weekday. `WeekState.cardio` is `{ exerciseId, weekdays } | null`.
- `src/engine/resolveDay.ts:100` `cardioRequiredForWeek` enforces exactly one thing: at least one conditioning session in a Tier-1 week where no ball was logged. `conditioningLoggedThisWeek` scans the cardio log for any activity with `conditioning: true`.
- The endurance goal DOES get real coaching prose. `generator.ts:674` `STRATEGY.endurance` emits base lines about 80/20, lifting as injury insurance, and fuel, plus per-answer lines keyed on `race-what`, `run-now`, `race-when`. `src/plan/followups.ts:413` asks five endurance questions: `race-what`, `race-when`, `run-now`, `run-goal`, `run-time`.

### 2.8 So: what is genuinely good

1. **The steps-per-hour intensity calibration** (`intensity.ts` + `calibration.ts`). Nothing else in consumer fitness grades a court sport off measured cadence against a per-sport band and then learns the individual's offset. The separation of `intensity` (measured) from `feltIntensity` (reported), the refusal to let perception move calories, the null-over-guess discipline, and the visible `calibrationNote` are all correct and should be preserved verbatim. An endurance planner should EXTEND this, never bypass it.
2. **Per-mode and per-tier MET values with named provenance.** The Compendium is the right anchor and the per-mode split is honest.
3. **The elevation and distance-crediting discipline.** Median-then-mean, ratchet threshold, ascent-only charging, `creditsDistance` stricter than `acceptFix`. These are the right kind of conservative.
4. **`weeksToLongRun` already refuses to compound 10 percent** and already pays a cutback tax. That is the correct instinct, ahead of most commercial apps.
5. **Refusal patterns.** `parseGoalTarget` returns null rather than guessing; `stepDistanceMi` returns null where a distance would be theatre. That habit is what an endurance planner needs most.

### 2.9 And what is missing

| gap | evidence in code |
|---|---|
| No endurance goal family | `generator.ts` `FAMILY.endurance = 'general'` |
| No session types | `CardioOption` has no type field. Group A/B/circuit is equipment-flavored, not physiological |
| No week structure | `cardioOptions` is an unordered menu. No long day, no quality day, no easy day |
| No progression | Nothing advances a cardio prescription week to week. `slotRepsByBlock` exists for lifts and has no cardio analogue |
| No intensity prescription | `repText` is "25-30 min". No pace, no HR, no RPE, no talk test |
| No run-walk on-ramp | `easy-jog` says "jog 25-30 minutes". A sedentary starter cannot do that. There is no walk-run ladder anywhere |
| Race data exists but is inert | `RACES` peakLong and peakWeek are used only to write a post-run note. Nothing builds toward them |
| No taper, no cutback weeks in cardio | `DELOAD_TAX` is applied to the ETA arithmetic only, never to a prescribed week |
| No concurrent-training rules | Nothing knows a hard run and a heavy lower day are competing. `anchors.cnsWeekdays` protects speed work from ball, not from running |
| No conditioning notation | AMRAP, EMOM, work:rest are absent. `circuit-a` is prose in an exercise definition |
| The one 10 percent claim is unqualified | `runs.ts` `runGoalReview` note says "about 10% at a time" with no hedge |
| Answers collected, unread | `run-goal`, `run-time`, `race-when` shape three sentences of strategy copy and nothing else |

Net statement for the state file: BodyT measures cardio better than it plans it by roughly an order of magnitude. Every input an endurance planner needs is already being collected. Nothing consumes them.

---
## 3. ENDURANCE PLANNING MODEL

### 3.1 Session types

Seven types cover everything in the four primary plans captured (NHS-C25K, BAA-10K1, BAA-HM1, BAA-M1/M2) plus the Daniels pace framework. Each row gives the anchor BodyT can actually use, since BodyT has no heart rate sensor and no lab test.

| id | name | purpose | duration or dose | talk test (CDC-INTENSITY) | RPE 0-10 (CDC-INTENSITY) | Daniels equivalent (DANIELS-VDOT) | source |
|----|------|---------|------------------|---------------------------|--------------------------|-----------------------------------|--------|
| `easy` | Easy run | aerobic base, the bulk of the week | 20 to 60 min | full sentences, could sing a line badly | 3 to 4 | E, 65-78 percent VO2max | source |
| `long` | Long run | the headline session, time on feet | 1.2x to 2.5x an easy run | same as easy for most of it | 3 to 5 | E, sometimes finishing at M | source |
| `recovery` | Recovery run or walk | circulation without load, day after hard | 15 to 35 min, or a walk | conversation is effortless | 2 to 3 | below E | HOUSE HEURISTIC (Daniels folds this into E; the separate label exists so BodyT can refuse to let it drift) |
| `steady` | Steady or marathon-pace | race-specific for long events | 20 to 60 min of it inside a longer run | short sentences | 5 to 6 | M, 80-84 percent | source (BAA "MP" segments) |
| `threshold` | Threshold or tempo | raise the pace you can hold for an hour | 20 to 40 min total, continuous or in 2 to 4 blocks | a few words at a time | 6 to 7 | T, 88-92 percent, "comfortably hard" | source |
| `interval` | VO2 intervals | raise the ceiling | 3 to 5 min reps, 12 to 25 min total hard time | one or two words | 8 to 9 | I, 95-100 percent | source |
| `strides` | Strides or reps | mechanics and economy, not conditioning | 4 to 8 x 20 to 40 s, full recovery | cannot talk during, fully recovered between | 9 to 10 for seconds at a time | R, over 100 percent | source (BAA-HM1 uses exactly this: "4 x 30 seconds hard with 60 seconds rest") |

Two notes that matter for BodyT's copy rules:

- **The talk test is the primary anchor, not a fallback.** It is a sourced instrument (CDC-INTENSITY) and it needs no device, no test and no arithmetic. BodyT should prescribe every endurance session by talk test first, RPE second, and show pace only as a description of what happened.
- **`strides` is not conditioning.** Its whole point is that it is fully recovered and short. Placing it in the "hard day" budget is a category error that will cost a quality session. HOUSE HEURISTIC: strides do not count against the weekly hard-session cap.

### 3.2 Prescribing intensity with no lab numbers

BodyT has: GPS pace, steps per hour, a per-person calibrated intensity band, a felt-intensity answer, and nothing else. No HR strap, no VO2max, no lactate.

Priority order, best available first:

1. **Talk test in the prescription copy.** "Easy enough to hold a conversation the whole way" (CDC-INTENSITY, verbatim sense).
2. **RPE 0-10 as the number**, because BodyT already asks Easy / Solid / All out at the end of every tracked session and the mapping is direct: Easy = 2 to 4, Solid = 5 to 7, All out = 8 to 10 (HOUSE HEURISTIC mapping; the 0-10 bands themselves are CDC-INTENSITY, where moderate is 5-6 and vigorous is 7-8).
3. **Pace derived from a recent effort, only when one exists.** If the user has run a race or a hard time trial, VDOT-style pace derivation is defensible (DANIELS-VDOT). BodyT must not synthesise a VDOT from an easy run: the whole framework is anchored on a maximal-effort result. HOUSE HEURISTIC guard: derive paces only from a run whose `feltIntensity` was `high` AND which lasted at least 12 minutes AND which is the fastest of the last 90 days. Otherwise show no paces at all.
4. **Heart rate, only if a user types a measured max.** An age formula is not a measurement. TANAKA-2001's own standard error is around 10 bpm and the individual spread is +/- 7 to 12 bpm, which is wider than the gap between two adjacent training zones. HOUSE HEURISTIC and a strong one: **BodyT should not build HR zones from age.** If BodyT ever surfaces HR, it uses a user-entered measured max and says where the number came from.

What the app can honestly say without any of this: minutes, effort words, and "run this one slower than you want to."

### 3.3 Intensity distribution: what the evidence supports and what it does not

The 80/20 claim already lives in `generator.ts` `STRATEGY.endurance`. It is defensible as a default and must not be stated as fact.

- Descriptive: successful endurance athletes cluster near 80 percent low intensity, 20 percent high (SEILER-POL). Daniels' own volume split is compatible: 70-80 percent Easy, 10-15 percent M+T, 10-15 percent I+R (DANIELS-VDOT).
- Contested: Burnley, Bearden and Jones state flatly that "there is presently no evidence that a specifically polarized training intensity distribution is optimal", and note that most elite endurance athletes train pyramidal rather than polarized (BURNLEY-2022). Foster and colleagues defend the opposite (FOSTER-2022). This was a formal 2022 MSSE point-counterpoint with two rounds of response; both sides are credible.
- Meta-analytic: only four RCTs have compared polarized with threshold distributions head to head in trained athletes, giving a moderate effect favouring polarized on time trial performance with the evidence base explicitly rated as limited (ROSENBLAT-2019).

**The BodyT position (HOUSE HEURISTIC, evidence-informed):** most running easy, a small amount hard, is the default because the failure mode it prevents is the common one. Beginners do not run too easy; they run every run at a medium pace that is too hard to recover from and too slow to adapt to. The copy should sell the mechanism ("easy miles build the engine") and never the ratio as a law. What BodyT ships as a rule is a **cap on hard sessions per week**, not a percentage of volume, because a percentage requires knowing the intensity of every minute and BodyT does not.

### 3.4 Weekly structure by goal

Hard-session budget below counts `threshold`, `interval` and race-pace `steady` work. `strides` and `long` do not count. Numbers are HOUSE HEURISTIC syntheses of the cited plans, and each row names the plan it was synthesised from.

| goal | days/wk running | long run | hard sessions/wk | rest of week | closest cited plan |
|------|-----------------|----------|------------------|--------------|--------------------|
| General aerobic health | 3 to 5 sessions of any modality | not required | 0 to 1 | 150 min/wk moderate or 75 min vigorous, plus 2 strength days | CDC-ADULTS, WHO-2020 |
| Return to running / sedentary start | 3 | grows out of the on-ramp itself | 0 | run-walk intervals, rest day between every session | NHS-C25K |
| 5K | 3 to 4 | 1, modest (60 to 90 min of easy running is plenty) | 1, rising to 2 late | easy runs plus strides | BAA-10K1 scaled down |
| 10K | 4 to 5 | 1 (40 to 60 min) | 2 (one at 10K pace, one at half-marathon pace) | easy runs, 1 cross-training day | BAA-10K1 verbatim shape |
| Half marathon | 4 | 1, growing 5 to 10 mi, alternating with a race-pace simulation every other week | 1 (strides after an easy run) rising to 2 | 3 easy runs, 3 full rest days | BAA-HM1 verbatim shape |
| Marathon, first-timer | 4 to 5 | 1, growing 6 to 20 mi with stepbacks | 0 to 1 | easy runs plus 1 cross-training day, 2 rest days | HIGDON-N1 |
| Marathon, performance | 5 to 6 | 1 long OR 1 marathon simulation, alternating | 2 to 3 | easy and aerobic runs, cross or strength on 1 to 2 days | BAA-M1 / BAA-M2 |

The days-per-week column is bounded at the top by what the publishers themselves prescribe: BAA Level One is about 4 days a week starting from 25 mi/wk, Level Three is 6 days and 35 to 55 mi/wk with long runs to 20 mi, Level Four is 6 to 7 days and 35 to 60 mi/wk (BAA-INDEX). BodyT will not have Level Four users for a long time; the table stops where its users are.

Three structural facts worth carrying into the planner, all directly observed in the captured plans:

1. **The most popular first-marathon plan in the world has no quality sessions at all.** HIGDON-N1 is four easy runs, one of which is long, plus cross-training. Adding intervals to a beginner because "the plan should have intervals" is copying the wrong plan.
2. **BAA-10K1 prescribes the entire 12 weeks in MINUTES, not miles.** "25 minutes easy run", "6 x 2 minutes at 10k pace with 2 minutes recovery jog". This is the correct default for BodyT, whose users log with a phone and whose slowest users would be humiliated by a distance target.
3. **BAA-M1 and BAA-M2 both alternate the long run with a race simulation** rather than making every weekend a long run: week 5 long run, week 6 "Marathon Simulation (on rolling hill course): 5-6 miles easy / 6-7 miles at MP / 2 miles easy", week 7 easy, week 8 a long fartlek, week 9 long run. The long run is not a weekly ratchet.

### 3.5 Volume progression, and the honest state of the 10 percent rule

State this plainly, in the pack and in engineering comments:

**The 10 percent per week rule has been tested and did not hold.** BUIST-2008 randomised 532 novice runners to a standard 8-week program or a graded 13-week program built explicitly on the 10 percent rule and found no difference in running-related injury incidence. DAMSTED-2018 systematically reviewed the whole question and concluded that the compiled evidence for an association between change in training load and running-related injury "does not exist", with only four eligible studies.

**What does have signal is bigger jumps and single sessions.** NIELSEN-2014 found that novice runners increasing weekly distance by more than 30 percent over two weeks were more vulnerable to distance-related injuries than those increasing by less than 10 percent. FRANDSEN-2025, the largest cohort by an order of magnitude (5,205 runners, 588,071 sessions), found that **weekly** ratios carried no signal at all, that acute-to-chronic workload ratio was inversely associated with injury, and that what did predict overuse injury was **a single session exceeding the longest run of the previous 30 days**: over 10 to 30 percent HRR 1.64 (1.31-2.05), over 30 to 100 percent HRR 1.52 (1.16-2.00), over 100 percent HRR 2.28 (1.50-3.48).

Read that carefully before turning it into a threshold. Three honest observations:

- The reference group was runners whose session stayed **within 10 percent of their own longest run in the past 30 days**. So the evidence supports something like a 10 percent rule, but at the **session** level and against a **30-day longest-run** anchor, not at the weekly-volume level.
- The dose-response is **not monotonic**: the small-spike band (1.64) sits above the moderate band (1.52). Anyone quoting a clean gradient is over-reading it. What the data supports is "a spike is riskier than no spike, and a doubling is riskiest", not a smooth curve.
- No study captured here identifies a **safe** spike size. Refusing to name one is the correct behaviour.

**What BodyT should implement (all HOUSE HEURISTIC, and labelled as such in code):**

1. `weeksToLongRun`'s existing 8 percent per week plus a 4/3 cutback tax stays. It is more conservative than the folk rule, it is already shipped, and no source captured here contradicts it.
2. Add a **session-spike guard** with real provenance: when a proposed session exceeds the longest run of the previous 30 days by more than a small margin, the planner flags it and offers the shorter version. This is the one number in the whole pack that comes from a large cohort with an explicit reference group (FRANDSEN-2025).
3. **Cutback weeks are the supported structure.** All four captured plans have them: BAA-HM1 week 11 drops the long run from 9-10 mi to "6 miles easy on flat course"; BAA-M2 taper weeks 19 and 20 halve everything; HIGDON-N1 uses stepbacks and a 3-week taper. Cutbacks are structural, not motivational.
4. **Never present a growth percentage to the user as a safety rule.** The current copy in `runs.ts` ("Add gently, about 10% at a time") should become something that describes the behaviour without claiming protection: "The plan grows the long run slowly and drops it back every fourth week. Big single jumps are the thing worth avoiding."

### 3.6 What ends a build

- **Taper.** BAA-M2 runs a 2-week taper after an 18-week build; HIGDON-N1 tapers 3 weeks after a peak 20-miler in week 15. Both cut volume sharply while keeping some intensity: BAA-M2 week 20 still has "3 x 1k at HMP" and "2 miles at MP" inside 2 to 4 mile easy runs.
- **Peak long run is not the race distance for the marathon.** Both marathon plans captured peak at 20 miles for a 26.2 mile race. BodyT's existing `RACES.peakLong` already encodes 20 for the marathon and 11 for the half, which matches.
- **Date feasibility.** `race-when` is already collected. If the weeks available are fewer than `weeksToLongRun(current long run, race peakLong)` plus a taper, the plan should say so rather than compress. The followup's own `informs` string already promises this: "If the date does not fit the distance, the plan says so instead of pretending."

---
## 4. WALK TO RUN ON-RAMP

### 4.1 The cited example, in full

NHS Couch to 5K (NHS-C25K), read verbatim from the Better Health plan page. Every session is bracketed by a 5 minute brisk walk warm-up and a 5 minute walk cool-down. Three runs per week, rest days between, and the plan states you can take longer than 9 weeks.

| week | run 1 | run 2 | run 3 | total run time |
|------|-------|-------|-------|----------------|
| 1 | 7 x (run 1:00 / walk 1:30) | same | same | 7 min |
| 2 | 5 x (run 1:30 / walk 2:00) | same | same | 7:30 |
| 3 | 2 x (run 1:30 / walk 1:30 / run 3:00 / walk 3:00) | same | same | 9 min |
| 4 | run 3 / walk 1:30 / run 5 / walk 2:30 / run 3 / walk 1:30 / run 5 | same | same | 16 min |
| 5 | run 5 / walk 3 / run 5 / walk 3 / run 5 | run 8 / walk 5 / run 8 | **run 20 continuous** | 15, 16, 20 |
| 6 | run 5 / walk 3 / run 8 / walk 3 / run 5 | run 10 / walk 3 / run 10 | run 25 continuous | 18, 20, 25 |
| 7 | run 25 | run 25 | run 25 | 25 |
| 8 | run 28 | run 28 | run 28 | 28 |
| 9 | run 30 | run 30 | run 30 | 30 |

Total running time goes 7, 7.5, 9, 16, then jumps. Week 4 more than doubles week 3. Week 5 run 3 is a single 20-minute continuous run three sessions after the longest continuous rep was 5 minutes. Two things follow.

### 4.2 What generalizes, and what does not

Principles that hold across the on-ramp literature and that BodyT should adopt:

1. **Prescribe in TIME, never distance.** Every one of the 27 C25K sessions is a duration. BAA-10K1 does the same for a whole 12-week plan at a much higher level. A distance target tells a slow runner they failed; a time target cannot. **confidence: source.**
2. **Walking is a programmed element, not a failure state.** The word for the walk portion is "walk", not "if you need to". Copy must never frame it as a concession. Supporting evidence beyond the beginner case: in HOTTENROTT-2016, 42 recreational marathoners split between run/walk and run-only finished at statistically indistinguishable times (04:14:25 vs 04:07:40, p=0.377) and the run/walk group reported less muscle pain and fatigue (p=0.006). Walk breaks are a legitimate strategy at every level. **confidence: source.**
3. **Fixed rest days between every session.** Three sessions a week with a day between is the entire frequency prescription. **confidence: source.**
4. **Repeating a week is part of the plan, not a setback.** NHS states the plan can take longer than 9 weeks. BodyT's suggest-only rule fits this perfectly: offer the repeat, never impose it. **confidence: source for the permission, HOUSE HEURISTIC for the trigger.**
5. **The unit that progresses is the run interval, then the number of intervals, then continuity.** C25K goes 1 min x 7, then 1.5 min x 5, then mixed 1.5 and 3, then 3 and 5, then 5 and 8, then 20 continuous. Interval length grows first; the walk shrinks and finally disappears. **confidence: source.**

What does NOT generalize, and where BodyT should differ:

- **The week 4 to week 5 jump is aggressive and BodyT should not copy it blind.** Going from a longest continuous rep of 5 minutes to a single 20-minute run is exactly the single-session spike pattern FRANDSEN-2025 associates with elevated overuse injury rate. C25K is a fine public health program with an enormous track record, and its own escape hatch is "repeat the week". HOUSE HEURISTIC: BodyT should offer the C25K progression as the default but pre-emptively offer an intermediate session (run 10 / walk 2 / run 10) before the first 20-minute continuous run, and should offer a week repeat whenever the previous week's sessions were not all completed.
- **9 weeks is the marketing number, not the median.** No source captured here reports completion rates or actual duration. Do not put "in 9 weeks" in copy as a promise. Say what the plan does, not how long it will take this person.

### 4.3 The generalized on-ramp shape (HOUSE HEURISTIC)

A typed on-ramp that covers C25K and also covers "I have not run in five years" and "I can run 10 minutes already":

```
phase 0  WALK ONLY          20 to 40 min brisk walk, 3 to 5 d/wk
         entry: cannot walk 30 min briskly without stopping
         exit:  30 min continuous brisk walk, comfortable

phase 1  WALK-DOMINANT      run:walk from 1:1.5 up to 1:1
         run interval 60 to 90 s, 6 to 8 reps
         exit: 8 reps of 90 s running feels like RPE 4

phase 2  RUN-DOMINANT       run interval 3 to 10 min, walk 1 to 3 min
         exit: 2 x 10 min running with one short walk

phase 3  CONTINUOUS         20, 25, 30 min continuous
         exit: 30 min continuous at conversation pace
```

Entry point is chosen from `run-now`, which onboarding already collects: "Not really running" enters at phase 0 or 1, "Under 10 miles a week" at phase 2 or 3. That answer currently produces one sentence of strategy copy and nothing else.

### 4.4 Safety layer

The on-ramp is the single highest-risk surface in this pack because its users are by definition unaccustomed. Everything in R6-PACK (`research/R6-safety.md`) applies before a single session is generated. Specifically:

- R6's conservative dose floor (PAR-Q+ 20 to 60 min of low to moderate intensity, 3 to 5 days per week, building toward 150 min/wk moderate) is exactly the phase 0 and phase 1 envelope. They agree; do not invent a second floor.
- R6's GREEN-with-ramp branch (not a regular exerciser, no disease, no symptoms: "light- to moderate-intensity exercise recommended, may gradually progress to vigorous") means phase 0 and phase 1 sessions are legal for everyone who clears screening, and that `interval` and `threshold` sessions are NOT offered until the ramp has been served.
- The over-45-and-not-vigorous-accustomed soft cap from PAR-Q+ applies the moment the on-ramp reaches its first hard session.

---
## 5. HIIT AND CONDITIONING

### 5.1 What HIIT actually buys, with numbers

- Against no exercise, continuous endurance training raised VO2max by 4.9 mL/kg/min (confidence limits +/- 1.4) and HIT by 5.5 (+/- 1.2), across 28 studies and 723 adults aged 18 to 45 with a mean baseline of 40.8 mL/kg/min. HIT beat continuous training by 1.2 mL/kg/min (+/- 0.9), which the authors call a possibly small beneficial effect (MILANOVIC-2015).
- **People who start less fit gain more, from both.** MILANOVIC-2015 found a likely moderate extra 3.2 mL/kg/min for HIT subjects with lower baseline fitness, and a small extra 1.4 for endurance training. This is the single most useful sentence in the HIIT literature for a coaching app: the deconditioned user is the one for whom this works best.
- Low-volume protocols work. "Low-volume interval training" means 10 minutes or less of actual intense exercise in a session, and it produces metabolic adaptations comparable to much larger volumes of endurance training (GIBALA-SIT).
- Both HIT and continuous training produce large improvements. The choice between them is a preference and adherence question, not a physiology question. Say that.

### 5.2 Named protocols worth shipping, each with its source

| id | structure | modality | target | source |
|----|-----------|----------|--------|--------|
| `sit-30` | 4 to 6 x 30 s all out, 4 min recovery | bike preferred, any non-impact | anaerobic capacity plus aerobic adaptation in minimum time | GIBALA-SIT |
| `tabata-20-10` | 8 x (20 s work / 10 s rest), 4 min total | bike or bodyweight | the original protocol ran at about 170 percent VO2max; VO2max +14 percent, anaerobic capacity +28 percent over 6 weeks in trained speed skaters | TABATA-1996 (SUMMARY: reproduced consistently across secondary sources; MSSE 1996;28(10):1327-1330, primary not read) |
| `norwegian-4x4` | 4 x 4 min hard, 3 min active recovery | run, bike, row, incline walk | the most-replicated aerobic-power interval in the clinical literature | HOUSE HEURISTIC placement; the 4x4 structure appears throughout the HIT literature summarised in MILANOVIC-2015 and WESTON-2014 |
| `run-reps-2min` | 6 to 8 x 2 min at 10K effort, 2 min jog recovery | run | the exact prescription in a published 12-week 10K plan, week 3 to 4 | BAA-10K1 verbatim |
| `run-reps-3min` | 5 to 6 x 3 min at 10K effort, 90 s jog | run | week 5 to 6 of the same plan | BAA-10K1 verbatim |
| `hill-reps` | 6 to 8 x (200 to 400 m uphill at 10K effort, 30 to 45 s rest, jog or run the downhill), 90 s between sets, on a 3 to 5 percent incline | run | strength and mechanics with less hamstring exposure than flat sprinting | BAA-M2 verbatim, including the "3-5% incline" note |
| `strides` | 4 to 8 x 20 to 40 s hard, 60 to 90 s rest, appended to an easy run | run | mechanics and economy | BAA-HM1 verbatim ("4 x 30 seconds hard with 60 seconds rest") |
| `threshold-blocks` | 2 to 4 x 8 to 15 min at threshold, 2 to 3 min jog | run, bike, row | raise the sustainable pace | BAA-M2 ("2 x 2 miles at HMP with 3 minutes easy jog in between") |

### 5.3 Work to rest ratio: what is actually known

This is the number every app states confidently and nobody has established.

**MILANOVIC-2015 tested work:rest ratio as a moderator across 28 studies and reported the effect as UNCLEAR** (0.5 mL/kg/min, +/- 1.6). In the HIT-versus-endurance comparison a greater work:rest ratio was associated with a small additional 1.6 mL/kg/min (+/- 1.5), which straddles zero. That is the honest state of it.

BUCHHEIT-2013 gives the correct framing: an interval session is defined by nine variables, not one ratio. Work interval intensity, work interval duration, relief interval intensity, relief interval duration, exercise modality, number of repetitions, number of series, between-series relief duration, and between-series relief intensity. Any single "optimal ratio" claim is collapsing nine dimensions into one.

**What BodyT should do (HOUSE HEURISTIC, stated as such):** pick ratios that make the session repeatable rather than optimal, and let the user's completion data adjust them. The following table is a defensible starting grid, and the pack is explicit that it is a starting grid.

| target | work | rest | ratio | rounds | note |
|--------|------|------|-------|--------|------|
| aerobic power | 3 to 5 min | 2 to 3 min | ~1:0.6 | 4 to 6 | total hard time 12 to 25 min |
| aerobic power, short | 30 to 60 s | 30 to 60 s | 1:1 | 10 to 20 | easier to hold form, same total |
| anaerobic capacity | 20 to 40 s | 2 to 4 min | 1:4 to 1:8 | 4 to 8 | rest looks absurd and is the point |
| repeat effort / sport | 5 to 15 s | 30 to 60 s | 1:4 | 8 to 16 | for `sport`-goal users, not endurance users |
| muscular endurance circuit | 30 to 45 s | 15 to 30 s | ~2:1 | 3 to 5 rounds | this is conditioning, not strength |

### 5.4 Notation: AMRAP, EMOM, circuits, rounds for time

BodyT currently encodes conditioning as prose inside `ExerciseDef.steps` (see `circuit-a` in `src/plan/exercises.ts`: "10 burpees ... 20 jumping jacks ... 10 squat jumps. Rest 1 minute, repeat 4-5 rounds"). That is unparseable, untrackable and unprogressable. The formats below are standard gym vocabulary, not evidence claims, so no source is needed for the definitions themselves; the scaling rules attached to them are HOUSE HEURISTIC.

| format | means | how it is scored | what it is good for | what it is bad for |
|--------|-------|------------------|---------------------|--------------------|
| AMRAP `t` | as many rounds as possible in `t` minutes of a fixed movement list | rounds plus reps | self-pacing, comparable week to week on the same list | anyone who does not know how to pace; the last minute is where form dies |
| EMOM `t` x `list` | every minute on the minute, start prescribed reps at the top of each minute, rest the remainder | completed vs failed minutes | beginners, because the format self-regulates: too much work eats your rest and you feel it immediately | building a maximum; the cap is structural |
| RFT `n` rounds | `n` rounds for time of a fixed list | total time | a clean benchmark to repeat | pacing; time pressure is exactly what drives the failure modes in 5.5 |
| Circuit `n` x list, `r` rest | fixed rounds with prescribed rest between | completion, plus load or reps | the default for a general user; the rest is programmed rather than earned | nothing much; this is the safe default |
| Intervals | see 5.3 | completion and pace | measurable aerobic work | nothing, but it needs a measurable modality |

Typed shape sketch (full version in section 10):

```
ConditioningBlock =
  | { format: 'intervals'; workSec; restSec; rounds; series?; seriesRestSec?; modality }
  | { format: 'emom'; minutes; items: { exerciseId; reps }[] }
  | { format: 'amrap'; minutes; items: { exerciseId; reps }[] }
  | { format: 'rft'; rounds; items: { exerciseId; reps }[]; capMinutes }
  | { format: 'circuit'; rounds; items: { exerciseId; reps|seconds }[]; restSec }
```

**BodyT rule that falls straight out of the standing constraints:** users never pick reps. So AMRAP and RFT, which are scored on reps the user chases, are structurally awkward for this app. EMOM and Circuit, where the app sets the reps and the clock sets the rest, are the natural fit. HOUSE HEURISTIC: ship `intervals`, `emom` and `circuit` first; treat `amrap` and `rft` as later additions with an explicit pacing coach line.

### 5.5 Beginner scaling

All HOUSE HEURISTIC unless marked, but each rule exists to prevent a documented failure mode.

1. **Cap the first exposure by time, not by reps.** 8 to 10 minutes of EMOM, not 20. The format is only self-regulating if there is rest left inside the minute.
2. **Leave at least 15 to 20 seconds of rest inside every EMOM minute at prescription.** If a user finishes with under 10 seconds spare, the next prescription drops reps. This is the one scaling rule that is mechanically checkable from BodyT's own session timer.
3. **No exercise appears in a conditioning circuit that the user has not performed in a strength context first.** Unfamiliarity is the dominant risk factor in 5.6.
4. **Cap eccentric-heavy and high-rep movements in a first exposure.** Burpees, squat jumps, walking lunges, downhill running, and any high-rep pressing to failure. BodyT's own `circuit-a` is 10 burpees plus 10 squat jumps per round for 4 to 5 rounds, which is 40 to 50 burpees and 40 to 50 squat jumps for someone who may never have done either.
5. **Never program to failure in a conditioning format.** Conditioning failure is a pacing failure, and pacing is a skill the beginner does not have yet.
6. **One hard conditioning session in week one, two by week three at the earliest.** Consistent with R6's GREEN-with-ramp branch (light to moderate first, vigorous after a gradual progression period, ACSM-ALG).
7. **Heat, illness and hydration gate the session, not just the plan.** See 5.6.

### 5.6 Rhabdo and overuse safeguards

This is the one place in the endurance and conditioning domain where the downside is an emergency rather than a setback, so the rules are conservative.

**Risk pattern (RHABDO-RISK):** regimens that target total muscular fatigue and carry high eccentric load are the common thread. Named exposures in the literature include CrossFit-style high-rep circuits, plyometrics, downhill running, and ultra-trail eccentric load. Modifiers: exercise in heat and humidity, recent viral illness, alcohol and some drugs, and genetic factors including sickle cell trait. Both untrained novices and elite military and athletic populations are affected. Reported incidence ranges from 0 to 43.5 percent across studies, which is another way of saying the true incidence is unknown.

**Symptom triad (CDC-RHABDO, already captured in R6 as RF-RHABDO):** muscle pain "more severe than expected"; dark tea- or cola-coloured urine; weakness or inability to complete a previously completable workout. CDC: "If you have any of these symptoms at any time, do not ignore them. Seek medical treatment right away."

**What BodyT does with this:**

- R6's `RF-RHABDO` red flag already exists and is unbypassable. Nothing in this pack weakens it. A conditioning planner must route into it, not around it.
- **Programmatic guard (HOUSE HEURISTIC):** a first exposure to any high-eccentric, high-rep movement is volume-capped, and the cap does not lift until the user has completed that movement at a lower volume without a severe-soreness report. BodyT already has `FatigueNote`; the conditioning planner should read it.
- **Post-session check, cheap and specific:** after a first exposure to a new high-eccentric circuit, the follow-up asks about soreness severity rather than presence. "More sore than you expected?" is the CDC's own wording and it is the question that separates normal DOMS from the thing that needs a doctor.
- **The heat modifier is real and BodyT cannot see it.** No weather data, no core temperature. HOUSE HEURISTIC: the conditioning session copy carries a standing line about heat and hydration rather than trying to detect conditions. R6's `RF-HEAT` covers the symptomatic case.
- **Overuse, the non-emergency version:** for running specifically, the session-spike finding in 3.5 is the operational guard. For conditioning, the equivalent is movement-specific: total reps of a novel high-eccentric movement, not total session minutes.

### 5.7 How conditioning differs from random exercise density

The distinction matters because BodyT's current `circuit-a` and `circuit-b` are, functionally, random exercise density: a list of movements, a round count, and a rest. That is a workout. It is not conditioning. Four properties separate them:

1. **A named target quality.** Aerobic power, anaerobic capacity, or muscular endurance. The target decides the work and rest durations (5.3). A circuit with no named target cannot have a correct rest interval, because "correct" is defined relative to what is being trained.
2. **A repeatable dose.** Same movements, same reps, same rest, so the score means something on the second exposure. A rotating list is variety, and variety is the enemy of measurement. HOUSE HEURISTIC: rotate the block every 3 to 4 weeks, never within a block.
3. **A progression rule stated in advance.** Add rounds, add reps per minute, shorten rest, add load, or improve the score at fixed work. Exactly one of these advances at a time. This is the same double-progression discipline BodyT already runs for lifts in `weeksPerLoadStep`.
4. **A modality that can be measured.** BodyT already knows which activities it can measure and which it cannot (`ACTIVITY_TRACKING` in `src/plan/cardio.ts`). A conditioning block on a bike or a rower has no step signal at all (`steps: false, distance: 'none'`), so its progression must come from the prescription, not from the pedometer. A conditioning block that is jump rope has an excellent step signal and a band already. The planner should prefer measurable modalities where the user has them and should say why when it cannot measure.

The one-line version for the state file: **conditioning is a dose with a target and a score. Everything else is just being tired on purpose.**

---
## 6. CONCURRENT TRAINING

The single most commonly requested combination BodyT currently ignores. `FAMILY.endurance = 'general'` hands an endurance user a lifting layout, and nothing anywhere in the engine knows that a hard run and a heavy lower-body day are competing for the same legs.

### 6.1 What the evidence actually says

**The interference effect is much smaller than its reputation, and it is not uniform across qualities.**

SCHUMANN-2022, 43 studies and about 1,090 participants, comparing concurrent training against strength training alone:

| outcome | SMD | 95 percent CI | p | reading |
|---------|-----|---------------|---|---------|
| maximal strength | -0.06 | -0.20 to 0.09 | 0.446 | no interference |
| muscle hypertrophy | -0.01 | -0.16 to 0.18 | 0.919 | no interference |
| explosive strength | -0.28 | -0.48 to -0.08 | 0.007 | real, moderate attenuation |

Authors' conclusion, quoted: "Concurrent aerobic and strength training does not compromise muscle hypertrophy and maximal strength development. However, explosive strength gains may be attenuated, especially when aerobic and strength training are performed in the same session."

The older WILSON-2012 meta-analysis (21 studies, 422 effect sizes) is where most of the folk fear comes from, and it is more pessimistic: hypertrophy effect size 1.23 for strength alone versus 0.85 concurrent, power 0.91 versus 0.55. It also found interference significant with **running but not cycling**, and negative correlations with endurance **frequency** (-0.26 to -0.35) and **duration** (-0.29 to -0.75).

The two disagree, and the disagreement is preserved here rather than averaged. SCHUMANN-2022 is newer, larger, and specifically found **no significant modality difference between running and cycling** for maximal or explosive strength, and **no difference between high (over 5 sessions/week) and low (under 5) concurrent training frequency**. WILSON-2012 found both. A coaching app should behave as though the smaller, modality-specific risk is real (it costs almost nothing to avoid) while not telling users that cardio kills gains, because the best current evidence says it does not.

### 6.2 The four dials that do have evidence

**1. Sequencing within a session.** Resistance before endurance is favoured for lower-body dynamic strength: weighted mean difference 6.91 percent change, p=0.006 (EDDENS-2018). No difference for hypertrophy (1.15 percent, p=0.40), static strength (-0.04 percent, p=0.98), aerobic capacity, or body fat. ZHANG-2025 agrees: sequence shows no consistent association with hypertrophy or maximal strength, strength-first favours jump and explosive power, and aerobic improvement is unrelated to sequence.

**2. Separation between the two.** SCHUMANN-2022 found the explosive-strength attenuation was "more pronounced when concurrent training was performed within the same session" versus "separated by at least 3 h". ZHANG-2025 recommends at least 3 hours for an endurance-then-strength sequence, on the grounds that AMPK takes about 3 hours to return to baseline. Both of these are about the endurance-into-strength direction.

**3. The direction nobody programs for.** DOMA-2017 documents the reverse: a single resistance session leaves residual fatigue that can impair a subsequent endurance session "for several hours to days", via impaired neural recruitment, worse running economy and raised energy cost, soreness, and reduced glycogen. A hard leg day on Tuesday can wreck Wednesday's threshold run. Almost no consumer app models this.

**4. Endurance volume and frequency.** WILSON-2012 found negative correlations with both. SCHUMANN-2022 found no frequency effect. ZHANG-2025 explicitly establishes no weekly threshold. **No source captured here names a weekly endurance volume above which strength gains suffer.** BodyT must not invent one.

### 6.3 And the other direction: strength helps endurance

This is not a compromise; it is an upgrade. LLANOS-2024, meta-analysing strength training in middle and long distance runners:

- High load (80 percent 1RM or more): running performance ES -0.469 (p=0.029), running economy ES -0.266 (p=0.039).
- Combined methods (two or more of high load, submaximal load, plyometrics): performance ES -1.035 (p=0.036), economy ES -0.426 (p=0.018).
- Plyometrics alone: not significant for either.
- **No method changed VO2max.** The mechanism is economy, not engine.
- Typical dose across included studies: 6 to 40 weeks, 1 to 4 sessions per week, representative protocol 2 to 3 sets of 4 to 10 reps at 80 to 90 percent 1RM with 2 to 3 minutes rest.

The framing behind this is BLAGROVE-2018: distance running performance is determined by VO2max, velocity at VO2max, maximum metabolic steady state, running economy and sprint capacity, and strength training moves the economy term. LLANOS-2024 is the quantified successor and agrees: economy and performance move, VO2max does not.

The generator's existing endurance strategy line already says this ("Lifting is your injury insurance"). The evidence supports a stronger and more accurate claim: heavy lifting makes running cheaper. BodyT can say that.

### 6.4 The rules BodyT should apply

Each rule states its confidence. The ordering rule and the separation rule are sourced; the budgets are HOUSE HEURISTIC because no source captured here quantifies them.

| # | rule | confidence |
|---|------|------------|
| C1 | When both fall on the same day, lift first, then run. | source (EDDENS-2018, ZHANG-2025) |
| C2 | Exception to C1: when the endurance session is the day's priority (a race-pace or threshold session inside a race build), run first and lift after, or move the lift. Doing the priority session second means doing it tired. | HOUSE HEURISTIC, consistent with DOMA-2017 |
| C3 | Prefer at least 3 hours between the two, and prefer separate days over the same day. | source (SCHUMANN-2022, ZHANG-2025) |
| C4 | Never place a hard endurance session the day after a heavy lower-body session, or the day before one. | HOUSE HEURISTIC grounded in DOMA-2017 (several hours to days of residual fatigue) |
| C5 | If the user's goal is explosive (BodyT's `vertical` or `speed` goals), the interference is real: keep endurance non-impact where possible, keep it away from jump and sprint days, and cap it. This is the one quality with a significant pooled effect. | source for the effect (SCHUMANN-2022), HOUSE HEURISTIC for the placement |
| C6 | If the user's goal is muscle, strength, or lean, do not warn them about cardio. Tell them it does not cost them muscle or maximal strength, because that is what the best evidence says. | source (SCHUMANN-2022) |
| C7 | Prefer non-impact modalities (bike, row, incline walk, swim) when the lifting plan is the priority. Cheap insurance: SCHUMANN-2022 found no modality difference, WILSON-2012 found running worse. Choosing the bike costs nothing if SCHUMANN is right and saves something if WILSON is. | HOUSE HEURISTIC, explicitly hedging a disagreement between two sources |
| C8 | Do not cap weekly endurance volume for strength reasons. No source supports a number. Cap it for recovery and time reasons, which are visible in the log. | source (the absence: ZHANG-2025 establishes no threshold) |
| C9 | For runners, keep the lifting heavy and low-volume: 2 to 3 sets of 4 to 10 reps at 80 to 90 percent 1RM, 1 to 3 sessions per week. That is the dose the evidence used. High-rep leg burnouts buy the runner soreness and no economy. | source (LLANOS-2024) |
| C10 | For a hybrid athlete, the weekly hard-day budget is shared across both domains, not two separate budgets. A threshold run and a heavy squat day both draw on the same recovery. | HOUSE HEURISTIC |

### 6.5 A worked week (HOUSE HEURISTIC layouts)

Six days available, hybrid athlete, lifting 4 and running 3:

```
Mon  lift lower (heavy)                       hard
Tue  easy run 30 to 40 min                    easy
Wed  lift upper                               moderate
Thu  threshold run 2 x 12 min                 hard
Fri  lift upper or full body                  moderate
Sat  long run                                 hard (long, not fast)
Sun  rest or walk
```

Rules visible in that layout: no hard run adjacent to the heavy lower day on either side (C4); three hard days spaced by at least one non-hard day (C10); the long run is the last hard element of the week and precedes the rest day.

Four days available, lifting 3 and running 2, both on shared days:

```
Mon  lift full body, then easy run 20 min     lift first (C1)
Wed  lift full body                           moderate
Fri  lift full body                           moderate
Sat  long run                                 hard
```

Three days available, "I want both and I have three days": each day is a lift followed by a short easy run, and the weekend day carries the long run. Nothing gets a dedicated hard interval session. Say so out loud rather than pretending three days buys two builds.

---
## 7. UNITS AND METRICS

### 7.1 The metric table

| metric | unit BodyT stores | where it lives today | prescribe in it? | notes |
|--------|-------------------|----------------------|------------------|-------|
| time | minutes (`CardioEntry.minutes`), seconds (`RunLog.durationSec`) | `activityTypes.ts` | **yes, primary** | BAA-10K1 prescribes an entire 12-week plan in minutes. Time never humiliates a slow runner |
| distance | miles (`distanceMi`, `weeklyMiles`, `RACES[].mi`, `StageMetric.longRunMi`) | `runs.ts`, `milestones.ts` | secondary | storage is imperial by design; `Settings.units` is a display flag only ("storage stays imperial internally", `types.ts:543`). Keep it that way. Never dual-store |
| pace | seconds per mile (`avgPaceSec`, `paceSecPerMi`, `fmtPace`) | `runs.ts` | descriptive only, except where a race pace is genuinely known | see 7.3 |
| speed | mph (`avgMph`) | `runs.ts` | rides only | the natural stat for a bike |
| elevation | feet stored (`elevGainFt`), metres internally | `elevation.ts` | no | descriptive |
| heart rate | **not stored anywhere** | nowhere | **no** | see 7.4 |
| RPE | three-tier `feltIntensity`: low / standard / high, shown as Easy / Solid / All out | `activityTypes.ts`, `intensity.ts` | **yes, as the effort anchor** | see 7.5 |
| measured intensity | three-tier `intensity`, from steps per hour against a band | `intensity.ts` | no, it is an observation | kept strictly apart from `feltIntensity` on purpose |
| MET | float, per activity and per mode and per measured tier | `cardio.ts` | no, it is a cost model | see 7.6 |
| steps | count, plus a per-sport stride | `cardio.ts`, `intensity.ts` | no | the measurement, not the prescription |
| floors | count, x 3.05 m | `cardio.ts` `FLOOR_HEIGHT_M` | yes, for stair machines | the only number a user reads off a console and types in |
| calories | kcal (`kcalEst`) | `runs.ts`, `intensity.ts` | no, never | a target that moves with effort perception is how apps lie |

### 7.2 What the steps-per-hour calibration is genuinely good at, and where it is not

This deserves a direct answer because it changes what the endurance planner should lean on.

**Where it is excellent: court and field sports.** A pickleball court is shorter than GPS error, so satellites cannot grade a match and a pedometer can. Basketball, tennis, volleyball, soccer, football, combat all have real per-sport bands with named provenance, and the per-person calibration in `calibration.ts` fixes the one thing population bands get wrong (a post player and a guard produce step rates an hour apart at the same effort).

**Where it is weak: running intensity.** The `run` band is `{low: 7800, high: 10200}` steps per hour, which is 130 and 170 steps per minute. That is a **cadence** band. Cadence is famously close to invariant across running paces: a runner covering 12-minute miles and the same runner covering 7-minute miles land at broadly similar step rates, because pace changes mostly through stride length, not turnover. The 130 threshold is really the walk-to-run boundary (and is sourced as exactly that, CADENCE-Adults, in the `cardio.ts` header). So for running, steps per hour separates walking from running well and separates an easy run from a hard run badly.

**Consequences for the planner, all HOUSE HEURISTIC:**

1. **Do not use the run step band as the intensity signal for a prescribed run.** Use `feltIntensity` where the user gave one, and pace relative to that user's own recent distribution otherwise. `runGoalReview` already does a crude version of this (fast if under 0.92 x the median of the last 5 runs, easy if over 1.05 x).
2. **Do keep the calibration machinery.** The bias term in `calibration.ts` is cross-sport and it is a genuine read on how this person reports effort. That is exactly the correction an RPE-driven endurance plan needs, and it already exists.
3. **Consider a running-specific band on pace rather than cadence.** The same `PersonalBand` shape works: replace steps per hour with seconds per mile, invert the comparison, keep `MIN_ACTIVITY_SAMPLES`, `BIAS_STEP`, `MAX_DRIFT` and `PRIOR_STRENGTH` unchanged. This is the smallest possible extension of a proven module and it would give BodyT personalized easy and hard pace boundaries with zero new concepts. Marked HOUSE HEURISTIC; no source captured here validates a personalized pace band, but the mechanism is identical to the one already shipped.
4. **The calorie firewall stays.** `calibration.ts` deliberately never touches `cardioKcal`. An endurance planner must not breach that. A personalized pace band would be an intensity read, not a cost model.

### 7.3 Pace: when to show it and when to refuse

- **Show it always as a description of what happened.** It already works.
- **Prescribe it only from a genuine hard effort.** VDOT derives every training pace from a race result (DANIELS-VDOT). Deriving paces from easy runs produces easy paces that are too easy and hard paces that are far too easy, which is the worst of both. HOUSE HEURISTIC gate: a pace prescription requires a run of at least 12 minutes, `feltIntensity === 'high'`, within the last 90 days, and it is the fastest such run.
- **Race-pace segments are the exception that matters.** The BAA plans prescribe MP and HMP constantly ("3 x 3 miles at MP", "4 miles at HMP"). Those paces come from a goal time, which onboarding already collects as `run-time` free text ("e.g. under 2 hours"). Parsing that into a target pace is straightforward and currently unread.
- **Never show a pace target to a run-walk user.** They are not running a pace, they are running an interval.

### 7.4 Heart rate: what to ask and what to refuse to infer

BodyT stores no heart rate. The temptation is to synthesise zones from age. Refuse.

- TANAKA-2001 (HRmax = 208 - 0.7 x age) is the better of the two common formulas, built on a meta-analysis of 351 studies and 18,712 subjects with a 500-subject validation. Its standard error of estimate is around 10 bpm, and individual variation is +/- 7 to 12 bpm.
- A typical zone is about 10 percent of HRmax wide, roughly 18 bpm for a 40-year-old. An estimate whose error is 10 to 12 bpm cannot reliably place someone inside an 18 bpm band. **An age-derived HR zone is roughly a coin flip between adjacent zones.**
- **Rule: BodyT does not compute HR zones from age.** If BodyT ever displays HR, it uses a max the user measured and entered, and it says where the number came from. Otherwise it uses the talk test, which is a validated instrument that needs no device (CDC-INTENSITY).
- The ACSM intensity bands exist and R6 already captured them (light 30-39 percent HRR, moderate 40-59, vigorous 60 or more). R6's own note applies here unchanged: "BodyT never surfaces %HRR; use the talk test in copy."

### 7.5 RPE: the three-tier answer is enough

BodyT asks Easy / Solid / All out once per tracked session and stores it as `feltIntensity`. Mapping to the CDC 0-10 relative effort scale (moderate 5-6, vigorous 7-8, CDC-INTENSITY):

| BodyT tier | 0-10 | talk test | prescribe as |
|------------|------|-----------|--------------|
| Easy (`low`) | 2 to 4 | full sentences | `easy`, `long`, `recovery` |
| Solid (`standard`) | 5 to 7 | short sentences | `steady`, `threshold` |
| All out (`high`) | 8 to 10 | a word or two | `interval`, `strides` |

Do not add a 1-to-10 slider. Three tiers is already the granularity the calibration engine is built on (`RANK: Record<Intensity, number>`), the ladder is already displayed with those three words, and a finer scale would break `calibration.ts` for no measured gain.

### 7.6 MET: the cost model, and an open item

BodyT's MET values come from the Compendium of Physical Activities, 2011 update, as stated in the `cardio.ts` header. The 2024 Adult Compendium is out: third update, over 300 new activities, MET values revised, and scoped to adults 19 to 59 by removing data from those 60 and over (COMPENDIUM-2024).

**This pack could not verify BodyT's MET values against 2024.** `pacompendium.com` returned HTTP 403 through this session's proxy and the per-activity tables were not readable. Recorded as an open item, not a finding:

- The MET numbers in `cardio.ts` and `ACTIVITY_TRACKING` should be re-checked against the 2024 tables when a session can reach them.
- The scoping change (dropping 60-plus data) matters for BodyT if it ever serves older users: 2024 METs describe 19 to 59 year olds, and the separate Older Adult Compendium exists for the rest.
- `estKcal`'s running term (`max(3.5, 1.65 * mph)`) is a linear fit, not a Compendium row, and is described in code as landing on the ACSM table (6 mph is about 9.9 METs). That is internally consistent and unaffected by the 2024 revision.
- Nothing here justifies changing a shipped number before the tables are read. Old values that are documented beat new values that are guessed.

### 7.7 What should be ASKED versus INFERRED

| fact | asked or inferred | status today |
|------|-------------------|--------------|
| goal race and distance | asked (`race-what`) | asked, used only for strategy copy |
| race date | asked (`race-when`) | asked, unused for feasibility |
| current weekly volume | asked (`run-now`, banded) | asked, unused |
| goal time | asked (`run-time`, free text) | asked, unparsed |
| finishing vs time vs enjoyment | asked (`run-goal`) | asked, unused |
| **longest run in the last 30 days** | **should be asked, is not** | **missing, and it is the highest-value missing input in this pack** |
| days available | asked (`daysPerWeek`) | used for the lifting layout only |
| felt intensity per session | asked once per session | used, well |
| pace, splits, elevation, distance | inferred from GPS | good |
| weekly mileage, longest run over time | inferred from `data.runs` | computed, never targeted |
| calories | inferred | good |
| HR zones | **neither: refuse** | correct today by accident, should be correct on purpose |

The longest-run gap is worth stating plainly. FRANDSEN-2025's entire finding is expressed relative to the longest run of the previous 30 days. BodyT can compute that from `data.runs` for a user with history and cannot know it at all for a new user, who is exactly the user the guard protects. One banded question at onboarding ("longest run or walk you have done recently") closes it.

---
## 8. INTEGRATION WITH LIFTING

### 8.1 The blind spot, in code

`src/engine/volume.ts` sets `KIND_WEIGHT.cardio = 0`, with the comment "Cardio washes, not lifting volume." That is correct for the per-muscle set-ceiling model it belongs to, and it is also the concurrent-training blind spot written down: **nothing in BodyT adds a run and a squat day together.** The volume engine counts sets per muscle inside a lifting day. The endurance side counts miles per week. Nothing counts hard days per week across both, which is the number that actually governs recovery (section 6, rule C10).

Second observation: `src/engine/resolveDay.ts:102`, `cardioRequiredForWeek` returns false whenever `week.tier !== 1`, with the comment "Tier 2/3: skip the formal cardio". For a lifting-goal user that is right. **For an endurance-goal user it is exactly backwards:** on a collapsed week the run is the thing to protect and the accessory lifting is the thing to drop.

### 8.2 Sharing a week

Constraints, in priority order:

1. **The long run and the heavy lower-body day are the two anchors.** Place them first, as far apart as the week allows. Everything else fits around them.
2. **Never adjacent** (rule C4). A heavy lower day the day before a long run means running on legs that DOMA-2017 says can be compromised for several hours to days. A heavy lower day the day after a long run means squatting on the same tissue.
3. **Hard days are a shared weekly budget** (rule C10). Count: `interval`, `threshold`, race-pace `steady`, `long` beyond an hour, heavy lower, heavy full body, and CNS days. HOUSE HEURISTIC budgets: 2 for a beginner, 3 for an intermediate, 4 for an experienced athlete with 6 training days. `strides`, `recovery`, `easy` and mobility do not count.
4. **BodyT already has a CNS-day concept.** `PlanConfig.anchors.cnsWeekdays` marks readiness-gated power and speed days, and `WeekState.cnsSwapDates` already records "speed work swapped out after a hard run". That machinery is the right hook: an endurance session that lands the day before a CNS day should trigger the same swap logic that ball currently triggers.
5. **Cross-training days in the cited plans are real days, not filler.** BAA-M1 places "Cross Training or Strength Training" on two to three days of nearly every week for 20 weeks. HIGDON-N1 has one. Those are the slots a lifting plan occupies inside a running build, and they are already in the source plans. BodyT does not need to invent a hybrid layout; it needs to fill the slot the running plan already leaves.

### 8.3 Ordering within a day

| situation | order | why |
|-----------|-------|-----|
| both scheduled, no priority stated | lift, then run | EDDENS-2018: resistance-first is worth 6.91 percent on lower-body dynamic strength, and costs nothing on aerobic outcomes |
| the run is the day's priority (threshold, race-pace, long) | run, then lift, or move the lift | doing the priority session second means doing it tired (HOUSE HEURISTIC, consistent with DOMA-2017) |
| goal is explosive (`vertical`, `speed`) | jumps and sprints first, always, and endurance on a different day where possible | `sequence.ts` already enforces power-first inside a session; SCHUMANN-2022 puts the only significant interference on exactly this quality |
| separated by 3 hours or more | either order, prefer the priority first | SCHUMANN-2022, ZHANG-2025: the attenuation is a same-session effect |
| a light easy run appended after lifting | lift, then run | ZHANG-2025: "low-intensity endurance training can be arranged before strength training without obvious interference", so the reverse is also safe; keeping the lift first is simply the default |

The existing `orderSession` in `src/engine/sequence.ts` already sorts within a lifting session (power, then multi-joint, then accessory, then carries, core, mobility). An endurance block appended to a lifting day belongs after all of it, in the same stable-sort framework, as a terminal band.

### 8.4 What to cut first when time collapses

BodyT already has the collapse machinery: tiers 1 to 3, `minViable` recipes per day template, `trimToFit` and `capAccessorySets` in the resolve pipeline, and the trim discipline pinned by `trim.test.ts` ("A trimmed day has to be a smaller day. Fewer sets, measured, not described"). The endurance planner should reuse all of it rather than inventing a parallel path.

**Cut order for a hybrid or endurance user (HOUSE HEURISTIC, with the reasoning stated):**

1. **Accessory lifting volume.** Already handled by `capAccessorySets` and `trimToFit`. Costs the least.
2. **Easy run duration, not the easy run itself.** A 20-minute easy run keeps the habit, the frequency and the tissue exposure. Deleting it entirely costs a training day.
3. **The second hard session of the week.** Two hard sessions is a plan; one hard session is still a plan. Zero hard sessions for weeks on end is a walk.
4. **The cross-training day.** It is the most substitutable item in every plan captured.
5. **Long run duration, capped, never the long run itself.** If the long run has to shrink, shrink it and say so. The long run is the last endurance element to go for a distance goal.
6. **Never cut, for an endurance user, on a collapsed week:** one long-ish run and one lifting session. That is the endurance analogue of tier 3, and it is precisely the inverse of what `cardioRequiredForWeek` currently does.

**The tier semantics need a goal-aware branch.** Today, tier 2 and tier 3 drop cardio and keep lifting. Proposal, HOUSE HEURISTIC:

| goal | tier 1 | tier 2 (3 days) | tier 3 (2 days) |
|------|--------|-----------------|-----------------|
| `muscle`, `strength`, `lean`, `general`, `vertical`, `speed` | as today | as today (cardio dropped) | as today |
| `endurance` | full running week plus 2 lifts | 2 runs (one long) plus 1 full-body lift | 1 long run plus 1 full-body lift |
| hybrid (endurance goal with a strength target, or vice versa) | both anchors plus filler | one anchor from each domain plus one filler | one anchor from each domain |

### 8.5 Two things that should NOT change

- **The conditioning requirement should stay, and stay separate.** `cardioRequiredForWeek` enforces at least one conditioning session per Tier-1 week where no ball was logged. That is a health floor and it should keep working for lifting-goal users regardless of what the endurance planner does. Do not let a new endurance module absorb it.
- **`sportMode` stays.** The owner's basketball-first voice and the generic voice are a copy concern, not a planning concern. An endurance planner should emit structure and let the existing copy layer speak.

---
## 9. EVAL FIXTURES

Twenty cases. Each names the input, the required behaviour, the failure it catches, and what it pins. Written to be turned into table tests beside `generator.test.ts` and `milestones.test.ts`. Copy shown is illustrative, not final, and carries no em dashes.

**F1. Sedentary starter wanting a 5K.**
Input: `goal: 'endurance'`, `race-what: '5K'`, `run-now: 'Not really running'`, `daysPerWeek: 3`, no run history.
Expect: on-ramp phase 1, run-walk intervals prescribed in minutes, 3 sessions with a rest day between each, zero `threshold` or `interval` sessions, no pace shown anywhere, week repeat offered when a week is incomplete.
Catches: handing a beginner "easy jog 25-30 min", which is what `pickCardio` does today.
Pins: NHS-C25K structure; R6 GREEN-with-ramp; the time-not-distance rule.

**F2. Marathon in 16 weeks from 12 miles per week.**
Input: `race-what: 'Marathon'`, `race-when: 'Under 3 months'` is false so `'3 to 6 months'`, `run-now: '10 to 25'`, longest run 6 mi, `daysPerWeek: 5`.
Expect: feasibility check runs first. 16 weeks minus a 2 to 3 week taper leaves 13 to 14 build weeks; `weeksToLongRun(6, 20)` is `ceil(log(20/6)/log(1.08) * 4/3)` which is 21 weeks. The plan states the gap rather than compressing, and offers two honest options: target the distance with a run-walk finish, or move to the half.
Catches: silently generating a build that cannot reach 20 miles and letting the user find out in week 14.
Pins: `weeksToLongRun`; `RACES.marathon.peakLong = 20`; the `race-when` followup's own promise.

**F3. Lifter adding conditioning without losing strength.**
Input: `goal: 'muscle'`, 4 lifting days, user asks for conditioning.
Expect: 2 conditioning sessions per week, placed away from the heavy lower day on both sides, prefer non-impact modality, lift-first when shared, and copy that says the evidence does not show a cost to muscle or maximal strength.
Catches: warning the user that cardio kills gains, which contradicts SCHUMANN-2022.
Pins: rules C1, C4, C6, C7; SCHUMANN-2022 hypertrophy SMD -0.01 and maximal strength SMD -0.06.

**F4. Hybrid athlete with 6 days.**
Input: `goal: 'endurance'` with a stated strength target, 6 days, 20 mi/wk, lifts 3x.
Expect: the 6-day layout from section 6.5. Exactly 3 hard days. Long run last hard element before the rest day. No hard run adjacent to the heavy lower day. Hard-day budget counted across both domains.
Catches: two independent plans stacked, producing 5 hard days.
Pins: rule C10; the shared budget.

**F5. Postpartum return to running.**
Input: user states they gave birth 7 weeks ago and wants to run.
Expect: **R7-PACK owns this.** R8's only job is the handoff: the endurance planner must not generate any running session for this user on its own authority. The 12-week floor and the criteria-based screen (POSTPARTUM-2019) plus R6-PACK's pregnancy and postpartum routing decide what happens. The on-ramp's phase 0 walking is the only thing R8 would offer, and only if R6 and R7 permit it.
Catches: an endurance planner that reads `goal: 'endurance'` and starts prescribing impact because postpartum is not in its own rule set.
Pins: the interaction itself. This fixture exists so the boundary is tested, not so R8 decides it.

**F6. A user with only 20 minutes.**
Input: any endurance goal, session-level time cap of 20 minutes.
Expect: the session is rebuilt, not annotated. Options in order: 20 minutes easy; or 5 min easy plus 6 x (1 min hard / 1 min easy) plus 3 min easy. Never a 40-minute session with a note saying do half. The long run does not shrink to 20 minutes; it moves.
Catches: the exact failure `trim.test.ts` was written for, transplanted into cardio.
Pins: `trim.test.ts` discipline; GIBALA-SIT (10 min or less of intense work is a real dose); MILANOVIC-2015 (low baseline fitness gains most).

**F7. Wants to dunk and must NOT be given long slow distance.**
Input: `goal: 'vertical'`, user asks for conditioning or says they want to be in better shape.
Expect: no `long`, no steady-state volume block. Conditioning is short, high-quality, repeat-effort: 8 to 12 x 5 to 15 s with 30 to 60 s rest, or hill sprints with full walk-down recovery (which BodyT already has as `hill-sprint`, with "never jog the downhill" in its own mistakes list). Placed away from jump and speed days. Copy explains why: explosive strength is the one quality with a measured interference effect.
Catches: `FAMILY.vertical = 'explosive'` giving a good lifting layout and then `pickCardio` offering `easy-jog 25-30 min` and `brisk-walk 30-45 min` alongside it, which is what ships today.
Pins: SCHUMANN-2022 explosive SMD -0.28 (p=0.007); rule C5; `VERT_IN_PER_WEEK` honesty about what a jump program can deliver.

**F8. Marathon in 6 weeks from nothing.**
Input: `race-what: 'Marathon'`, `race-when: 'Under 3 months'`, `run-now: 'Not really running'`.
Expect: refusal to generate a marathon build, phrased as a choice not a scolding. Offer the on-ramp and a different race. Do not produce a compressed 6-week marathon plan under any circumstance.
Catches: the app's willingness to say yes.
Pins: the refusal habit already present in `parseGoalTarget` (returns null rather than guessing).

**F9. A single proposed session doubles the 30-day longest run.**
Input: history shows longest run 4 mi in the last 30 days; the plan's next long run is 8 mi.
Expect: the planner flags it, offers the shorter version as the default and the longer as the choice, and explains in one sentence.
Catches: a long-run ladder that ratchets on the calendar rather than on what the person has actually done.
Pins: FRANDSEN-2025 (over 100 percent spike, HRR 2.28, 1.50 to 3.48). This is the one guard in the pack with a large cohort behind it.

**F10. Reports dark urine and severe soreness after a first conditioning circuit.**
Input: free text or a fatigue note containing the rhabdo pattern.
Expect: R6's `RF-RHABDO` fires. Training pauses. No substitute session is offered. The conditioning planner must route into R6, never around it.
Catches: a new module with its own symptom handling that quietly bypasses the unbypassable red flag.
Pins: CDC-RHABDO; R6 section 2.

**F11. Three days available, wants both a strength build and a half marathon.**
Input: `daysPerWeek: 3`, endurance goal with a stated lift target.
Expect: the plan is built and the tradeoff is stated. Three days buys one long run, one quality-ish run or a run appended to a lift, and one to two lifts. Neither domain progresses at full speed. BodyT builds the alternatives, recommends one, and explains the tradeoff, exactly as the north star says.
Catches: promising two builds on three days.
Pins: the v12 "when more than one strategy is genuinely defensible" rule; section 6.5 three-day layout.

**F12. Logs every session as All out.**
Input: 8 tracked sessions, all `feltIntensity: 'high'`.
Expect: `fromOwnAnswers` cannot place a boundary (only one tier observed) and returns null, so `personalBand` falls back to bias, and bias is clamped by `MAX_DRIFT`. The endurance planner must handle a null or population band by prescribing on the talk test alone, and should surface a coach line about running easy runs easier.
Catches: an endurance planner that assumes a personal band exists.
Pins: `calibration.ts` `fromOwnAnswers` null path; `MAX_DRIFT` 0.5.

**F13. Treadmill only, no GPS.**
Input: all sessions logged with `where: 'indoor'`, `distanceSource: 'manual'` or none.
Expect: the plan prescribes minutes and effort, never pace or distance. `estKcal`'s zero-distance fallback already handles the calories. No stage on the `longRunMi` ladder is offered as a target if distance is never measured; the `weeklyMi` ladder degrades to a time-based equivalent or is suppressed.
Catches: a distance ladder that can never light up, which `milestones.ts` explicitly calls "a promise the app has quietly broken".
Pins: the stage-refusal rule in `milestones.ts`.

**F14. Endurance goal, does not want to run.**
Input: `goal: 'endurance'`, user names cycling or swimming or rowing.
Expect: the same seven session types, prescribed in minutes and effort, on the chosen modality. `swim`, `row-erg` and `bike` have `steps: false, distance: 'none'` or GPS-only, so intensity comes from the mode chip and the felt answer. No run ladder, no `RACES` row, no pace.
Catches: an endurance planner that is secretly a running planner.
Pins: `ACTIVITY_TRACKING`; the modality-measurability rule in 5.7.

**F15. Returning runner, six months off, used to run 40 miles a week.**
Input: `experience: 'returning'`, `run-now: 'Not really running'`, history in `data.runs` shows 40 mi/wk ending 6 months ago.
Expect: the plan starts from CURRENT capacity, not from history. History informs the ceiling and the rate of return, never the starting dose. `TrainingAge: 'returning'` already exists and already means "regains fast, the tissue has been there before", which is the correct modifier for the RATE and not for the START.
Catches: restoring the old volume because the log says they used to do it.
Pins: `milestones.ts` `TrainingAge` semantics; the load-provenance principle in the state file (a weight the plan chose is never the next baseline).

**F16. Race in 3 weeks, asks for a plan.**
Input: `race-when` resolves to under a month, existing base is adequate.
Expect: a taper, not a build. Volume drops, some intensity is kept. BAA-M2's own taper is the model: week 20 still contains "3 x 1k at HMP" and "2 miles at MP" inside 2 to 4 mile easy runs.
Catches: cramming a build into the three weeks where fitness cannot be gained and can be lost.
Pins: BAA-M2 weeks 19 and 20.

**F17. Pace derivation gate, satisfied and unsatisfied.**
Input A: one 22-minute run, `feltIntensity: 'high'`, 11 days ago, fastest of the last 90 days. Input B: same distance and pace but `feltIntensity: 'standard'`.
Expect: A produces race-pace and threshold-pace targets. B produces none, and the plan runs on the talk test.
Catches: synthesising training paces from easy running.
Pins: the section 7.3 gate; DANIELS-VDOT's dependence on a maximal result.

**F18. Age 52, new to exercise, asks for HIIT.**
Input: age 52, not a regular exerciser, no red flags, asks for intervals.
Expect: R6's GREEN-with-ramp branch applies. Light to moderate first, vigorous only after a gradual progression period, and the PAR-Q+ over-45 soft cap adds the professional-consult nudge in copy without blocking. The first interval session appears after the ramp, not in week 1.
Catches: an interval planner that reads "user asked for HIIT" as consent.
Pins: R6 sections 3.4 and 3.5; ACSM-ALG; PARQ-2025.

**F19. 10K goal, only 2 days per week.**
Input: `race-what: '10K'`, `daysPerWeek: 2`.
Expect: a real 2-day plan (one longer run, one quality or steady run) plus an honest sentence that 10K progress on 2 days is slower than on 4. No fabricated third day, no guilt copy.
Catches: refusing to plan for the constraint the user actually has.
Pins: the suggest-only and no-guilt constraints; BAA-10K1 scaled down.

**F20. Endurance user, collapsed week (tier 3).**
Input: `goal: 'endurance'`, `WeekState.tier: 3`.
Expect: one long-ish run plus one full-body lift. NOT the current behaviour, where `cardioRequiredForWeek` returns false for tier 2 and 3 and the week becomes two lifting sessions.
Catches: `resolveDay.ts:102`, verbatim, applied to the wrong goal.
Pins: section 8.4's goal-aware tier table.

---
## 10. INTEGRATION NOTES

### 10.1 The typed shape, extending PlanConfig rather than forking it

Established repo pattern: `types.ts` re-exports `activityTypes.ts`, `journeyTypes.ts`, `sessionTypes.ts` and `resolvedTypes.ts` because `types.ts` is the app's vocabulary and it is at its shrink-only allowance of 705 lines. Endurance follows the same pattern: a new `src/enduranceTypes.ts`, re-exported from `types.ts` with a one-line `export *`.

```ts
// src/enduranceTypes.ts

export type EnduranceSessionType =
  | 'easy' | 'long' | 'recovery' | 'steady' | 'threshold' | 'interval' | 'strides'

/** The anchors BodyT can actually deliver. Talk test always, pace only when earned. */
export interface EffortTarget {
  /** Primary anchor, always present. CDC talk-test language. */
  talk: string
  /** 0-10 relative effort band. */
  rpe: [number, number]
  /** Present ONLY when a qualifying hard effort exists. See section 7.3. */
  paceSecPerMi?: [number, number]
  /** Which BodyT tier the athlete should report if the session went to plan. */
  expectFelt: 'low' | 'standard' | 'high'
}

export interface IntervalSpec {
  workSec: number
  restSec: number
  rounds: number
  /** Optional outer structure, per Buchheit and Laursen's variable set. */
  series?: number
  seriesRestSec?: number
  restIsWalk: boolean
}

/** The on-ramp primitive. Walking is a programmed element, never a fallback. */
export interface RunWalkSpec {
  runSec: number
  walkSec: number
  rounds: number
  /** C25K ends every early session on a run rep, not a walk. */
  tailRunSec?: number
}

export interface EnduranceSession {
  id: string
  type: EnduranceSessionType
  /** Catalog id from plan/cardio.ts. Endurance is not only running. */
  activityId: string
  /** Prescription is minutes-first. Distance is optional and always secondary. */
  minutes: number
  distanceMi?: number
  effort: EffortTarget
  warmupMin?: number
  cooldownMin?: number
  intervals?: IntervalSpec
  runWalk?: RunWalkSpec
  /** One honest sentence. No em dashes. */
  note?: string
}

export type EndurancePhase =
  | 'onramp' | 'base' | 'build' | 'peak' | 'cutback' | 'taper'

export interface EnduranceWeek {
  index: number
  phase: EndurancePhase
  sessions: EnduranceSession[]
  /** weekday -> session id. Placement, kept separate from content. */
  placement: Partial<Record<Weekday, string>>
  /** Counted across BOTH domains by the caller; stored so the UI can show it. */
  hardCount: number
  totalMinutes: number
  longestSessionMin: number
}

export interface EndurancePlan {
  endurancePlanVersion: 1
  target: {
    raceId: '5k' | '10k' | 'half' | 'marathon' | 'ultra' | null
    dateISO?: ISODate
    goalTimeSec?: number
  }
  /** activityId; 'run' by default, but a swimmer gets a swim plan. */
  modality: string
  weeks: EnduranceWeek[]
  /** The FRANDSEN-2025 anchor: longest single session at plan time. */
  startLongestMin: number
  /** Every non-sourced number, named, so the explain layer can be honest. */
  assumptions: { id: string; text: string; confidence: 'source' | 'house' }[]
}
```

On `PlanConfig`, exactly one added field:

```ts
/** The running (or riding, or swimming) side of the booklet. Absent on
 *  plans with no endurance goal, which is why nothing existing changes. */
endurance?: EndurancePlan
```

Why this shape and not another:

- **Optional.** Every non-endurance plan serialises identically, so `golden.test.ts` (the NAOD V3 preset, all 16 weeks, all 3 tiers) and `goldenLife.test.ts` (a `strength` persona) are untouched. The one snapshot that WILL move is any endurance persona, and the sim harness already has one: `scripts/personas.mjs` `marathon-first`, "31, runs 12 mi/wk, first marathon in 6 months. Minimal kit, 4 days."
- **`cardioOptions` stays exactly as it is.** It is the conditioning-backup menu for lifting-goal users and the weekly conditioning floor depends on it. Do not repurpose it, do not extend `CardioOption`, do not delete it.
- **Placement is separate from content.** Same split `tier1ByWeekday` / `templates` already uses. It lets a user move a session without regenerating one.
- **`assumptions` is the pack's own requirement made structural.** Every HOUSE HEURISTIC number in a shipped plan gets an id and a sentence. This is what lets the explain layer say "the plan grows the long run about 8 percent a week, which is our choice, not a rule" without hard-coding that sentence in three screens.

One additive union change: `DayKind` gains `'endurance'`. Both `types.ts` and `store/schema.ts` are listed in the state file as auto-merging on added keys, so this is safe across lanes, and a `SCHEMA_VERSION` note belongs in section 9 of `BODYT_STATE.md` when it lands.

### 10.2 Which engines consume it

Respecting the layering law (plan to engine/store to cloud/logic/platform to components/screens, never upward):

| layer | file | role | new or changed |
|-------|------|------|----------------|
| plan (layer 0) | `src/plan/endurance.ts` | session-type catalog, effort tables, on-ramp phases, race archetypes, pure week arithmetic. Sibling of `milestones.ts`, no `AppData`, no dates | new |
| plan | `src/plan/enduranceGenerator.ts` | builds an `EndurancePlan` from `OnboardingAnswers` plus a starting-capacity struct | new (keeps `generator.ts` off its 941-line cap) |
| plan | `src/plan/generator.ts` | calls the above when `goal === 'endurance'` or an endurance target is present; assigns `plan.endurance`. `FAMILY.endurance` may also stop being `'general'` | changed, minimally |
| engine | `src/engine/resolveDay.ts` | resolves an endurance session onto a day, same as a template; goal-aware tier branch (section 8.4); leaves `cardioRequiredForWeek` alone for non-endurance goals | changed |
| engine | `src/engine/load.ts` | the missing piece: hard-day counting across lifting and endurance, and the session-spike guard against the 30-day longest | new |
| engine | `src/engine/sequence.ts` | endurance block sorts to a terminal band inside a shared day | changed, small |
| engine | `src/engine/journey.ts` | already consumes `runStages` and `weeklyMileageStages`; now they have a plan behind them | unchanged |
| engine | `src/engine/intensity.ts`, `src/engine/calibration.ts` | consumed as-is. The calorie firewall stays | unchanged |
| engine | `src/engine/runs.ts` | `runGoalReview` becomes plan-aware (compare against the prescribed session, not just the race row) and loses the unqualified 10 percent line | changed |
| logic | `src/logic/cardioActions.ts`, `src/logic/sessionStart.ts` | start a prescribed endurance session, log it against the prescription | changed |
| screens | `src/screens/today/*` | render an endurance session; `RunTrackerSheet` already exists and already calls `runGoalReview` | changed |

Nothing new imports upward. `plan/endurance.ts` cannot reach `engine/`, exactly as `milestones.ts` cannot reach `engine/reps.ts` for `loadStepLb` and takes it as a parameter instead.

### 10.3 The staged build

**Stage 0, the minimal useful endurance planner.** This is the smallest change that turns "lifting templates plus a cardio menu" into a running plan, and it is worth shipping alone.

- `EnduranceSessionType` and `EffortTarget` typed.
- The on-ramp: four phases, run-walk prescriptions in minutes (section 4.3), entered from the existing `run-now` answer.
- A goal-aware weekly shape: one long day, one to two easy days, at most one hard day, from the section 3.4 table.
- Prescribed in minutes with talk-test copy. No pace anywhere.
- Placed on the calendar with the two adjacency rules (no hard endurance next to a heavy lower day).
- Fixtures F1, F6, F7, F14, F19, F20 pass.

What Stage 0 deliberately does not have: race builds, phases, tapers, feasibility maths, pace targets, conditioning formats, adaptation. It still beats what ships today by a wide margin, because today an endurance user gets no endurance sessions at all.

**Stage 1, structure.** Hard-day budget across both domains (`engine/load.ts`), the goal-aware tier table, ordering within a shared day, and the trim order from section 8.4. Fixtures F3, F4, F11.

**Stage 2, race builds.** Phases, cutback weeks, taper, and the feasibility check that refuses to compress. Parse `run-time` into a goal pace. Fixtures F2, F8, F16.

**Stage 3, measurement.** The session-spike guard against the 30-day longest run (the one guard with a large cohort behind it). The pace-derivation gate. Optionally, a `PersonalBand` on pace rather than cadence, reusing `calibration.ts` unchanged in shape. Ask for longest recent run at onboarding. Fixtures F9, F13, F15, F17.

**Stage 4, conditioning formats.** `intervals`, `emom` and `circuit` typed and progressable; `circuit-a` and `circuit-b` lifted out of prose in `ExerciseDef.steps` into data. Beginner scaling rules. `amrap` and `rft` only if the "users never pick reps" constraint can be honoured. Fixtures F10, F18.

### 10.4 Guardrails for whoever builds this

- **Prove every new guard bites.** Feed the session-spike guard a doubled long run, watch it fire, then trust it. Standing constraint, and it applies to F9 specifically.
- **The golden lock is a tripwire, not a prohibition.** Non-endurance snapshots must not move at Stage 0. If the endurance persona's sim output moves, that is the point, and the commit says why.
- **Structure allowances shrink only.** `types.ts` 705, `generator.ts` 941, `store/schema.ts` 649. New code goes in new files. This is why `enduranceTypes.ts` and `enduranceGenerator.ts` are separate from the start.
- **No em dashes in any copy string**, including the `note` fields on `EnduranceSession` and every `assumptions[].text`.
- **Suggest only.** A week repeat, a shorter long run, a swapped session: all offered, none imposed.
- **Users never pick reps** applies to conditioning too. The app sets the reps; the clock sets the rest.
- **R6 comes first.** No endurance or conditioning session is generated for a user R6 has flagged, and the rhabdo red flag is unbypassable.
- **R7 owns postpartum.** F5 exists to test the boundary, not to let R8 decide it.
- **Say what is house and what is sourced.** The `assumptions` array is not decoration. Every number in section 3.4, the whole of 5.3, and rules C2, C4, C5, C7, C9 and C10 are HOUSE HEURISTIC and should carry an id.

### 10.5 Open items this pack could not close

1. **2024 Compendium MET values were not readable** (`pacompendium.com` 403). BodyT's METs are 2011. Re-check when reachable. Do not change a documented number for an undocumented one.
2. **Hal Higdon's tables render client-side** and could not be read directly. The Novice 1 structure here is SUMMARY quality from two independent reproductions.
3. **Daniels' Running Formula is a book.** The percent-VO2max bands are consistent across independent reproductions but no primary text was read.
4. **No source captured here gives a weekly endurance volume threshold above which strength suffers.** If a future pack finds one, rule C8 changes. Until then, refusing to name one is the finding.
5. **No source captured here identifies a SAFE single-session spike size.** FRANDSEN-2025 gives risk ratios for three spike bands against a "within 10 percent" reference, with a non-monotonic gradient. Any threshold BodyT ships is a product decision and must be labelled as one.

---

*End of R8 pack. Research synthesized, not engine-integrated. Consumers: the plan generator (endurance goal family), a new `plan/endurance.ts` and `plan/enduranceGenerator.ts`, `engine/resolveDay.ts`, and a new `engine/load.ts`. Depends on R6 for safety gating and hands postpartum to R7.*
