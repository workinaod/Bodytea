# R18: Pilates, Yoga, Barre and the Group-Fitness Modalities

Research pack, complete. No production code was changed to produce it. Every
claim below either cites a source from section 1 or a `file:line` verified by
reading the file in this worktree.

**Contents**

0. Relationship to R9 (what this pack does not repeat)
1. Sources: 31, tiered A/B/C (17 A, 7 B, 7 C)
2. What each modality actually trains, and where it stops
3. The counting problem (the section that changes the engine)
4. Movement corpus: 72 records with R-ONT capability fields
5. The class-not-session problem, and the logging shape
6. Audit of the live code, 26 findings with `file:line`
7. Eval fixtures: 18 cases
8. What to do next, in order

The five things most worth knowing, up front:

1. These modalities do not exist in the codebase. Zero string matches across
   `src/`, `e2e/` and `scripts/`.
2. A class logged through the `custom` fallback currently satisfies the app's
   mandatory weekly conditioning rule (`cardio.ts:206`, `resolveDay.ts:104`),
   which the measured intensity data says it must not (A6, B3).
3. `weekLoad` is the only function that counts unprogrammed training, it charges
   restorative yoga what it charges competitive soccer, and it is dead
   (`adapt.ts:543`, `structure.test.ts:273`).
4. Across mat Pilates, barre, hatha and vinyasa there is no pulling pattern at
   all, so a pure class week produces a pulling deficit inside one block.
5. Several of the loudest claims in this space are unsupported. The table in
   section 2.7 names fourteen of them.

---

## 0. RELATIONSHIP TO R9 (read this first)

`research/R9-calisthenics-mobility.md` already covers mobility, stretching,
warm-up and cool-down in depth, and this pack does not repeat it.

**Where R18 defers to R9, completely:**

- The four stretching modalities and what each is for: R9 section 7.1.
- Static stretching dose response and the pre-lifting rule: R9 sections 7.2, 6.1.
- Whether stretching prevents injury (R9 preserves the disagreement rather than
  resolving it): R9 section 7.5.
- Foam rolling: R9 section 7.3.
- Cool-down verdict: R9 section 7.6.
- The warm-up engine, its inputs, outputs and stages: R9 section 6.
- Ramp sets and how to ramp an unloaded movement: R9 sections 6.6, 6.9.
- Bodyweight progression ladders (push-up, squat, hinge, plank families): R9
  section 3. The corpus in section 4 below reuses those rungs by id rather than
  inventing parallel ones.
- The `loadable` dead-field problem and the unloaded dead-end: R9 sections 2.4,
  5.6. R18 makes that problem worse in volume, not better, and says so.

**Where R18 extends R9:**

| R9 covers | R18 adds |
|---|---|
| A stretch as a prescribed item inside a BodyT session | A 50 minute taught class the athlete attended somewhere else |
| Mobility work the engine chose | Mobility work the engine did not choose and cannot see |
| Warm-up dose for a lifting day | How class attendance changes the lifting day that follows |
| Bodyweight strength ladders | Whether a mat class is on any of those ladders at all (mostly it is not) |
| `kind: 'mobility'` items scoring 0 in volume, correctly | Four barre classes a week scoring 0 in volume, incorrectly |

The one place they touch is the mobility day. R9 treats `DayKind: 'mobility'`
as a light day the plan owns. R18 argues a studio class is not that day and
must never silently replace it, for a reason section 3 sets out with numbers:
a mat Pilates class carries real quad, glute and abdominal fatigue that a
mobility day does not, and the following day's plan has to know.

---

## 1. SOURCES

Tiering, same convention as R6 and R9:

- **A** = Cochrane review, systematic review with meta-analysis of RCTs,
  position stand from a major body, or a large well-controlled RCT.
- **B** = smaller RCT, non-pooled systematic review, or good observational
  epidemiology.
- **C** = single small trial, uncontrolled study, survey, or absence-of-evidence
  note. Cited only where nothing better exists, and always labelled.

### Pilates

**A1. Yamato TP, Maher CG, Saragiotto BT, Hancock MJ, Ostelo RWJG, Cabral CMN,
Menezes Costa LC, Costa LOP (2015).** Pilates for low back pain. *Cochrane
Database of Systematic Reviews*, Issue 7, CD010265.
https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD010265.pub2/full
Ten trials, 510 participants, all chronic low back pain. Versus minimal
intervention, short-term pain MD -14.05 on a 0 to 100 scale (95% CI -18.91 to
-9.19), a medium effect. Low to moderate quality evidence. **No high quality
evidence for any comparison, outcome or follow-up.** Versus other exercise, no
consistent superiority. TAKEN: Pilates works for chronic low back pain, and
works about as well as other exercise, which is the honest framing.

**A2. Pinto JR, Santos CS, Souza Soares WJ, Silveira Ramos AP, Scoz RD, Teixeira
de Judice AF, Alves Ferreira LM, Baltazar Mendes JJ, Amorim CF (2022).** Is
Pilates better than other exercises at increasing muscle strength? A systematic
review. *Heliyon* 8:e11564. https://doi.org/10.1016/j.heliyon.2022.e11564
Eleven RCTs, mean PEDro 6 +/- 1. Pilates was not superior to other exercise
modalities for muscle strength. TAKEN: the direct answer to "does a mat class
build strength like lifting does". It does not beat lifting, and the review
cannot show it matches it either.

**A3. Oliveira LS, de Oliveira RG, da Silva TQ, Gonzaga S, de Oliveira LC
(2024).** Effects of Pilates exercises on strength, endurance and muscle power
in older adults: systematic review and meta-analysis. *Journal of Bodywork and
Movement Therapies* 39:615-634. https://pubmed.ncbi.nlm.nih.gov/38876695/
Low quality evidence; Pilates did not significantly improve muscle strength
versus control in adults over 60, and the authors state it is not currently
feasible to recommend Pilates as a means of improving strength in this group.
TAKEN: the strength claim is weakest exactly where it is marketed hardest.

**B1. Carrasco-Poyatos M, Ramos-Campo DJ, Rubio-Arias JA (2019).** Pilates
versus resistance training on trunk strength and balance adaptations in older
women: a randomized controlled trial. *PeerJ* 7:e7548.
https://pmc.ncbi.nlm.nih.gov/articles/PMC6859004/
60 women aged 60 to 80, 18 weeks, three arms. Pilates beat control on isometric
hip extension (+35.5% within group). Resistance training improved every hip
isokinetic measure by 31 to 34% and Timed Up and Go by 12.3%, against Pilates
at 4.8%. No between-group difference in isokinetic strength or static balance.
TAKEN: head to head, the loaded arm won the loaded measures. This is the single
most useful citation in the pack for the substitution question.

**B2. Wang Y, Chen Z, Wu Z, Ye X, Xu X (2021).** Pilates for overweight or
obesity: a meta-analysis. *Frontiers in Physiology* 12:643455.
https://doi.org/10.3389/fphys.2021.643455
Eleven RCTs, 393 subjects; reported reductions in body weight, BMI and body fat
percentage. CONTRADICTED by trials in normal-weight and long-term Pilates
populations showing no body fat change. TAKEN: any body composition claim is
population-specific and is not a general property of the modality. Flag as a
contradiction, do not resolve it.

**C1. Absence of evidence, wall Pilates.** Europe PMC title search for
"wall pilates" returns zero indexed trials (checked 2026-08-18). The format is
a large consumer trend with a 28-day-challenge marketing shape and no published
trial of its own. TAKEN: v12 section 19's instruction is right. Treat wall
Pilates as an environment variant of mat Pilates, never as a distinct modality,
and never repeat the transformation claims attached to it.

### Yoga

**A4. Wieland LS, Skoetz N, Pilkington K, Vempati R, D'Adamo CR, Berman BM
(2017).** Yoga treatment for chronic non-specific low back pain. *Cochrane
Database of Systematic Reviews*, Issue 1, CD010671.
https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD010671.pub2/full
Twelve trials, 1,080 participants. Small to moderate improvement in back
function versus non-exercise control at 3 and 6 months. **Uncertain whether
there is any difference between yoga and other exercise.** Yoga produced more
adverse events than non-exercise controls, a similar rate to other back-focused
exercise, and no serious adverse events. TAKEN: same shape as Pilates. Works,
not specially.

**A5. Sherman KJ, Cherkin DC, Wellman RD, Cook AJ, Hawkes RJ, Delaney K, Deyo RA
(2011).** A randomized trial comparing yoga, stretching, and a self-care book
for chronic low back pain. *Archives of Internal Medicine* 171(22):2019-2026.
https://pmc.ncbi.nlm.nih.gov/articles/PMC3279296/
228 adults. Yoga beat a self-care book. Yoga did **not** beat a conventional
stretching class. TAKEN: when the comparator is another supervised class of
similar dose, the modality label stops mattering. This is the strongest single
argument against modality-specific magic in BodyT's copy.

**A6. Larson-Meyer DE (2016).** A systematic review of the energy cost and
metabolic intensity of yoga. *Medicine and Science in Sports and Exercise*
48(8):1558-1569. https://pubmed.ncbi.nlm.nih.gov/27433961/
Seventeen indirect-calorimetry studies. Full sessions averaged 3.3 +/- 1.6 METs
(range 1.83 to 7.4), and 2.9 +/- 0.8 METs with the single Surya Namaskar outlier
removed. Individual asanas averaged 2.2 +/- 0.7 METs (1.4 to 4.0). Pranayama
(breath work) 1.3 +/- 0.3 METs. Most sessions classify as light intensity on the
ACSM and AHA scale. TAKEN: **the number the engine should use.** A yoga class is
light activity by measurement, not by opinion.

**B3. Hagins M, Moore W, Rundle A (2007).** Does practicing hatha yoga satisfy
recommendations for intensity of physical activity which improves and maintains
health and cardiovascular fitness? *BMC Complementary and Alternative Medicine*
7:40. https://doi.org/10.1186/1472-6882-7-40
Twenty intermediate to advanced practitioners in a respiratory chamber. A
typical hatha session did not meet ACSM intensity recommendations for improving
or maintaining cardiorespiratory fitness. TAKEN: a yoga class does not satisfy
BodyT's weekly conditioning rule. Section 3 turns this into a code decision.

**A7. Youkhana S, Dean CM, Wolff M, Sherrington C, Tiedemann A (2016).**
Yoga-based exercise improves balance and mobility in people aged 60 and over: a
systematic review and meta-analysis. *Age and Ageing* 45(1):21-29.
https://academic.oup.com/ageing/article/45/1/21/2195366
Balance Hedges g 0.40 (95% CI 0.15 to 0.65), 6 trials, 307 participants.
Mobility g 0.50 (0.06 to 0.95), 3 trials. Small and medium effects. The authors
state it is **not known** whether this translates into fewer falls. TAKEN: yoga
is a real balance stimulus and an unproven falls intervention. Do not let copy
promote the second from the first.

**A8. Cramer H, Lauche R, Haller H, Steckhan N, Michalsen A, Dobos G (2014).**
A systematic review and meta-analysis of yoga for hypertension. *American
Journal of Hypertension* 27(9):1146-1151.
https://academic.oup.com/ajh/article-pdf/27/9/1146/17046588/hpu078.pdf
Yoga of 8 weeks or more reduced systolic BP by roughly 9.65 mmHg versus usual
care. **Versus exercise comparators, no evidence of any effect on systolic or
diastolic BP.** TAKEN: the blood pressure benefit is the benefit of exercising,
not of yoga.

