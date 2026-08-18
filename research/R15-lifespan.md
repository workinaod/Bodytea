# R15: Lifespan programming, youth (LTAD) through masters

Research job R15 for BodyT. Deterministic local-first coaching PWA, zero runtime LLM calls,
general wellness, never diagnoses. Covers v12 section 12 (Youth & adolescent fitness /
long-term athletic development), section 11 (Older adults, frailty, sarcopenia, falls &
healthy aging) where it is age-indexed rather than function-indexed, and the menopause and
bone-health slice of section 13.

Access date for all web sources: 2026-08-18. Researcher: Claude (session d21c12d6).
Code read at the `wt-fix2` working tree. No production code changed by this pack. No repo
writes outside this file.

**Contents.** 1 where this pack defers to R6 and R7, and where it extends them. 2 sources
(S1 to S45, 21 Tier A). 3 the age-band table (eight bands, six dimensions each). 4 the minor
problem, with a recommendation. 5 maturity, not birthday, with the question copy. 6 the masters
end, five breaks. 7 audit of the live code, twenty findings with file and line. 8 typed schema
proposal. 9 eval fixtures (25 cases, 15 of them paired). 10 integration notes.

Conventions, matched to `research/R12-trainer-authority.md`:

- **SOURCED** = grounded in a source captured in section 2, with its tier.
- **HOUSE RULE** = a product decision, defensible but not derivable from any source. Stated as
  exact numbers on purpose: an adjective is not a policy.
