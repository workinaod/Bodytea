# R12: Trainer authority, coaching relationship, and the override model

Research job R12 for BodyT. Deterministic local-first coaching PWA, no runtime LLM, general
wellness, never diagnoses. Covers v12 section 51 (Expert Collaboration, Coaching Authority &
High-Performance Athlete Intelligence), 50.22 (User/trainer overrides & authority), 50.13,
51.9, 51.10, 54.4, and the P0 product contract "Population patterns are priors, not destiny.
Strong individual evidence, hard constraints and trainer/user authority outrank weak
population similarity."

Reads on top of `research/R3-autoregulation.md` and `research/R6-safety.md` and does not
repeat them. R3 owns: when a threshold is crossed, what the engine may propose, and the
intervention outcome ledger. R6 owns: the acute red flags and the GREEN / YELLOW / RED
tiering. R12 owns the layer none of them own: **who is allowed to decide**, what happens to a
decision after the athlete refuses it, and what the app is forbidden to claim about itself.

Access date for all sources: 2026-08-18. Researcher: Claude (session d21c12d6).
Code read at `wt-fix2` working tree, schema v20. No production code in this pack. No repo
writes outside this file.

Conventions:

- **SOURCED** = grounded in a source captured in section 1, with its tier.
- **HOUSE RULE** = a product decision, defensible but not derivable from any source. Numbers
  in the override model are HOUSE RULE unless tagged otherwise. They are stated as exact
  numbers on purpose: an adjective is not a policy.