**A9. Cramer H, Lauche R, Anheyer D, Pilkington K, de Manincor M, Dobos G, Ward
L (2018).** Yoga for anxiety: a systematic review and meta-analysis of
randomized controlled trials. *Depression and Anxiety* 35(9):830-843.
https://pubmed.ncbi.nlm.nih.gov/29697885/
Eight RCTs, 319 participants. Anxiety SMD -0.43 (95% CI -0.74 to -0.11) versus
no treatment. **No effect in participants with a DSM-diagnosed anxiety
disorder**, only in those with elevated symptoms and no formal diagnosis.
TAKEN: BodyT may say a class often helps people feel calmer. It may never
position a class as treatment for a diagnosed condition. This is a scope
boundary, and R6 owns it.

**A10. Cramer H, Ward L, Saper R, Fishbein D, Dobos G, Lauche R (2015).** The
safety of yoga: a systematic review and meta-analysis of randomized controlled
trials. *American Journal of Epidemiology* 182(4):281-293.
https://academic.oup.com/aje/article/182/4/281/113378
94 of 301 RCTs reported adverse events, 8,430 participants. No excess of
serious adverse events versus usual care or exercise. TAKEN: in a trial, with
an instructor and a screened population, yoga is safe.

**B4. Cramer H, Ostermann T, Dobos G (2018).** Injuries and other adverse events
associated with yoga practice: a systematic review of epidemiological studies.
*Journal of Science and Medicine in Sport* 21(2):147-154.
https://pubmed.ncbi.nlm.nih.gov/28958637/
Nine observational studies, 9,129 practitioners. In-class adverse event
incidence 22.7% (95% CI 21.1 to 24.3). Twelve-month prevalence 4.6%. Lifetime
prevalence 21.3% to 61.8%. Serious adverse events 1.9% (1.4 to 2.4). Most
common events musculoskeletal; most common injuries sprains and strains. TAKEN:
the real-world number is far higher than the trial number, which is the gap
BodyT should coach into. Roughly one class in five produces some complaint.

**B5. Swain TA, McGwin G (2016).** Yoga-related injuries in the United States
from 2001 to 2014. *Orthopaedic Journal of Sports Medicine* 4(11):2325967116671703.
https://journals.sagepub.com/doi/full/10.1177/2325967116671703
29,590 emergency-department-treated injuries over 13 years. Trunk 46.6% of
injuries; sprain or strain 45.0% of diagnoses. Injury rate in 2014 was
57.9 per 100,000 for age 65+, against 11.9 for 18 to 44 and 17.7 for 45 to 64.
Fracture incidence roughly three times higher in the older group. TAKEN: the
age gradient is steep and it is the opposite of the marketing. Yoga is not
automatically the gentle option for an older beginner.

**C2. Lu YH, Rosner B, Chang G, Fishman LM (2016).** Twelve-minute daily yoga
regimen reverses osteoporotic bone loss. *Topics in Geriatric Rehabilitation*
32(2):81-87. https://pubmed.ncbi.nlm.nih.gov/26664272/
Self-selected volunteers, **no control group**, pre-post design, and reported
bone density changes small enough to sit inside a DXA scanner's own least
significant change. TAKEN: **the popular "yoga builds bone" claim rests on
this.** BodyT must not repeat it. See section 2's unsupported-claims table.

### Barre

**C3. Absence of evidence, quantified.** Europe PMC title searches, run
2026-08-18: `"barre exercise"` returns 3 records; `"barre training"`,
`"barre fitness"`, `"barre workout"` and `"ballet barre"` each return 0. For
comparison, `"yoga"` returns 5,261 titles, `"tai chi"` 1,833 and `"pilates"`
823. TAKEN: this is the honest size of the barre literature, and it is the
single fact the pack most needs to state plainly. Barre is a popular modality
with essentially no primary literature of its own.

**C4. Kim MK, Koh SH, Kim TK (2025).** Effects of walking and barre exercise on
CES-D, stress hormones, hs-CRP, and immunoglobulins in elderly women. *Journal
of Clinical Medicine* 14:1777. https://doi.org/10.3390/jcm14051777
27 women aged 65+, nine per arm, 12 weeks. Depression scores fell in the barre
arm. TAKEN: n=9 per arm. Directionally consistent with "exercise helps mood",
too small to carry any modality-specific claim.

**C5. Briskin RS, Luck AM (2023).** Effects of Pure Barre exercise on urinary
incontinence symptoms: a prospective observational cross-sectional study.
*Urogynecology (Philadelphia)*.
Observational, no control group, single studio brand. TAKEN: cited only to show
what the barre literature consists of.

**C6. Haussler AM, Tueth LE, Earhart GM (2026).** Feasibility of a barre
exercise intervention for individuals with mild to moderate Parkinson disease.
*Journal of Dance Medicine and Science*. A feasibility study, which is the
correct study to be running when no efficacy base exists. TAKEN: same.

**C7. Effects of barre exercise training on lower limbs and core muscle
endurance and strength in sedentary female office workers.** *Journal of Sports
Science and Health* (Thailand), 2023. 30 participants, 8 weeks, 3 sessions a
week; the barre arm improved lower limb and core endurance and strength versus
control. TAKEN: the best strength result barre has, and it is one small trial
in a regional journal against an inactive control. An inactive control is the
weakest possible comparator; almost any structured training beats it.

### Tai Chi and Qigong

**A11. Li F, Harmer P, Fitzgerald K, Eckstrom E, Akers L, Chou LS, Pidgeon D,
Voit J, Winters-Stone K (2018).** Effectiveness of a therapeutic Tai Ji Quan
intervention vs a multimodal exercise intervention to prevent falls among older
adults at high risk of falling: a randomized clinical trial. *JAMA Internal
Medicine* 178(10):1301-1310. https://pubmed.ncbi.nlm.nih.gov/30208396/
670 adults aged 70+ with fall history or impaired mobility, three arms, twice a
week for 24 weeks. Tai Ji Quan cut falls 58% versus a stretching control and
31% versus multimodal exercise. TAKEN: **the strongest effect of any modality
in this pack, and it is on falls, not on strength or looks.** Note the control
arm: a stretching class was the comparator that lost. That is directly relevant
to how BodyT should rank a gentle class against a balance-specific one.

### Cross-cutting reference standards

**A12. Garber CE, Blissmer B, Deschenes MR, Franklin BA, Lamonte MJ, Lee IM,
Nieman DC, Swain DP (2011).** ACSM position stand: quantity and quality of
exercise for developing and maintaining cardiorespiratory, musculoskeletal, and
neuromotor fitness in apparently healthy adults. *Medicine and Science in Sports
and Exercise* 43(7):1334-1359. https://pubmed.ncbi.nlm.nih.gov/21694556/
Flexibility: at least 2 to 3 days a week, each stretch held 10 to 30 seconds,
repeated 2 to 4 times for about 60 seconds of total stretch time per movement.
Neuromotor exercise (balance, agility, coordination, proprioceptive training,
with **yoga and tai chi named as examples**): 2 to 3 days a week, 20 to 30
minutes a day suggested, with the position stand stating plainly that the
optimal duration and number of repetitions **are not known**. TAKEN: this is
the one authoritative home for these modalities in a prescription model. They
are neuromotor and flexibility training, and the dose is admittedly uncertain.

**A13. Bull FC, Al-Ansari SS, Biddle S, Borodulin K, Buman MP, Cardon G, et al.
(2020).** World Health Organization 2020 guidelines on physical activity and
sedentary behaviour. *British Journal of Sports Medicine* 54(24):1451-1462.
https://pubmed.ncbi.nlm.nih.gov/33239350/
Adults: 150 to 300 minutes of moderate or 75 to 150 minutes of vigorous aerobic
activity a week, plus muscle-strengthening activity at moderate or greater
intensity involving all major muscle groups on 2 or more days a week (moderate
certainty). TAKEN: the muscle-strengthening line is what a class must be scored
against, and "all major muscle groups" is the clause most classes fail.

**A14. Schoenfeld BJ, Grgic J, Ogborn D, Krieger JW (2017).** Strength and
hypertrophy adaptations between low- vs high-load resistance training: a
systematic review and meta-analysis. *Journal of Strength and Conditioning
Research* 31(12):3508-3523. https://pubmed.ncbi.nlm.nih.gov/28834797/
Hypertrophy is similar between loads below 60% of 1RM and above, when sets are
taken close to failure. Maximal strength gains are significantly greater with
heavy loads. TAKEN: **this is the mechanism that decides how much credit a mat
class gets.** Light loads can build muscle when effort is high enough. They do
not build maximal strength as well. A class that never approaches failure gets
neither.

**A15. Lasevicius T, Schoenfeld BJ, Silva-Batista C, Barros TS, Aihara AY,
Brendon H, et al. (2019).** Muscle failure promotes greater muscle hypertrophy
in low-load but not in high-load resistance training. *Journal of Strength and
Conditioning Research*. https://pubmed.ncbi.nlm.nih.gov/31895290/
At 30% of 1RM, hypertrophy required training to failure. 1RM gains were 33.8%
and 33.4% for high-load protocols against 17.7% and 15.8% for low-load. TAKEN:
the effort condition is not optional at low load. A class held at conversational
effort is below the threshold that makes low load work.

**A16. Smith BE, Littlewood C, May S (2014).** An update of stabilisation
exercises for low back pain: a systematic review with meta-analysis. *BMC
Musculoskeletal Disorders* 15:416. https://pubmed.ncbi.nlm.nih.gov/25488399/
Short-term benefit over general exercise for pain and disability; no long-term
benefit. TAKEN: the "core activation" and "deep stabiliser" mechanism that both
Pilates and barre marketing lean on is not supported as a distinct long-term
advantage over just exercising.

**A17. Herrmann SD, Willis EA, Ainsworth BE, Barreira TV, Hastert M, Kracht CL,
Schuna JM, Cai Z, Quan M, Tudor-Locke C, Whitt-Glover MC, Jacobs DR (2024).**
2024 Adult Compendium of Physical Activities: a third update of the energy costs
of human activities. *Journal of Sport and Health Science* 13(1):6-12.
https://pubmed.ncbi.nlm.nih.gov/38242596/
The reference BodyT already uses for METs (`src/plan/cardio.ts:9-14`). Relevant
conditioning-category values: hatha yoga 2.5 METs, power yoga 4.0 METs, Pilates
around 2.5 to 3.0 METs, general stretching 2.3 METs, tai chi around 3.0 METs.
TAKEN: every one of these sits below the 6.0 MET floor of the lowest entry in
BodyT's current cardio catalog (`custom`, at 6.0, `src/plan/cardio.ts:206`).

**B6. van Rijn RM, Stubbe JH (2021).** Generalized joint hypermobility and
injuries: a prospective cohort study of 185 pre-professional contemporary
dancers. *Journal of Clinical Medicine* 10:1007.
https://doi.org/10.3390/jcm10051007
Generalized joint hypermobility is highly prevalent in dance populations
(reported around 57% in young high-performing dancers) and prospective injury
findings across the literature are **inconclusive** rather than clean. TAKEN:
be careful here. The honest statement is that hypermobility is common in the
populations these classes attract and is associated with complaints, not that
it is a proven injury cause. See the unsupported-claims table.