- **DISAGREEMENT** = two sources conflict. Both are preserved, neither is silently resolved.
- No em dashes anywhere in this document, including in the user-facing copy examples.
- Every claim carries either a source tag [S#] or a `file:line` from the live tree.
- Tiers: **A** = guideline body, professional society position stand, consensus statement, or
  regulation. **B** = systematic review, meta-analysis, RCT, or longitudinal cohort.
  **C** = narrative review, expert model paper, or single small study.

**The six claims this pack makes, if nothing else is read.**

1. **BodyT does not know how old anybody is.** There is no chronological age field in the
   store (`src/store/schema.ts:224-229`), no question in onboarding
   (`src/screens/onboarding/MeStep.tsx:29-47` collects name, sex, height, weight and nothing
   else), and one file states the refusal as policy: `src/plan/sportsNutrition.ts:130-132`
   says the app "does not ask for [age] and will not start asking for it". Every age-shaped
   constant in the tree is therefore a young-adult constant with no label on it.
2. **The table the brief asked for is not what it looks like.** `LB_PER_WEEK_CEILING` at
   `src/plan/milestones.ts:119` is indexed by `TrainingAge`, which is `'new' | 'returning' |
   'casual' | 'trained'` (`milestones.ts:29`). It is training history, not birthdays. So is
   `STALL` (`milestones.ts:96`), `VERT_IN_PER_WEEK` (`milestones.ts:162`) and
   `gainPctPerWeek` (`milestones.ts:65`). A 68 year old beginner and a 22 year old beginner
   get identical projections, and the literature says they should not [S30][S36][S38].
3. **The recommendation is a minimum age of 18, stated and gated.** Section 4 makes the case
   and lists the six conditions under which 16 and 17 could be served later, as a separate
   supervised mode and never as a config flag. The reason is not that youth resistance
   training is dangerous, it is not [S2][S3][S17], but that every position stand conditions
   its safety claim on
   "properly designed and supervised", and an unsupervised self-progressing load ladder plus
   a calorie-deficit engine plus a drill sergeant voice is the exact configuration those
   statements were written against.
4. **Chronological age is a weak proxy and BodyT should mostly not ask for it.** Youth of the
   same birth year differ by years of biological maturity [S1 pillar 1][S10][S13], and in older
   adults function is a far better dial than the birthday [R7 3.1]. The questions in section 5
   are function questions and one growth question, not a date of birth field.
5. **Five live constants break for a 60+ athlete, four of them toward a promise the app
   cannot keep and one of them toward a load the athlete cannot make.**
   The deload is fixed at one week in four (`src/engine/transforms.ts:164-178`), the load step
   is a fixed 5 or 10 lb (`src/engine/reps.ts:299-302`), the layoff giveback is capped at
   three steps (`reps.ts:141`), the calorie baseline is a bodyweight multiplier with an
   explicit refusal to include age (`src/plan/sportsNutrition.ts:130-132`), and there is no
   balance content anywhere in the plan vocabulary. Section 7 has line numbers for all of it.
6. **The fix is a single optional typed field plus a band table, not an age branch in every
   engine.** Section 8 proposes `LifeStage` derived from at most three optional answers, read
   in exactly four places, defaulting to the current behaviour when unknown. Unknown must
   never mean "assume 25", which is what the tree does today.

---

## 1. WHERE THIS PACK DEFERS TO R6 AND R7, AND WHERE IT EXTENDS THEM

**R6 owns and this pack does not repeat:** the acute red-flag classifier, the ACSM
preparticipation screening algorithm and its GREEN / YELLOW / RED tiering, the PAR-Q+ derived
question set, and the rule that the app's output of a screen is a referral decision and never a
clearance (`research/R6-safety.md` sections 2, 3, 4). R6 already routes the two age-adjacent
medical facts that matter: known cardiovascular, metabolic or renal disease, and signs or
symptoms. This pack adds no new red flags and moves none of R6's tiers.

**R7 owns and this pack does not repeat:** the function-first model, the eleven modification
operators, the older-adult and frailty pack including the NSCA older-adult Table 1 doses and
the Vivifrail function tiers, the pregnancy and postpartum packs, the osteoarthritis and
osteoporosis packs, and the whole capability-matching layer
(`research/R7-populations.md` sections 2, 3.1, 3.2, 3.4, 5). R7's central claim is the one
this pack builds on rather than argues with: **a fit 68 year old and a frail 68 year old must
not receive age-template clones**, and function is the dial that separates them.

**R7 3.10 opened the minor question and explicitly declined to answer it.** Its words: "That
is a product and legal decision, not a research one, and this pack does not make it." Section
4 of this pack makes the recommendation R7 deferred.

**What R15 extends, and nothing else.**

| Slice | R6 / R7 position | What R15 adds |
|---|---|---|
| Youth | R7 3.10 gives the NSCA youth Table 1 doses and four red lines in half a page | The full LTAD literature and its genuine critiques, maturity estimation, the injury-rate data with numbers, the specialization data, and a band table with per-band numbers |
| Minors | R7 3.10 states three honest options and picks none | A recommendation with reasoning, the consent and data-handling requirements, and the copy that must not render |
| Older adults | R7 3.1 is function-indexed: chair rise, fall history, gait aid | The age-indexed layer R7 deliberately left out: what changes in progression *rate*, deload *frequency*, protein *target* and calorie *baseline* for a healthy, non-frail 60+ athlete who passes every one of R7's function screens |
| Menopause | R7 3.2 covers pregnancy and postpartum; menopause is named in v12 section 13 and is in neither pack | The bone, musculoskeletal and training-response slice, and the one thing the app is allowed to say about it |
| Maturity | Neither pack has a maturity concept | Why chronological age is weak, what the app can practically ask, and the actual question copy |
| Live code | R6 and R7 audit safety gates and capability matching | Every use of age in the tree, every silent young-adult constant, and every place age should gate and does not |

**Where R15 defers on a boundary case.** If a user's age band and a function screen disagree,
R7 wins. A 72 year old who can stand from a chair without hands, has not fallen, and squats
twice a week is programmed off function, not off the birthday. The age band is a **prior**,
and v12's P0 contract already says priors lose to hard constraints and to the athlete's own
evidence.

---

## 2. SOURCES

Access date 2026-08-18 unless noted. "What was taken" is the only thing this pack uses from
each source. Access quality is recorded so a future session does not re-burn usage on a
blocked host. Numbers are quoted only where they were actually retrieved in this session;
citation-level entries are marked and their numbers are never quoted.

### 2.1 Youth, LTAD and maturation

| ID | Tier | Source | URL | What was taken | Access |
|----|------|--------|-----|----------------|--------|
| S1 | A | Lloyd RS, Cronin JB, Faigenbaum AD, Haff GG, Howard R, Kraemer WJ, Micheli LJ, Myer GD, Oliver JL. "National Strength and Conditioning Association position statement on long-term athletic development." J Strength Cond Res 2016;30(6):1491-1509 | https://www.nsca.com/ (text extracted locally to `scratchpad/nsca-ltad.txt`) | The ten pillars verbatim (Table 1). Pillar 1: same-chronological-age groups differ markedly in biological maturity, and maturation varies in extent, timing and tempo. Starting age: roughly 6 to 7 years, keyed to emotional maturity to follow directions and competent balance and postural control, not to a birthday. "If children are ready to engage in organized sports, they are ready to participate in developmentally appropriate strength and conditioning." Growth: well-supervised training does not impair secondary sex characteristics, does not delay menarche, does not restrict eventual height. Specialization thresholds: do not train more than 8 months per year in one sport; 16 hours per week is the threshold above which injury risk rises; injury risk rises when weekly organized-sport hours exceed the child's age in years, or when organized-to-free-play exceeds 2:1. Monitoring: quarterly stature, limb length and body mass; parental consent AND participant assent before any testing. The 5-item wellbeing scale (fatigue, sleep quality, muscle soreness, stress, mood) scored 1 to 5 in 0.5 steps. Synergistic adaptation: pre-PHV boys responded most to plyometrics, post-PHV boys to combined strength and plyometrics | FULL, local text |
| S2 | A | Faigenbaum AD, Kraemer WJ, Blimkie CJR, Jeffreys I, Micheli LJ, Nitka M, Rowland TW. "Youth Resistance Training: Updated Position Statement Paper From the National Strength and Conditioning Association." J Strength Cond Res 2009;23(5 Suppl):S60-S79 | https://www.nsca.com/globalassets/about/position-statements/position_stand_youth_resistance_training---2009.pdf | Table 1 general guidelines: qualified instruction and supervision; 5 to 10 minute dynamic warm-up; begin with relatively light loads and always focus on correct technique; 1 to 3 sets of 6 to 15 reps for strength; 1 to 3 sets of 3 to 6 reps for power; increase resistance gradually by 5 to 10 percent as strength improves; 2 to 3 times per week on nonconsecutive days. The attribution of reported injuries to inappropriate technique, excessive loading, poor equipment, unrestricted access and lack of qualified adult supervision. Every position statement begins "A properly designed and supervised resistance training program" | Captured in R7 as NSCA-YOUTH, re-used here rather than re-fetched |
| S3 | A | Lloyd RS, Faigenbaum AD, Stone MH, Oliver JL, Jeffreys I, Moody JA, Brewer C, Pierce KC, McCambridge TM, Howard R, Herrington L, Hainline B, Micheli LJ, Jaques R, Kraemer WJ, McBride MG, Best TM, Chu DA, Alvar BA, Myer GD. "Position statement on youth resistance training: the 2014 International Consensus." Br J Sports Med 2014;48(7):498-505 | https://pubmed.ncbi.nlm.nih.gov/24055781/ | The multi-society consensus that youth resistance training is safe and effective when properly designed and supervised, and that the risk of not training is the larger risk. Endorsed by multiple sports-medicine, exercise-science and paediatric bodies. Cited by S1 as reference 141 | Citation and abstract level. Numbers not quoted from this source |
| S4 | A | Lloyd RS, Faigenbaum AD, Myer GD, Stone MH, Oliver JL, Jeffreys I, Moody J, Brewer C, Pierce K. "UKSCA Position Statement: Youth Resistance Training." Prof Strength Cond 2012;26:26-39 | http://phwb-project.com/wp-content/uploads/2015/12/UKSCA-Position-Statement-Final.pdf | The UK society position that later became S3. Authorship drawn from paediatric exercise science, physical education, elite sport and sports medicine; endorsed by the UKSCA Board. Used here to establish that the UKSCA and NSCA positions are the same position, not two independent confirmations | Citation level via publisher listing |
| S5 | A | Bergeron MF, Mountjoy M, Armstrong N, Chia M, Cote J, Emery CA, Faigenbaum A, Hall G Jr, Kriemler S, Leglise M, Malina RM, Pensgaard AM, Sanchez A, Soligard T, Sundgot-Borgen J, van Mechelen W, Weissensteiner JR, Engebretsen L. "International Olympic Committee consensus statement on youth athletic development." Br J Sports Med 2015;49:843-851 | https://pubmed.ncbi.nlm.nih.gov/26084524/ | The IOC consensus position on youth athletic development, cited by S1 as reference 21. Used for the existence of a second independent Tier A body reaching the same conclusions as S1 | Citation level via S1's reference list |
| S6 | A | American Academy of Pediatrics Council on Sports Medicine. "Intensive training and sports specialization in young athletes." Pediatrics 2000;106:154-157 | https://pubmed.ncbi.nlm.nih.gov/10878169/ | The paediatric body's warning on intensive training and early specialization, cited by S1 as reference 4 alongside the burnout and dropout literature | Citation level via S1's reference list |
| S7 | B | Ford P, De Ste Croix M, Lloyd R, Meyers R, Moosavi M, Oliver J, Till K, Williams C. "The long-term athlete development model: physiological evidence and application." J Sports Sci 2011;29(4):389-402 | https://pubmed.ncbi.nlm.nih.gov/21259156/ | **The critique.** LTAD as popularised is one-dimensional (physiological only); the "windows of opportunity" claim lacks supporting longitudinal empirical data; the interpretations rest on questionable assumptions and methodologies. S1 cites this paper as reference 82 and concedes the point in its own text: the windows concept "has since been challenged largely because of a lack of supporting longitudinal empirical data" | Abstract and secondary level; the concession is verbatim from S1's local text |
| S8 | C | Balyi I, Hamilton A. "Long-term athlete development: trainability in childhood and adolescence. Windows of opportunity. Optimal trainability." Victoria BC: National Coaching Institute and Advanced Training and Performance, 2004 | Grey literature, no stable URL | The origin of the "windows of opportunity" claim that S7 dismantles and that S1 declines to endorse. Recorded so that a future session recognises the claim when it arrives from a coaching blog, and knows it is Tier C grey literature contradicted by Tier B evidence. **DISAGREEMENT preserved: S8 versus S7, resolved in favour of S7 by S1's own text** | Citation level via S1 reference 10 |
| S9 | C | Lloyd RS, Oliver JL. "The Youth Physical Development Model: A New Approach to Long-Term Athletic Development." Strength Cond J 2012;34(3):61-72 | https://journals.lww.com/nsca-scj/fulltext/2012/06000/the_youth_physical_development_model__a_new.8.aspx | The replacement model. All fitness components are trainable at all stages of development; the mechanisms and the magnitude of adaptation differ with maturation, but nothing is gated behind a window. Two separate models, male and female, keyed to PHV rather than to birth year | Abstract and secondary level |
| S10 | B | Lloyd RS, Oliver JL, Faigenbaum AD, Myer GD, De Ste Croix MB. "Chronological age vs. biological maturation: implications for exercise programming in youth." J Strength Cond Res 2014;28(5):1454-1464 | https://pubmed.ncbi.nlm.nih.gov/24476778/ | The paper this pack's section 5 is named after. Cited by S1 as reference 145 for the claim that individuals of the same chronological age can differ markedly in biological maturity, and for the recommendation to monitor growth rather than infer it from age | Citation level via S1 reference list; the claim itself is verbatim in S1's text |
| S11 | B | Mirwald RL, Baxter-Jones ADG, Bailey DA, Beunen GP. "An assessment of maturity from anthropometric measurements." Med Sci Sports Exerc 2002;34(4):689-694 | https://pubmed.ncbi.nlm.nih.gov/11932580/ | The original maturity-offset equation. Sex-specific, predictors are chronological age, standing height, body mass, sitting height and estimated leg length. Standard error 0.592 years. Accuracy improves the closer the individual is to PHV | Secondary summary; the equation coefficients were not retrieved and are not reproduced here |
| S12 | B | Moore SA, McKay HA, Macdonald H, Nettlefold L, Baxter-Jones ADG, Cameron N, Brasher PMA. "Enhancing a somatic maturity prediction model." Med Sci Sports Exerc 2015;47(8):1755-1764 | https://pubmed.ncbi.nlm.nih.gov/25423445/ | The simplified equations: chronological age plus height for girls, chronological age plus either sitting height or height for boys. Standard error 0.542 years, slightly better than S11 while needing fewer measurements | Secondary summary |
| S13 | B | Malina RM, Rogol AD, Cumming SP, Coelho e Silva MJ, Figueiredo AJ. "Biological maturation of youth athletes: assessment and implications." Br J Sports Med 2015;49:852-859 | https://pubmed.ncbi.nlm.nih.gov/26084525/ | Non-invasive maturity estimation methods require further validation, especially across ethnicities. Both S11 and S12 predict *later* than observed for early maturers and *earlier* than observed for late maturers, which is a systematic bias toward the mean and is worst exactly for the children who differ most from it | Cited by S1 as references 145 and 156; bias direction confirmed by the S11/S12 validation literature retrieved this session |
| S14 | B | Van der Sluis A, Elferink-Gemser MT, Coelho-e-Silva MJ, Nijboer JA, Brink MS, Visscher C. "Sport injuries aligned to peak height velocity in talented pubertal soccer players." Int J Sports Med 2014;35(4):351-355 | https://pubmed.ncbi.nlm.nih.gov/24022568/ | 26 talented soccer players, mean age 11.9 (SD 0.84), followed 3 years around PHV. Traumatic injuries: 1.41 per player in the PHV year versus 0.81 in the year before. Days missed: 15.69 per player in the PHV year versus 7.27 before, effect size 0.55. After PHV the pattern shifts toward overuse injuries. **This is the single most programme-relevant number in the youth literature: the risk window is a growth event, not an age** | Abstract level, numbers verbatim from abstract |
| S15 | B | Jayanthi NA, LaBella CR, Fischer D, Pasulka J, Dugas LR. "Sports-specialized intensive training and the risk of injury in young athletes: a clinical case-control study." Am J Sports Med 2015;43(4):794-801 | https://pubmed.ncbi.nlm.nih.gov/25646361/ | 1,190 individuals. After adjusting for age and hours of sport, sports-specialized training was an independent risk factor for acute and for serious overuse injury. Heightened injury risk when weekly organized-sport hours exceed the athlete's age in years, or when organized sport to free play exceeds 2:1 | Numbers quoted verbatim from S1's summary of this paper |
| S16 | B | Hall R, Barber Foss K, Hewett TE, Myer GD. "Sport specialization's association with an increased risk of developing anterior knee pain in adolescent female athletes." J Sport Rehabil 2015;24:31-35 | https://pubmed.ncbi.nlm.nih.gov/24622013/ | Female youth athletes who specialized earlier had 1.5-fold greater risk of knee-related injury. Patellar tendinopathy and Osgood-Schlatter disease showed a 4-fold increased relative risk in single-sport specialized versus multi-sport athletes | Numbers quoted verbatim from S1's summary |
| S17 | B | Myer GD, Quatman CE, Khoury J, Wall EJ, Hewett TE. "Youth versus adult 'weightlifting' injuries presenting to United States emergency rooms: accidental versus nonaccidental injury mechanisms." J Strength Cond Res 2009;23(7):2054-2060 | https://pubmed.ncbi.nlm.nih.gov/19855330/ | **Children have a LOWER risk of resistance-training-related joint sprains and muscle strains than adults.** The youth injury profile is weighted toward accidental mechanisms and fractures (dropped equipment, unsupervised access), the adult profile toward sprains and strains. The corollary is the whole safety argument: the danger to a 14 year old is the unsupervised environment, not the barbell | Abstract level |
| S18 | B | Kerr ZY, Collins CL, Comstock RD. "Epidemiology of weight training-related injuries presenting to United States emergency departments, 1990 to 2007." Am J Sports Med 2010;38(4):765-771 | https://pubmed.ncbi.nlm.nih.gov/20139328/ | 25,335 sampled weight-training injuries, an estimated 970,801 nationwide over 18 years. Mean patient age 27.6 years, range 6 to 100. 82.3 percent male. Used here for the denominator: weight-training emergency presentations are dominated by adults, not children | Abstract level |
| S19 | B | Faigenbaum AD, Milliken LA, Westcott WL. "Maximal strength testing in healthy children." J Strength Cond Res 2003;17(1):162-166 | https://pubmed.ncbi.nlm.nih.gov/12580672/ | 96 children aged 6.2 to 12.3 years (mean 9.3, SD 1.6) performed 1RM tests on one upper and one lower body exercise on child-sized equipment. No injuries. **Under close supervision by qualified professionals.** The qualifier is the finding, not a footnote to it: this is evidence that supervised 1RM testing is safe, and it is not evidence that an app may prescribe a 1RM test | Abstract level |
| S20 | B | Behringer M, vom Heede A, Yue Z, Mester J. "Effects of resistance training in children and adolescents: a meta-analysis." Pediatrics 2010;126:e1199-e1210 | https://pubmed.ncbi.nlm.nih.gov/21041288/ | Resistance training produces significant strength gains in children and adolescents. Cited by S1 as reference 16 for the trainability of muscle strength and power across the developmental period | Citation level via S1 reference list |
| S21 | B | Behringer M, vom Heede A, Matthews M, Mester J. "Effects of strength training on motor performance skills in children and adolescents: a meta-analysis." Pediatr Exerc Sci 2011;23:186-206 | https://pubmed.ncbi.nlm.nih.gov/21633132/ | 34 training studies. Pre- and early-pubertal youth achieved resistance-training-induced gains in motor skills approximately **50 percent greater** than adolescents. This is the strongest single argument for a technique-first, skill-first product for the youngest band | Number quoted verbatim from S1's text, S1 reference 15 |
| S22 | B | Lesinski M, Prieske O, Granacher U. "Effects and dose-response relationships of resistance training on physical performance in youth athletes: a systematic review and meta-analysis." Br J Sports Med 2016;50(13):781-795 | https://pubmed.ncbi.nlm.nih.gov/26851290/ | Moderate effects on muscle strength and vertical jump (SMD 0.8 to 1.09), small effects on sprint, agility and sport-specific performance (SMD 0.58 to 0.75). Dose-response for strength: training period longer than 23 weeks, 5 sets per exercise, 6 to 8 reps per set, 80 to 89 percent 1RM, 3 to 4 minutes rest between sets (SMD 2.09 to 3.40). **DISAGREEMENT with S2**, preserved and consequential: the position stand says 1 to 3 sets of 6 to 15 reps with light starting loads, the meta-analysis says 5 sets at 80 to 89 percent 1RM is what maximises strength. They are answering different questions (safe general prescription for all youth versus performance optimum for supervised youth athletes) and BodyT must follow S2, because BodyT is not a supervising coach | Abstract level, numbers verbatim |
| S23 | B | Falk B, Dotan R. "Child-adult differences in the recovery from high-intensity exercise." Exerc Sport Sci Rev 2006;34(3):107-112 | https://pubmed.ncbi.nlm.nih.gov/16829737/ | Children recover faster than adults from high-intensity exercise. Lower reliance on glycolysis, less acidosis, faster metabolite clearance, faster phosphocreatine resynthesis, faster heart-rate recovery. **Direction of the correction is opposite to the adult intuition: a child needs LESS rest between efforts, not more** | Abstract and secondary level |

### 2.2 Older adults, masters and menopause

| ID | Tier | Source | URL | What was taken | Access |
|----|------|--------|-----|----------------|--------|
| S24 | A | Fragala MS, Cadore EL, Dorgo S, Izquierdo M, Kraemer WJ, Peterson MD, Ryan ED. "Resistance Training for Older Adults: Position Statement From the National Strength and Conditioning Association." J Strength Cond Res 2019;33(8):2019-2052 | https://www.nsca.com/contentassets/2a4112fb355a4a48853bbafbe070fb8e/resistance_training_for_older_adults__position.1.pdf | Table 1 program variables: 1 to 3 sets, 8 to 12 or 10 to 15 reps, 70 to 85 percent 1RM, 2 to 3 days per week, 8 to 10 exercises. One set for beginners and for older adults with frailty, progressing to 2 to 3. Lighter loads for beginners, frailty, cardiovascular disease and osteoporosis. Power work at 40 to 60 percent 1RM with high concentric velocity. Contraindications for high-speed work: poor form and execution, severe osteoarthritis. Avoid going to failure to reduce joint stress. Frailty on-ramp: 3 times per week, 3 sets of 8 to 12, starting at 20 to 30 percent 1RM progressing to 80 percent | Captured in R7 as NSCA-OA, re-used rather than re-fetched |
| S25 | A | World Health Organization. "WHO Guidelines on Physical Activity and Sedentary Behaviour" (2020) | https://www.ncbi.nlm.nih.gov/books/NBK566048/ | Children and adolescents 5 to 17: at least 60 minutes per day of moderate-to-vigorous, mostly aerobic, activity averaged across the week, plus vigorous aerobic and muscle-and-bone-strengthening activity at least 3 days per week. Older adults 65+: the adult 150 to 300 minutes, PLUS "varied multicomponent physical activity that emphasizes functional balance and strength training at moderate or greater intensity, on 3 or more days a week, to enhance functional capacity and to prevent falls" (Strong recommendation, moderate certainty) | Captured in R7 as WHO-2020, re-used rather than re-fetched |
| S26 | A | Cruz-Jentoft AJ, Bahat G, Bauer J, Boirie Y, Bruyere O, Cederholm T, et al. "Sarcopenia: revised European consensus on definition and diagnosis (EWGSOP2)." Age Ageing 2019;48(1):16-31 | https://www.esceo.org/sites/esceo/files/pdf/2019%20Age%20Ageing%20EWGSOP2.pdf | The 2019 revision makes **strength, not lean mass**, the primary component. Probable sarcopenia is low strength alone; confirmed sarcopenia adds low muscle quantity or quality; severe sarcopenia adds low physical performance. Used here for one thing only: the primary marker of the condition BodyT's older-adult programming is aimed at is a *strength* measure, which is a thing the app can observe from its own log, and not a body-composition measure, which is a thing it cannot | Consensus-level via publisher PDF and secondary summaries |
| S27 | A | Bauer J, Biolo G, Cederholm T, Cesari M, Cruz-Jentoft AJ, Morley JE, et al. "Evidence-based recommendations for optimal dietary protein intake in older people: a position paper from the PROT-AGE Study Group." J Am Med Dir Assoc 2013;14(8):542-559 | https://pubmed.ncbi.nlm.nih.gov/23867520/ | At least 1.0 to 1.2 g protein per kg body mass per day for people over 65 to maintain and regain lean mass and function. 1.2 to 1.5 g/kg/day for those exercising or with acute or chronic illness. Distribution matters: 25 to 30 g of high-quality protein per meal, with leucine at or above roughly 3 g per meal, to overcome anabolic resistance and higher splanchnic extraction | Position-paper level via publisher and secondary summaries |
| S28 | A | Deutz NEP, Bauer JM, Barazzoni R, Biolo G, Boirie Y, Bosy-Westphal A, et al. "Protein intake and exercise for optimal muscle function with aging: recommendations from the ESPEN Expert Group." Clin Nutr 2014;33(6):929-936 | https://www.espen.org/files/PIIS0261561414001113.pdf | The European clinical-nutrition endorsement of roughly 1.0 to 1.5 g/kg/day for people over 65, with the higher end for those exercising. Used here as the second independent Tier A body agreeing with S27, which matters because the recommendation is *higher* than the adult RDA and BodyT's protein engine is bodyweight-indexed with no age term | Expert-group level via publisher PDF |
| S29 | B | Morton RW, Murphy KT, McKellar SR, Schoenfeld BJ, Henselmans M, Helms E, Aragon AA, Devries MC, Banfield L, Krieger JW, Phillips SM. "A systematic review, meta-analysis and meta-regression of the effect of protein supplementation on resistance training-induced gains in muscle mass and strength in healthy adults." Br J Sports Med 2018;52(6):376-384 | https://pubmed.ncbi.nlm.nih.gov/28698222/ | 49 studies, 1,863 participants, resistance training 6 weeks or longer. Protein supplementation significantly augmented gains in strength and fat-free mass. The dose-response plateaus near **1.62 g/kg/day**; intakes above that produced no further gains in the pooled data. In the meta-regression, baseline protein intake, protein dose, age and training status together explained none of the variance in 1RM or fat-free-mass change. **DISAGREEMENT with S27 and S28**, preserved: the geriatric position papers say older adults need more protein than younger adults, and this meta-regression finds age does not moderate the training response to supplementation. The two are reconcilable (the position papers are about maintaining mass and function at habitual intakes, the meta-analysis is about augmenting a training response) and this pack does not average them | Abstract level, numbers verbatim |
| S30 | B | Borde R, Hortobagyi T, Granacher U. "Dose-Response Relationships of Resistance Training in Healthy Old Adults: A Systematic Review and Meta-Analysis." Sports Med 2015;45(12):1693-1720 | https://pmc.ncbi.nlm.nih.gov/articles/PMC4656698/ | For **muscle strength** in healthy old adults the largest effects came from: training period 50 to 53 weeks (SMD 2.34), **2 sessions per week** (SMD 2.13), **70 to 79 percent 1RM** (SMD 1.89), **2 to 3 sets** (SMD 2.99), **7 to 9 reps** (SMD 1.98), time under tension 6.0 s per rep (SMD 3.61), 60 s rest between sets (SMD 4.68, limited data). For **muscle morphology**: 3 sessions per week (SMD 0.38), 51 to 69 percent 1RM (SMD 0.43), 2 to 3 sets (SMD 0.78), 7 to 9 reps (SMD 0.49), 120 s rest (SMD 0.30). **Two frequencies for two goals is the finding BodyT's fixed weekly template has nowhere to put** | FULL via PMC, numbers verbatim |
| S31 | B | Peterson MD, Rhea MR, Sen A, Gordon PM. "Resistance exercise for muscular strength in older adults: a meta-analysis." Ageing Res Rev 2010;9(3):226-237 | https://pubmed.ncbi.nlm.nih.gov/20385254/ | Adults 50 and over gain meaningful strength from progressive resistance exercise, with larger effects from higher-volume programmes. Used for direction only; effect sizes not quoted | Citation and abstract level |
| S32 | B | Sherrington C, Fairhall NJ, Wallbank GK, Tiedemann A, Michaleff ZA, Howard K, Clemson L, Hopewell S, Lamb SE. "Exercise for preventing falls in older people living in the community." Cochrane Database Syst Rev 2019;1:CD012424 | https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD012424.pub2/full | 108 RCTs, 23,407 participants, 25 countries, mean age 76, 77 percent women. Exercise overall reduces the **rate** of falls, rate ratio 0.77 (95% CI 0.71 to 0.83), high certainty. **Balance and functional exercise: RaR 0.76, high certainty. Multiple exercise types: RaR 0.66, moderate certainty. Tai Chi: RaR 0.81, low certainty. Programmes that are primarily resistance training: uncertain.** Number of fallers RR 0.85. Adverse events predominantly non-serious musculoskeletal. **The line that should change BodyT's older-adult plan: resistance training alone is the one category the review cannot show works for falls** | FULL via Cochrane plain-language and abstract, numbers verbatim |
| S33 | B | Watson SL, Weeks BK, Weis LJ, Harding AT, Horan SA, Beck BR. "High-Intensity Resistance and Impact Training Improves Bone Mineral Density and Physical Function in Postmenopausal Women With Osteopenia and Osteoporosis: The LIFTMOR Randomized Controlled Trial." J Bone Miner Res 2018;33(2):211-220 | https://pubmed.ncbi.nlm.nih.gov/28975661/ | Postmenopausal women with T-score below -1.0. 8 months, twice weekly, 30-minute **supervised** sessions of 5 sets of 5 reps above 85 percent 1RM plus impact loading, versus home-based low-intensity control. Significantly greater gains in lumbar spine and femoral neck BMD and in functional measures. No adverse events **under highly supervised conditions**. The supervision qualifier is load-bearing and is stated by the authors | Abstract level, protocol numbers verbatim |
| S34 | A | Royal Osteoporosis Society (formerly National Osteoporosis Society). "Strong, Steady and Straight: An Expert Consensus Statement on Physical Activity and Exercise for Osteoporosis" (Dec 2018) | https://www.bgs.org.uk/sites/default/files/content/attachment/2019-02-20/FINAL%20Consensus%20Statement_Strong%20Steady%20and%20Straight_DEC18.pdf | Weight-bearing-with-impact plus muscle strengthening; progressive resistance training up to moderate or high intensity; moderate impact for those without vertebral fracture and lower impact for those with vertebral or multiple low-trauma fractures; sustained, repeated or end-range spinal flexion should be amended or avoided unless the person is already practised with very good muscle tone | Captured in R7 as ROS-SSS and available locally at `scratchpad/ros.txt`; re-used, not re-fetched |
| S35 | B | Wittstein J, Schwartzman JD, Itinoche R, Wright V. "The musculoskeletal syndrome of menopause." Climacteric 2024;27(5):466-472 | https://pubmed.ncbi.nlm.nih.gov/39077777/ | Proposes a single name for the cluster of musculoskeletal effects of oestrogen loss: arthralgia, inflammation, sarcopenia, loss of bone density, cartilage change, adhesive capsulitis. Reports that more than 70 percent of women experience musculoskeletal symptoms across the perimenopause to postmenopause transition and about 25 percent are disabled by them. **Tier B and new: this is a naming and narrative-review paper, not a guideline, and BodyT must not treat it as one.** Used here for one product conclusion only: joint pain arriving in a woman's 40s or 50s is common enough that the app's pain-flag copy must not imply the athlete did something wrong | Abstract and secondary level. The 70 percent and 25 percent figures are from the paper's own framing and are not independently verified |
| S36 | C | Skelton DA, Greig CA, Davies JM, Young A. "Strength, power and related functional ability of healthy people aged 65-89 years." Age Ageing 1994;23(5):371-377 | https://pubmed.ncbi.nlm.nih.gov/7825481/ | Muscle **power** declines with age faster than muscle strength, at roughly 3.5 percent per year in the cited cohorts, driven by selective loss and atrophy of type II fibres. Power is lost at roughly twice the rate of strength. Used for the shape of the masters curve, not for a prescription | Secondary summary; the primary was not retrieved and the exact per-year figure is reported as it appears in secondary sources |
| S37 | B | "Effectiveness of power training compared to strength training in older adults: a systematic review and meta-analysis." Eur Rev Aging Phys Act 2022;19:18 | https://link.springer.com/article/10.1186/s11556-022-00297-x | Power training offers more potential than traditional strength training for improving muscle power and performance on activity tests in older adults, and requires less total work per session. Companion reviews find high-velocity power training weak-to-moderately favoured on SPPB and Timed Up and Go, with low to very low certainty and high risk of bias. **Both the direction and the uncertainty are taken** | Abstract and secondary level |
| S38 | B | Ganse B, Degens H, et al. "Longitudinal trends in master track and field performance throughout the aging process: 83,209 results from Sweden in 16 athletics disciplines." GeroScience 2020;42:1609-1620; with "Linear Decrease in Athletic Performance During the Human Life Span." Front Physiol 2018;9:1100 | https://link.springer.com/article/10.1007/s11357-020-00275-0 and https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6110907/ | Masters performance declines roughly linearly from the early 30s through middle age: about 0.55 percent per year for men's 100 m up to about 1.04 percent per year for women's long jump across ages 35 to 60. After age 70 the decline is on average 1.7 times as steep in men and 1.4 times as steep in women as it was between 35 and 69. **This is the honest shape of the masters progression curve and it is not the shape BodyT's projection model assumes** | Abstract and secondary level, numbers as reported |
| S39 | C | Fell J, Williams AD. "The effect of aging on skeletal-muscle recovery from exercise: possible implications for aging athletes." J Aging Phys Act 2008;16(1):97-115 | https://pubmed.ncbi.nlm.nih.gov/18268815/ | Older muscle is plausibly more susceptible to exercise-induced damage with a slower repair and adaptation response, **but** the review's own conclusion is that most studies confound age with declining physical activity level and use damage protocols unrepresentative of real training. Recorded here as the honest state of the evidence: the belief that masters athletes need longer between hard sessions is widely held, physiologically plausible, and not cleanly demonstrated | Abstract level. **Any recovery-interval number for masters athletes in this pack is HOUSE RULE, not SOURCED** |

### 2.3 Cross-cutting, regulatory and repo-internal

| ID | Tier | Source | URL | What was taken | Access |
|----|------|--------|-----|----------------|--------|
| S40 | A | US Federal Trade Commission. Children's Online Privacy Protection Rule, 16 CFR Part 312; final amendments published 2025, effective 23 June 2025, full compliance date 22 April 2026; FTC business guidance "When it comes to health data, comply with COPPA, no kidding" (2022) | https://www.ftc.gov/business-guidance/blog/2022/03/when-it-comes-health-data-comply-coppa-no-kidding | Operators of apps directed to children under 13, or with actual knowledge of collecting from a child under 13, must give parental notice and obtain **verifiable parental consent** before collection, use or disclosure. The FTC blog names fitness and weight-tracking apps for children explicitly: weight, food intake and activity tracking plus name, email and birth date is squarely in scope. Consent methods must be reasonably calculated to confirm the person consenting is the parent | Guidance level. **This pack is not legal advice and the owner should take counsel before shipping anything for under-18s** |
| S41 | A | Regulation (EU) 2016/679 (GDPR) Article 8, information society services offered directly to a child | https://gdpr-info.eu/art-8-gdpr/ | Where consent is the lawful basis and the service is offered directly to a child, processing is lawful only where the child is at least 16, or younger with parental authorisation, and member states may lower the floor to no less than 13. **The practical consequence: a single global product cannot pick one age and be done. 13 in the US, 13 to 16 depending on member state in the EU** | Regulation text level |
| S42 | A | American College of Sports Medicine. "Progression Models in Resistance Training for Healthy Adults." Med Sci Sports Exerc 2009;41(3):687-708 | https://journals.lww.com/acsm-msse/Fulltext/2009/03000/Progression_Models_in_Resistance_Training_for.26.aspx (summary text available locally at `scratchpad/acsm.txt`) | Novice loading at 8 to 12 RM; intermediate to advanced across 1 to 12 RM periodised with eventual emphasis on 1 to 6 RM. The **2 to 10 percent** load-increment band that `src/engine/reps.ts:230` already cites by name. Used here to show that the repo's own progression authority is an adults position stand with no age term in it | Summary text local, full text via publisher |
| S43 | A | Chodzko-Zajko WJ, Proctor DN, Fiatarone Singh MA, Minson CT, Nigg CR, Salem GJ, Skinner JS. "American College of Sports Medicine position stand: Exercise and Physical Activity for Older Adults." Med Sci Sports Exerc 2009;41(7):1510-1530 | https://pubmed.ncbi.nlm.nih.gov/19516148/ | The multicomponent framing for adults over 65: endurance, resistance, flexibility and **balance**, with the recommendation that older adults exceeding the minimums gain further benefit. Recorded at citation level; its doses are not quoted here because S24, S25 and S30 are more recent and were retrieved in full | Citation level |
| S44 | B | Cote J, Baker J, Abernethy B, and the sampling literature synthesised in S1 (S1 references 28, 50, 84, 174) | Via S1 | Early sampling does not restrict elite development and is associated with longer careers and sustained participation. Athletes who played 3 or more sports between ages 11 and 15 were more likely to reach national rather than club standard between 16 and 18. For centimetres-grams-seconds sports, **later** specialization and lower early specific volume predict elite adult performance. The "10,000 hour rule" is a misreading of the expertise literature and should not be repeated by the app | Via S1's text and reference list |
| S45 | repo | `research/R6-safety.md`, `research/R7-populations.md`, `research/R12-trainer-authority.md` at the `wt-fix2` tree | local | R6: the red-flag classifier and the referral-not-clearance rule. R7: the function-first model, the eleven operators, the older-adult and osteoporosis packs, and the youth section this pack extends. R12: the five-tier authority ladder and the forbidden-phrase table format reproduced in section 4.4 | FULL |

**45 sources. 21 Tier A, 19 Tier B, 4 Tier C, 1 repo.**

**What no source says.** Nothing in this list gives a number for how much slower an otherwise
healthy 62 year old should progress load than an otherwise identical 32 year old, how often a
masters athlete should deload, or at what age a general-population fitness app should stop
serving users. S39 is explicit that the masters recovery question is confounded and unresolved.
Every number in sections 3 and 6 that is not tagged with a source ID is **HOUSE RULE**, and is
written as an exact figure so a future session can argue with it.

**Blocked or degraded in this environment**, recorded so future sessions do not re-burn usage:
`pubmed.ncbi.nlm.nih.gov` returned a cookie-consent shell to WebFetch (abstracts reachable via
search result summaries and via publisher mirrors), `nice.org.uk`, `bjsm.bmj.com` and
`journals.lww.com` were already recorded as 403 by R6 and R7 and were not retried.

---

## 3. THE AGE-BAND TABLE

**How to read this section.** The bands are a **prior**, applied only when the app has a
band at all, and outranked by every function screen in R7 3.1 and every red flag in R6.
The default when the band is unknown is not "adult". It is a separate state, `unknown`,
whose behaviour is defined in 3.7 and which is deliberately more conservative than the adult
band on exactly two axes and identical on all the others.

Bands are named, not numbered, so that a future session cannot silently renumber them.
Ages are inclusive.

| Band | Ages | One-line identity |
|---|---|---|
| `child` | under 12 | Pre-spurt for most. Motor skill is the trainable quality with the largest edge |
| `adolescent` | 12 to 15 | The growth spurt window. The highest-injury-risk band in the whole table |
| `teen` | 16 to 17 | Adult physiology, minor status |
| `adult` | 18 to 39 | The band every constant in the tree is currently calibrated for |
| `masters1` | 40 to 54 | Measurable decline begins, nothing else changes much |
| `masters2` | 55 to 69 | Frequency, intensity and progression-rate optima all move. Balance becomes a pillar |
| `masters3` | 70 and over | The decline curve steepens. Function screens dominate |
| `unknown` | not asked or declined | The honest default, and it is not `adult` |

### 3.1 Loading, intensity ceilings and exercise selection

| Band | Working rep range | Intensity ceiling | Sets per exercise | Failure | Exercise selection changes | Cite |
|---|---|---|---|---|---|---|
| `child` | 6 to 15 for strength, 3 to 6 for power | No percentage-of-1RM prescription at all. No 1RM test. Effort ceiling: stop the set with at least 3 reps in reserve | 1 to 3 | Never | Bodyweight, medicine ball, band, and child-sized implements. No barbell back squat, no deadlift from the floor, no overhead barbell press, no plyometric depth drops. Skill items are first-class content, not warmups | [S2] doses; [S19] the 1RM caveat; [S21] the skill priority |
| `adolescent` | 6 to 15 strength, 3 to 6 power | Same. No 1RM, no percentage prescription | 1 to 3 | Never | As `child`, plus barbell patterns are permitted **only** with a declared supervising adult (section 4). Impact and change-of-direction volume is capped during a declared growth spurt (3.6) | [S2]; [S14] the spurt window |
| `teen` | 6 to 15 strength, 3 to 6 power | Same as `adolescent`. The physiology has caught up; the supervision requirement has not | 1 to 3 | Never | Full adult catalogue minus depth jumps and minus any maximal-effort single | [S2] applies through age 17 by its own scope |
| `adult` | Whatever the plan prescribes today. No change | No change | No change | Current app behaviour | No change | [S42] is the standing authority the tree already cites |
| `masters1` | No change from `adult` | No change | No change | Current behaviour | Add one bone-loading item per week if no vertebral-fracture flag: weight-bearing with impact plus progressive resistance | [S34]; [S38] for why nothing else moves yet |
| `masters2` | 7 to 9 for the main strength lift, 10 to 15 for accessories | 70 to 79 percent 1RM equivalent, expressed to the athlete as "2 to 3 reps left in the tank on every working set" | 2 to 3 | Never. Explicitly avoid, to reduce joint stress | Add a **power** item at high concentric velocity and low load, and a **balance** progression. Machine and band variants become first-class rather than fallbacks. Gate the power item on technique quality and on absence of severe joint pain | [S30] the 70 to 79 percent and 7 to 9 rep optima; [S24] power at 40 to 60 percent 1RM, avoid failure, high-speed contraindications; [S25] balance as a third pillar |
| `masters3` | 10 to 15 | Same effort ceiling. Never a maximal single | 1 to 3, starting at 1 for a beginner | Never | Balance is mandatory content, not optional. Seated and supported variants are first-class. Every standing balance item has a chair or counter named in the instruction | [S24] one set at entry; [S25]; [S32] balance and functional exercise is the category with the evidence |
| `unknown` | Current behaviour | Current behaviour | Current behaviour | Current behaviour | **Two changes only**: no depth jumps or maximal singles are auto-selected, and any body-composition or calorie-deficit content requires the athlete to have stated an adult band. See 3.7 | HOUSE RULE. The failure lands harmless |

**Note on the intensity ceiling for youth.** [S22] found that 5 sets at 80 to 89 percent 1RM
maximised strength gain in youth athletes, which is a bigger dose than [S2] prescribes. Both
are preserved. BodyT follows [S2] because [S22]'s population is supervised youth athletes in
controlled trials and BodyT is an unsupervised app. This is the clearest case in the pack of a
Tier B meta-analysis being correctly overruled by a Tier A position statement on population
grounds, which is v12's stated authority order.

### 3.2 Session density and weekly structure

| Band | Sessions per week | Rest between sets | Weekly volume ceiling | Cite |
|---|---|---|---|---|
| `child` | 2 to 3, on nonconsecutive days | 60 s where the adult plan says 120 s. Children clear metabolites and resynthesise phosphocreatine faster than adults | Total organised activity hours per week must not exceed the athlete's age in years. Organised sport to free play must not exceed 2:1. Not more than 8 months per year in a single sport | [S2] frequency; [S23] rest; [S15] and [S1] the volume thresholds |
| `adolescent` | 2 to 3, nonconsecutive | 60 to 90 s | Same three thresholds. Additionally 16 hours per week of total sport is the line above which injury risk rises | [S2]; [S1] the 16-hour threshold; [S15] |
| `teen` | 2 to 4 | Adult rest | Same 16-hour threshold applies through 17 | [S1] |
| `adult` | No change (plan supports 3 to 6, `generator.ts:36`) | No change | No change | Current behaviour |
| `masters1` | No change | No change | No change | [S38] |
| `masters2` | **2 for a strength goal, 3 for a size goal.** These are different optima and the difference is not noise: 2 per week had SMD 2.13 for strength, 3 per week had SMD 0.38 for morphology | 60 s when the goal is strength, 120 s when the goal is size | Same | [S30], both figures verbatim |
| `masters3` | 3 short sessions beat 2 long ones. Balance work on at least 3 days, which may ride along with the strength days | 90 to 120 s | Same | [S25] the 3-or-more-days balance recommendation; session-splitting direction from R7 3.1 |
| `unknown` | Current behaviour | Current behaviour | Current behaviour | HOUSE RULE |

**The dose that actually prevents falls.** [S32] is the largest and highest-certainty source
in this pack and its result is inconvenient for a lifting app: balance and functional exercise
reduced the rate of falls with a rate ratio of 0.76 at **high** certainty, multiple exercise
types 0.66 at moderate certainty, Tai Chi 0.81 at low certainty, and programmes that were
**primarily resistance training** produced an effect the review was "uncertain" about. BodyT
ships a resistance-training programme. For `masters2` and `masters3` that is the category with
the weakest falls evidence, and the honest response is to add the balance pillar rather than to
claim the lifting covers it.

### 3.3 Progression rate and deload frequency

The repo's progression model is double progression with a fixed load step and a fixed one-week-
in-four deload (`src/engine/transforms.ts:165-178`, `src/plan/milestones.ts:95`). These are the
numbers that change, and they are the ones with the least direct evidence, so they are marked.

| Band | Load step | Rate multiplier on `LB_PER_WEEK_CEILING` | Deload cadence | Layoff giveback | Cite |
|---|---|---|---|---|---|
| `child` | **No load progression by the app.** Progression is reps within the range, then a harder variation. Where an adult would earn a load step the child earns a movement step | n/a, no strength projection is shown | Not calendar-driven. A declared growth spurt triggers a hold (3.6) | n/a | [S2] permits 5 to 10 percent increments under supervision; the app is not supervision, so it declines the lever entirely. HOUSE RULE on the refusal |
| `adolescent` | Same refusal without a declared supervising adult. With one: 5 to 10 percent of the working load, which for a 40 lb load is 2 to 4 lb and is smaller than the app's smallest step | n/a | Hold during a declared spurt | n/a | [S2] the 5 to 10 percent band |
| `teen` | 5 to 10 percent, same as `adolescent` | 1.0 | Current 1 in 4 | Current | [S2] |
| `adult` | 5 lb upper, 10 lb lower (`reps.ts:299-302`) | 1.0 | 1 in 4 | Up to 3 steps (`reps.ts:141`) | Current behaviour, [S42] |
| `masters1` | Unchanged | **0.85** | 1 in 4 | Up to 3 steps | HOUSE RULE, anchored on [S38]: 0.55 to 1.04 percent per year of measured decline from the mid 30s means the adult ceiling is optimistic by roughly this much across the band |
| `masters2` | **2.5 lb upper, 5 lb lower.** The adult step is 10 to 20 percent of a modest working load, well outside [S42]'s 2 to 10 percent band, and the athlete who cannot make it stalls | **0.6** | **1 in 3** | Up to **4** steps | HOUSE RULE on all four, anchored on [S42]'s increment band, [S30]'s frequency optimum and [S39]'s honest uncertainty about masters recovery |
| `masters3` | 2.5 lb upper, 5 lb lower | **0.4** | **1 in 3** | Up to 4 steps | HOUSE RULE, anchored on [S38]: post-70 decline is 1.4 to 1.7 times as steep as the 35 to 69 slope |
| `unknown` | Current | 1.0 | 1 in 4 | Current | Current behaviour |

**Why the deload cadence moves and the source that does not exist.** No source in section 2
states a deload frequency for masters athletes. [S39] is explicit that the belief older
athletes need longer to recover is plausible, widely held, and confounded with declining
activity level in nearly every study that tested it. So 1 in 3 is HOUSE RULE. It is defensible
on a different ground than recovery physiology: [S30] found the strength optimum at **2**
sessions per week rather than 3, which is the same claim about weekly stress arriving through
a cleaner door, and a deload every third week is roughly the same annual reduction in hard
weeks as dropping from 3 sessions to 2. If a future session finds real evidence, this number
is the first thing to change and it is deliberately isolated in one constant.

### 3.4 What changes in the copy

| Band | Must not appear | Must appear | Voice |
|---|---|---|---|
| `child`, `adolescent`, `teen` | Any body-composition target. Any calorie deficit. Any goal weight. Any body-fat percentage. Any progress photo prompt. Any scale-weight trend. The words cut, shred, lean out, bulk, deficit, surplus. Any supplement content. Any streak-shaming or excuse-ledger content | A named supervising adult on every screen that prescribes load. "Stop the set when the reps stop looking the same" in place of any effort scale. Warm-up and cool-down as prescribed content, not optional | Sergeant voice **off**. R12's escalation ladder, photo-proof demand and excuse ledger are all disabled for minors. [S1] pillar 5 puts health and wellbeing at the centre; a drill sergeant aimed at a 14 year old is not that |
| `adult` | No change | No change | No change |
| `masters1` | Any sentence that attributes a slower session to age. Any "for your age" comparison | Nothing new | No change |
| `masters2`, `masters3` | Any sentence naming a condition (osteoporosis, arthritis, sarcopenia). Any claim that the plan prevents falls, prevents fractures, or treats bone loss. Any "for someone your age" framing, in praise or in criticism. Any prescription phrased as a limit the athlete has to accept | The reason for the balance work, stated as a training reason: "Standing on one leg is a skill and it gets rusty. Two minutes a session keeps it". The reason for the power item: "Fast is a separate quality from strong, and it is the one that fades first if nobody trains it" | Sergeant voice permitted but the escalation ladder is capped. HOUSE RULE |
| `unknown` | Body-composition targets and calorie-deficit content, until an adult band is stated | Nothing | No change |

**Forbidden phrases specific to this pack**, in the format of `research/R12-trainer-authority.md`
section 6.2. Each row is a pattern for a copy test, not a single string.

| # | Forbidden pattern | Why | Safe alternative | Found at |
|---|---|---|---|---|
| L1 | Any body-composition target, goal weight, body-fat number or calorie deficit rendered when the band is `child`, `adolescent` or `teen` | Prescribing weight loss to a minor is outside any trainer scope and is the single highest-harm output this app can produce | Render nothing. The nutrition tab shows protein and meal structure only | Whole nutrition surface: `plan/generator.ts:482-517`, `plan/kcalFloor.ts:56-75` |
| L2 | "Lifting stunts your growth" and every rebuttal that repeats the claim in order to deny it | [S1] states the evidence directly: supervised training does not impair secondary sex characteristics, does not delay menarche, does not restrict eventual height. Repeating a myth to deny it is how it spreads | Say the positive form once: "Loading during the growing years is how bone gets denser" | prospective |
| L3 | "Prevents falls" / "fall-proof" / "protects against fractures" | Prevention claim about a specific outcome, which is the wording that leaves the general-wellness policy R12 [S25] describes. [S32] supports a rate ratio, not an individual promise | "Balance is trainable, and this is the training" | prospective |
| L4 | "Sarcopenia" / "osteopenia" / "osteoporosis" / "menopause" used as a description of *this* athlete | Naming a condition is diagnosis, the R12 fence, rows 1 and 22 | "Strength and bone both respond to loading, at every age anyone has measured" | prospective |
| L5 | "Not bad for {age}" / "at your age" / "most people your age" | Age-referenced praise is still an age-referenced judgement and it invites the athlete to accept a ceiling. [S38] shows the decline is about 0.6 to 1 percent a year, which is far slower than the cultural story | Compare the athlete to their own log, which the app already does everywhere else | prospective |
| L6 | Attributing a missed session, a heavy day or a stall to age | The app cannot know that, and it is the one attribution that cannot be acted on | "That is two heavy grades in a row. The sets are what should give" | prospective |
| L7 | "Growing pains" / "Osgood-Schlatter" / "Sever's" / "growth plate injury" applied to a young athlete's reported pain | Diagnosis, and specifically diagnosis of a child | "Knee pain during a growth spurt is worth a real appointment, not a workaround" | prospective |
| L8 | Any streak, escalation, photo-proof or excuse-ledger copy when the band is a minor band | R12 already establishes these overreach for adults. Aimed at a minor they are worse, and [S1] pillar 5 is the source that says so | Nothing. Disable the surface | `screens/today/SkipFlow.tsx`, `engine/coach.ts:74-77`, `plan/messages.ts` |

### 3.5 Consent and gating by band

| Band | Gate | What is stored | What is disabled |
|---|---|---|---|
| `child` | **Not served.** See section 4 | Nothing | Everything |
| `adolescent` | Not served under the recommendation in section 4. If the owner overrides that: a declared supervising adult, verifiable parental consent [S40], and a data floor of 13 in the US and 16 or the member-state floor in the EU [S41] | Name, sessions, no measurements, no photos | Nutrition targets, body composition, photos, scale weight, Sergeant escalation, supplements |
| `teen` | 16 and 17 are minors everywhere in scope. A declared supervising adult, plus the same data restrictions as `adolescent` | As `adolescent`, plus load logs | As `adolescent` |
| `adult` | None beyond R6's existing screen | Current | None |
| `masters1` | None | Current | None |
| `masters2` | None from age alone. R7 3.1's function screens fire on their answers, not on the band | Current, plus the three answers in section 5.3 | Depth jumps and maximal singles are not auto-selected. High-velocity power work is gated on a technique-quality answer and on absence of a joint-pain flag [S24] |
| `masters3` | None from age alone. R7 3.1's chair-rise and falls screens are offered once | Current, plus section 5.3 | As `masters2`, plus: no unsupported single-leg balance item until a supported progression is passed (R7 3.1 red line), no plan whose only lower-body content requires a floor transfer |
| `unknown` | None | Current | Body-composition and deficit content, and auto-selected depth jumps and maximal singles |

### 3.6 The growth-spurt overlay, which is not an age band

[S14] is the reason this exists. In 26 talented pubertal soccer players followed across their
spurt, traumatic injuries ran at **1.41 per player in the PHV year against 0.81 in the year
before**, and days lost ran **15.69 against 7.27**, effect size 0.55. After the spurt the
profile shifted toward overuse. [S16] adds the specialisation multiplier: a 4-fold relative
risk of patellar tendinopathy and Osgood-Schlatter disease in single-sport specialists.

This is a window, roughly 6 to 12 months long, and it does not align with a birthday. Mean age
at PHV is about 13.5 years in boys and 11.5 in girls, and the spread around those means is the
entire problem (section 5).

**What the overlay does when active.** All HOUSE RULE, anchored on the direction in [S14].

- Load is **held**, not progressed. The rep target still moves inside the range.
- Impact and change-of-direction volume is cut by one third, using the existing
  `scaleExplosive` transform at `src/engine/transforms.ts:181-188` with a factor of 2/3.
- The plan adds nothing new. A growth spurt is not the time to introduce a movement.
- The copy says why, once, without naming anything: "You have grown a lot in a short time.
  Bones get longer before the muscles that run along them catch up, so the weights hold where
  they are for a few weeks while the reps keep moving."
- The overlay expires after 16 weeks and is re-offered rather than re-asserted, per R12's
  re-ask budget.

### 3.7 The `unknown` band, stated precisely

The app will not have an age for most users, because section 5 recommends not asking for one
directly. `unknown` is therefore the **common** case, not the edge case, and it must be a
good default rather than a placeholder.

`unknown` behaves exactly as `adult` except:

1. No body-composition target, goal weight, body-fat estimate or calorie deficit is rendered
   until the athlete has affirmatively indicated an adult band. This is the harmless direction:
   an adult who declines to answer sees a protein target and a meal structure and can turn the
   rest on in one tap. A 15 year old who lied about nothing at all never sees a deficit.
2. No depth jump, drop jump or maximal single is auto-selected into a plan. They remain
   available if the athlete adds them.

Everything else, including the current progression rate, deload cadence and load steps, is
unchanged. This matters: `unknown` must not be a punitive state, or every athlete who skips
the question gets a worse product and the app has taught them that answering is the price of
the real thing.

---

## 4. THE MINOR PROBLEM

R7 3.10 stated the three honest options and declined to pick. This section picks, and shows
its working. **This is not legal advice and the owner should take counsel before shipping
anything aimed at under-18s.**

### 4.1 What the app currently does about age

Nothing. There is no age question, no date of birth, no age gate, no minimum-age statement,
no terms of service screen and no disclaimer anywhere in the tree. The onboarding wizard
(`src/screens/onboarding/Onboarding.tsx:327-540`) runs welcome, name and body numbers, goal,
follow-ups, days per week, gear, experience, food, permissions, preview. The final screen is
`PermissionsStep` (`src/screens/onboarding/PermissionsStep.tsx:36-105`), which asks for
notifications, motion and location and offers a real skip.

So today a 13 year old can install BodyT, type a name, tap "female", enter a height and a
weight, choose "Lose weight", and receive a calorie target, a protein target, a meal plan, a
progress-photo prompt and a drill sergeant. Every one of those is generated by code that has
never been told who it is talking to.

### 4.2 The data inventory, which is what makes this a legal question and not only a coaching one

| What | Where | Sensitivity |
|---|---|---|
| Display name, username | `src/store/schema.ts:225-226` | Identifier |
| Sex, height, weight | `schema.ts:227-228`, `MeStep.tsx:29-47` | Health data |
| Body fat percent, neck, hip, waist, chest, arm, thigh, vertical | `schema.ts:171-181` | Health data, and body-composition data specifically |
| Progress photos, front, side and back, plus "proof" photos | `schema.ts:182-186`, `schema.ts:188-196` | Images of a minor's body |
| Every logged session, load, rep and effort grade | `schema.ts:234` | Health data |
| Every meal, calorie and supplement toggle | `schema.ts:151-169` | Health data |
| Phone number, as the account identifier | `src/cloud/logic.ts:21-24`, `src/cloud/sync.ts:224-237` | Identifier, and a contact route |
| Location fixes, when granted | `PermissionsStep.tsx:23`, `src/engine/places.ts` | Location of a minor |
| The whole envelope including base64 photo blobs, synced to Supabase | `src/store/backup.ts:47-52`, `src/store/schema.ts:261`, `src/cloud/sync.ts` | All of the above, off device |

This is not a local-only notes app. It is a health record with photographs and a phone number
that leaves the device. Under [S40] that is squarely inside COPPA's scope for under-13s, and
the FTC has published guidance naming child fitness and weight-tracking apps specifically.
Under [S41] the EU floor for consent-based processing of a service offered directly to a child
is 16, lowerable by member state to no less than 13, which means a single global number does
not exist.

### 4.3 What "supporting minors properly" would actually cost

Not a flag. A second product. Concretely:

1. **A verifiable parental consent flow** that meets [S40]'s "reasonably calculated" standard,
   plus a parent-facing account, plus deletion on parental request. This is infrastructure the
   repo has none of.
2. **A jurisdiction table**, because [S41] means the floor is 13 in the US and 13 to 16
   depending on member state in the EU. Every branch of that table is a compliance surface.
3. **A whole nutrition mode with the deficit removed.** `plan/generator.ts:482-517` computes
   a calorie target from bodyweight and goal, and `plan/kcalFloor.ts:34-44` floors it at 1,500
   training-day kcal with a maximum deficit of 25 percent of maintenance. That floor is
   written for adults by its own comment (`kcalFloor.ts:20`, "below which no adult should be
   eating daily without supervision"), and there is no youth equivalent because there should
   not be one: an app must not put a growing 14 year old in a deficit at all.
4. **The accountability layer disabled.** R12 established that the photo-proof demand
   (`screens/today/SkipFlow.tsx:203-260`), the 30-day escalation ladder (`engine/coach.ts:74-77`)
   and the excuse ledger overreach for **adults**. Aimed at a minor they are indefensible, and
   [S1] pillar 5 is the source: health and wellbeing of the child is the central tenet.
5. **The load lever removed or supervised.** Every position statement in section 2.1 conditions
   its safety finding on "properly designed and supervised" [S2][S3][S4]. [S17] is the reason
   this is not paranoia inverted: children have a *lower* rate of resistance-training sprains
   and strains than adults, and their injuries skew toward accidental mechanisms in
   unsupervised settings. The hazard is the empty garage, not the barbell.
6. **A supervising-adult model** that is more than a checkbox, because a checkbox that says
   "an adult is watching" and is tapped by the 14 year old is worse than nothing: it converts
   an unsupervised product into an unsupervised product with a liability defence.

### 4.4 The recommendation

**Set the minimum age at 18. State it. Gate it. Do not build a youth mode as a configuration
of the adult product.**

Reasoning, in order of weight:

1. **The failure is asymmetric and it lands on the wrong side.** The worst thing an adult
   fitness app does to an adult is give them a mediocre plan. The worst thing it does to a
   14 year old is put them in a self-directed calorie deficit with a body-fat estimator, a
   progress-photo prompt and a voice that calls skipping cowardice. That is the shape of an
   eating-disorder onramp, and R7's own source list carries the IOC REDs consensus for
   exactly this reason. The repo's standing constraint is that safety failures land on the
   harmless side. An 18 floor is the harmless side.
2. **The evidence does not say youth training is dangerous, it says unsupervised youth
   training is the untested condition.** [S17] and [S18] together say the emergency-department
   picture is dominated by adults, and that youth injuries are accidental rather than
   tissue-failure injuries. [S2] and [S3] say resistance training is safe and beneficial for
   children **when properly designed and supervised**. BodyT is not supervision. It is a
   phone. Serving minors means either claiming a supervision role the app cannot fill, or
   shipping the exact configuration every position stand excludes.
3. **The compliance surface is disproportionate to the market.** Item 4.3 lists six pieces of
   work, two of which (verifiable parental consent, a jurisdiction table) are ongoing legal
   obligations rather than one-time builds, and one of which (photographs of minors, synced
   to a shared Supabase project) is the highest-consequence data class the app touches.
4. **An 18 floor costs almost nothing that the product currently delivers.** BodyT's shipped
   plan vocabulary is barbell strength, sprint and jump work, cardio, meal plans and calorie
   targets. The youth product the literature actually supports is motor-skill breadth, sport
   sampling, technique and light progressive loading under supervision [S1 pillars 3, 4, 7]
   [S21]. Those are different products. Building the second one badly as a filter over the
   first is the failure mode, not the compromise.

**What the gate must be, concretely.** Not a birthdate field, which invites a lie and creates
the exact "actual knowledge" problem [S40] turns on. One screen, before any data is collected:
a statement of the minimum age and a single confirm. Store the confirmation, not a birthday.
Copy in the app's voice:

> **BodyT is built for adults.**
> Everything here assumes a grown body: the loads, the food targets, the way it pushes.
> If you are under 18, this is not the right app yet, and a coach who can watch you lift
> beats anything on a phone.
>
> [ I am 18 or older ]     [ I am not ]

Tapping "I am not" shows one screen, stores nothing, and does not proceed. No dark pattern,
no back button that quietly works anyway.

### 4.5 What would have to be true to serve 16 and 17 year olds later

Recorded so a future session does not treat this as a permanent no. All six must hold, and
they are conditions on the **product**, not on the market:

1. A separate mode, reachable only through a declared supervising adult with a verified
   contact, not a checkbox tapped by the athlete.
2. Nutrition renders protein and meal structure only. No calorie target, no deficit, no goal
   weight, no body-fat estimate, no progress photos. `flooredTargets`
   (`plan/kcalFloor.ts:56-75`) is not called at all in this mode.
3. Load progression limited to [S2]'s 5 to 10 percent band, which the current fixed 5 and
   10 lb steps (`engine/reps.ts:299-302`) violate at any working load under 100 lb.
4. The accountability layer off: no escalation, no photo proof, no excuse ledger, no streak
   shaming.
5. A jurisdiction table for [S41], and a deletion path a parent can use without the athlete's
   cooperation.
6. The growth-spurt overlay (3.6) implemented, because [S14]'s window is the actual risk
   period and a product that serves 16 and 17 year olds will catch late maturers inside it.

Under 16 the recommendation does not change under any of these conditions. [S40]'s verifiable
parental consent regime plus photographs plus a phone-number identifier is a product BodyT
should not build.

### 4.6 The one thing that must ship even at an 18 floor

An age gate does not make minors go away, it makes them lie. So the two `unknown`-band
protections in 3.7 are not redundant with the gate, they are the backstop for it: no
body-composition or deficit content until an adult band is affirmatively stated, and no
auto-selected depth jumps or maximal singles. Those two rules cost an honest adult one tap and
cost a lying 15 year old the two most harmful outputs in the app.

---

## 5. MATURITY, NOT BIRTHDAY

### 5.1 Why chronological age is a weak proxy at the young end

[S1] states it in its first pillar, and it is the sentence the whole youth literature turns on:
variance in physical development "is most notable when comparing a group of children of the
same chronological age, whereby individuals of the same chronological age can differ markedly
with respect to biological maturity". Maturation varies in **extent** (how much changes),
**timing** (when it starts) and **tempo** (how fast it runs), and different body systems
mature at different rates within the same child.

The numbers behind that: mean age at peak height velocity is roughly **13.5 years in boys and
11.5 in girls**, and the spread around those means is wide enough that a single under-14 team
routinely contains children several years apart in biological maturity. [S14] then shows the
consequence: traumatic injuries ran at **1.41 per player in the PHV year against 0.81 the year
before**, and days lost at **15.69 against 7.27**. The risk is attached to the growth event,
not to the birth year, and the two are only loosely coupled.

There is a second, subtler cost. [S1] notes that talent identification "typically favors early
maturing, while excluding later maturing youth". Any system that groups by birthday and then
judges by performance systematically rewards the early maturer and penalises the late one. An
app that scaled a 13 year old's targets off "what 13 year olds do" would reproduce that bias
automatically.

### 5.2 Why the app cannot estimate maturity either

The published maturity-offset equations are real and they are not usable here.

- [S11] Mirwald 2002 needs chronological age, standing height, body mass, **sitting height**
  and estimated leg length. Standard error 0.592 years.
- [S12] Moore 2015 simplifies to age plus height for girls, and age plus either sitting height
  or height for boys. Standard error 0.542 years, slightly better.
- [S13] and the validation literature both report the same systematic bias: predictions run
  **later than observed for early maturers and earlier than observed for late maturers**. The
  equations regress toward the mean, which means they are least accurate for exactly the
  children whose maturity differs most from their birth year, which is the entire reason
  anyone wanted the estimate.

Sitting height requires a wall, a box and a second person. A standard error of half a year on
a window that is itself 6 to 12 months long means the estimate cannot reliably place a child
inside or outside the window it exists to detect. And [S13] adds that non-invasive methods
"require further validation especially within different ethnicities".

[S1]'s own recommendation is not to predict. It is to **measure**: "quarterly assessments of
stature, limb length and body mass are taken to allow the analysis of growth curves", in order
to identify youth experiencing rapid growth who may be at risk of growth-related injury. That
is a thing a phone can do, and it needs no equation.

**Conclusion for the product.** BodyT should not implement Mirwald or Moore. If a youth mode
ever exists, the maturity signal is a **repeated height measurement**, not a predicted offset.
The app already stores `heightIn` (`src/store/schema.ts:227`) and already has a measurements
array with dates (`schema.ts:171-187`). A spurt is two heights and the days between them.

### 5.3 Why chronological age is a weak proxy at the old end too

R7 3.1 established this and this pack does not restate it: a fit 68 year old and a frail
68 year old are different athletes, and the separating variables are chair rise, fall history,
gait aid and floor transfer. [S32] adds the outcome evidence, and [S24] adds the two
programming gates that are genuinely not age gates: high-velocity power work is contraindicated
by **poor form and execution** and by **severe osteoarthritis**, neither of which is a birthday.

What age genuinely buys at the old end is small but real, and it is a **prior on rate**, not a
constraint on content. [S38] gives it a number: about 0.55 to 1.04 percent per year of measured
performance decline from the mid 30s through 60, steepening to 1.4 to 1.7 times that slope
after 70. That is the one thing a decade band tells the plan that no function screen does,
because a function screen is a snapshot and the projection model needs a slope.

### 5.4 The questions, written in the app's voice

Shape matches `src/plan/followups.ts:31-46`: a short `q`, chip `options`, and an `informs`
line that states what the plan does differently, because that file's own rule is "no answer,
no question".

None of these is a date of birth field. All are skippable, and skipping lands on `unknown`
(3.7), which is not a punishment.

**Q1. The decade band.** Asked once, on the "Where you're at" step beside training experience,
because that is where the athlete is already telling the app about themselves.

```
id:      'decade'
q:       'Roughly what decade are you in?'
options: ['Teens', '20s', '30s', '40s', '50s', '60s', '70 or over']
informs: 'How fast the plan expects your numbers to move, and how often it deloads.'
```

Note the first option. "Teens" exists so the answer is honest rather than absent, and so the
gate in 4.4 has something to act on. It is not a way in.

**Q2. The recovery read.** Asked of everyone, not only older athletes, because it is a better
question than the birthday for the thing it decides.

```
id:      'day-after'
q:       'How do you feel the day after a hard session?'
options: ['Fine by morning', 'Sore but fine', 'Takes me two days', 'Longer than that']
informs: 'How much rest sits between your heaviest days.'
```

**Q3. The standing-up question.** R7 3.1 owns the chair-rise screen and its STEADI cut points.
This is the same question in the app's voice, asked only when the decade band is 60s or over,
and it is offered once and never re-asserted.

```
id:      'chair'
q:       'Can you get up from a chair without pushing off?'
options: ['Every time', 'Usually', 'I use my hands']
informs: 'Whether standing work or seated work leads your session.'
```

**Q4. The balance question.** Also 60s and over, also once.

```
id:      'footing'
q:       'Lost your footing in the last year?'
options: ['No', 'A stumble or two', 'Yes, I went down']
informs: 'Whether balance work goes in the plan, and how much jumping stays out.'
```

**Q5. The growth question.** Only exists if a youth mode ever exists. It is a measurement
prompt, not a maturity estimate, per 5.2.

```
id:      'grown'
q:       'Grown much in the last few months?'
options: ['No idea', 'A bit', 'A lot, nothing fits']
informs: 'Whether the weights hold steady for a few weeks while the reps keep moving.'
```

**Q6. The overlay question, and how not to ask it.** The menopause slice of v12 section 13
lands here. [S35] reports that more than 70 percent of women experience musculoskeletal
symptoms across the transition and about 25 percent are disabled by them, and [S34] gives the
loading response. The app must not name a condition, diagnose, or imply it treats one (R12
rows 1 and 22, and L4 above). So the question is about the training input, not the life stage:

```
id:      'joints-lately'
q:       'Have your joints been noisier than usual lately?'
options: ['No', 'Some days', 'Most days']
informs: 'How much of your week is impact work, and how the warm-up is built.'
```

This is deliberately asked of everyone. A version gated on sex and a decade band would be the
app announcing a guess about somebody's life stage, which is the thing it is not allowed to
do, and it would miss every man with the same complaint.

### 5.5 What the app must never do with these answers

- Never render the band back as an identity. No "at 62" anywhere in copy (L5).
- Never use a band to lower a target the athlete set for themselves. The band moves the
  **projection**, which is the app's own claim about the future, and R12 puts the athlete's
  goals at tier 4.
- Never treat a skipped question as an answer. `unknown` is a state, not a default value.
- Never re-ask more than R12's budget allows: one ask, one re-ask after 21 days if the answer
  would change a live decision, then silence.

---

## 6. THE MASTERS END

R7 3.1 handles the frail 68 year old. This section handles the one R7 deliberately did not:
the 62 year old who passes every function screen, squats twice a week, has no fall history and
no gait aid, and whose plan is therefore built by exactly the same code that builds a 24 year
old's. Five things break, and they break quietly.

### 6.1 Break 1: the progression model has one gear and it is calibrated on a beginner

The rate model is mechanical (`src/plan/milestones.ts:71-107`): a wrap costs
`repHigh - repLow + 1` successful sessions, the calendar cost follows from how often the lift
appears, and two corrections are applied, a deload tax of 4/3 (`milestones.ts:95`) and a stall
multiplier indexed on training age (`milestones.ts:96`). The whole thing is then capped by
`LB_PER_WEEK_CEILING` (`milestones.ts:119`), which is `{ new: 4, returning: 2, casual: 1.3,
trained: 0.75 }` pounds per week.

For a `new` athlete that ceiling is 4 lb per week, which is **208 lb a year on a main lift**.
The file's own comment says that is "roughly right for a beginner and absurd for anyone else",
and it is right about that. What it does not say is that "beginner" here means training
history, not biology. A 64 year old who has never lifted is `new` by every question the app
asks (`Onboarding.tsx:489-511`), and receives the same 208 lb per year ceiling.

[S38] is the corrective and it is a measured one, not a guess: masters performance declines by
about **0.55 to 1.04 percent per year** from the mid 30s through 60, and after 70 the slope is
**1.4 to 1.7 times** as steep. That is the background the training gain is fighting against,
and it is not in the model anywhere.

[S30] gives the other half. In healthy old adults the dose-response optimum for **strength**
was 2 sessions per week, 70 to 79 percent 1RM, 2 to 3 sets, 7 to 9 reps, over a 50 to 53 week
period. The 50 to 53 week figure matters most: the largest effect sizes came from **year-long**
programmes. The app's projection horizon is a milestone ETA computed off a weekly rate, and
year-scale adaptation with a shallow slope is exactly the shape a linear weekly projection gets
most wrong.

**What the constants get wrong, precisely.** `LB_PER_WEEK_CEILING` needs a second dimension.
Section 3.3 proposes multipliers of 0.85, 0.6 and 0.4 for `masters1`, `masters2` and
`masters3`, applied on top of the existing training-age ceiling rather than replacing it, so a
`trained` 72 year old lands at 0.75 times 0.4, and a `new` 62 year old at 4 times 0.6. Both
numbers are HOUSE RULE anchored on [S38].

### 6.2 Break 2: the load step is a plate, and a plate is too big

`loadStepLb` (`src/engine/reps.ts:299-302`) returns 10 lb for anything whose primary muscles
include a lower-body region and 5 lb otherwise. The file already knows this is a problem and
has a partial guard: `plateIsTooBig` (`reps.ts:237-245`) holds the rep target when the step
exceeds 10 percent of the working weight, but **only for small-muscle isolation work**
(`SMALL_MUSCLE`, `reps.ts:213-220`), and the comment at `reps.ts:247-256` explicitly excludes
presses because "somebody pressing the 30s takes the 35s next".

For a 62 year old beginner leg-pressing 60 lb, a 10 lb step is a **17 percent** jump, well
outside the 2 to 10 percent band that `reps.ts:230` cites [S42] by name. The guard does not
fire because the quadriceps are not in `SMALL_MUSCLE`. So the athlete is handed a jump they
will miss, and a missed set reads to the rest of the engine as a failing lift
(`logic/prescription.ts:99-101` starts them lighter next time), which is a false stall
generated entirely by the granularity of the plate.

This is not only a masters problem, it is a **light-athlete** problem, and it is worse for
masters because [S24] and [S30] both put older adults at lower absolute loads. Section 3.3
proposes 2.5 lb upper and 5 lb lower for `masters2` and `masters3`; the more general fix is to
apply the 10 percent rule to every movement rather than to `SMALL_MUSCLE` only.

### 6.3 Break 3: one deload cadence, and the wrong ramp

`applyDeload` (`src/engine/transforms.ts:164-178`) halves lifting sets on week 4 of every
block, and `applyWeekRamp` (`transforms.ts:135-162`) adds one set to the day's lead lift on
week 3. So the block shape is hold, hold, add a set, halve.

For `masters2` at [S30]'s optimum of 2 to 3 sets, the week-3 ramp pushes the lead lift to 4
sets, above the range that produced the largest effect in the meta-analysis. And the deload
halves a 2-set prescription to 1, which `MIN_WORKING_SETS` (`transforms.ts:191`) would have
refused had it applied here, because the file's own judgement is that one set "removes the
reason it was in the day". The deload path does not use that constant.

Section 3.3 proposes a 1-in-3 cadence for `masters2` and `masters3`. That number is HOUSE RULE
and [S39] is the reason it has to be: the review of aging and muscle recovery concludes that
the belief older athletes need longer between hard sessions is plausible and confounded in
nearly every study that tested it. The defensible anchor is [S30]'s 2-sessions-per-week
strength optimum, which is a claim about weekly hard-session density arriving through cleaner
evidence.

### 6.4 Break 4: the calorie baseline refuses to know about age, and says so

`buildNutrition` (`src/plan/generator.ts:482-517`) computes maintenance as bodyweight times 15,
or times 14 for women (`generator.ts:491`), rounded to 50, plus a height correction. The height
correction is Mifflin-St Jeor's height slope only, and `src/plan/sportsNutrition.ts:130-132`
states the omission as policy: Mifflin-St Jeor proper "needs age, which the app does not ask
for and will not start asking for to buy a second-order term".

The age term in Mifflin-St Jeor is 5 kcal of BMR per year. Across 40 years that is 200 kcal of
BMR, and at the same 1.55 activity factor the file already uses (`sportsNutrition.ts:118`) it
is about **310 kcal of daily maintenance**. That is larger than the height correction the file
does apply, which is clamped to plus or minus 250 (`sportsNutrition.ts:141`). Calling it a
second-order term is the one factual error in that comment.

Worked example, 175 lb, 69 inches, male:

| | App estimate | Mifflin-St Jeor at 1.55 |
|---|---|---|
| Age 30 | 2,650 | 2,704 |
| Age 70 | 2,650 | 2,394 |

At 70 the app is high by about **256 kcal, roughly 11 percent**. The consequence is not a
safety failure, the calorie floor (`plan/kcalFloor.ts:56-75`) still holds and is in fact
computed off the inflated maintenance so it sits higher in absolute terms. The consequence is
an **honesty** failure, which this repo treats as the more serious one
(`milestones.ts:16-20`): a `lean` goal at 70 gets a target that is a 19 percent deficit against
the app's estimate and about a 10 percent deficit against reality, while
`fatLossPctPerWeek` (`milestones.ts:47-53`) computes the ETA off body-fat percent alone and
promises the faster rate. The milestone date will be wrong in the direction the file exists to
prevent.

The fix is not to start asking for a birthday. It is to apply a decade-band offset to the
baseline when a band is known: HOUSE RULE, minus 100 kcal for `masters1`, minus 200 for
`masters2`, minus 300 for `masters3`, zero otherwise, which reproduces the Mifflin age slope at
band resolution without a date of birth.

### 6.5 Break 5: three things that are simply absent

**Balance.** There is no balance content in the plan vocabulary. `RECIPES`
(`src/plan/generator.ts:231-350`) has power, speed, lower strength, push, pull and the rest;
nothing trains standing on one leg. [S25] makes functional balance a named third pillar for
65+, on 3 or more days a week, at strong recommendation strength. [S32] is the outcome
evidence: balance and functional exercise reduced the rate of falls at rate ratio 0.76 with
**high** certainty, while programmes that were primarily resistance training produced an effect
the review was uncertain about. BodyT ships a primarily-resistance-training programme and
therefore ships the category the largest review in this pack could not confirm works.

**Power as a distinct quality.** The app has `power` as a day title
(`generator.ts:232-247`) and it means sprints and box jumps, which is the young-athlete
meaning. [S24]'s older-adult meaning is different: 40 to 60 percent of 1RM moved with high
concentric velocity, contraindicated by poor form and by severe osteoarthritis. [S36] is why it
matters: power declines with age faster than strength, roughly 3.5 percent per year against
strength's slower slope, because type II fibres atrophy selectively. [S37] finds power training
favoured over strength training for older adults' functional test performance, with less total
work per session, at low to very low certainty. A `masters2` athlete needs a fast-and-light
item, and the app's only fast items are sprints and jumps.

**Bone loading, and the menopause-adjacent slice.** [S34] recommends weight-bearing with
impact plus progressive resistance, with impact scaled down only for those with vertebral or
multiple low-trauma fractures, and warns against sustained, repeated or end-range spinal
flexion. [S33] is the strongest single trial: 8 months, twice weekly, 30 minutes, 5 sets of 5
above 85 percent 1RM plus impact, in postmenopausal women with low bone mass, produced BMD and
functional gains with no adverse events. The qualifier the authors state and this pack repeats
is **"under highly supervised conditions"**, which is why the finding cannot become a BodyT
prescription: an app cannot ship a supervised 5-by-5 at 85 percent 1RM and keep the safety
result attached to it. What it can ship is the direction: for `masters1` and up, one
weight-bearing impact item per week where no fracture flag exists, and no plan whose spinal
content is repeated end-range flexion.

### 6.6 What does not break, and must not be "fixed"

- The double-progression rule itself. It reads the log rather than the calendar
  (`engine/reps.ts:157-200`) and is already autoregulatory, which is exactly what [S24]'s
  "avoid going to failure" and R7's function-first model both want.
- The `NOISE_FLOOR` guard (`milestones.ts:167-180`), which refuses to print an ETA when the
  modelled weekly rate is below instrument resolution. For `masters3` this fires more often,
  and that is the correct behaviour, not a regression.
- The body-fat estimator (`engine/bodyfat.ts:21-35`). The US Navy circumference formula has no
  age term, unlike the BMI-based estimators, so it does not silently mis-state an older
  athlete's body fat. Nothing to do here.
- The `unknown` band. A masters athlete who does not answer the decade question keeps the adult
  product, per 3.7. Degrading the product for the unanswered case is how an app teaches people
  that questions are a toll.

---

## 7. AUDIT OF THE LIVE CODE

Read at the `wt-fix2` working tree. Every line number below was opened and read; quoted code is
verbatim from the file named, with the repo's own em dashes stripped from comment text where a
comment is paraphrased rather than quoted. Severity is against harm to the athlete, not against
code quality.

**Twenty findings, in four groups: what age is today (7.1 to 7.3), silent young-adult constants
(7.4 to 7.12), missing gates (7.13 to 7.19), and what is already correct (7.20).**

### 7.1 Every use of the word "age" in the tree, and none of them mean years lived

There are exactly three senses of `age` in `src/`, and a future session must not conflate them.

| Sense | Where | What it is |
|---|---|---|
| **Training age** | `src/plan/milestones.ts:29`, and every consumer | `type TrainingAge = 'new' \| 'returning' \| 'casual' \| 'trained'`. Training history |
| **Elapsed days** | `src/engine/fatigue.ts:128-129` | `const age = daysBetween(s.date, today)`, then `if (age < 0 \|\| age > RECENT_DAYS) continue`. How old a *record* is |
| **Chronological age** | nowhere | Does not exist |

Full list of `TrainingAge` sites, all verified:

- `src/plan/milestones.ts:29` the type.
- `src/plan/milestones.ts:65-68` `gainPctPerWeek(age)`, scale `{ new: 1, returning: 0.7, casual: 0.55, trained: 0.45 }`.
- `src/plan/milestones.ts:96` `const STALL: Record<TrainingAge, number> = { new: 1.15, returning: 1.6, casual: 2, trained: 2.6 }`.
- `src/plan/milestones.ts:119` `const LB_PER_WEEK_CEILING: Record<TrainingAge, number> = { new: 4, returning: 2, casual: 1.3, trained: 0.75 }`. **This is the table the brief asked for. It is indexed by training history, not by birthday.**
- `src/plan/milestones.ts:162-163` `VERT_IN_PER_WEEK` and `vertInPerWeek(age)`.
- `src/plan/milestones.ts:99-107` `weeksPerLoadStep({ ..., age })`.
- `src/plan/milestones.ts:122-130` `strengthLbPerWeek({ ..., age })`, which returns `Math.min(mechanical, LB_PER_WEEK_CEILING[args.age])`.
- `src/engine/journey.ts:116-118` `function ageOf(data: AppData): TrainingAge { return data.plan.experience ?? 'new' }`. The only producer.
- `src/engine/journey.ts:199` `const age = ageOf(data)`, then `:206` `gainPctPerWeek(age)`, `:277` into `strengthLbPerWeek`, `:352` `vertInPerWeek(age)`.
- `src/store/schema.ts:110` `experience: z.enum(['new', 'returning', 'casual', 'trained']).optional()`, the stored source.
- `src/plan/generator.ts:39` `experience: 'new' | 'returning' | 'casual' | 'trained'` on `OnboardingAnswers`.
- `src/screens/onboarding/Onboarding.tsx:489-511` the question that sets it: "How much have you trained?" with chips New to this / Coming back / Casual / Experienced.

**Consequence.** A 68 year old and a 22 year old who both answer "New to this" receive an
identical `LB_PER_WEEK_CEILING` of 4 lb per week, an identical `STALL` multiplier of 1.15, an
identical `gainPctPerWeek` scale of 1, and an identical vertical-jump projection of 0.2 inches
per week. [S38] says the two are on different slopes by 0.55 to 1.04 percent per year, and
after 70 by 1.4 to 1.7 times that.

### 7.2 SEVERITY 1. There is no age field, no age question, and no age gate anywhere

`src/store/schema.ts:224-229`:

```ts
  profile: z.object({
    displayName: z.string().optional(),
    username: z.string().optional(),
    heightIn: z.number().optional(),
    bfFormula: z.enum(['male', 'female']).optional(),
  }),
```

Four fields. No age, no birth year, no band.

`src/screens/onboarding/MeStep.tsx:29-47` collects display name, sex, height and weight, in that
order, gated so each appears only when the previous is answered (`MeStep.tsx:51-53`). The file
header (`MeStep.tsx:6-27`) explains why each of the four is asked. Age is not among them and is
not discussed.

`src/screens/onboarding/Onboarding.tsx:327-540` is the full wizard: welcome, MeStep, GoalStep,
followups, days per week, gear, experience, meals, permissions, preview. There is no terms
screen, no disclaimer, no minimum-age statement and no gate.

**Consequence.** Section 4. A minor can complete onboarding and receive a calorie deficit, a
body-fat estimate, a progress-photo prompt and an escalating accountability voice.

### 7.3 SEVERITY 2. The refusal to ask for age is written into a comment as policy, and the reasoning is wrong

`src/plan/sportsNutrition.ts:128-133`, verbatim apart from the em dash the original contains:

> Deliberately a CORRECTION rather than a replacement. Mifflin-St Jeor proper needs age, which
> the app does not ask for and will not start asking for to buy a second-order term; taking
> only its height slope gets the part height actually contributes without inventing an age.

The height slope the file does apply is `KCAL_PER_INCH = 6.25 * 2.54 * 1.55`
(`sportsNutrition.ts:118`), clamped to plus or minus 250 kcal (`sportsNutrition.ts:141`). The
age slope it declines is 5 kcal of BMR per year, which over 40 years and the same 1.55 factor
is about 310 kcal. **The declined term is larger than the applied one.** Calling it
second-order is a factual error, and it is load-bearing because it is the stated reason the
field does not exist. Section 6.4 has the worked numbers.

### 7.4 SEVERITY 1. `LB_PER_WEEK_CEILING` promises a 64 year old beginner 208 lb a year

`src/plan/milestones.ts:119`. `new: 4` pounds per week times 52 weeks is 208 lb on a main lift.
The comment above it (`milestones.ts:109-118`) defends the number for a beginner, correctly, and
has no age dimension to defend it against. `src/plan/milestones.ts:16-20` states the file's own
standard: a milestone somebody cannot hit in the time stated "is a lie that makes them quit in
week six, and it is worse than showing no estimate at all". By that standard this is the
highest-severity honesty defect in the tree for a masters athlete.

**Fix.** Section 3.3's band multipliers, applied as a second `Math.min` inside
`strengthLbPerWeek` (`milestones.ts:122-130`).

### 7.5 SEVERITY 1. The load step is a plate and the too-big guard only covers isolation work

`src/engine/reps.ts:299-302`:

```ts
export function loadStepLb(exerciseId: string): number {
  const primary = musclesFor(exerciseId).primary
  return primary.some((r) => LOWER_BODY.has(r)) ? 10 : 5
}
```

`src/engine/reps.ts:237-245` is the guard, and `reps.ts:243` is the line that limits it:

```ts
  if (primary.length === 0 || !primary.every((r) => SMALL_MUSCLE.has(r))) return false
  return loadStepLb(exerciseId) > working * 0.1
```

`SMALL_MUSCLE` (`reps.ts:213-220`) is biceps, triceps and the other isolation regions.
`reps.ts:230` cites the "2 to 10 percent band ACSM gives for an increment" [S42], and
`reps.ts:247-256` deliberately excludes presses.

**Consequence.** A 10 lb step on a 60 lb leg press is 17 percent, and the guard does not fire
because quadriceps are not in `SMALL_MUSCLE`. The athlete misses the set, and
`src/logic/prescription.ts:99-101` reads the miss as a failing lift and starts them lighter
next time. A false stall, manufactured by plate granularity, on exactly the population [S24]
and [S30] place at lower absolute loads.

**Fix.** Apply the 10 percent rule to every movement, not to `SMALL_MUSCLE` only, and add the
`masters2` and `masters3` half-steps from 3.3.

### 7.6 SEVERITY 2. One deload cadence for every athlete, and it is not reachable from data

`src/engine/transforms.ts:164-178` halves lifting sets on the fourth week of every block, and
`src/plan/blocks.ts:4` fixes the block at four weeks. `src/plan/milestones.ts:95`
(`const DELOAD_TAX = 4 / 3`) hard-codes the same assumption into the projection. There is no
input anywhere that can change it.

[S30]'s strength optimum for healthy old adults was **2 sessions per week**, not 3, which is a
claim about weekly hard-session density that a fixed 1-in-4 deload cannot express.
Section 3.3 proposes 1-in-3 for `masters2` and up, marked HOUSE RULE because [S39] establishes
that the direct recovery evidence is confounded.

### 7.7 SEVERITY 2. The week-3 ramp pushes an older athlete past the meta-analytic set optimum

`src/engine/transforms.ts:137-162` adds one set to the day's lead lift in week 3 of each block.
[S30] found the largest strength effect at **2 to 3 sets** in healthy old adults. A `masters2`
prescription at 3 sets becomes 4 in week 3. The overload guard at `transforms.ts:160-161` only
refuses when a per-region ceiling is already exceeded, which is a different question.

### 7.8 SEVERITY 2. The deload can cut a prescription to one set, and the file elsewhere says one set is not training

`src/engine/transforms.ts:176` returns `{ ...r, sets: Math.max(1, Math.ceil(r.sets / 2)) }`.
`src/engine/transforms.ts:190` declares `const MIN_WORKING_SETS = 2` with the comment "Below
this a lift stops being training and becomes a gesture", and it is used only in
`applyReadinessDowngrade` (`transforms.ts:210`). For `masters2` at [S24]'s 2-set entry dose, a
deload week produces 1 set. The two code paths disagree about the same threshold.

### 7.9 SEVERITY 2. The calorie baseline has no age term and the deficit guard is computed off it

`src/plan/generator.ts:491`:

```ts
  const base = Math.round((bw * (sex === 'female' ? 14 : 15)) / 50) * 50 + heightAdjustmentKcal(heightIn, sex)
```

`src/plan/kcalFloor.ts:60`:

```ts
  const floor = Math.max(MIN_KCAL_TRAINING, Math.round(maintenance * (1 - MAX_DEFICIT)))
```

with `MIN_KCAL_TRAINING = 1500` (`kcalFloor.ts:34`), `MIN_KCAL_REST = 1200` (`:37`),
`MAX_DEFICIT = 0.25` (`:44`) and `REST_DAY_DROP = 300` (`:47`).

At 70 the bodyweight multiplier overstates maintenance by roughly 11 percent (section 6.4), so
the proportional guard sits about 11 percent high in absolute kcal and the prescribed deficit
against **true** maintenance is roughly half the intended one. The floor is therefore safe and
the **rate promise is wrong**, which `milestones.ts:16-20` treats as the more serious failure.

Note also `kcalFloor.ts:20`, in the file's own header: the absolute minimum is "below which no
**adult** should be eating daily without supervision". The word is doing real work and there is
no non-adult branch.

### 7.10 SEVERITY 2. Per-meal protein falls below the older-adult anabolic threshold for small athletes

`src/plan/sportsNutrition.ts:150-156`:

```ts
export const PROTEIN_PER_MEAL_G_PER_KG = 0.4

export function proteinPerMealG(bodyweightLb: number, mealsPerDay: number): number {
  const kg = toKg(clampLb(bodyweightLb))
  const floor = kg * PROTEIN_PER_MEAL_G_PER_KG
  return Math.round(Math.max(floor, proteinTargetG(bodyweightLb, 'hypertrophy') / Math.max(1, mealsPerDay)) / 5) * 5
}
```

`MealsPerDay` is `2 | 3 | 4 | 5` (`src/plan/foods.ts:258`). Evaluated:

| Bodyweight | 3 meals | 4 meals | 5 meals |
|---|---|---|---|
| 110 lb (49.9 kg) | 35 g | 30 g | **20 g** |
| 120 lb (54.4 kg) | 40 g | 30 g | **25 g** |
| 130 lb (59.0 kg) | 45 g | 35 g | **25 g** |
| 175 lb (79.4 kg) | 60 g | 45 g | 35 g |

[S27] puts the older-adult per-meal threshold at 25 to 30 g of high-quality protein with
leucine at or above roughly 3 g, to overcome anabolic resistance and higher splanchnic
extraction. A 110 lb athlete on five meals is handed 20 g per meal, under the threshold in
every meal of the day. The bug is structural: the threshold is an **absolute** amount and the
app models it as a **fraction of bodyweight**.

**Fix.** An absolute floor of 25 g per meal when the band is `masters2` or `masters3`, taken
against the same daily total so the day does not inflate. HOUSE RULE on the exact number,
[S27] on the direction.

### 7.11 SEVERITY 3. The layoff giveback is capped at three steps and the cap has no age term

`src/engine/reps.ts:135-141`:

```ts
export const STALE_DAYS = 21
export const LAYOFF_STEP_DAYS = 28
export const MAX_STALE_STEPS = 3
```

Three steps at `loadStepLb` is 30 lb on a lower-body lift, however long the layoff. Section 3.3
proposes 4 for `masters2` and `masters3`. HOUSE RULE, and it is a genuinely small effect,
recorded for completeness rather than urgency.

### 7.12 SEVERITY 3. Two more silent young-adult defaults, both harmless today

- `src/engine/intensity.ts:76-78`, `usableHeightIn` falls back to 69 inches, and
  `src/plan/reach.ts:114` sets `DEFAULT_HEIGHT_IN` to 69 male and 64 female. These are adult
  means and would be wrong for a youth product. They are correct for the adult-only product
  section 4 recommends.
- `src/engine/intensity.ts:168`, `const toKg = (lb: number) => Math.min(150, Math.max(40, (lb || 175) * 0.4536))`.
  A 40 kg floor is 88 lb, which is a plausible weight for a 12 year old and not for an adult.
  Nothing breaks; it is listed so a future youth-mode session does not assume it is a guard.
- The Compendium METs in `src/plan/cardio.ts` are calibrated on a reference resting metabolic
  rate of 3.5 mL/kg/min, which is a young-adult reference. MET-derived calories therefore run
  high for older adults. This is a known limitation of the method rather than a repo defect,
  and it compounds 7.9 in the same direction.

### 7.13 SEVERITY 1. Nothing gates explosive content on anything

`src/plan/generator.ts:232-247`, the `power` recipe, verbatim entries:

```ts
      fx('falling-start-sprint', 5, '2', 2),
      fx('box-jump', 4, '3', 3),
```

and `generator.ts:249-266`, the `speed` recipe, includes `max-velocity-sprint` at 5 sets of
30 to 40 yards and `pogo-hop` at 3 sets of 20.

These are reachable by any athlete who picks the `vertical` or `speed` goal
(`generator.ts:117-126` maps goal to family, `generator.ts:127-155` maps family to layout).
Nothing in the path consults fall history, joint pain, technique quality or an age band.

[S24] states two contraindications for high-velocity work in older adults, verbatim: poor form
and execution, and severe osteoarthritis. R7 3.1's red line adds no jumping or landing
prescription for someone who reports a fall in the past year. Neither exists in code. A 71 year
old who wants to jump higher gets 4 sets of box jumps and 5 sets of falling-start sprints.

### 7.14 SEVERITY 1. There is no balance content in the plan vocabulary at all

`src/plan/generator.ts:231-350` defines every day archetype: power, speed, lower strength, push,
pull, and the rest. `src/plan/exercises.ts` contains single-leg **loading** movements
(`exercises.ts:170` Bulgarian split squat cues, `exercises.ts:225` step-up, `exercises.ts:523`
single-leg RDL) and no timed static balance progression: no feet-together, semi-tandem, tandem
or single-leg hold, and no supported-to-unsupported ladder.

[S25] makes functional balance a named third pillar for 65+ on 3 or more days a week, at strong
recommendation strength. [S32] gives it the outcome evidence at high certainty (rate ratio 0.76)
while finding resistance training alone uncertain. **BodyT ships the uncertain category and not
the certain one.** This is the single largest content gap in the pack.

### 7.15 SEVERITY 1. No consent surface, no terms, no minimum age

Covered in 7.2 and section 4. Listed again here because it is a **gate** finding, not only an
absence: `src/screens/onboarding/PermissionsStep.tsx:36-105` is the only screen that asks for
anything, and it asks for notifications, motion and location. There is no place in the flow
where a minimum age could currently be asserted, so the fix is a new screen, not an edit.

### 7.16 SEVERITY 1. The accountability layer has no minor branch, and R12 already established it overreaches for adults

R12 7.6 and its rows 13 to 21 established the scope problem for adults:
`screens/today/SkipFlow.tsx:203-260` demands a photo, `engine/coach.ts:74-77` escalates over
30 days, `plan/messages.ts:126` calls a skip "cowardice". None of these consult anything about
who is being spoken to. [S1] pillar 5 puts the health and wellbeing of the child at the centre
of any youth programme. Section 3.4 row L8 forbids the whole surface for minor bands.

### 7.17 SEVERITY 2. Body composition and calorie deficits are unconditional

`src/plan/generator.ts:482-517` builds calorie targets for every goal including `lean`
(`generator.ts:496`, `lean: -300`), `src/engine/bodyfat.ts:21-35` estimates body fat from tape
measurements, and `src/store/schema.ts:171-186` stores waist, hip, chest, arm and thigh
measurements plus front, side and back photographs. None of it is conditional on anything.
Section 3.7's `unknown`-band rule is the backstop: no deficit and no body-composition content
until an adult band is affirmatively stated.

### 7.18 SEVERITY 2. No growth-spurt concept exists, and the data to build one already does

`src/store/schema.ts:171-181` stores dated measurements including `weightLb`, and
`src/store/schema.ts:227` stores `heightIn` on the profile as a **single scalar**, not a series.
So the app can already track a dated weight curve and cannot track a height curve.

[S1] recommends quarterly stature, limb length and body mass to identify rapid growth. [S14]
gives the risk numbers. Section 3.6 defines the overlay. Building it needs one change: move
`heightIn` into the measurements series, or add `heightIn` to `measurementSchema`. The transform
it would drive already exists: `scaleExplosive` (`src/engine/transforms.ts:181-188`).

### 7.19 SEVERITY 3. Two projections that should be suppressed and are not

- `src/plan/milestones.ts:162-163` `VERT_IN_PER_WEEK` will project a vertical-jump gain for any
  athlete at any age. The honest behaviour past `masters2` is the same one
  `NOISE_FLOOR` (`milestones.ts:167-180`) already implements for a metric moving slower than
  the instrument reads: say nothing.
- `src/engine/phase.ts:41-47` promotes an anchor lift to a harder movement at a 16-week boundary
  on a 5 percent estimated-1RM gain over at least 8 sessions. R12 7.1 already flags this as an
  unconsented change. For `masters3` the additional problem is that the promotion chain moves
  toward more technically demanding movements, which [S24] gates on technique quality and which
  nothing here consults.

### 7.20 What the audit found already correct, and which must not regress

- **`ageOf` is honest about what it is.** `src/engine/journey.ts:116-118` reads
  `data.plan.experience` and returns a `TrainingAge`. It does not pretend to know a birthday,
  and the type name is accurate. The confusion is in the reader, not the code.
- **`fatLossPctPerWeek` refuses to scale by training age** (`milestones.ts:34-53`), with a test
  that enforces the refusal (`milestones.test.ts:56-70`). The reasoning, that leanness governs
  fat loss and training history does not, is correct and the same discipline is what section 3
  asks for on the age axis.
- **The US Navy body-fat formula has no age term** (`engine/bodyfat.ts:21-35`), unlike the
  BMI-based estimators. Nothing to fix.
- **`NOISE_FLOOR`** (`milestones.ts:167-180`) already suppresses an ETA when the modelled rate
  is below instrument resolution. For older athletes it fires more often, correctly.
- **Double progression reads the log, not the calendar** (`engine/reps.ts:157-200`), which is
  already the autoregulation [S24]'s avoid-failure guidance and R7's function-first model both
  want.
- **`structure.test.ts:14-15`** states the allowlist rule this pack's copy test should copy:
  "Adding a name to an allowlist is a decision to make things worse. Deleting one is the goal."

---

## 8. TYPED SCHEMA PROPOSAL

Written in the tree's own conventions: a types file beside `prefsTypes.ts`, a zod mirror beside
`prefsSchema.ts`, a pure band table in `plan/`, and consumers that read it in as few places as
possible. Schema version at the time of writing is 20 (`src/types.ts:610`).

**The design constraint that shapes everything below:** this must add **one optional field**
and be read in **four places**, not add an age branch to every engine. An age dimension that
threads through the whole tree is a dimension a future session gets wrong.

### 8.1 `src/lifespanTypes.ts` (new, rank 0, beside `prefsTypes.ts`)

```ts
import type { ISODate } from './types'

// ============================================================
// What the app knows about where in a life this athlete is, and
// it is deliberately very little.
//
// Its own file for the same reason as prefsTypes.ts: types.ts is
// at its line allowance and these shapes are one subject.
//
// THE RULE THIS FILE EXISTS TO ENFORCE. There is no date of
// birth here and there will not be one. A birthday is a worse
// predictor than any of the three answers below, it is the field
// that turns a general wellness app into a regulated collector
// of children's data, and it invites a lie that the app then has
// to act on. A band is enough for everything the plan decides.
// ============================================================

/**
 * The bands, and `unknown` is the common case, not the edge case.
 *
 * Named rather than numbered so a future session cannot renumber
 * them silently, and ordered youngest to oldest so a comparison
 * against an ordered array is the only ordering that exists.
 */
export type LifeStage =
  | 'child'       // under 12
  | 'adolescent'  // 12 to 15
  | 'teen'        // 16 to 17
  | 'adult'       // 18 to 39
  | 'masters1'    // 40 to 54
  | 'masters2'    // 55 to 69
  | 'masters3'    // 70 and over
  | 'unknown'

/** How the day after a hard session actually goes. Section 5.4 Q2. */
export type RecoveryRead = 'next-morning' | 'sore-ok' | 'two-days' | 'longer'

/**
 * A growth spurt the athlete has told us about, or that two dated
 * heights have shown. It is a WINDOW, not a state: it expires, and
 * an expired one is re-offered rather than re-asserted.
 */
export interface GrowthWindow {
  since: ISODate
  /** Set when it lapses or the athlete says it is over. */
  until?: ISODate
  source: 'stated' | 'measured'
}

/**
 * Everything the lifespan layer stores. Every field optional,
 * because every question is skippable and a skipped question is
 * not an answer.
 */
export interface Lifespan {
  stage?: LifeStage
  recovery?: RecoveryRead
  /** The two R7 screens, asked only at masters2 and up. */
  chairRise?: 'always' | 'usually' | 'hands'
  footing?: 'none' | 'stumble' | 'fell'
  /** Joint noise, asked of everyone. Section 5.4 Q6. */
  jointsLately?: 'no' | 'some-days' | 'most-days'
  growth?: GrowthWindow
  /** The 4.4 gate. Stored as a confirmation, never as a birthday. */
  confirmedAdultAt?: ISODate
}
```

### 8.2 `src/store/lifespanSchema.ts` (new, the zod mirror, beside `prefsSchema.ts`)

Same arrangement and the same defaulting rationale as `src/store/prefsSchema.ts:8-15`: an
envelope written before this key existed parses cleanly and starts empty, so there is **no
migration and no SCHEMA_VERSION bump**.

```ts
import { z } from 'zod'
import { isoDate } from './primitives'

export const lifespanSchema = z
  .object({
    stage: z
      .enum(['child', 'adolescent', 'teen', 'adult', 'masters1', 'masters2', 'masters3', 'unknown'])
      .optional(),
    recovery: z.enum(['next-morning', 'sore-ok', 'two-days', 'longer']).optional(),
    chairRise: z.enum(['always', 'usually', 'hands']).optional(),
    footing: z.enum(['none', 'stumble', 'fell']).optional(),
    jointsLately: z.enum(['no', 'some-days', 'most-days']).optional(),
    growth: z
      .object({ since: isoDate, until: isoDate.optional(), source: z.enum(['stated', 'measured']) })
      .optional(),
    confirmedAdultAt: isoDate.optional(),
  })
  .default({})
```

Wired into `src/store/schema.ts` beside `prefs` (`schema.ts:253`):

```ts
  prefs: prefsSchema,
  lifespan: lifespanSchema,
```

### 8.3 `src/plan/lifespan.ts` (new, rank 0, pure data and arithmetic)

The band table itself, in the shape `src/plan/milestones.ts` already uses for
`LB_PER_WEEK_CEILING` and `STALL`: a `Record` keyed by the union, with the source for each
column in the comment above it. No `AppData`, no dates, no imports from `engine/`.

```ts
import type { LifeStage } from '../lifespanTypes'

/**
 * What each band changes, as multipliers and small integers.
 *
 * `unknown` is IDENTICAL to `adult` on every numeric column, on
 * purpose. Degrading the plan for an athlete who declined a
 * question teaches them that questions are a toll. The two places
 * `unknown` differs from `adult` are gates, not numbers, and they
 * live in `gatesFor` below.
 *
 * Sources, column by column, are in research/R15-lifespan.md
 * section 3.3. Every number without a source tag there is a
 * HOUSE RULE and is written as an exact figure so it can be
 * argued with.
 */
export interface StageDial {
  /** Multiplies LB_PER_WEEK_CEILING. */
  ratePct: number
  /** Weeks per block, deload included. 4 today, 3 for masters2 and up. */
  blockWeeks: 3 | 4
  /** Multiplies loadStepLb. */
  loadStepPct: number
  /** Overrides MAX_STALE_STEPS. */
  maxStaleSteps: number
  /** Added to the maintenance baseline, kcal. Reproduces Mifflin's age slope at band resolution. */
  kcalOffset: number
  /** Absolute per-meal protein floor in grams, or 0 for the existing fractional rule. */
  proteinPerMealFloorG: number
}

export const STAGE_DIAL: Record<LifeStage, StageDial> = {
  child:      { ratePct: 0,    blockWeeks: 4, loadStepPct: 0,    maxStaleSteps: 3, kcalOffset: 0,    proteinPerMealFloorG: 0 },
  adolescent: { ratePct: 0,    blockWeeks: 4, loadStepPct: 0,    maxStaleSteps: 3, kcalOffset: 0,    proteinPerMealFloorG: 0 },
  teen:       { ratePct: 1,    blockWeeks: 4, loadStepPct: 0.5,  maxStaleSteps: 3, kcalOffset: 0,    proteinPerMealFloorG: 0 },
  adult:      { ratePct: 1,    blockWeeks: 4, loadStepPct: 1,    maxStaleSteps: 3, kcalOffset: 0,    proteinPerMealFloorG: 0 },
  masters1:   { ratePct: 0.85, blockWeeks: 4, loadStepPct: 1,    maxStaleSteps: 3, kcalOffset: -100, proteinPerMealFloorG: 0 },
  masters2:   { ratePct: 0.6,  blockWeeks: 3, loadStepPct: 0.5,  maxStaleSteps: 4, kcalOffset: -200, proteinPerMealFloorG: 25 },
  masters3:   { ratePct: 0.4,  blockWeeks: 3, loadStepPct: 0.5,  maxStaleSteps: 4, kcalOffset: -300, proteinPerMealFloorG: 25 },
  unknown:    { ratePct: 1,    blockWeeks: 4, loadStepPct: 1,    maxStaleSteps: 3, kcalOffset: 0,    proteinPerMealFloorG: 0 },
}

/** A `ratePct` of 0 means the app declines to project at all, not that the rate is zero. */
export const projectsStrength = (s: LifeStage): boolean => STAGE_DIAL[s].ratePct > 0

export interface StageGates {
  /** May a plan auto-select depth jumps, drop jumps or maximal singles? */
  autoExplosive: boolean
  /** May body-composition and calorie-deficit content render? */
  bodyComposition: boolean
  /** Must a balance progression be in the week? */
  balanceRequired: boolean
  /** Is the accountability ladder (escalation, photo proof, excuse ledger) available? */
  accountability: boolean
}

export function gatesFor(s: LifeStage): StageGates {
  const minor = s === 'child' || s === 'adolescent' || s === 'teen'
  return {
    autoExplosive: s === 'adult' || s === 'masters1',
    bodyComposition: !minor && s !== 'unknown',
    balanceRequired: s === 'masters2' || s === 'masters3',
    accountability: !minor,
  }
}
```

### 8.4 The four read sites, and only four

| File | Line today | What changes |
|---|---|---|
| `src/plan/milestones.ts` | `:122-130` `strengthLbPerWeek` | Takes an optional `stage`, applies a second `Math.min` against `LB_PER_WEEK_CEILING[age] * STAGE_DIAL[stage].ratePct`. `:95` `DELOAD_TAX` becomes `blockWeeks / (blockWeeks - 1)` |
| `src/engine/reps.ts` | `:299-302` `loadStepLb`, `:141` `MAX_STALE_STEPS` | `loadStepLb` takes an optional `stage` and multiplies by `loadStepPct`, rounded to 2.5. `MAX_STALE_STEPS` is read from the dial. The `plateIsTooBig` guard (`:237-245`) drops its `SMALL_MUSCLE` restriction, which fixes 7.5 for everyone |
| `src/plan/generator.ts` | `:491` the baseline | Adds `STAGE_DIAL[stage].kcalOffset` to `base`. One term, beside `heightAdjustmentKcal` |
| `src/engine/resolveDay.ts` | the transform pipeline, whose order is named at `src/engine/transforms.ts:15-16` | Consults `gatesFor(stage)` for `autoExplosive` and `balanceRequired`, and applies the growth-window `scaleExplosive(2/3)` when `lifespan.growth` is live |

Plus one non-numeric read, in the copy layer rather than the engine:
`src/plan/sportsNutrition.ts:150-156` `proteinPerMealG` takes an optional floor.

### 8.5 Files that would change and are not in the list above

- `src/screens/onboarding/Onboarding.tsx` gains one screen before `MeStep`, the 4.4 age gate,
  writing `confirmedAdultAt`.
- `src/plan/followups.ts` gains the five questions from 5.4 as `GoalFollowup` records, which is
  the file's existing shape and needs no new mechanism.
- `src/store/schema.ts:253` gains one line, beside `prefs: prefsSchema`.
- `src/copy.test.ts` gains the L1 to L8 forbidden patterns from 3.4, with an allowlist that can
  only shrink, per `src/structure.test.ts:14-15`.
- `src/plan/exercises.ts` gains the balance progression: supported feet-together, semi-tandem,
  tandem, single-leg, as timed holds with a chair named in the instruction. This is content
  work, not schema work, and it is the largest single item in the pack.

### 8.6 What this schema deliberately does not have

- **No date of birth, and no age integer.** Stated in the `lifespanTypes.ts` header so it
  survives a future session that thinks a birthday would be more precise. It would be more
  precise and less useful, and it is the field that changes the app's regulatory position.
- **No maturity-offset estimate.** Section 5.2. Mirwald and Moore are not implemented, and
  `GrowthWindow.source: 'measured'` means two dated heights, not a predicted offset.
- **No `menopause` field, no `perimenopause` field, no life-stage label for women.** [S35] is
  Tier B and naming a life stage about a specific user is the thing R12's fence forbids.
  `jointsLately` is the training input, and it is asked of everyone.
- **No inferred stage.** Nothing derives `stage` from height, weight, training history or
  session pace. An inferred age is a guess the app then acts on and cannot explain, and the
  whole pack's argument is that guessing age is the mistake.
- **No per-exercise age gating table.** `gatesFor` returns four booleans. If a future session
  needs a fifth, it goes here, not into a per-movement column in `exercises.ts`.

---

## 9. EVAL FIXTURES

Twenty-five cases. Written to become `src/plan/lifespan.test.ts` plus additions to
`src/plan/milestones.test.ts`, `src/engine/reps.test.ts` and `src/copy.test.ts`.

Naming: **PAIR-n** for the mandated divergence cases (same goal, different band in, different
plan out), **MINOR-n** for the gate, **GROW-n** for the growth window, **INV-n** for invariants
that must hold across every band.

Every "Today" line says what the tree does at the `wt-fix2` working tree. All fifteen PAIR
cases currently **fail**, because there is no band to vary.

### 9.1 Paired divergence: same goal in, different plan out

**PAIR-1. Muscle gain, `adult` versus `masters2`, both `new`.**
State: goal `muscle`, `experience: 'new'`, 180 lb, band `adult` in case A and `masters2` in case
B. Everything else identical.
Expect: A's `strengthLbPerWeek` ceiling is 4.0 lb/wk; B's is 4.0 times 0.6 equals 2.4 lb/wk. The
projected weeks to a stated bar milestone differ by a factor of at least 1.6.
Today: both return 4.0 (`milestones.ts:119`, `:128`). Identical projections.

**PAIR-2. Lower-body load step, `adult` versus `masters3`.**
State: same lower-body movement, working weight 60 lb, top of the rep range cleared.
Expect: A's next step is plus 10 lb (`reps.ts:301`); B's is plus 5 lb, and additionally the
10 percent guard fires for **both** once 7.5 is fixed, because 10 lb on 60 lb is 17 percent.
Today: both get plus 10 lb. `plateIsTooBig` (`reps.ts:237-245`) does not fire because the
quadriceps are not in `SMALL_MUSCLE` (`reps.ts:213-220`).

**PAIR-3. Fat loss calorie baseline, `adult` versus `masters2`.**
State: goal `lean`, 175 lb, 69 in, male, no follow-up answers.
Expect: A's `base` is 2,650; B's is 2,450 (`kcalOffset: -200`). Both training-day targets stay
above their own `flooredTargets` floor, and B's stated weekly loss rate is lower to match.
Today: both 2,650 (`generator.ts:491`). The rate promise is identical and wrong for B.

**PAIR-4. Deload cadence, `adult` versus `masters2`.**
State: 12 weeks of identical training, goal `general`.
Expect: A deloads in weeks 4, 8 and 12; B deloads in weeks 3, 6, 9 and 12. A's `DELOAD_TAX` is
4/3; B's is 3/2.
Today: both deload on week 4 of a 4-week block (`transforms.ts:168`, `blocks.ts:4`,
`milestones.ts:95`). No input can change it.

**PAIR-5. Explosive content, `adult` versus `masters3`.**
State: goal `vertical`, no injury flags, no fall history recorded.
Expect: A's `power` day contains `box-jump` 4 sets of 3 and `falling-start-sprint` 5 sets of 2
(`generator.ts:239-240`). B's contains neither; `gatesFor('masters3').autoExplosive` is false,
and the day is rebuilt around loaded strength plus a high-velocity low-load item at [S24]'s
40 to 60 percent equivalent.
Today: identical plans. Nothing in `generator.ts:232-247` consults anything.

**PAIR-6. Balance, `adult` versus `masters2`.**
State: goal `general`, 3 days per week.
Expect: A's week contains no balance item. B's week contains a timed balance progression on at
least 3 days [S25], and the progression is supported before unsupported.
Today: neither contains one. No balance content exists in `plan/exercises.ts` (7.14).

**PAIR-7. Per-meal protein, `adult` versus `masters2`, small athlete.**
State: 110 lb, `mealsPerDay: 5`, goal `muscle`.
Expect: A gets 20 g per meal (current arithmetic). B gets 25 g per meal, from
`proteinPerMealFloorG: 25` [S27], with the daily total unchanged.
Today: both get 20 g (`sportsNutrition.ts:150-156`, arithmetic verified in 7.10).

**PAIR-8. Fat loss, `adult` versus `teen`.**
State: goal `lean`, 150 lb, identical answers.
Expect: A receives `kcalTraining`, `kcalRest` and a weekly loss range. B receives **no calorie
target at all**, no goal weight, no body-fat estimate and no loss range. The meals surface shows
protein and meal structure only. `flooredTargets` is not called.
Today: identical. `buildNutrition` (`generator.ts:482-517`) has no branch.

**PAIR-9. `adult` versus `unknown`, and the numbers must match.**
State: goal `muscle`, everything identical, band `adult` in A and absent in B.
Expect: every numeric output identical: same rate ceiling, same load step, same deload cadence,
same calorie baseline. **Only** two differences: B renders no body-composition or deficit
content, and B auto-selects no depth jumps or maximal singles (3.7).
Today: identical in every respect including the two that should differ.

**PAIR-10. `masters1` versus `masters2`, the band boundary that carries the most change.**
State: goal `strength`, `experience: 'trained'`, identical otherwise.
Expect: rate ceiling 0.75 times 0.85 equals 0.6375 versus 0.75 times 0.6 equals 0.45. Block
length 4 versus 3. Load step full versus half. `maxStaleSteps` 3 versus 4. Calorie offset minus
100 versus minus 200. Balance not required versus required.
Today: identical on all six.

**PAIR-11. Speed goal, `adult` versus `masters3`.**
State: goal `speed`.
Expect: A gets `max-velocity-sprint` 5 sets of 30 to 40 yards and `pogo-hop` 3 sets of 20
(`generator.ts:249-266`). B gets neither, and the goal itself is answered with a different day:
[S24]'s high-velocity low-load work plus a gait and balance progression.
Today: identical.

**PAIR-12. Vertical projection suppression, `adult` versus `masters2`.**
State: goal `vertical`, `experience: 'casual'`, one logged vertical measurement.
Expect: A sees a projected ladder from `vertInPerWeek('casual')` equals 0.09 in/wk. B sees no
projected date; the modelled rate falls under `NOISE_FLOOR.vertIn` of 0.5 inches once the band
multiplier applies, and the app says so instead of printing a date
(`milestones.ts:167-180`).
Today: both see a projection (`journey.ts:352`).

**PAIR-13. Layoff giveback, `adult` versus `masters2`.**
State: 90 days since the last logged session on a movement.
Expect: A gives back `min(3, floor(90/28))` equals 3 steps (`reps.ts:141`, `:183`). B gives back
`min(4, floor(90/28))` equals 3, and at 120 days A gives 3 while B gives 4.
Today: both capped at 3.

**PAIR-14. Function outranks band, upward.**
State: two `masters2` athletes, goal `strength`. A answers `chairRise: 'always'`,
`footing: 'none'`. B answers `chairRise: 'hands'`, `footing: 'fell'`.
Expect: A gets standing work leading the session and the band's numeric dials. B gets R7 3.1's
operators on top: seated variants first-class, no unsupported single-leg item until a supported
progression is passed, no jumping. **The band did not change; the plan did.**
Today: identical, and neither question is asked.

**PAIR-15. Function outranks band, downward.**
State: an `adult` who answers `chairRise: 'hands'` and `footing: 'fell'`.
Expect: R7's operators fire on the answers, not on the band. The plan is not the standard adult
plan.
Today: identical to any other adult. This is the case that proves the band is a prior and not a
gate, and v12's P0 contract requires it.

### 9.2 The minor gate

**MINOR-1. Declining the age gate stores nothing and proceeds nowhere.**
State: fresh install, the 4.4 screen, tap "I am not".
Expect: one screen shown, `localStorage` and IndexedDB unchanged, no envelope created, no
Supabase row. A back gesture does not resume the flow.
Today: no gate exists (7.2, 7.15).

**MINOR-2. A minor band renders no calorie target under any goal.**
State: band `teen`, cycle every goal in `Goal` including `lean`.
Expect: `buildNutrition` returns protein and meal structure only. No `kcalTraining`, no
`kcalRest`, no `weeklyLossRangeLb`, no body-fat estimate, no goal weight, no progress-photo
prompt.
Today: full nutrition for every goal.

**MINOR-3. A minor band disables the whole accountability surface.**
State: band `adolescent`, three consecutive missed sessions.
Expect: no escalation level change (`engine/coach.ts:74-77`), no photo demand
(`screens/today/SkipFlow.tsx:203-260`), no excuse-ledger entry, and no message from the pools
R12 rows 13 to 21 name. `gatesFor(stage).accountability` is false.
Today: full escalation.

**MINOR-4. A minor band progresses reps and variations, never load.**
State: band `adolescent`, top of the rep range cleared twice on a loaded movement.
Expect: `wrapped` is false and the load is unchanged; the athlete is offered a harder variation
instead. `STAGE_DIAL.adolescent.loadStepPct` is 0 and `loadStepLb` returns 0.
Today: plus 5 or plus 10 lb (`reps.ts:299-302`).

### 9.3 The growth window

**GROW-1. A live growth window holds load and cuts impact.**
State: band `adolescent`, `growth` set 3 weeks ago, plan contains jumps.
Expect: no load step on any movement; rep targets still move inside the range; explosive volume
scaled by 2/3 through the existing `scaleExplosive` (`transforms.ts:181-188`); no new movement
introduced this block; the 3.6 copy shown once.
Today: no growth concept exists (7.18).

**GROW-2. An expired growth window is re-offered, never re-asserted.**
State: `growth.since` is 17 weeks ago, no `until`.
Expect: the window lapses at 16 weeks. Normal progression resumes. The question from 5.4 Q5 may
be offered once more, subject to R12's re-ask budget, and not every session.
Today: unrepresentable.

### 9.4 Invariants

**INV-1. `unknown` is numerically identical to `adult`.**
State: any plan, any goal.
Expect: for every numeric column in `STAGE_DIAL`, `STAGE_DIAL.unknown` deep-equals
`STAGE_DIAL.adult`. This is a table test, and it is the cheapest guard in the pack. It exists so
that a future session cannot quietly make the unanswered case worse than the answered one.
Today: trivially true because neither exists.

**INV-2. A band may only ever reduce.**
State: for every `LifeStage`, apply the dial to a fixed reference plan.
Expect: no band increases total prescribed sets, total prescribed load, projected weekly rate,
or the depth of the calorie deficit, relative to `adult`. `ratePct`, `loadStepPct` and
`kcalOffset` are all at most 1, at most 1 and at most 0 respectively, by assertion on the table
itself.
Today: untestable. This mirrors R12's AUTH-7 and is the same discipline.

**INV-3. Changing only the band must not change exercise identity for `adult` and `masters1`.**
State: build a plan at `adult`, rebuild it at `masters1`, diff the exercise ids.
Expect: identical ids. `masters1` changes the rate multiplier and the calorie offset and adds
one weight-bearing impact item; it does not rebuild the week. A band that silently reshuffles
someone's plan is the algorithm-aversion failure R12 [S13] describes.
Today: trivially true.

**INV-4. No forbidden phrase renders for any band.**
State: run the L1 to L8 patterns from 3.4 over `plan/messages.ts`, `engine/insights.ts`,
`engine/review.ts`, `plan/exercises.ts`, `plan/athleticExercises.ts`, `plan/generator.ts`,
`plan/guide.ts`, `plan/debrief.ts` and every `.tsx` under `src/screens`.
Expect: zero matches for L2, L3, L4, L5, L6 and L7, with no allowlist, because none of those
patterns ship today and the test's job is to keep it that way. L1 and L8 are conditional on
band and are asserted at render rather than by regex.
Today: passes by inspection for L2 to L7. Unenforced.

**INV-5. No date of birth anywhere.**
State: grep the whole tree.
Expect: no field, type, zod schema, form input or Supabase column named or shaped like a birth
date. This is the guard that keeps section 8.6's decision from being quietly reversed.
Today: passes (7.1). This test exists to keep it passing.

---

## 10. INTEGRATION NOTES

### 10.1 Order of work

The pack splits cleanly into work that needs an owner decision first and work that does not.

**Needs the owner's decision on section 4 before any code:**

1. The minimum age, and therefore whether `child`, `adolescent` and `teen` are dead branches in
   `STAGE_DIAL` or live ones. The recommendation is 18, in which case those three bands exist
   only to make the gate's refusal typed and testable, which is worth their weight.

**Does not need a decision, and fixes real defects today for adults:**

2. **Drop the `SMALL_MUSCLE` restriction on `plateIsTooBig`** (`src/engine/reps.ts:243`). One
   line. Fixes the false-stall bug (7.5) for every light athlete at every age, and it makes the
   file consistent with the [S42] band it already cites at `reps.ts:230`. This is the highest
   value-per-line change in the pack.
3. **Make the deload respect `MIN_WORKING_SETS`** (7.8). `transforms.ts:176` uses
   `Math.max(1, ...)` where `transforms.ts:190` declares 2 to be the floor. Two code paths, one
   threshold, currently disagreeing.
4. **Correct the comment at `src/plan/sportsNutrition.ts:130-132`** (7.3) whether or not the
   field is ever added, because it is a stated factual claim that is wrong and it is the reason
   the field does not exist.

**Needs the decision, then lands in this order:**

5. `src/lifespanTypes.ts` and `src/store/lifespanSchema.ts` (8.1, 8.2). No migration, no
   `SCHEMA_VERSION` bump, by the same defaulting rule as `prefsSchema.ts:8-15`.
6. `src/plan/lifespan.ts` (8.3) plus `INV-1` and `INV-2` as table tests. The table is inert
   until something reads it, so this step is safe to land alone.
7. The age gate screen (4.4) and `confirmedAdultAt`.
8. The five questions in `src/plan/followups.ts` (5.4), which need no new mechanism.
9. The four read sites (8.4), one per commit, each with its PAIR fixtures.
10. The balance progression content in `src/plan/exercises.ts` (7.14). This is the largest item
    and the one with the strongest evidence behind it [S25][S32]. It is last because it is
    content rather than architecture, and it is the item most likely to need the owner's voice.

### 10.2 What must not change without owner review

- The minimum age, once set. It is a legal position as much as a product one.
- Any number in `STAGE_DIAL`. Every one is either HOUSE RULE or anchored on a named source in
  section 3.3, and a future session changing one without reading that section is the failure
  mode this pack is written against.
- `INV-1` and `INV-2`. They are the guards that keep the band from becoming a punishment.
- The decision in 8.6 not to store a date of birth. `INV-5` enforces it.
- The Sergeant voice for adults. Section 3.4 caps the escalation ladder for `masters2` and up
  and disables it for minor bands, and touches nothing else. R12 owns the rest of that argument.

### 10.3 Open questions this pack could not close

1. **The masters deload cadence has no direct evidence.** [S39] says the recovery question is
   confounded in nearly every study that has asked it. 1-in-3 is anchored on [S30]'s frequency
   optimum, which is a proxy. If a future session finds a real answer, `blockWeeks` is one
   column in one table.
2. **[S29] versus [S27] and [S28] on protein and age.** The meta-regression found age explained
   none of the variance in the training response to supplementation; the two geriatric position
   papers recommend higher intakes for older adults. Preserved as a `DISAGREEMENT`. The pack
   acts on the per-meal distribution claim, which the meta-analysis did not test, and does not
   raise the daily target, which the meta-analysis did test.
3. **Where `masters1` should start.** 40 is conventional and [S38] puts the measurable
   inflection in the early to mid 30s. 40 is chosen because it is the band edge people
   self-report accurately, and the dial at `masters1` is a 15 percent rate reduction, which is
   small enough that a wrong edge costs little.
4. **Whether the vertical and speed goals should be offered at all at `masters2` and up.**
   Section 3 gates the *content*; it does not gate the *goal*, because R12 puts the athlete's
   goals at tier 4 and taking a goal away is not a suggestion. The open question is what a
   `vertical` goal should build for a 68 year old who chooses it with full information.
5. **The Vivifrail per-level doses**, which R7 recorded as unverified because the PDF exceeded
   the fetch limit. Still unverified here. Any number taken from it must be re-verified before
   it enters code.
6. **Whether `unknown` should ever expire.** An athlete who declines the decade question and
   then logs for two years is still `unknown`. Arguably the observed rate from their own log is
   a better dial than any band by then, and `observedRatePerWeek` (`engine/journey.ts:279-282`)
   already computes it. Not resolved here.

### 10.4 Standing constraints this pack operates under

- **Zero runtime LLM calls.** Everything in sections 3, 8 and 9 is a table lookup, a
  multiplication or a boolean. `STAGE_DIAL` is 8 rows of 6 numbers.
- **Suggest only, never auto.** Every band-driven change is either a floor that only reduces
  (INV-2, R12 tier 1) or a proposal. The growth-window overlay is proposed once and re-offered
  under R12's budget, never re-asserted.
- **Users never pick reps.** Nothing in this pack asks an athlete to choose a rep number. The
  five questions in 5.4 are about the athlete, not about the prescription.
- **No em dashes in user-visible copy.** Checked across this whole file, including the copy
  examples in 3.4, 3.6, 4.4 and 5.4.
- **Safety failures land on the harmless side.** `unknown` withholds the deficit rather than
  granting it. The band multipliers only reduce. The age gate refuses rather than proceeds.
- **The app does not diagnose or treat.** No condition is named anywhere in the proposed copy.
  L3, L4 and L7 in 3.4 forbid the specific vocabulary this subject invites, and INV-4 enforces
  it with no allowlist.
- **Layering.** `src/lifespanTypes.ts` is rank 0. `src/plan/lifespan.ts` is rank 0, pure data,
  no `AppData` and no dates, the same discipline `plan/milestones.ts:8-12` describes for itself.
  `src/store/lifespanSchema.ts` sits beside `prefsSchema.ts`. Nothing points upward.
- **`structure.test.ts` allowances shrink only.** The proposal adds three small new files rather
  than growing `types.ts`, `schema.ts` or `generator.ts`, all three of which are already at or
  near their allowance.

---

**End of R15.** 45 sources, 10 sections, 25 eval fixtures, 20 audit findings.