- **DISAGREEMENT** = two sources conflict. Both are preserved, neither is silently resolved.
- No em dashes anywhere in this document, including in the user-facing copy examples.
- Every claim either carries a source tag [S#] or a `file:line` from the live tree.
- Tiers: **A** = systematic review, meta-analysis, RCT, position stand, or regulatory
  guidance. **B** = cohort, consensus statement, single controlled experiment, or validated
  instrument paper. **C** = expert opinion, narrative review, or theory paper.

**Contents.** 1 sources (S1 to S28). 2 the authority question, and why suggest-only is not
the whole answer. 3 the authority ladder (five tiers, typed). 4 the override model (decay,
generalization, re-ask budget). 5 typed schema proposal. 6 the scope-of-practice fence and
the forbidden-phrase table. 7 audit of the live code, with file and line. 8 eval fixtures
(19 cases). 9 integration notes.

**The five claims this pack makes, if nothing else is read.**

1. Suggest-only is a rule about *actions*. BodyT currently obeys it for actions and breaks it
   for *memory*: a declined suggestion is stored nowhere (`logic/fatigueActions.ts:90-103`,
   `screens/today/AdaptProposals.tsx:25-27`), so the same card is re-offered every day the
   signal persists, forever. An infinite re-ask is a coerced yes with extra steps [S27].
2. Two engines already change the plan without asking and without saying so.
   `engine/phase.ts:172-178` promotes the athlete's anchor lift to a harder movement at a
   16-week boundary, and `logic/prescription.ts:99-126` silently drops the opening weight on a
   movement flagged as failing. Neither is visible; the second computes an explanation string
   (`engine/fatigue.ts:246`) and throws it away.
3. The only opt-out from that promotion is `Prefs.pinned`, and `data.prefs` is read in four
   places and written in **zero**. The athlete-owned tier of the ladder exists in the type
   system and has no input surface anywhere in the app.
4. The accountability layer claims authority the app does not have. It demands photographic
   proof for a skip (`screens/today/SkipFlow.tsx:203-260`), escalates a drill-sergeant ladder
   over 30 days (`engine/coach.ts:74-77`), does not auto-accept `sick`
   (`engine/coach.ts:215-235`), and then accuses the athlete of lying about illness
   (`plan/messages.ts:317-319`). That is a supervisory claim, not a coaching one, and it
   is the single largest scope breach in the tree.
5. The fix is not more restraint. It is a typed `Override` record with a decay and a re-ask
   budget, plus an `AuthorityRule` table that says which decisions are the engine's, which are
   proposed, which are the athlete's outright, and which nobody may touch. Sections 3 to 5.

---

## 1. SOURCES

All accessed 2026-08-18 through this session's web search and fetch. "What was taken" is the
only thing this pack uses from each source. Nothing else in the pack is attributed to it.

| ID | Tier | Source | Where | What was taken |
|----|------|--------|-------|----------------|
| S1 | A | Teixeira PJ, Carraca EV, Markland D, Silva MN, Ryan RM. "Exercise, physical activity, and self-determination theory: a systematic review." Int J Behav Nutr Phys Act 2012;9:78 | https://pubmed.ncbi.nlm.nih.gov/22726453/ and https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3441783/ | 66 empirical studies. Autonomous forms of motivation predict exercise participation consistently. Identified regulation predicts short-term adoption more strongly; intrinsic motivation predicts long-term adherence more strongly. Autonomy support delivered by an exercise professional is the named antecedent, and it is a property of how instructions are given, not of what is instructed |
| S2 | A | Ntoumanis N, Ng JYY, Prestwich A, Quested E, Hancox JE, Thogersen-Ntoumani C, et al. "A meta-analysis of self-determination theory-informed intervention studies in the health domain: effects on motivation, health behavior, physical, and psychological health." Health Psychol Rev 2021;15(2):214-244 | https://pubmed.ncbi.nlm.nih.gov/31983293/ | 73 SDT-based interventions. Increases in **need support** and in **autonomous motivation** were associated with positive change in health behaviour, at end of intervention and at follow-up. Increases in controlled motivation and in amotivation were not. Direction matters: support is the lever, pressure is not |
| S3 | A | Deci EL, Koestner R, Ryan RM. "A meta-analytic review of experiments examining the effects of extrinsic rewards on intrinsic motivation." Psychol Bull 1999;125(6):627-668 | https://pubmed.ncbi.nlm.nih.gov/10589297/ | 128 experiments. Tangible rewards contingent on doing, completing or performing a task undermine intrinsic motivation. Deadlines, imposed goals, surveillance and directive language do the same. Offering choice and acknowledging feelings increase it. The mechanism is perceived locus of causality, so a coaching app's *tone* is a treatment variable |
| S4 | A | Stacey D, Legare F, Lewis K, Barry MJ, Bennett CL, Eden KB, et al. "Decision aids for people facing health treatment or screening decisions." Cochrane Database Syst Rev (105+ RCTs; 2017 update CD001431, further updated 2024) | https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD001431.pub5/full and https://decisionaid.ohri.ca/cochsystem.html | People given a decision aid are more knowledgeable, hold more accurate risk perceptions, and make choices better matched to their own values. Decision aids do not worsen outcomes and reduce decisional conflict. Requirement extracted: an option is only "offered" if the consequence of *both* answers is stated |
| S5 | A | Zhu S, Sinha D, Kirk M, Michalopoulou M, Hajizadeh A, Wren G, et al. "Effectiveness of behavioural interventions with motivational interviewing on physical activity outcomes in adults: systematic review and meta-analysis." BMJ 2024;386:e078713 | https://pmc.ncbi.nlm.nih.gov/articles/PMC11234249/ | 97 RCTs, 105 comparisons, 27,811 participants. Total PA SMD 0.45 (95% CI 0.33 to 0.65), about 1,323 extra steps/day. MVPA SMD 0.45 (0.19 to 0.71). Sedentary time SMD -0.58 (-1.03 to -0.14). **The caveats are the point**: no evidence of effect when MI was compared with a comparator of similar intensity, and no evidence of a benefit beyond one year or past the active intervention period. Certainty low to very low |
| S6 | A | Lundahl B, Moleni T, Burke BL, Butters R, Tollefson D, Butler C, Rollnick S. "Motivational interviewing in medical care settings: a systematic review and meta-analysis of randomized controlled trials." Patient Educ Couns 2013;93(2):157-168 | https://pubmed.ncbi.nlm.nih.gov/24001658/ | 48 RCTs. MI outperformed comparison in roughly three quarters of studies; effects small but robust, and achievable in encounters as short as 15 minutes. Extracted: the operative ingredients are eliciting the person's own reasons and rolling with resistance, not the length of the intervention |
| S7 | C | Halperin I, Wulf G, Vigotsky AD, Schoenfeld BJ, Behm DG. "Autonomy: A Missing Ingredient of a Successful Program?" Strength Cond J 2018;40(4):18-25 | https://www.ovid.com/jnls/nsca-scj/abstract/10.1519/ssc.0000000000000383 | Narrative review for S&C practitioners. Supporting the athlete's need for autonomy by permitting choices over training variables (exercise order, load selection, rest, feedback timing) improves motor learning, performance and adherence. Explicit design guidance: consider the **type**, **number** and **range** of choices offered, and the coach-athlete context. Too many choices is itself a cost |
| S8 | B | Iwatsuki T, Shih HT, Abdollahipour R, Wulf G. "Autonomy facilitates repeated maximum force productions" (Hum Mov Sci 2017;55:264-268) and Iwatsuki T, Navalta JW, Wulf G. "Autonomy enhances running efficiency" (J Sports Sci 2019;37(6):685-691) | https://gwulf.faculty.unlv.edu/wp-content/uploads/2014/05/Iwatsuki_autonomy_force_2017.pdf | Small controlled experiments with yoked controls. The *same* protocol produces higher repeated maximal force and better running economy when the participant chose a trivial parameter than when it was assigned. The effect survives when the choice is incidental to the task, which is why offering a real choice about a real variable is the conservative version |
| S9 | B | "A comparison between predetermined and self-selected approaches in resistance training: effects on power performance and psychological outcomes among elite youth athletes." PeerJ 2020;8:e10361 | https://peerj.com/articles/10361/ | Self-selected exercise order in a resistance session matched a predetermined order on power outcomes while raising perceived autonomy. Extracted: order is a safe thing to hand over. Load and volume are not the same question |
| S10 | C | Ekkekakis P. "Let them roam free? Physiological and psychological evidence for the potential of self-selected exercise intensity in public health." Sports Med 2009;39(10):857-888 | https://pubmed.ncbi.nlm.nih.gov/19827858/ | Narrative review. Left to choose, most people select an intensity near the ventilatory threshold, which is both physiologically adequate and affectively tolerable. Self-paced prescription is defensible public-health advice, not a compromise |
| S11 | B | Vazou-Ekkekakis S, Ekkekakis P. "Affective consequences of imposing the intensity of physical activity: does the loss of perceived autonomy matter?" Hellenic J Psychol 2009;6:125-144 | https://musculoskeletalkey.com/self-selected-versus-imposed-exercise-intensities/ (secondary), primary cited therein | The *same objective intensity* produced measurably worse affect when imposed by an experimenter than when chosen by the participant. The loss of control, not the workload, carried the affective cost. This is the cleanest experimental statement of why "the engine picked it" is a different product from "you picked it" |
| S12 | A | Dietvorst BJ, Simmons JP, Massey C. "Algorithm aversion: people erroneously avoid algorithms after seeing them err." J Exp Psychol Gen 2015;144(1):114-126 | https://pubmed.ncbi.nlm.nih.gov/25401381/ | Five studies. Seeing an algorithm make a single visible mistake causes people to abandon it in favour of demonstrably worse human judgement. The asymmetry is not symmetric for human advisers: humans are forgiven, algorithms are not |
| S13 | A | Dietvorst BJ, Simmons JP, Massey C. "Overcoming algorithm aversion: people will use imperfect algorithms if they can (even slightly) modify them." Manage Sci 2018;64(3):1155-1170 | https://pubsonline.informs.org/doi/10.1287/mnsc.2016.2643 and https://faculty.wharton.upenn.edu/wp-content/uploads/2016/08/Dietvorst-Simmons-Massey-2018.pdf | People are substantially more willing to use an imperfect algorithm when they can modify its output, and they end up **more accurate** as a result. The effect holds even when the permitted modification is severely restricted (studies 1 to 3). This is the single most load-bearing source in this pack: the override is not a concession to the athlete, it is the mechanism that keeps the engine in use at all |
| S14 | A | Logg JM, Minson JA, Moore DA. "Algorithm appreciation: people prefer algorithmic to human judgment." Organ Behav Hum Decis Process 2019;151:90-103 | https://www.sciencedirect.com/science/article/abs/pii/S0749597818303388 | Lay judges weight algorithmic advice *more* heavily than advice from other people; experts in the task discount it. **DISAGREEMENT with S12**, preserved: aversion and appreciation both replicate, and the moderator that matters here is expertise. A novice over-trusts the engine and a competent lifter under-trusts it, so the authority ladder has to be different for the two |
| S15 | A | Parasuraman R, Manzey DH. "Complacency and bias in human use of automation: an attentional integration." Hum Factors 2010;52(3):381-410 | https://pubmed.ncbi.nlm.nih.gov/20942251/ | Automation bias produces omission errors (missing what the system did not flag) and commission errors (acting on what it wrongly flagged). Both rise when the system acts rather than advises, because monitoring attention is withdrawn. The safety argument against silent auto-apply is not only about consent |
| S16 | A | Nahum-Shani I, Smith SN, Spring BJ, Collins LM, Witkiewitz K, Tewari A, Murphy SA. "Just-in-Time Adaptive Interventions (JITAIs) in Mobile Health: Key Components and Design Principles for Ongoing Health Behavior Support." Ann Behav Med 2018;52(6):446-462 | https://academic.oup.com/abm/article/52/6/446/4733473 | The five components: decision points, tailoring variables, intervention options, decision rules, proximal outcomes. The component this pack takes is **receptivity**: a person's state limits how much support they can absorb, and delivering support outside receptivity produces burden, habituation and disengagement. A re-ask budget is a receptivity constraint, not politeness |
| S17 | B | Saw AE, Main LC, Gastin PB. "Monitoring athletes through self-report: factors influencing implementation." J Sports Sci Med 2015;14(1):137-146 | https://pmc.ncbi.nlm.nih.gov/articles/PMC4306765/ | Whether athlete self-report data is honest depends on buy-in, reinforcement and perceived value; measure design and social environment dominate. Extracted: an app that acts punitively on a self-report teaches the athlete to stop self-reporting accurately |
| S18 | A | Saw AE, Main LC, Gastin PB. "Monitoring the athlete training response: subjective self-reported measures trump commonly used objective measures: a systematic review." Br J Sports Med 2016;50(5):281-291 | https://pubmed.ncbi.nlm.nih.gov/26423706/ | Subjective wellness measures track acute and chronic load with greater sensitivity and consistency than common objective measures. The athlete's own report is the best available signal, which makes it the thing the engine must not overrule and must not corrupt |
| S19 | B | Neupert EC, Cotterill ST, Jobson SA. "Training-Monitoring Engagement: An Evidence-Based Approach in Elite Sport." Int J Sports Physiol Perform 2019;14(1):99-104 | https://journals.humankinetics.com/view/journals/ijspp/14/1/article-p99.xml | Disproportionate programme changes driven by small monitoring signals, and monitoring that returns no usable feedback, both reduce athlete engagement and degrade reporting quality. Two design rules fall straight out: proportionality, and never collect a signal that changes nothing |
| S20 | B | Bourdon PC, Cardinale M, Murray A, Gastin P, Kellmann M, Varley MC, et al. "Monitoring Athlete Training Loads: Consensus Statement." Int J Sports Physiol Perform 2017;12(S2):S2-161 to S2-170 | https://journals.humankinetics.com/view/journals/ijspp/12/s2/article-pS2-161.pdf | Internal versus external load framework; simple measures beat elaborate ones; monitoring is only worth doing when it changes a decision. The last clause is the acceptance test for every signal in `engine/adapt.ts` |
| S21 | C | Jowett S. "Coaching effectiveness: the coach-athlete relationship at its heart." Curr Opin Psychol 2017;16:154-158; with Jowett S, Ntoumanis N. "The Coach-Athlete Relationship Questionnaire (CART-Q): development and initial validation." Scand J Med Sci Sports 2004;14(4):245-257 | https://www.sciencedirect.com/science/article/abs/pii/S1469029225001086 (25-year review) | The 3+1Cs: closeness (affect), commitment (cognition), complementarity (co-operative behaviour), and **co-orientation**, the degree to which coach and athlete actually share the same picture of the relationship. Co-orientation is the construct an override ledger operationalises: the engine's model of the athlete and the athlete's model of themselves must not silently diverge |
| S22 | B | Szedlak C, Smith MJ, Day MC, Greenlees IA. "Effective behaviours of strength and conditioning coaches as perceived by athletes." Int J Sports Sci Coach 2015;10(5):967-984 | https://www.researchgate.net/publication/329537894 | Three dimensions from athlete interviews: relationship-enhancing behaviours, coaches' actions, coaches' values. Trust, respect, authenticity and role modelling rank alongside technical competence. Athletes do not separate "was the programme right" from "was I treated like an adult" |
| S23 | B | Weldon A, Duncan MJ, Turner A, Sampaio J, Noon M, Wong D, Lai VW. "Practices of strength and conditioning coaches in professional sports: a systematic review." Biol Sport 2022;39(3):715-726 | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9331342/ | 8 studies, 318 professional S&C coaches. Periodisation used by 89%; in-season volume consistently reduced; large practice heterogeneity across sports. Extracted: there is no single defensible programme for a given athlete, which is why the engine's confidence in its own recommendation must be bounded |
| S24 | A | Riebe D, Franklin BA, Thompson PD, Garber CE, Whitfield GP, Magal M, Pescatello LS. "Updating ACSM's Recommendations for Exercise Preparticipation Health Screening." Med Sci Sports Exerc 2015;47(11):2473-2479 | https://pubmed.ncbi.nlm.nih.gov/26473759/ | The screening algorithm keys on current activity level, known cardiovascular / metabolic / renal disease, and signs or symptoms. Its output is a **referral decision**, never a diagnosis, and never a clearance the screener issues themselves. This is the shape of every safety gate BodyT is permitted to build |
| S25 | A | US Food and Drug Administration. "General Wellness: Policy for Low Risk Devices" (guidance issued 27 September 2019; revised guidance issued 6 January 2026) | https://www.fda.gov/media/90652/download | Enforcement discretion applies where a product has a general wellness intended use (promoting a healthy lifestyle, improving fitness, endurance, strength) **and** presents low risk. Claims relating to diagnosis, cure, mitigation, treatment or prevention of a specific disease move the product outside the policy. This is the regulatory boundary the forbidden-phrase table in section 6 encodes |
| S26 | A | NSCA-CPT Job Task Analysis / scope statement; with ACE Personal Trainer Manual 5th ed., ch 1, "Role and Scope of Practice for the Personal Trainer" | https://www.nsca.com/globalassets/certification/certification-pdfs/nsca-certified-personal-trainer-job-task-analysis-summary-2025 and https://www.acefitness.org/academy/AcademyElitePDFs/ACE_PT5th_Manual_Ch1.pdf | The professional fence, stated by the bodies that certify the profession BodyT imitates: a trainer does **not** diagnose, does **not** prescribe diets or supplements, does **not** treat injury or disease, does **not** rehabilitate, does **not** counsel. A trainer educates from peer-reviewed general information and refers out. Recognising signs and symptoms in order to refer is inside scope; naming the condition is not |
| S27 | C | Brehm JW. "A Theory of Psychological Reactance" (1966); with Steindl C, Jonas E, Sittenthaler S, Traut-Mattausch E, Greenberg J. "Understanding Psychological Reactance: New Developments and Findings." Z Psychol 2015;223(4):205-214 | https://pmc.ncbi.nlm.nih.gov/articles/PMC4675534/ | A perceived threat to a behavioural freedom produces motivated resistance, and the threatened option becomes *more* attractive. Repetition of a request after refusal is a freedom threat. This is the mechanism behind the re-ask budget in section 4, and the reason an unlimited re-ask is worse than a single ask |
| S28 | B | Westenhoefer J, Stunkard AJ, Pudel V. "Validation of the flexible and rigid control dimensions of dietary restraint." Int J Eat Disord 1999;26(1):53-64 | https://onlinelibrary.wiley.com/doi/pdf/10.1002/(SICI)1098-108X(199907)26:1%3C53::AID-EAT7%3E3.0.CO;2-N | Rigid, all-or-nothing control associates with higher disinhibition, higher BMI and more frequent binge episodes. Flexible control associates with the opposite and with successful weight reduction. Transferred by analogy only, and labelled as such: the evidence that a rigid prescription is worse for adherence than a flexible one comes from eating, not from training |

**What no source says.** No source in this list gives a number for how long an override should
be remembered, how many times a suggestion may be repeated, or when an engine should stop
asking. Section 4's numbers are HOUSE RULE. They are written as exact integers so that a
future session can argue with them, which is not possible with "occasionally" or "not too
often".

---

## 2. THE AUTHORITY QUESTION, AND WHY SUGGEST-ONLY IS NOT THE WHOLE ANSWER

"Suggest only, never auto" is a rule about **actions**. It says the engine may not change the
plan without a tap. It is correct, it is non-negotiable, and it is already obeyed for most of
what `engine/adapt.ts` produces. It is also incomplete in four ways that this pack exists to
close.

**One. A suggestion repeated without limit is not a suggestion.** Reactance theory [S27] is
explicit: a repeated request after a refusal reads as a threat to the freedom to refuse, and
the threatened option becomes *less* attractive, not more. BodyT's proposals are re-derived
from a rolling 14-day signal window every time the day resolves
(`screens/today/AdaptProposals.tsx:34-41`, `engine/adapt.ts:115-219`) and declines are stored
nowhere by design (`logic/fatigueActions.ts:93-96`). Three bad nights in a fortnight therefore
means the same card, every day, for up to fourteen days. That is not suggest-only, it is
attrition. The JITAI receptivity component [S16] names the same failure from the other
direction: support delivered outside a person's receptivity state produces burden and
habituation, and habituation is permanent.

**Two. Silence is a stronger claim than a suggestion, not a weaker one.** Two engines change
the plan today with no tap and no sentence: the anchor-lift promotion at
`engine/phase.ts:172-178`, and the failing-movement load softening at
`logic/prescription.ts:99-126`. Both are defensible programming. Neither is visible. The
automation-bias literature [S15] gives the safety argument rather than the courtesy one: when
a system acts instead of advising, monitoring attention is withdrawn, and both omission and
commission errors rise. BodyT's own comments already say this in three separate files
(`engine/sessionFatigue.ts:43`, `engine/calibration.ts:283-284`, `engine/adapt.ts:247`) and
two engines do not obey it.

**Three. The engine's job is to be *modifiable*, not to be right.** This is the finding that
should shape the product more than any other in the pack. Dietvorst et al. [S13] show that
people will use an imperfect algorithm, and end up more accurate, when they can adjust its
output, and that the effect survives when the permitted adjustment is severely restricted. The
same authors [S12] show that a single visible error causes abandonment of an algorithm that is
still better than the human. Put together: an override is not a leak in the engine's authority,
it is the mechanism that keeps the athlete using the engine after it is first wrong. BodyT's
current override surfaces are one-shot and per-date (`data.swaps` keyed by ISO date,
`types.ts:571-575`; `data.adapt` keyed by ISO date, `types.ts:583-597`). They expire at
midnight, which is exactly the restricted-modification case the paper says works, minus the
memory that makes it work twice.

**Four. Expertise flips the failure mode.** [S14] finds lay judges over-weight algorithmic
advice while domain experts discount it, and [S12] finds the reverse in other settings. Held
together, the moderator is competence at the task. A first-week beginner will accept whatever
BodyT says, including when it is wrong, so the beginner needs the engine to be conservative and
to *ask*. A competent lifter will discount BodyT even when it is right, so the competent lifter
needs the engine to state its evidence once, accept the refusal, and shut up. A single global
politeness setting cannot serve both. This is v12 section 51.1's operating modes arriving from
the psychology literature rather than from product taste.

**What the authority ladder is for.** Not to make BodyT quieter. To make each decision land in
exactly one of five places, so that "who decides this" is answerable by reading a table rather
than by reading five engines and inferring. The current answer is only inferable, and section 7
shows four places where the inference comes out wrong.

**One thing that is already right, and must not be lost.** `engine/calibration.ts` is the
correct pattern in miniature and it should be the template for everything below.
The athlete's own answer wins outright wherever they gave one (`calibration.ts:263-279`,
"it is not a guess to be improved on, it is the ground truth everything else is trying to
predict"), the learned adjustment is bounded (`MAX_DRIFT = 0.5`, `calibration.ts:66`), the
learning needs a sample floor before it speaks at all (`MIN_ACTIVITY_SAMPLES = 4`,
`MIN_BIAS_SAMPLES = 3`, `calibration.ts:53-56`), and the adjustment always says what it did
(`calibrationNote`, `calibration.ts:286-296`). Owner's report [S18] outranks the model's
inference, the model is bounded, the model explains itself. Every rule in section 3 is that
pattern generalised.

---

## 3. THE AUTHORITY LADDER

Five tiers. Every decision the app can make belongs to exactly one. The tier is a property of
the **decision**, not of the athlete, except where the table says otherwise.

| Tier | Name | Who decides | Athlete can undo | Engine may re-raise |
|------|------|-------------|------------------|---------------------|
| 0 | `never-touched` | Nobody. Out of scope, permanently | n/a | Never |
| 1 | `engine-floor` | Engine alone, silently allowed to act, always announced | No, but can be widened by a stated preference where the table says so | n/a |
| 2 | `engine-acts-says` | Engine acts because inaction hands over an impossible session, and says so in the same breath | Yes, one tap, same screen | Only if the underlying fact changes |
| 3 | `proposed` | Engine proposes, athlete confirms. Nothing changes on a decline | n/a (nothing happened) | Under the section 4 budget, and no further |
| 4 | `athlete-owned` | Athlete alone. Engine may state evidence once and then must stop | n/a | Only on the athlete's own re-open, or a tier-1 safety fact |

### 3.1 Tier 0: never touched

Permanently out of scope. Not a setting, not a mode, not gated behind a disclaimer. Any code
path that would produce one of these is a bug, and section 6 gives the phrase-level fence.

- Naming, confirming, ruling out or staging a medical condition [S26, S25].
- Advising on medication, dose, timing or interaction.
- Telling the athlete whether to seek, delay or stop clinical care. BodyT may say "that is
  worth asking a professional about" and must never say "you do not need to".
- Deciding whether an athlete trains today at all. The decision to train, skip, shorten or
  stop is tier 4 in every case and is never gated, never scored, and never priced.
- Any claim that the app knows the athlete's tissue state, healing, or injury cause.
- Body-composition or weight *targets* set by the engine without the athlete stating one.
- Interpreting a wearable readiness score as a physiological fact [S20]: it is one signal.

### 3.2 Tier 1: engine floors

Hard limits the athlete cannot lower by preference, because lowering them is what the floor
exists to prevent. Every one of these is already in the tree and every one is defensible. What
they share: they only ever make a day **smaller or lighter**, never larger, and they announce
themselves.

| Floor | Where it lives now | What it protects |
|---|---|---|
| Per-muscle session volume ceiling | `engine/volume.ts` via `trimToFit`, called at `engine/resolveDay.ts:459` | A day that totals more than the muscle can use. Cuts from the bottom of the ordered day only |
| Minimum sets after a cut | `MIN_SETS_AFTER_CUT = 2`, `engine/adapt.ts:589` | A "reduction" that leaves a movement training nothing |
| Load floor under repeated back-off | `engine/prescription.ts` floor at `logic/prescription.ts:122-126` and `162` | The documented spiral: an honest run of bad weeks walking a lift to 0 lb |
| Calorie floor | `plan/kcalFloor.ts` `MIN_KCAL_REST` / `MIN_KCAL_TRAINING` | An engine-generated intake below the number a clinician would blink at |
| Stated limitation routing | `engine/adapt.ts:365-386` | A joint the athlete has told the app about, which does not expire |
| Blocked movement exclusion | `engine/adapt.ts:297-309` | A movement the athlete said to keep out |

Two rules govern the tier.

**1-A. A floor may only ever reduce.** No floor may add sets, add load, add a session, or add a
calorie target. This is already the stated contract of `engine/adapt.ts:50-54` ("it never
invents work") and it should be a test, not a comment.

**1-B. A floor must be widenable in the safe direction only.** A stated limitation makes the
plan *more* conservative and needs no confirmation. Nothing in tier 1 may be relaxed by a
preference setting, which is v12 54.4's "no preference setting disables hard safety
constraints" restated at the code level.

### 3.3 Tier 2: engine acts and says so, in the same breath

The narrow set where doing nothing hands the athlete a session they cannot perform. Making
these a prompt is, in `engine/adapt.ts`'s own words at lines 36-41, "asking somebody to fix the
app's homework mid-session". Four members, and the list is closed:

1. **Equipment gap.** No barbell in the room, barbell movement in the plan.
   `engine/adapt.ts:311-325`.
2. **Blocked movement.** The athlete already said no to this one; asking again is the app
   forgetting. `engine/adapt.ts:293-309`.
3. **Flagged or stated joint with a viable substitute.** `engine/adapt.ts:327-344`.
4. **Mid-set load drop when the set just failed short.** `engine/sessionFatigue.ts:47-54`,
   applied at `logic/fatigueActions.ts:124-153`. The weight is wrong *now*; the arithmetic is
   not the athlete's job mid-set.

Each carries three obligations, and the fourth is the one the tree is missing.

- **2-A. It says what it did, in the athlete's terms.** All four do.
- **2-B. It is one tap to undo.** Members 1 to 3 are not undoable today (section 7.4). Member 4
  is, at `logic/fatigueActions.ts:156-158`.
- **2-C. It does not change the dose at the same time as the movement.**
  `engine/adapt.ts:476-480` already states this and honours it.
- **2-D (missing). An undo is an override and is remembered.** Section 4.

**Why the list must stay closed.** Every addition to tier 2 is a decision moved out of the
athlete's hands. The test for admission is not "would this be helpful" but "does inaction
produce a session that cannot be performed". Fatigue, sleep, soreness, adherence and
accumulated load all fail that test: the session can be performed, it is merely arguable
whether it should be. Those are tier 3.

### 3.4 Tier 3: proposed and confirmed

Everything inferred from the athlete's recent history rather than stated by them. The engine
computes it, shows it with its evidence, and does nothing until a tap. Current members, all
from `engine/adapt.ts:395-445`:

| Proposal | Trigger | Evidence shown |
|---|---|---|
| `reduce-volume` (one set off each lift) | poor sleep, accumulated fatigue, or unplanned load | The `Signal.detail` sentence that produced it |
| `hold-load` (do not chase a number today) | accumulated fatigue, or short sleep plus unplanned load, or a return after misses | Same |
| `reduce-load` on an unroutable flagged joint | 2+ pain flags on a joint with no sparing substitute | Same, plus the two-week physio referral line |

Obligations:

- **3-A. Both answers are stated.** [S4]: an option is only offered when the consequence of
  *both* answers is visible. "A set off each lift, same weight on the bar" states one side.
  What running it as planned costs is not stated anywhere, and should be.
- **3-B. A decline is recorded.** Section 4. This is the single largest gap in the tree.
- **3-C. A decline costs nothing.** No streak penalty, no ledger entry, no escalation, no
  change of tone. `screens/today/AdaptProposals.tsx:25-27` gets this right today and it must
  survive the addition of 3-B: *recorded* is not *counted against*.
- **3-D. Proportionality.** [S19]: a large programme change from a small signal reduces
  engagement and degrades reporting honesty. One set off per lift is proportionate to two bad
  nights. Cancelling a session would not be.
- **3-E. At most two proposals on screen at once.** [S7] names the number of choices as a
  design variable with a real cost. `engine/adapt.ts:434-436` already reasons this way for the
  hold-load card.

### 3.5 Tier 4: the athlete's alone

The engine may state its evidence, once, and then it is finished. There is no confirm step
because there is nothing for the app to confirm.

| Decision | Engine's only permitted move |
|---|---|
| Whether to train today, and for how long | Show the plan. Offer a smaller version. Say nothing about the choice afterwards |
| Whether to stop mid-session | State what is saved either way (`engine/quit.ts:52-78` does this correctly) |
| Whether a movement is out, permanently | Record it in `Prefs.blocked` and route around it |
| Whether a lift is pinned and never promoted | Record it in `Prefs.pinned` and never promote it |
| What their limitations are | Record in `Prefs.limitations`, no expiry (`prefsTypes.ts:43-54`) |
| How hard a session felt | `calibration.ts:263-279`. Their answer is ground truth [S18] |
| Whether to log a reason for a skip, and what it says | Accept whatever is typed, or nothing |
| Body goals and targets | Ask once; never re-derive against their stated one |
| Whether to share, export or delete their own data | Their call, always |

**4-A. Tier 4 is never gated.** Not behind a photo, not behind a typed confirmation word, not
behind an escalating message ladder. Section 7.6 shows all three shipping today.

**4-B. Tier 4 decisions do not feed a compliance score.** [S17] is direct: punitive handling of
a self-report teaches the athlete to stop self-reporting accurately, and the self-report is the
best signal the app has [S18]. An app that scores excuses is an app whose excuse data is
worthless within a month.

**4-C. `Prefs` must have a writer.** Four of the nine rows above resolve to `data.prefs`, which
is read at `engine/adapt.ts:562-563`, `engine/phase.ts:163` and `engine/resolveDay.ts:459`, and
written nowhere in the tree. See 7.3.

### 3.6 The escalation path when a suggestion is repeatedly declined

The literature does not give a ladder, so this is HOUSE RULE, built to be argued with. The
principle it encodes is from [S27] and [S16]: after a refusal, each further ask costs more than
it can return, so the ladder terminates rather than escalating.

Let `n` be the number of times this proposal kind has been declined for this scope inside the
active override window (section 4).

- **n = 1.** Nothing happens. One decline is a Tuesday, not a preference. The proposal may be
  re-raised the next time the trigger fires, subject to the cooldown in 4.3.
- **n = 2.** The proposal is suppressed for `SUPPRESS_DAYS = 21` from the second decline. No
  card, no banner, no coach line. The signal keeps being computed; it just stops speaking.
- **n = 3.** The proposal kind is retired for this scope until the athlete re-opens it. The
  engine writes one `Override` with `standing: true` and never raises this kind for this scope
  again on its own.
- **At n = 3 only, one question is permitted, once.** Not a re-ask of the proposal: a question
  about the *model*. Phrased as an offer to stop, never as an appeal. Example copy, tier 3
  register: "You have run it as planned every time I have offered a lighter day. Want me to
  stop offering?" with answers "Yes, stop" and "No, keep offering". "Yes" writes the standing
  override. "No" resets `n` to 0 and restarts the ladder. Nothing else is asked.
- **Never at any n:** a fourth ask, a differently-worded version of the same ask, a coach
  message about the decline, a streak or score effect, or a change of tone.

**The one exception, and its exact boundary.** A tier-1 safety fact that was not true at the
time of the override resets the ladder for that scope. "Not true at the time" is doing all the
work: a *new* joint flagged for the first time, a *newly stated* limitation, an equipment set
that changed. A stronger version of the same signal does not qualify. Four bad nights instead
of two is not a new fact, it is the same fact louder, and re-asking on it is precisely the
attrition the ladder exists to stop. This boundary must be a typed predicate, not a judgement
call at the call site: see `resetsOverride` in section 5.

### 3.7 Mode: how the ladder shifts with demonstrated competence

v12 51.1 asks for operating modes. [S14] gives the reason they are needed rather than nice.
Three modes, inferred rather than picked, because a mode picker is a question about the app
instead of about training.

| Mode | Inferred from | What changes |
|---|---|---|
| `led` | Under 12 logged sessions, or `plan.experience === 'new'` | Tier 3 proposals are raised at the full cooldown. Explanations carry the reasoning. Ladder as written |
| `collaborative` | 12 or more logged sessions and at least one override on record | Default. Ladder as written |
| `analysis` | Athlete has set 2 or more pins, or has declined 3 or more distinct proposal kinds to standing | Tier 3 becomes state-once-and-stop: the card is shown a single time per trigger episode, `SUPPRESS_DAYS` doubles to 42, and the n=3 question is skipped in favour of writing the standing override directly |

Nothing about tier 0, 1, 2 or 4 changes with mode. Only the volume of tier-3 speech does. A
mode is a speaking-rate setting, never a permission grant.

---

## 4. THE OVERRIDE MODEL

An override is what the athlete did instead of what the engine said. Today BodyT keeps exactly
one kind (`data.adapt[date]`, the accepted proposals, `types.ts:583-597`) and it keeps only the
**yes**. The no is thrown away on purpose and the reasoning is written down twice
(`logic/fatigueActions.ts:93-96`, `screens/today/AdaptProposals.tsx:25-27`): a declined
proposal must not quietly shape next week.

That reasoning is half right and the half that is wrong is expensive. A decline must not shape
the **plan**. It absolutely must shape the **asking**, because the alternative is asking
forever [S27], and because the modifiability of the engine is what keeps it in use at all
[S13]. This section separates those two things and gives every number.

### 4.1 What is recorded, and what it is allowed to touch

An override records the *interaction*, never a new prescription. Concretely:

- It may suppress a future ask. Always.
- It may change the engine's confidence in a proposal kind for this athlete. Never below the
  floor at which a tier-1 fact still speaks.
- It may **never** change the plan, the load, the volume, the rep target, the schedule, or any
  population prior. Nothing downstream of `resolveDay` reads an override except the code that
  decides whether to raise a card.

That last line is the invariant the current design is protecting, and it survives intact. The
test is in section 8 as fixture INV-1: replaying a history with and without a full override
ledger must produce byte-identical resolved days.

### 4.2 The five scopes

An override is scoped. The scope decides what else it silences, and it is the only place
generalisation is permitted.

| Scope | Written as | Generalises to |
|---|---|---|
| `session` | one date | Nothing. Expires at midnight |
| `exercise` | one exercise id | That movement only |
| `pattern` | a `MovementPattern` from `plan/movement.ts` | Every movement in the pattern, for `substitute` overrides only |
| `joint` | a `Joint` | Every movement whose `MOVEMENT[id].stress` includes it, for `reduce-load` and `substitute` only |
| `global` | the proposal kind itself | Every instance of that kind |

**Generalisation rules, and they are deliberately narrow.**

- **G-1. A decline never generalises. A preference does.** Declining today's lighter-day card
  says nothing about tomorrow's. Saying "keep this movement out" says something about every
  future day. The first writes scope `session`, the second writes scope `exercise`.
- **G-2. `pattern` and `joint` are reachable only by explicit widening.** The engine may
  *offer* to widen ("Keep overhead pressing out of the plan generally, or just today?") and may
  never widen on its own. The offer is made at most once per exercise, on the second override
  of the same exercise.
- **G-3. `global` is reachable only through the n=3 question in 3.6.** No accumulation of
  narrower overrides ever adds up to a global one. This is v12 51.11's "never automatically
  convert one coach's preference into a universal rule", applied to the athlete themselves.
- **G-4. Generalisation never crosses the safety direction.** An override that makes the plan
  *safer* (a limitation, a block, a pin) generalises freely and never expires. An override that
  makes the plan *harder or larger* generalises to nothing and carries the shortest decay in
  the table. There is no symmetry here and there should not be.

### 4.3 The numbers

All HOUSE RULE. All exported constants so a test can name them.

```
OVERRIDE_TTL_DAYS       session scope           1     expires at the date it was written for
OVERRIDE_TTL_DAYS       exercise scope         90     from last reinforcement
OVERRIDE_TTL_DAYS       pattern scope          90     from last reinforcement
OVERRIDE_TTL_DAYS       joint scope           none    stated limitations do not expire
OVERRIDE_TTL_DAYS       global scope          none    standing until the athlete re-opens it

DECLINE_COOLDOWN_DAYS                           3     minimum days between two asks of the
                                                      same proposal kind in the same scope
DECLINES_TO_SUPPRESS                            2     n at which the 21-day silence starts
SUPPRESS_DAYS                                  21     silence after the second decline
                                                      (42 in `analysis` mode, section 3.7)
DECLINES_TO_RETIRE                              3     n at which the kind is retired for scope
REOPEN_QUESTION_MAX                             1     lifetime asks of the "want me to stop?"
                                                      question, per proposal kind per scope
REINFORCE_EXTENDS_DAYS                         90     a repeat of the same override resets TTL
CONFIDENCE_FLOOR                              0.35    an override may not push a kind's
                                                      confidence below this; tier-1 facts are
                                                      unaffected by confidence entirely
```

**Why 3 days for `DECLINE_COOLDOWN_DAYS`.** The proposals that can repeat are driven by the
14-day signal window (`SIGNAL_WINDOW_DAYS = 14`, `engine/adapt.ts:73`) and the 3-day sleep
window (`engine/adapt.ts:162`). A 3-day cooldown means at most 5 asks across a full 14-day
signal episode before the ladder in 3.6 terminates it at 2. In practice the athlete sees the
card at most twice per episode. Compare with today: up to 14 times.

**Why 21 days for `SUPPRESS_DAYS`.** It is longer than the longest signal window (14) so that
the suppression outlives the episode that caused it, and shorter than a training block (4
weeks) so that a genuinely new block gets a fresh conversation. It is the same order as the
insight cooldowns already shipping (`cooldownDays` 7 to 21, `engine/insights.ts:62-480`), which
is the closest thing the tree has to a precedent.

**Why 90 days for `exercise` and `pattern`.** Long enough that "I do not want to do this" does
not have to be re-said every month, which is the complaint `prefsTypes.ts:11-20` was written to
answer. Short enough that a preference formed around a temporary situation (a gym without a
rack, a busy quarter) does not become permanent by silence. Reinforcement resets it, so a
standing dislike costs one tap every three months at worst, and zero taps if it is ever
re-expressed naturally.

**Why `joint` and `global` never expire.** `prefsTypes.ts:43-54` already states the rule for
limitations, and it is the right one: a limitation the athlete typed in stays until they take
it out. A global retirement is the athlete having answered a direct question about whether the
app should keep asking. Both are statements about the person, not about a fortnight.

**Why `CONFIDENCE_FLOOR = 0.35`.** An override is evidence, not proof [S13 gives the mechanism:
people modify algorithms and improve, which means their modifications carry signal, not that
they are correct]. A kind whose confidence has been driven to the floor still fires when a
tier-1 fact demands it. Without a floor, three declines could silence a proposal that later
becomes the correct one for a genuinely different reason, and the athlete would have removed a
capability they meant to postpone.

### 4.4 Decay, precisely

Decay is on the **TTL**, not on the strength. An override is fully in force until it expires
and then it is gone. No half-life, no fading weight.

This is deliberate and it is a disagreement with the obvious design. A decaying weight is
easier to justify statistically and impossible to explain to an athlete: "the app half
remembers that you said no" has no honest sentence. The whole point of `calibration.ts`'s
approach [and of S21's co-orientation] is that the athlete's model of the app and the app's
model of the athlete stay the same model. A binary, dated record can be shown on a screen and
read back in one sentence. A decayed float cannot.

Reinforcement is likewise binary: any repeat of the same override, in the same scope, resets
`expiresAt` to `now + REINFORCE_EXTENDS_DAYS`. It does not stack, it does not compound, and
five repeats do not buy 450 days.

### 4.5 The re-ask policy, stated as an algorithm

```
mayAsk(kind, scope, today, ledger) ->
  1. if a `standing` override exists for (kind, scope)                -> NO, forever
  2. if declines(kind, scope, active window) >= DECLINES_TO_RETIRE    -> NO, forever
  3. if lastDecline(kind, scope) within SUPPRESS_DAYS
     and declines >= DECLINES_TO_SUPPRESS                             -> NO, until it lapses
  4. if lastAsk(kind, scope) within DECLINE_COOLDOWN_DAYS             -> NO, today
  5. if a tier-1 fact newly true since lastDecline (resetsOverride)   -> YES, and reset n to 0
  6. otherwise                                                        -> YES
```

Step 5 sits below steps 1 to 4 on purpose in the sense that it can only *unblock*, never
override a `standing` record. A standing override is the athlete having answered the direct
question in 3.6. A new fact does not un-answer it; it justifies a tier-2 action if the fact is
strong enough to belong in tier 2, and silence otherwise.

### 4.6 What an override must never become

- **Never a score.** Not a compliance percentage, not a "suggestions taken" stat, not a badge.
  [S17]: the moment a self-report is scored, the self-report stops being honest.
- **Never an input to the plan generator.** The generator reads goals, equipment, time and
  constraints. It does not read how agreeable the athlete has been.
- **Never a reason to change tone.** No "since you never take my advice" line exists or may
  exist. Coach copy is selected by situation, not by override history.
- **Never shared or synced as a judgement.** The record travels with the athlete's data
  (`cloud/sync.ts`) as a fact, and renders in the app as a list they can edit and delete.
- **Never a lock the athlete cannot open.** Every override, including `standing` ones, appears
  in one list with a delete control. The list is the only correct place for the coming Prefs
  screen (7.3) to live: what the athlete has told the app, and what the app has stopped saying
  because of it, are the same screen.

---

## 5. TYPED SCHEMA PROPOSAL

Two new files and three small edits. Nothing here is production code; it is the shape a future
job should implement. Layering respected throughout (`src/structure.test.ts:152-168`: plan and
engine are rank 0 and 1, logic is rank 2, screens rank 3, and imports only point down).

### 5.1 `src/authorityTypes.ts` (new, rank 0, beside `prefsTypes.ts`)

`types.ts` is at its 696-line allowance (`src/structure.test.ts:70`), so these shapes live in
their own file and are re-exported from `types.ts` by one line, the same arrangement
`prefsTypes.ts`, `journeyTypes.ts`, `foodTypes.ts` and `sessionTypes.ts` already use.

```ts
import type { ISODate } from './types'
import type { Joint, MovementPattern } from './plan/movement'

/** Which of the five tiers in R12 section 3 a decision sits in. */
export type AuthorityTier =
  | 'never-touched'   // tier 0: out of scope, permanently
  | 'engine-floor'    // tier 1: engine acts, cannot be relaxed by preference
  | 'engine-acts'     // tier 2: engine acts because inaction is unusable, and says so
  | 'proposed'        // tier 3: engine proposes, athlete confirms
  | 'athlete-owned'   // tier 4: athlete alone

/**
 * Everything the engine can decide, named once.
 *
 * Deliberately a closed union rather than a string: the whole point of the
 * ladder is that a new decision cannot be added without landing in a tier,
 * and a compiler is the only thing that enforces that reliably.
 */
export type DecisionKind =
  // tier 1
  | 'volume-ceiling' | 'min-sets-floor' | 'load-floor' | 'kcal-floor'
  | 'limitation-routing' | 'blocked-exclusion'
  // tier 2
  | 'substitute-equipment' | 'substitute-blocked' | 'substitute-joint' | 'mid-set-load-drop'
  // tier 3
  | 'reduce-volume' | 'hold-load' | 'reduce-load' | 'anchor-promotion'
  | 'start-lighter' | 'schedule-change' | 'tier-change'
  // tier 4
  | 'train-today' | 'stop-session' | 'block-exercise' | 'pin-lift'
  | 'state-limitation' | 'session-feel' | 'body-goal' | 'skip-reason'

/**
 * One row of the ladder. A table, not a branch: R12 section 3 in a form
 * the engine reads rather than a shape the engine reimplements.
 */
export interface AuthorityRule {
  kind: DecisionKind
  tier: AuthorityTier
  /** Tier 2 only. Why inaction hands over an unusable session. */
  actsBecause?: string
  /** Tier 2 and 3. The scope an override written against this kind takes. */
  overrideScope: OverrideScope
  /** Tier 3. May not be raised again inside this many days. */
  cooldownDays?: number
  /** Tier 1. True for every floor: a floor may only ever reduce. */
  reducesOnly?: boolean
  /** Tier 3 and 4. Copy register, so the wrong voice cannot reach the wrong tier. */
  voice: 'plain' | 'coach'
}

export type OverrideScope = 'session' | 'exercise' | 'pattern' | 'joint' | 'global'

/** The target an override is scoped to. Discriminated so it cannot be misread. */
export type OverrideTarget =
  | { scope: 'session'; date: ISODate }
  | { scope: 'exercise'; exerciseId: string }
  | { scope: 'pattern'; pattern: MovementPattern }
  | { scope: 'joint'; joint: Joint }
  | { scope: 'global' }

/**
 * What the athlete did instead of what the engine said.
 *
 * Records the INTERACTION, never a prescription. Nothing downstream of
 * resolveDay reads one of these except the code deciding whether to speak.
 * See R12 section 4.1 and the INV-1 fixture.
 */
export interface Override {
  id: string
  kind: DecisionKind
  target: OverrideTarget
  /** 'declined' = said no to an offer. 'undid' = reversed a tier-2 action. */
  verb: 'declined' | 'undid' | 'stated'
  at: ISODate
  /** Absent means it does not expire: joint and global scopes, and 'stated'. */
  expiresAt?: ISODate
  /** True only via the section 3.6 n=3 question. Never inferred. */
  standing?: boolean
  /** The athlete's own words, when they gave any. Shown back, never parsed. */
  note?: string
  /** The Signal.detail that produced the offer, so the list reads as a story. */
  becauseAtTheTime?: string
}

/** The ledger. Newest last, capped, and fully deletable by the athlete. */
export interface OverrideLedger {
  entries: Override[]
  /** Lifetime count of the 3.6 re-open question, per kind and scope key. */
  askedToStop: Record<string, number>
}
```

### 5.2 `src/engine/authority.ts` (new, rank 1)

Pure. No storage, no store import, in the same style as `engine/coach.ts` and
`engine/calibration.ts`.

```ts
/** The table. This IS section 3; nothing else may encode a tier. */
export const AUTHORITY: readonly AuthorityRule[]

/** Section 4.5, exactly. The only function allowed to gate a tier-3 card. */
export function mayAsk(
  kind: DecisionKind,
  target: OverrideTarget,
  today: ISODate,
  ledger: OverrideLedger,
  newFacts: readonly DecisionKind[],   // tier-1 facts newly true since last decline
): { ask: boolean; reason: 'ok' | 'standing' | 'retired' | 'suppressed' | 'cooldown' }

/** Section 3.6 boundary, as a predicate rather than a judgement at the call site. */
export function resetsOverride(o: Override, fact: SafetyFact, today: ISODate): boolean

/** Section 4.2 G-2. Whether the engine may OFFER to widen, never whether it may widen. */
export function mayOfferWidening(o: Override, ledger: OverrideLedger): OverrideScope | null

/** Section 4.3 TTL table, applied. Pure, so a test can drive the calendar. */
export function expiryFor(target: OverrideTarget, at: ISODate): ISODate | undefined

/** Housekeeping: drop lapsed entries. Called on load, never mid-render. */
export function pruneLedger(ledger: OverrideLedger, today: ISODate): OverrideLedger

/** The one sentence the ledger screen shows per row. Never a judgement. */
export function overrideLine(o: Override): string
```

Constants exported from the same file, so a test names them rather than repeating them:
`DECLINE_COOLDOWN_DAYS = 3`, `DECLINES_TO_SUPPRESS = 2`, `SUPPRESS_DAYS = 21`,
`DECLINES_TO_RETIRE = 3`, `REINFORCE_EXTENDS_DAYS = 90`, `REOPEN_QUESTION_MAX = 1`,
`CONFIDENCE_FLOOR = 0.35`.

### 5.3 Edits to existing files

| File | Edit | Why |
|---|---|---|
| `src/types.ts:597` | Add `overrides: OverrideLedger` beside `adapt`, and one re-export line for `authorityTypes.ts` | Same arrangement as `prefs` and `journey`. `types.ts` is at its 696 allowance, so the shapes cannot land in it |
| `src/types.ts:672-680` | `overrides: { entries: [], askedToStop: {} }` in `emptyAppData()` | Defaulted all the way down means no migration and no `SCHEMA_VERSION` bump, exactly as `store/prefsSchema.ts:9-14` reasons for `prefs` |
| `src/store/authoritySchema.ts` (new) | zod mirror, `.default({ entries: [], askedToStop: {} })` | `store/schema.ts` is at its 634 allowance (`src/structure.test.ts:124`); mirrors live beside their types, as `prefsSchema.ts` and `sessionSchema.ts` already do |
| `src/logic/fatigueActions.ts:105-111` | `undoAdaptation` also writes an `Override` with `verb: 'declined'`, scope `session` | The decline currently vanishes. This is the single smallest change that closes the largest gap |
| `src/screens/today/AdaptProposals.tsx:80-89` | A second control, "Not today", that writes the same `Override` | Today the only way to decline is to ignore the card, which is indistinguishable from not having seen it |
| `src/engine/adapt.ts:280-283` | `planAdjustments` takes the ledger in `AdaptContext` and filters tier-3 output through `mayAsk` | Keeps the gate in one function. `planAdjustments` stays pure; the ledger arrives as data like `signals` does |
| `src/engine/phase.ts:172-178` | Promotion becomes a tier-3 proposal rather than a silent change. See 7.1 | The largest unconsented change in the tree |
| `src/logic/prescription.ts:99-126` | `prefillFor` returns the `because` string alongside `softened` so a screen can show it | The explanation is already computed at `engine/fatigue.ts:246` and discarded |
| `src/screens/coach/` | New `PrefsSheet.tsx`: blocked movements, pinned lifts, limitations, session minutes, and the override ledger, all editable | `data.prefs` has no writer anywhere (7.3). Tier 4 currently has no input surface |

### 5.4 What this schema deliberately does not have

- **No `trainer` or `clinician` owner field.** v12 51.2's `PROGRAM_DECISION_AUTHORITY` carries
  `owner: bodyt | athlete | trainer | performance_staff | clinician_restriction_supplied_by_user
  | imported_program`. BodyT has one user and no multi-party surface. Adding an owner field
  with a single possible value is a promise in a type signature, which is the exact failure
  `engine/adapt.ts:223-234` names about `add-recovery`. When a trainer surface exists,
  `Override` gains `by: 'athlete' | 'trainer'` and `AuthorityRule` gains `requiresApprovalFrom`.
  Not before.
- **No confidence float on `Override`.** Section 4.4: a decayed weight has no honest sentence.
  `CONFIDENCE_FLOOR` bounds the *kind's* confidence in the engine, which is a different object.
- **No free-text parsing.** `note` is stored and shown back. It is never matched, classified or
  read by any rule. `plan/analyze.ts:143` already regex-matches athlete text for pain words at
  onboarding, and that is as far as this tree should go.
- **No expiry on a stated limitation.** `prefsTypes.ts:43-54` settled this and it stays settled.

---

## 6. THE SCOPE-OF-PRACTICE FENCE

BodyT is a general wellness product [S25] built in the shape of a personal trainer [S26]. Both
fences agree on the same line, arrived at from different directions.

**The regulatory line [S25].** Enforcement discretion covers a product whose intended use is
general wellness (promoting a healthy lifestyle, improving fitness, endurance, strength) and
whose risk is low. A claim relating to the **diagnosis, cure, mitigation, treatment or
prevention** of a specific disease or condition moves the product out of the policy. The word
that catches most fitness copy is **prevention**.

**The professional line [S26].** The bodies that certify personal trainers state it as a list
of negatives: a trainer does not diagnose, does not prescribe diets or supplements, does not
treat injury or disease, does not rehabilitate, does not counsel. What a trainer does do is
educate from general peer-reviewed information, recognise signs and symptoms, and refer.

**The screening line [S24].** ACSM's preparticipation algorithm ends in a **referral decision**
and never in a clearance the screener issues. BodyT may say "worth asking someone about". It
may never say "you are fine".

### 6.1 The four rules the fence reduces to

- **F-1. Describe, do not name.** "Pain on the outside of the knee when you squat" is an
  observation. "Runner's knee" is a diagnosis. The first is in scope, the second is not, and no
  amount of hedging ("sounds like", "could be") moves the second into scope.
- **F-2. Never claim causation about tissue.** BodyT does not know why anything hurts, what is
  healing, or what will tear. It knows what was logged.
- **F-3. Never issue a clearance.** The app can say what it will not program. It cannot say
  that something is safe for this person.
- **F-4. Refer without staging.** "That is a question for a physio" is inside the fence.
  "That is probably fine, see someone if it lasts a month" is a triage decision, which is not.

`engine/adapt.ts:391` gets F-4 nearly exactly right and is worth quoting as the house standard:
"If it is still there in two weeks, that is a question for a physio and not for an app." It
names a threshold and hands the decision over without staging the condition. Keep it.

### 6.2 Forbidden phrases, and the safe alternative for each

Each row is a pattern to be forbidden by a copy test, not a single string. The "found at" column
cites live lines where the pattern already ships; blank means the pattern is prospective.

| # | Forbidden pattern | Why | Safe alternative | Found at |
|---|---|---|---|---|
| 1 | Naming a condition: tendinitis, impingement, sciatica, plantar fasciitis, runner's knee, shin splints | Diagnosis [S26]; disease claim [S25] | "The front of your knee has come up twice in two weeks" | |
| 2 | "X is how hamstrings tear" / "this is how you get injured" | Tissue-level causal claim about this athlete. F-2 | "Short sleep makes repeated efforts harder before it makes you weaker, so the sets are what should give" | `engine/insights.ts:417` |
| 3 | "Injury prevention" / "prevents injury" as a claim about the athlete | Prevention claim, the specific word that leaves the wellness policy [S25] | "Trains the ranges sprinting asks for" / "builds the strength the plant leg uses" | `plan/exercises.ts:1125`, `plan/generator.ts:680`, `plan/exercises.ts:150` |
| 4 | "Bulletproofs" / "injury insurance" / "protects your knee" | Same claim in metaphor. A metaphor is still a claim | "Strengthens the muscle that does this job" | `plan/exercises.ts:537`, `plan/exercises.ts:1240` in `athleticExercises.ts`, `plan/generator.ts:680` |
| 5 | "Safe for you" / "you are cleared" / "nothing to worry about" | Clearance. F-3, and directly against [S24] | "I will not program this while that joint is flagged" | |
| 6 | "You are not injured" / "that is just soreness" | Ruling out. Same fence as naming | "Normal effort soreness and joint pain feel different. If it is the second one, that is a physio question" | |
| 7 | "You are overtrained" / "this is overtraining syndrome" | A clinical diagnosis of exclusion no app can make (R3 S24) | "Three of the last week's sessions were graded heavy" | |
| 8 | "Take X grams of creatine / this supplement" | Supplement prescription, explicitly outside trainer scope [S26] | "Supplements are a dietitian question. Here is what your food log shows" | |
| 9 | Meal plans framed as therapeutic ("this diet will fix your blood sugar") | Diet prescription for a condition [S26], disease claim [S25] | "This hits your protein target. Anything condition-specific is a dietitian question" | |
| 10 | "Your readiness score says do not train" | Turning one wearable signal into a fact [S20] | "Your own read of the day beats anything I can infer. Here is what I noticed" | |
| 11 | "Push through it" / "train through the pain" | Advice about symptoms, and the exact advice the tree already refuses | "Stop the set at the first sharp one rather than at the rep count" | (correctly refused at `engine/adapt.ts:328-329`) |
| 12 | "You do not need to see anyone about that" | Advising against care. Tier 0, no exceptions | "Worth asking someone about" or say nothing | |
| 13 | "Miraculous recovery. Sick yesterday, PR today" and the variants around it | Accuses the athlete of lying about illness. Not a scope claim about medicine, a claim of authority over the athlete's account of their own body [S17] | Nothing. Delete the pool. There is no safe version of this message | `plan/messages.ts:314-320` |
| 14 | "Deathbed to PR in 24 hours. Medical journals would love you" | Same, plus a medical register the app has no standing in | Nothing. Delete | `plan/messages.ts:319` |
| 15 | "It's a skip with extra cowardice" | Character judgement. [S22]: athletes do not separate the programme from the treatment; [S3]: controlling language undermines the motivation it targets | "No log for {date}. What happened?" | `plan/messages.ts:126` |
| 16 | "The plan didn't fail, attendance did" | Judgement of the person rather than the performance. v12 51.9 states the rule explicitly | "You made {n} of {m} sessions. Worth asking whether {m} a week was the right number" | `engine/review.ts:188` |
| 17 | "Fix this before touching the training" | An instruction that claims priority over the athlete's own goals in a domain (diet) where the app has the least standing | "Protein came in under target on {n}% of logged days. That is the lever with the most room in it" | `engine/review.ts:172` |
| 18 | "The red line for CNS work" | Invented physiological threshold stated as established fact | "Under six hours tends to make repeated efforts feel harder" | `screens/today/ReadinessSheet.tsx:7` |
| 19 | "Pros deload. The injured skip it." | Implies that not deloading causes injury, plus a shaming frame | "Half the sets, same weights. This is where the adaptation catches up" | `plan/messages.ts:195` |
| 20 | "This goes in the ledger permanently, next to your name" | A surveillance frame applied to a tier-4 decision. [S3] names surveillance as an intrinsic-motivation underminer directly | "Saved with today's entry. You can delete it any time" | `screens/today/SkipFlow.tsx:229-230` |
| 21 | Any sentence beginning "You must" / "You need to" about a tier-4 decision | Controlling language [S3]; reactance trigger [S27] | "Worth" / "Most people find" / "Here is what I would do" | various |
| 22 | "Diagnosed with", "treat", "cure", "heal", "therapy" applied to the athlete | Disease vocabulary [S25] | Rephrase around what is trained, not what is fixed | |

### 6.3 The test that enforces it

A copy test in the shape of the existing em-dash guard, running over `plan/messages.ts`,
`engine/insights.ts`, `engine/review.ts`, `plan/exercises.ts`, `plan/athleticExercises.ts`,
`plan/generator.ts`, `plan/guide.ts`, `plan/debrief.ts` and every `.tsx` under `src/screens`:

- A `FORBIDDEN` array of regexes, one per row above, each with the row number in a comment.
- An `ALLOWED` allowlist that may only ever shrink, seeded with the rows that ship today, so
  the gate is live now rather than after a copy rewrite. Same arrangement and same rule as
  `src/structure.test.ts:38-41`: "Adding a name to an allowlist is a decision to make things
  worse. Deleting one is the goal."
- One additional assertion with no allowlist: no string anywhere may match the diagnosis
  vocabulary in row 1 or row 22. Those ship nowhere today, and the test's job is to keep it
  that way.

### 6.4 What stays

The Sergeant voice is not the problem and this section is not an argument for a bland app.
Rows 13 to 21 are the places where the voice stops talking about the **training** and starts
talking about the **person**, which is a different act, and the one [S3] and [S22] both
identify as counterproductive. "The couch is undefeated against you" (`plan/messages.ts:281`)
is a joke about a situation. "It's a skip with extra cowardice" (`plan/messages.ts:126`) is a
verdict on a character. The first survives every rule in this pack. The second survives none.