**B7. Pilates instructors: prevalence of musculoskeletal pain.** Observational
survey literature (indexed at https://pmc.ncbi.nlm.nih.gov/articles/PMC7394528/).
TAKEN: cited for one narrow point only, that teaching these modalities full time
carries its own overuse burden, which matters if a BodyT user is an instructor.
Instructor volume is unplanned load the engine cannot see.

**Contradictions preserved, not resolved.**

1. B2 versus the body composition trials it conflicts with: Pilates changes body
   composition in overweight populations and does not in already-lean ones. Do
   not average these.
2. A7 (real balance effect in older adults) versus A7's own caveat and B5 (a
   rising, age-loaded injury rate in exactly that group). Both are true. Yoga is
   a balance stimulus for older adults and an injury source for older adults.
3. A3 (no strength effect in over-60s) versus B1 (a large within-group hip
   extension gain in over-60s). Pooled evidence is weaker than the best single
   trial. Trust the pooled result and let the individual log override it.

---

## 2. WHAT EACH MODALITY ACTUALLY TRAINS

Mapped onto vocabulary the repo already has: `MuscleRegion`
(`src/plan/muscleRegions.ts:8-32`, 24 regions), `ExerciseKind`
(`src/types.ts:14-22`, 8 values), and the per-kind volume weights in
`src/engine/volume.ts:63-72`.

### 2.1 The stimulus table

`vol credit` is the fraction of a hypertrophy-style working set the modality
should be worth per unit of work, argued in section 3.
`conditioning` is whether it satisfies BodyT's weekly conditioning rule
(`src/engine/resolveDay.ts:85-92`).

| modality | primary regions | secondary regions | dominant stimulus | METs (A17, A6) | vol credit | conditioning | substitutes for |
|---|---|---|---|---|---|---|---|
| Mat Pilates | abs, obliques, hip-flexors, glutes | quads, adductors, lower-back, delts-front | trunk endurance, motor control, hip endurance | 2.5 to 3.0 | 0.5 per 10 min, abs and obliques only | no | a core block, and a mobility day |
| Reformer Pilates | glutes, quads, hamstrings, abs, adductors | lats, mid-back, delts-front | as above plus real external spring load | 3.0 est. | 0.6 per 10 min, extendable to legs | no | a light lower accessory block |
| Vinyasa / power yoga | quads, glutes, delts-front, triceps, abs | chest, mid-back, calves, hamstrings | isometric endurance, balance, ROM under load | 3.6 measured; 4.0 compendium | 0.5 per 10 min | no (see 3.4) | a mobility day, and part of a core block |
| Hatha / slow yoga | hamstrings, hip-flexors, adductors, lower-back | abs, delts-front | passive and active ROM, breath, calm | 2.5 | 0.25 per 10 min | no | a mobility day |
| Yin / restorative yoga | none (connective tissue and ROM) | none | long-hold passive ROM | 1.8 to 2.5 | 0 | no | a rest day, nothing else |
| Hot yoga | as vinyasa | as vinyasa | as vinyasa plus heat and fluid loss | 3.3 to 4.5 | 0.5 per 10 min | no | a mobility day; adds a hydration flag |
| Barre | quads, glutes, adductors, calves, delts-side | abs, hamstrings, hip-flexors | high-rep low-load local muscular endurance | 3.0 to 4.0 est. | 0.5 per 10 min, legs and glutes only | no | a lower accessory block |
| Tai Chi / Qigong | none | quads, glutes, calves | balance, gait, weight transfer | 3.0 | 0 | no | a mobility day, and a balance block |
| Sculpt / body pump style class | full-body across all major regions | as above | actual resistance training at low load | 5.0 to 6.0 | 0.7 per 10 min, all worked regions | borderline, see 3.4 | a full lifting day at reduced credit |

The last row is deliberately in the table. A "Pilates sculpt with weights" or a
barbell-class format is not the same object as the eight rows above it, and the
single most common data-quality failure will be a user typing "Pilates" for a
class that was actually resistance training. Section 5 handles that with a
question, not a guess.

### 2.2 What Pilates actually does

**Supported.** Trunk and hip muscular endurance, motor control, and reduced pain
and disability in chronic low back pain (A1). Improvements in core endurance
tests (McGill-style prone and side bridge holds) are the most consistently
replicated physical finding in the Pilates literature. Isometric hip extension
strength improves in older women (B1, +35.5% within group over 18 weeks).

**Not supported at the level it is claimed.**

- **Superiority over other exercise.** A1 finds no consistent advantage over
  other exercise; A2 finds no advantage over other modalities for strength.
- **Strength in older adults.** A3, pooling RCTs, finds no significant strength
  effect and explicitly declines to recommend Pilates for that purpose.
- **The "deep core stabiliser" mechanism.** A16 finds stabilisation-specific
  exercise gives short-term benefit only, with no long-term advantage over
  general exercise. The mechanism story is stronger than the outcome data.
- **Body composition.** B2 says yes in overweight populations; other trials say
  no in lean ones. Not a general property.

**Where it stops, precisely.** Mat Pilates has no external load and its hardest
positions are trunk isometrics and low-load hip work. In A14's terms, it is
low-load training that rarely goes near failure, and A15 shows that low load
without proximity to failure is the combination that produces neither
hypertrophy nor strength reliably. Reformer springs change this somewhat for the
legs and the pull patterns, which is why the table gives reformer more credit.

### 2.3 What yoga actually does

**Supported.** Range of motion, standing balance (A7, g 0.40), mobility (A7,
g 0.50), lower blood pressure versus doing nothing (A8), and reduced anxiety
symptoms in people without a formal diagnosis (A9). Back function in chronic
low back pain (A4).

**Not supported at the level it is claimed.**

- **Cardio.** A6 measures full sessions at 2.9 to 3.3 METs, which is light
  activity. B3 states directly that a typical hatha session does not meet ACSM
  intensity recommendations for cardiorespiratory fitness. A yoga class is not
  a cardio session.
- **Better than other exercise for blood pressure.** A8 finds no effect versus
  exercise comparators. The benefit is the benefit of moving.
- **Better than stretching for back pain.** A5 finds no difference against a
  conventional stretching class.
- **Bone density.** The widely repeated claim traces to C2, which has no control
  group and reports changes inside the measurement error of the scanner.
- **Treatment for diagnosed anxiety.** A9 explicitly finds no effect in
  DSM-diagnosed populations.
- **Falls prevention.** A7's own authors say the balance improvement has not
  been shown to reduce falls. Tai Chi has that evidence (A11); yoga does not.

**Where it stops, precisely.** Yoga has genuine upper-body isometric load in
plank, chaturanga, side plank, crow and inversions, and genuine quad and glute
work in long-held standing poses. What it does not have is progressive external
load, which is the input that both A14 and the ACSM progression model (A12's
companion position stand) treat as the driver of strength adaptation. A
practitioner can get remarkably strong at holding their own bodyweight in
specific shapes and remain untrained by every measure the BodyT strength model
tracks.

### 2.4 What barre actually does

**Supported.** Almost nothing, at the standard the rest of this pack uses. The
entire indexed title literature is three papers (C3), of which the strongest
strength result is a 30-person 8-week trial in a regional journal against an
inactive control (C7).

**What it plausibly does, by mechanism rather than by trial.** Barre is high
repetition, small range, low load work concentrated on the quads, glutes,
adductors and calves, plus small-range shoulder work, usually held in isometric
or pulse form to local burning fatigue. That description matches local muscular
endurance training, which A12's companion resistance position stand places at
loads of 40 to 60% of 1RM for more than 15 repetitions. For an untrained person
whose bodyweight is a meaningful fraction of their leg strength, that is a real
training load. For anyone who squats their bodyweight, it is not.

**The claim to refuse.** "Long, lean muscles" and "muscles lengthened not
bulked" have no physiological mechanism and no supporting evidence. Muscle
length is set by the skeleton and by sarcomere number, which stretching alters
minimally and which no class changes on the timescale these claims imply. BodyT
must never repeat this, in copy or in a rationale string.

### 2.5 What tai chi actually does

Best evidence in the pack, narrowest target. A11 is a 670-person RCT in which
twice-weekly practice cut falls by 58% versus a stretching control and 31%
versus multimodal exercise in high-risk older adults. Balance, gait and weight
transfer are what it trains, and falls are what it prevents. It is not a
strength stimulus, not a conditioning stimulus, and does not need to be.

### 2.6 The honest summary sentence, for copy

For a user doing three or four of these classes a week, the truthful sentence
is: *"That is real training. It is mostly trunk endurance, balance and range,
and it is not much strength work. Your legs and back are getting something. Your
pulling muscles are getting nothing."*

The pulling clause is not rhetoric. Across mat Pilates, barre, hatha and
vinyasa, there is no horizontal or vertical pulling pattern at all, because
none of them supplies anything to pull against. Reformer Pilates is the sole
exception, via the straps. `MOVEMENT`'s `pattern` vocabulary
(`src/plan/movement.ts`, read by `substitutesFor`) has pull patterns with
nothing in this whole family to fill them, and any plan that treats a class week
as complete training will produce a pulling deficit within a block.

### 2.7 Unsupported or overstated claims, flagged for the copy layer

| claim, as users encounter it | verdict | source |
|---|---|---|
| Pilates gives you long, lean muscles | No mechanism, no evidence. Refuse. | none exists |
| Barre lengthens muscle without bulk | Same. Refuse. | none exists |
| Yoga builds bone density | Rests on an uncontrolled pre-post study with changes inside scanner error | C2 |
| Pilates is better than other exercise for back pain | Not shown | A1 |
| Yoga is better than stretching for back pain | Not shown | A5 |
| Yoga lowers blood pressure better than exercise | Not shown | A8 |
| Yoga counts as your cardio | Contradicted by measurement | A6, B3 |
| Yoga is the gentle option for older beginners | Injury rate is highest and rising in 65+ | B5 |
| Yoga prevents falls | Not shown; tai chi has this evidence, yoga does not | A7, A11 |
| Pilates activates deep stabilisers others miss | Short-term only, no long-term advantage | A16 |
| Wall Pilates is a distinct method | Zero indexed trials | C1 |
| A class replaces strength training | Contradicted head to head on loaded measures | B1, A14 |
| Pilates is a weight loss method | Population-dependent and contradicted | B2 |
| Yoga treats anxiety disorders | No effect in diagnosed populations | A9 |

---

## 3. THE COUNTING PROBLEM

This is the section that changes the engine.

### 3.1 What happens today, exactly

Somebody who does four barre classes a week and three BodyT lifting days is
running a seven-day training week. The engine believes they train three days.

Verified by reading the code:

- There is no `pilates`, `yoga`, `barre`, `tai chi` or `studio` string anywhere
  under `src/`. A grep across `src/`, `e2e/` and `scripts/` returns zero hits.
- The only place a non-BodyT activity can be recorded is `CARDIO_ACTIVITIES`
  (`src/plan/cardio.ts:44-207`), which has 17 entries. None of them is a class.
  The fallback is `custom` at `src/plan/cardio.ts:206`, MET 6.0, which asks only
  for minutes.
- `regionLoad` (`src/engine/volume.ts:169-184`) iterates `ResolvedExercise[]`
  from one resolved day. A cardio entry is not a `ResolvedExercise` and never
  reaches it. Class work contributes **exactly zero** to every muscle region.
- `sessionFatigue` (`src/plan/movement.ts:472-474`) reads
  `MOVEMENT[exerciseId].fatigue`. No class has an id in `MOVEMENT`
  (111 entries), so it contributes zero.
- `weekLoad` (`src/engine/adapt.ts:543-560`) is the only function in the repo
  that tries to count unprogrammed work. It is on the dead-export allowlist at
  `src/structure.test.ts:273`, meaning **nothing consumes it**.

So the four-class athlete gets a plan built as if those four days were rest.

### 3.2 The two ways to get this wrong, with numbers

