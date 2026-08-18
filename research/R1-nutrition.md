# R1 NUTRITION EVIDENCE PACK (feeds J7: adaptive nutrition engine)

Job: R1. Date: 2026-08-18. Scope: evidence + rules for real BMR models, activity from logged
behavior, weight-change bands, macro rules, carb cycling, fibre floor, self-explaining numbers,
guardrails, eval cases, integration notes. NO production code here. Every number carries a
source tag [S#] from section 1, or an explicit HOUSE HEURISTIC label. Ranges over precision.

Conventions used throughout:

- BW = body weight, FFM = fat-free mass (lean mass), BF = body fat fraction.
- All research math is metric. App storage is lb / inches. Conversions (exact by definition,
  international yard and pound agreement, 1959):
  - kg = lb x 0.45359237
  - cm = in x 2.54
  - FFM_kg = BW_kg x (1 - BF)
- "Evidence" = trial or position-stand backed. "Consensus" = guideline body. "HOUSE" = our
  choice where literature is silent; shrink or replace when better data lands.

---

## 1. SOURCES (provenance table)

All accessed 2026-08-18 via web search/fetch from this session.

| ID | Source | URL | What was taken |
|----|--------|-----|----------------|
| S1 | Mifflin MD, St Jeor ST et al., "A new predictive equation for resting energy expenditure in healthy individuals", Am J Clin Nutr 1990;51(2):241-247 (coefficients cross-checked via Medscape calculator page) | https://reference.medscape.com/calculator/846/mifflin-st-jeor-equation-calculator | MSJ coefficients: 10w + 6.25h - 5a + 5 (male) / -161 (female) |
| S2 | Frankenfield D, Roth-Yousey L, Compher C., "Comparison of Predictive Equations for RMR in Healthy Nonobese and Obese Adults: A Systematic Review", J Am Diet Assoc 2005;105(5):775-789 | https://www.jandonline.org/article/S0002-8223(05)00149-5/abstract | MSJ within +/-10% of measured RMR in ~82% of nonobese and ~70% of obese, best of compared equations; Harris-Benedict overestimates ~5% (50-80 kcal/d); basis for preferring MSJ |
| S3 | MacroFactor, "What are the Best BMR Equations?" (equation provenance review) | https://macrofactor.com/best-bmr-equations/ | "Katch-McArdle" = Cunningham 1991 equation 370 + 21.6 x FFM, popularized by McArdle/Katch/Katch textbook; Cunningham 1980 variant was 500 + 22 x FFM |
| S4 | "Underestimation of RMR using equations vs indirect calorimetry... RMR as a function of body composition", Clin Nutr Open Sci 2021 | https://www.sciencedirect.com/science/article/pii/S2667268521000048 | Body-composition equations outperform weight-based ones in lean/athletic builds; in athletic-constitution subgroup, within-10% hit rate ~64% (Katch-McArdle) vs ~32% (Mifflin); all equations carry real error |
| S5 | ESPEN expert group, "The centenary of the Harris-Benedict equations", Clinical Nutrition 2021 | https://www.clinicalnutritionjournal.com/article/S0261-5614(20)30616-6/fulltext | HB derived 1919 from early-20th-century subjects; prediction equations are estimates, measured trend beats predicted number |
| S6 | NASEM, Dietary Reference Intakes for Energy (2023 report; PAL framework carried from IOM 2005) | https://www.ncbi.nlm.nih.gov/books/NBK591020/ and https://www.nationalacademies.org/read/26818/chapter/9 | PAL categories: sedentary 1.0-1.39, low active 1.4-1.59, active 1.6-1.89, very active 1.9-2.5; low active ~= sedentary life + 2 miles/day walking at 3-4 mph for a 70 kg adult |
| S7 | Jager R et al., ISSN Position Stand: Protein and Exercise, JISSN 2017;14:20 | https://pubmed.ncbi.nlm.nih.gov/28642676/ (full text https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5477153/) | Protein 1.4-2.0 g/kg BW/d for exercising people; 2.3-3.1 g/kg/d may be needed in hypocaloric resistance-trained subjects to retain lean mass; per-meal 0.25 g/kg or 20-40 g |
| S8 | Aragon AA et al., ISSN Position Stand: Diets and Body Composition, JISSN 2017;14:16 | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5470183/ | Fat loss = sustained deficit; higher starting BF tolerates more aggressive deficit; slower loss better preserves lean mass in leaner subjects; lean gain = sustained surplus |
| S9 | Helms ER, Aragon AA, Fitschen PJ, "Evidence-based recommendations for natural bodybuilding contest preparation", JISSN 2014;11:20 | https://pubmed.ncbi.nlm.nih.gov/24864135/ (full text https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4033492/) | Cut rate 0.5-1.0% BW/wk; protein 2.3-3.1 g/kg LEAN mass; fat 15-30% of kcal; carbs = remainder |
| S10 | Garthe I et al., "Effect of two different weight-loss rates on body composition and performance in elite athletes", IJSNEM 2011;21(2):97-104 | https://pubmed.ncbi.nlm.nih.gov/21558571/ | 0.7%/wk group GAINED lean mass (+2.1%) while cutting; 1.4%/wk group did not (-0.2%); slow rate wins for lean retention |
| S11 | Iraki J et al., "Nutrition Recommendations for Bodybuilders in the Off-Season", Sports 2019;7(7):154 | https://pmc.ncbi.nlm.nih.gov/articles/PMC6680710/ | Surplus 10-20% (novice/intermediate) or 5-10% (advanced); gain 0.25-0.5% BW/wk (advanced ~0.25%); protein 1.6-2.2 g/kg; fat 0.5-1.5 g/kg; carbs >=3-5 g/kg as remainder; protein 0.40-0.55 g/kg/meal across 3-6 meals |
| S12 | NIDDK / NIH Body Weight Planner (Kevin Hall dynamic model) | https://www.niddk.nih.gov/bwp (background: https://www.niddk.nih.gov/health-information/professionals/diabetes-discoveries-practice/nih-body-weight-planner) | Body offsets imposed deficits over time; weight response is a flattening curve, not a line; permanent habits needed for maintenance |
| S13 | Hall KD, "Why is the 3500 kcal per pound weight loss rule wrong?", Int J Obes 2013 | https://www.nature.com/articles/ijo2013112 | Static 3500-rule ignores dynamic energy balance; its worst failure is long horizons |
| S14 | Thomas DM et al., "Time to Correctly Predict the Amount of Weight Loss with Dieting", J Acad Nutr Diet 2014 | https://www.jandonline.org/article/S2212-2672(14)00111-7/abstract (full text https://pmc.ncbi.nlm.nih.gov/articles/PMC4035446) | Static model overestimates weight loss by ~63% at 1 year (worse later); use dynamic thinking or short horizons only |
| S15 | Today's Dietitian, "Farewell to the 3500-Calorie Rule" | https://www.todaysdietitian.com/farewell-to-the-3500-calorie-rule/ | Provenance: Wishnofsky 1958 derived 3500 kcal per lb of tissue; still usable as a rough SHORT-horizon step size, not a forecast |
| S16 | Trexler ET, Smith-Ryan AE, Norton LE, "Metabolic adaptation to weight loss: implications for the athlete", JISSN 2014;11:7 | https://pubmed.ncbi.nlm.nih.gov/24571926/ (full text https://www.tandfonline.com/doi/full/10.1186/1550-2783-11-7) | Adaptive thermogenesis: TDEE falls more than predicted by mass lost; persists after the diet; expect deficits to shrink over time |
| S17 | Kerksick CM et al., ISSN Position Stand: Nutrient Timing, JISSN 2017;14:33 | https://pubmed.ncbi.nlm.nih.gov/28919842/ (full text https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5596471/) | Glycogen maximized at 8-12 g CHO/kg/d (high-volume athletes); a moderate resistance session (6x12RM) depletes muscle glycogen only ~39%; total daily intake beats timing tricks; spread protein ~every 3 h |
| S18 | Impey SG ... Morton JP, "Fuel for the Work Required: carbohydrate periodization framework", Sports Med 2018;48:1031-1048 | https://link.springer.com/article/10.1007/s40279-018-0867-7 (full text https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5889771/) | Match carb intake to the demands of the next session(s), endurance-derived framework; train-low signalling data exists but performance benefit unproven |
| S19 | Campbell BI et al., "Intermittent Energy Restriction Attenuates the Loss of FFM in Resistance Trained Individuals", 2020 + published reanalysis comment | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7739314/ and https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7739336/ | 2 refeed days/wk at maintenance (carbs up) vs continuous cut: headline FFM benefit CONTESTED on reanalysis (only dry FFM differed). Preserved as a disagreement |
| S20 | Byrne NM et al., MATADOR trial, Int J Obes 2018;42:129-138 (accessed via evidence summary) | https://www.clinicalnutritionreport.com/articles/matador-trial-refeeds-diet-breaks/ | 2-wk diet blocks alternated with 2-wk maintenance in obese men: more fat loss, better REE retention vs continuous. Supports diet BREAKS, not daily carb cycling; population was obese men, not lifters |
| S21 | NASEM, DRI for Water, Potassium, Sodium, Chloride, and Sulfate (2005) | https://www.nationalacademies.org/read/10925/chapter/6 | Adequate Intake total water: 3.7 L/d men, 2.7 L/d women, from all foods + beverages |
| S22 | IOM fibre DRI as carried by Dietary Guidelines for Americans; USDA ERS chart; UC Davis nutrition sheet | https://www.ers.usda.gov/data-products/charts-of-note/chart-detail?chartId=106189 and https://nutrition.ucdavis.edu/outreach/nutr-health-info-sheets/consumer-fiber | Fibre recommendation 14 g per 1000 kcal (basis: CVD-protective intakes); AI works out to 38 g/d men, 25 g/d women 19-50; US average is only ~8 g/1000 kcal |
| S23 | NASEM, "Rethinking the Acceptable Macronutrient Distribution Range" (describes current AMDRs) | https://www.ncbi.nlm.nih.gov/books/NBK610333/ | AMDR fat = 20-35% of energy for adults; lower bound exists to cover essential fatty acids and fat-soluble vitamin absorption |
| S24 | Mountjoy M et al., 2023 IOC consensus statement on REDs, Br J Sports Med 2023;57:1073-1097 (+ IOC REDs CAT2 companion) | https://www.semanticscholar.org/paper/31232e7d9d1bcf590e29b10e8d80337a8a6b6616 (summary: https://pinesnutrition.org/2023-ioc-consensus-statement-on-reds-whats-new/) | LEA threshold ~<30 kcal/kg FFM/d (females); male thresholds less certain (~9-25 kcal/kg FFM/d range discussed); LEA is a spectrum (adaptable vs problematic); symptom list for warnings |
| S25 | 2013 AHA/ACC/TOS Guideline for Management of Overweight and Obesity in Adults (+ Endotext behavioral summary) | https://www.ahajournals.org/doi/10.1161/01.cir.0000437739.71477.ee and https://www.ncbi.nlm.nih.gov/books/NBK278952/ | Standard clinical low-calorie prescriptions: 1200-1500 kcal/d women, 1500-1800 kcal/d men; typical deficit target 500-750 kcal/d |
| S26 | Hodgdon JA, Beckett MB, "Prediction of percent body fat for US Navy men from body circumferences and height", NHRC report 84-11, 1984 (+ 2022 USMC revisit) | https://apps.dtic.mil/sti/tr/pdf/ADA143890.pdf and https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9008774/ | Navy tape method: r ~0.90 vs underwater weighing; standard error ~3-4 BF percentage points; tape placement/hydration swing results a few points |
| S27 | Ainsworth BE et al., Compendium of Physical Activities (2011, corrected METs; 2024 update exists) | https://pacompendium.com/corrected-mets/ | MET anchors: resistance training 3.5-6.0 (vigorous ~6.0), vigorous circuit ~8.0, running 6 mph ~9.8, walking 3.5 mph ~4.3. 1 MET ~= 1 kcal/kg/h |
| S28 | Burke LM et al., "Carbohydrates for training and competition", J Sports Sci 2011 | https://www.tandfonline.com/doi/full/10.1080/02640414.2011.585473 | CHO by training load: 3-5 g/kg (low/skill), 5-7 g/kg (~1 h/d moderate), 6-10 g/kg (1-3 h/d), 8-12 g/kg (4-5+ h/d) |

---

## 2. BMR MODELS

### 2.1 Katch-McArdle (body-composition model)

```
BMR_kcal = 370 + 21.6 x FFM_kg          [S3]
FFM_kg   = (weight_lb x 0.45359237) x (1 - BF)
```

Provenance note: this is Cunningham's 1991 equation; the fitness world calls it Katch-McArdle
because the McArdle/Katch/Katch textbook popularized it. A 1980 Cunningham variant
(500 + 22 x FFM) also circulates; we use the 1991 form only. [S3]

Applicability and error:

- Best available option whenever a credible FFM estimate exists; body-composition equations
  beat weight-based ones in lean and muscular builds (within-10% hit rate roughly doubled vs
  Mifflin in an athletic subgroup). [S4]
- Its accuracy is bounded by the BF input. Navy tape carries a standard error of ~3-4 BF
  points [S26]. Propagated example: 86 kg at 22% +/- 3.5 pts -> FFM +/- ~3 kg -> BMR +/- ~65
  kcal. Acceptable, but it means a fresh sloppy tape reading can move the number; smooth BF
  over recent tape readings rather than using a single one (HOUSE HEURISTIC: median of last
  2-3 readings).
- It knows nothing about age or sex beyond what FFM captures; that is mostly fine, it is why
  the model works.

### 2.2 Mifflin-St Jeor 1990 (anthropometric model)

```
male:   BMR_kcal = 10 x kg + 6.25 x cm - 5 x age + 5      [S1]
female: BMR_kcal = 10 x kg + 6.25 x cm - 5 x age - 161    [S1]
cm = height_in x 2.54
```

Validation: the ADA-commissioned systematic review found MSJ within +/-10% of measured RMR in
~82% of nonobese and ~70% of obese adults, the best and tightest of the compared equations;
Harris-Benedict runs ~5% high (its 1919 sample). [S2][S5]

Error notes: degrades at extremes of muscularity (underestimates the very muscular,
overestimates the very fat); that is exactly the gap Katch-McArdle covers when tape data
exists. [S2][S4]

### 2.3 Current heuristic (bw x 14/15)

`kcal = BW_lb x 14 (female) / 15 (male), rounded to 50, + height adj + goal adj` is a
HOUSE HEURISTIC with no external validation. It has no age term and scales linearly with
total weight, so it inflates badly at high body weight (see eval case 11: ~4800 vs ~2900-3250
modeled) and undershoots short muscular users. Keep it only as the last-resort fallback and
label its output as low confidence in the explanation string.

### 2.4 BodyT selection rule

```
if (recent Navy tape BF exists)            -> Katch-McArdle   [S3][S4][S26]
else if (height AND age exist)             -> Mifflin-St Jeor [S1][S2]
else                                       -> bw x 14/15 heuristic (HOUSE, low confidence)
                                              + prompt user for tape or height/age
```

"Recent" tape: HOUSE HEURISTIC, within ~60 days or within 5% weight change of when it was
taken; otherwise nudge for a re-measure but still prefer stale-tape KM over MSJ only if BF
change is implausible; simplest v1: stale tape falls back to MSJ.

In all cases: the equation is only the opening bid. The 2-3 week measured weight trend is the
truth serum and overrides the model (section 4). [S5][S12]

---

## 3. ACTIVITY FROM LOGGED REALITY

Anchor: NASEM/IOM PAL bands, not gym folklore. Sedentary 1.0-1.39, low active 1.4-1.59,
active 1.6-1.89, very active 1.9-2.5 [S6]. The familiar 1.2 / 1.375 / 1.55 / 1.725 / 1.9
multipliers are point picks inside these bands from the exercise-physiology tradition; treat
them as BANDS. Do not present a user a multiplier with three decimals; that is fake precision.

Known failure mode: people overestimate their own activity level, and equation-based TDEE
inherits both BMR error and multiplier error [S2][S5]. BodyT's advantage: it does not ask,
it reads the log.

### 3.1 Session energy from the log (sourced arithmetic)

1 MET ~= 1 kcal per kg per hour. Net session cost ~= (MET - 1) x kg x hours. [S27]

| Logged thing | MET anchor [S27] | Net kcal formula |
|---|---|---|
| Strength session (typical 8-15 rep work) | 3.5-6.0 (use 5.0 default) | (5-1) x kg x duration_h |
| Vigorous circuit / conditioning | ~8.0 | (8-1) x kg x duration_h |
| Walking (steps or GPS ~3.5 mph) | ~4.3 | (4.3-1) x kg x duration_h |
| Running (GPS) | ~9.8 at 6 mph | ~= 1.0 kcal x kg x km gross (9.8 kcal/kg/h at 9.66 km/h), net ~0.9 x kg x km |

Tonnage refines duration-based estimates only weakly; treat tonnage as an intensity hint
(pushes MET from 3.5 toward 6.0), not as a calorie source of its own (HOUSE HEURISTIC).

### 3.2 Two architectures (pick one, never both)

- (a) RECOMMENDED for J7: base multiplier covers NON-training life only (1.2-1.5 by logged
  steps/daily movement), and each completed session's net kcal is added on the day it happened.
  Training day = rest day + session cost. Self-explaining and never double-counts.
- (b) Legacy: one blended weekly multiplier that includes training, with rest days subtracting
  a session estimate. Same weekly total, harder to explain.

Double-counting is the classic bug: if the multiplier already includes training, do not add
session kcal on top.

### 3.3 Mapping logged reality to the base band (cut-points HOUSE, bands sourced [S6])

Evaluated over a rolling 14-28 days of completed (not planned) sessions:

| Logged reality | Base PAL (arch. a) | Blended PAL (arch. b) |
|---|---|---|
| No sessions, minimal steps, desk life | 1.2-1.3 | 1.2-1.35 |
| 1-2 sessions/wk or ~20-30 min/d easy movement | 1.25-1.4 | 1.35-1.5 |
| 3-4 sessions/wk (45-75 min) + normal movement | 1.3-1.45 | 1.45-1.6 |
| 5-6 sessions/wk or 3-4 + 20+ km/wk logged cardio | 1.35-1.5 | 1.55-1.75 |
| 6+ hard sessions + big cardio volume or physical job | 1.4-1.5 | 1.7-1.9 |

Caveats, all binding:

- Conservative default: start at the LOWER edge of the band. An underestimate self-corrects
  upward via the weight trend; an overestimate stalls a cut and erodes trust. [S12][S16]
- Cap at 1.9 blended. Above that lives doubly-labeled-water territory; never grant it from
  logs alone. [S6]
- Show the range in the UI copy, adjudicate with the 2-3 week trend (section 4), and move the
  multiplier estimate slowly (HOUSE: max one band step per re-evaluation).
- Completed sessions only. Planned-but-skipped training is the main way calculators lie.

---

## 4. WEIGHT-CHANGE BANDS AND THE STEP RULE

### 4.1 Bands

| Goal | Band | Source |
|---|---|---|
| Cut | 0.5-1.0% BW/wk; leaner goes slower | [S9] rate band; [S10] 0.7%/wk preserved/gained lean mass, 1.4%/wk did not; [S8] higher starting BF tolerates the aggressive end |
| Lean gain | 0.25-0.5% BW/wk (novice/intermediate); ~0.25% advanced | [S11] |

Leaner-goes-slower mapping (cut): BF above ~25% male / ~32% female -> up to 1.0%/wk; middle
ground -> 0.5-0.75%/wk; below ~15% male / ~23% female -> hold to ~0.5%/wk or less.
Direction is sourced [S8][S9][S10]; the exact BF cut-points are HOUSE HEURISTIC anchored to
common body-fat classification, tune with usage data.

### 4.2 The calorie-step rule (trend misses the band for 2-3 weeks)

Convention: ~3500 kcal per lb of tissue, so ~500 kcal/day ~= 1 lb/wk (Wishnofsky 1958) [S15].
Known limitations, both sourced and real:

- It is a static rule. The body offsets deficits (adaptive thermogenesis), so it overestimates
  long-run loss by ~63% at one year and worse beyond. [S13][S14][S12]
- TDEE drops more than the lost mass predicts, and the drop persists. Expect a deficit that
  worked in week 2 to underdeliver by week 10. [S16]

Therefore: use it ONLY as a short-horizon step size between measurements, never as a forecast.

Rule (numbers below are HOUSE step sizes built on the sourced 3500 convention):

1. Compare the 2-3 week smoothed trend (lb/wk, from stored weight history) to the goal band.
2. If outside the band, compute the miss in lb/wk; the static correction would be
   miss x 500 kcal/day [S15]. Apply only HALF of it, clamped to 100-250 kcal/day per
   adjustment (conservative against water noise and adaptation), rounded to 50.
3. Re-evaluate after another 2-3 weeks. Never adjust on single weigh-ins.
4. Hard limits always win: deficit never exceeds 25% of modeled maintenance (existing house
   cap, consistent in spirit with [S8][S9]), floors never break (section 7), surplus never
   exceeds 20% [S11].
5. Suggest, never auto-apply (house non-negotiable): the step is surfaced as a suggestion
   with its reason.

---

## 5. MACRO RULES

### 5.1 Protein (current app bands CONFIRMED, sources attached)

| Context | Band | Basis | Source |
|---|---|---|---|
| Endurance-leaning general | 1.4-2.0 g/kg BW (app's 1.5 sits inside) | BW | [S7] |
| General / maintenance | 1.4-2.0 g/kg BW (app's 2.0 = top of band) | BW | [S7] |
| Hypertrophy / surplus | 1.6-2.2 g/kg BW | BW | [S11] |
| Cut | 2.3-3.1 g/kg FFM (requires tape BF) | FFM | [S9][S7] |
| Cut, no BF known | 1.8-2.2 g/kg BW as a stand-in until tape exists | BW | HOUSE mapping of the FFM band; nudge user to tape |
| Very high BW, no BF | band applied to reference weight at BMI 25 for height | ref BW | HOUSE, borrowing the clinical ideal-body-weight convention; tape measurement dissolves the problem |

Per-meal note (copy, not enforcement): 0.25 g/kg or 20-40 g per feeding, spread across the
day [S7]; 0.40-0.55 g/kg/meal over 3-6 meals for dedicated gainers [S11].

### 5.2 Fat floor: what is actually supported vs gym lore

Supported:

- AMDR 20-35% of energy; the lower bound exists to cover essential fatty acids and
  fat-soluble vitamin absorption. [S23]
- Off-season lifters: 0.5-1.5 g/kg/d. [S11]
- Contest prep (the most restricted legitimate case): 15-30% of kcal. [S9]

Gym lore, not supported: "under 1 g per POUND and your hormones crash." Very low fat can
lower testosterone, which is why prep guidance bottoms at 15-20% [S9], but there is no
evidence requiring ~2.2 g/kg; that number is a unit confusion elevated to doctrine.

BodyT rule: fat = 0.7-1.0 g/kg BW by default, and NEVER below
`max(0.5 g/kg BW, 20% of prescribed kcal)` [S11][S23]. Dipping to 15-20% of kcal is allowed
only in a short, explicitly chosen hard-cut phase [S9]. (The blend of the two floors into one
max() is HOUSE; each floor is sourced.)

### 5.3 Carbs = remainder

Carbs get every calorie left after protein and fat [S9][S11]. Sanity bands to check the
remainder against (advisory copy, not enforcement):

- Lifters: at least 3-5 g/kg [S11].
- ~1 h/d moderate training: 5-7 g/kg; 1-3 h/d: 6-10 g/kg; huge volume: 8-12 g/kg [S28][S17].
- If the remainder lands under ~3 g/kg for someone training hard, the kcal target is too low
  for the training load; surface that instead of silently shipping a joyless plan (advisory
  threshold anchored to [S11], surfacing behavior HOUSE).

### 5.4 Training-day vs rest-day carb cycling: evidence vs the flat -300

What the evidence actually supports:

1. Matching carbohydrate to the work required is a legitimate, endurance-derived framework;
   day-to-day carb periodization is standard practice for endurance athletes. [S18][S28]
2. Lifting is not that glycogen-hungry: a moderate resistance session depletes muscle
   glycogen only ~39%, so lifters do not need endurance-sized carb swings. [S17]
3. Periodic maintenance periods during a cut (refeed days, 2-week diet breaks) have RCT
   support for REE retention and possibly lean retention, but the flagship lifter study's
   FFM benefit is contested on reanalysis, and MATADOR was obese men, not lifters. Preserve
   the disagreement: diet breaks are promising, not proven for our population. [S19][S20]
4. No trial shows daily train/rest kcal cycling beats a flat intake at equal weekly calories
   for body composition in lifters. Absence of evidence, but claimed superiority would be
   HOUSE, not science.

Verdict on the current flat -300 rest day: the DIRECTION is supported (less work, less fuel
needed [S18]); the flat SIZE is unsourced and mis-scales. For a 86 kg man lifting an hour,
-300 is about right; for a 54 kg woman lifting 45 min it is roughly double her session cost
and turns rest days punitive.

Proposed sourced rule (J7):

```
restDayKcal     = baseline (architecture a, section 3.2)
trainingDayKcal = restDayKcal + clamp(sessionNetKcal, 150, 400)
sessionNetKcal  = (MET - 1) x kg x hours        [S27]
```

- The entire day-to-day swing rides on CARBS; protein and fat are identical every day
  (protein for daily repair [S7][S17], fat for the floor [S23]).
- Clamp bounds 150-400 are HOUSE (typical 45-90 min sessions of a 55-100 kg user land there
  by the MET math); weekly total equals the goal total either way.
- Rest-day floor 1200 and training-day floor 1500 still bind last.
- Migration note: flat -300 becomes the special case (86 kg, 1 h, 5 METs); the new rule is
  the same idea with the user's own mass and logged duration plugged in.

### 5.5 Fibre floor

14 g per 1000 kcal of the PRESCRIBED calories [S22]. Reference AIs land at 38 g/d (men) and
25 g/d (women 19-50) at reference intakes [S22]; the per-1000 form scales correctly for our
computed targets (a 1600 kcal cut gets ~22 g, not 38). US average is ~8 g/1000, so most users
start far below the floor [S22]. Copy note: ramp fibre up over 1-2 weeks for gut comfort
(HOUSE, standard dietetic practice).

### 5.6 Hydration one-liner

Adequate Intake for total water: ~3.7 L/day men, ~2.7 L/day women, from all food and drink
combined; add more for sweat. [S21] Ship it as a nudge, never a tracked macro.

---

## 6. SELF-EXPLAINING NUMBER TEMPLATES

One casual line per output. Placeholders in {braces}. House rules honored: no em dashes,
suggest-only voice, no fake precision (ranges shown where the engine holds ranges).

- kcal, training day: "Today's {kcal} kcal: your {modelName} baseline of {bmr}, plus daily life ({activityLabel}), plus about {sessionKcal} kcal for the session you have on the board, {sign}{goalDelta} for your {goalLabel} pace."
- kcal, rest day: "Rest day is {kcal} kcal: same baseline, just without the session fuel. Repair still runs on protein, so that stays put."
- kcal, fallback model: "Rough number alert: {kcal} kcal comes from bodyweight math only. Log a tape measurement or your height and age and this gets a real engine."
- protein: "{g} g protein: that's {gPerKg} g per kg of your {basisLabel}, the range shown to protect muscle while you {goalVerb}."
- fat: "{g} g fat: enough to stay above the {floorLabel} minimum your hormones and vitamins run on. We don't cut below that, ever."
- carbs: "{g} g carbs: everything left after protein and fat. Carbs fund the work, so they ride up on training days and ease off when you rest."
- fibre: "{g} g fibre: the national guideline of 14 g per 1000 kcal, applied to your {kcal} kcal."
- hydration: "Water target: roughly {litres} L across the day counting food and drinks. Sweat more, drink more."
- step adjustment (suggestion): "Your 3-week trend is {trend} per week, target is {target}. Suggest {sign}{step} kcal per day and we re-check in two weeks."
- floor clamp: "That pace would land under {floor} kcal, and we don't go there. The floor stays, the timeline stretches."

Basis labels: modelName in {"lean mass (Katch McArdle)", "height, age and weight (Mifflin St Jeor)", "bodyweight rule of thumb"}; basisLabel in {"lean mass", "bodyweight"}.

---

## 7. GUARDRAILS

1. Existing floors KEEP, unchanged: min 1500 kcal training day, 1200 kcal rest day, deficit
   capped at 25% of maintenance, and floors always win over goals. Alignment: clinical
   low-calorie prescriptions bottom out at 1200 (women) / 1500 (men) [S25]; our floors sit at
   or above the clinical bottom, so we never prescribe below what supervised programs use.
2. Never prescribe below floors regardless of goal, timeline, or user insistence. If the
   requested pace needs a sub-floor intake, the pace moves, not the floor (template in
   section 6). Aggressive rates also cost lean mass [S10], so this is performance advice,
   not just safety advice.
3. Energy availability check (stronger than the kcal floor when training volume is high):
   EA = (intake kcal - exercise kcal) / FFM_kg. Below ~30 kcal/kg FFM/day is the low-energy
   zone for females; male thresholds are less certain (roughly 9-25 discussed). [S24]
   When tape BF and logged sessions exist, compute EA; if it sits below ~30, raise a warning
   and suggest more food even if the kcal floor is technically met. Disagreement preserved:
   30 is a female-derived line; for males treat it as a caution band, not a diagnosis.
4. RED-S / under-fueling warning signs to watch for in copy and check-ins [S24]: performance
   and strength dropping despite training, constant fatigue, sleep disturbance, recurring
   illness or injuries and stress fractures, missing or disrupted periods, low mood and
   concentration. Two or more alongside low EA: suggest backing off the deficit and talking
   to a professional. Suggest only, never diagnose, never auto-change the plan.
5. Adaptation honesty: expect measured maintenance to drift below modeled maintenance as a
   cut progresses [S16]; the step rule (4.2) plus floors handles it, the model alone does not.
6. Data honesty: every number renders with its basis (section 6); heuristic-based numbers are
   labeled rough; ranges are shown as ranges.

---

## 8. EVAL CASES (table tests for J7)

Expectations are RANGES; kcal rounded to 50. Model chain per 2.4; activity per section 3
(architecture a); rates per section 4; macros per section 5. P = protein, F = fat, Fib = fibre.

| # | Persona | Model | Maint. est | Prescribed kcal | Macros | Expected explanation gist |
|---|---------|-------|-----------|-----------------|--------|---------------------------|
| 1 | M, 190 lb, 70 in, 30 y, BF 22% (tape), 4 lifts/wk logged, goal cut | Katch-McArdle (BMR ~1825) | 2750-2900 | train 2050-2200, rest 1750-1900 | P 155-210 g (2.3-3.1 x 67 kg FFM), F 55-70 g, Fib ~29 g | "lean mass engine, minus your cut pace" |
| 2 | F, 150 lb, 65 in, 28 y, no BF, 3 sessions/wk, goal cut | Mifflin-St Jeor (BMR ~1410) | 1950-2200 | train 1550-1700, rest 1350-1500 | P 135-150 g (1.8-2.2 g/kg BW stand-in), F 40-55 g, Fib 22-24 g | "height and age engine; tape unlocks lean-mass mode" |
| 3 | M, 175 lb, 69 in, 25 y, no BF, bodyweight-only at home, 6 logged sessions/wk + daily walks, goal maintain/recomp | Mifflin-St Jeor (BMR ~1770) | 3000-3200 | ~3000-3100 all days blended | P 130-175 g (1.6-2.2 g/kg BW) | high multiplier EARNED by completed logs, no gym required |
| 4 | F, 130 lb, 64 in, 35 y, no BF, 2 sessions/wk, wants "20 lb in a month" | Mifflin-St Jeor (BMR ~1270) | 1800-1900 | train clamped to 1500 (floor beats the 25% cap), rest clamped to 1200 | P ~120 g, F ~35-40 g (20% floor binds), Fib ~19-20 g | floor template fires; delivered pace ~0.5-0.7%/wk, timeline honesty |
| 5 | M, 170 lb, 12% BF (tape), 5 lifts/wk, goal cut (already lean) | Katch-McArdle (BMR ~1835) | 2950-3200 | train 2500-2700, rest 2200-2400 | P 190-210 g (2.8-3.1 x 68 kg FFM, lean end), F 55-75 g | leaner-goes-slower: rate held to ~0.5%/wk |
| 6 | F, 140 lb, 66 in, 30 y, no BF, runs 40 km/wk on GPS, goal maintain | Mifflin-St Jeor (BMR ~1370) | 2150-2300 (GPS adds ~360/d) | ~2150-2250, long-run days higher | P 90-100 g (1.4-1.6 g/kg), carbs checked vs 5-7 g/kg band | GPS distance drives the number, endurance carb band cited |
| 7 | M, 150 lb, 70 in, 22 y, BF 15% (tape), 4 lifts/wk, goal lean gain (novice) | Katch-McArdle (BMR ~1620) | 2500-2750 | 2800-3300 (+10-20%), gain 0.25-0.5%/wk | P 110-150 g (1.6-2.2 g/kg BW) | surplus sized to the sourced gain band, not "bulk hard" |
| 8 | M, 185 lb, 12% BF (tape), 5 lifts/wk, ADVANCED gainer | Katch-McArdle (BMR ~1965) | 3150-3450 | 3300-3600 (+5-10%), gain ~0.25%/wk | P 135-185 g | advanced = smaller surplus, slower target [S11] |
| 9 | M, 210 lb, 71 in, 45 y, no BF, desk job, 0-1 sessions logged, goal maintain | Mifflin-St Jeor (BMR ~1860) | 2250-2600 | 2250-2350 (conservative low edge) | P 135-190 g, Fib ~32 g | conservative default: lower band edge until the trend says otherwise |
| 10 | F, 120 lb, BF 18% (tape, FFM ~45 kg), 6 lifts + 30 km run/wk, currently targeting 1400 | Katch-McArdle (BMR ~1335) | ~2100-2250 | EA = (1400 - ~375)/44.6 ~= 23 -> RED-S advisory; suggest >= ~1700-1750 (EA >= 30) | protein held high, warning copy | EA guardrail catches what the 1200 floor misses |
| 11 | M, 320 lb, 72 in, 38 y, no BF, 1-2 sessions/wk, goal cut | Mifflin-St Jeor (BMR ~2410); heuristic would say ~4800 | 2900-3250 | train 2200-2450 (25% cap), rest 1900-2150 | P 150-185 g (HOUSE ideal-weight basis), Fib ~31 g | model swap materially corrects the old bw x 15 inflation |
| 12 | M, 180 lb, nothing else known | Heuristic (HOUSE): ~2700 maintenance | ~2700 +/- wide | goal adj on top; flagged low confidence | bands on BW only | fallback template fires: "rough number, give me height/age or a tape" |
| 13 | Persona 1 on a rest day (carb cycle check) | Katch-McArdle | n/a | rest = train - clamp((5-1) x 86 kg x 1 h, 150, 400) ~= train - 300 to 350 | carbs drop ~75-85 g, P and F IDENTICAL to training day | flat -300 is approximately right for THIS body; rule now says why |
| 14 | F, 120 lb (54 kg), 45-min sessions (carb cycle check) | any | n/a | swing = clamp((5-1) x 54 kg x 0.75 h, 150, 400) ~= 150-165, NOT 300 | carbs drop ~40 g only | proof the scaled rule fixes the flat rule's over-cut on small users |

Also assert in tests: (a) case 4 rest day = exactly 1200, never below; (b) case 1 with a
3-week trend of -0.2%/wk vs target -0.75%/wk suggests a step of -100 to -250 (half of
miss x 500, clamped), not -500; (c) no output ever renders without an explanation string;
(d) protein basis switches from FFM to BW the moment tape data is deleted/stale.

---

## 9. INTEGRATION NOTES (for J7; no code shipped from R1)

Layering per repo non-negotiables: constants and rule tables live in the plan layer;
computation in the generator; nothing imports upward.

What extends `plan/sportsNutrition.ts` (static, sourced rule data):

- Existing protein bands stay; attach sourceRef to each (S7, S9, S11) and add the two
  no-BF fallback rows (HOUSE) from 5.1.
- New: fat band + fat floor pair (S11, S23), carbs-as-remainder policy + g/kg sanity bands
  (S11, S28, S17), fibre constant 14/1000 (S22), hydration AI (S21), weight-rate bands
  (S9, S10, S11), EA threshold (S24), MET anchors (S27), PAL band table (S6), step-rule
  constants (S15 with S13/S14/S16 caveat encoded as maxStep/halving).

What changes in generator `buildNutrition`:

- Model selection chain (section 2.4) replacing bw x 14/15 as primary; heuristic retained
  as final branch with lowConfidence flag.
- Unit conversion helpers (lb/in -> kg/cm; FFM from tape BF), BF smoothing over recent tapes.
- Activity: architecture (a) base multiplier from logged movement + per-session adds
  (section 3); explicit guard against double counting.
- Goal: rate band -> daily delta; carb-cycling swing (5.4) replacing flat -300; floors and
  25% cap applied LAST, after all deltas.
- Trend-step suggestion (4.2) needs weight history, so it likely straddles engine/store
  (trend math) and plan (constants); it emits a suggestion object, never mutates the plan
  itself (suggest-only non-negotiable).
- Every emitted number carries an explainKey + params consumed by section 6 templates;
  template copy contains no em dashes.

Constants that become sourced (rename to make provenance greppable):

```
KCAL_PER_LB_TISSUE = 3500        // S15; short-horizon step sizing only (S13, S14)
CUT_RATE_PCT_WK    = [0.5, 1.0]  // S9, S10
GAIN_RATE_PCT_WK   = [0.25, 0.5] // S11
PROTEIN_CUT_GKG_FFM= [2.3, 3.1]  // S9, S7
FAT_MIN_GKG        = 0.5         // S11
FAT_MIN_PCT_KCAL   = 0.20        // S23
FIBER_G_PER_1000   = 14          // S22
WATER_AI_L         = {m: 3.7, f: 2.7} // S21
EA_LOW_KCAL_KG_FFM = 30          // S24 (female-derived; male = caution band)
PAL_BANDS          = ...         // S6
MET_ANCHORS        = ...         // S27
FLOOR_TRAIN=1500, FLOOR_REST=1200, MAX_DEFICIT=0.25  // house, kept; aligns with S25
```

Typed rule shape (sketch only):

```ts
type Confidence = 'evidence' | 'consensus' | 'house';

interface SourceRef {
  id: string;        // 'S9'
  name: string;      // 'Helms 2014 JISSN 11:20'
  url: string;
  accessed: string;  // '2026-08-18'
  note: string;      // exactly what was taken
}

interface NutritionRule {
  id: string;                 // 'protein.cut.gPerKgFFM'
  range: [number, number];    // or value: number
  units: string;              // 'g/kg FFM/day'
  appliesWhen: string;        // serialized predicate, e.g. "goal=cut && bfKnown"
  confidence: Confidence;
  sources: SourceRef[];       // empty only if confidence === 'house'
  explainKey: string;         // section 6 template id
}
```

Open questions J7 must decide (do not silently resolve):

1. Architecture (a) vs (b) for activity (3.2); this pack recommends (a).
2. Whether diet breaks / refeeds ship at all given the contested evidence (5.4 item 3), or
   wait for a cleaner lifter RCT; if shipped, as an optional suggestion only.
3. Stale-tape policy (2.4): fall back to MSJ vs carry stale FFM; v1 recommendation: fall back.
4. Male EA threshold handling (7.3): caution band vs hard line; this pack says caution band.

END OF PACK
