# R10 TECHNIQUE, CUEING AND MOTOR LEARNING (v12 section 34 and 50.15 to 50.17)

Job: R10. Date: 2026-08-18. Scope: what BodyT already ships for technique content, how to SELECT
a cue for this person right now without a camera, when and how often to say it, how to tell from
logs alone whether it worked, what a per-movement technique record should hold, how to represent
competency from behaviour, how this feeds J10's explain layer, eval fixtures, and integration
notes. NO production code shipped from this pack. NO repo writes.

Camera and computer vision are POST-CORE and out of scope. Everything here is designed for the
no-camera case and says so where it matters.

Conventions:

- Every empirical claim carries a source tag [S#] from section 1, or the label HOUSE HEURISTIC.
- "Evidence" = trial or meta-analysis backed. "Contested" = the meta-analyses disagree and the
  disagreement is preserved rather than resolved. "HOUSE" = our choice where the literature is
  silent or too weak to lean on; these shrink or get replaced when better data lands.
- Code facts were read on branch `claude/app-audit-refinement-sjw2va` (merge line after J2).
  Line numbers are from that tree.
- No em dashes anywhere in this pack, per the standing constraint.

---

## 1. SOURCES (provenance table)

All accessed 2026-08-18 from this session via web search and fetch.

| ID | Source | URL | What was taken |
|----|--------|-----|----------------|
| S1 | Chua LK, Jimenez-Diaz J, Lewthwaite R, Kim T, Wulf G. "Superiority of external attentional focus for motor performance and learning: Systematic reviews and meta-analyses." Psychological Bulletin 2021;147(6):618-645 | https://pubmed.ncbi.nlm.nih.gov/34843301/ (PDF: https://gwulf.faculty.unlv.edu/wp-content/uploads/2021/12/Chua_EF_meta-analyses_PB_2021.pdf) | The pro-external consensus position: external focus superior for performance AND learning, and the authors' claim that this holds "regardless of age, health condition, and level of skill expertise" |
| S2 | McKay B, Corson AE, Seedu J, De Faveri CS, Hasan H, Arnold K, Adams FC, Carter MJ. "Reporting bias, not external focus: A robust Bayesian meta-analysis and systematic review of the attentional focus literature." Psychological Bulletin 2024;150(6) | https://sportrxiv.org/index.php/server/preprint/view/304 and https://pubmed.ncbi.nlm.nih.gov/39480294/ | Re-analysis of seven prior meta-studies with publication-bias models. Moderate to strong evidence of publication bias in ALL analyses. Bias-corrected g = 0.01 performance, 0.15 retention, 0.09 transfer, 0.06 EMG, -0.01 distance effect; Bayes factors favour the null (BF01 1.3 to 5.75); clear heterogeneity, so effects depend on unknown context |
| S3 | Grgic J, Mikulic I, Mikulic P. "Acute and long-term effects of attentional focus strategies on muscular strength: a meta-analysis." Sports 2021;9(11):153 | https://pmc.ncbi.nlm.nih.gov/articles/PMC8622562/ | Resistance-specific. Acute strength external over internal SMD 0.34 (95% CI 0.22 to 0.46). Long-term overall null: SMD 0.32 (95% CI -0.08 to 0.73), only 3 studies. Lower-body subgroup long-term SMD 0.47 (0.07 to 0.87). Authors caution the benefit likely belongs to complex multi-joint work, not isolation, and warn against generalising to hypertrophy |
| S4 | Grgic J, Mikulic P. "Effects of attentional focus on muscular endurance: a meta-analysis." Int J Environ Res Public Health 2021;19(1):89 | https://pmc.ncbi.nlm.nih.gov/articles/PMC8751186/ | External over internal for reps-to-failure d = 0.58 (0.34 to 0.82). Only 5 studies, 141 participants, mostly male and mostly resistance-trained, all multi-joint |
| S5 | Zang L, Guo W, Wang B. "The farther, the better? The effect of attentional focus distance on motor performance: a systematic review and meta-analysis." PeerJ 2025;13:e20012 | https://peerj.com/articles/20012/ and https://pmc.ncbi.nlm.nih.gov/articles/PMC12424610/ | 20 RCTs, 497 participants. Distal external over proximal external SMD 0.3 (0.07 to 0.53) overall, BUT moderated by skill: experienced SMD 0.5 (p < 0.001), novices SMD 0.1 (not significant). I-squared 59%, inconsistent skill-level definitions |
| S6 | Wulf G. "Attentional focus and motor learning: a review of 15 years." Int Rev Sport Exerc Psychol 2013;6(1):77-104 | https://gwulf.faculty.unlv.edu/wp-content/uploads/2018/11/Wulf_AF_review_2013.pdf | The constrained action hypothesis: internal focus constrains the motor system by consciously coupling semi-independent segments; external focus frees automatic control. Also Wulf's own acknowledgement that replication failures exist, and her argument against the "novices need internal focus" folk belief |
| S7 | Beilock SL, Carr TH. "On the fragility of skilled performance: what governs choking under pressure?" J Exp Psychol Gen 2001;130(4):701-725 | https://pubmed.ncbi.nlm.nih.gov/11757876/ | Explicit monitoring / skill-focus hypothesis: attention to step-by-step execution disrupts proceduralised skill in experts, while novices have been shown to BENEFIT from step-by-step online monitoring. This is the clean statement of the expert / novice reversal |
| S8 | Beilock SL, Gray R. "Why do athletes choke under pressure?" and follow-ups summarised in "Choking under pressure: multiple routes to skill failure" | https://pubmed.ncbi.nlm.nih.gov/21574739/ | Confirms the same expert / novice split and separates self-focus from distraction accounts |
| S9 | Liao CM, Masters RSW. "Analogy learning: a means to implicit motor learning." J Sports Sci 2001;19(5):307-319 | https://www.ncbi.nlm.nih.gov/pubmed/11354610 | One analogy carries movement information as a single meaningful chunk instead of many verbal rules; analogy learners accumulate far fewer explicit rules, load working memory less, and hold up better under a concurrent secondary task |
| S10 | Cowan N. "The magical number 4 in short-term memory: a reconsideration of mental storage capacity." Behav Brain Sci 2001;24(1):87-114 | https://www.cambridge.org/core/services/aop-cambridge-core/content/view/44023F1147D4A1D44BDC0AD226838496/S0140525X01003922a.pdf/the-magical-number-4-in-short-term-memory-a-reconsideration-of-mental-storage-capacity.pdf | Focus-of-attention capacity averages about 4 chunks in adults, revised down from Miller's 7, and Miller's 7 was a rhetorical estimate rather than a measured limit |
| S11 | McKay B, Hussien J, Vinh MA, Mir-Orefice A, Brooks H, Ste-Marie DM. "Meta-analysis of the reduced relative feedback frequency effect on motor learning and performance." Psychol Sport Exerc 2022;61:102165 | https://www.sciencedirect.com/science/article/abs/pii/S1469029222000334 (abstract via https://www.ovid.com/journals/psyse/fulltext/10.1016/j.psychsport.2022.102165~meta-analysis-of-the-reduced-relative-feedback-frequency) | 61 papers, k = 75, N = 2228. NO significant effect of reduced feedback frequency at any time point, no acquisition-to-delayed-retention reversal, substantial heterogeneity, no significant moderators. Conclusion: robust evidence on feedback frequency is lacking, and the guidance hypothesis is not supported by the extant research |
| S12 | Salmoni AW, Schmidt RA, Walter CB. "Knowledge of results and motor learning: a review and critical reappraisal." Psychol Bull 1984;95(3):355-386 | https://pubmed.ncbi.nlm.nih.gov/6473626/ | The guidance hypothesis itself: frequent immediate feedback aids practice performance but can degrade learning by becoming a crutch. Cited here as the historical claim that S11 fails to confirm |
| S13 | Lee TD, Carnahan H. "Bandwidth knowledge of results and motor learning: more than just a relative frequency effect." Q J Exp Psychol A 1990;42(4):777-789 | https://journals.sagepub.com/doi/10.1080/14640749008401249 | Bandwidth feedback: give feedback only when error exceeds a tolerance band around the goal. Produces both error reduction and performance stabilisation, and beats matched-frequency controls on retention consistency |
| S14 | Wang B, Tao T, Yuan Y, Guo W. "Self-controlled feedback and behavioral outcomes in motor skill learning: a meta-analysis." Behav Sci 2025;15(9):1291 | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12467369/ | 29 studies, 1147 participants. Learner-controlled feedback: acquisition SMD 0.199 (ns), retention 0.630 (p < 0.001), transfer 0.684 (p < 0.001). Caveats: publication bias detected in retention and transfer, mostly college students |
| S15 | McKay B, Bacelar MFB, Carter MJ et al. "The combination of reporting bias and underpowered study designs has substantially exaggerated the motor learning benefits of self-controlled practice and enhanced expectancies: a meta-analysis." Int Rev Sport Exerc Psychol 2025;18(1) | https://www.tandfonline.com/doi/full/10.1080/1750984X.2023.2207255 | The counterweight to S14: self-controlled practice and enhanced-expectancy benefits are substantially inflated by reporting bias and underpowered designs |
| S16 | Weakley J, Cowley N, Schoenfeld BJ, Read DB, Timmins RG, Garcia-Ramos A, McGuckian TB. "The effect of feedback on resistance training performance and adaptations: a systematic review and meta-analysis." Sports Med 2023 | https://pubmed.ncbi.nlm.nih.gov/37410360/ and https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10432365/ | Feedback during resistance training improves acute kinetic and kinematic output (barbell velocity about +8.4%), muscular endurance, motivation and perceived effort; chronic feedback improves speed, strength, jump and technical competency. Visual beat verbal; higher frequency (every rep) best for ACUTE output. Note: this is objective performance feedback, not verbal technique instruction |
| S17 | Weakley JJS, Wilson KM, Till K et al. "Show me, tell me, encourage me: the effect of different forms of feedback on resistance training performance." J Strength Cond Res 2020 | https://pubmed.ncbi.nlm.nih.gov/33105366/ | Direct comparison of visual kinematic, verbal kinematic and verbal encouragement during back squat; all beat none, visual best |
| S18 | Martimo KP, Verbeek J, Karppinen J, Furlan AD, Takala EP, Kuijer PPFM, Jauhiainen M, Viikari-Juntura E. "Effect of training and lifting equipment for preventing back pain in lifting and handling: systematic review." BMJ 2008;336(7641):429-431 | https://pubmed.ncbi.nlm.nih.gov/18244957/ | No evidence that advice or training in lifting technique, with or without equipment, prevents back pain or consequent disability. Cohort data agreed with the RCTs. The Cochrane update reached the same conclusion |
| S19 | Saraceni N, Kent P, Ng L, Campbell A, Straker L, O'Sullivan P. "To flex or not to flex? Is there a relationship between lumbar spine flexion during lifting and low back pain? A systematic review with meta-analysis." J Orthop Sports Phys Ther 2020;50(3):121-130 | https://www.jospt.org/doi/10.2519/jospt.2020.9218 and https://pubmed.ncbi.nlm.nih.gov/31775556/ | Low-quality evidence that greater lumbar flexion during lifting is NOT a risk factor for low back pain onset or persistence and does not distinguish people with and without LBP. 9 of 11 studies found no between-group difference |
| S20 | "Which resistance training is safest to practice? A systematic review." J Orthop Surg Res 2023 | https://pmc.ncbi.nlm.nih.gov/articles/PMC10099898/ | 28 studies. Mean injury prevalence 35.3%; incidence 0.2 to 18.9 per 1000 training hours depending on modality. Most-injured sites shoulder 26%, spine 24%, knee 18% |
| S21 | Keogh JWL, Winwood PW. "The epidemiology of injuries across the weight-training sports." Sports Med 2017;47:479-501 | https://pubmed.ncbi.nlm.nih.gov/27328853/ | Bodybuilding 0.24 to 1 injury per 1000 h, strongman 4.5 to 6.1, Highland Games 7.5. General resistance training sits at the low end, below running |
| S22 | Chen Y et al. "Attentional focus strategies to improve motor performance in older adults: a systematic review." Int J Environ Res Public Health 2023 | https://pmc.ncbi.nlm.nih.gov/articles/PMC10002377/ | 18 studies, mostly balance and gait. Over 60% reported external superior in healthy older adults, but the locomotion advantage is smaller than the general attentional-focus literature implies |
| S23 | Landers M, Wulf G, Wallmann H, Guadagnoli M. "External focus instructions reduce postural instability in individuals with Parkinson disease." Phys Ther 2008 | https://pubmed.ncbi.nlm.nih.gov/19074619/ | External focus helps postural control in Parkinson disease; other work finds the benefit concentrated in patients with a fall history, i.e. population-specific rather than universal |
| S24 | "Beyond the neutral spine: a narrative review and modern framework for low back injury prevention in deadlifting." Sports (MDPI) | https://www.mdpi.com/2075-4663/14/4/151 | Narrative, lower evidence tier: moderate lumbar flexion under load is not consistently associated with injury risk; argues for load-informed framing over rigid postural prescription. Used only as corroboration of S19, never as primary evidence |

Two source-level cautions that shape the whole pack:

1. **The attentional-focus literature is contested at the meta level.** S1 and S2 analyse overlapping
   data and reach opposite conclusions. S2 is the more recent and methodologically stricter
   (Bayesian bias models over seven prior meta-studies), so this pack treats external focus as a
   sensible DEFAULT with a small and uncertain effect, never as a lever worth engineering around.
2. **The resistance-training-specific results (S3, S4) are small-n.** Three long-term studies is
   not a settled question. The acute strength and endurance effects are the better-supported half.

---

## 2. WHAT BODYT SHIPS TODAY

Measured, not remembered. Counts are from the merge line after J2.

### 2.1 The per-exercise fields

`ExerciseDef` (`src/types.ts:29-47`) is the canonical contract:

| field | type | required | what it is |
|---|---|---|---|
| `id`, `name`, `kind`, `equipment` | string | yes | identity and display |
| `steps` | `string[]` | yes | numbered how-to: setup, movement, breathing and tempo, in plain language |
| `targets` | `{ muscles: string[]; qualities: string[] }` | yes | what it trains |
| `why` | string | yes | why it is in YOUR plan |
| `mistakes` | `string[]` | yes | common errors, as prose |
| `cue` | `string` | **optional** | "short in-session cue line (seeded from the PDF notes)" |
| `videoId` / `videoQuery` | string | query required | demo video |
| `restSec`, `perSide` | number / bool | rest required | prescription-adjacent |

### 2.2 Coverage

194 exercises total, assembled in `src/plan/exercises.ts` (77 authored inline, then spread:
`ATHLETIC_EXERCISES` 71, `GYM_EXERCISES` 16, `HOME_EXERCISES` 21, `ATHLETIC_COVERAGE_EXERCISES` 9).

| content | coverage |
|---|---|
| `steps` | 194 / 194 |
| `why` | 194 / 194 |
| `mistakes` | 194 / 194 (typically 2 to 3 entries) |
| `cue` | **129 / 194** (12 of the 77 inline defs, then 71 + 16 + 21 + 9 from the four libraries). 65 movements have no cue at all |
| stick-figure demo (`EXERCISE_DEMOS`, `plan/demos.ts`) | 194 / 194 |
| photo sequence (`DEMO_PHOTOS`, `plan/demoPhotos.ts`) | 55 |
| verified video (`VIDEO_MAP`, `plan/videoMap.ts`, generated, wins over `def.videoId`) | 144 |

Structured movement metadata already exists beside the prose: `MOVEMENT` in `src/plan/movement.ts`
carries **111 strength movements** with `pattern`, `role`, `laterality`, `skill` (0 to 3, explicit
scale "0 = safe to do unsupervised on day one … 3 = genuinely needs coaching"), `fatigue`, `level`
(foundation / intermediate / advanced), `loadable`, `stretchLoaded`, `stress: Joint[]`,
`regressions`, `progressions`, `transfer`. `plan/athletic.ts` does the same job for the drills.

### 2.3 Guards that already exist

- `plan/data.test.ts:10-22` asserts every exercise has steps >= 2, >= 1 muscle, >= 1 quality,
  `why` > 40 chars, >= 1 mistake, a videoQuery and a restSec. **It does not assert a cue exists**,
  which is why 65 movements are silently cue-less.
- `plan/visuals.test.ts:84-95` pins `CUE_MAX = 80` characters ("two lines of cue", derived from the
  real render box: 13px bold centred in about 306px on a 390px screen) and `CAPTION_MAX = 26`.

### 2.4 Where cues are consumed

Four call sites, all presentation:

| site | use |
|---|---|
| `screens/today/ExerciseGuideSheet.tsx:71-73` | renders the cue in the guide sheet |
| `screens/today/ExerciseBrief.tsx:125-131` | renders it in the pre-exercise brief |
| `screens/today/HowToSlides.tsx:17-18` | builds slides: every step, then up to 2 mistakes tagged "Don't", then the cue tagged "Remember", always last |
| `screens/today/FocusView.tsx:46-49` | `shortHowTo(def)` = cue plus the opening clause of the first two steps, joined into one spoken line |

### 2.5 How the voice layer uses them

`src/platform/speech.ts` is a chunked utterance queue with a watchdog (documented reasons: iOS
clips the first 200 to 300 ms when `cancel()` and `speak()` land in the same tick, and `onend` does
not reliably fire). `say(text, { rate = 1.0, interrupt })` runs text through
`speakable()` and `intoChunks()` first. `src/platform/speakable.ts` turns written prescriptions
into English: 17 gym abbreviations expanded longest-first, unit expansion only when a digit
precedes, number ranges, "x" as "by", slash as "per" after a measure and "or" otherwise.
`isSpeaking()` exists because the coach's own voice re-triggers the microphone.

What is actually spoken during a session, in order:

1. **Set intro** (`FocusView.tsx:298-322`), once per set position, voice mode only. Set 1 gets
   name, set count, reps and weight, ending "Tap go or tell me when you're ready." Sets 2+ get
   "Set N of M." and nothing else, deliberately.
2. **Instructions, only on request** (`FocusView.tsx:326-331`): `shortHowTo(def)`, triggered by the
   STEPS tap or the hands-free "how do I" command (`onAsk`). This is the ONLY path by which a cue
   is ever spoken.
3. **Gate correction** if a loaded lift has no weight yet: "Weight per dumbbell first."
4. **Rest screen** (`BreakScreen.tsx:82-88, 114-119`): "Rest. Next: NAME, SET LABEL." at the start,
   "Ready?" when the clock hits zero. In `beeps-names` mode only the next name is spoken.

Four sound modes exist: `voice`, `beeps-names`, `beeps`, `silent`.

### 2.6 The rest screen, since section 4 depends on it

`BreakScreen.tsx` already hosts, inside one countdown: the next-up name and set label, a weight
stepper (so plates get changed during rest, not after), an ease offer when the weight dropped
(`easeOffer`), the once-per-session "How is this session sitting?" ask (`askSessionFeel`), the
`EffortAsk` block (shortfall entry against `justTarget`, plus the once-per-movement RIR ask via
`askRir`), a "skip the rest" button, and a demo plus muscle map preview of what is next. Catalog
rest values across the 194 defs: 90 s (46 movements), 120 s (44), 60 s (26), 150 s (24), 180 s (19),
45 s (10), 0 s (10), 30 s (5), and a short tail at 105 / 210 / 240 s.

### 2.7 The gap: selection is static, and nothing is tracked

This is the honest statement of what does not exist.

- **One cue per exercise, for everyone.** `ExerciseDef.cue` is a single string. The same 129
  strings reach a first-week beginner and a four-year lifter, on set 1 and set 5, on a fresh day
  and a wrecked one.
- **Nothing chooses.** No file reads training age, exposure count, RIR, shortfall history, pain
  flags, or prior exposure to decide what to say. The only branch anywhere near selection is
  `HowToSlides` capping mistakes at 2, and `shortHowTo` taking the first clause of the first two
  steps.
- **Nothing is recorded.** Grep of the store shapes: `SetLog` (targetReps, weightLb, reps, seconds,
  done, achieved, light), `ExerciseLog` (exerciseId, fromSlot, sets, skipped, feel, rir),
  `SessionLog` (readiness, intensity, makeupFor, trimmedFromIndex, exercises, notes, fatigue[],
  feel), `CoachLogState` (feed, shownMessageIds ring, surfacedInsights cooldown map), `Prefs`
  (blocked, pinned, limitations). **No field anywhere says a cue was shown, let alone whether it
  helped.**
- **The cue is opt-in to hear.** Because `shortHowTo` only runs on request, a user who never taps
  STEPS and never says "how do I" hears zero technique content for an entire training block.
- **65 movements have no cue at all**, and no test catches it.

What DOES exist, and is exactly the raw material a selection engine needs:

| signal | where |
|---|---|
| training age (4 tiers: new / returning / casual / trained) | `plan.experience`, typed in `plan/milestones.ts:29`, read via `journey.ts:116 ageOf` |
| movement difficulty and teaching order | `MOVEMENT[id].skill` 0-3, `.level`, `.regressions`, `.progressions` |
| shortfall on a set | `SetLog.achieved` (present only when it differed from the ask) |
| plan-chosen light load | `SetLog.light` (load provenance, keeps softened weights out of baselines) |
| how a movement felt / reps in reserve | `ExerciseLog.feel`, `ExerciseLog.rir` |
| a set that died, and why | `SessionLog.fatigue[]`: `FatigueNote { exerciseId, reason: 'fried' \| 'form' \| 'pain', atSetIdx, regions, note? }` |
| whole-day state | `SessionLog.readiness` (4 flags), `.intensity`, `.feel`, `data.dayLoad[date] = 'trimmed'` |
| durable limitations and blocks | `Prefs.limitations` (label + `Joint[]` + since), `Prefs.blocked` (reason `dislike` / `hurts` / `cannot`) |
| anti-repeat and cooldown machinery | `CoachLogState.shownMessageIds` ring buffer, `surfacedInsights: Record<ruleId, ISODate>` |
| the proven "learn from answers" pattern | `engine/calibration.ts` |

### 2.8 Measured baseline of the 129 existing cue strings

Parsed straight out of the five catalog files, because the authoring backlog in section 6 and the
caps in sections 3 and 8 should be sized against what is actually there.

| measure | value |
|---|---|
| cue strings | 129 |
| words per cue | min 3, median 8, max 13 |
| cues over 12 words | **1** (`penultimate-approach`, 13 words) |
| longest cue | 72 characters, inside the tested `CUE_MAX` of 80 |
| **cues carrying more than one idea** | **50 of 129**: 79 are a single sentence, 48 are two sentences, 2 are three or more |
| **cues that name a body part** | **57 of 129**, i.e. at least partly internal-focus phrasing |
| cues using ALL-CAPS for emphasis | 31 of 129 |
| cues containing an en dash | 1 ("Leave 2-3 reps in the tank") |

Four things follow:

1. The **12-word voice cap is essentially free**. Exactly one existing string breaks it. The cap
   codifies what the authors already did rather than forcing a rewrite.
2. The **one-idea rule is not free**. Roughly 39% of existing cues stack two or three instructions
   into one string ("Max intent every rep. Step down. Stop when height drops."). Splitting these
   into an ordered `teachingOrder` is the bulk of the authoring work, and it is the single change
   most likely to make cueing land.
3. **44% of cues name a body part.** That is not automatically wrong (the evidence for external
   superiority is contested and small, see 3.1), but it means the corpus has no consistent stance
   today. The external default should be applied at authoring time, per movement, with the internal
   variant kept where 3.1 says it belongs.
4. **ALL-CAPS emphasis is screen-only.** `speechSynthesis` reads "knee UP" exactly like "knee up",
   so a quarter of the corpus loses its emphasis the moment it is spoken. Emphasis for the voice
   channel needs either sentence restructuring (put the emphasised word last) or nothing. Do not
   invent SSML; `speech.ts` speaks plain strings by design.

**Summary in one line: BodyT has good technique CONTENT, a working voice channel, and zero
technique POLICY.**

---

## 3. CUE SELECTION POLICY

### 3.1 What the attentional-focus evidence actually supports

| claim | status | source |
|---|---|---|
| External focus (on the movement effect: the floor, the bar, the box) beats internal focus (on body parts) for performance and learning | **Contested.** The consensus meta-analysis says yes and says it holds across age, health status and expertise [S1]. The Bayesian re-analysis of those same seven meta-studies finds publication bias in every analysis and bias-corrected effects of g = 0.01 to 0.15, with Bayes factors favouring the null [S2] | S1, S2 |
| The mechanism is the constrained action hypothesis: consciously steering body segments couples them and interferes with automatic control | Theory, widely used, not independently established. It is a story that fits, not a measured cause | S6 |
| In RESISTANCE training specifically, external focus helps acutely | Evidence, modest: strength SMD 0.34 (0.22 to 0.46) [S3], reps-to-failure d 0.58 (0.34 to 0.82) [S4] | S3, S4 |
| External focus improves long-term strength gains | **Not shown overall** (SMD 0.32, CI crosses zero, 3 studies). Lower-body subgroup does reach significance (0.47) | S3 |
| Applies to hypertrophy | **No.** The single study to test it favoured INTERNAL focus. The meta-analysts explicitly warn against generalising | S3 |
| Applies to isolation work | Untested. All the endurance studies were multi-joint; the strength authors suspect the benefit belongs to complex multi-muscle coordination | S3, S4 |
| Farther external referents beat nearer ones | Only in experienced lifters (SMD 0.5). In novices there is no difference (SMD 0.1, ns) | S5 |
| Novices are hurt by internal, step-by-step attention | **Contested and important.** The choking literature says the opposite: step-by-step monitoring disrupts EXPERTS while novices have been shown to benefit from it [S7, S8]. Wulf argues the "novices need internal" belief is folklore [S6]. Both positions are in print and neither has been retired | S6 vs S7, S8 |
| Special populations | Older adults: over 60% of 18 studies favour external, but the locomotion advantage is smaller than the general literature implies [S22]. Parkinson disease: external helps postural control, with some work locating the benefit specifically in patients with a fall history, i.e. a subgroup effect [S23] | S22, S23 |

**What BodyT should conclude.** Prefer external phrasing by default, because it is free, it is at
worst neutral, and the acute resistance-training results are the better-supported half. Do NOT
build any mechanism whose value depends on the external-focus effect being real and large. Do NOT
tell users that a phrasing choice will change their results. Keep internal phrasing available for
two cases where the evidence is genuinely unsettled or points the other way: isolation work aimed
at hypertrophy, and a true first-timer who cannot yet find the muscle at all.

### 3.2 How many cues a person can hold

- Focus-of-attention capacity averages about **4 chunks**, and Miller's 7 was never a measured
  limit [S10]. That is the ceiling for a person sitting still with nothing else to do.
- A lifter between sets is already spending chunks on the rep target, the weight, the clock, the
  room, and their own breathing. BodyT's own rest screen adds up to four interactive asks on top.
- One analogy carries movement information as a single chunk, where a list of rules costs one chunk
  each; analogy learners accumulate fewer explicit rules and hold up better under a second task [S9].

**HOUSE HEURISTIC (the cue budget), all limits shrink-only:**

| scope | limit |
|---|---|
| per set position | **1** spoken cue, maximum |
| per exercise per session | 2, and only if the second is a different KIND (setup at the gate, pacing at rest) and lands at a different moment |
| per session | 3 distinct cues total, across all movements |
| a first-ever session on a movement | **exactly 1**, chosen by the movement's `teachingOrder`, and repeated verbatim rather than replaced |
| beginners (`trainingAge` new, or exposures < 3) | never 2 at once, regardless of triggers |

A second cue in the same breath is not twice the coaching. It is one cue plus noise, and the
noise wins.

### 3.3 The inputs BodyT can actually observe, without a camera

Everything below is on disk today. Nothing here requires a new sensor.

| input | derivation | what it is evidence OF |
|---|---|---|
| training age | `plan.experience` (new / returning / casual / trained) | prior probability that a movement is unfamiliar. Weak on its own: a trained lifter can be new to one lift |
| exercise novelty | count of non-skipped `ExerciseLog`s for that `exerciseId` across `data.sessions` | the only per-movement familiarity signal that exists |
| movement difficulty | `MOVEMENT[id].skill` 0-3 and `.level` | how much teaching this movement is known to need |
| recent shortfalls | `SetLog.achieved` present and below target, over the last N comparable exposures | the ask was not met. Cause is ambiguous: load, fatigue, technique, or a bad day |
| RIR answers | `ExerciseLog.rir` | whether the shortfall was effort or something else. RIR 3 with a shortfall is not a strength problem |
| how it felt | `ExerciseLog.feel` ('easy' / 'right' / 'hard'), `SessionLog.feel` | day-level context that must gate cue delivery, not drive it |
| pain flags | `FatigueNote.reason === 'pain'` on that exerciseId, plus `Prefs.limitations[].joints` and `Prefs.blocked[].reason === 'hurts'` | a hard routing signal. Never a cue trigger by itself, see 3.6 |
| form-failure flag | `FatigueNote.reason === 'form'` | the ONLY explicit self-report about technique the app collects, and the highest-value cue trigger it has |
| previous cue exposure | (does not exist yet; section 5 adds it) | anti-repeat, fading, retirement |
| session position | `current.exIdx`, `current.setIdx` in FocusView | late-session cues compete with fatigue and are worth less |
| session fatigue | `readiness.flags`, `intensity` ('lighter' / 'minimum'), `dayLoad[date] === 'trimmed'`, accepted ease offers | on a downgraded day, coaching load should drop with training load |

### 3.4 The selection algorithm

Deterministic, filter then rank then take one. Same shape as the existing engines so a golden
test can pin it.

```
selectCue(exerciseId, user, sessionSoFar, position) -> Cue | null

1. HARD FILTERS (any hit removes the candidate)
   - safety: candidate contradicts an active Prefs.limitation or R6 rule
   - retired: this (exerciseId, cueId) pair is in the retired set (section 5)
   - cooldown: shown for this pair within its cooldown window
   - budget: session cue count already at 3, or exercise count already at 2
   - mode: soundMode is 'silent' or 'beeps' (screen-only cues still allowed)
2. TRIGGER MATCH (a candidate must have at least one live trigger)
3. RANK by priority ladder (3.5), tie-break by lowest exposure count, then by cueId
   (alphabetical) so the output is stable and snapshot-testable
4. TAKE ONE. Returning null is a normal, common, correct answer.
```

### 3.5 The priority ladder

Highest first. The first live rung wins and the rest are discarded, not queued.

| rung | trigger | what gets said | why it outranks the rest |
|---|---|---|---|
| 1 | first-ever exposure to a movement with `MOVEMENT.skill >= 2` | the movement's single `teachingOrder[0]` cue, at the gate | a person who has never done it needs the one thing that makes the rep a rep |
| 2 | a `FatigueNote` with `reason: 'form'` on this movement in the last 21 days, and no cue issued for it since | the cue mapped to the most likely error for that movement | the user has explicitly told us the reps got ugly. This is self-report, not our diagnosis |
| 3 | first three exposures to any movement (`exposures < 3`) | `teachingOrder[exposures]`, so the three cues arrive in teaching order | novelty, the only well-grounded reason to talk |
| 4 | shortfall pattern: 2 or more shortfalls in the last 3 comparable exposures AND the RIR answers say effort was NOT the limiter (`rir >= 2`) | a pacing or range cue | a shortfall with reps left in the tank is the one pattern that is more likely execution than load |
| 5 | returning after a layoff (>= 42 days since last exposure on a movement with `skill >= 2`) | `teachingOrder[0]` again, framed as a refresher | HOUSE HEURISTIC, aligned with the competency decay in section 7 |
| 6 | nothing | **silence** | the correct default for a trained lifter on a familiar lift |

Rungs 4 and 5 are HOUSE HEURISTIC. Rungs 1 to 3 are supported only in the weak sense that novices
are the population where instruction is uncontroversially useful; the specific thresholds are ours.

### 3.6 Four rules that are not negotiable

1. **Pain is never answered with a cue.** A `FatigueNote` with `reason: 'pain'` routes to the
   existing pain path (stop the movement, offer the regression or substitution, and after two
   weeks say plainly that this is a physio question). Coaching somebody through pain with a
   phrasing tweak is the single worst thing this feature could do.
2. **A cue never overrides a load or safety decision.** Precedent: `calibration.ts` refuses to let
   a felt-intensity answer touch a calorie number, because one is a preference and the other is a
   physical claim. Same fence here.
3. **Cues are suggestions in the standing sense.** They are said or shown; nothing about the plan,
   the load, or the reps moves because a cue was issued.
4. **Never phrase a cue as an observation.** BodyT cannot see the lift. "Your knees are caving" is
   a lie the app is not entitled to tell. "Knees out over your toes" is a reminder and is fine.
   Section 6.4 makes this a guard test.

### 3.7 Cue phrasing standard

Shape: **verb, external referent, one target.** Under 80 characters (the existing `CUE_MAX`),
under 12 words for voice. Casual. No jargon that `speakable()` cannot already expand.

| situation | good (external) | avoid |
|---|---|---|
| goblet squat, first time | "Push the floor away." | "Contract your quadriceps concentrically." |
| RDL, first time | "Slide the bells down your legs." | "Maintain a neutral lumbar spine through hip flexion." |
| bench, shortfall with reps left | "Drive the bar to the ceiling, fast." | "Focus on your pec contraction." |
| box jump | "Land quiet." | "Absorb through your ankles, knees and hips in sequence." |
| pull-up | "Pull your chest to the bar." | "Depress and retract the scapulae, then adduct the humerus." |
| lateral raise (isolation, hypertrophy) | internal is allowed here: "Feel the side delt do the work." | (nothing; this is the documented exception) |
| after a form note | "Slow the way down. Two counts." | "You are losing control of the eccentric." |

Length check against the real budget: at `say()`'s default rate of 1.0, `speech.ts:66-68` estimates
`words / 2.8` seconds plus 0.7 s. A 10-word cue is about 4.3 s of speech. See section 8.3.

---

## 4. FEEDBACK TIMING AND FREQUENCY

### 4.1 What the evidence says about WHEN and HOW OFTEN

| claim | status | source |
|---|---|---|
| Frequent immediate feedback helps practice but degrades learning (guidance hypothesis) | **The classic claim** [S12], and **not supported** by the current meta-analysis: 61 papers, k = 75, N = 2228, no significant effect of reduced frequency at any time point and no acquisition-to-retention reversal [S11] | S11, S12 |
| Faded schedules are therefore mandatory | **No.** Do not justify fading on learning grounds. Fade for attention cost, credibility and repetition fatigue, which are product reasons and are ours to own | S11 |
| Learner-controlled feedback beats imposed schedules | **Contested but the best of the options.** Retention SMD 0.63, transfer 0.68 [S14]; the same literature is shown to be inflated by reporting bias and low power [S15]. Even discounted, "give it when they ask" is the cheapest and least intrusive policy |S14, S15 |
| Bandwidth feedback: speak only when error leaves a tolerance band | Evidence, and structurally perfect for BodyT: it yields both error reduction and steadier retention performance versus matched-frequency controls [S13] | S13 |
| Feedback during resistance training improves output | Evidence: about +8.4% acute barbell velocity, better endurance, motivation and effort; chronic feedback improves speed, strength, jumps and technical competency; visual beats verbal; every-rep frequency is best for ACUTE output [S16, S17] | S16, S17 |
| Therefore BodyT should talk every rep | **No.** S16 is about objective performance feedback (velocity, load, reps) from a sensor. BodyT has no velocity sensor, and verbal technique instruction is a different intervention. Borrowing the frequency recommendation across that gap would be a category error |

### 4.2 The three slots BodyT owns

| slot | code | current contents | what technique may add |
|---|---|---|---|
| **Before the set** ("go" gate) | `FocusView.tsx:298-322` | set intro, full on set 1 and count-only after; weight prompt | **1 cue**, set 1 only, only when a rung 1, 2, 3 or 5 trigger is live. Appended to the set-1 intro so it is one utterance, not two |
| **Between sets** (rest screen) | `BreakScreen.tsx` | "Rest. Next: X, Y." then "Ready?"; weight stepper; ease offer; session-feel ask; EffortAsk shortfall and RIR | **at most 1 cue**, and only on a bandwidth breach (4.4). Never on the same rest as the session-feel ask or the RIR ask |
| **After the session** | debrief (`engine/debrief.ts`, `plan/debrief.ts`) | recap, recovery, eat, sleep, tomorrow | **at most 1 technique line**, and only where the log supports it. This is the right home for anything that is a pattern rather than a moment |
| **On demand, any time** | `speakInstructions` via STEPS tap or "how do I" | `shortHowTo(def)` | **unchanged and protected.** This is the self-controlled channel [S14] and it has the best evidence of anything in this section. It should get MORE discoverable, not replaced |

### 4.3 The rest screen is the natural slot, and it is nearly full

Concrete budget, from the code:

- The screen already speaks two lines: "Rest. Next: NAME, SET LABEL." at t=0 and "Ready?" at
  t=rest. Both are load-bearing (the second exists because "the coach talks you into the rest and
  then goes silent at the one moment you are waiting to be told to move").
- Shortest non-zero catalog rest is 30 s (5 movements); the two most common are 90 s (46) and
  120 s (44). 10 movements have `restSec: 0` and get no rest screen at all.
- **HOUSE HEURISTIC placement:** a technique line may be spoken **once**, starting no earlier than
  3 s after the "Rest. Next" line finishes and finishing no later than `restSec - 15` s. On a 30 s
  or 45 s rest, do not speak a cue at all; show it on screen instead.
- **Never stack.** If `easeOffer`, `askSessionFeel` or `askRir` is showing on this rest, the cue is
  suppressed for this rest and its cooldown is not consumed. Those three are asks the engine
  needs answered; a cue is optional and yields.
- The screen-only path costs nothing and should be used far more often than the spoken path: one
  short line under the "next up" block, no audio.

### 4.4 Bandwidth rule: what counts as leaving the band

Cue between sets only when at least one is true for the movement just finished [S13]:

- a shortfall was logged (`SetLog.achieved` present and below target) AND `rir >= 2` where known,
- an ease offer was accepted on this movement,
- a `FatigueNote` with `reason: 'form'` was just written,
- this is the movement's first ever exposure and set 1 just finished.

Inside the band (set cleared, or shortfall explained by effort) the correct output is silence.

### 4.5 The fade schedule

HOUSE HEURISTIC, justified by attention cost and trust rather than by the guidance hypothesis
[S11], shrink-only:

| exposures to this movement | gate cue | rest cue |
|---|---|---|
| 1 to 3 | every session, `teachingOrder[n]` | on bandwidth breach |
| 4 to 8 | every other session | on bandwidth breach |
| 9+ | trigger only (rungs 2, 4, 5) | on bandwidth breach |
| any, after 42 days away | one refresher, then resume the ladder at 4 to 8 | unchanged |
| any, `trainingAge === 'trained'` and no breach in 3 exposures | none | none |

The on-demand path is never faded, never rate-limited, and never counts against the session budget.

---

## 5. CUE OUTCOME TRACKING

A cue is an intervention, so it obeys the intervention rules R3 already established: pre-register
the metric and window when it is issued, isolate one open cue per movement, compare like with like,
make sure it CAN fail, and say so out loud when it did not work. This section makes that concrete
for cues and mirrors the shape of `engine/calibration.ts`.

### 5.1 What can and cannot be observed

**Observable, from logs alone:**

| signal | field | reads as |
|---|---|---|
| set cleared | `SetLog.achieved` absent (absent means the target was met) | the ask was met |
| shortfall size | `target - achieved` | how far off |
| shortfall rate | shortfalls / sets over the window | the main outcome metric |
| within-exposure consistency | spread of `achieved` across the sets of one exposure | whether the movement fell apart late |
| effort | `ExerciseLog.rir`, `ExerciseLog.feel` | whether a shortfall was effort or something else |
| self-reported breakdown | `FatigueNote.reason === 'form'` | the closest thing to a technique observation the app has |
| pain | `FatigueNote.reason === 'pain'`, new `Prefs.limitation` | a stop signal, never an outcome to optimise |
| help-seeking | STEPS taps and "how do I" requests on that movement | did they still need the instructions |
| completion | `ExerciseLog.skipped`, session `status` | did the movement survive the day |

**Not observable, and the model must never pretend otherwise:** joint angles, bar path, depth,
tempo actually used, whether the user even heard the cue, and whether they did what it said. There
is no camera and there is no wearable in scope.

**Therefore the verdict is always "did the numbers move after we said this", never "did their form
improve".** The ledger stores the first sentence. The user-facing line says the first sentence too.

### 5.2 The ledger record

New store slice, keyed off the existing coach memory rather than a parallel store. Shape mirrors
`surfacedInsights: Record<ruleId, ISODate>` and R3's B1 decision log.

```ts
// proposed: src/store/schema.ts addition + type in a new src/coachTypes.ts or sessionTypes.ts
export interface CueIssue {
  cueId: string
  exerciseId: string
  issuedAt: ISODate
  slot: 'gate' | 'rest' | 'debrief' | 'on-demand'
  /** Which ladder rung fired it, so a bad rung can be found later. */
  trigger: 'first-exposure' | 'form-note' | 'novelty' | 'shortfall-pattern' | 'layoff'
  /** PRE-REGISTERED at issue time, never chosen afterwards. */
  metric: 'shortfall-rate' | 'form-notes' | 'set-consistency' | 'completion'
  /** Comparable exposures to wait before judging. */
  window: number
  baseline: number
  /** Filled when the window closes. */
  outcome?: number
  verdict?: 'helped' | 'no-change' | 'worse' | 'unattributable'
}

export interface CueMemory {
  /** Append-only. Trimmed by age, never edited; a correction is a new row. */
  issues: CueIssue[]
  /** `${exerciseId}:${cueId}` -> last shown date. Same idea as surfacedInsights. */
  lastShown: Record<string, ISODate>
  /** `${exerciseId}:${cueId}` -> date retired. Presence blocks selection. */
  retired: Record<string, ISODate>
}
```

Everything is optional-with-defaults so old saves read clean, exactly as `SetLog.achieved` was
introduced. `on-demand` issues are RECORDED but never judged: the user asked, so the app did not
choose, and a self-selected exposure is not evidence about the cue.

### 5.3 Comparable exposures (borrowed verbatim from R3)

An exposure counts toward baseline or outcome only if: same `exerciseId`; not `skipped`; the sets
are not `light`; the session was not readiness-downgraded, `intensity: 'lighter' | 'minimum'`, or
`dayLoad === 'trimmed'`; and the session was not trimmed past this exercise's index. Softened
sessions are excluded from BOTH sides or the comparison is meaningless.

### 5.4 Minimum evidence before any verdict

```
MIN_CUE_EXPOSURES = 3     // comparable exposures inside the window
MIN_SETS_FOR_RATE  = 6    // sets underneath those exposures, or the rate is noise
COOLDOWN_DAYS      = 7    // same (exercise, cue) may not repeat inside a week unless a rung 1 or 2 trigger fires
RETIRE_WEEKS       = 8    // how long a retired cue stays retired
MAX_CONSECUTIVE    = 3    // a cue may not be delivered on more than 3 consecutive exposures, verdict or no verdict
```

These are HOUSE HEURISTIC and deliberately in the same family as the numbers already in the repo:
`calibration.ts` uses `MIN_BIAS_SAMPLES = 3` and `MIN_ACTIVITY_SAMPLES = 4`; `fatigue.ts` uses
`PATTERN_COUNT = 2` and `RECENT_DAYS = 21`; `phase.ts` uses `MIN_SESSIONS_TO_JUDGE = 8`. Three is
the smallest number that can distinguish a pattern from a bad day, which is the same argument
`fatigue.ts` already makes in its own comment.

### 5.5 Verdict rule

At window close, for the pre-registered metric only:

| condition | verdict |
|---|---|
| metric improved by at least one meaningful step (shortfall rate down by >= 1/3 of baseline, or form notes go to zero) | `helped` |
| metric within +/- 1/3 of baseline | `no-change` |
| metric worse by more than 1/3, or a new form or pain note appeared on the movement | `worse` |
| a second cue was issued on the same movement inside the window, or the load changed by more than one step, or fewer than `MIN_CUE_EXPOSURES` comparable exposures accumulated within 6 weeks | `unattributable` |

`unattributable` will be the most common verdict in real use, and that is fine. It must be as easy
to record as success, and it must never be quietly upgraded to `helped`.

### 5.6 Retirement (the rule that stops a cue repeating forever)

- `no-change` or `worse` at window close: retire `(exerciseId, cueId)` for `RETIRE_WEEKS` and let
  selection fall through to the next candidate in `teachingOrder`.
- Retired twice for the same pair: retired permanently for that pair. Do not delete it from the
  catalog; other users and other movements still use it.
- `worse` with a new form or pain note: retire immediately, do not wait for the window, and hand
  off to the regression path (section 6).
- Regardless of verdict, `MAX_CONSECUTIVE = 3`. A cue given three sessions running with nothing
  moving is a cue that is not landing, and the fourth repetition costs credibility.
- Every cue candidate must have at least one reachable `no-change` path. If the ledger cannot
  express a failure for a cue, that cue does not ship. (R3 rule 4, carried over.)

### 5.7 The self-explaining line

`calibration.ts` ends with `calibrationNote()`, on the principle that "an adjustment nobody can see
is indistinguishable from a bug". Cues owe the same:

- retiring one: "You have heard that one a few times and nothing changed, so let's try something
  else."
- when a cue looks like it helped: "Since we started saying that, you have hit every set on this
  one." Never "your form improved".
- when the evidence is thin: say the count. "Two sessions in. Give it one more before we call it."

### 5.8 Hard fences

1. A cue verdict may change **which cue is said next** and nothing else. It may never touch load,
   reps, volume, exercise selection, or safety routing. This is the `calibration.ts` precedent: a
   felt answer moves a band, never a physical claim.
2. Never claim causality to the user. Load progression, accumulated exposure, sleep, deloads and
   plain regression to the mean all move a shortfall rate. The ledger is a routing memory, not a
   finding.
3. Cue history is not a competence score and must not be read as one by section 7.
4. Performance is a real constraint: the ledger walk must be memoised on the `AppData` identity
   with a `WeakMap`, exactly as `personalBand` does (`calibration.ts:169-176`), because screens
   call this per row.

---

## 6. TECHNIQUE MODELS

### 6.1 Where it lives

A **sidecar table**, not a fork of `ExerciseDef` and not a growth of `movement.ts`:

```
src/plan/technique.ts   ->  export const TECHNIQUE: Record<string, TechniqueMeta>
```

This is the pattern the repo already uses five times (`equip.ts`, `muscles.ts`, `demos.ts`,
`demoPhotos.ts`, `videoMap.ts`) and the pattern R-ONT chose for `capability.ts`, `prescription.ts`
and `provenance.ts`. It keeps `types.ts` (705 lines, at its allowance) and `movement.ts` (487)
untouched, keeps the file under the 600-line `HARD_MAX` by splitting per pattern family if it grows
(`technique.ts` re-exporting `techniqueSquat.ts` and friends, exactly as `exercises.ts` does), and
lets B3 later serve the table from IndexedDB without changing any consumer.

### 6.2 What a technique record holds, beyond today's prose

```ts
export type EvidenceStrength =
  | 'mechanical'   // a definitional property of the movement (a squat that does not bend the knees is not a squat)
  | 'consensus'    // coaching consensus, no trial evidence
  | 'house'        // our judgement, thin or absent evidence, MUST be labelled

export interface TechniqueError {
  id: string
  /** Plain language, shown to the user only inside the guide sheet. */
  label: string
  /** Honest. Often "mostly it just costs you reps", and that is the correct answer. */
  cost: 'reps' | 'stimulus' | 'load-limit' | 'joint-load'
  evidence: EvidenceStrength
  /**
   * What the LOG would look like if this error were happening, or 'none'.
   * 'none' is the common case and must be allowed: most errors are invisible
   * to a phone in a pocket.
   */
  observableProxy:
    | 'none'
    | 'shortfall-late-sets'      // reps fall off across sets
    | 'shortfall-with-rir-left'  // missed the ask with reps in the tank
    | 'form-note'                // the user said "form" in the can't-finish sheet
    | 'ease-accepted'            // they took the load cut
    | 'stalled-load'             // no load progress across a phase window
  /** External phrasing first. Internal is an explicit alternative, not a fallback. */
  cues: { external: string; internal?: string }
  /** MUST resolve to an existing catalog id, and normally to MOVEMENT[id].regressions. */
  regressionId?: string
}

export interface TechniqueMeta {
  /** Ordered setup checklist. Two to four items. Used at the gate on exposure 1. */
  setup: string[]
  /** What each phase demands, in the app's own vocabulary. */
  phases: { lower?: string; bottom?: string; drive?: string; top?: string }
  /** What makes a rep count. The honest floor, not an ideal. */
  range: { counts: string; floorNote?: string }
  /** Teaching default only. Prescribed tempo stays prescription-side (R-ONT). */
  tempoDefault?: string
  bracing?: string
  breathing?: string
  errors: TechniqueError[]
  /** Cue ids in the order a first-timer should hear them, one per exposure. */
  teachingOrder: string[]
  /**
   * What must already be true before this movement is a reasonable ask.
   * Points at R-ONT's CapabilityDemands and at MOVEMENT.regressions, so the
   * prerequisite is checkable rather than decorative.
   */
  prerequisites?: { movementIds?: string[]; capability?: string[] }
}
```

Three rules on the data:

1. **Every correction resolves to a lever BodyT actually has**: a cue string, a `regressionId` that
   exists in the catalog, a load cut, or a stop. A "fix" with no lever is documentation wearing a
   schema.
2. **`errors[].evidence` is mandatory.** Any error whose stated justification is injury prevention
   must be `house` unless it carries a citation, per 6.4.
3. **`cost` is the honest field.** Most technique errors cost reps or stimulus. Reaching for
   `joint-load` should be rare and should be argued.

### 6.3 Relationship to what exists

| existing | technique record does |
|---|---|
| `ExerciseDef.steps` | stays. `setup` and `phases` are the machine-readable slice of the same knowledge, not a replacement. Do not duplicate the prose |
| `ExerciseDef.mistakes` | stays as user-facing prose. `errors[]` is the structured version and should be DERIVED from the same authoring pass so the two cannot drift. A test should assert every `mistakes` entry has a matching `errors` id or is explicitly marked prose-only |
| `ExerciseDef.cue` | becomes the default `teachingOrder[0]` for the 129 movements that have one. The 65 without one are the authoring backlog |
| `MOVEMENT.skill`, `.level`, `.regressions` | consumed, not copied. `prerequisites.movementIds` should be a subset of the movement graph or the build fails |
| R-ONT `CAPABILITY` | consumed by `prerequisites.capability` |

### 6.4 The honest boundary

**BodyT is not diagnosing form it cannot see.** This is not humility for its own sake, it is the
evidence:

- Training people in lifting technique has **no demonstrated effect on preventing back pain or
  disability**, in randomised trials and in cohorts [S18]. A whole industry says otherwise.
- Greater lumbar flexion during lifting is **not** an established risk factor for low back pain and
  does not distinguish people with and without it (low-quality evidence, 9 of 11 studies found no
  group difference) [S19, corroborated narratively by S24].
- Resistance training's baseline injury rate is low: about 0.24 to 1 injury per 1000 hours for
  bodybuilding-style training, below running, with shoulder, spine and knee the common sites
  [S20, S21].

So the honest position: most technique cues in a general-population lifting app buy **reps,
stimulus and confidence**, and the injury-prevention claim is largely unsupported. Sell them as
what they are.

Concrete rules, each testable:

| rule | test |
|---|---|
| No cue or technique string may assert an observation about the user's body | banned-phrase guard: `/your (knees|back|hips|shoulders|form) (is|are|was|were|keeps|keep)/i` and second-person present-tense body claims, over `TECHNIQUE` and `EXERCISES` |
| No cue or mistake string may claim injury prevention without a citation | any string matching `/injur|hurt yourself|damage|wreck your/i` must sit on an error whose `evidence` is not `house` and which carries a source ref |
| No technique record may claim to know what the user did | `observableProxy: 'none'` is legal and expected; a proxy that is not in the enum fails the build |
| Pain never routes through technique | any `TechniqueError` with `cost: 'joint-load'` must carry a `regressionId`, because the answer to a joint complaint is a different movement, not better words |

What the app may say: "here is what makes this rep count", "here is the thing most people get wrong
first", "you told me the reps got ugly, so try this". What it may not say: "your form is breaking
down", "this will keep you safe", "doing it wrong will injure you".

---

## 7. COMPETENCY WITHOUT A CAMERA

### 7.1 What it is, and what it is called

Not "form score". The thing BodyT can build is a claim about the LOG, so name it for the log:

```
MovementFamiliarity = 'unseen' | 'learning' | 'steady' | 'owned'
```

Four states on purpose, matching the shape of `TrainingAge` (`plan/milestones.ts:29`), which the
codebase already argues for: four coarse tiers that a human can reason about beat a continuous
score nobody can interpret. A number invites the user to read it as a grade, and a grade about
technique is precisely the claim BodyT is not entitled to make.

### 7.2 Inputs, all already on disk

| input | derivation |
|---|---|
| exposures | count of non-skipped `ExerciseLog`s for the id, across `data.sessions` |
| clean exposures | exposures where no `SetLog.achieved` is below target |
| consecutive clean | run length of the above, most recent first |
| shortfall rate | shortfall sets / total sets over the last 6 comparable exposures |
| form notes | `FatigueNote` with `reason: 'form'` on this id, within `RECENT_DAYS` (21, already defined in `fatigue.ts`) |
| pain notes | same with `reason: 'pain'`, plus `Prefs.blocked` with `reason: 'hurts'` |
| effort plausibility | presence and range of `ExerciseLog.rir` answers |
| load trend | the phase verdict machinery (`phase.ts`, `earned` / `stalled` / `untested`) |
| recency | days since last exposure |
| help-seeking | STEPS taps and "how do I" requests on this movement (needs one new counter) |

### 7.3 The state machine

HOUSE HEURISTIC throughout. Thresholds chosen to sit in the same family as the repo's existing
constants and are shrink-only.

| state | entered when | meaning |
|---|---|---|
| `unseen` | zero exposures | we know nothing. Cold start for everything |
| `learning` | 1 to 3 exposures, OR any form note in the last 21 days, OR shortfall rate > 0.34 | the movement is still being figured out |
| `steady` | >= 4 exposures AND >= 2 consecutive clean exposures AND no form or pain note in 21 days | the ask is being met repeatedly |
| `owned` | >= 8 exposures AND >= 4 consecutive clean AND load or reps progressing (`phase.ts` verdict not `stalled`) AND no form or pain note in 42 days | the movement is not the limiting factor any more |

Decay, because familiarity is perishable and a stale claim is worse than no claim:

- 42 days with no exposure: `owned` falls to `steady`, `steady` falls to `learning`.
- The repo's own layoff constants are the anchor, not a new set: `reps.ts` uses `STALE_DAYS = 21`
  (past three weeks a rep target stops being true) and `LAYOFF_STEP_DAYS = 28` (one step of load
  handed back per further four weeks, capped at `MAX_STALE_STEPS = 3`). Familiarity decay should
  use the same 21 and 28 rather than inventing a third clock: 21 days idle holds the state, 42
  days (two layoff steps) drops one rung, 84 days drops everything above `unseen` to `learning`.
- Any new form or pain note drops the state one rung immediately, no window.

Self-report at onboarding may seed `learning` ("done this one before?") and **may never seed
`steady` or above**. Saying you can squat is not evidence that you met the ask.

### 7.4 How it gates progression (connects to R9 skill gates and J2 promotion)

The rule is an AND, and it can only ever say no:

```
mayPromote(fromId, toId) =
      existing J2 evidence (rep-max series gain >= REP_GAIN_TO_PROMOTE, or GAIN_TO_PROMOTE
          on load, over MIN_SESSIONS_TO_JUDGE exposures)
  AND familiarity(fromId) >= 'steady'
  AND no form or pain note on fromId in 21 days
  AND MOVEMENT[toId].skill <= skillCeiling(familiarity(fromId), trainingAge)
```

with, as a starting table (HOUSE HEURISTIC):

| familiarity of the source movement | highest `MOVEMENT.skill` it may unlock |
|---|---|
| `learning` | 1 |
| `steady` | 2 |
| `owned` | 3 |

Two properties matter more than the numbers:

1. **Competency never promotes on its own.** It is a veto layered on top of the performance
   evidence J2 already computes. Promotion still requires the reps or the load.
2. **A veto must be explainable.** When it blocks, the reason has to be a sentence made of things
   the user did: "You have hit every set on the goblet squat twice in a row now. One more clean one
   and I will offer you the front squat." Never "your competency score is 0.62".

Where R9 defines skill gates for the movement graph (the movement side), this is the per-user side
of the same gate. `MOVEMENT.skill` says how much coaching a movement needs; familiarity says how
much of that this person has demonstrably absorbed. Neither is a claim about their body.

### 7.5 What it must never claim

- Never that technique is good, correct, safe, or improving. It measures whether the ask was met.
- Never that the user is ready for something not in evidence: `owned` on goblet squats says nothing
  about a barbell back squat beyond what the movement graph's `progressions` edge already says.
- Never that a movement is safe for them. Safety routing belongs to R6 and to `Prefs.limitations`,
  and competency must not be able to override either.
- Never a number in the UI. Copy shows counts of things that happened ("eight clean sessions"),
  not a derived score.
- Never a permanent record of failure. Decay works downward AND the state recovers on evidence; a
  bad month must not brand a movement forever.

---

## 8. EXPLANATION LAYER LINK (feeds J10)

### 8.1 Two artefacts, never one

Per the EXPLAIN contract in BODYT_STATE.md section 1, the machine rationale is stored separately
from the sentence, and the sentence preserves the true reason and the uncertainty.

| artefact | contents | who reads it |
|---|---|---|
| **machine rationale** | `{ cueId, exerciseId, rung, trigger, exposures, shortfallRate, rirKnown, formNotes21d, familiarity, cueVersion }`. Values, not prose | the ledger (5.2), tests, future debugging, B1's decision log |
| **spoken or shown sentence** | one line, generated from a template keyed by `trigger`, filled only with numbers the user themselves produced | the user |

The sentence is derived from the rationale. It is never the source of truth, and it never invents a
number that is not in the rationale.

### 8.2 Sentence templates, by trigger

Short, casual, no jargon, no em dashes, and each one states its own evidence.

| trigger | template | example |
|---|---|---|
| `first-exposure` | "First time on this one. {cue}" | "First time on this one. Push the floor away." |
| `novelty` | "{cue}" (no preamble; they already know it is new) | "Slide the bells down your legs." |
| `form-note` | "You said the reps got ugly last time. {cue}" | "You said the reps got ugly last time. Slow the way down, two counts." |
| `shortfall-pattern` | "Two short sets here lately, with reps left in the tank. {cue}" | "Two short sets here lately, with reps left in the tank. Drive the bar up fast." |
| `layoff` | "Been a while on this one. {cue}" | "Been a while on this one. Push the floor away." |
| retiring a cue | "You have heard that one a few times and nothing moved. Trying something else." | as written |
| a cue that looks like it landed | "Since we started saying that, you have hit every set here." | as written |
| thin evidence | "Two sessions in. One more before I call it." | as written |

Uncertainty rule: where the trigger rests on fewer than `MIN_CUE_EXPOSURES` observations, the
sentence says the count. It never upgrades a hunch into a finding.

### 8.3 Length budget, from the repo's own numbers

`speech.ts:66-68`: `estimateMs = max(1200, words / (2.8 * rate) * 1000 + 700)`, default `rate = 1.0`.

| line | words | spoken |
|---|---|---|
| 8 words | 8 | about 3.6 s |
| **12 words (the cap)** | 12 | **about 5.0 s** |
| 20 words | 20 | about 7.8 s |

Rest-screen arithmetic on the tightest slot that still gets a spoken cue (45 s):

```
"Rest. Next: NAME, SET LABEL."      about 4 s
gap                                        3 s
technique line (12 words max)          <= 5 s
silence margin before "Ready?"            15 s
                                    ------------
                                       27 s of 45 s
```

Rules that fall out:

- **Voice cue cap: 12 words, about 5 seconds.** Screen cue cap stays the existing `CUE_MAX = 80`
  characters, which is already tested in `visuals.test.ts`.
- **No spoken cue when `restSec < 45`.** Show it on screen instead. That covers the 30 s and 45 s
  tail plus the 10 movements at `restSec: 0`.
- **A trigger preamble plus a cue must still fit 12 words total.** If it does not, drop the
  preamble for voice and keep it on screen. The cue is the payload.
- `speakable()` already expands DB, RDL, RPE, units and ranges, so cue text may use screen
  shorthand and still be sayable. New cue strings must be run through `speakable()` in a test, the
  same way prescriptions are.

### 8.4 What J10 gets from this pack

1. A second content pool with real per-user variation, which is directly aimed at the measured
   explain ceiling (1,742 lines shown over 8 simulated weeks, only 181 distinct).
2. Templates that are keyed by TRIGGER rather than by exercise, so distinctness scales with the
   number of situations rather than the number of movements.
3. A jargon surface that is already bounded: cue strings are short, tested for length, and pass
   through `speakable()`.
4. The rationale/sentence split, implemented once, in a place where the rationale is small and the
   sentence is one line. It is a good first customer for that contract.

---

## 9. EVAL FIXTURES

Eighteen table tests, written to be portable into a new `engine/cueing.test.ts` plus additions to
`plan/data.test.ts`, `plan/visuals.test.ts` and `e2e/voicetip.spec.ts`. Each is a state on disk, a
required decision, and the thing it must NOT do. "Says" means one line, spoken or shown.

| # | state on disk | expected decision | must NOT |
|---|---|---|---|
| **F1 first-ever squat session** | `trainingAge: 'new'`, zero `ExerciseLog`s for `goblet-squat`, `MOVEMENT.skill = 1`, session about to start | Exactly ONE cue, at the gate, `teachingOrder[0]`, appended to the set-1 intro. Trigger `first-exposure`. Rest screen stays silent on cues for this exercise all session | Speak two cues; read the `mistakes` list; speak anything on sets 2 and 3; put a cue on the rest screen as well as the gate |
| **F2 experienced lifter, familiar lift, clean** | `trainingAge: 'trained'`, 40 exposures to `flat-db-press`, last 6 all clean, no notes | `selectCue` returns `null`. Total silence on technique | Emit a "keep it up" line; emit a cue because one exists in the catalog; consume a cooldown |
| **F3 knee pain logged twice** | two `FatigueNote { exerciseId: 'walking-lunge', reason: 'pain', regions: [...] }` inside 21 days | Zero cues for that movement. Route to the existing pain path: offer the regression from `MOVEMENT.regressions`, and after two weeks the physio sentence `adapt.ts` already writes. Familiarity drops one rung | Suggest a technique fix for pain; say "with better form this will stop"; keep offering the movement with a cue attached |
| **F4 cue given three sessions running, nothing changed** | `CueIssue` for `(db-rdl, hinge-back)` on 3 consecutive comparable exposures, shortfall rate unchanged (0.33 to 0.30) | Verdict `no-change` at window close. Retire the pair for 8 weeks. Next exposure selects `teachingOrder[1]`. Say the retirement line once | Deliver a fourth time; silently swap without a word; mark it `helped` because the rate ticked down by 0.03 |
| **F5 beginner, two triggers fire at once** | `trainingAge: 'new'`, exposure 2 on `bulgarian-split-squat` (rung 3 live) AND a `form` note from last session (rung 2 live) | ONE cue. Rung 2 wins (higher ladder position). Rung 3's cue is discarded, not queued for later in the same session | Say both; say one then the other on the next set; count both against the exercise budget |
| **F6 advanced user, metrics not cues** | `trainingAge: 'trained'`, `familiarity('barbell-row') = 'owned'`, load progressing, no notes | No cue. The between-sets slot shows the numbers that already exist (last time's weight and reps, the rep target) and nothing else | Add a technique line to a lifter whose only signal is that they are progressing; treat "no cue available" as a gap to fill |
| **F7 voice line must fit the rest interval** | `soundMode: 'voice'`, movement with `restSec: 45`, a rung 4 trigger live, template renders to 12 words | Spoken. Starts about 3 s after the "Rest. Next" line, finishes at least 15 s before "Ready?". Estimated duration <= 5.0 s by `speech.ts` maths | Speak on a `restSec: 30` or `restSec: 0` movement; speak a 20-word line; overlap "Ready?"; interrupt the ease offer |
| **F8 short rest, screen fallback** | same as F7 but `restSec: 30` | Screen line only, no audio. Cooldown still consumed | Silently drop the cue entirely; speak it anyway because voice mode is on |
| **F9 rest screen already busy** | rung 4 trigger live, but this rest carries `askRir: true` | Cue suppressed for this rest. Cooldown NOT consumed, so it can land on the next eligible rest | Stack the cue under the RIR ask; consume the cooldown on a cue nobody received |
| **F10 shortfall explained by effort** | 2 shortfalls in 3 exposures on `incline-db-press`, `rir: 0` on both | No cue. This is a load conversation, and the load engines already own it | Fire rung 4; imply technique when the athlete simply ran out of reps |
| **F11 shortfall with reps in the tank** | 2 shortfalls in 3 exposures, `rir: 3` recorded | Rung 4 fires. One cue on the rest screen, pre-registered metric `shortfall-rate`, window 3 comparable exposures, baseline recorded at issue | Change the load; change the rep target; issue without pre-registering the metric |
| **F12 softened session must not pollute the window** | cue issued, then the next two exposures are on a readiness-downgraded day and a `dayLoad: 'trimmed'` day | Neither exposure counts toward baseline or outcome. The window stays open | Close the window on 3 exposures when 2 were softened; mark `worse` because a deload week had low numbers |
| **F13 user asks for instructions** | user taps STEPS or says "how do I" on a movement whose cues are all retired | `shortHowTo(def)` plays in full, unchanged. A `CueIssue` with `slot: 'on-demand'` is recorded but never judged | Rate-limit the on-demand path; count it against the session budget; suppress it because the cue is retired |
| **F14 65 movements with no cue** | movement whose `ExerciseDef.cue` is undefined and which has no `TECHNIQUE` entry yet | `selectCue` returns `null` cleanly. `shortHowTo` still works from `steps` alone. A data test lists the gap as a shrink-only allowlist | Throw; render an empty "Remember" slide; fabricate a cue from `mistakes` |
| **F15 layoff refresher** | `familiarity('front-squat') = 'owned'`, last exposure 60 days ago | Familiarity decays to `steady`. Rung 5 fires: one refresher cue at the gate, then the ladder resumes at the 4-to-8 band | Treat 60 days off as a first exposure; run the whole three-cue teaching sequence again |
| **F16 promotion gate blocks** | J2 rep evidence says promote `goblet-squat` to `db-front-squat`, but a `form` note was written 10 days ago | Promotion is NOT offered. The explanation names the observation: one more clean session and the offer returns | Promote anyway; block permanently; show a score; block using pain-free evidence the user never gave |
| **F17 promotion gate passes** | J2 evidence present, `familiarity = 'steady'`, no notes in 21 days, `MOVEMENT['db-front-squat'].skill = 2 <= ceiling 2` | Promotion offered as a suggestion, one tap, with its evidence | Auto-apply; require `owned` when `steady` clears the ceiling |
| **F18 no-camera claim guard** | every string in `TECHNIQUE` and every `ExerciseDef.cue` | The banned-phrase test passes: no second-person present-tense body observation, and no injury-prevention claim on a `house`-evidence error | Ship "your knees are caving"; ship "this keeps your back safe"; ship "lifting rounded will injure you" |

Three further checks that are properties, not fixtures:

- **P1 determinism.** `selectCue` over a fixed `AppData` returns the same cue id across runs and
  across process restarts. Ties break on `cueId` alphabetically. Pinned by snapshot, in the spirit
  of `goldenLife.test.ts`.
- **P2 every cue can fail.** For each candidate cue, there exists a reachable log state producing
  `no-change`. Assert by construction over the candidate table.
- **P3 budgets hold under a full simulated session.** Over the 20x8 harness, no session ever
  exceeds 3 cues, no exercise exceeds 2, and no cue is delivered more than 3 times consecutively on
  one movement.

---

## 10. INTEGRATION NOTES

No code ships from R10. This is the map for whoever picks the job up.

### 10.1 Typed shapes: extend, never fork

| shape | where | rule |
|---|---|---|
| `ExerciseDef` | `src/types.ts:29-47` | **unchanged.** `types.ts` is at its 705-line allowance and allowances shrink only. The `cue` field keeps its meaning and becomes `teachingOrder[0]` by default |
| `TECHNIQUE` | NEW `src/plan/technique.ts`, `Record<string, TechniqueMeta>` | sidecar, keyed by exercise id, same pattern as `equip.ts` / `muscles.ts` / `demos.ts` / `videoMap.ts` and R-ONT's `capability.ts`. Split per pattern family if it approaches `HARD_MAX = 600` |
| `MOVEMENT` | `src/plan/movement.ts` | **read, not extended.** `skill`, `level`, `regressions`, `progressions`, `stress` are already the right fields |
| `CueMemory` | `src/store/schema.ts` + a type file | new optional slice, defaulted, so old saves read clean. Bump `SCHEMA_VERSION` (currently 20) with a migration that inserts the empty shape. Coordinate the bump in BODYT_STATE.md section 9, per the lane rules |
| `MovementFamiliarity` | derived, NOT stored | it is a pure function of `data.sessions` plus `Prefs`. Storing it creates a second source of truth that can go stale, which is the failure `SetLog.achieved` exists to document |

### 10.2 Where the logic lives (layering is enforced)

`structure.test.ts` ranks `plan: 0`, `engine/store: 1`, `cloud/logic/platform: 2`,
`components/screens: 3`, and no file may import upward.

| module | layer | job |
|---|---|---|
| `plan/technique.ts` | plan (0) | the data. No logic, no imports from engine |
| `engine/familiarity.ts` | engine (1) | `familiarity(data, exerciseId)`, exposure counting, decay, the promotion veto. Pure, memoised on `AppData` identity with a `WeakMap`, exactly as `calibration.ts:169-176` does |
| `engine/cueing.ts` | engine (1) | `selectCue()`, the priority ladder, budgets, cooldowns, verdicts, retirement, and the `cueNote()` self-explaining line. Modelled on `calibration.ts` end to end |
| `logic/cueActions.ts` | logic (2) | writes `CueIssue` rows to the store. Nothing else writes them |
| `screens/today/*` | screens (3) | render and speak. `BreakScreen.tsx` gains one optional prop for a cue line; `FocusView.tsx` appends the gate cue to the existing set-1 intro string rather than adding a second utterance |
| `platform/speech.ts`, `speakable.ts` | platform (2) | **unchanged.** Cues go through the existing `say()` path |

`FocusView.tsx` is at a 670-line allowance with a split already owed (BODYT_STATE.md RA row). The
cue work must not add net lines there; the gate cue is a one-line string concatenation into the
existing intro, and everything else lands in `BreakScreen.tsx` or the engine.

### 10.3 What J10 implements versus what this needs first

| job | scope |
|---|---|
| **prerequisite** | authoring the `TECHNIQUE` table. 194 movements, 65 with no cue at all today. This is the long pole and it is a content job, not an engineering job |
| **J10 (explain)** | the rationale/sentence split (8.1), the trigger-keyed templates (8.2), the jargon sweep over cue strings, the length guards (8.3). J10 is currently blocked on Q1; nothing here needs an LLM, so this part is buildable under the deterministic core |
| **engines lane** | `engine/familiarity.ts` and `engine/cueing.ts`, plus the promotion veto wiring into the J2 phase machinery. Natural home is alongside J8's intervention follow-up, since a cue is an intervention and shares the ledger |
| **product lane** | `BreakScreen.tsx` and `FocusView.tsx` surfaces, the discoverability of the on-demand path (which has the best evidence and the worst affordance today) |
| **B1** | the `CueIssue` ledger is a decision-log row. Build it inside B1's append-only log rather than as a private array, or the same shape gets written twice |
| **R9** | skill gates on the movement side. Section 7.4 is the per-user side of that gate and should be reconciled with R9 before either ships |

### 10.4 Guard tests to write, and what proves each one bites

Standing rule: feed each guard a known-bad input, watch it fail, then trust it.

| test | file | proven to bite by |
|---|---|---|
| every cue string <= `CUE_MAX` (80) | `plan/visuals.test.ts` (extend the existing block) | plant an 81-char cue |
| every VOICE cue <= 12 words | new, `plan/technique.test.ts` | plant a 13-word cue |
| every cue survives `speakable()` without leftover shorthand or symbols | `plan/technique.test.ts` | plant "3x8 @ 70% RPE7" |
| no second-person body observation in any cue or technique string | `plan/technique.test.ts` | plant "your knees are caving in" |
| no injury-prevention claim on a `house`-evidence error | `plan/technique.test.ts` | plant "this stops you hurting your back" on a `house` error |
| every `regressionId` and every `prerequisites.movementIds` entry exists in the catalog | `plan/data.test.ts` | plant `'goblet-squatt'` |
| every `mistakes` entry maps to an `errors` id or is marked prose-only | `plan/data.test.ts` | delete an `errors` entry |
| cue coverage allowlist is shrink-only (the 65 cue-less movements) | `plan/data.test.ts` | add a new cue-less movement |
| `selectCue` is deterministic and budget-respecting | `engine/cueing.test.ts` | run F1 to F18 plus P1 to P3 |
| no cue path can mutate load, reps, volume or limitations | `engine/cueing.test.ts` | assert the returned object has no load fields, and snapshot `resolveDay` before and after a cue is issued |
| the golden lock is unaffected | `engine/golden.test.ts` | cues are not part of `resolveDay` output; if that ever changes, the lock must be extended deliberately and the reason recorded |
| no em dashes in any cue or technique string | existing copy sweep | plant one |

### 10.5 Five decisions this pack makes

1. **Cue selection is a filter-and-rank over triggers, and silence is its most common output.** The
   default for a trained lifter on a familiar lift is nothing at all.
2. **One cue. Ever.** Two only across different moments, never in one breath, and never for a
   beginner.
3. **External phrasing by default, held loosely.** The meta-analytic support is contested [S1 vs
   S2] and the resistance-specific effects are small and mostly acute [S3, S4]. Nothing in the
   design may depend on the effect being real.
4. **A cue is an intervention, so it pre-registers, it can fail, it retires, and it never repeats
   forever.** Same ledger and same rules as R3's interventions, same self-explaining habit as
   `calibration.ts`.
5. **BodyT does not diagnose form.** Competency is a claim about the log, technique errors carry an
   honest `observableProxy` (usually `none`), injury-prevention claims are marked `house` unless
   cited [S18, S19, S20, S21], and a guard test enforces the language.

### 10.6 Two things found while reading, for other lanes

Neither is R10's job. Both are recorded here so they are not rediscovered.

1. **The no-em-dash constraint is being broken in shipped copy, in more places than the one already
   logged.** A scan of `src/` (excluding tests) finds 190 em dashes, of which 149 sit on comment
   lines (fine) and **41 sit on code or string lines across about 14 files**. Some of those 41 are
   legitimate (the dash character classes in `platform/speakable.ts:82,102` and the label-separator
   migration in `store/schema.ts:555-556` that strips them from stored labels). The rest are copy:
   confirmed user-visible instances include `engine/adapt.ts:391` (the joint-pain advice line),
   `screens/coach/VoicePicker.tsx:128` (the basic-voices explainer), `plan/followups.ts` `informs`
   strings, `plan/athleticCoverage.ts` steps and why text, and `plan/cooking.ts` steps, in addition
   to the Progress-screen line already in the checkpoint log. J3's copy sweep should be a repo-wide
   pass with a guard test, not a one-line fix, and the guard has to exempt regex character classes.
2. **65 of 194 movements have no cue and no test notices.** `plan/data.test.ts` guards steps, why,
   mistakes, videoQuery and restSec but not `cue`, because `cue` is optional in `ExerciseDef`. The
   cheap fix is a shrink-only allowlist of the cue-less ids, in the same spirit as the dead-export
   allowlist J2 added to `structure.test.ts`. It turns an invisible content gap into a countdown.