**Ignore it (today's behaviour).** Four 50-minute barre classes concentrate on
quads, glutes and adductors. The plan then schedules its own lower day with a
squat variation, a hamstring accessory and a calf slot. `overloadedRegions`
(`src/engine/volume.ts:207-221`) checks that day against a quad ceiling of 10
(14 with the focus bonus, `volume.ts:105-116`) and sees roughly 6 fractional
sets. It passes. The athlete's actual quad exposure that week is the plan's 6
plus whatever four classes delivered, and nothing in the system ever adds those
two numbers. This is precisely the failure the file's own header comment
describes at `src/engine/volume.ts:9-16`, one layer up: invisible because
nothing was adding it up.

**Overcount it.** Two obvious wrong fixes:

1. *Treat the class as a session.* Sixty minutes of mat Pilates contains
   something like 40 to 60 distinct exercise blocks. Counting each as a set gives
   40+ fractional sets on the abs from one class. `trimForVolume`
   (`volume.ts:298-358`) would then find every subsequent day catastrophically
   over ceiling and start dropping movements. One class would delete a training
   block.
2. *Use the existing `weekLoad` rate.* `adapt.ts:556` charges
   `Math.round(minutes / 15)` regardless of activity, so a 60-minute yin yoga
   class costs 4 points, the same as 60 minutes of competitive soccer. The
   comment at `adapt.ts:553-555` says an hour of hard sport costs about what a
   moderate lifting session costs, but a moderate lifting session on the
   `sessionFatigue` scale is roughly 15 to 25 points (6 movements, 3 sets,
   `MOVEMENT.fatigue` of 1 or 2), so the two halves of that function are already
   on different scales by a factor of three. Nobody noticed because the function
   is dead.

Overcounting produces the second failure mode: the plan pulls volume, the
athlete trains less than they can recover from, and progress stops for a reason
the coach cannot explain.

### 3.3 The proposal: three channels, three different answers

Class work is not one number. It is three, and the reason the problem looks hard
is that the repo currently tries to answer all three with `minutes`.

| channel | question it answers | existing home | class behaviour |
|---|---|---|---|
| ENERGY | how much did this cost in calories, and did it satisfy the weekly conditioning rule | `metFor` (`cardio.ts:398`), `estKcalFromMet` (`runs.ts:188`), `conditioningLoggedThisWeek` (`resolveDay.ts:85`) | uses real METs, 2.5 to 4.0; **does not** satisfy conditioning |
| REGIONAL VOLUME | which muscles already got worked, and how much | `regionLoad` (`volume.ts:169`) | contributes fractional sets to specific `MuscleRegion` values |
| SYSTEMIC FATIGUE | how full is the week, and is today a day to hold back | `sessionFatigue` (`movement.ts:472`), `weekLoad` (`adapt.ts:543`) | contributes at a modality rate, not a flat minutes rate |

### 3.4 Channel 1, energy and the conditioning rule

Straightforward and fully evidenced. Add class activities to
`CARDIO_ACTIVITIES` with real compendium METs (A17) and, critically, **without**
`conditioning: true`.

```
hatha / slow yoga     2.5 MET    conditioning: false
vinyasa / power yoga  4.0 MET    conditioning: false
mat pilates           3.0 MET    conditioning: false
reformer pilates      3.0 MET    conditioning: false
barre                 3.5 MET    conditioning: false   (estimated, see C3)
tai chi / qigong      3.0 MET    conditioning: false
sculpt / weights class 5.5 MET   conditioning: true
```

Justification for the `false` flags: A6 measures full yoga sessions at 2.9 to
3.3 METs, which is light activity on the ACSM and AHA scale, and B3 states
directly that a typical hatha session does not meet ACSM intensity
recommendations for cardiorespiratory fitness. `conditioningLoggedThisWeek`
(`resolveDay.ts:85-92`) is the gate on a rule the app states as non-negotiable
("at least ONE real conditioning session every week, whatever your goal",
`resolveDay.ts:241`). Letting a yoga class clear that gate would break the one
health rule the product refuses to bend.

`sculpt` is the only `true`, and it should be `true` only when the user answers
that the class used weights. That answer is a `modes` entry, which the catalog
already supports (`CardioActivityDef.modes`, `cardio.ts:31`).

Note the estimated barre MET is flagged as estimated in the record itself. C3
is the reason: there is no measured value to cite.

**Tracking table.** `ACTIVITY_TRACKING` requires an entry for every activity id
and `intensity.test.ts:29` asserts the two lists match exactly. Every class gets
`{ steps: false, distance: 'none' }`, joining swim, row-erg, hockey, stairs and
snow (`cardio.ts:483-499`). A step count from a yoga mat is meaningless, and the
existing table already has the right category for that.

### 3.5 Channel 2, regional volume

**The unit.** Fractional sets per 10 minutes of class, landing on
`MuscleRegion` values, using the same `PRIMARY_WEIGHT` 1.0 and
`SECONDARY_WEIGHT` 0.5 convention as `volume.ts:47-49`.

**Calibration target, stated so the number can be argued with.** Four classes a
week of a modality should put its primary regions at the LOW end of the
well-supported weekly range, which `volume.ts:24-28` gives as roughly 10 to 20
hard sets per muscle per week. Not zero, which is today. Not past the ceiling,
which would delete the athlete's plan.

Four 50-minute classes at `0.5 fractional sets per 10 minutes` gives
4 x 5 x 0.5 = **10 fractional sets per week** on each primary region. That is the
target, and the rate falls out of it.

```ts
// HOUSE HEURISTIC. The rate is calibrated, not measured; there is no
// study that converts class minutes into equivalent hard sets.
// What IS evidenced is the direction and the size of the discount:
// A14 and A15 show low load far from failure produces neither strength
// nor reliable hypertrophy, so the discount has to be large. A1, A2 and
// A3 show the strength effect is small or absent, so it cannot be zero
// either, because the trunk endurance effect is real and replicated.
export const CLASS_SET_RATE = 0.5   // fractional sets per 10 min, per PRIMARY region
export const CLASS_SECONDARY = 0.5  // multiplier for SECONDARY regions
```

Per-modality multipliers on top, from section 2.1:

| modality | rate multiplier | reason |
|---|---|---|
| yin / restorative | 0 | no muscular work to credit |
| hatha / slow yoga | 0.5 | long passive holds, minimal active load |
| mat pilates | 1.0 | the calibration case |
| barre | 1.0 | same shape, different regions |
| tai chi | 0 | balance and gait, not muscular volume |
| vinyasa / power yoga | 1.0 | isometric load through the shoulders and legs |
| reformer pilates | 1.2 | spring resistance is real external load |
| sculpt with weights | 1.4 | it is resistance training, at low load |

**Where it lands.** Not in `resolveDay`'s exercise list. Two consumers, and
keeping them apart is the whole design:

*Same-day.* A class logged earlier today is prior load for today only. The
existing lever is `slack`, which `overloadedRegions(exercises, slack)`
(`volume.ts:207-221`) uses to lower every ceiling, and which `trimToFit`
(`volume.ts:416-427`) already drives. A class earlier today raises slack by the
class's largest single-region credit, capped by `MAX_TIME_SLACK`
(`volume.ts:400`) so the same guard that stops a time budget mangling a day
stops this too. No new ceiling model, no new trim path.

*Same-week.* Weekly class load per region is an input to plan generation and
slot selection, not to day trimming. If a user's abs are at 10 fractional sets a
week from Pilates, the generator should stop filling core slots
(`coreMovers` in `PlanConfig`, `types.ts:230`) and the phase logic should stop
choosing ab accessories. That is a suggestion in the Booklet, never a silent
edit, because of the standing "suggest only, never auto" rule.

**What must never happen.** The weekly number must not feed the per-session
ceiling. `volume.ts:24-31` is explicit that ceilings are per session and that
weekly totals of 10 to 20 sets are a different question. Mixing them would break
`golden.test.ts` and, worse, would be wrong.

### 3.6 Channel 3, systemic fatigue

Fix `weekLoad` (`adapt.ts:543-560`) rather than adding a second one, and wire it
in, which removes an entry from the dead-export allowlist at
`structure.test.ts:273` (allowances shrink only, so this is the direction the
repo wants).

Two changes:

1. Put the two halves on one scale. The planned half sums
   `MOVEMENT.fatigue * sets`, which runs roughly 15 to 25 for a normal lifting
   day. The unplanned half runs `minutes / 15`, which gives 4 for an hour. Those
   are not the same units. The unplanned rate needs to be about three times
   higher before any modality multiplier applies.
2. Apply a per-activity fatigue rate instead of one flat rate.

```ts
/** Systemic cost per 15 minutes, relative to hard sport at 1.0. */
export const ACTIVITY_FATIGUE_RATE: Record<string, number> = {
  'yoga-restorative': 0.15,
  'yoga-hatha': 0.3,
  'tai-chi': 0.3,
  barre: 0.5,
  'pilates-mat': 0.5,
  'yoga-vinyasa': 0.6,
  'pilates-reformer': 0.6,
  'class-sculpt': 0.8,
  // everything else keeps 1.0, which is today's behaviour
}
```

The ordering is defensible from the METs (A6, A17) and from the load argument in
A14 and A15. The exact values are a house heuristic and should be labelled as
one in the code comment, in the same voice `volume.ts:51-62` already uses about
`KIND_WEIGHT`.

### 3.7 The staleness problem

A class attended today is prior fatigue. A class attended last Tuesday is
training history. The regional credit has to decay or the model will believe an
athlete who stopped going three weeks ago still has ten sets of abs banked.

Proposal: regional class credit is computed over a rolling 7 day window ending
today, same as `weekLoad` already scopes itself (`adapt.ts:544`,
`mondayOf(today)`). Anything older informs the Booklet's picture of what this
person's training actually is, not this week's arithmetic. That is R12 and B3
territory (coaching memory with decay), not this file's.

### 3.8 The self-report problem

Every number in channels 2 and 3 is multiplied by `minutes`, and `minutes` is
typed by a person after the fact. The existing catalog already knows this:
`CardioEntry` keeps `intensity` (measured) strictly apart from `feltIntensity`
(claimed) precisely so the disagreement between them can be learned from
(`activityTypes.ts:108-116`), and `engine/calibration.ts` does the learning.

Classes give the phone nothing to measure. There are no usable steps on a mat
and no GPS in a studio. So the class channels are self-report all the way down,
and the honest response is to keep the credit coarse. This is the argument for a
rate per 10 minutes rather than per minute, and for round modality multipliers
rather than tuned ones. A model that cannot be measured should not pretend to
resolution it has not earned.

One thing the app CAN measure: attendance regularity. Somebody who logs four
classes a week for six weeks is a different athlete from somebody who logged one
in March, and that difference is real signal even when every minute figure is a
guess.

### 3.9 What the athlete sees

Suggest only. The engine's output here is at most:

> Four classes this week already. Your legs and middle have had plenty, so
> today's plan is lighter down there. Nothing else changes.

and in the Booklet:

> You do a lot of Pilates. That covers your middle and your hips well. It does
> almost no pulling, so that is what this plan spends its time on.

Copy rules from the repo apply: short, plain, no jargon, no em dashes, and never
a sanskrit-only pose name without the English beside it.

---

## 4. MOVEMENT CORPUS

72 records. Fields follow `research/RONT-exercise-ontology.md` section 3.4
(`CapabilityMeta`) and section 3.1's verdict that BodyT's existing splits are
kept, not collapsed.

### 4.1 How to read it, and the one thing that makes it cheap

R-ONT section 4.5 flags authoring cost honestly: seventeen capability fields per
record over hundreds of records is real work. For this family, almost all of it
is derivable, because **position determines most capability gates**. Encode
`position` by hand and generate the rest:

| position | floorTransfer | kneeling | prone | supine | standingBalance | space | noise | impact |
|---|---|---|---|---|---|---|---|---|
| `supine` | true | false | false | true | 0 | mat | silent | 0 |
| `prone` | true | false | true | false | 0 | mat | silent | 0 |
| `side-lying` | true | false | false | false | 0 | mat | silent | 0 |
| `seated-floor` | true | false | false | false | 0 | mat | silent | 0 |
| `quadruped` | true | true | false | false | 0 | mat | silent | 0 |
| `kneeling` | true | true | false | false | 1 | mat | silent | 0 |
| `plank-hands` | true | false | false | false | 0 | mat | silent | 0 |
| `plank-forearms` | true | false | false | false | 0 | mat | silent | 0 |
| `standing` | false | false | false | false | 1 | room | silent | 0 |
| `standing-1leg` | false | false | false | false | 2 | room | silent | 0 |
| `standing-supported` | false | false | false | false | 0 | room | silent | 0 |
| `inverted` | true | false | false | false | 2 | mat | silent | 0 |
| `machine-supine` | true (reformer) | false | false | true | 0 | room | quiet | 0 |

Only four fields resist derivation and must be authored per record:
`gripDemand`, `overheadRom`, `coordination`, and the three deep-ROM gates.
Those are in the table below as `contraindications`, which is where a coach
would look for them anyway.

Every record is `impact: 0` and `noise: silent` except the reformer entries,
which are `quiet` because a carriage makes noise. That is a real product fact,
not a rounding: this entire family is the answer for the apartment-with-thin-
floors constraint that R9 section 5.5 covers, and the corpus should be tagged so
the small-space path can find it.

**Prescription units.** Per R-ONT section 7, these need `PrescriptionUnit`
explicitly rather than a regex over a display string (`focus.ts:98`). The family
splits cleanly: yoga poses are `time` (holds) or `rounds` (flows), Pilates mat
is `reps` with a canonical count, barre is `time` or `amrap` (pulse to burn),
tai chi is `rounds` or `time`. Nothing here is `distance`.

**Naming rule.** Plain-English name is the record's `name`. The traditional name
goes in a new optional `traditionalName` field, never alone. The standing copy
constraint is explicit about this: no sanskrit-only pose names.

### 4.2 Pilates, mat (22)

| id | plain name | traditional name | equipment | position | load type | primary region | secondary | contraindication gates | regression | progression |
|---|---|---|---|---|---|---|---|---|---|---|
| `pil-hundred` | Hundred breath pump | The Hundred | mat | supine | bodyweight isometric | abs | hip-flexors, delts-front | neck flexion intolerance; acute low back pain | head down, knees bent on a chair | legs straight and low |
| `pil-roll-up` | Slow roll up | The Roll Up | mat | supine | bodyweight dynamic | abs | hip-flexors | spinal flexion intolerance; osteoporosis (avoid) | half roll up with bent knees | arms overhead, no momentum |
| `pil-roll-over` | Legs over roll | The Roll Over | mat | supine | bodyweight dynamic | abs | lower-back, hamstrings | neck; cervical disc; osteoporosis (avoid) | legs to 45 degrees only | straight legs to the floor |
| `pil-leg-circles` | One-leg circles | Single Leg Circles | mat | supine | bodyweight dynamic | hip-flexors | abs, adductors | hip impingement | bent knee, small circle | straight leg, wide circle |
| `pil-rolling-ball` | Rolling like a ball | Rolling Like a Ball | mat | seated-floor | bodyweight dynamic | abs | lower-back | spinal flexion intolerance; osteoporosis (avoid) | balance without rolling | hands to ankles |
| `pil-single-leg-stretch` | One leg stretch | Single Leg Stretch | mat | supine | bodyweight dynamic | abs | hip-flexors | neck flexion intolerance | head down | head up, legs lower |
| `pil-double-leg-stretch` | Double leg stretch | Double Leg Stretch | mat | supine | bodyweight dynamic | abs | hip-flexors, delts-front | neck; low back extension under load | knees stay bent | full reach, legs low |
| `pil-scissors` | Scissor legs | Single Straight Leg Stretch | mat | supine | bodyweight dynamic | abs | hamstrings, hip-flexors | hamstring strain; neck | bent knees | straight legs, hands off |
| `pil-lower-lift` | Lower and lift | Double Straight Leg Stretch | mat | supine | bodyweight dynamic | abs | hip-flexors | low back; hernia | small range | legs to hover |
| `pil-criss-cross` | Criss cross | Criss Cross | mat | supine | bodyweight dynamic | obliques | abs, hip-flexors | neck flexion intolerance | head down, feet down | slower, longer reach |
| `pil-spine-stretch` | Seated spine stretch | Spine Stretch Forward | mat | seated-floor | passive plus active ROM | lower-back | hamstrings, abs | hamstring strain; sciatic symptoms | sit on a cushion, knees bent | legs straight, deeper reach |
| `pil-saw` | Seated twist reach | The Saw | mat | seated-floor | active ROM | obliques | hamstrings, lower-back | lumbar rotation intolerance | small twist, bent knees | full twist and reach |
| `pil-swan` | Chest lift on front | Swan Prep | mat | prone | bodyweight isometric | lower-back | glutes, mid-back | lumbar extension intolerance; spondylolisthesis | forearms down | hands lift off |
| `pil-single-leg-kick` | One leg kick | Single Leg Kick | mat | prone | bodyweight dynamic | hamstrings | glutes, lower-back | knee pain in deep flexion | small kick | double pulse |
| `pil-double-leg-kick` | Double leg kick | Double Leg Kick | mat | prone | bodyweight dynamic | hamstrings | mid-back, delts-rear | shoulder internal rotation limits | hands on low back | hands clasped high |
| `pil-shoulder-bridge` | Bridge with leg lift | Shoulder Bridge | mat | supine | bodyweight isometric | glutes | hamstrings, abs | hamstring cramp; neck load | bridge hold, no leg lift | full leg extension |
| `pil-side-kick` | Side-lying leg series | Side Kick Series | mat | side-lying | bodyweight dynamic | glutes | adductors, obliques | hip bursitis | small range | longer lever, slower |
| `pil-teaser` | V-sit balance | The Teaser | mat | supine | bodyweight isometric | abs | hip-flexors | spinal flexion intolerance; osteoporosis (avoid) | one leg, hands behind thighs | full teaser, arms overhead |
| `pil-swimming` | Face-down swim | Swimming | mat | prone | bodyweight dynamic | lower-back | glutes, delts-rear | lumbar extension intolerance | opposite arm and leg only | fast flutter, higher lift |
| `pil-leg-pull-front` | Plank leg lift | Leg Pull Front | mat | plank-hands | bodyweight isometric | abs | glutes, delts-front | wrist pain (use fists or forearms) | plank hold, no lift | slower lift, longer hold |
| `pil-side-bend` | Side plank lift | Side Bend | mat | side-lying | bodyweight isometric | obliques | delts-side, glutes | wrist; shoulder instability | forearm and knee down | straight arm, full lift |
| `pil-seal` | Seal rock | The Seal | mat | seated-floor | bodyweight dynamic | abs | lower-back | spinal flexion intolerance; osteoporosis (avoid) | rock without clapping | rock to standing |

### 4.3 Pilates, reformer and equipment (9)

| id | plain name | traditional name | equipment | position | load type | primary region | secondary | contraindication gates | regression | progression |
|---|---|---|---|---|---|---|---|---|---|---|
| `ref-footwork` | Reformer footwork | Footwork Series | reformer | machine-supine | spring | quads | glutes, calves | knee pain in deep flexion | lighter springs, shorter range | heavier springs, single leg |
| `ref-hundred` | Reformer hundred | The Hundred | reformer | machine-supine | spring | abs | delts-front, hip-flexors | neck flexion intolerance | head down | legs low, full range |
| `ref-long-stretch` | Plank on the carriage | Long Stretch | reformer | plank-hands | spring | abs | delts-front, glutes | wrist; shoulder instability | knees down | longer carriage travel |
| `ref-elephant` | Elephant | Elephant | reformer | standing-supported | spring | hamstrings | abs, glutes | hamstring strain | bent knees | straight legs, single leg |
| `ref-knee-stretch` | Knee stretch series | Knee Stretch | reformer | kneeling | spring | abs | quads, glutes | knee pressure; wrist | round back only | knees off |
| `ref-short-box` | Short box round back | Short Box Series | reformer | seated-floor | spring | abs | lower-back, obliques | spinal flexion intolerance | small range | full round back and reach |
| `ref-feet-straps` | Feet in straps | Feet in Straps | reformer | machine-supine | spring | adductors | glutes, hamstrings | groin strain; hip impingement | small circles | large circles, single leg |
| `ref-chest-expansion` | Arms pull back | Chest Expansion | reformer | kneeling | spring | lats | delts-rear, triceps | shoulder impingement | seated version | kneeling with head turns |
| `ref-side-splits` | Standing side split | Side Splits | reformer | standing | spring | adductors | glutes, quads | groin strain; balance impairment | hold the frame | no hands, wider travel |

### 4.4 Yoga (24)

| id | plain name | traditional name | equipment | position | load type | primary region | secondary | contraindication gates | regression | progression |
|---|---|---|---|---|---|---|---|---|---|---|
| `yog-mountain` | Standing tall | Tadasana | none | standing | bodyweight isometric | none | calves, abs | dizziness on standing | feet wider, hand on a wall | eyes closed |
| `yog-cat-cow` | Cat and cow | Marjaryasana Bitilasana | mat | quadruped | active ROM | lower-back | abs, mid-back | wrist pain; knee pressure | forearms down, cushion under knees | slower with breath |
| `yog-childs-pose` | Child's pose | Balasana | mat | kneeling | passive ROM | lower-back | glutes | knee flexion limits; ankle limits | cushion behind knees | arms forward, chest lower |
| `yog-down-dog` | Downward dog | Adho Mukha Svanasana | mat | plank-hands | bodyweight isometric | delts-front | hamstrings, calves, abs | wrist pain; shoulder impingement; high blood pressure (short holds) | hands on a chair | heels down, longer hold |
| `yog-plank` | High plank | Phalakasana | mat | plank-hands | bodyweight isometric | abs | delts-front, triceps, glutes | wrist pain | knees down | forearm plank with a leg lift |
| `yog-chaturanga` | Low plank lower | Chaturanga Dandasana | mat | plank-hands | bodyweight dynamic | triceps | chest, delts-front, abs | shoulder impingement; rotator cuff pain | knees down, half range | slow eccentric to hover |
| `yog-up-dog` | Upward dog | Urdhva Mukha Svanasana | mat | prone | bodyweight isometric | lower-back | delts-front, triceps | lumbar extension intolerance; wrist | cobra with forearms down | thighs off the floor |
| `yog-cobra` | Cobra | Bhujangasana | mat | prone | bodyweight isometric | lower-back | glutes, mid-back | lumbar extension intolerance | sphinx on forearms | higher lift, hands lighter |
| `yog-warrior-1` | Warrior one | Virabhadrasana I | mat | standing | bodyweight isometric | quads | glutes, delts-front | overhead reach limits; knee pain | shorter stance, hands on hips | deeper front knee |
| `yog-warrior-2` | Warrior two | Virabhadrasana II | mat | standing | bodyweight isometric | quads | glutes, adductors, delts-side | knee pain; hip impingement | shorter stance | deeper bend, longer hold |
| `yog-warrior-3` | Warrior three | Virabhadrasana III | mat | standing-1leg | bodyweight isometric | glutes | hamstrings, abs | balance impairment; fall risk | fingertips on a chair | arms forward, longer hold |
| `yog-triangle` | Triangle | Trikonasana | mat | standing | active ROM | obliques | hamstrings, adductors | hamstring strain; neck rotation | hand on a block or shin | hand to the floor |
| `yog-side-angle` | Side angle | Utthita Parsvakonasana | mat | standing | bodyweight isometric | quads | obliques, adductors | knee pain; shoulder reach | forearm on thigh | full side reach |
| `yog-chair` | Chair pose | Utkatasana | mat | standing | bodyweight isometric | quads | glutes, delts-front | knee pain in deep flexion; overhead reach | hands at chest, shallow sit | deeper sit, longer hold |
| `yog-tree` | Tree | Vrksasana | mat | standing-1leg | bodyweight isometric | glutes | calves, abs | balance impairment; fall risk | toes down as a kickstand | foot to inner thigh, eyes closed |
| `yog-half-moon` | Half moon | Ardha Chandrasana | mat | standing-1leg | bodyweight isometric | glutes | obliques, hamstrings | balance impairment; fall risk | back to a wall, hand on a block | free balance, top arm up |
| `yog-eagle` | Eagle | Garudasana | mat | standing-1leg | bodyweight isometric | quads | glutes, delts-rear | knee pain; shoulder mobility | feet crossed, no wrap | full wrap, deeper sit |
| `yog-crow` | Crow | Bakasana | mat | plank-hands | bodyweight isometric | delts-front | abs, triceps, forearms | wrist pain; shoulder instability | knees on triceps, toes down | one foot up, then both |
| `yog-side-plank` | Side plank | Vasisthasana | mat | side-lying | bodyweight isometric | obliques | delts-side, glutes | wrist pain; shoulder instability | forearm and bottom knee down | top leg lifted |
| `yog-boat` | Boat | Navasana | mat | seated-floor | bodyweight isometric | abs | hip-flexors, quads | spinal flexion intolerance; hamstring strain | knees bent, hands behind thighs | legs straight, arms forward |
| `yog-bridge` | Bridge | Setu Bandha Sarvangasana | mat | supine | bodyweight isometric | glutes | hamstrings, lower-back | neck load; hamstring cramp | feet closer, smaller lift | one leg lifted |
| `yog-camel` | Camel | Ustrasana | mat | kneeling | active ROM | lower-back | quads, delts-front | lumbar extension intolerance; neck; high blood pressure | hands on the low back | hands to heels |
| `yog-pigeon` | Pigeon hip stretch | Eka Pada Rajakapotasana | mat | seated-floor | passive ROM | glutes | hip-flexors | knee pain in the front leg; hip labral pain | figure four on the back | chest down over the shin |
| `yog-savasana` | Lying rest | Savasana | mat | supine | none | none | none | none | knees bent over a bolster | none, it is the end |

**Deliberately excluded from the corpus, with reasons.** Headstand
(Salamba Sirsasana), shoulderstand (Salamba Sarvangasana) and full wheel
(Urdhva Dhanurasana) are omitted. B5's finding that the yoga injury rate is
highest and rising in adults aged 65+, with fracture incidence roughly three
times higher, plus B4's 1.9% serious adverse event rate, is enough to say that
an app which cannot see the athlete should not be the thing that first suggests
a loaded cervical inversion. They belong in the catalog only behind an explicit
"my teacher has taught me this" gate, which is a product decision, not a
research one. Flagging it here so the omission is a choice on the record.

### 4.5 Barre (11)

| id | plain name | traditional name | equipment | position | load type | primary region | secondary | contraindication gates | regression | progression |
|---|---|---|---|---|---|---|---|---|---|---|
| `bar-plie` | Wide knee bend | Demi-plie, second position | barre or chair back | standing-supported | bodyweight dynamic | quads | glutes, adductors | knee pain; hip impingement | shallow bend, both hands on the barre | heels up throughout |
| `bar-plie-releve` | Heels-up knee bend | Plie in releve | barre or chair back | standing-supported | bodyweight isometric | calves | quads, adductors | ankle instability; calf cramp | heels down | one hand off, add pulses |
| `bar-releve` | Heel raises at the barre | Releve | barre or chair back | standing-supported | bodyweight dynamic | calves | tibialis, glutes | achilles pain | both hands on the barre | single leg |
| `bar-thigh-dancer` | Thigh work at the wall | Thigh Dancer | wall | standing-supported | bodyweight isometric | quads | glutes | knee pain in deep flexion; patellofemoral pain | higher sit against the wall | thighs parallel, add pulses |
| `bar-tendu` | Toe point and slide | Tendu | barre or chair back | standing-1leg | bodyweight dynamic | hip-flexors | quads, calves | balance impairment | hand on the barre | no hands, add a lift |
| `bar-arabesque` | Straight leg lift behind | Arabesque lift | barre or chair back | standing-1leg | bodyweight isometric | glutes | hamstrings, lower-back | lumbar extension intolerance | small lift, both hands down | higher lift, add pulses |
| `bar-attitude` | Bent leg lift behind | Attitude lift | barre or chair back | standing-1leg | bodyweight isometric | glutes | hamstrings | hip bursitis | small range | longer hold |
| `bar-pretzel` | Seated outer-hip lift | Pretzel | mat | seated-floor | bodyweight isometric | glutes | obliques | hip bursitis; sacroiliac pain | smaller lift, hand support | add a band |
| `bar-clam` | Side-lying knee open | Clam | mat | side-lying | bodyweight dynamic | glutes | obliques | hip bursitis | smaller range | add a band |
| `bar-curl` | Ab curl series | Curl | mat | supine | bodyweight isometric | abs | hip-flexors | neck flexion intolerance; spinal flexion intolerance | head down on a cushion | hands off the thighs |
| `bar-arm-series` | Light weight arm series | Arm Series | 1 to 3 lb dumbbells | standing | light external load | delts-side | delts-front, triceps, biceps | shoulder impingement in overhead range | no weights, shorter sets | 3 lb, longer sets |

### 4.6 Tai chi and qigong (6)

| id | plain name | traditional name | equipment | position | load type | primary region | secondary | contraindication gates | regression | progression |
|---|---|---|---|---|---|---|---|---|---|---|
| `tai-commencing` | Opening stance | Commencing Form | none | standing | bodyweight isometric | none | quads, calves | dizziness on standing | seated version | longer hold, softer knees |
| `tai-ward-off` | Ward off and press | Grasp Sparrow's Tail | none | standing | bodyweight dynamic | none | quads, glutes, delts-front | balance impairment | narrower stance | wider stance, lower posture |
| `tai-brush-knee` | Brush knee and push | Brush Knee and Push | none | standing | bodyweight dynamic | none | quads, glutes | balance impairment; fall risk | shorter step | full step, slower transfer |
| `tai-cloud-hands` | Cloud hands | Cloud Hands | none | standing | bodyweight dynamic | none | obliques, quads | cervical rotation limits | smaller sideways step | full weight transfer |
| `tai-golden-rooster` | Stand on one leg | Golden Rooster Stands on One Leg | none | standing-1leg | bodyweight isometric | glutes | calves, abs | balance impairment; fall risk | fingertips on a chair | free stand, longer hold |
| `tai-standing-post` | Standing still practice | Zhan Zhuang | none | standing | bodyweight isometric | none | quads, calves | orthostatic symptoms; prolonged standing intolerance | seated, shorter time | lower posture, longer time |

### 4.7 What this corpus is NOT

- It is not a sequencing engine. v12 section 19 asks for modality-specific
  sequencing, and a real class sequence is a teacher decision made in the room.
  What the records carry is enough to *understand* a logged class, not to run one.
- It does not carry `EXERCISE_DEMOS` keyframes, which R-ONT section 8 gate G1-e
  names as the blocker on any catalog growth. Adding 72 records to `EXERCISES`
  today would fail `data.test.ts` and the 1:1 demo contract. These records should
  land in the class-vocabulary table described in section 5, not in `EXERCISES`,
  until the demo tiering R-ONT proposes exists.
- It does not include the poses in 4.4's exclusion note, on purpose.

---

## 5. THE CLASS-NOT-SESSION PROBLEM

### 5.1 Why the prescription model does not survive contact

BodyT's unit of prescription is `PrescriptionBase` (`src/types.ts:59-65`): sets,
`repText`, optional `repsNum`, resolved into a `ResolvedExercise` and executed
by the athlete alone, in order, with a rest timer between sets
(`restSec`, `types.ts:45`).

A studio class violates every part of that:

| BodyT assumes | a class gives |
|---|---|
| the app chooses the movements | a teacher chooses them, live, and changes them mid-class |
| the app chooses the order | the teacher's sequence, which the athlete cannot reorder |
| sets and reps | continuous flow, counted by the teacher's voice or not at all |
| a rest timer between sets | no discrete sets to rest between |
| the athlete can stop early | a paid 50-minute booking in a room full of people |
| the athlete can substitute a movement | modifying in public, which most people will not do |
| the session happens when the plan says | Tuesday 6pm because that is when the class is |

The last row is the one that actually breaks scheduling. A class is a fixed
appointment. The plan bends around it, not the other way.

### 5.2 What the app can legitimately prescribe

**Yes, it can prescribe:**

1. **A frequency and a type, as a suggestion.** "Two of these a week would fit
   well" is a legitimate prescription because the athlete controls it and the
   evidence supports the dose bracket (A12: neuromotor work 2 to 3 days a week,
   20 to 30 minutes, with the position stand itself saying the optimal dose is
   not known).
2. **The self-directed home version.** A 10-minute mat sequence the athlete does
   alone in their room IS a BodyT session and takes the normal prescription
   shape. That is where the corpus in section 4 belongs, and it is the honest
   home for what gets marketed as wall Pilates (C1).
3. **One thing to pay attention to in the next class.** A single cue, not a
   sequence. "If chaturanga bothers your shoulder, take the knees down" is
   coaching. It is also the highest-value output the app has here, because A10
   and B4 together say the trial injury rate is low and the real-world rate is
   not, and the gap is instruction and self-selection.
4. **Everything around the class.** The lifting day before it, the day after it,
   what to eat, whether tomorrow's session gets lighter. This is where the
   engine earns its keep.

**No, it must not prescribe:**

1. **A 50-minute class sequence dressed as a class.** The app cannot teach, cannot
   see, and cannot correct. Section 4.4's exclusion note is the same principle.
2. **Skipping or leaving parts of a class the athlete has paid for.** Suggesting
   somebody sit out the last ten minutes of a booked class is the app
   overreaching into a room it is not in.
3. **Reps.** Standing constraint, and it holds doubly here. The app does not pick
   reps and neither does the athlete; the teacher does.
4. **A class as the weekly conditioning session.** Section 3.4, with A6 and B3.

### 5.3 The logging shape

Two options were considered. The recommendation is option A.

**Option A (recommended): extend the existing cardio log.** Add class activities
to `CARDIO_ACTIVITIES` (`src/plan/cardio.ts:44`) and carry the extra fields on
`CardioEntry` (`src/activityTypes.ts:68-117`) as optional.

Why: `CardioEntry` already has `minutes`, `when` ('pre' | 'post' | 'solo'),
`mode`, `feltIntensity` and `label`. `loggedSessions` (`activityLog.ts:114`)
already unifies it with runs. `conditioningLoggedThisWeek`
(`resolveDay.ts:85-92`) already reads it. Every consumer that needs to know a
class happened already looks in this one place. A parallel `ClassEntry` type
would mean every one of those call sites has to learn about a second log, which
is the same mistake as having two sources of truth for unloaded-ness that R-ONT
section 1.3 documents.

Why not option B (a new `ClassLog` shape): it buys a cleaner type and costs a
second scan in six engine files. Not worth it.

```ts
// src/activityTypes.ts, additive, all optional.

/** Taught-class detail. Absent on every non-class entry. */
export interface ClassDetail {
  /** Catalog id: 'pilates-mat' | 'yoga-vinyasa' | 'barre' | ... */
  format: string
  /** Did this class use weights, bands or springs? Decides the volume rate. */
  loaded?: 'none' | 'light' | 'springs'
  /** Heated room. Hydration flag only; no volume or fatigue effect. */
  heated?: boolean
  /** Taught live, or followed from a screen at home. */
  taught?: 'studio' | 'online-live' | 'video' | 'self'
}
```

`CardioEntry` gains `classDetail?: ClassDetail` and nothing else changes shape.

**The questions to ask, and only these.** `CardioActivityDef.asks`
(`cardio.ts:29`) is the existing mechanism for per-activity questions and it
should carry exactly four for a class:

| question | field | why it is worth asking |
|---|---|---|
| How long? | `minutes` | multiplies both volume and fatigue credit |
| Which kind? | `mode` | mat vs reformer, vinyasa vs slow, changes the region map |
| Any weights or springs? | `classDetail.loaded` | the single biggest swing in credit, section 3.5 |
| How did it feel? | `feltIntensity` | the only effort signal available with no steps and no GPS |

**Questions NOT to ask.** Which poses. How many reps. Whether they modified.
Whether the teacher corrected them. Every one of those is a question a person
cannot answer accurately about a 50-minute class an hour later, and R3's rule
holds: do not collect what cannot be answered and would not change a decision.

### 5.4 The recurring-schedule shape

Most class attendance is a standing appointment, which means the app should stop
asking and start expecting.

`WeekState` already has two mechanisms and the right one is the second:

- `events: Partial<Record<string, Weekday[]>>` (`types.ts:330`), the life-event
  map, models "this thing hits these weekdays this week". A class is closer to
  this than to anything else in the app.
- `cardio: { exerciseId: string; weekdays: Weekday[] } | null` (`types.ts:327`),
  scheduled conditioning. Wrong home, because a class is explicitly not
  conditioning (section 3.4), and `resolveDay:221` reads this field to decide
  whether the mandatory conditioning rule is satisfied.

Recommendation: a third field, `classes?: { format: string; weekdays: Weekday[];
minutes: number }[]`, parallel to `cardio` but read by the volume and fatigue
channels rather than the conditioning gate. Set once during onboarding
("Tuesdays and Thursdays, about an hour"), confirmed weekly the same way
`ballThisWeek` is, and logged as attended or missed the same way `ballDates` is.

That gives the planner something it has never had: knowledge of a training day
BEFORE it happens, rather than a log entry after. Every other unplanned activity
in the app is discovered retrospectively. A standing class is the one kind of
outside training that can be planned around, and the plan should place its own
lower day away from it.

### 5.5 The honesty problem this creates

Once a class is a first-class object, the athlete will expect the app to
understand it. It does not. It knows a format, a duration and a feeling. The
Booklet copy has to be truthful about that:

> You log Pilates twice a week. I count it, roughly, and I plan around it. I
> cannot see what you actually did in there, so if a week feels harder than the
> plan expects, tell me and I will take it down.

That is the correct level of confidence to express, and it matches the
provenance-and-confidence rule R-ONT section 3.4 sets out for ingested data:
authored and reviewed is 1.0, inferred is not.

---

## 6. AUDIT OF THE LIVE CODE

Every row verified by reading the file in this worktree, not inferred.

### 6.1 The headline: the modalities do not exist

`grep -rn -i -E "pilates|yoga|barre|tai.?chi|qigong|reformer|mind.?body|studio"`
across `src/`, `e2e/` and `scripts/` returns **zero matches**. Not a catalog
entry, not a cardio activity, not a sport option, not a string in any copy.

For an app whose v12 coverage checklist names "Pilates, wall Pilates, reformer
concepts, yoga, barre, Tai Chi/Qigong" as modalities it must represent
(playbook_v12.md:1050), that is the whole finding in one line.

### 6.2 What happens today when the real training is studio classes

| # | what the athlete does | what the code does | file:line | severity |
|---|---|---|---|---|
| 1 | Logs a Pilates class | Only route is `custom`, MET 6.0, which is roughly double the measured value (A17 puts Pilates near 2.5 to 3.0) | `src/plan/cardio.ts:206` | calorie estimate about 2x high |
| 2 | Logs it as `custom` | `custom` carries `conditioning: true`, so `conditioningLoggedThisWeek` returns true and the mandatory weekly conditioning rule is satisfied | `cardio.ts:206`, `resolveDay.ts:85-92`, `resolveDay.ts:104` | **the app's one non-negotiable health rule silently defeated by a yoga class** |
| 3 | Logs it as `custom` | `ACTIVITY_TRACKING.custom` assumes `steps: true`, `distance: 'gps'`, stride 0.415 m, band 3000 to 6000 steps/hour | `cardio.ts:440-446` | a mat class can be credited with distance travelled |
| 4 | Does four classes a week | `regionLoad` never sees them; every muscle region reads zero from class work | `volume.ts:169-184` | plan built as if four training days were rest |
| 5 | Same | `sessionFatigue` reads `MOVEMENT[id].fatigue`; no class has a `MOVEMENT` id | `movement.ts:472-474` | systemic fatigue reads zero |
| 6 | Same | `weekLoad` is the only function that counts unplanned load, and it is on the dead-export allowlist | `adapt.ts:543-560`, `structure.test.ts:273` | **nothing consumes it, so even the coarse answer never reaches a decision** |
| 7 | Same | Even if wired in, `unplanned += Math.round(minutes / 15)` charges 60 minutes of restorative yoga exactly what it charges 60 minutes of competitive soccer | `adapt.ts:553-557` | flat rate, wrong by a factor of 3 to 6 across the family |
| 8 | Same | `planned` half sums `MOVEMENT.fatigue * sets` (roughly 15 to 25 for a normal day); `unplanned` half maxes near 4 for an hour. Different scales in one return value | `adapt.ts:549-557` | the two numbers cannot be compared, which is what the function exists to do |
| 9 | Logs a class, then trains | `trimToFit` and `overloadedRegions` accept `slack` but nothing raises it for prior activity | `volume.ts:207`, `volume.ts:416-427` | the lever exists and is unused |
| 10 | Attends on a fixed weekly schedule | `WeekState` can model scheduled conditioning (`cardio`) and recurring life events (`events`), neither of which fits | `types.ts:327-331` | a knowable training day stays invisible to the planner |

### 6.3 What onboarding cannot capture

| # | gap | file:line | consequence |
|---|---|---|---|
| 11 | `SPORTS` has 29 entries. None is Pilates, yoga, barre or tai chi. Nearest are 'Dance' and 'Gymnastics' | `plan/followups.ts:56-64` | the "what do you play?" question has no honest answer for a Pilates practitioner |
| 12 | An unrecognised answer falls back to `DEFAULT_SPORT_QUALITIES` = acceleration, athletic-strength, change of direction, balance-stability | `followups.ts:117` | a Pilates user typing their modality gets a sprint-and-agility athletic profile |
| 13 | `SPORT_ACCESS` has 25 sports, none a studio | `screens/onboarding/onboardingData.ts:214-240` | a Pilates user is asked whether they have a running track |
| 14 | `HOME_CHECKLIST` has 16 items. No mat, no reformer, no blocks, no straps, no barre | `onboardingData.ts:126-143` | the equipment they own is unrepresentable |
| 15 | `EquipTag` has 28 values. None is a mat | `types.ts:141-172` | and therefore `canDo` can never gate on one |
| 16 | `LIFE_CHIPS` nearest entry is "I already play a sport", mapped to `kind: 'on-feet'` | `onboardingData.ts:35` | a 6pm Pilates class would be modelled as an on-feet work shift, which drops the NEXT day's jump set for the wrong reason |
| 17 | `experience` is four lanes: new, coming back, casual, experienced | `screens/onboarding/Onboarding.tsx:502-507` | somebody with five years of Pilates and zero barbell hours has no honest lane, and `generator.ts:356-364` reads that answer to set starting sets |
| 18 | The only "how active are you now" question sits on the general and lean goal paths | `followups.ts:386-391` | a strength-goal user with a heavy class week is never asked |
| 19 | `inferGoal` regex has no branch for any of these words | `onboardingData.ts:42-57` | typing "get better at Pilates" returns null and the goal falls through |

### 6.4 What the catalog is missing

| # | gap | evidence |
|---|---|---|
| 20 | 6 exercises of `kind: 'mobility'` in the whole catalog: `hip-9090-switch`, `deep-squat-hold`, `ankle-wall-mobilization`, `couch-stretch`, `t-spine-opener`, `dead-hang` | parse of `plan/exercises.ts:691-810` |
| 21 | 7 of `kind: 'core'`: `hanging-leg-raise`, `weighted-situp`, `plank-side-plank`, `hollow-hold`, `dead-bug`, plus `bird-dog` and `superman-hold` in home | `exercises.ts:261,643,666,1593,1616`, `homeExercises.ts:430,454` |
| 22 | So the entire mind-body-adjacent vocabulary is 13 movements out of 194 (6.7%), against `lift` at 87 and `jump` at 46 | kind census across the five catalog files |
| 23 | No `ExerciseKind` value fits a taught class. The eight are sprint, jump, lift, core, carry, mobility, cardio, warmup | `types.ts:14-22` |
| 24 | `swapCandidatesFor` matches on same kind plus shared primary muscle, so a user who wants a lower-impact alternative to a squat gets other squats, never a class-style option | `plan/subs.ts:50-90` |
| 25 | `EXERCISE_DEMOS` is required 1:1 for every catalog id and the test asserts no orphans in either direction | `plan/data.test.ts:141-162` |
| 26 | `estimateMinutes` infers timed work by regex on the display string `repText` | `engine/focus.ts:98` |

Findings 25 and 26 are the reason section 4 says the corpus must land in a
class-vocabulary table rather than in `EXERCISES` today. R-ONT section 8 gate
G1-e is the same conclusion arrived at from a different direction.

### 6.5 The copy problem nobody has hit yet

`resolveDay.ts:226` and `resolveDay.ts:256` produce a mandatory banner reading
"No conditioning yet this week, so one session is REQUIRED" and "No conditioning
logged this week and none scheduled".

A user who has logged four yoga classes this week and sees that banner will read
it as the app not listening. The banner is **correct** (A6, B3: a yoga class is
light activity and does not meet the intensity recommendation), and it is going
to feel wrong. The fix is copy, not logic:

> Four classes in, nice. Those are not the hard breathing kind though, so the
> weekly cardio still stands. A brisk 20 minutes covers it.

Naming this here because the temptation, once classes are countable, will be to
set `conditioning: true` to make the banner go away, and that would trade an
awkward sentence for a broken health rule.

### 6.6 One thing the code already gets right

`CardioEntry` keeps measured `intensity` strictly apart from claimed
`feltIntensity`, with a comment saying the disagreement between them is the
signal (`activityTypes.ts:103-116`), and `engine/calibration.ts:171-190` builds
a personal band from it. For classes there is no measured side at all, so the
class channels are self-report only. The existing separation means that fact is
already representable rather than needing a new concept: a class entry simply
has `feltIntensity` and no `intensity`, and every consumer that checks for the
measured field already handles its absence.

---

## 7. EVAL FIXTURES

18 cases. Each is athlete state in, expected plan and volume accounting out.
Every expectation is traceable to a source in section 1 or a rule in section 3.

**F1. Four barre classes a week, goal build muscle.**
IN: 4 x 50 min barre, no lifting history, `experience: 'new'`.
OUT: weekly class credit 10 fractional sets each to quads, glutes and adductors
(3.5), 5 to calves and delts-side. Plan must NOT add a fifth quad-dominant day.
Plan MUST lead with pulling, because the barre week supplies zero pull volume
(section 2.6). Copy must not say barre is enough for muscle (A14, A15) and must
not say it is useless either (C7).
FAIL IF: the plan schedules its own heavy lower day plus the four classes without
comment, or the generator fills every leg slot.

**F2. Three mat Pilates classes a week, goal lose weight.**
IN: 3 x 50 min mat Pilates, sedentary otherwise.
OUT: energy channel uses MET 3.0, not 6.0. Weekly conditioning rule NOT satisfied
(A6, B3); the plan schedules or requires one real conditioning session. Abs and
obliques land at 7.5 fractional sets a week, so the plan adds no direct core work.
FAIL IF: `conditioningLoggedThisWeek` returns true, or the plan includes a core
slot, or calories are estimated at MET 6.0.

**F3. Two vinyasa classes a week, goal get stronger.**
IN: 2 x 60 min vinyasa, lifts twice a week.
OUT: 6 fractional sets to quads, glutes, delts-front; 3 to triceps and abs.
Systemic fatigue rate 0.6. The lifting plan is essentially unchanged, because two
classes is not enough to displace anything. Copy states plainly that the classes
are not the strength work (A2, B1).
FAIL IF: the plan reduces lifting volume for two classes, which is overcounting.

**F4. Daily restorative yoga, goal general health.**
IN: 7 x 40 min restorative or yin.
OUT: regional volume credit **zero** (modality multiplier 0, section 3.5).
Systemic fatigue rate 0.15, so about 1 point a session. Conditioning rule not
satisfied. Plan is built as if the athlete is untrained, because they are.
FAIL IF: seven logged sessions cause any volume reduction anywhere.

**F5. Pilates instructor teaching 15 classes a week.**
IN: profile says instructor; 15 taught classes, 2 personal practice.
OUT: this is occupational load, not training load. Map to the existing `on-feet`
life event kind (`types.ts:130`), which already drops the next day's jump set.
Volume credit applies to the 2 personal sessions only; a class you demonstrate is
not a class you do. Ask once rather than assume (B7).
FAIL IF: 15 classes are credited as 15 training sessions.

**F6. Reformer twice a week plus lifting three times.**
IN: 2 x 50 min reformer, 3 BodyT lifting days.
OUT: reformer multiplier 1.2, so 3 fractional sets per class to glutes, quads,
hamstrings, abs, adductors; 1.5 to lats and mid-back. This is the one class type
that touches pull. Weekly totals combine with plan volume for the Booklet view,
never for the per-session ceiling (section 3.5).
FAIL IF: reformer credit enters `overloadedRegions` as same-day sets.

**F7. Age 68, one fall last year, currently does two yoga classes a week.**
IN: as stated.
OUT: yoga credited for balance (A7, g 0.40) and flagged for risk, because the
ED-treated injury rate at 65+ is 57.9 per 100,000, roughly five times the 18-44
rate, with fracture incidence about three times higher (B5). The suggestion is
tai chi added or substituted, because A11 is a 670-person RCT showing a 58% fall
reduction versus a stretching control and yoga has no equivalent evidence (A7's
own caveat). Suggest, never auto.
FAIL IF: the app tells this user yoga will prevent their falls.

**F8. Says "Pilates", the class used 5 lb weights throughout.**
IN: logs `pilates-mat`, answers `loaded: 'light'`.
OUT: the entry is re-rated to the sculpt profile: MET 5.5, volume multiplier 1.4,
fatigue rate 0.8, and `conditioning: true` becomes eligible. This is the single
question that most changes the answer (section 5.3).
FAIL IF: the `loaded` answer is not asked, or is asked and ignored.

**F9. REGRESSION. A class logged through the `custom` fallback.**
IN: `CardioEntry { activityId: 'custom', label: 'Pilates', minutes: 50 }`.
OUT: must NOT satisfy the weekly conditioning rule. Today it does, via
`cardio.ts:206` and `resolveDay.ts:104`, and that is finding 2 in section 6.2.
The fix is either a class-aware check or splitting `custom` into a conditioning
and a non-conditioning variant.
FAIL IF: `conditioningRequiredForWeek` returns false after this entry alone.

**F10. Four yoga classes logged, Thursday, no run.**
IN: as stated, Tier 1 week, `ballThisWeek: false`.
OUT: the mandatory conditioning banner still fires, correctly, and its copy
acknowledges the four classes (section 6.5). Two sentences, no jargon.
FAIL IF: the banner reads as if nothing was logged, or the rule is bent.

**F11. Barre class at 7am, BodyT lower day booked for 6pm.**
IN: class logged with `when: 'solo'`, same date, before the session starts.
OUT: `slack` raised by the class's largest single-region credit (2.5 for a 50 min
barre class), capped by `MAX_TIME_SLACK` (`volume.ts:400`). `trimForVolume` then
trims from the bottom as it already does. The opening two movements are protected
(`PROTECTED_LEAD`, `volume.ts:119`).
FAIL IF: the day is untouched, or the lead lifts are cut.

