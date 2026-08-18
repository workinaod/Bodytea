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

## 1. SOURCES (provenance)

All accessed 2026-08-18 unless stated.

**Access quality:** FULL = primary text read through this session. SUMMARY = assembled from search captures or a mirror because the primary was unreachable. Recorded honestly so a later session does not re-burn usage on the same paywalls.

**Tier:** **A** = systematic review, meta-analysis, RCT, or a reliability study against a gold-standard reference; or first-party platform documentation, which is normative for what a build target can do. **B** = single validation study, cohort, or narrative review by a domain authority. **C** = editorial, commentary, third-party tooling documentation, or a claim reachable only through secondary reproduction. Nothing rated C may on its own move a number BodyT ships.

### 1.1 HRV-guided training: the trials, including the ones that found nothing

| ID | Source | Journal | Finding taken | Tier | Access |
|----|--------|---------|---------------|------|--------|
| S-VESTERINEN-2016 | Vesterinen V, Nummela A, Heikura I, Laine T, Hynynen E, Botella J, Hakkinen K. Individual Endurance Training Prescription with Heart Rate Variability | Med Sci Sports Exerc 2016;48(7):1347-1354 | 40 recreational endurance runners randomised to HRV-guided (EXP) vs predefined (TRAD) after a 4-week preparation block, then 8 weeks. HRV was rMSSD from a daily morning supine recording read against a 7-day moving window, not a single reading | A | SUMMARY (Ovid abstract + search capture) |
| S-NUUTTILA-2017 | Nuuttila OP, Nikander A, Polomoshnov D, Laukkanen JA, Hakkinen K. Effects of HRV-Guided vs. Predetermined Block Training on Performance, HRV and Serum Hormones | Int J Sports Med 2017;38(12):909-920 | 24 endurance-trained males, 8 weeks. **Both** groups improved maximal treadmill velocity and 3000 m time; the HRV-guided group's relative change in Vmax and countermovement jump was larger (p<0.05). The honest reading is "both worked, one slightly more", not "HRV is required" | A | SUMMARY |
| S-BITTENCOURT-2024 | Bittencourt D, de Oliveira RM, da Silva DG, et al. Effects of individualized resistance training prescription with heart rate variability on muscle strength, muscle size and functional performance in older women | Front Physiol 2024;15:1472702 | 21 women (66 +/- 5 y), 7 weeks, HRV-individualised recovery intervals (n=11) vs fixed schedule (n=10). **No significant group x time interactions on any outcome.** The HRV group performed 27 sessions to the fixed group's 21, carried higher total volume, and gained no more strength, cross-sectional area or function. **The only resistance-training RCT in this set, and it is null** | A | FULL (PMC) |
| S-MANRESA-2021 | Manresa-Rocamora A, Sarabia JM, Javaloyes A, Flatt AA, Moya-Ramon M. Heart Rate Variability-Guided Training for Enhancing Cardiac-Vagal Modulation, Aerobic Fitness, and Endurance Performance: A Methodological Systematic Review with Meta-Analysis | Int J Environ Res Public Health 2021;18(19):10299 | HRV-guided training beat predefined training on vagal-related HRV indices (SMD+ 0.50, 95% CI 0.09 to 0.91) but **not on resting heart rate** (SMD+ 0.04, 95% CI -0.34 to 0.43), and the effect on maximal aerobic capacity was "consistently small but non-significant" (SMD+ 0.20, 95% CI -0.07 to 0.47). It improves the thing it is measured by, more clearly than it improves the thing anyone trains for | A | SUMMARY |
| S-DUKING-2021 | Duking P, Zinner C, Trabelsi K, Reed JL, Holmberg HC, Kunz P, Sperlich B. Monitoring and adapting endurance training on the basis of heart rate variability monitored by wearable technologies: A systematic review with meta-analysis | J Sci Med Sport 2021;24(11):1180-1192 | Versus predefined training, HRV-guided endurance training showed a medium effect on submaximal physiological parameters and **a small, non-significant effect on performance and VO2peak** | A | SUMMARY (jsams.org and sciencedirect.com both returned HTTP 403 through this session's proxy) |

### 1.2 The measurement-error problem that makes a daily HRV reading mostly noise

| ID | Source | Journal | Finding taken | Tier | Access |
|----|--------|---------|---------------|------|--------|
| S-ALHADDAD-2011 | Al Haddad H, Laursen PB, Chollet D, Ahmaidi S, Buchheit M. Reliability of resting and postexercise heart rate measures | Int J Sports Med 2011;32(8):598-605 | 15 healthy males measured on 4 separate occasions. Coefficient of variation for HRV indices: **4 to 17 percent for time-domain indices (rMSSD lives here), 7 to 27 percent for spectral indices, 41 to 82 percent for ratio indices**; heart rate recovery 15 to 32 percent. Test-retest differences were not explained by recorded lifestyle factors | A | SUMMARY |
| S-PLEWS-2013 | Plews DJ, Laursen PB, Stanley J, Kilding AE, Buchheit M. Training adaptation and heart rate variability in elite endurance athletes: opening the door to effective monitoring | Sports Med 2013;43(9):773-781 | The reason HRV monitoring works at all when it works: a **7-day rolling mean** read against a **smallest worthwhile change** band of roughly 0.5 x the between-day standard deviation or coefficient of variation. Also: a collapsing day-to-day variability, HRV going artificially stable near baseline, is itself a warning sign, which means "HRV looks steady" is not automatically good news | B | SUMMARY |
| S-BUCHHEIT-2014 | Buchheit M. Monitoring training status with HR measures: do all roads lead to Rome? | Front Physiol 2014;5:73 | Contradictory findings in this literature are mostly methodological rather than a limitation of heart rate measures. A change in any such measure must be interpreted against **the error of measurement, the smallest important change, and the training context together**. Measures derived from about 5 minutes of near-daily resting or submaximal recording are the most useful | B | SUMMARY |
| S-BELLENGER-2016 | Bellenger CR, Fuller JT, Thomson RL, Davison K, Robertson EY, Buckley JD. Monitoring Athletic Training Status Through Autonomic Heart Rate Regulation: A Systematic Review and Meta-Analysis | Sports Med 2016;46(10):1461-1486 | Vagal-related HRV indices, post-exercise heart rate recovery and heart rate acceleration **increase when positive adaptation has occurred**. The direction of travel is therefore not a one-way fatigue alarm: the same rise means "fitter" in one context and nothing in another, which is precisely what an app reading a single number cannot tell apart | A | SUMMARY |

### 1.3 Subjective wellness versus objective markers

| ID | Source | Journal | Finding taken | Tier | Access |
|----|--------|---------|---------------|------|--------|
| S-SAW-2016 | Saw AE, Main LC, Gastin PB. Monitoring the athlete training response: subjective self-reported measures trump commonly used objective measures: a systematic review | Br J Sports Med 2016;50(5):281-291 | **56 original studies** reporting concurrent subjective and objective measures of athlete wellbeing. Subjective and objective measures **generally did not correlate**. Subjective measures reflected acute and chronic training load with **superior sensitivity and consistency**. Subjective wellbeing fell with an acute load increase and with chronic load, and improved with an acute load decrease. This is the single most important source in the pack | A | SUMMARY (also captured in `research/R3-autoregulation.md` as S16) |
| S-BOURDON-2017 | Bourdon PC, Cardinale M, Murray A, et al. Monitoring Athlete Training Loads: Consensus Statement | Int J Sports Physiol Perform 2017;12(S2):S2-161 to S2-170 | Internal versus external load framework. Session-RPE and wellness questionnaires are the practical internal-load tools. **Monitoring is only useful if it changes a decision, and simple measures beat elaborate ones** | A | SUMMARY (captured in `research/R3-autoregulation.md` as S15) |

### 1.4 Consumer sleep tracking versus polysomnography

| ID | Source | Journal | Finding taken | Tier | Access |
|----|--------|---------|---------------|------|--------|
| S-CHINOY-2021 | Chinoy ED, Cuellar JA, Huwa KE, Jameson JT, Watson CH, Bessman SC, Hirsch DA, Cooper AD, Drummond SPA, Markwald RR. Performance of seven consumer sleep-tracking devices compared with polysomnography | Sleep 2021;44(5):zsaa291 | 34 healthy adults (22 women, 28.1 +/- 3.9 y), 3 nights including a disrupted-sleep condition, 7 devices plus research actigraphy against PSG. **Sleep detection sensitivity 0.93 to 0.99. Wake detection specificity 0.18 to 0.54.** Total sleep time bias ranged from -0.3 min (ResMed S+) to **+46.8 min (Garmin Vivosmart 3)**; wake after sleep onset bias to **-49.5 min (Garmin Fenix 5S)**. Sleep-stage epoch-by-epoch sensitivity: light 0.57 to 0.76, deep 0.53 to 0.68, **REM 0.49 to 0.69**. Conclusion: use these devices for sleep versus wake, **not for stages** | A | FULL (Oxford Academic) |
| S-CHINOY-2022 | Chinoy ED, Cuellar JA, Jameson JT, Markwald RR. Performance of four commercial wearable sleep-tracking devices tested under unrestricted conditions at home in healthy young adults | Nat Sci Sleep 2022;14:493-516 | 21 adults (29.0 +/- 5.0 y), one week at home, unrestricted, against a mobile sleep EEG headband. Same verdict in the field as in the lab: **high variability in sleep-stage performance, so the devices are best used for sleep-wake outcomes and not stages** | A | SUMMARY |
| S-MENGHINI-2021 | Menghini L, Cellini N, Goldstone A, Baker FC, de Zambotti M. A standardized framework for testing the performance of sleep-tracking technology: step-by-step guidelines and open-source code | Sleep 2021;44(2):zsaa170 | The accepted method for validating a sleep tracker: epoch-by-epoch agreement plus discrepancy analysis plus Bland-Altman with **proportional-bias testing**, with open R code. Used here as the bar any future BodyT sleep integration must clear before its numbers are allowed near a decision | A | SUMMARY |

### 1.5 Photoplethysmography accuracy, and the skin-tone literature (which disagrees with itself)

| ID | Source | Journal | Finding taken | Tier | Access |
|----|--------|---------|---------------|------|--------|
| S-SHCHERBINA-2017 | Shcherbina A, Mattsson CM, Waggott D, Salisbury H, Christle JW, Hastie T, Wheeler MT, Ashley EA. Accuracy in Wrist-Worn, Sensor-Based Measurements of Heart Rate and Energy Expenditure in a Diverse Cohort | J Pers Med 2017;7(2):3 | Seven wrist devices. **Six achieved median heart rate error below 5 percent during cycling. No device achieved energy expenditure error below 20 percent.** Device error was higher for males, higher BMI, **darker skin tone** (rated on the Von Luschan scale and mapped to Fitzpatrick), and during walking | A | SUMMARY |
| S-BENT-2020 | Bent B, Goldstein BA, Kibbe WA, Dunn JP. Investigating sources of inaccuracy in wearable optical heart rate sensors | NPJ Digit Med 2020;3:18 | Six devices tested with the explicit hypothesis that darker skin tones reduce PPG heart rate accuracy. **The study found no significant difference in accuracy across skin tones**, and found the dominant error source to be motion and activity, differing by device. **This source contradicts S-SHCHERBINA-2017 and is recorded rather than reconciled**; it also drew a published Matters Arising exchange | A | SUMMARY |
| S-HUNG-2025 | Hung SH, Serwa K, Rosenthal G, Eng JJ. Validity of heart rate measurements in wrist-based monitors across skin tones during exercise | PLOS ONE 2025;20(2):e0318724 | 25 adults (mean 25.8 y, 64 percent female), Fitbit Charge 5 against a Polar H10 chest strap, 495 paired exercise observations, Fitzpatrick groups light (n=8), medium (n=8), dark (n=9). **At rest, no difference: about 2.8 bpm mean absolute error for every group. During exercise, light skin held at about 3.5 to 4 bpm at every intensity while dark skin rose from 5.9 bpm below 40 percent HRR, to 12.1 bpm at 40 to 60 percent, to 16.5 bpm above 60 percent HRR.** This resolves the apparent contradiction above: the disparity is intensity-dependent, so a study done at rest or at low intensity will not see it | A | FULL |
| S-COLVONEN-2020 | Colvonen PJ, DeYoung PN, Bosompra NA, Owens RL. Limiting racial disparities and bias for wearable devices in health science research | Sleep 2020;43(10):zsaa159 | Editorial. Green-light PPG signalling is the technological root of reduced accuracy in darker skin tones, and the authors call the phenomenon severely underreported, with limited coverage and minimal published research. Used for framing only, never for a number | C | FULL |
| S-SJODING-2020 | Sjoding MW, Dickson RP, Iwashyna TJ, Gay SE, Valley TS. Racial Bias in Pulse Oximetry Measurement | N Engl J Med 2020;383(25):2477-2478 | In two large cohorts, Black patients had **nearly three times** the rate of occult hypoxemia missed by pulse oximetry. Among readings of 92 to 96 percent SpO2, arterial saturation was actually below 88 percent in **17.0 percent of measurements in Black patients versus 6.2 percent in White patients**. This is medical-grade oximetry, not a watch, and it is the reason SpO2 is rejected outright in section 3 | A | SUMMARY |

### 1.6 Steps, distance and energy expenditure

| ID | Source | Journal | Finding taken | Tier | Access |
|----|--------|---------|---------------|------|--------|
| S-FULLER-2020 | Fuller D, Colwell E, Low J, Orychock K, Tobin MA, Simango B, Buote R, Van Heerden D, Luan H, Cullen K, Slade L, Taylor NGA. Reliability and Validity of Commercially Available Wearable Devices for Measuring Steps, Energy Expenditure, and Heart Rate: Systematic Review | JMIR Mhealth Uhealth 2020;8(9):e18694 | **158 publications, 9 brands.** Steps: Fitbit, Apple Watch and Samsung measure accurately in laboratory settings. Heart rate: more variable, Apple Watch and Garmin most accurate, Fitbit tends to underestimate. Energy expenditure: **no brand was accurate** | A | SUMMARY |
| S-ODRISCOLL-2020 | O'Driscoll R, Turicchi J, Beaulieu K, Scott S, Matu J, Deighton K, Finlayson G, Stubbs RJ. How well do activity monitors estimate energy expenditure? A systematic review and meta-analysis of the validity of current technologies | Br J Sports Med 2020;54(6):332-340 | **60 studies.** Accuracy varies by activity type with large and significant heterogeneity (I2 above 75 percent for many devices). Combining heart rate or heat sensing with accelerometry decreased error in most activity types; research-grade devices were better for total energy expenditure, commercial devices better for ambulatory and sedentary activity | A | SUMMARY (whiterose eprint record; the numeric bias table sits in the PDF and was not read) |
| S-CASE-2015 | Case MA, Burwick HA, Volpp KG, Patel MS. Accuracy of smartphone applications and wearable devices for tracking physical activity data | JAMA 2015;313(6):625-626 | Research letter. 56 treadmill walking trials across waist-worn devices, wrist-worn devices and smartphone apps. **Waist-worn devices ran between 0.3 percent below and 1.0 percent above observed step count**; wrist-worn devices were the worst performers in the set. The pocket, which is where BodyT's phone actually is, is close to the accurate position | B | SUMMARY |
| S-CADENCE-ADULTS | Tudor-Locke C, Ducharme SW, Aguiar EJ, et al. A catalog of validity indices for step counting wearable technologies during treadmill walking: the CADENCE-adults study | Int J Behav Nutr Phys Act 2022;19:117 | Device-and-speed-specific step-counting validity, and the cadence thresholds separating walking from running. **Already the cited provenance for BodyT's step bands** in `src/plan/cardio.ts` | A | SUMMARY (in-repo citation) |

### 1.7 Body mass, body composition, cycle phase, skin temperature

| ID | Source | Journal | Finding taken | Tier | Access |
|----|--------|---------|---------------|------|--------|
| S-SIEDLER-2022 | Siedler MR, Rodriguez C, Stratton MT, et al. Assessing the reliability and cross-sectional and longitudinal validity of fifteen bioelectrical impedance analysis devices | Br J Nutr 2022;130(5):827-840 | 73 adults against a laboratory four-compartment model, 37 returning at 12 to 16 weeks. **Test-retest precision error 0.0 to 0.49 percent**, so these scales are precise. **Cross-sectional constant error -3.5 to +11.7 percent body fat, standard error of estimate 3.1 to 7.5 percent, and only 5 of 15 devices were statistically equivalent within +/- 2 percent.** Longitudinally, constant error -0.4 to +1.3 percent, SEE 1.7 to 2.6 percent, 9 of 15 equivalent within +/- 1 percent. **The direction of change is far more trustworthy than the absolute number**, which is the whole design rule for scale data | A | FULL (PMC) |
| S-BODYMASS-CV | Day-to-day variability in euvolemic body mass (review) | Ren Fail 2023;45(2):2273421 | Day-to-day coefficient of variation of body mass in healthy adults sits around **0.66 to 0.71 percent**, which is roughly 0.5 to 0.6 kg for an 80 kg adult before anything has actually changed | C | SUMMARY (tandfonline returned HTTP 403 through this session's proxy; figure reproduced from the search capture and consistent across two secondary reports) |
| S-MCNULTY-2020 | McNulty KL, Elliott-Sale KJ, Dolan E, Swinton PA, Ansdell P, Goodall S, Thomas K, Hicks KM. The Effects of Menstrual Cycle Phase on Exercise Performance in Eumenorrheic Women: A Systematic Review and Meta-Analysis | Sports Med 2020;50(10):1813-1827 | **78 studies, 1,193 participants.** Performance in the early follicular phase versus all other phases: **trivial, ES0.5 = -0.06 (95% CrI -0.16 to 0.04)**. Largest network difference, early versus late follicular, ES0.5 = -0.14 (95% CrI -0.26 to -0.03). Evidence quality rated **low** (42 percent of studies low, 8 percent high). Authors: general guidelines across the cycle **cannot** be formed, a personalised approach is what is recommended | A | FULL (PMC) |
| S-SMARR-2020 | Smarr BL, Aschbacher K, Fisher SM, Chowdhary A, Dilchert S, Puldon K, Rao A, Hecht FM, Mason AE. Feasibility of continuous fever monitoring using wearable devices | Sci Rep 2020;10:21640 | TemPredict. Continuous ring-based temperature, read against each person's own history rather than an absolute threshold, identified fever onset in individuals **before** they reported symptoms, including in some who never reported others. Feasibility, not a validated illness classifier | B | SUMMARY |

### 1.8 Platform documentation (normative for section 5)

| ID | Source | Publisher | Finding taken | Tier | Access |
|----|--------|-----------|---------------|------|--------|
| P-HEALTHKIT | HealthKit framework reference; `HKHealthStore.authorizationStatus(for:)` | Apple | HealthKit is a **native Apple-platform framework with no web or JavaScript API**. There is no way for a page in Safari to read it. Further, for **read** access the API deliberately always reports `notDetermined`, because the set of permissions a user granted is itself sensitive: an app cannot distinguish "denied" from "granted but no data". Any BodyT integration must treat an empty result and a refusal as the same state | A | SUMMARY (developer.apple.com renders through client script and returned no text; the authorization behavior is consistent across Apple's own documentation page for `authorizationStatus(for:)` and Apple developer forum captures) |
| P-HEALTHCONNECT | Health Connect data types, permissions, and background reads | Android Developers | Full type list captured: Steps, Distance, ExerciseSession (40+ types), Active and Total Calories Burned, Floors Climbed, HeartRate (series), RestingHeartRate, **HeartRateVariabilityRmssd**, OxygenSaturation, BodyTemperature, **SkinTemperature (series, stored as deltas)**, SleepSession with light/deep/REM/awake stages, Weight, BodyFat, LeanBodyMass, MenstruationFlow and MenstruationPeriod, VO2Max. Permissions are **per data type** (`android.permission.health.READ_<TYPE>`), background reads need `READ_HEALTH_DATA_IN_BACKGROUND`, anything **older than 30 days** needs `READ_HEALTH_DATA_HISTORY`, and shipping any of it needs a **Play Console health apps declaration** | A | FULL |
| P-WEBBT | Web Bluetooth API; browser support table | MDN; caniuse.com | MDN: "**not Baseline because it does not work in some of the most widely-used browsers**", experimental, secure context only, not exposed to workers. caniuse: about 76 percent global support. **Safari has no support at any version, desktop or iOS. Firefox has no support at any version.** Chrome 56+, Edge 79+, Opera 43+, Chrome for Android supported | A | FULL |
| P-CAPHEALTH | `@capgo/capacitor-health`; `mley/capacitor-health` | npm / GitHub | Community Capacitor plugins bridging **HealthKit on iOS and Health Connect on Android** behind one JavaScript surface, with `checkAuthorization` and `readSamples`. Android 8.0+, iOS 14+. **Third-party and unaudited**, which is why section 10 requires a written adapter in `src/platform/` rather than screens calling a plugin directly | C | SUMMARY |
| P-DEVICEMOTION | `DeviceMotionEvent.requestPermission()`; the Generic Sensor API | MDN / WebKit | iOS 13+ requires an explicit permission call **originating in a user gesture** before `devicemotion` fires at all, and the grant is write-only: there is no query to read it back afterwards. The Generic Sensor API (`Accelerometer`, `Gyroscope`) is not available in Safari. **BodyT already lives with exactly this**, documented at `src/platform/motion.ts:23-33` and worked around at `src/platform/permissions.ts:32-40` | B | SUMMARY (behavior corroborated by the shipped repo workaround, which would not exist otherwise) |

### 1.9 Cross-pack dependencies

Ids beginning `S1` through `S28` belong to `research/R3-autoregulation.md`; ids beginning `RF-`, `FC-`, `TQ-` and `PARQ-2025` belong to `research/R6-safety.md`. R14 uses them exactly as those packs define them and never weakens a rule from either. Two are load-bearing here:

- **R3 S17** (acute sleep loss: overall performance -7.6 percent, with strength and power among the **least** affected, and morning sessions much less compromised than evening ones). R14 does not restate the sleep-loss evidence; it only asks whether a sensor should be the thing that detects it.
- **R3 section 7.4, overreaction guard 6**: "Ramp rules yes, ratio thresholds no." Every readiness score a wearable vendor ships is a ratio-style composite. R14 extends that guard to vendor scores in section 6.

### 1.10 Blocked or degraded in this environment

Recorded so a future session does not re-burn usage:

- `pubmed.ncbi.nlm.nih.gov` article pages render a cookie wall to WebFetch. Abstracts came through search captures or PMC mirrors.
- `jsams.org` and `sciencedirect.com` both returned HTTP 403 through this session's proxy, so S-DUKING-2021's numeric table was not read. Its direction of effect is reproduced consistently across three independent secondary captures and is marked SUMMARY.
- `link.springer.com` and `nature.com` issue a 303 to an identity provider; PMC mirrors worked where one existed.
- `www.mdpi.com` returned HTTP 403 for the narrative review on HRV in strength and conditioning, so that review is **not** cited here. The resistance-training claim rests on S-BITTENCOURT-2024, which was read in full.
- `developer.apple.com` renders documentation through client script and returns no text to WebFetch. P-HEALTHKIT is therefore SUMMARY, and section 5 flags every Apple row as needing confirmation from a machine with Xcode before anything is built.
- `tandfonline.com` returned HTTP 403; S-BODYMASS-CV is tier C for that reason and is used only to size a dead band, never to justify a decision.

---

## 2. PLATFORM REALITY: WHAT A PWA CAN AND CANNOT READ IN 2026

This section exists because the honest answer is unpopular and every wearables roadmap that skips it ships a feature that cannot be built. Section 5 is the matrix; this is the argument behind it.

### 2.1 The four hard walls

**Wall 1: Apple Health is not readable from Safari. At all. By anyone.**

HealthKit is a native framework for Apple platforms. There is no web API, no JavaScript bridge, no origin-trial, no entitlement a website can request (P-HEALTHKIT). This is not a permission BodyT has failed to ask for; the surface does not exist. Every plan of the form "let the user connect Apple Health" requires the Capacitor build, full stop.

There is exactly one thing a PWA can do with Apple Health data today, and it is worth knowing precisely because it is unglamorous: **the user can export their own archive from the Health app** and hand BodyT the resulting zip, which contains an `export.xml` of records plus workout routes as GPX. That is a file import, it is a manual one-shot, and it belongs in the same code path as a Strava or Garmin export rather than in anything called an integration. Section 6 treats it as an import, not a live signal.

**Wall 2: Web Bluetooth does not exist on iOS Safari, and never has.**

MDN describes the API as "not Baseline because it does not work in some of the most widely-used browsers." caniuse records **no support in Safari at any version, desktop or iOS, and no support in Firefox at any version** (P-WEBBT). Chrome, Edge and Opera on desktop support it, as does Chrome for Android.

This matters more than it looks. Web Bluetooth is the only route by which a web page could talk to a chest strap directly, so:

- An Android user on Chrome could, today, pair a Polar H10 over the standard Bluetooth Heart Rate Service and stream real beats into a session. That is genuinely achievable in the current PWA.
- An iPhone user cannot, and no amount of engineering changes that. Apple's own browser is the only browser engine on iOS.

A feature that works for Android Chrome users and silently does not exist for every iPhone user is not a feature, it is a support burden, unless the copy is honest about it. Section 5 marks it accordingly.

**Wall 3: the motion sensor is gesture-gated, write-only, and coarse.**

`DeviceMotionEvent.requestPermission()` on iOS 13+ must be called from inside a user gesture, and there is no way to query the result afterwards (P-DEVICEMOTION). BodyT already carries the scar tissue: `src/platform/permissions.ts:32-40` keeps a module-level `motionGranted` boolean with the comment "DeviceMotionEvent.requestPermission is write-only", and `src/screens/today/RunTrackerSheet.tsx:85-105` starts the counter without re-asking when the onboarding answer is already known, because the effect runs after paint and therefore outside the gesture window.

What the web gives is `devicemotion` at roughly 60 Hz of raw accelerometer magnitude. BodyT turns that into steps with a peak-and-refractory detector at `src/platform/motion.ts:60-97`. That is a real pedometer, and it is not the OS pedometer: CMPedometer on iOS and the Health Connect `StepsRecord` on Android run in dedicated low-power hardware, count while the screen is off and the app is closed, and are what the validity literature was measured on (S-FULLER-2020, S-CADENCE-ADULTS). The web version only counts while the tab is foregrounded and the screen is awake, which is why the tracker holds a screen wake lock at `src/screens/today/RunTrackerSheet.tsx:118-120`.

**Wall 4: there is no background anything.**

A PWA gets no background health reads, no background location beyond the life of a foregrounded page with a wake lock, and no scheduled sync it can rely on across browsers. Every passive signal in a PWA is therefore not passive: it is collected during a session the user opened, which means it stops being a *passive* signal and becomes a *session* signal. That distinction runs through the whole of this pack.

### 2.2 What the PWA genuinely has today, and already uses well

Worth stating so the roadmap does not accidentally rebuild it:

| Capability | Web API | Where BodyT uses it | Quality |
|---|---|---|---|
| Location, live, foreground | `navigator.geolocation.watchPosition` | `src/screens/today/RunTrackerSheet.tsx:112`, and behind an adapter at `src/platform/geo.ts:38-69` | Good. Filtered for accuracy above 50 m, teleports above 45 mph and sub-8 m jitter at `src/engine/runs.ts:23-69` |
| Barometric or GPS altitude | the `altitude` field on a `GeolocationCoordinates` | `src/engine/elevation.ts`, gated by `acceptsAltitude` | Usable but noisy, and the repo already stores altitude as an optional 4th slot per fix precisely because a junk vertical accuracy is stored as absent rather than as a lie (`src/activityTypes.ts:10-22`) |
| Step counting, foreground | `devicemotion` | `src/platform/motion.ts` | Conservative by design. The comment at `src/platform/motion.ts:10-12` is the right policy: better to undercount a treadmill mile than to award steps for a phone in a cup holder |
| Screen wake lock | `navigator.wakeLock` | `src/screens/today/RunTrackerSheet.tsx:118-120` | Works where supported; this is what makes foreground collection survive a long run |
| Notifications | `Notification` | `src/platform/notifications.ts` | Local only. No SMS, ever, per the standing constraint |

The honest summary: **BodyT's PWA already reads the only two passive signals a PWA can read, and it reads them carefully.** Location and footfalls. Everything else in this pack is a question about the Capacitor build.

### 2.3 What the Capacitor build unlocks, and what it does not

Capacitor swaps the adapters in `src/platform/`, which is exactly what that directory exists for (`src/structure.test.ts:195-199`: "Confining these to src/platform/ is what makes the Capacitor build a set of adapter swaps instead of a rewrite"). With it:

- **iOS** gets HealthKit, which means read access to whatever the user's watch or ring has already written into Health: sleep analysis, resting heart rate, HRV (as SDNN, not rMSSD, which matters in section 3), steps, workouts, body mass, and more.
- **Android** gets Health Connect, whose full type list is captured in P-HEALTHCONNECT and is genuinely broad: `HeartRateVariabilityRmssd`, `RestingHeartRate`, `SleepSession` with stages, `SkinTemperature`, `OxygenSaturation`, `MenstruationPeriod`, `Weight`, `BodyFat`, `VO2Max`.

Three things Capacitor does **not** fix, and they should be planned for now:

1. **iOS will not tell you whether a read was denied.** `authorizationStatus(for:)` always returns `notDetermined` for read types, by deliberate privacy design: the set of permissions a user granted is itself sensitive health information (P-HEALTHKIT). An empty query result and a refusal are the same observation. Any BodyT code that says "connect Health" and then shows a spinner waiting for confirmation is broken on arrival. The correct UI is a query, a timeout, and a sentence that admits it cannot tell the difference.
2. **Android gates history and background separately.** Reading anything older than 30 days needs `READ_HEALTH_DATA_HISTORY`; reading while the app is not open needs `READ_HEALTH_DATA_IN_BACKGROUND`; and shipping any of it needs a Play Console health apps declaration (P-HEALTHCONNECT). A backfill at onboarding and a nightly sync are **two separate permission conversations**, and the declaration is a review gate, not a checkbox.
3. **Neither platform gives you a device the app can trust.** HealthKit and Health Connect are both mailboxes: a record's source is whichever app wrote it, which may be a watch, a scale, a third-party sleep app, or the user typing a number in. Provenance is therefore mandatory in the schema, not optional. That is section 7.

### 2.4 The rule this section produces

> **PLATFORM-RULE-1.** No engine may take a hard dependency on a signal that the current build target cannot supply. Every passive signal enters through an adapter in `src/platform/` that is allowed to return `null`, and every consumer must already behave correctly when it does.

This is not a new pattern, it is the shipped one. `src/platform/geo.ts:38` returns `null` when the platform has no geolocation, with the comment "which is the caller's cue to not promise a distance it cannot deliver". `src/engine/intensity.ts:38-41` states the same policy for data: "Not enough evidence means NO answer, never a default one... Silence beats a confident wrong number." R14 asks for nothing more than that both of those rules keep applying when the data comes from a ring instead of a satellite.

---

## 3. THE SIGNAL TABLE

### 3.1 The four verdicts, and the bar each one has to clear

A signal's verdict is not about whether it is interesting. It is about what it is allowed to do inside a deterministic engine that suggests and never auto-applies.

| Verdict | Meaning | Bar it must clear |
|---|---|---|
| **ACCEPT** | May originate a proposal the athlete can accept or decline | (a) a validity study against a criterion measure showing error smaller than the effect the decision depends on, (b) a published rule for separating signal from noise in this specific measure, and (c) at least one trial where acting on it beat not acting on it |
| **CORROBORATE** | May only strengthen or weaken a signal the app already has from the athlete or from performance. Never fires alone | (a) validity study against a criterion, and (b) evidence it moves with training load. Does **not** need a trial, because it never originates a change |
| **DISPLAY** | May be shown to the athlete, with its provenance and its error, and may be stored. May not reach any engine | Only that the number is real and its uncertainty can be stated honestly |
| **REJECT** | Not read, not stored, not shown | Where the measure is invalid for this use, or where showing it would invite a medical inference BodyT must not make |

Two standing constraints bind every row. **Suggest only, never auto**: nothing in this section may produce an automatic change, and section 6 says why the two existing automatic paths in `src/engine/adapt.ts` stay closed to sensors. **Zero runtime LLM calls**: every rule below is arithmetic on stored numbers.

### 3.2 The table

| Signal | What it validly measures | Error bars | Decision it could change in THIS app | Minimum evidence bar | **Verdict** |
|---|---|---|---|---|---|
| **HRV (daily)** | Vagal modulation at the moment of measurement | Day-to-day CV **4 to 17 percent** for time-domain indices (S-ALHADDAD-2011). Apple stores **SDNN**, Health Connect stores **RMSSD**; they are different statistics from the same intervals and are not interchangeable (P-HEALTHKIT, P-HEALTHCONNECT). Apple's samples are taken opportunistically, often during a Breathe session, so two readings are not the same measurement | Nothing. A single day's value is inside its own noise band | Would need a 7-day rolling mean plus a per-person smallest-worthwhile-change band (S-PLEWS-2013) **and** a trial showing it beats the four-flag check for a lifter. The only resistance RCT found is null (S-BITTENCOURT-2024) | **REJECT as a daily input. DISPLAY only as a 7-day trend** |
| **HRV (7-day rolling mean)** | Chronic autonomic state, if measured the same way every day | The rolling mean is what the published method is built on. Still confounded: the same rise means "adapting well" (S-BELLENGER-2016) and a *collapsing* variability means overreaching (S-PLEWS-2013), so direction alone is ambiguous | At most: raise the confidence of an existing `accumulated-fatigue` signal in `src/engine/adapt.ts:204-216` | Met for validity, not met for action. No trial supports acting on it in resistance training | **CORROBORATE, and only for the accumulated-fatigue signal** |
| **Resting heart rate** | Cardiac autonomic state on waking | Cheap, stable, and the one the evidence is least kind to: HRV-guided training beat predefined training on vagal indices but **not on resting heart rate** (SMD+ 0.04, 95% CI -0.34 to 0.43, S-MANRESA-2021), and self-report tracks load better than resting HR does (S-SAW-2016) | Corroborating the shipped "wired or run-down" flag, which already carries a resting-HR intuition (`src/screens/today/ReadinessSheet.tsx:8`) | Validity is fine; the problem is that the thing it would corroborate is measured better by asking | **CORROBORATE only, and it may never outvote the athlete's own answer** |
| **Sleep duration** | Time asleep, well | Sleep-detection sensitivity **0.93 to 0.99**; total sleep time bias from **-0.3 to +46.8 minutes** by device (S-CHINOY-2021). A device biased +47 min will not see a 6-hour night as a 6-hour night | Pre-filling the "slept under 6 hours" flag, which is the best-supported item on the readiness check (R3 S17) | Validity clears for duration. Bias is device-specific and large enough to matter at exactly the 6-hour threshold BodyT uses | **CORROBORATE, with a device-specific band, and never auto-set the flag** |
| **Sleep stages (light / deep / REM)** | Very little, reliably | Epoch-by-epoch sensitivity: light **0.57 to 0.76**, deep **0.53 to 0.68**, REM **0.49 to 0.69** (S-CHINOY-2021). REM sensitivity of 0.49 is a coin flip. The same verdict holds at home over a week (S-CHINOY-2022). Both papers' own conclusion is to use these devices for sleep-wake and **not** for stages | Nothing. There is no BodyT decision that turns on deep sleep minutes, and there should not be | Would need stage agreement in the range the duration measure already achieves. Not close | **REJECT** |
| **Wake after sleep onset / sleep efficiency** | Fragmentation, poorly | Wake specificity **0.18 to 0.54** (S-CHINOY-2021): the devices are near-blind to wake. WASO bias runs to **-49.5 minutes** | Nothing | The measure is worse than the one it would add to | **REJECT** |
| **Steps (daily total, from the OS pedometer)** | Ambulatory volume | Accurate in laboratory settings for the major brands (S-FULLER-2020); waist and pocket positions run within about 1 percent (S-CASE-2015); wrist positions are the weakest. Slow walking and non-ambulatory sport are systematic undercounts | Feeding the existing unplanned-load reading: `readSignals` already counts logged sport minutes at `src/engine/adapt.ts:139-155` and `weekLoad` converts them at `src/engine/adapt.ts:526-531` | Met. This is the one signal whose validity is genuinely good and whose consumer already exists | **ACCEPT, as an input to `extra-load` only** |
| **Steps (within a tracked session)** | Cadence, and distance where a stride exists | Already shipped and already honest: the intensity engine refuses an answer below 200 steps or 5 minutes (`src/engine/intensity.ts:47-54`) and refuses a distance where none is physically covered (`src/engine/intensity.ts:108-115`) | Session intensity tier, distance, calories, and the personal band in `src/engine/calibration.ts` | Met, and shipped | **ACCEPT (already shipped, do not regress it)** |
| **Active calories / energy expenditure** | Almost nothing usable | **No device achieved energy expenditure error below 20 percent** (S-SHCHERBINA-2017); **"for energy expenditure, no brand was accurate"** across 158 publications (S-FULLER-2020); 60-study meta-analysis found accuracy varying by activity with I2 above 75 percent (S-ODRISCOLL-2020) | Nothing. BodyT computes its own MET-based estimate at `src/engine/runs.ts:104-148` and deliberately keeps perceived effort out of the calorie path (`src/engine/calibration.ts:40-49`) | A vendor number with 20 to 90 percent error must not be allowed to move a calorie target that feeds a meal plan | **REJECT for any engine use. DISPLAY only if the athlete asks, labelled with the source device** |
| **Workout heart rate (wrist PPG)** | Cardiac cost during steady effort, with an equity problem at intensity | At rest, about 2.8 bpm mean absolute error regardless of skin tone. During exercise, light skin holds at 3.5 to 4 bpm while **dark skin rises to 12.1 bpm at 40 to 60 percent HRR and 16.5 bpm above 60 percent** (S-HUNG-2025). Median error under 5 percent during cycling (S-SHCHERBINA-2017), worse walking. One study found no skin-tone difference (S-BENT-2020), which S-HUNG-2025 reconciles: the disparity appears only at intensity | In principle, an intensity tier for cardio. In practice, R8 section 7.4 already refuses HR zones from age, and this adds a second refusal | The error is 16.5 bpm for some athletes at the intensities BodyT would use it at, and a training zone is about 18 bpm wide. **The error is the width of the decision** | **REJECT for zone or tier decisions. DISPLAY only. Chest-strap ECG HR is a separate row and is not rejected** |
| **Workout heart rate (chest strap, ECG)** | Beat timing, accurately | The reference standard the wrist studies are validated against (S-HUNG-2025 uses a Polar H10 as truth) | Could give an honest intensity tier for indoor cardio and a real interval-adherence read | Met for validity. Not met for availability: **no iPhone user can pair one to a web page** (P-WEBBT), and pairing needs the Capacitor build or Android Chrome | **ACCEPT where present, but section 5 says it cannot ship as a universal feature** |
| **SpO2 (blood oxygen)** | Oxygen saturation, with a documented racial bias | Medical-grade oximetry misses occult hypoxemia in Black patients at **nearly three times** the rate: 17.0 percent versus 6.2 percent of readings in the 92 to 96 percent band (S-SJODING-2020). Consumer wrist SpO2 is not better than medical oximetry | Nothing legitimate. Any reading BodyT could act on would be a medical inference, which is outside scope (playbook non-negotiables; R6 scope boundary) | There is no training decision this changes, and the failure mode is that a Black athlete is told they are fine when they are not | **REJECT. Not read, not stored, not shown** |
| **Skin temperature** | Deviation from that person's own baseline | Vendors store it as a **delta**, not an absolute (P-HEALTHCONNECT). Continuous ring temperature detected fever onset before self-reported symptoms in the TemPredict cohort (S-SMARR-2020), which is a feasibility result, not a validated illness classifier | Conceivably: nudging the athlete to consider whether they are getting ill. But "sick" is already an excuse reason the athlete can pick (`src/store/schema.ts:143`) | A feasibility study is not an evidence bar. Telling somebody they may be ill is a health claim BodyT does not make | **REJECT for now. Revisit only if a validated illness-onset classifier appears with published sensitivity and specificity** |
| **Cycle phase** | Where in the cycle the athlete is, if they logged it | Performance across phases is **trivial: ES 0.5 = -0.06 (95% CrI -0.16 to 0.04)** across 78 studies and 1,193 participants, with evidence quality rated **low** and the authors explicitly stating that general guidelines cannot be formed (S-MCNULTY-2020) | Nothing automatic. The evidence says the population effect is not there | The best available meta-analysis says no general rule exists. Building one would be inventing a rule the literature refuses to write | **REJECT as a planning input.** If BodyT ever supports cycle tracking it is DISPLAY plus a per-person note the athlete writes, which is exactly the "personalised approach" S-MCNULTY-2020 recommends |
| **Body weight (connected scale)** | Body mass, precisely; body fat, not so much | Body mass day-to-day CV **0.66 to 0.71 percent**, about 0.5 to 0.6 kg at 80 kg, before anything real has changed (S-BODYMASS-CV). Bioimpedance body fat: test-retest precision **0.0 to 0.49 percent** but cross-sectional constant error **-3.5 to +11.7 percent** with only **5 of 15 devices** equivalent within +/- 2 percent. Longitudinally far better: constant error -0.4 to +1.3 percent, **9 of 15** equivalent within +/- 1 percent (S-SIEDLER-2022) | Auto-filling the weight field the athlete types today (`src/screens/progress/ProgressScreen.tsx:367`), and feeding the bodyweight term in `estKcal` (`src/engine/runs.ts:104`) | Met for **mass**. For **body fat percentage**, met only for the **direction of change**, never for the absolute number | **ACCEPT for body mass. Body fat: DISPLAY the trend, never the absolute, and never as a goal readout** |
| **Vendor readiness / recovery score (Whoop, Oura, Garmin Body Battery)** | A proprietary composite nobody outside the vendor can inspect | Unpublished, unvalidated, changes between firmware versions, and built on the sleep-stage and HRV measures rejected above | Nothing | It is a ratio-style composite of exactly the kind R3 overreaction guard 6 rules out ("Ramp rules yes, ratio thresholds no"), assembled from inputs this section has already rejected individually | **REJECT. This is the single most important rejection in the pack** |
| **VO2max estimate** | A regression on HR and pace, not a measurement | Derived, device-specific, and unfalsifiable without a lab | Nothing. R8 already refuses age-derived HR zones for the same reason | Not a measurement | **REJECT** |
| **Respiratory rate** | Breaths per minute during sleep | Available in Health Connect. No BodyT decision depends on it | Nothing | No consumer | **REJECT (no use case, not an accuracy objection)** |

### 3.3 Why the table is this harsh, in one paragraph

Two published facts do most of the work. First, **subjective and objective measures generally did not correlate, and the subjective ones tracked training load with superior sensitivity and consistency**, across 56 studies (S-SAW-2016). Second, **monitoring is only useful if it changes a decision, and simple measures beat elaborate ones** (S-BOURDON-2017). Put together, they say that for the decisions BodyT actually makes, the four-item check it already ships is not a placeholder waiting for sensors: it is the better instrument. Adding a wearable score on top does not add information, it adds a second opinion that is worse and louder. The one place sensors clearly win is counting things the athlete cannot count: steps, distance, elevation, and the fact that they played two hours of basketball on Thursday. That is exactly where BodyT already uses them.

### 3.4 What ACCEPT actually buys, listed so it is not oversold

Three rows survive with a real engine consumer:

1. **Daily steps** feed the `extra-load` signal. An athlete who walked 18,000 steps yesterday has banked systemic cost the plan did not prescribe, and `src/engine/adapt.ts:415-418` already knows what to do with banked cost: the sets come off, as a proposal.
2. **Body mass from a scale** removes a manual entry and improves the calorie term in `estKcal`.
3. **Session steps** are already in and already good.

Everything else in this pack is a display surface, a corroboration, or a refusal. That is a small result, and it is the correct one.

---

## 4. THE "ASKED A HUMAN FOR WHAT A SENSOR KNOWS" AUDIT

Every question BodyT currently puts to a person where a sensor could plausibly answer instead. Verdicts:

- **KEEP** the subjective question outright. The self-report is the better instrument and a sensor would degrade it.
- **KEEP + PREFILL** the sensor may fill the field in, visibly, with a source label, and the athlete's edit always wins.
- **KEEP + CORROBORATE** the sensor never touches the answer, but its agreement or disagreement is stored and used to raise or lower confidence.
- **REPLACE** the sensor should take the question over entirely.

### 4.1 The readiness check

`src/screens/today/ReadinessSheet.tsx:6-11` is the four-flag gut check before a CNS day. Two flags or more downgrades the session (`src/logic/sessionStart.ts:31`).

| `file:line` | The question | Sensor that could answer | Verdict | Why |
|---|---|---|---|---|
| `ReadinessSheet.tsx:7` | "Slept under 6 hours" / "The red line for CNS work." | Sleep duration from HealthKit or Health Connect | **KEEP + PREFILL** | Duration is the one sleep measure devices get right (sensitivity 0.93 to 0.99, S-CHINOY-2021), and this is the best-supported flag on the list (R3 S17). But total sleep time bias runs from -0.3 to +46.8 minutes by device (S-CHINOY-2021), and a +47 minute bias sits directly on top of the 6-hour threshold. So: pre-fill the toggle, show "your watch says 5 h 40 m", and let the tap be the athlete's. Never auto-set it |
| `ReadinessSheet.tsx:8` | "Wired or run-down" / **"Resting heart rate feels elevated."** | Resting HR, or HRV, from any wearable | **KEEP + CORROBORATE** | This is the single most on-the-nose case in the repo: the app is literally asking a human to guess a number a sensor measures. And the answer is still to keep asking. Self-report tracks training load with better sensitivity and consistency than resting HR (S-SAW-2016); HRV-guided training beat predefined training on vagal indices but **not** on resting heart rate (SMD+ 0.04, 95% CI -0.34 to 0.43, S-MANRESA-2021). R3 already grades this flag as the weakest of the four and proposes weighting it 0.5. **Recommended copy change independent of any sensor**: drop the sub-label's appeal to resting heart rate, which invites a guess at a physiological quantity, and describe the feeling instead |
| `ReadinessSheet.tsx:9` | "Legs sore or heavy" | Nothing. No consumer wearable measures soreness | **KEEP** | R3 already rates soreness the weakest predictor because its time course does not match the strength-loss time course. That is an argument about weighting, not about sensors. There is no sensor to have this argument with |
| `ReadinessSheet.tsx:10` | "Genuinely low energy" | Vendor readiness score | **KEEP, and explicitly refuse the vendor score** | Subjective wellness items of this kind are the ones that track load (S-SAW-2016). A Whoop or Oura recovery percentage is an unpublished composite of the sleep-stage and HRV measures section 3 rejected individually. Replacing the best instrument with the worst one because it arrives automatically is the failure mode this pack exists to prevent |
| `ReadinessSheet.tsx:71` | "How much do you have?" (full / lighter / minimum) | Nothing | **KEEP** | This is an intention, not an observation. No sensor has an opinion about how much an athlete has decided to give |

### 4.2 Sleep, asked a second time

| `file:line` | The question | Sensor | Verdict | Why |
|---|---|---|---|---|
| `src/screens/week/WeekScreen.tsx:289-296` | Toggle: "Bad sleep last night (under 6 h)" / "Two in a row cuts the next day's volume by a third automatically." | Sleep duration | **KEEP + PREFILL**, with one extra guard | This toggle writes `badSleepDates`, which is read by `twoConsecutiveBadNightsBefore` (`src/engine/adapt.ts:65-70`) and drives the **only automatic volume cut in the app** (`src/engine/resolveDay.ts:396-402`, applying `applyBadSleepCut` at `src/engine/transforms.ts:214-215`). An automatic third-off cut is the one place where a device's 47-minute bias could silently shrink somebody's training. **Rule: a pre-filled bad-sleep date is a proposal until the athlete confirms it, and an unconfirmed sensor-sourced date may never satisfy `twoConsecutiveBadNightsBefore`.** Section 7's `confirmed` field exists for exactly this |
| `src/plan/followups.ts:222-227` | Onboarding: "How much sleep do you usually get?" (under 6 / 6 to 7 / 8 or more) | Historical sleep duration, if a backfill permission was granted | **KEEP** | This is asked once, at onboarding, before any integration exists, and it asks about a **habit** rather than a night. Health Connect needs a separate `READ_HEALTH_DATA_HISTORY` permission to see anything older than 30 days (P-HEALTHCONNECT), so answering it from sensors costs an extra permission conversation during the first five minutes of the app. One tap beats that |

### 4.3 Effort and intensity

| `file:line` | The question | Sensor | Verdict | Why |
|---|---|---|---|---|
| `src/screens/today/IntensityAsk.tsx:21-24` | After a tracked cardio session: Easy / Solid / All out | Workout heart rate, or the step-rate tier the app already computes | **KEEP, permanently, and protect it** | This is the most valuable question in the app and the code already knows why. `src/activityTypes.ts:108-116` keeps `feltIntensity` strictly apart from the measured `intensity` because "the disagreement between them is what engine/calibration.ts learns from", and `src/engine/calibration.ts:263-270` states that the athlete's answer "is not a guess to be improved on, it is the ground truth everything else is trying to predict". Wrist HR would be the wrong replacement anyway: error reaches 16.5 bpm above 60 percent HRR for dark skin tones (S-HUNG-2025), which is the width of a training zone |
| `src/screens/today/EffortAsk.tsx:85` | Mid-exercise: "How many reps were left in the tank?" | Bar velocity, in principle | **KEEP** | Velocity-based training needs a device BodyT does not have and cannot get from a phone in a pocket. Nothing in a watch or a ring sees a rep |
| `src/screens/today/EffortAsk.tsx:61` | "How many did you get?" | Rep counting from motion or vision | **KEEP** | Playbook section 35 and section 53 both put vision-based rep counting behind the CORE COMPLETE gate, and section 53.3 sets a validated-or-abstain rule. Out of scope here |
| `src/screens/today/BreakScreen.tsx:180-197`, triggered at `src/screens/today/FocusView.tsx:259` | Halfway through a session: how is today sitting (light / right / heavy) | Vendor readiness score, HRV | **KEEP** | `feel === 'heavy'` three times in a week is what raises the `accumulated-fatigue` signal (`src/engine/adapt.ts:208-216`). It is asked once, mid-session, when the athlete has the best possible information: they are inside the session. A morning HRV reading has strictly less information than a person who has just done four sets |
| `src/screens/today/CantFinishSheet.tsx:31-35` | "What's stopping you?" (muscle fatigue / form / hurts / no energy) | Nothing | **KEEP** | Four answers that call for four different responses. No sensor distinguishes a fried muscle from a breaking pattern from pain |

### 4.4 Activity logging, where sensors genuinely win

| `file:line` | The question | Sensor | Verdict | Why |
|---|---|---|---|---|
| `src/screens/today/CardioSheet.tsx:315-320` | "Minutes" stepper on a logged-after-the-fact session | Workout duration from HealthKit or Health Connect `ExerciseSession` | **REPLACE, where a matching session exists** | A duration a device recorded live beats a number recalled at the end of the day. This is the clearest replace in the audit. Requires the dedup rule in section 6, because the app already has one double-count hazard: `saveRun` writes both a `RunLog` and a `CardioEntry` and the `runId` field at `src/activityTypes.ts:80-89` is what keeps them from being added twice |
| `src/screens/today/CardioSheet.tsx:309-314` | "Miles" stepper | GPS distance, or steps | **REPLACE, where a matching session exists** | Same argument. `distanceSource` at `src/activityTypes.ts:96-102` already records where a distance came from, so a third value `'health'` slots in without a new concept |
| `src/screens/today/CardioSheet.tsx:284-290` | "How'd it go down?" (activity mode, e.g. basketball games versus shooting) | The step-rate tier | **Already CORROBORATED, correctly** | `src/engine/intensity.ts:29-36` states the rule: a pedometer can miss work but cannot invent it, so the measured tier may raise a claimed mode and never lower it. This is the pattern every other sensor row in this pack should copy |
| `src/screens/today/CardioSheet.tsx:296-305` | "Indoor or outdoor?" | Whether GPS acquired a fix | **KEEP** | A treadmill in a basement and a treadmill by a window are different GPS stories and the same training. `src/platform/geo.ts:38` already returns `null` rather than guessing. One tap is cheaper than a wrong inference |
| `src/screens/today/CardioSheet.tsx:321-333` | "Floors" off a stair machine's console | Barometric floors from a watch | **KEEP + PREFILL** | The copy at line 330 says "Off the machine's display", which is a reading of a machine, not a guess. A watch's floor count is a reasonable pre-fill and the console number should win when both exist |

### 4.5 Body measurements

| `file:line` | The question | Sensor | Verdict | Why |
|---|---|---|---|---|
| `src/screens/progress/ProgressScreen.tsx:367` | Check-in: weight, in 0.5 lb steps | Connected scale, via HealthKit or Health Connect `Weight` | **KEEP + PREFILL** | Body mass is the one body-composition measure that clears the bar. But day-to-day CV is 0.66 to 0.71 percent (S-BODYMASS-CV), so a scale that syncs every morning turns one check-in number into a noisy daily series. **Rule: sync the mass, display the trend, and let the check-in take the most recent confirmed value.** Do not start showing daily weight deltas; that is a behaviour change dressed as a data source |
| `src/screens/progress/ProgressScreen.tsx:51` | Weight's caption: "Will barely move, that's the design." | n/a | **KEEP** | Correct copy, and it becomes more important with a scale attached, not less |
| Body fat percent, entered at check-in and estimated at `src/screens/progress/BodyFatEstimator.tsx` | Smart-scale bioimpedance | **KEEP + PREFILL the trend only** | Bioimpedance is precise (test-retest 0.0 to 0.49 percent) and inaccurate (cross-sectional constant error -3.5 to +11.7 percent, only 5 of 15 devices equivalent within +/- 2 percent), while longitudinally 9 of 15 land within +/- 1 percent (S-SIEDLER-2022). The owner's plan carries a "Body fat, target 10 percent" custom target (`src/store/schema.ts:428-429`). **A scale that reads 6 points high would declare that goal met.** Absolute bioimpedance body fat must never reach a goal readout |
| `src/screens/onboarding/MeStep.tsx:79-84` | Height, at onboarding | HealthKit `Height` | **KEEP** | Asked once, never changes, and feeds the stride model at `src/platform/motion.ts:40-44`. Not worth a permission prompt in the first minute of the app |

### 4.6 The one question the audit says to ADD

Nothing in BodyT currently asks the athlete to reconcile a sensor with themselves, because no sensor has ever disagreed with them. The moment a passive signal exists, that question has to exist too. R3 section 7.4 guard 4 is the reason: "Do not punish honesty. If every flagged day shrinks, athletes stop flagging." The mirror risk is worse: if a device flags a day the athlete feels fine on, and the app acts on the device, the athlete learns the app is arguing with them.

**Proposed, and it is one tap:** when a sensor reading contradicts what the athlete said, the app shows both and offers "that was travel, not training" as a one-tap correction. The correction is stored as evidence, per playbook 51.9. Section 6 specifies where it is stored and what it does.

### 4.7 Audit summary

| Verdict | Count | Which |
|---|---|---|
| **KEEP** (subjective wins outright) | 9 | all four readiness flags, session intensity choice, felt intensity, RIR, reps, session feel, the cannot-finish reason, indoor/outdoor, onboarding sleep habit, height |
| **KEEP + PREFILL** | 5 | bad-sleep flag (x2 surfaces), floors, weight, body fat trend |
| **KEEP + CORROBORATE** | 2 | "wired or run-down", activity mode (already shipped) |
| **REPLACE** | 2 | logged cardio minutes, logged cardio miles |

**Two replacements out of eighteen questions.** That number is the finding.

---

## 5. PLATFORM REALITY MATRIX

This is the section the owner uses to decide what to build. Read it with section 3: a row can be readable and still be REJECTED, and several are.

**Legend for readability.** **NO** = the surface does not exist on that target. **YES** = first-party API, documented. **PARTIAL** = obtainable but with a caveat named in the row. **IMPORT** = only via a file the user exports and hands over, never live.

**Latency** is time from the event to BodyT being able to read it, assuming the app is opened normally.

### 5.1 The matrix

| Signal | PWA today | Capacitor iOS (HealthKit) | Capacitor Android (Health Connect) | Latency | Permission prompt | Section 3 verdict |
|---|---|---|---|---|---|---|
| **GPS location / distance / pace** | **YES** `navigator.geolocation`, foreground only, screen must stay awake | YES, plus true background location | YES, plus true background location | live | Browser location prompt today; OS "while using the app" / "always" on native | ACCEPT (shipped) |
| **Altitude / elevation gain** | **PARTIAL** the `altitude` field on a GPS fix, often junk vertical accuracy | YES, barometric | YES, barometric | live | Rides on the location grant | ACCEPT (shipped, `src/engine/elevation.ts`) |
| **Steps, in-session** | **PARTIAL** `devicemotion` peak detector, foreground only, screen awake | YES, CMPedometer, background, hardware-counted | YES, `StepsRecord`, background | live | iOS 13+ needs `DeviceMotionEvent.requestPermission()` **from inside a user gesture**, unqueryable afterwards; native uses Motion & Fitness / Activity Recognition | ACCEPT (shipped) |
| **Steps, daily total (all day, app closed)** | **NO** | YES | YES | minutes to hours; the OS batches | Motion & Fitness (iOS) / `READ_STEPS` (Android) | ACCEPT, feeds `extra-load` |
| **Workout / exercise sessions recorded by other apps** | **IMPORT** only, from a user-exported archive | YES, `HKWorkout` | YES, `ExerciseSessionRecord`, 40+ types | minutes | Per-type read; on iOS you cannot tell denial from no-data | REPLACE for logged minutes and miles |
| **Sleep duration** | **NO** | YES, `HKCategoryTypeIdentifierSleepAnalysis` | YES, `SleepSessionRecord` | morning, after the device syncs | Per-type read | CORROBORATE, prefill only |
| **Sleep stages** | **NO** | YES (present in the data) | YES (present in the data) | morning | Per-type read | **REJECT** (readable and still rejected: REM sensitivity 0.49 to 0.69, S-CHINOY-2021) |
| **Resting heart rate** | **NO** | YES, `restingHeartRate` | YES, `RestingHeartRateRecord` | morning | Per-type read | CORROBORATE only |
| **HRV** | **NO** | **PARTIAL** `heartRateVariabilitySDNN` only, and Apple samples it opportunistically, often during a Breathe session, so consecutive values are not the same measurement | YES, `HeartRateVariabilityRmssdRecord` | irregular on iOS, per-record on Android | Per-type read | **REJECT daily. DISPLAY 7-day trend. CORROBORATE at most** |
| **Workout heart rate (wrist PPG)** | **NO** | YES | YES, `HeartRateRecord` series | live during a native workout session, otherwise post-hoc | Per-type read | **REJECT for tiers. DISPLAY only** |
| **Heart rate from a chest strap** | **PARTIAL** Web Bluetooth on Chrome for Android and desktop Chrome/Edge/Opera. **NO on Safari, desktop or iOS, at any version** (P-WEBBT) | YES, CoreBluetooth | YES, native BLE | live, beat by beat | Browser device-chooser today; OS Bluetooth permission on native | ACCEPT where present, cannot be universal |
| **Active calories / energy expenditure** | **NO** | YES | YES, `ActiveCaloriesBurnedRecord` | minutes | Per-type read | **REJECT** (no brand accurate, S-FULLER-2020) |
| **SpO2** | **NO** | YES, `oxygenSaturation` | YES, `OxygenSaturationRecord` | irregular | Per-type read | **REJECT outright, do not read** |
| **Skin temperature** | **NO** | YES, wrist temperature (Series 8+ / Ultra) | YES, `SkinTemperatureRecord`, stored as deltas | overnight | Per-type read | **REJECT for now** |
| **Cycle phase** | **NO** | YES, menstrual flow records | YES, `MenstruationFlowRecord`, `MenstruationPeriodRecord` | as logged | Per-type read, and this is the most sensitive category on both platforms | **REJECT as a planning input** |
| **Body mass (connected scale)** | **NO** | YES, `bodyMass` | YES, `WeightRecord` | minutes after the weigh-in | Per-type read | **ACCEPT** |
| **Body fat percent (bioimpedance)** | **NO** | YES, `bodyFatPercentage` | YES, `BodyFatRecord` | minutes | Per-type read | **DISPLAY the trend only, never the absolute** |
| **Vendor readiness / recovery score** | **NO** | **NO** (not a HealthKit type; it lives in the vendor's own app or cloud API) | **NO** (not a Health Connect type) | n/a | would require a per-vendor OAuth integration | **REJECT** |
| **Historical backfill beyond 30 days** | **IMPORT** only | YES, no separate permission | **PARTIAL**, needs `READ_HEALTH_DATA_HISTORY` as a distinct grant | one-time | A **second** permission conversation on Android | see section 6 |
| **Reading while the app is closed** | **NO** | PARTIAL, background delivery for observed types | **PARTIAL**, needs `READ_HEALTH_DATA_IN_BACKGROUND` | n/a | A **third** permission conversation on Android | see section 6 |

### 5.2 Three things this matrix makes obvious

**1. The PWA has already harvested everything it can.** Location, altitude and in-session steps are the complete set, and BodyT reads all three. There is no missed opportunity in the current build. Any roadmap item that reads a wearable is a Capacitor item, and should be scheduled as one.

**2. Chest-strap heart rate is the only genuinely new capability available in the PWA today, and it splits the user base by phone.** Web Bluetooth reaches Chrome for Android and desktop Chrome, Edge and Opera, and reaches **no iPhone at all** (P-WEBBT). Shipping it in the PWA means a feature that exists for some users and is invisible to others, with no honest way to explain why. **Recommendation: do not ship Web Bluetooth in the PWA.** Wait for Capacitor, where it works on both, and where the platform layer that would hold it (`src/platform/`) is being swapped anyway.

**3. Android is three permission conversations, not one.** Live read, history beyond 30 days, and background read are separate grants, plus a Play Console health apps declaration that is a review gate (P-HEALTHCONNECT). iOS is one prompt but returns less: for read types, `authorizationStatus(for:)` always says `notDetermined`, so **the app can never confirm a connection succeeded** (P-HEALTHKIT). Any "Connected" badge in the UI is a lie on iOS. The correct affordance is "last read a value at 07:12 this morning", which is a fact BodyT can actually establish.

### 5.3 The build-order consequence

| Stage | What ships | Requires |
|---|---|---|
| **0 (now, PWA)** | Nothing new. Protect what exists: the calibration loop, the `null`-returning adapters, the intensity floors | nothing |
| **1 (PWA)** | The **file import** path: Apple Health export zip, Health Connect export, Strava bulk export, FIT / TCX / GPX. This is playbook section 32's actual job and it needs no native build at all | a parser and the dedup rule in section 6 |
| **2 (Capacitor, first release)** | Daily steps into `extra-load`; workout duration and distance into logged cardio; body mass into check-ins | one adapter, `src/platform/health.ts`, plus the schema in section 7 |
| **3 (Capacitor, later)** | Sleep duration prefill on the two bad-sleep surfaces; resting HR as a corroborator | the `confirmed` flag from section 7 shipping first, or the automatic bad-sleep cut becomes device-driven |
| **never** | Sleep stages, SpO2, active calories, vendor readiness scores, HRV as a daily input, cycle-phase planning | see section 9 |

---

## 6. THE INTEGRATION FENCE

A third-party integration is a guest in the athlete's record. This section is the fence: what it may write, what it may never write, and what happens when it disagrees with the person.

### 6.1 The three-zone model

**ZONE 1, OBSERVATIONS. An integration may write here.**

Facts about the world that a device measured and a person did not claim.

- steps in a time window
- distance and duration of a recorded session
- elevation gained
- body mass, with the scale that reported it
- sleep duration for a night, with the device that reported it
- resting heart rate for a morning, with the device
- heart rate series during a session, with the sensor type (PPG or ECG)

Every one of these lands in a **new, separate collection** (`data.signals`, section 7). None of them is written into `data.sessions`, `data.weeks`, `data.measurements`, `data.runs` or `data.cardio`. That separation is the fence itself: the athlete's record and the sensor's record are different objects, and a reader can always tell which is which.

**ZONE 2, CLAIMS. An integration may never write here.**

Anything the athlete said, chose, or felt.

- `readiness.flags` (`src/sessionTypes.ts:79-82`)
- `feltIntensity` on a run or a cardio entry (`src/activityTypes.ts:60-61`, `108-116`)
- `feel` and `rir` on a logged exercise (`src/sessionTypes.ts:58`, `src/sessionTypes.ts:70`)
- `SessionFeel` for the day
- `FatigueNote.reason` (`src/sessionTypes.ts:105-115`)
- `badSleepDates` (`src/types.ts:317`)
- excuse reasons and claim text (`src/store/schema.ts:137-149`)
- anything in `data.prefs`: blocked movements, stated limitations

Zone 2 is what makes BodyT's calibration work. `src/engine/calibration.ts:22-27` states it plainly: the athlete's answer "is never overwritten and never argued with. What it IS used for is the gap between it and the step rate." Let a device write into Zone 2 and that gap disappears, and with it the only mechanism the app has for learning that a population average is wrong for this person.

**ZONE 3, DECISIONS. Nothing external may write here, ever.**

- the prescription: sets, reps, load
- `data.adapt` (`src/store/schema.ts:245`), the record of proposals the athlete accepted
- `data.dayLoad`, `data.swaps`, `data.journey`
- the plan, the booklet, the meal plan, calorie targets

A device may cause a **proposal**. It may never cause a change. That is the standing "suggest only, never auto" rule, and section 6.4 states the one place it interacts with an existing automatic path.

### 6.2 What may never be written at all

Independent of zone, these never enter the record:

| Never stored | Why |
|---|---|
| SpO2 | Documented racial bias in the underlying measurement (S-SJODING-2020), and no legitimate training decision depends on it. Storing it invites a medical inference BodyT does not make |
| Sleep stage minutes | REM sensitivity 0.49 to 0.69 (S-CHINOY-2021). Storing a number this wrong guarantees somebody eventually displays it |
| Vendor readiness / recovery scores | Unpublished, unvalidated composites of measures already rejected individually. R3 overreaction guard 6 applies: ramp rules yes, ratio thresholds no |
| Any diagnosis, risk score, or health flag | Outside scope, per the playbook non-negotiables and R6's scope boundary |
| Raw continuous streams (per-second HR, per-minute steps across a whole day) | The envelope is a local-first document that syncs. A day of per-second heart rate is larger than a year of BodyT's entire history. Store aggregates with a window, never the stream |

### 6.3 THE CONFLICT RULE: the athlete wins, and here is exactly how that is stored

When a sensor observation and an athlete claim disagree, **the claim stands unchanged and the disagreement is recorded as a third thing.**

The rule, stated so it can be tested:

> **FENCE-RULE-1.** A `PassiveReading` never mutates a claim. When a reading contradicts a claim, the engine writes a `SignalConflict` referencing both, leaves both untouched, and surfaces at most one sentence offering the athlete a correction. If the athlete corrects, the correction is written as a **new claim by the athlete**, with `correctedFrom` pointing at the old one. The reading is never promoted to a claim.

Worked example, the one that will actually happen:

1. The athlete does not toggle "bad sleep last night". Nothing is in `badSleepDates`.
2. Overnight, the watch reports 5 h 20 m.
3. The engine writes `PassiveReading { kind: 'sleep-duration', valueMin: 320, source: {...}, confirmed: false }`.
4. Because a reading below 6 h contradicts the absence of the flag, it also writes `SignalConflict { readingId, claimRef: {kind:'bad-sleep', date}, resolution: 'unresolved' }`.
5. The Week screen shows the toggle **unset**, with a line under it: "Your watch logged 5 h 20 m. Tap if that is right." One sentence, one tap, no badge, no nag.
6. If the athlete taps, `badSleepDates` gains the date **as an athlete claim**, and the conflict resolves to `'athlete-confirmed'`.
7. If the athlete does nothing, the conflict resolves to `'athlete-silent'` after 48 hours and the flag never sets. **Silence is not consent.**
8. If the athlete had already set the flag and the watch says 8 h 10 m, the flag **stays set**, and the conflict resolves to `'claim-stands'`. The watch was on the nightstand. That is not a case the app gets to adjudicate.

Three consequences worth naming:

- **`twoConsecutiveBadNightsBefore` (`src/engine/adapt.ts:65-70`) only ever sees confirmed dates.** It reads `badSleepDates`, and only athlete claims reach `badSleepDates`. The one automatic cut in the app therefore stays human-triggered even after sleep sync ships. This is deliberate and it is the most important line in the section.
- **Repeated `'claim-stands'` outcomes are evidence about the device, not about the athlete.** Five nights where the athlete says short and the watch says long means the watch is being taken off, or is biased (recall the +46.8 minute device in S-CHINOY-2021). The correct response is to lower that source's confidence and eventually stop offering the prefill, exactly as `src/engine/calibration.ts` moves a band rather than arguing with a person.
- **The conflict record is what playbook 51.9 asks for**: "Allow athletes to correct context ('that low score was travel, not training') and preserve the correction in the decision record."

### 6.4 Deduplication, because BodyT already has this bug class solved

The playbook's own warning (section 32): one workout arriving by Watch, then HealthKit, then Strava, must not count three times. BodyT has already fought this once and won, and the fix should be copied rather than reinvented.

The shipped precedent: `saveRun` writes a `RunLog` **and** a `CardioEntry`, and the `runId` field exists solely so anything adding them together knows they are one session (`src/activityTypes.ts:81-89`), with `src/engine/activityLog.ts` as the single reader that does the merge. `src/engine/adapt.ts:135-137` and `src/engine/calibration.ts:88-92` both route through it for exactly that reason, the latter noting that double counting "would let one hard morning move the band as far as two."

**The dedup rule for imported sessions (HOUSE HEURISTIC, sized from the existing GPS filters):**

Two sessions are the same session when all three hold:
1. start times within **5 minutes** of each other,
2. durations within **10 percent** or 3 minutes, whichever is larger,
3. compatible activity type (the ontology in `src/plan/cardio.ts` decides; an unmapped type never merges).

On a merge, keep the **richer** record and record both source ids. Precedence: a BodyT-tracked session with a GPS track beats an imported summary, an imported summary beats a manual entry, and **a manual entry beats nothing**. Never silently delete an athlete's manual entry; mark it merged and keep it visible.

A fourth rule that matters more than it looks: **never infer granularity the source did not have.** An import that gives a daily step total is a daily step total. It is not 24 hourly buckets, and it may not be reshaped into one so a chart looks nicer. This is the playbook's own instruction and the same discipline that made `src/activityTypes.ts:10-22` store altitude as absent rather than as a lie.

### 6.5 Provenance is mandatory, and it has to survive a round trip

Every `PassiveReading` carries: which platform it came from, which app or device wrote it into that platform, that platform's own record id, when it was read, and whether the athlete has confirmed it. Without the platform record id, a re-sync cannot tell an update from a duplicate. Without the writing app, BodyT cannot tell a chest strap from a wrist optical sensor, and section 3 rejects one and accepts the other.

Provenance also has to survive **export and re-import**. The envelope is versioned and migrated (`src/store/schema.ts:264-608`), backups round-trip, and a reading that loses its source on the way through becomes an unattributable number in the athlete's record. Section 7's shape is designed so provenance is a required field rather than an optional one.

### 6.6 Privacy, stated once

Health data read from HealthKit or Health Connect stays in the athlete's own envelope and syncs only where the athlete's existing data already syncs (`src/cloud/sync.ts`). It is never sent to a third party, never used for population learning without an explicit separate opt-in, and never leaves via SMS, which does not exist in this app and will not. Apple and Google both forbid using health data for advertising, and BodyT has no advertising. Deleting the integration deletes the readings; the athlete's own claims survive, because they were always a different object. That is the fence paying for itself.

---

## 7. TYPED SCHEMA PROPOSAL

Shapes only. Nothing here is implementation, and nothing ships until an engine adopts it.

### 7.1 Where it goes, following the patterns already in the repo

BodyT already splits its vocabulary: `src/activityTypes.ts`, `src/sessionTypes.ts`, `src/resolvedTypes.ts`, `src/prefsTypes.ts`, `src/journeyTypes.ts` and `src/foodTypes.ts` all hang off `src/types.ts`, and each has a matching zod file under `src/store/`. Passive signals get the same treatment, which means zero new architecture.

| New file | Mirrors | Holds |
|---|---|---|
| `src/signalTypes.ts` | `src/activityTypes.ts` | `PassiveReading`, `SignalSource`, `SignalConflict` |
| `src/store/signalSchema.ts` | `src/store/activitySchema.ts` | the zod parsers |
| `src/platform/health.ts` | `src/platform/geo.ts` | the adapter, returns `null` on any target that cannot supply |
| `src/engine/signals.ts` | `src/engine/activityLog.ts` | the pure reader: dedup, confidence, conflict detection |

| Existing file | Change |
|---|---|
| `src/types.ts` | re-export `signalTypes`, add `signals` to `AppData`. Costs about 6 lines, the same shape the `journey` and `prefs` keys took, and the `types.ts` oversize allowance in `src/structure.test.ts:70` moves with it |
| `src/store/schema.ts` | add `signals` to `appDataSchema` **with a `.default()`**, so an envelope written before the key existed still parses. **No `SCHEMA_VERSION` bump and no migration**, exactly as `adapt` and `journey` did at `src/store/schema.ts:245-252` |
| `src/engine/adapt.ts` | `readSignals` gains one more producer for `extra-load`. No new `SignalKind` |
| `src/screens/week/WeekScreen.tsx`, `src/screens/progress/ProgressScreen.tsx`, `src/screens/today/CardioSheet.tsx` | prefill affordances and the one-sentence conflict line |
| `src/structure.test.ts` | nothing. Layering holds: `platform` is rank 2, `engine` is rank 1, and `engine/signals.ts` imports **downward** only, from `store/` and `plan/`. The adapter is called from `logic/` or a screen, never from an engine |

### 7.2 The shapes

```ts
// src/signalTypes.ts
import type { ISODate } from './types'

// ============================================================
// What a device observed, kept apart from what the athlete said.
//
// The separation is the whole design. engine/calibration.ts
// already works because feltIntensity and the measured tier are
// two fields rather than one: "the disagreement between them is
// what engine/calibration.ts learns from" (activityTypes.ts).
// Merge a sensor into a claim and that disagreement is gone, and
// with it the only way the app can learn that a population
// average is wrong for this person.
//
// So: readings live here, claims stay where they are, and the
// two never overwrite each other. When they disagree the app
// says so once, in one sentence, and the athlete decides.
// ============================================================

/** Where a reading came from. Every field is required on purpose. */
export interface SignalSource {
  /** The mailbox it was read out of. */
  platform: 'healthkit' | 'health-connect' | 'file-import' | 'device-sensor'
  /**
   * The app or device that wrote it INTO that mailbox.
   *
   * HealthKit and Health Connect are both post boxes, not
   * instruments. A resting heart rate in Health could be from a
   * watch, a ring, a chest strap, or somebody typing. Section 3
   * of R14 accepts one of those and rejects another, so the app
   * has to be able to tell them apart.
   */
  writerId: string
  /** Human-facing, for the line that says where a number came from. */
  writerName: string
  /**
   * The mailbox's own id for this record. Without it a re-sync
   * cannot tell an update from a duplicate.
   */
  externalId: string
  /** When BodyT read it, not when it happened. */
  readAt: string
  /**
   * Optical wrist sensor, or an electrical one.
   *
   * Not cosmetic. Wrist PPG heart rate error reaches 16.5 bpm
   * above 60 percent HRR for darker skin tones (Hung 2025), which
   * is about the width of a training zone. A chest strap is the
   * reference those studies are measured against. One of these is
   * allowed near a decision and the other is not.
   */
  sensor?: 'ppg' | 'ecg' | 'accelerometer' | 'barometer' | 'impedance' | 'manual'
}

/**
 * The kinds worth storing.
 *
 * Deliberately short. Sleep STAGES, SpO2, active calories and
 * vendor readiness scores are absent, and their absence is the
 * point: a kind the app can represent is a kind somebody
 * eventually displays. R14 section 6.2 lists why each one is out.
 */
export type SignalKindPassive =
  | 'steps-day'
  | 'session-duration'
  | 'session-distance'
  | 'sleep-duration'
  | 'resting-hr'
  | 'hrv-rmssd'
  | 'body-mass'
  | 'body-fat-pct'

/**
 * How much this reading is allowed to matter.
 *
 * Three tiers rather than a 0..1 float, for the same reason
 * engine/intensity.ts has three intensity tiers: the decisions
 * downstream are discrete, and a float invites arithmetic that
 * implies a precision the input does not have.
 */
export type SignalConfidence =
  /** Good enough to originate a proposal. */
  | 'measured'
  /** Good enough to agree or disagree with something already known. */
  | 'corroborating'
  /** Shown, stored, and kept away from every engine. */
  | 'display-only'

export interface PassiveReading {
  id: string
  kind: SignalKindPassive
  /** The day it belongs to, in the athlete's local time. */
  date: ISODate
  /** ISO timestamps of the window it covers. A day total is a day. */
  from: string
  to: string
  /**
   * Units by kind, stated here because a units bug in a health
   * import is silent and permanent:
   *   steps-day          count
   *   session-duration   seconds
   *   session-distance   miles (the app's unit, converted at the
   *                      adapter so nothing downstream guesses)
   *   sleep-duration     minutes
   *   resting-hr         bpm
   *   hrv-rmssd          milliseconds, RMSSD only. HealthKit
   *                      stores SDNN, which is a different
   *                      statistic; the adapter must NOT convert
   *                      one into the other, it must decline.
   *   body-mass          pounds
   *   body-fat-pct       percent
   */
  value: number
  confidence: SignalConfidence
  source: SignalSource
  /**
   * Has a human agreed with this?
   *
   * The load-bearing field. An unconfirmed reading may fill a box
   * in, greyed, and may never satisfy a rule that changes
   * training. twoConsecutiveBadNightsBefore (engine/adapt.ts)
   * reads badSleepDates, and only athlete claims reach
   * badSleepDates, so the one automatic cut in the app stays
   * human-triggered no matter what any watch reports.
   */
  confirmed: boolean
  /** Set when dedup folded another record into this one. */
  mergedFrom?: string[]
}

/**
 * A disagreement, kept rather than resolved.
 *
 * Playbook 51.9: let athletes correct context and preserve the
 * correction in the decision record. This is that record. It also
 * turns out to be the most useful thing in the file: repeated
 * 'claim-stands' outcomes are evidence about the DEVICE, and the
 * right response is to stop offering that prefill, the same way
 * engine/calibration.ts moves a band instead of arguing with a
 * person.
 */
export interface SignalConflict {
  id: string
  readingId: string
  /** The claim it disagrees with, by where the claim lives. */
  claim: {
    kind: 'bad-sleep' | 'readiness-flag' | 'felt-intensity' | 'logged-minutes' | 'logged-miles' | 'body-mass'
    date: ISODate
    /** What the athlete said, frozen, so history survives an edit. */
    claimedValue?: number | string | boolean
  }
  resolution:
    /** Surfaced, still open. */
    | 'unresolved'
    /** The athlete looked and agreed. A new CLAIM was written. */
    | 'athlete-confirmed'
    /** The athlete looked and did not agree. Nothing moved. */
    | 'claim-stands'
    /** 48 h passed. Silence is not consent. */
    | 'athlete-silent'
  /** Free text the athlete typed, e.g. "that was travel". Never required. */
  note?: string
  at: string
}
```

### 7.3 The adapter

```ts
// src/platform/health.ts
import type { PassiveReading, SignalKindPassive } from '../signalTypes'

// ============================================================
// The health store, behind an adapter.
//
// Same contract as platform/geo.ts: null when the platform
// cannot supply, "which is the caller's cue to not promise a
// distance it cannot deliver".
//
// On the web there is nothing to supply. Apple Health has no web
// API of any kind, and Safari has never shipped Web Bluetooth.
// So this file returns null on every PWA build, today and for the
// foreseeable future, and the Capacitor build swaps it for one
// that talks to HealthKit and Health Connect. Every consumer is
// written against the null case FIRST, so the native build adds
// data to a working app rather than switching one on.
// ============================================================

export interface HealthReader {
  available: (kind: SignalKindPassive) => boolean
  /**
   * Readings in a window, or an empty array.
   *
   * Empty is not an error and is not "denied". On iOS those two
   * are the same observation: for READ types
   * authorizationStatus(for:) always reports notDetermined,
   * because which permissions a user granted is itself sensitive
   * health information. A screen that waits for confirmation of a
   * successful connection will wait forever. What the UI can
   * honestly say is "last read a value at 07:12", which is a fact
   * rather than a status.
   */
  read: (kind: SignalKindPassive, fromISO: string, toISO: string) => Promise<PassiveReading[]>
}

/** Null on any build that has no health store. That is every PWA build. */
export function healthReader(): HealthReader | null {
  return null
}
```

### 7.4 The store key

```ts
// src/types.ts, inside AppData
  /**
   * Readings from a device, and the disagreements they caused.
   *
   * Defaulted in the zod schema for the same reason `adapt` and
   * `journey` are: an envelope written before this key existed
   * parses cleanly and starts empty, so there is no migration and
   * no SCHEMA_VERSION bump. Nothing is lost either way, because a
   * reading is re-readable from the platform it came from and a
   * claim was never in here to begin with.
   */
  signals: { readings: PassiveReading[]; conflicts: SignalConflict[] }
```

```ts
// src/store/schema.ts, inside appDataSchema
  signals: z
    .object({ readings: z.array(passiveReadingSchema), conflicts: z.array(signalConflictSchema) })
    .default({ readings: [], conflicts: [] }),
```

### 7.5 Retention, because a health store is unbounded and the envelope is not

The envelope is a local document that syncs (`src/cloud/sync.ts`) and exports (`src/store/backup.ts`). A year of daily readings across eight kinds is a few thousand rows, which is fine. A year of raw heart rate series is not, which is why section 6.2 bans streams.

**Proposed (HOUSE HEURISTIC):** keep readings for **90 days**, keep conflicts for **365 days**. Ninety days covers the 14-day window `src/engine/adapt.ts:73` reads, the 12-week chart in `src/engine/runs.ts:233`, and the 4-sample calibration threshold in `src/engine/calibration.ts:53`, with margin. Conflicts outlive readings because the useful thing about them is the pattern, not the night. A reading older than 90 days that was folded into a claim is not lost, because the claim is the record and the claim does not expire.

---

## 8. EVAL FIXTURES

Twenty cases. Each names the input, the required behaviour, the failure it catches, and what it pins. Written to become table tests beside `src/engine/adapt.test.ts` and `src/engine/calibration.test.ts`. Copy is illustrative, carries no em dashes, and is not final.

**Seven of the twenty expect the engine to change nothing.** That ratio is deliberate. An adaptation engine fed a new data source will find reasons to act; the fixtures that matter most are the ones that pin the reasons not to.

---

**F1. A single low HRV morning.**
Input: `PassiveReading { kind:'hrv-rmssd', value: 41, confidence:'display-only' }` on a day where the 7-day mean is 52. No readiness flags set. Session scheduled.
Expect: **no change.** No proposal, no note, no downgrade, no badge. The reading is stored and may appear on a trend chart. `planAdjustments` returns exactly what it returned without it.
Catches: the single most likely wrong feature in this whole area, an app that reads one number and shrinks a session.
Pins: day-to-day CV of 4 to 17 percent for time-domain HRV indices (S-ALHADDAD-2011); a value 21 percent below a 7-day mean is inside its own measurement noise.

**F2. Seven consecutive low HRV mornings, and nothing else wrong.**
Input: 7-day rolling rMSSD mean has dropped below the athlete's own smallest-worthwhile-change band. Readiness flags clear. Session feel `right` on the last three sessions. No missed sessions.
Expect: **no change.** Optionally one line in the Record, factual, once: "Your HRV trend has been below its usual band for a week." No proposal attached to it.
Catches: promoting a corroborator to an originator because the trend looks convincing.
Pins: HRV-guided training is null on performance and VO2peak (S-DUKING-2021), non-significant on aerobic capacity (S-MANRESA-2021), and null in the only resistance RCT found (S-BITTENCOURT-2024). Also S-BELLENGER-2016: a moving vagal index means "adapting" as often as "fatigued".

**F3. Low HRV trend PLUS three heavy sessions.**
Input: as F2, and `feel === 'heavy'` on 3 of the last week's sessions, which already raises `accumulated-fatigue` at `src/engine/adapt.ts:208-216`.
Expect: the existing `reduce-volume` proposal fires as it already does, `automatic: false`. The HRV trend may be **named in the `because` string** and may raise stored confidence. It must not change the size of the cut, add a second cut, or make the proposal automatic.
Catches: a corroborator quietly becoming a multiplier.
Pins: FENCE-RULE-1; the "never stack" guard (R3 section 7.4 guard 2); `alreadyCutForSleep` at `src/engine/adapt.ts:251-260`, which exists because two reductions for one cause is the known failure.

**F4. Watch says 5 h 20 m. The athlete did not flag it.**
Input: `PassiveReading { kind:'sleep-duration', value: 320, confirmed: false }`. `badSleepDates` does not contain the date.
Expect: a `SignalConflict` with `resolution: 'unresolved'`. The Week toggle renders **unset** with one line under it: "Your watch logged 5 h 20 m. Tap if that is right." `twoConsecutiveBadNightsBefore` returns **false**. `readSignals` produces **no** `poor-sleep` signal.
Catches: a device silently arming the only automatic volume cut in the app.
Pins: total sleep time bias runs from -0.3 to +46.8 minutes by device (S-CHINOY-2021), and the threshold in question is a hard 6-hour line.

**F5. Same as F4, and the athlete taps.**
Input: as F4, then the athlete confirms.
Expect: the date enters `badSleepDates` **as an athlete claim**. The conflict resolves to `'athlete-confirmed'`. From that instant everything downstream behaves exactly as if the athlete had toggled it themselves, including the automatic cut if a second consecutive night follows.
Catches: a two-class system where a confirmed sensor value is treated as second-rate.
Pins: section 6.3 step 6. A confirmed reading becomes a claim and is then indistinguishable from any other claim.

**F6. Watch says 8 h 10 m. The athlete flagged bad sleep anyway.**
Input: `badSleepDates` contains the date, athlete-set. Reading reports 490 minutes.
Expect: **no change.** The flag stays. Conflict resolves `'claim-stands'`. Nothing is shown to the athlete, not even a gentle "your watch disagrees".
Catches: an app that argues with a person about their own night. The watch was on the nightstand, or they lay awake, or the tracker counted stillness as sleep (wake specificity 0.18 to 0.54, S-CHINOY-2021).
Pins: FENCE-RULE-1; playbook 51.9 (do not incentivise dishonest reporting).

**F7. The device is wrong five times running.**
Input: five `'claim-stands'` conflicts in 14 days for `kind:'sleep-duration'` from the same `source.writerId`.
Expect: that source's sleep prefill is **withdrawn**. The toggle goes back to plain. One sentence, once: "I have stopped filling this in from your watch, it has not matched what you tell me." Readings keep being stored.
Catches: a broken or badly worn device nagging forever.
Pins: the calibration pattern at `src/engine/calibration.ts:113-131`, which measures the gap between measured and reported and moves the band rather than arguing.

**F8. 18,400 steps yesterday, no session logged.**
Input: `PassiveReading { kind:'steps-day', value: 18400, confidence:'measured' }` for yesterday. No cardio entry, no run, no session.
Expect: an `extra-load` signal from `readSignals`, and the existing `reduce-volume` **proposal** (`automatic: false`) with a `because` naming the steps. No automatic change. The `hold-load` question, being a separate decision, follows its existing rule.
Catches: the plan prescribing a heavy lower day onto legs that walked nine miles, which is the exact scenario `src/engine/adapt.ts:133-138` was written for and currently cannot see.
Pins: step counting is accurate for major brands in validation (S-FULLER-2020); waist and pocket positions within about 1 percent (S-CASE-2015). This is the strongest ACCEPT in section 3.

**F9. 18,400 steps, and the athlete already logged a two-hour hike.**
Input: as F8, plus a `CardioEntry` for a 120-minute hike on the same date.
Expect: **one** `extra-load` signal, not two. The step total is recognised as the same day's work and does not add a second load claim.
Catches: the double-count bug class the repo already solved once for GPS runs.
Pins: `runId` and the single-reader rule (`src/activityTypes.ts:81-89`, `src/engine/activityLog.ts`); the note at `src/engine/calibration.ts:88-92` that counting twice lets one hard morning move a band as far as two.

**F10. The same run arrives three times.**
Input: a BodyT-tracked `RunLog` (07:02, 46 min, GPS track), a HealthKit workout (07:03, 45 min), and a Strava file import (07:02, 46 min), all `activity: 'run'`.
Expect: one session. Start times within 5 minutes, durations within 10 percent, compatible type, so all three merge. The **BodyT record with the GPS track wins**; `mergedFrom` carries the other two external ids; weekly mileage counts it once.
Catches: playbook section 32's named hazard, one workout counted three times.
Pins: the dedup rule in section 6.4.

**F11. An imported daily step total, and a chart that wants hours.**
Input: a file import supplying one `steps-day` value of 11,200 with no intraday detail.
Expect: stored as one reading covering the whole day. **No hourly buckets are synthesised**, and any UI wanting an intraday shape renders nothing rather than a smooth invented curve.
Catches: inventing granularity the source did not have, which the playbook forbids by name.
Pins: the same discipline as `src/activityTypes.ts:10-22`, where a fix with junk vertical accuracy is stored **without** an altitude rather than with a lie.

**F12. Whoop recovery score of 31 percent.**
Input: a vendor readiness or recovery score, by any route.
Expect: **not read, not stored, not shown.** No `SignalKindPassive` can represent it, so an implementation cannot accidentally accept one.
Catches: the highest-risk integration in the category, and the one a user is most likely to ask for.
Pins: it is an unpublished composite of sleep staging (REM sensitivity 0.49 to 0.69, S-CHINOY-2021) and HRV (CV 4 to 17 percent, S-ALHADDAD-2011); it is the ratio-style composite R3 overreaction guard 6 rules out; and the four-item self-report it would displace measures load better anyway (S-SAW-2016).

**F13. Wrist heart rate says the intervals were easy.**
Input: a tracked cardio session, wrist PPG heart rate averaging 62 percent HRR, athlete answered `feltIntensity: 'high'`.
Expect: **no change to `feltIntensity`, ever.** `perceivedIntensity` returns `'high'` because the athlete answered (`src/engine/calibration.ts:263-270`). Wrist HR does not enter `classifyIntensity`, does not enter the personal band, and does not touch `cardioKcal`.
Catches: overwriting the ground truth the calibration engine is built to predict.
Pins: wrist PPG error reaches 16.5 bpm above 60 percent HRR for darker skin tones and holds at 3.5 to 4 bpm for lighter ones (S-HUNG-2025), so the error is the width of the decision, and it is not evenly distributed across athletes.

**F14. Chest strap on an Android phone, then the same athlete on an iPhone.**
Input: the athlete pairs an ECG chest strap on Chrome for Android, records a session, then opens the same account on iPhone Safari.
Expect: on Android the strap data is accepted (`sensor: 'ecg'`, `confidence: 'measured'`). On iPhone the feature is **absent, not broken**: no greyed control, no "unsupported browser" toast, no error. Previously recorded strap sessions still display, with their source.
Catches: shipping a capability that silently exists for half the user base.
Pins: Web Bluetooth has no Safari support at any version, desktop or iOS (P-WEBBT); PLATFORM-RULE-1.

**F15. Health integration connected on iOS, and no data arrives.**
Input: the athlete taps connect on the Capacitor iOS build. Every read returns an empty array.
Expect: the UI **never** shows "Connected" or "Failed". It shows what is true: "No values read yet." A retry is offered. No error is logged as a failure.
Catches: a status indicator that cannot exist, built on an API that deliberately cannot answer the question.
Pins: for read types `authorizationStatus(for:)` always reports `notDetermined`, because the permission set is itself sensitive health information (P-HEALTHKIT). Denial and no-data are the same observation.

**F16. Android backfill without the history permission.**
Input: onboarding on the Capacitor Android build. `READ_STEPS` granted, `READ_HEALTH_DATA_HISTORY` not requested.
Expect: 30 days of steps read successfully. The absence of older data is **not** presented as an error, and the app does not silently conclude the athlete was sedentary before then. If a longer history is genuinely wanted, that is a **second, separate, explained** permission ask, offered later and never during onboarding.
Catches: reading an empty history as a fact about the person.
Pins: `READ_HEALTH_DATA_HISTORY` gates anything older than 30 days, and background reads are a third grant (P-HEALTHCONNECT).

**F17. Smart scale reports 4.1 lb overnight.**
Input: `body-mass` readings on consecutive days, 182.0 then 186.1.
Expect: **no change** to any goal, target, calorie number or trend verdict. The check-in shows the most recent value; the trend line smooths. No insight fires. No "you gained four pounds" copy exists anywhere.
Catches: turning normal fluid variation into a coaching event.
Pins: day-to-day body mass CV of 0.66 to 0.71 percent (S-BODYMASS-CV) covers roughly 1.2 lb at this weight, and salt, glycogen and hydration cover the rest. The Progress caption already says "Will barely move, that's the design" (`src/screens/progress/ProgressScreen.tsx:51`).

**F18. Smart scale reports 9.2 percent body fat against a target of 10.**
Input: `body-fat-pct` reading of 9.2 from a foot-to-foot impedance scale. The plan carries a "Body fat, target 10 percent" custom target (`src/store/schema.ts:428-429`).
Expect: the target is **not** marked achieved. No milestone, no trophy, no celebration. The scale's number may show as a trend point labelled with its source and never as a goal readout.
Catches: a goal declared met by a device whose cross-sectional constant error runs to 11.7 percentage points.
Pins: S-SIEDLER-2022. Only 5 of 15 devices were equivalent within +/- 2 percent cross-sectionally, while 9 of 15 were within +/- 1 percent **longitudinally**. The direction is usable; the absolute is not.

**F19. Cycle phase available, athlete asks for a plan around it.**
Input: `MenstruationPeriodRecord` data is readable and the athlete asks whether training should change by phase.
Expect: **no automatic planning change.** BodyT does not generate a phase-based periodisation. Copy, once, honest: the research does not support a general rule, and what does work is noticing your own pattern. Offer the existing per-day tools the athlete already has: the readiness check, the intensity choice, and the tier drop.
Catches: shipping a phase-based plan because a competitor has one.
Pins: trivial pooled effect ES0.5 = -0.06 (95% CrI -0.16 to 0.04) across 78 studies, evidence quality **low**, and the authors' own conclusion that general guidelines cannot be formed and a personalised approach is what is recommended (S-MCNULTY-2020).

**F20. Everything is connected and the week was normal.**
Input: sleep 7 h 40 m, resting HR at baseline, HRV trend flat, 9,100 steps, one logged session graded `right`, no missed sessions, no pain notes.
Expect: **no change, and no output at all.** No proposals, no notes, no insight, no "all systems green" badge, no readiness score. Today looks exactly like the programme said it would.
Catches: the failure mode of every dashboard product, which is that a screen full of sensors has to say something every day.
Pins: S-BOURDON-2017, monitoring is only useful if it changes a decision; playbook 51.8, every metric must map to a decision, an investigation, or an explicit no action; and `src/engine/adapt.ts:50-54`, which already promises the engine never invents work.

---

### 8.1 Coverage check

| Property under test | Fixtures |
|---|---|
| A single reading never moves anything | F1, F17 |
| A trend never originates a change | F2, F3 |
| Sensors never write claims | F4, F6, F13 |
| Confirmation promotes a reading to a claim, once | F5 |
| The automatic bad-sleep cut stays human-triggered | F4, F5 |
| Repeated disagreement discredits the device, not the athlete | F7 |
| The one real ACCEPT works | F8 |
| Nothing is counted twice | F9, F10 |
| No invented granularity | F11 |
| Rejected signals are unrepresentable, not just unused | F12, F19 |
| Platform gaps degrade to absence, never to errors | F14, F15, F16 |
| Absolute versus trend, for body composition | F17, F18 |
| Silence is a valid output | F20 |

---

## 9. WHAT THIS PACK REJECTS, RESTATED FOR THE OWNER

One page, no hedging. If a future session wants to reverse one of these, it needs the named evidence, not an argument.

| Rejected | Verdict | The one number that decides it | Source |
|---|---|---|---|
| **Vendor readiness / recovery scores** (Whoop recovery, Oura readiness, Garmin Body Battery) | Never read, never stored, never shown | Unpublished composite of two measures rejected below, and the four-item questionnaire it would replace tracks load better across 56 studies | S-SAW-2016, and R3 guard 6 |
| **Daily HRV as an input** | Never an input. 7-day trend may display | Day-to-day CV **4 to 17 percent** for the time-domain indices, which is larger than any change worth acting on | S-ALHADDAD-2011, S-PLEWS-2013 |
| **HRV-guided prescription for lifting** | Not built | The only resistance-training RCT found is **null on every outcome**, and the HRV group trained 27 sessions to the control's 21 for no extra gain | S-BITTENCOURT-2024 |
| **Sleep stages** (deep, REM, light) | Never read, never stored | REM epoch sensitivity **0.49 to 0.69**. Both the lab and the at-home studies conclude these devices are for sleep-wake, not stages | S-CHINOY-2021, S-CHINOY-2022 |
| **Sleep efficiency / wake after sleep onset** | Never read | Wake **specificity 0.18 to 0.54**. The devices are close to blind to being awake in bed | S-CHINOY-2021 |
| **Active calories from any wearable** | Never reaches an engine. Display only, source-labelled | **No device below 20 percent error**; across 158 publications, **"no brand was accurate"** | S-SHCHERBINA-2017, S-FULLER-2020, S-ODRISCOLL-2020 |
| **Wrist heart rate for intensity tiers or zones** | Display only | Error reaches **16.5 bpm above 60 percent HRR for darker skin tones** while staying at 3.5 to 4 bpm for lighter ones. A training zone is about 18 bpm wide, so the error is the width of the decision, and it lands unevenly across athletes | S-HUNG-2025 |
| **SpO2** | Never read, never stored, never shown | Occult hypoxemia missed at **nearly three times the rate** in Black patients, **17.0 versus 6.2 percent**, in medical-grade oximetry | S-SJODING-2020 |
| **Skin temperature as an illness signal** | Not built | The supporting work is a **feasibility** study, not a validated classifier with published sensitivity and specificity | S-SMARR-2020 |
| **Cycle-phase periodisation** | Not built | Pooled effect **trivial, ES 0.5 = -0.06 (95% CrI -0.16 to 0.04)**, evidence quality **low**, authors state general guidelines cannot be formed | S-MCNULTY-2020 |
| **Absolute body fat percent from a smart scale** | Trend only, never a goal readout | Cross-sectional constant error **-3.5 to +11.7 percentage points**; only **5 of 15 devices** equivalent within +/- 2 percent | S-SIEDLER-2022 |
| **Web Bluetooth in the PWA** | Not shipped in the PWA | **No Safari support at any version, desktop or iOS.** A feature no iPhone user can see is a support burden, not a feature | P-WEBBT |
| **"Connect Apple Health" in the PWA** | Impossible, not deferred | There is no web or JavaScript HealthKit API and there never has been. The only PWA path is a user-exported file | P-HEALTHKIT |

**Accepted, for contrast, and it is a short list:** daily step totals feeding `extra-load`; workout duration and distance replacing recalled numbers on a logged cardio entry; body **mass** from a connected scale; in-session steps, which already ship. Chest-strap ECG heart rate is accepted on validity and blocked on availability.

---

## 10. INTEGRATION NOTES

### 10.1 Constants and rules this pack introduces

| Id | Rule | Status | Owner |
|---|---|---|---|
| PLATFORM-RULE-1 | No engine takes a hard dependency on a signal the build target cannot supply. Adapters may return `null` and consumers must already handle it | HOUSE HEURISTIC, and already the shipped pattern at `src/platform/geo.ts:38` | `src/platform/` |
| FENCE-RULE-1 | A reading never mutates a claim. Disagreement writes a `SignalConflict`; confirmation writes a new claim by the athlete | HOUSE HEURISTIC, sourced from playbook 51.9 and the calibration precedent | `src/engine/signals.ts` |
| DEDUP-5-10 | Same session when start times are within 5 minutes, durations within 10 percent or 3 minutes, and types are compatible | HOUSE HEURISTIC, sized from the existing GPS filters at `src/engine/runs.ts:23-69` | `src/engine/signals.ts` |
| RETAIN-90-365 | Readings kept 90 days, conflicts kept 365 | HOUSE HEURISTIC, sized from the 14-day window at `src/engine/adapt.ts:73` and the 12-week chart at `src/engine/runs.ts:233` | `src/store/schema.ts` |
| SILENCE-48H | An unconfirmed reading resolves to `'athlete-silent'` after 48 hours and never sets a flag | HOUSE HEURISTIC | `src/engine/signals.ts` |
| CONFIDENCE-3 | Three confidence tiers, not a float | HOUSE HEURISTIC, mirrors the three intensity tiers in `src/engine/intensity.ts:44` | `src/signalTypes.ts` |

### 10.2 Which engines consume what

| Consumer | Reads | Must still work when it is empty |
|---|---|---|
| `src/engine/adapt.ts` `readSignals` | `steps-day` for `extra-load` | yes, and it does today |
| `src/engine/signals.ts` (new) | everything, for dedup, confidence and conflict detection | it is the only reader that walks `data.signals` |
| `src/screens/week/WeekScreen.tsx` | `sleep-duration`, unconfirmed, as a prefill line | yes |
| `src/screens/progress/ProgressScreen.tsx` | `body-mass`, `body-fat-pct` trend | yes |
| `src/screens/today/CardioSheet.tsx` | `session-duration`, `session-distance` as prefills | yes |
| `src/engine/calibration.ts` | **nothing.** Deliberately untouched | n/a |
| `src/engine/resolveDay.ts` | **nothing.** The automatic paths stay closed to sensors | n/a |

The last two rows are the ones to defend in review. `calibration.ts` works because `feltIntensity` is the ground truth and the measured tier is the prediction; feeding a sensor into the ground-truth side destroys the mechanism. `resolveDay.ts` holds the app's only automatic reductions, and section 6.3 keeps them human-triggered.

### 10.3 Build order

1. **File import first.** Playbook section 32's real deliverable is a canonical historical record with source, source record id and confidence, plus source-aware dedup. All of that is testable in the PWA with zero platform work, and every later integration lands on top of it. Nothing in stage 1 needs Capacitor.
2. **`src/signalTypes.ts` and `src/store/signalSchema.ts`**, with the defaulted store key so there is no `SCHEMA_VERSION` bump and no migration.
3. **`src/engine/signals.ts`**, pure, with the dedup and conflict rules and the fixtures from section 8 as its test file. This can be built and fully tested before any device exists.
4. **`src/platform/health.ts` returning `null`**, plus every consumer written against the null case. Ship this in the PWA. Nothing changes for users, and the native build then adds data to a working app rather than switching one on.
5. **Capacitor adapter**: steps, workout duration and distance, body mass. Three kinds, one permission conversation on iOS, one on Android.
6. **Sleep duration prefill**, only after `confirmed` and `SignalConflict` are shipped and tested.
7. **Everything else**: see section 9.

### 10.4 Guardrails for whoever builds this

- The ship ritual is unchanged: `npx tsc -b`, `npx vitest run`, `npm run build`, Playwright, push, confirm live by bundle hash, screenshots at 390px.
- `src/structure.test.ts` allowances shrink only. `src/types.ts` gains about 6 lines for the re-export and the key; its allowance moves with it, and the new files are all well under the 600-line cap.
- Layering holds without exception: `engine/signals.ts` is rank 1 and imports only from `plan/` and `store/`. It must never import `platform/`, which is rank 2. The adapter is called from `logic/` or a screen and the result is handed down.
- No em dashes in any copy string, including the conflict sentences in section 6.3.
- Zero runtime LLM calls. Every rule in this pack is arithmetic on stored numbers.
- Suggest only, never auto. The two automatic paths that exist (`src/engine/resolveDay.ts:396-402` and the equipment and joint reroutes in `src/engine/adapt.ts:290-345`) do not gain a third, and no sensor reaches either.

### 10.5 Open items this pack could not close

1. **P-HEALTHKIT is SUMMARY, not FULL.** `developer.apple.com` renders through client script and returned no text through this proxy. Every Apple row in section 5 should be confirmed on a machine with Xcode before code is written. The two claims most worth re-verifying: that read authorization always reports `notDetermined`, and that HealthKit exposes SDNN rather than RMSSD.
2. **S-DUKING-2021's numeric table was not read** (HTTP 403 from both jsams.org and sciencedirect.com). Its direction of effect is consistent across three secondary captures, but the effect sizes in section 1 are stated qualitatively for that row only.
3. **No source captured here validates the 5-minute and 10-percent dedup window.** DEDUP-5-10 is a house heuristic sized from BodyT's own GPS filters. It should be tuned against real duplicate data once an import path exists.
4. **The 48-hour silence window is unsourced.** It is a product judgement about how long a prefill may sit unanswered before it stops meaning anything.
5. **Nothing here covers trainer-supplied or clinician-supplied data**, which playbook 50.22 and 51.10 treat as a separate authority question. A restriction from a physiotherapist is not a passive signal and must not enter through this door.
6. **Population learning is out of scope.** Section 6.6 forbids passive readings leaving the athlete's envelope without a separate explicit opt-in. If the playbook's section 52 learning layer ever wants them, that is its own consent conversation and its own pack.

---

*End of R14. Written 2026-08-18 against the worktree at `wt-fix2`. No production code was changed by this pack.*
