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