**F12. Regular attender stops for three weeks.**
IN: 4 classes a week for 8 weeks, then 21 days with none.
OUT: regional credit is computed over the trailing 7 days only, so it reads zero
now (section 3.7). The Booklet's picture of who this person is may persist; this
week's arithmetic may not.
FAIL IF: stale class credit suppresses volume the athlete now needs.

**F13. Hot yoga and a long run on the same day.**
IN: 60 min hot yoga, 10 mile run.
OUT: `heated: true` produces a hydration note and nothing else. No extra volume
credit, no extra fatigue credit; heat raises heart rate and perceived effort
without raising mechanical work, and there is no evidence base for charging it as
training load.
FAIL IF: hot yoga is credited above vinyasa on any channel other than the note.

**F14. User reports very easy end-range flexibility and frequent joint aches.**
IN: free text mentioning hypermobility or bending unusually far.
OUT: this is a functional fact, not a diagnosis (v12 49.1). It routes to R6's
constraint machinery. The class-side action is narrow and honest: prefer the
strength-through-range options in the corpus over the passive-ROM ones, and do
not push end range. B6 supports "common in these populations and associated with
complaints", not "proven cause", and the copy must not overstate it.
FAIL IF: the app asserts an injury risk the evidence does not carry, or ignores
the report entirely.

**F15. Diagnosed osteoporosis, wants a home Pilates sequence.**
IN: as stated.
OUT: the loaded-spinal-flexion records are excluded by contraindication gate:
`pil-roll-up`, `pil-roll-over`, `pil-rolling-ball`, `pil-teaser`, `pil-seal`
(section 4.2). What remains is the prone, side-lying, bridge and plank family.
This is a hard exclusion, not a preference, and R6 owns the gate.
FAIL IF: any record tagged `osteoporosis (avoid)` is prescribed.

**F16. Four barre classes a week, and the plan is generated.**
IN: as F1, at generation time rather than mid-block.
OUT: the generated split leads with pull. `POOLS` (`generator.ts:156`) and the
slot vocabulary must not fill lower slots that the class week already covers.
The Booklet explains the choice in one plain sentence (section 3.9).
FAIL IF: the generator produces its default balanced split as though the classes
did not exist.

**F17. User asks about a 28-day wall Pilates challenge.**
IN: free-text question.
OUT: an honest answer. Wall Pilates is mat Pilates done with the feet on a wall;
it has zero indexed trials of its own (C1); the general Pilates evidence applies
and that evidence is about trunk endurance and back pain, not transformation.
FAIL IF: the app repeats a body-transformation claim, or dismisses the format
(the movements are real, the marketing is not).

**F18. Age 74, two falls, doing tai chi twice a week.**
IN: as stated.
OUT: zero volume credit, zero conditioning credit, and the strongest positive
statement in this entire pack: A11 is a 670-person RCT in which exactly this dose
cut falls 58% versus a stretching control. The plan protects this and builds
around it rather than competing with it.
FAIL IF: the plan tries to replace tai chi with anything, or the app fails to say
this is working.

**Coverage note.** These 18 do not test sequencing, teaching or technique inside
a class, because section 5 argues the app has no business there. They test
accounting, gating, scheduling and copy, which is the full surface the app
actually owns.

---

## 8. WHAT TO DO NEXT, IN ORDER

Sequenced so each step is shippable alone and none of them needs the next one.

1. **Fix the `custom` conditioning hole (F9).** Smallest change, biggest safety
   value. One line in `cardio.ts:206` plus a test. Today any class logged as
   `custom` defeats the app's one mandatory health rule.
2. **Add the class activities to `CARDIO_ACTIVITIES`** with real METs and
   `conditioning: false`, plus their `ACTIVITY_TRACKING` rows
   (`{ steps: false, distance: 'none' }`) so `intensity.test.ts:29` stays green.
   This alone stops the 2x calorie error and gives every downstream channel
   something honest to read.
3. **Add the four class questions** (`minutes`, `mode`, `loaded`,
   `feltIntensity`) and the `ClassDetail` shape. Section 5.3.
4. **Wire `weekLoad` in, with per-activity fatigue rates,** and delete
   `engine/adapt.ts:weekLoad` from the dead-export allowlist at
   `structure.test.ts:273`. Allowances shrink only, so this is the direction the
   repo already wants to move.
5. **Add the regional volume channel** as a new `engine/classLoad.ts`, with the
   same-day path feeding `slack` and the weekly path feeding the Booklet.
   Section 3.5. This is the step that changes plans.
6. **Onboarding: add the modalities to `SPORTS` and `SPORT_ACCESS`,** give them a
   quality profile that is not the sprint default, and add a mat to `EquipTag` and
   `HOME_CHECKLIST`. Section 6.3, findings 11 to 15.
7. **The standing-class schedule** (`WeekState.classes`). Section 5.4. This is
   the only one that needs a UI, and it is worth it: it turns a retrospective log
   into something the planner can place a lower day away from.
8. **The 72-record corpus,** last, and behind R-ONT's demo tiering (gate G1-e).
   The records are useful to the engine as a class vocabulary long before they are
   useful to `EXERCISES` as prescribable movements.

**Do not do:** build a class sequencer, add per-pose prescriptions to the
session view, or let any of these modalities satisfy the weekly conditioning
rule. Sections 5.2 and 3.4.

**Open questions this pack could not settle.**

- The volume rate in section 3.5 is a calibrated house heuristic, not a measured
  conversion. No study converts class minutes into equivalent hard sets, and the
  honest way to improve it is longitudinal data from BodyT users who do both, not
  more literature.
- The barre MET value is estimated. C3 explains why: there is nothing to cite.
- Whether reformer's spring load should eventually earn a place on the strength
  progression graph (R9 section 3) rather than a flat volume credit. B1 is
  suggestive; one RCT in older women is not enough to build a ladder on.
