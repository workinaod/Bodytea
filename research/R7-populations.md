# R7: Populations and Adaptive Training Evidence Pack

Research job R7 for BodyT. Deterministic local-first coaching PWA, no runtime LLM, general
wellness, never diagnoses. Covers v12 sections 9 to 14 and 49.

Reads on top of `research/R6-safety.md` and does not repeat it. R6 owns: acute red flags,
the GREEN / YELLOW / RED tiering, the PAR-Q+ 2025 question set, the ACSM 2015 screening
algorithm, and the joint-level functional constraint table. R7 owns the layer above that:
once a person is cleared to train at some tier, what does their *function* (not their
diagnosis) do to the plan.

Access date for all sources below: 2026-08-18. Researcher: Claude (session d21c12d6).
No production code in this pack. No repo writes.

Conventions:
- **SOURCED** = grounded in a tier-A document captured in section 1.
- **HOUSE HEURISTIC** = evidence-informed, not stated by any tier-A source. Never shown to
  users as guidance, always labelled in code comments.
- **DISAGREEMENT** = two tier-A sources conflict. Both are preserved, neither is silently
  resolved.
- No em dashes anywhere in this document, including in user-facing copy examples.
- Every population pack describes *programming*, never treatment. BodyT does not treat, does
  not diagnose, does not rehabilitate. It declines and it suggests.

**Contents.** 1 sources. 2 function-first model. 3 population packs (3.0 operators, 3.1 older
adults and frailty, 3.2 pregnancy and postpartum, 3.3 cardiometabolic, 3.4 musculoskeletal,
3.5 neurological, 3.6 fatigue and exertional intolerance, 3.7 POTS, 3.8 cancer, 3.9 sensory and
cognitive access, 3.10 youth). 4 the ME/CFS and PEM exception. 5 capability matching.
6 dose and on-ramp. 7 paired eval cases (20 DIVERGE, 10 INVARIANT). 8 integration notes.

**The three claims this pack makes, if nothing else is read.** (1) Store function, not
diagnosis: eleven functional dimensions, of which `Prefs.limitations` currently covers one and
a half. (2) A knee limitation today empties BodyT's entire squat pattern, because all seven
squat movements carry `stress: ['knee']` and `avoid` is binary; guidance for knee arthritis
says the opposite, so `avoid` needs a `limit-range` mode. (3) For post-exertional malaise the
progression engine must be structurally absent, not configured to zero, and section 4.5 gives
the test that proves it.

---

## 1. SOURCES (provenance)

Tier-A means: a guideline body, a professional society position stand or consensus
statement, a national health agency, or a disease-specific national organization publishing
clinician-facing guidance. Blogs, clinics marketing a protocol, and secondary summaries are
recorded as tier-B and are used only to locate the primary, never as the authority.

| ID | Name | Publisher | URL | Accessed | What was taken | Access quality |
|----|------|-----------|-----|----------|----------------|----------------|
| WHO-2020 | WHO Guidelines on Physical Activity and Sedentary Behaviour (2020), Executive Summary and recommendation statements | World Health Organization, read via NCBI Bookshelf NBK566048 | https://www.ncbi.nlm.nih.gov/books/NBK566048/ | 2026-08-18 | Verbatim recommendation statements with strength and certainty labels for adults, older adults, children and adolescents, pregnant and postpartum women, adults with chronic conditions, adults and children living with disability. The universal good-practice statements. The pregnancy safety list. The disability safety statement. | FULL |
| WHO-FS | Physical activity fact sheet | World Health Organization | https://www.who.int/news-room/fact-sheets/detail/physical-activity | 2026-08-18 | Confirmation that the 2020 guideline covers chronic conditions and disability as named subpopulations. Page does not carry the recommendation text itself. | PARTIAL |
| CDC-CHRONIC | Chronic Conditions and Disabilities Activity, Physical Activity Basics | CDC | https://www.cdc.gov/physical-activity-basics/guidelines/chronic-health-conditions-and-disabilities.html | 2026-08-18 | 150 min/wk moderate plus 2 d/wk muscle strengthening for adults with chronic conditions or disabilities; "some physical activity is better than none, be as active as you are able"; consult a health care professional or physical activity specialist about appropriate types and amounts | FULL |
| NICE-NG206 | Myalgic encephalomyelitis (or encephalopathy) / chronic fatigue syndrome: diagnosis and management, NG206 (2021) | National Institute for Health and Care Excellence, read via NCBI Bookshelf NBK579533 after nice.org.uk returned 403 through the session proxy | https://www.ncbi.nlm.nih.gov/books/NBK579533/ (canonical: https://www.nice.org.uk/guidance/ng206/chapter/recommendations) | 2026-08-18 | Definition of post-exertional malaise; energy management definition and scope; recommendations 1.11.9 to 1.11.16 including the 1.11.13 approved-programme structure and the 1.11.14 prohibition on fixed incremental increases and on generalised programmes | FULL for the load-bearing recommendations, PARTIAL for surrounding text |
| DI-POTS | Exercise (POTS and dysautonomia patient guidance) | Dysautonomia International | https://www.dysautonomiainternational.org/page.php?ID=43 | 2026-08-18 | Recumbent-first principle; three-level progression (reclined gentle, recumbent cardio and weights, upright); leg and core emphasis rationale; explicit instruction that upright work comes only after substantial recumbent tolerance is built | FULL |

| CDC-PEM | Managing Post-Exertional Malaise (PEM) in ME/CFS, provider toolkit sheet CS321382-D | CDC | https://www.cdc.gov/me-cfs/pdfs/toolkit/Managing-PEM_508.pdf | 2026-08-18 | Verbatim: pacing definition; the ask / review / brainstorm diary method; "Best practice: prevent harm!"; the lowered anaerobic threshold statement; "Increased activity can thus be harmful if it leads to PEM"; the energy envelope; heart-rate monitors to avoid crossing the anaerobic threshold; the acknowledgement that inactivity also causes deconditioning | FULL (PDF text-extracted locally) |
| NSCA-OA | Resistance Training for Older Adults: Position Statement From the National Strength and Conditioning Association. Fragala MS, Cadore EL, Dorgo S, Izquierdo M, Kraemer WJ, Peterson MD, Ryan ED. J Strength Cond Res 33(8):2019-2052, 2019 | National Strength and Conditioning Association | https://www.nsca.com/contentassets/2a4112fb355a4a48853bbafbe070fb8e/resistance_training_for_older_adults__position.1.pdf | 2026-08-18 | Verbatim: the 11 summary statements; Table 1 program variables (sets, reps, intensity, exercise selection, modality, frequency, power, functional movements) with the beginner and frailty carve-outs; the frailty prescription (3x/wk, 3 sets of 8-12, start 20-30% 1RM progressing to 80%); the high-speed contraindications (poor form, severe OA); the mobility-limitation section (seated strength, recumbent cycle or upper-body ergometer when standing is not practical) | FULL (PDF text-extracted locally) |
| STEADI-CS | STEADI Assessment: 30-Second Chair Stand (2017) | CDC National Center for Injury Prevention and Control | https://www.cdc.gov/steadi/media/pdfs/STEADI-Assessment-30Sec-508.pdf | 2026-08-18 | Verbatim: purpose, protocol, and the full below-average score table by age band and sex (60-64 men <14 women <12, through 90-94 men <7 women <4); "A below average score indicates a risk for falls"; the stop rule when arms are used | FULL (PDF text-extracted locally) |
| STEADI-HCP | STEADI clinical resources hub (screen, assess, intervene) | CDC | https://www.cdc.gov/steadi/hcp/clinical-resources/index.html | 2026-08-18 | The three-assessment set (Timed Up and Go, 30-Second Chair Stand, 4-Stage Balance Test) and the screen / assess / intervene framing. Cut points for TUG and 4-Stage were not on this page and are recorded from secondary sources, so they are marked accordingly | PARTIAL |
| PF-ACSM | Parkinson's Disease Exercise Recommendations, FITT-VP table (2021) | Parkinson's Foundation with the American College of Sports Medicine | https://www.parkinson.org/sites/default/files/documents/exercise_guidelines_2022.pdf | 2026-08-18 | Verbatim: the full four-domain FITT-VP table (aerobic, strength, balance-agility-multitasking, flexibility) with frequency, intensity, progression, time, volume, type; the disease-related considerations row (freezing of gait, orthostatic hypotension, blunted HR response, "avoid heavy free weights", ON-period timing, osteoporosis and spinal stenosis comorbidity notes); the recommendation to collaborate with a PD-specialist physical therapist | FULL (PDF text-extracted locally) |

| SCI-PAG | Physical Activity Guidelines for Adults with Spinal Cord Injury (international scientific guidelines, Martin Ginis et al. 2018, and the Canadian community/clinical translation) | SCI Action Canada / University of British Columbia, read via PMC7283041 | https://pmc.ncbi.nlm.nih.gov/articles/PMC7283041/ (guideline home: https://sciguidelines.ubc.ca/) | 2026-08-18 | Verbatim: the fitness guideline (at least 20 min moderate-to-vigorous aerobic twice weekly AND three sets of strength exercise for each major functioning muscle group at moderate-to-vigorous intensity twice weekly) and the cardiometabolic guideline (at least 30 min moderate-to-vigorous aerobic three times weekly). The article does not carry per-risk safety text; safety notes for SCI in this pack are sourced elsewhere or marked HOUSE | PARTIAL (guideline text FULL, safety text absent) |
| ROS-SSS | Strong, Steady and Straight: An Expert Consensus Statement on Physical Activity and Exercise for Osteoporosis (Dec 2018) | National Osteoporosis Society, now Royal Osteoporosis Society, hosted by the British Geriatrics Society | https://www.bgs.org.uk/sites/default/files/content/attachment/2019-02-20/FINAL%20Consensus%20Statement_Strong%20Steady%20and%20Straight_DEC18.pdf | 2026-08-18 | Verbatim key recommendations with evidence grades: weight-bearing-with-impact plus muscle strengthening; progressive resistance training "up to moderate or high intensity"; moderate impact for those without vertebral fracture, lower impact (brisk walking rather than jumping) for those with vertebral or multiple low-trauma fractures; "movements or exercise that involve sustained, repeated or end-range flexion should be amended or avoided unless someone is already practiced with very good muscle tone"; balance and strength for fallers; back-extensor strengthening starting at low intensity for painful vertebral fracture | FULL (PDF text-extracted locally) |

| AHA-STROKE | Physical Activity and Exercise Recommendations for Stroke Survivors: A Statement for Healthcare Professionals. Billinger SA et al. Stroke 2014;45:2532-2553 | American Heart Association / American Stroke Association | https://muhc.ca/sites/default/files/micro/m-PT-OT/PT/AHA-CVA.pdf (ahajournals.org DOI page paywalled through the session proxy) | 2026-08-18 | Verbatim prescription table: aerobic 40-70% VO2 or HR reserve, RPE 11-14, 3-5 d/wk, 20-60 min or multiple 10-min sessions; resistance 1-3 sets of 10-15 reps of 8-10 exercises at 50-80% 1RM, 2-3 d/wk, "resistance gradually increased over time as tolerance permits"; flexibility static holds 10-30 s, 2-3 d/wk; neuromuscular balance and coordination 2-3 d/wk. Plus the statement that multiple short bouts "may be better tolerated than a single long session", and the low-to-moderate emphasis | FULL (PDF text-extracted locally) |
| PHI-POLIO | PHI's Statement on Exercise for Polio Survivors | Post-Polio Health International | https://post-polio.org/living_with_polio/phis-statement-on-exercise-for-polio-survivors/ | 2026-08-18 | Verbatim: "Advising all polio survivors not to exercise is as irresponsible as advising all polio survivors to exercise"; intensity low to moderate; progression slow, particularly in muscles not exercised for a period of time; pacing built into the program; rotate exercise types; "Polio survivors who experience marked pain or fatigue following any exercise should hold that exercise until contacting their health professional"; initial design and supervision by a professional for two to four months | FULL |
| ACSM-CANCER | Exercise Guidelines for Cancer Survivors: Consensus Statement from International Multidisciplinary Roundtable. Campbell KL et al. Med Sci Sports Exerc 2019 | American College of Sports Medicine, read via PMC8576825 | https://pmc.ncbi.nlm.nih.gov/articles/PMC8576825/ | 2026-08-18 | The per-outcome FITT table (anxiety, depressive symptoms, fatigue, HRQoL, lymphedema, physical function) with doses; the moderate-evidence and insufficient-evidence lists; "avoid inactivity"; the bone-metastases contraindicated-movement list (high-impact loads, hyperflexion or hyperextension of the trunk, flexion or extension of the trunk with added resistance, dynamic twisting); peripheral neuropathy balance caution and cycling or water substitution; lymphedema "start low, progress slow" with initial supervision; immune recovery before public gyms after stem cell transplant; the pre-exercise medical evaluation list | FULL |
| CP-VERSCHUREN | Exercise and physical activity recommendations for people with cerebral palsy. Verschuren O, Peterson MD, Balemans ACJ, Hurvitz EA. Dev Med Child Neurol 2016;58(8):798-808 | Developmental Medicine and Child Neurology | https://pubmed.ncbi.nlm.nih.gov/26853808/ (full text paywalled; doses captured from indexed abstract and secondary summaries) | 2026-08-18 | Aerobic prescription: 2-3 times per week, 60-95% peak HR or 40-80% HR reserve, minimum 20 min per session, at least 8 consecutive weeks at three times weekly or 16 weeks at twice weekly. The sedentary-time finding (76-99% of waking hours) | PARTIAL (abstract-level, marked as such wherever used) |
| NCHPAD | National Center on Health, Physical Activity and Disability: inclusive fitness resources, Discover Accessible Fitness (wheelchair user guide), Inclusive Fitness Training, 14 Week Program | NCHPAD (CDC-funded) | https://www.nchpad.org/resources/ifit-inclusive-fitness-training-tips/ and https://www.nchpad.org/ | 2026-08-18 | The inclusion posture (adapt the activity, do not exclude the person); existence of equipment-level adaptation guidance for wheelchair users; the Certified Inclusive Fitness Trainer role as the professional referral target for disability-specific programming | PARTIAL (navigational, used for posture and referral routing, not for doses) |
| IOC-REDS | 2023 IOC consensus statement on Relative Energy Deficiency in Sport (REDs). Mountjoy M et al. Br J Sports Med 2023;57:1073-1097 | International Olympic Committee / BJSM | https://pubmed.ncbi.nlm.nih.gov/37752013/ (stillmed.olympics.com PDF and bjsm.bmj.com both returned 403 through the session proxy) | 2026-08-18 | The LEA spectrum from adaptable to problematic; REDs as a syndrome of health and performance outcomes from problematic LEA (energy metabolism, reproductive function, musculoskeletal health, immunity, glycogen synthesis, cardiovascular and haematological health); the CAT2 three-step protocol and its four-level green / yellow / orange / red severity and risk stratification with associated sport participation guidance | PARTIAL (abstract and consensus-summary level; no verbatim indicator list captured) |

| ADA-SOC | Standards of Care in Diabetes, section 5 (Facilitating Positive Health Behaviors and Well-being), physical activity recommendations | American Diabetes Association | https://diabetesjournals.org/care/article/49/Supplement_1/S89/163932/5-Facilitating-Positive-Health-Behaviors-and-Well (403 through the session proxy; content captured from indexed recommendation summaries) | 2026-08-18 | At least 150 min/wk moderate-to-vigorous aerobic spread over at least 3 days with no more than 2 consecutive inactive days; 2-3 resistance sessions per week on nonconsecutive days; interrupt prolonged sitting (current standard moved to roughly every 30 min from the earlier 90); flexibility and balance 2-3 times weekly suggested for older adults with diabetes | PARTIAL (no verbatim recommendation grades captured; grades must not be quoted) |
| NICE-NG59 | Low back pain and sciatica in over 16s: assessment and management, NG59 | NICE, read via NCBI Bookshelf NBK562933 | https://www.ncbi.nlm.nih.gov/books/NBK562933/ (canonical https://www.nice.org.uk/guidance/ng59/chapter/recommendations) | 2026-08-18 | 1.2.1 self-management advice tailored to needs and capabilities including "encouragement to continue with normal activities"; 1.2.2 consider a group exercise programme (biomechanical, aerobic, mind-body or a combination) tailored to "specific needs, preferences and capabilities"; the do-not-offer list (belts and corsets 1.2.3, foot orthotics 1.2.4, rocker sole shoes 1.2.5, traction 1.2.6, acupuncture 1.2.8, ultrasound / PENS / TENS / interferential 1.2.9-1.2.12) | FULL for the recommendations used |
| NSCA-YOUTH | Youth Resistance Training: Updated Position Statement Paper From the National Strength and Conditioning Association. Faigenbaum AD, Kraemer WJ, Blimkie CJR, Jeffreys I, Micheli LJ, Nitka M, Rowland TW. J Strength Cond Res 2009;23(5 Suppl):S60-S79 | NSCA | https://www.nsca.com/globalassets/about/position-statements/position_stand_youth_resistance_training---2009.pdf | 2026-08-18 | Verbatim: the seven position statements, each beginning "A properly designed and supervised resistance training program"; Table 1 general youth guidelines (qualified instruction and supervision; 5-10 min dynamic warm-up; begin with relatively light loads and always focus on correct technique; 1-3 sets of 6-15 reps strength; 1-3 sets of 3-6 reps power; increase resistance gradually 5-10% as strength improves; 2-3 times per week on nonconsecutive days; cool-down); the attribution of reported injuries to inappropriate technique, excessive loading, poor equipment, unrestricted access, and lack of qualified adult supervision | FULL (PDF text-extracted locally) |
| ACR-OA | 2019 American College of Rheumatology / Arthritis Foundation Guideline for the Management of Osteoarthritis of the Hand, Hip, and Knee | ACR / Arthritis Foundation | https://pubmed.ncbi.nlm.nih.gov/31908149/ | 2026-08-18 | Strong recommendations for exercise, weight loss (5% or more of body weight in those overweight or obese), and self-efficacy / self-management programmes for knee and hip OA; tai chi strongly recommended for knee and hip OA; exercise modality explicitly non-hierarchical (walking, strengthening, neuromuscular training, aquatic) | PARTIAL (recommendation-level via abstract and society summaries) |
| OARSI-19 | OARSI guidelines for the non-surgical management of knee, hip, and polyarticular osteoarthritis. Bannuru RR et al. Osteoarthritis Cartilage 2019 | Osteoarthritis Research Society International | https://www.oarsijournal.com/article/S1063-4584(19)31116-1/fulltext | 2026-08-18 | Core Treatments for knee OA: arthritis education and structured land-based exercise programmes with or without dietary weight management. Core Treatments for hip and polyarticular OA: arthritis education and structured land-based exercise programmes. Aquatic exercise placed at Level 1B/2 for knee OA depending on comorbidity | PARTIAL (recommendation-level) |
| TJA-CONSENSUS | Return to athletic activity after total hip arthroplasty: consensus guidelines based on a survey of the Hip Society and AAHKS (Klein et al. J Arthroplasty 2007), plus the knee umbrella review (PMC8965786) | Hip Society / American Association of Hip and Knee Surgeons | https://pubmed.ncbi.nlm.nih.gov/17275629/ and https://pmc.ncbi.nlm.nih.gov/articles/PMC8965786/ | 2026-08-18 | More than 95% of surgeon responses placed no limitation on low-impact activity (level walking, stair climbing, level cycling, swimming, golf); high-impact and contact activity not recommended by a large proportion; medium-impact allowed or allowed with prior experience; typical clearance window 3 to 6 months; explicit acknowledgement of a lack of long-term data for high-impact return | PARTIAL (survey-consensus, not a guideline body; treated as tier-B-plus and labelled where used) |

**24 sources.** Blocked or degraded in this environment, recorded so future sessions do not
re-burn usage: `nice.org.uk` (403, routed via NCBI Bookshelf), `journals.sagepub.com` (403, MS
consensus not captured), `diabetesjournals.org` (403, ADA grades not captured),
`bjsm.bmj.com` and `stillmed.olympics.com` (403, REDs not captured verbatim),
`nature.com` (auth redirect), `academia.edu` (403), `vivifrail.com` prescription guide
(exceeded the 10 MB fetch limit). PDFs that WebFetch could not read were text-extracted
locally with pypdf, which worked for NSCA, STEADI, Parkinson's Foundation, the Royal
Osteoporosis Society, AHA stroke and the CDC PEM sheet. R6 additionally records
`acog.org`, `journals.lww.com`, `heart.org` and `web.archive.org` as blocked, and this
session did not find them any more reachable.

---

## 2. FUNCTION-FIRST MODEL

### 2.1 Why a diagnosis never determines a prescription

A diagnosis is a *category of cause*. A prescription is a *function of capacity*. The two are
related but the mapping is many-to-many and unstable, and every attempt to shortcut it
produces the same three failures:

1. **Within-label variance swamps between-label variance.** "Multiple sclerosis" spans a
   person who runs half marathons and a person who cannot transfer unassisted. "Parkinson's"
   spans Hoehn and Yahr 1 and Hoehn and Yahr 4. "Post-polio" spans a person with a mild
   ankle weakness and a person whose quadriceps are non-functional. If the label picked the
   plan, the plan would be wrong for most holders of the label.

2. **Function is shared across labels.** Cannot get to the floor is the same programming
   fact whether it arrives from a hip replacement, obesity, third-trimester pregnancy, or
   a wheelchair. Building one branch per diagnosis duplicates the same modification a dozen
   times and guarantees the dozen copies drift.

3. **A diagnosis-keyed system is a diagnosis-collecting system.** To use the label you must
   ask for it, store it, and act on it. That is a medical posture BodyT explicitly refuses:
   the app is general wellness, never diagnoses, and every extra sensitive field is
   liability with no programming yield. Function questions ("can you get down to the floor
   and back up without help?") are answerable, actionable, and not a diagnosis.

WHO-2020 states the principle for the whole guideline: the recommendation for adults living
with disability is the *same* 150 to 300 minutes plus 2 days of strengthening as for
everyone else, with the good-practice statement that people "should start by doing small
amounts of physical activity, and gradually increase the frequency, intensity and duration
over time" and that "doing some physical activity is better than doing none". CDC-CHRONIC
says the same thing in one line: "be as active as you are able". Neither body prescribes a
different *target* by diagnosis. What changes by diagnosis is only the route to the target,
and the route is chosen by function.

**The rule BodyT encodes: the diagnosis is at most a hint that generates function questions.
It never enters the generator.** A user may type "I have MS" in free text. The correct
system response is to ask two or three function questions and store the *answers*. The
string "MS" is stored only as the user's own label on a limitation, exactly as
`Limitation.label` already works, and is shown back to them, never reasoned over.

The one clean exception, and it is not really an exception: some labels carry a
*physiological* fact that is not observable from function questions and that changes the
loading rules. Osteoporosis is the canonical case. A person with osteoporosis may have
completely normal function and still must not do loaded spinal flexion. Those cases are
handled as *loading-tolerance flags*, not as diagnoses, and there are few of them (section
3.4). The flag is what is stored: `avoid loaded spinal flexion`, not `osteoporosis`.

### 2.2 The functional dimensions BodyT should store

Eleven dimensions. Each is defined by what it *changes in the plan*, because a dimension
that changes nothing is a survey question, not a model.

| # | Dimension | Values (proposed) | What it selects or modifies | In `Prefs.limitations` today? |
|---|-----------|-------------------|-----------------------------|-------------------------------|
| F1 | **Locomotion** | `independent` / `aided` (cane, walker, crutch) / `limited-distance` / `wheeled-manual` / `wheeled-power` / `mixed` | Whether cardio can be gait-based; whether standing work is the default; whether "steps" is a coherent unit; warm-up modality | No |
| F2 | **Transfer ability** | `floor-independent` / `floor-with-support` / `chair-only` / `bed-chair-assisted` | Whether floor-based movements are selectable at all; whether the session may require more than one position change; whether burpee-class movements exist | Partly, as the R6 keys `cannot-get-to-floor`, `cannot-kneel` |
| F3 | **Unilateral function** | `symmetric` / `asymmetric-mild` / `asymmetric-severe` / `single-side-only` / `limb-absent` (with side and segment) | Whether bilateral loading is legitimate (it hides the weak side); whether unilateral movements are *required* rather than optional; per-side load and rep targets | No. This is the largest single gap |
| F4 | **Grip** | `full` / `reduced` / `assisted` (straps, cuffs) / `none` / `one-hand` | Whether a movement's limiting factor is the target muscle or the hand; whether loaded carries and hangs are selectable; implement choice | No |
| F5 | **Balance** | `dynamic-standing` / `static-standing` / `standing-with-support` / `seated-independent` / `seated-supported` (trunk control absent) | Whether unsupported single-leg work exists; whether the seated variant is the *default* rather than the fallback; fall-risk gating of impact | Partly, as `uses-cane-or-support` |
| F6 | **ROM and position tolerance** | Per-position: `ok` / `limited` / `not-tolerated`, over `overhead`, `deep-knee-flexion`, `deep-hip-flexion`, `supine`, `prone`, `kneeling`, `quadruped`, `head-below-heart`, `spinal-flexion`, `spinal-rotation` | The avoid-list, exactly as R6's joint mapping does, but keyed on *position* rather than only on *joint* | Joints only. Positions are inferred from joints today, which is lossy |
| F7 | **Loading tolerance** | `axial-load-cap` (none / light / normal), `impact-cap` (none / low / normal), per-joint load ceiling, `valsalva-avoid` (bool) | Load progression ceiling; whether the rep engine may add weight; whether jumps exist; breathing cue | Joint list only, no ceilings |
| F8 | **Fatigue and post-exertional response** | `normal` / `elevated-fatigue-normal-recovery` / `post-exertional-symptom-exacerbation` (with latency hours and duration days) | **Changes the semantics of progression itself.** See section 4. In the PESE state the engine is not allowed to hold a monotone-increase policy at all | No. Fatigue is inferred from a rolling 14-day `FatigueNote` window and always assumed transient |
| F9 | **Autonomic and thermoregulatory** | `orthostatic-intolerance` (bool), `heat-intolerance` (bool), `bp-response-caution` (bool), `hypoglycaemia-risk` (bool), `dysreflexia-risk` (bool) | Position sequencing and transition speed; rest length; whether the session may be dense; environment copy; whether "push harder" copy is ever emitted | Partly, as R6's `dizziness-on-standing` |
| F10 | **Sensory** | `vision` (full / low / none), `hearing` (full / reduced / none), `protective-sensation` (intact / reduced / absent, with segment) | Instruction channel (text, audio, haptic); whether timer cues need a non-audio path; whether skin and foot checks belong in the session; whether unsupported balance is safe | No |
| F11 | **Cognitive** | `instruction-complexity` (full / simplified / single-step), `sequencing-support` (none / needed), `routine-stability` (flexible / must-stay-fixed) | Cue length and count; how many novel movements per session; whether rotation at block boundaries is allowed at all; whether the app may change the plan without being asked | No. Note that `pinned` already encodes "do not rotate this", so the primitive exists |

### 2.3 What this means for the existing memory

`Prefs.limitations` is today `{ label: string, joints: Joint[], since: ISODate }[]`. It is a
good primitive and should not be replaced. Read against the eleven dimensions it covers,
partially, F6 and F7 (joint-scoped only), and by R6's extension it reaches into F2, F5 and
F9 by smuggling non-joint concepts into the `joints` array or into new string keys.

That smuggling is the thing to stop. `cannot-get-to-floor` is not a joint. Putting it in
`Joint` would corrupt a type that `MOVEMENT[].stress` and `substitutesFor({ avoid })` both
depend on, and `Joint` is exactly right as it stands: it is the set of places a movement
*loads*. What is missing is a sibling axis for the things a movement *requires*.

The proposed shape (full typing in section 8):

```
Limitation {
  label: string          // unchanged, the athlete's own words, only ever shown back
  joints: Joint[]        // unchanged, feeds substitutesFor({ avoid })
  since: ISODate         // unchanged
  capability?: CapabilityProfile   // NEW, the F1..F11 dimensions, all optional
  asOf?: ISODate         // NEW, for anything that expires or advances (R6 already needs this for pregnancy)
  review?: ISODate       // NEW, when to ask again. Absent means never
}
```

`CapabilityProfile` is a **partial** record. An empty profile must behave exactly like today,
which is the migration story and also the first guard test: a user with no capability data
gets a byte-identical plan.

### 2.4 The two invariants this section exists to produce

**INV-1 (function determines plan).** Two users with identical `CapabilityProfile`, identical
goal, identical equipment and identical history receive identical plans, regardless of the
free-text `label` on their limitations. Changing "arthritis" to "old football injury" changes
nothing. This is testable and is the diagnosis-invariance family in section 7.

**INV-2 (no diagnosis reaches the generator).** The generator's input type contains no field
that can carry a condition name. `label` is not passed to it. Enforced by type, not by
review: the generator takes a `PlanInputs` that includes `CapabilityProfile` and
`Joint[]`, and has no access to `Prefs.limitations` as a whole. `structure.test.ts` gets a
rule that `src/plan/generator.ts` does not import `Limitation`.

---

## 3. POPULATION PACKS

### 3.0 The eleven modification operators

Every pack below is written as a set of operator settings. There are eleven operators and no
others; if a pack seems to need a twelfth, that is a signal the movement graph is missing an
axis (section 5), not that the pack needs a bespoke branch.

| Op | Name | What it does | Where it lands in the codebase |
|----|------|--------------|--------------------------------|
| O1 | **Position** | Which body positions the session may use (standing, seated, supine, prone, side-lying, kneeling, quadruped, recumbent) | New `requiresPosition` on the movement graph; filters candidates |
| O2 | **Stability** | How much support the movement provides (machine or wall supported, bilateral, unilateral, unstable surface) | New `balanceDemand`; caps candidate selection |
| O3 | **Loading** | Absolute and relative load ceilings, axial versus non-axial, valsalva permission | Rep and load engine ceiling; `loadable` already exists as a boolean and needs a ceiling beside it |
| O4 | **Range** | Working range of a movement, independent of the movement's identity | Per-exercise range note plus a `rangeCap` on the prescription; currently expressible only by substituting a different movement |
| O5 | **Impact** | Ground-reaction force ceiling (none, low, moderate, full) | `athletic.ts` already carries impact for the 91 drills; strength movements do not have it |
| O6 | **Grip** | Whether the hand is a limiter, and what implement or attachment fixes it | New `gripDemand`; changes implement, not pattern |
| O7 | **Complexity** | How many instructions and novel decisions the session asks for | `skill` is a proxy today and is the wrong proxy (section 5.4) |
| O8 | **Volume and intensity** | Sets, reps, effort ceiling, weekly minutes, session count | `engine/volume.ts` ceilings, the rep engine, the phase machinery |
| O9 | **Session structure** | Length, split versus whole, number of short bouts, rest length, warm-up length | `Prefs.sessionMinutes` exists; multiple-bouts-per-day does not |
| O10 | **Instruction** | Channel and density of coaching copy (text, audio, haptic, image), cue length | `ExerciseDef.steps`, `cue`, the guide layer |
| O11 | **Environment** | Temperature, hydration, footwear, surface, proximity to support, time of day relative to medication or meals | Copy only today; no typed representation |

Each pack states: **what changes**, **what to ask** (function questions, never diagnosis
questions), **operators**, **red lines** (what the generator must be unable to produce), and
**when professional input is appropriate** (a suggestion, never a gate the app enforces on
the user's behalf beyond R6's RED tier).

---

### 3.1 Older adults and frailty

**What changes in programming.** Almost nothing about the *target*, everything about the
*entry point and the mix*. WHO-2020 gives older adults the same 150 to 300 minutes and adds
one thing nobody else gets: "varied multicomponent physical activity that emphasizes
functional balance and strength training at moderate or greater intensity, on 3 or more days
a week, to enhance functional capacity and to prevent falls" (Strong recommendation, moderate
certainty). That is a *third pillar*, not a garnish, and BodyT does not currently have a
balance pillar at all for non-athletic users.

The frailty axis is separate from the age axis and matters far more. NSCA-OA's Table 1 gives
healthy older adults 1 to 3 sets, 8 to 12 or 10 to 15 reps, 70 to 85% of 1RM, 2 to 3 d/wk,
8 to 10 exercises, with the explicit carve-out: "1 set for beginners and older adults with
frailty progressing to multiple sets (2-3) per exercise" and "Lighter loads are recommended
for beginners, or individuals with frailty, or special considerations such as cardiovascular
disease and osteoporosis." For frailty specifically it gives a concrete on-ramp: "Strength
training interventions performed 3 times a week, with 3 sets of 8-12 repetitions and an
intensity starting at 20-30% and progressing to 80% of 1RM, seem well tolerated by older
adults with frailty."

Two more NSCA-OA facts that change selection rather than dose: power work belongs at
40 to 60% of 1RM performed with high concentric velocity, and "poor form and execution of
exercise and severe OA are contraindications for high-speed resistance training". And on
modality: "Beginners, frail older adults, or those with functional limitations benefit from
machine-based resistance training ... resistance bands, and isometric training", while high
functioning older adults gain added benefit from free weights. When standing is not practical,
"strength exercises may be performed in a seated position, and complimentary aerobic exercise
may be possible using a seated recumbent cycle ergometer and/or stepper, or an upper-body
ergometer."

Vivifrail is the same idea operationalized as four function tiers rather than an age: A
(disability), B (frail), C (pre-frail), D (robust), with the highest-need tiers getting
*more* frequent multicomponent work, five days a week, not less. Access to the Vivifrail
prescription guide PDF exceeded the fetch size limit in this environment, so its per-level
doses are recorded here at summary level only and any number taken from it must be re-verified
before it enters code.

**What information is actually needed.** Age is not one of the questions. Ask:
- Can you get up from a chair without using your hands? (F5, F2. Maps directly to STEADI-CS,
  whose stop rule is "If the patient must use his/her arms to stand, stop the test. Record 0".)
- Have you fallen in the past year? Are you afraid of falling? (Fall risk, the STEADI screen.)
- Do you use anything to help you walk? (F1, F5)
- Can you get down to the floor and back up? (F2)
- How far can you walk before you need to stop? (F1, work capacity)

**Operators.**
- O1 Position: seated variants become first-class, not fallbacks, once chair-rise is not
  independent. Floor work is excluded when F2 is `chair-only`.
- O2 Stability: supported before unsupported; STEADI's 4-Stage Balance progression (feet
  together, semi-tandem, tandem, single leg, 10 s each) is a legitimate *programmable
  progression*, and BodyT has nothing like it.
- O3 Loading: start at the tolerated load, not a percentage the user cannot estimate. NSCA-OA
  frailty on-ramp of 20 to 30% of 1RM is real but 1RM is not measurable in this app, so the
  house translation is: start at a load the user can move for the target reps with clearly
  more in reserve, and use rep-gain, not load-gain, for the first block (HOUSE HEURISTIC, and
  it is the same policy J2 already shipped for bodyweight work).
- O5 Impact: gated on fall risk, not on age.
- O8 Volume and intensity: 1 set at entry for frailty, progressing to 2 to 3. Avoid going to
  failure: NSCA-OA says exercises "should be performed in a repetition-range intensity zone
  that avoids going to failure to reduce joint stress".
- O9 Session structure: shorter and more frequent beats long and rare at this tier.
- O11 Environment: chair or counter within reach for every standing balance item.

**Red lines.**
- No unsupported single-leg balance work when F5 is below `static-standing`.
- No high-velocity power work when technique quality is unknown or severe joint pain is
  present (NSCA-OA contraindication, verbatim above).
- No jumping or landing prescription for a user who reports a fall in the past year, until a
  balance progression has been passed (HOUSE HEURISTIC on the trigger, sourced on the
  direction).
- The generator must not produce a plan whose only lower-body content requires floor transfer
  for a user who cannot transfer.

**When professional input is appropriate.** Suggest, once, without repeating: falls in the
past year, or a chair-stand below the STEADI-CS age and sex band, is the point where "a
physical therapist or a falls clinic will get you further than an app can" is honest copy.
CDC-CHRONIC's line is the model: consult "a health care professional or physical activity
specialist about appropriate types and amounts of physical activity".

---

### 3.2 Pregnancy by trimester, and postpartum return

R6 already owns the pregnancy red lines (the ACOG absolute-contraindication list, the warning
signs vocabulary, and the trimester constraint keys `pregnancy-T1/T2/T3` and
`postpartum-early`). This pack adds only the programming layer and the two things R6 left
open.

**What changes in programming.** Less than most people assume, and the direction of the error
matters: the common failure is over-restriction, not under-restriction. WHO-2020 gives
pregnant and postpartum women a *strong* recommendation to "undertake regular physical
activity throughout pregnancy and postpartum", at least 150 minutes of moderate aerobic
activity per week, incorporating "a variety of aerobic and muscle-strengthening activities",
with gentle stretching optionally beneficial. The safety envelope in WHO-2020 is short and
specific: avoid excessive heat and high humidity, activities with physical contact or high
falling risk, activities that limit oxygenation such as high altitude, and the supine position
after the first trimester.

The real programming variable is prior training status, not trimester. A person who was
already lifting continues lifting with position and heat adjustments. A person starting in
pregnancy starts at the conservative floor R6 already defines and builds toward 150 minutes.
Trimester changes *positions and balance*, not permission.

**What information is actually needed.** Weeks (or trimester), prior activity level, whether
a clinician has said anything restrictive, and the function questions that would be asked of
anyone: balance, position tolerance, what currently feels bad. Nothing else. The app never
asks about the pregnancy itself.

**Operators.**
- O1 Position: after T1, supine work is replaced by incline, side-lying, or seated. This is a
  clean `requiresPosition: 'supine'` filter and is the single clearest argument for adding the
  position axis to the movement graph.
- O2 Stability: balance demand falls as the centre of mass moves. Supported unilateral work
  replaces unsupported through T2 and T3.
- O3 Loading: valsalva discouraged; breath-holding under strain is out. Load itself is
  continued per prior habit.
- O5 Impact: per prior habit and comfort, reduced by symptom report rather than by calendar.
- O8 Volume and intensity: talk-test moderate is the default; previously vigorous athletes
  are not demoted by the app on account of pregnancy alone (this is the point where PAR-Q+
  and ACOG disagree in emphasis; R6 records the disagreement and resolves conservative with a
  provider nudge, and R7 does not reopen it).
- O11 Environment: heat and humidity are a named WHO-2020 avoidance. This is the first pack
  where O11 is sourced rather than sensible.

**Postpartum return.** WHO-2020 keeps the same recommendation "throughout pregnancy and
postpartum" and adds nothing time-based. There is no tier-A number for "weeks until
running", so BodyT must not invent one. The house rule: impact returns when brisk walking is
comfortable and symptom-free, and the app suggests a provider check before impact rather than
counting weeks (HOUSE HEURISTIC, direction only). Pelvic floor symptoms (leaking, heaviness,
pain) are a *stop and suggest care* signal, not a scale-back signal.

**Red lines.**
- No supine-position movement selected after T1 while `pregnancy-T2` or `-T3` is set.
- No new max-effort or true-failure work introduced during pregnancy for someone who was not
  already doing it.
- No return-to-impact suggestion in `postpartum-early` before the user reports symptom-free
  brisk walking.
- The generator constructs nothing at all if R6's absolute-contraindication key is present.

**When professional input is appropriate.** At declaration, once, non-alarmist; and at any
warning sign, where R6's RED path takes over.

---

### 3.3 Chronic cardiometabolic: hypertension, type 1 and type 2 diabetes, obesity, chronic kidney disease

**What changes in programming.** Very little in *content*, quite a lot in *sequencing,
timing, and the language used around effort*. WHO-2020 puts all of these under the chronic
conditions recommendation, which is the general adult recommendation restated verbatim: the
same 150 to 300 minutes and the same 2 or more days of muscle strengthening. CDC-CHRONIC
agrees. Neither reduces the target.

**Diabetes.** The ADA Standards of Care add three things beyond the general target that are
genuinely programming-relevant: aerobic activity should be spread "over at least 3 days with
a maximum of 2 consecutive inactive days"; resistance work on 2 to 3 sessions per week on
nonconsecutive days; and prolonged sitting should be interrupted, with the current standard
moving to roughly every 30 minutes rather than the older 90. Flexibility and balance training
2 to 3 times a week is suggested for older adults with diabetes. (Captured at
recommendation-summary level: diabetesjournals.org returned 403 through the session proxy, so
the letter grades were not captured and must not be quoted as if they were.)

The safety layer for diabetes is mostly *sensory and autonomic*, which is exactly why the
function-first model is the right one: reduced protective sensation in the feet (F10) changes
footwear and surface and makes unsupported balance work riskier, and it arrives from
neuropathy without the app ever needing the word. Hypoglycaemia risk (F9) is a treatment fact,
not a diagnosis fact: it applies to people on insulin or sulfonylureas and not to people on
metformin alone, and BodyT should ask "could your medication cause a low blood sugar during
exercise?" rather than asking what medication is taken.

**Hypertension.** R6 already sets the tier logic (YELLOW on declared high blood pressure, at
or above 160/90 or unknown blocks vigorous). The programming layer adds: no breath-holding
under strain (O3 valsalva flag), longer rests, and no ranked or competitive framing in copy
that would push effort. Isometrics are not banned; sustained maximal isometrics with
breath-holding are.

**Obesity.** The single most important thing is that obesity is *not* a programming category.
What it produces is a set of ordinary function facts: F2 floor transfer, F6 position
tolerance, F7 joint loading tolerance, O5 impact, O11 environment (heat dissipation, equipment
fit). Every one of those is already expressible. BodyT must not have an obesity branch. It
must have a floor-transfer question. This is the clearest diagnosis-invariance case in the
whole pack and it is in section 7.

**Chronic kidney disease.** Falls under the same WHO-2020 chronic conditions recommendation.
No CKD-specific tier-A dose was captured in this session, so BodyT ships nothing CKD-specific:
the correct behaviour is the general chronic-conditions recommendation plus whatever function
facts the person reports, plus R6's existing renal-disease branch of the ACSM algorithm, which
already routes known renal disease into the clearance pathway. Marked as a **known gap**, not
filled with a guess.

**What information is actually needed.** Could exercise make your blood sugar drop? Do you
have reduced feeling in your feet? Do you get dizzy standing up? Has a clinician told you to
avoid anything specific? Can you get to the floor and back up? Everything else is R6's job.

**Operators.** O3 (valsalva off), O8 (moderate default, effort ceiling), O9 (spacing rule:
never more than two consecutive inactive days for diabetes; short movement breaks), O10
(effort language avoids "push"), O11 (footwear and foot checks when F10 protective sensation
is reduced; heat).

**Red lines.**
- No plan that leaves more than two consecutive inactive days when the diabetes spacing flag
  is set.
- No breath-hold cue, and no maximal isometric hold prescription, when the valsalva flag is
  set.
- No barefoot or minimal-footwear suggestion, and no unsupported single-leg balance, when
  protective sensation is reduced.
- No CKD-specific dose of any kind until a tier-A source is captured.

**When professional input is appropriate.** New or worsening symptoms (R6 owns these), foot
wounds or numbness that is new, and any clinician-stated restriction the user reports.

---

### 3.4 Musculoskeletal: osteoarthritis, chronic low back pain, osteoporosis, joint replacement

These four look similar and behave very differently. Lumping them is the most common mistake
in consumer fitness software.

#### Osteoarthritis

**What changes.** The dose barely changes; the *framing* changes completely. ACR-OA gives
exercise a **strong** recommendation for knee and hip OA and explicitly refuses to rank
modalities: walking, strengthening, neuromuscular training and aquatic exercise are all
acceptable with "no hierarchy of one over another". OARSI-19 makes structured land-based
exercise a **Core Treatment** for knee, hip and polyarticular OA, alongside education. Weight
management is a strong ACR-OA recommendation for knee and hip OA in people who are overweight
or obese.

So OA is not a reason to train less. It is a reason to train differently: range and load are
adjusted, the movement is not deleted. R6's joint constraint table already encodes exactly
this (partial range, slow eccentrics, keep moving), and CDC-ARTH supplies the expectation
setting that R6 already captured.

**Operators.** O4 Range (the primary lever, and the one BodyT cannot currently express without
substituting a whole different movement), O3 Loading (start lighter, progress slower), O5
Impact (cap when symptomatic), O8 (avoid failure), O2 (support for painful loading).

**Red lines.** No total exclusion of a pattern purely because a joint is named: OA guidance is
"keep moving", and an app that deletes all squatting on a knee flag is applying a
contraindication that no source states. Route around depth, not around the pattern.

#### Chronic low back pain

**What changes.** NICE-NG59 is unusually direct about what *not* to do, and most of the
do-not list is about passive interventions BodyT would never offer anyway (traction, belts and
corsets, foot orthotics, rocker soles, TENS, ultrasound). What is load-bearing for BodyT is
1.2.1: self-management advice tailored to needs and capabilities, including "encouragement to
continue with normal activities"; and 1.2.2: exercise programmes tailored to "specific needs,
preferences and capabilities", with the modality menu (biomechanical, aerobic, mind-body or a
combination) left deliberately open.

The programming implication is the opposite of the folk model. Chronic low back pain is not a
reason to switch the plan to "core only" or to make the person fragile in the copy. The
strongest evidence-consistent posture is: keep training, adjust what provokes, do not tell
the person their back is damaged.

**Operators.** O4 Range, O3 Loading (axial ceiling early), O1 Position (supported hinge
patterns, elevated pulling starts), O10 Instruction (the copy is the intervention here; never
imply fragility).

**Red lines.** No "protect your back" or damage-implying copy. No prescription of a spinal
brace, belt, or orthotic (NICE-NG59 do-not-offer, and BodyT should not suggest what a
guideline body says not to offer). No indefinite pattern deletion: a hinge that is uncomfortable
today is regressed, not removed from the athlete's future.

#### Osteoporosis and low bone density

This is the one place where a *label* legitimately produces a loading rule that function
questions cannot discover, and it is therefore the model for how such cases are handled: the
flag is a loading-tolerance fact, stored as such.

**What changes.** ROS-SSS is emphatic in both directions. Strength: "A combination of
weight-bearing (with impact) and muscle strengthening exercise is recommended to promote bone
strength", and muscle strengthening "should include progressive muscle resistance training;
up to moderate or high intensity is recommended". That is a *permission to load*, and it is
the part consumer apps usually get wrong by being too timid. Impact: moderate impact (jogging,
low-level jumping, hopping) is recommended for people with osteoporosis who do **not** have
vertebral or multiple low-trauma fractures; for those who do, "exercise at a lower impact level
(e.g. brisk walking rather than jumping) is recommended", explicitly described as "a
precautionary measure because of potential (but unproven) risks". Spine: "Movements or exercise
that involve sustained, repeated or end-range flexion should be amended or avoided unless
someone is already practiced with very good muscle tone", plus back-extensor strengthening,
starting at low intensity where there is a painful vertebral fracture. Balance: "Exercise to
improve balance and muscle strength is recommended", escalating to "specific and highly
challenging balance and muscle strengthening exercises, supervised by a trained health or
exercise professional" for people already falling.

Note the framing instruction, which is a copy rule, not a programming rule: focus on "how to"
messages rather than "don't do".

**Operators.** O5 Impact (two-level: moderate allowed, or brisk-walking-level only once
vertebral fracture is present), O4 Range and O1 Position (end-range and sustained spinal
flexion out), O3 Loading (progressive resistance is *encouraged*, up to moderate or high),
O2 Stability (balance work is a prescribed component, not an accessory).

**Red lines.**
- No loaded spinal flexion, no sustained or repeated end-range flexion, no loaded twisting.
  This is the clearest single red line in the entire pack and it cuts across sit-ups, crunches,
  loaded Russian twists, deep toe-touch stretching, and several yoga and Pilates staples that
  ROS-SSS names by category.
- No jumping or impact above brisk-walking equivalent once vertebral fracture is reported.
- The generator must not *lower* the strength prescription on account of the osteoporosis flag
  alone. Timidity here is a documented failure mode and ROS-SSS contradicts it directly.

#### Joint replacement

**What changes.** Two phases. Early (roughly the first 3 to 6 months, per TJA-CONSENSUS's
clearance window) is rehabilitation and belongs to a clinician, not to BodyT. After that the
governing fact is an *impact ceiling and an activity class list*, not a joint pain flag: over
95% of surveyed surgeons place no limit on low-impact activity (level walking, stairs, level
cycling, swimming, golf), medium impact is commonly allowed or allowed with prior experience,
and high-impact and contact activity is commonly not recommended, with the authors noting the
absence of long-term data. This is survey consensus, not a guideline body, and must be
labelled as such wherever it reaches copy.

Also note this is the population where the joint may be *pain-free and still constrained*.
R6's model assumes a joint flag means discomfort. A replaced joint is a durable impact and
range constraint on a joint that may feel completely normal, which is another argument for
separating "loads this joint" from "this joint is restricted".

**Operators.** O5 Impact (the primary lever), O4 Range (hip precautions where the user reports
them), O3 Loading (unrestricted for most; ceiling only where reported).

**Red lines.** Nothing programmed at all inside a user-declared early post-operative window
where a clinician is directing rehab; BodyT suggests following the clinician's programme and
stays out. No high-impact prescription for a replaced hip or knee unless the user reports
explicit clearance, and even then the copy carries the "surgeons commonly advise against this"
note rather than a confident yes.

**When professional input is appropriate.** Across all four: new night pain, pain that does
not settle within the CDC-ARTH expectation R6 already encodes, any new fracture, and the
whole early post-operative window.

---

### 3.5 Neurological: post-polio, stroke, Parkinson's, MS, spinal cord injury, cerebral palsy

The single most important thing about this group: **the neurological label predicts almost
nothing and the function profile predicts almost everything.** Two people with the same
diagnosis and different F1/F3/F5 profiles get materially different plans; two people with
different diagnoses and the same profile get nearly the same plan. Section 7 tests both
directions.

#### Post-polio and late effects of polio

The exception to almost every other pack here, and the reason this pack exists: **progressive
overload is not the default**. PHI-POLIO's opening position is the whole design brief:
"Advising all polio survivors not to exercise is as irresponsible as advising all polio
survivors to exercise." Its principles: intensity low to moderate; "the progression of the
exercise is slow, particularly in muscles that have not been exercised for a period of time";
pacing built into the programme; rotate types (stretching, aerobic, strengthening, endurance,
range of motion). Its stop rule is a *hold*, not a scale-back: "Polio survivors who experience
marked pain or fatigue following any exercise should hold that exercise until contacting their
health professional." And it expects initial design and supervision by a professional for two
to four months.

The functional fact underneath is asymmetric, segment-specific weakness with overuse risk
(F3, F8). Severely affected muscles do not respond to hard strengthening and can be made worse;
unaffected or mildly affected muscles behave normally. A single global intensity setting is
therefore *wrong by construction*: this population needs per-segment settings, which BodyT
cannot currently express.

**Red lines.** No progression policy that increases load or reps on a segment the user has
flagged as polio-affected without an explicit user-confirmed step. No "push through" copy. No
same-day repetition of a movement that produced marked post-exercise pain or fatigue.

#### Stroke

AHA-STROKE gives a full prescription and it is close to ordinary training with three changes:
intensity anchored low to moderate (40 to 70% VO2 or HR reserve, RPE 11 to 14 on the 6 to 20
scale), 3 to 5 days a week, 20 to 60 minutes, with the important structural permission that
"multiple short bouts of moderate-intensity physical exercise (eg, three 10- or 15 minute
exercise bouts), repeated throughout the day, may be better tolerated ... than a single long
session". Resistance: 1 to 3 sets of 10 to 15 reps of 8 to 10 exercises at 50 to 80% of 1RM,
2 to 3 d/wk, "resistance gradually increased over time as tolerance permits". Flexibility 2 to
3 d/wk with 10 to 30 second holds. Neuromuscular balance and coordination work 2 to 3 d/wk as
a named fourth component.

The functional facts: hemiparesis is F3 asymmetric or single-side-only; grip loss is F4;
balance and fall risk is F5; sensory loss is F10; aphasia and cognitive change is F11 (and
AHA-STROKE explicitly notes that people with communication difficulty were underrepresented in
trials, which is a candour BodyT should copy rather than paper over).

**Red lines.** No bilateral-only lower-body prescription for an F3-asymmetric user: bilateral
loading lets the strong side do the work and the plan silently trains the asymmetry. No
unsupported balance progression without a support point in the environment (O11). No copy that
assumes equal capability on both sides ("do 10 each side" is wrong when one side cannot do 3).

#### Parkinson's

PF-ACSM is the most complete FITT table captured in this pack and it maps almost one-to-one
onto BodyT's operators. Aerobic: at least 3 d/wk, moderate 40 to 60% HRR (RPE 12-13/20 or
3-4/10), progressing to vigorous "when physiologically appropriate and safe", at least 30 min
per session, building to at least 150 min/wk. Strength: 2 to 3 d/wk on nonconsecutive days,
40 to 50% 1RM for beginners and 60 to 70% for advanced, 10 to 15 reps starting out, at least
1 set of 8 to 12 (about 60% 1RM) progressing to 3 sets of 8 to 10 to fatigue, 30 to 60 min per
workout, "focus on extensors". Balance, agility and multitasking: 2 to 3 d/wk focused, daily
integration where possible, with multidirectional stepping, weight shifting, reaching, large
amplitude movements, turning, obstacles, backwards walking, sit-to-stand, and dual-task
training. Flexibility: 2 to 3 d/wk or daily, static holds 15 to 60 s, 2 to 4 reps.

Its disease-related considerations row is a list of operator settings: freezing-of-gait risk,
orthostatic hypotension, blunted heart rate response to exercise, arrhythmia risk from disease
or medication, "Timed for ON periods of optimal functioning", "For safety, avoid heavy free
weights", allow upper-extremity support when needed, and consider osteoporosis and spinal
stenosis comorbidity.

Two of those break BodyT's current assumptions outright. **Blunted heart rate response** means
any heart-rate-derived intensity is unreliable, so effort must be RPE or talk test. **Timed for
ON periods** means the *scheduling* of a session is part of the prescription, which BodyT has
no concept of beyond a weekday.

**Red lines.** No heavy free-weight prescription (PF-ACSM is explicit). No heart-rate-based
intensity target. No balance drill without a declared support point. No plan that assumes any
time of day is equivalent.

#### Multiple sclerosis

The load-bearing facts are heat sensitivity (F9 thermoregulatory) and fatigue that is *not*
post-exertional malaise but is genuinely limiting (F8 elevated-fatigue-normal-recovery). The
Kalb 2020 consensus (National MS Society with CMSC), which stratifies recommendations by EDSS
band including levels 7.0 to 9.0 where a person may have no functional ambulation, was
paywalled through the session proxy (sagepub 403), so this pack carries **no MS-specific
numeric dose**. What it carries instead, sourced: WHO-2020's chronic conditions and disability
recommendations apply, and the modality and environment adjustments are the ones the function
model already produces.

**Operators.** O11 Environment (cool room, cool time of day, water-based options), O9 Session
structure (several short bouts rather than one long one, the same permission AHA-STROKE grants
explicitly), O2 and O1 (recumbent and seated modalities where balance or ambulation is
limited).

**Red lines.** No hot-environment prescription. No session that cannot be split. No assumption
that a bad day is non-adherence: for MS, MS-like fatigue and relapse states, a missed session
is data, not a streak break, which collides directly with BodyT's streak and quit machinery
(section 8).

**Known gap.** The EDSS-banded doses. Do not fill them from memory.

#### Spinal cord injury

SCI-PAG is unusually clean and should be used verbatim: for fitness, "at least 20 min of
moderate to vigorous intensity aerobic exercise two times per week AND three sets of strength
exercises for each major functioning muscle group, at a moderate to vigorous intensity, two
times per week"; for cardiometabolic health, "at least 30 min of moderate to vigorous intensity
aerobic exercise three times per week". Note the phrase **"each major functioning muscle
group"**, which is the entire function-first principle stated inside a guideline: the muscle
groups that function are trained normally, and the rest are not a reason to lower the target.

The functional profile is F1 wheeled, F2 transfer-dependent, F3 possibly asymmetric, F4 grip
(critical for tetraplegia, where straps and cuffs are the difference between a movement
existing and not), F5 seated balance with or without trunk control, F9 autonomic (dysreflexia
and thermoregulation above roughly T6), F10 protective sensation absent below the level of
injury.

Two consequences BodyT does not currently handle. First, **shoulder overuse is the dominant
long-term injury risk** for manual wheelchair users, because the shoulder is a weight-bearing
joint for transfers and propulsion all day. A plan that piles pressing volume on top of a day
of propulsion is worse than a plan that does the same for an ambulatory user, and BodyT's
volume ceilings are per-muscle-region within a session, not per-day-including-life. Second,
**pressure injury and skin protection** make seat time and position duration a real constraint
that has no representation at all. Both are marked HOUSE HEURISTIC for magnitude, sourced only
in direction, and the SCI-PAG article captured here carries no safety text of its own.

**Red lines.** No prescription that assumes standing or floor transfer. No grip-dependent
movement selected as the only option in a pattern when F4 is `none` or `assisted`. No
above-baseline pressing volume week when the user reports shoulder pain, because the baseline
already includes propulsion.

#### Cerebral palsy

CP-VERSCHUREN (abstract-level capture only) gives aerobic prescription of 2 to 3 times per
week at 60 to 95% peak heart rate or 40 to 80% heart rate reserve, minimum 20 minutes per
session, for at least 8 consecutive weeks when training three times weekly or 16 weeks at
twice weekly, and records that people with CP spend 76 to 99% of waking hours sedentary. The
strength recommendations from the same paper were not captured and must not be invented.

The functional profile is the point: CP spans GMFCS I (walks without limitation) to GMFCS V
(transported in a wheelchair). Spasticity, selective motor control and fatigue vary
independently of the label. NSCA-OA's mobility-limitation section is the practical guidance
that generalizes: prioritize multijoint movements, use bilateral closed-chain work where
tolerated, and where standing is not practical use seated strength plus a recumbent cycle,
stepper, or upper-body ergometer.

**Red lines.** No adult-normed progression rate applied to a growing adolescent with CP
without the youth rules of 3.10 also applying. No assumption that a movement performed
differently is performed wrong: BodyT's form cues must not fight the user's own motor
strategy.

---

### 3.6 Fatigue and exertional intolerance, including ME/CFS with post-exertional malaise

This pack is summarized here and specified in full in **section 4**, because it is the one
population where BodyT's core progression logic must be structurally unable to run rather than
merely configured conservatively.

Three states must be distinguished, and they are distinguished by *what happens after
exertion*, not by how tired the person feels:

| State | Signature | Progression policy |
|-------|-----------|--------------------|
| **Ordinary deconditioning** | Tired during and shortly after; recovers within hours; next session is normal or better | Normal progression. Fatigue is the training signal |
| **Elevated fatigue, normal recovery** (MS, cancer treatment, long-term illness, many chronic conditions) | Genuinely lower ceiling; recovery is slower but monotone; effort does not cause a delayed crash | Normal progression logic at a lower ceiling and a slower rate. Shorter, more frequent sessions |
| **Post-exertional symptom exacerbation / PEM** (ME/CFS, some long COVID, some post-viral states) | Delayed, disproportionate, multi-system worsening. CDC-PEM: symptoms "can begin shortly after the exertion or several days later, typically getting worse 12 to 48 hours after the activity" and can last days or weeks | **Progression logic is disabled.** Section 4 |

Getting the middle row confused with the bottom row is the harm. Getting the top row confused
with the bottom row is the other harm, in the other direction, and NICE-NG206's history is
exactly that story.

---

### 3.7 POTS and orthostatic intolerance

**What changes.** The *position* of the whole programme, and the direction of progression:
horizontal to upright, rather than light to heavy.

DI-POTS states the principle plainly: "Dysautonomia patients usually fare better with
exercises that do not cause orthostatic stress. Reclined exercises like stretches, yoga and
gentle weight lifting done from a seated or laying down position, recumbent biking, rowing and
swimming are examples", and "Only after the patient has spent a substantial amount of time
building up tolerance to these exercises, should the patient attempt to begin upright exercises
like jogging or upright biking." The three-level structure (reclined gentle movement, recumbent
cardio and weights, upright work) is a progression ladder along the *position* axis. Leg and
core strengthening carries a mechanistic rationale: "The stronger our muscles are, the more
efficiently they use oxygen, the better we will be able to tolerate orthostatic stress."

The named protocols (Levine or Dallas, and the CHOP modification) are clinical programmes
delivered under supervision, typically 3 to 8 months, with heart-rate zones. BodyT should
reference their *shape* (recumbent first, months not weeks, upright last) and must not
reproduce their heart-rate prescriptions: they were captured here only through secondary
clinic and blog sources, which is not tier-A, and a supervised cardiac-rehab-derived protocol
is not something a consumer app administers.

**Operators.** O1 Position (the primary and unusual lever: position is the progression), O9
Session structure (long transitions, generous rest), O11 Environment (heat, hydration, upright
time before and after), O8 (upright volume is the thing being progressed, not load).

**Red lines.**
- No movement requiring a rapid supine-to-stand transition (R6's FC-ORTHO already encodes
  this; here it becomes a whole-programme default rather than a per-movement veto).
- No upright cardio prescribed as an entry point.
- No heart-rate-zone prescription copied from a clinical protocol.
- **The PEM overlap check is mandatory.** A meaningful share of people with orthostatic
  intolerance also have PEM, and DI-POTS's page carries no PEM caution at all. If the user
  reports delayed post-exertional worsening, section 4 wins over this pack, always. Recumbent
  exercise is still exertion.

---

### 3.8 Cancer treatment and survivorship

**What changes.** The target does not: ACSM-CANCER's floor is "avoid inactivity" and be as
physically active as possible. What changes is that the *goal* becomes outcome-specific, the
*variability* is much higher day to day, and there is a real precaution list.

ACSM-CANCER's per-outcome doses (strong evidence): anxiety and depressive symptoms, aerobic
at 60 to 80% HRmax, 30 to 60 min, 3x/wk for 12 weeks; fatigue, aerobic at about 65% HRmax,
30 min, 3x/wk for 12 weeks; health-related quality of life, combined aerobic plus resistance
2 to 3x/wk for 12 weeks; breast-cancer-related lymphoedema, resistance at 60 to 70% 1RM, 1 to
3 sets of 8 to 15 reps, 2 to 3x/wk; physical function, aerobic or combined 3x/wk for 8 to 12
weeks. Moderate evidence for bone health and sleep. Insufficient evidence for cardiotoxicity,
neuropathy, cognitive function, falls, nausea, pain, sexual function and treatment tolerance,
and BodyT should say nothing about those.

The counterintuitive one worth naming: **for cancer-related fatigue the prescription is
exercise**, not rest. That is the opposite of section 4's population and it is why the two must
never be merged into one "fatigue" concept.

Precautions, verbatim where they bite: for bone metastases, "avoid contraindicated movements
that place an excessively high load on fragile skeletal sites ... high-impact loads,
hyperflexion or hyperextension of the trunk, flexion or extension of the trunk with added
resistance, and dynamic twisting motion" (note this is nearly identical to the osteoporosis
red line, which is a strong argument for one shared `spinalLoadRestricted` flag rather than two
condition branches). For peripheral neuropathy, balance assessment first, and stationary
cycling or water exercise as substitutes for walking where stability is affected. For
lymphoedema, supervised teaching first and "start low, progress slow". After stem cell
transplant, full immune recovery before returning to public gym facilities. And a pre-exercise
medical evaluation list that includes peripheral neuropathy, arthritis, poor bone health and
lymphoedema, with physician clearance required for lung or abdominal surgery, cardiopulmonary
disease, ataxia, extreme fatigue, or bone metastases.

**Operators.** O8 (a much wider daily variance band; treatment days are not training days),
O5 and O4 (bone metastases and bone health), O2 (neuropathy and balance), O3 (lymphoedema
slow load progression), O11 (immune status and shared facilities).

**Red lines.**
- No high-impact, no loaded trunk flexion or extension, no loaded twisting when the bone
  restriction flag is set.
- No progression on a resistance movement for a limb with lymphoedema faster than the slowest
  rate the engine can express.
- No streak penalty, no quit-risk escalation, and no "you missed again" copy during treatment.
- No claims about exercise and any outcome ACSM-CANCER lists as insufficient evidence.

---

### 3.9 Sensory and cognitive access

Not a population so much as a channel. Two people with identical physical function and
different sensory or cognitive profiles need the same *plan* and a different *app*.

**What changes.** Nothing in exercise selection except where balance depends on vision or
proprioception; everything in how the session is delivered.

- **Low vision or blind (F10).** Rest timers and set cues need a non-visual channel (audio,
  haptic). Movement instruction shifts from "watch the demo" to spatial and tactile language.
  Unsupported balance work loses a sensory input and must default to a supported variant.
  Video-first guidance (`ExerciseDef.videoId`, `videoQuery`) has no fallback today.
- **Deaf or hard of hearing (F10).** Any audio cue needs a visual or haptic equivalent. This is
  the mirror of the above and the app currently assumes both channels are available.
- **Reduced protective sensation (F10).** Changes footwear, surface, and the need for skin
  checks (diabetes, SCI, chemotherapy-induced neuropathy all arrive here from different
  labels, which is the function-first argument again).
- **Cognitive (F11).** Fewer novel movements per session; the same movements in the same order;
  shorter cue text; one instruction at a time; and critically, **rotation and variation become
  costs rather than benefits**. BodyT rotates accessories at block boundaries by design. For
  this profile that rotation is the thing to switch off, and `Prefs.pinned` already proves the
  primitive exists.

NSCA-OA's cognitive-impairment section supports resistance training in this group rather than
excluding it, and NCHPAD's whole posture is that the activity adapts and the person is not
excluded. Neither supplies a numeric dose change, and none should be invented.

**Operators.** O10 Instruction (the main one), O7 Complexity, O2 Stability (when vision or
proprioception is the missing input), O11 Environment.

**Red lines.**
- No session whose only progress cue is a colour, an audio beep, or a video.
- No unsupported single-leg or eyes-closed balance work when vision or protective sensation is
  reduced.
- No automatic movement rotation when the routine-stability flag is set.
- No accessibility feature gated behind declaring a disability: these are settings, and they
  should be reachable by anyone who wants them.

---

### 3.10 Youth and adolescent

**What changes.** Supervision and technique replace load as the governing variable, and the
entire literature is written as "properly designed and supervised" for a reason: NSCA-YOUTH
repeats that phrase verbatim in all seven of its position statements, and attributes reported
injuries to "inappropriate training techniques, excessive loading, poorly designed equipment,
ready access to the equipment, or lack of qualified adult supervision", not to resistance
training itself.

NSCA-YOUTH's Table 1, verbatim in the parts that matter: qualified instruction and supervision;
a safe environment; a 5 to 10 minute dynamic warm-up; "Begin with relatively light loads and
always focus on the correct exercise technique"; 1 to 3 sets of 6 to 15 reps on a variety of
upper and lower body strength exercises; 1 to 3 sets of 3 to 6 reps on power exercises;
"Increase the resistance gradually (5-10%) as strength improves"; 2 to 3 times per week on
nonconsecutive days; cool-down; "Listen to individual needs and concerns throughout each
session".

WHO-2020 sets the activity target: children and adolescents (including those living with
disability) should average at least 60 minutes per day of moderate-to-vigorous, mostly aerobic
activity across the week, with vigorous aerobic and muscle-and-bone-strengthening activity at
least 3 days a week.

**The hard question is whether BodyT should serve minors at all.** That is a product and legal
decision, not a research one, and this pack does not make it. What research says is: if the app
does serve minors, an unsupervised, self-directed, load-progressing plan for a 13-year-old is
the exact configuration every position statement conditions its safety claim against. The
honest options are (a) do not serve minors, (b) serve a technique-and-habit product with the
load lever removed, or (c) require a declared supervising adult. There is no fourth.

**Operators.** O7 Complexity (technique first), O3 Loading (5 to 10% increments, light start),
O8 (1 to 3 sets, 6 to 15 reps, 2 to 3 d/wk nonconsecutive), O10 Instruction.

**Red lines.**
- No 1RM testing, and no percentage-of-1RM prescription.
- No progression to failure.
- No load increase greater than the sourced 5 to 10% step.
- No plan at all for a user below the product's declared minimum age.

---

## 4. THE ME/CFS AND PEM EXCEPTION

Every other pack in this document configures BodyT's progression logic. This one turns it off.
It gets its own section because a configuration setting can be got wrong by a future session
in a way that a missing code path cannot.

### 4.1 What the guideline actually says

NICE-NG206 is unambiguous, and the wording matters because BodyT's default behaviour is
described in it as the thing not to do.

- **1.11.9**: "Do not advise people with ME/CFS to undertake exercise that is not part of a
  programme overseen by an ME/CFS specialist team, such as telling them to go to the gym or
  exercise more, because this may worsen their symptoms."
- **1.11.12**: "If a physical activity or exercise programme is offered, it should be overseen
  by a physiotherapist in an ME/CFS specialist team."
- **1.11.13** (the only approved shape): establish a baseline "at a level that does not worsen
  their symptoms", **initially reduce below that baseline**, maintain it successfully for a
  period before attempting to increase, make "flexible adjustments to their physical activity
  (up or down as needed) ... while staying within their energy limits", and recognise a
  flare-up or relapse early.
- **1.11.14** (the prohibition): do not offer "any programme that does not follow the approach
  in recommendation 1.11.13 or that uses fixed incremental increases in physical activity or
  exercise, for example, graded exercise therapy", nor "generalised physical activity or
  exercise programmes, this includes programmes developed for healthy people or people with
  other illnesses", nor programmes "based on deconditioning and exercise avoidance theories as
  perpetuating ME/CFS".
- **1.11.15**: during a flare-up or relapse, stabilise by "reducing physical activity to within
  their current energy limits", and only once symptoms stabilise and the person feels able,
  "establishing a **new** physical activity baseline".
- **1.11.16**: recovery time after a flare-up "varies from person to person".

CDC-PEM supplies the mechanism and the harm statement: pacing means keeping all energy
expenditure, "physical, cognitive and emotional, within limits that can be tolerated";
"studies have demonstrated a lowered anaerobic threshold in patients with ME/CFS, suggesting
impaired aerobic energy metabolism. Increased activity can thus be harmful if it leads to
PEM"; "For some patients, even activities of daily living can trigger PEM." It also names the
tension honestly rather than pretending it away: "Inactivity can result in muscle
deconditioning. Providers should individualize a threshold level of activity for each
patient."

### 4.2 Why BodyT's default logic cannot merely be configured down

Read `src/engine/reps.ts`. `repStepFor` is a pure state machine over the last logged session,
and its three transitions are:

- fell short: hold reps, back off load only if it also felt heavy
- cleared and felt heavy: hold everything
- cleared: add a rep, or at the top of the range wrap to the bottom and hand the step to load

There is no transition in which a *successful, comfortable* session produces less work next
time. The policy is monotone non-decreasing by construction, which is correct for every other
population in this document and is precisely the "fixed incremental increases" shape
NICE-NG206 1.11.14 names.

Turning the increment down to zero does not fix it, for three reasons:

1. **Success is the trigger.** In a PEM state, a session that felt fine is not evidence of
   headroom. The crash arrives 12 to 48 hours later (CDC-PEM). Any policy keyed on
   within-session success reads the wrong signal at the wrong time.
2. **The baseline direction is inverted.** 1.11.13 requires *initially reducing below*
   baseline. BodyT has no concept of a deliberate reduction that is not a deload, a taper, or
   a failure. All three of those return.
3. **A configured value can be re-enabled.** A future session tuning a constant, or a user
   toggling something, or an adherence-driven heuristic deciding this person is doing well,
   can all re-enter the increment path. A missing code path cannot.

### 4.3 What the app should do instead

**Refuse the domain, then offer something honest inside it.** Three viable product postures,
in descending order of what the evidence supports for an unsupervised app:

**(A) Decline to generate, and say why.** The safest and the most defensible reading of
1.11.9 and 1.11.12: a self-directed app is by definition not an ME/CFS specialist team. Copy
suggests specialist support and offers the non-training parts of the app (logging, meals,
whatever exists) without a plan. Nothing is generated.

**(B) Pacing mode: a log and an envelope, not a programme.** The app stops prescribing and
starts *observing*. This is CDC-PEM's ask / review / brainstorm loop implemented as software:
the user records activity and symptoms, the app surfaces patterns between activity and later
symptom worsening, and it never suggests more. It may suggest *less*, and it may suggest
splitting or stopping. This is arguably the most useful thing BodyT could ship for this
population and it is a different product surface from a plan.

**(C) Symptom-triggered regression only.** If any prescription exists at all, its only
automatic movement is downward. Increases are user-initiated, one step, with an explicit
confirmation, after a stability period the user declares, and are immediately reversible.

**J6 should ship the refusal (A) plus the flag that makes (B) and (C) possible later.** It
should not ship a graded programme with a slower slope, which is (A) done badly.

Copy principles for this path (no em dashes, no diagnosis, suggest only):
- Never say "deconditioning", never imply the person needs to build up, never use "push",
  "earn", "challenge yourself" or streak language.
- Name the user's report, not a condition: "you told me that effort can leave you worse for
  days".
- Offer the exit: this setting is theirs to change, and changing it is not a failure.

### 4.4 The typed refusal

The mechanism mirrors R6's RED-tier design (a discriminated union whose refusing variant
carries no plan-constructing data), because that pattern is already established in this repo
and reusing it costs nothing.

```
// Data only. The PEM variant deliberately carries no increment.
export type ProgressionPolicy =
  | { kind: 'standard'; repStep: 1; loadStepLb: number }
  | { kind: 'conservative'; repStep: 1; loadStepLb: number; holdWeeks: number }
  | { kind: 'pacing' }        // NO fields. There is nothing to increase.

// The engine entry point takes the union, and the pacing arm returns a
// prescription derived only from the declared envelope, never from history.
export function nextPrescription(p: ProgressionPolicy, ...): Prescription
```

The load-bearing property is that `{ kind: 'pacing' }` has no numeric field at all. A future
session cannot "just bump it", because there is nothing to bump; adding one is a visible type
change that fails review and fails the guard test below.

`repStepFor` is not called on the pacing path. That is enforced structurally: the pacing arm
lives in a module that does not import `reps.ts`, and `structure.test.ts` asserts the missing
import, in the same style as the layering rules it already enforces.

### 4.5 The test that proves the generator cannot escalate

Four tests, in the order they should be written (all before any feature code):

**T-PEM-1 (the headline property).** Simulate 12 weeks of *perfect, easy* adherence for a
profile with `postExertional: 'exacerbation'`: every session completed, every set cleared,
every effort rating "easy", every readiness answer good. Assert that for every exercise, at
every week, prescribed reps and prescribed load are less than or equal to week 1, and total
weekly working sets is less than or equal to week 1. **The signal that normally drives
progression is present in maximum strength and produces zero increase.** This is the exact
inverse of the golden progression test and should sit beside it so the contrast is visible.

**T-PEM-2 (regression still works).** Same profile, one session reporting worse symptoms the
following day. Assert the next prescription is strictly lower, and that the reduction persists
rather than rebounding on the next good day. Cross-reference NICE-NG206 1.11.15: after a
flare-up a *new* baseline is established, so the old one must not be recoverable
automatically.

**T-PEM-3 (no path from pacing to standard).** Exhaustively enumerate every
`ProgressionPolicy` transition reachable from engine code and assert none produces `standard`
or `conservative` from `pacing` without an explicit user action carrying a distinct event
type. Adherence, streaks, calibration, the phase machine, deload exit, and the quit-risk
model must all be unable to promote it.

**T-PEM-4 (structural).** `structure.test.ts`: the pacing module does not import `reps.ts`,
`progression`-adjacent modules, or the phase machine, and the `pacing` variant has no numeric
member. Written as a source-level assertion so it fails at review time, not at runtime.

Plus one copy test, cheap and worth it: **T-PEM-5**, no string reachable in the pacing path
matches the escalation vocabulary (`push`, `harder`, `build up`, `more`, `streak`,
`deconditioning`), on the same lint pattern already used for em dashes.

### 4.6 What this pack deliberately does not do

- It does not decide whether ME/CFS users can be identified reliably from free text. R6 owns
  classification; the honest input here is a plain function question that anyone can answer:
  *"After activity, do you get worse a day or two later, and does it last more than a day?"*
  That question is answerable by people with long COVID, post-viral states and ME/CFS alike,
  requires no diagnosis, and is the actual programming discriminator.
- It does not claim exercise is harmful in general. It claims the *fixed incremental increase
  policy* is contraindicated for this profile, which is what NICE-NG206 says.
- It does not extend the refusal to cancer-related fatigue, MS fatigue, or ordinary
  deconditioning, where the evidence points the other way (section 3.6 table, and
  ACSM-CANCER's fatigue prescription being exercise).

---

## 5. CAPABILITY MATCHING

The rule: **population constraints select and modify exercises through the existing movement
graph. There is no parallel adapted-exercise catalog and no per-population branch in the
generator.** A population pack is a set of operator values; operators are graph queries and
prescription modifiers. If a pack cannot be expressed that way, the graph is missing an axis
and the fix is the axis, not a branch.

### 5.1 What the graph already does correctly

`src/plan/movement.ts` is closer to right than it looks. Four of its properties do real work
for this pack:

- **`pattern` as the substitution invariant.** `substitutesFor` preserves pattern and refuses
  muscle-overlap swaps. That is exactly the semantics population modification needs: a
  wheelchair user's horizontal push is still a horizontal push.
- **`stress: Joint[]` plus `avoid`.** R6's whole functional constraint table lands here with no
  new machinery.
- **`regressions` / `progressions` chains.** These already encode "one step easier that this
  person can do", which is the substrate for every on-ramp in section 6.
- **`skill` and the `maxSkill` default.** The comment in `SubstituteQuery` about a leg press
  having no legal substitute at skill 0 is precisely the failure mode a population layer would
  hit constantly, and it has already been fixed once.

`AdaptContext.limited` and the `unroutable` handling in `engine/adapt.ts` are also already the
right shape: the code knows the difference between a joint it can route around and one it
cannot, and between a stated limitation and an inferred one. The population layer extends that
distinction rather than replacing it.

### 5.2 Where the graph is insufficient today

Nine gaps, ordered by how many packs they block.

**G1. No position axis.** There is no way to ask "which movements require standing?", "which
require getting to the floor?", "which are supine?". This blocks: pregnancy T2 and T3 (supine
after the first trimester is a WHO-2020 named avoidance), all wheeled locomotion, frailty and
`cannot-get-to-floor`, POTS (where position is the progression axis itself), and every seated
substitution NSCA-OA recommends when standing is not practical. It is the single highest-value
addition.

Today the only encoding is to invent a `Joint`-shaped key, which corrupts a type that
`MOVEMENT[].stress` depends on. R6 already flagged this and worked around it with string keys.

**G2. No balance-demand axis.** `laterality` is a bad proxy: a single-arm dumbbell row is
`unilateral` and needs almost no balance; a Bulgarian split squat is `unilateral` and needs a
lot. This blocks the WHO-2020 older-adult balance pillar, STEADI-derived progressions,
PF-ACSM's balance-agility-multitasking domain, MS and stroke fall risk, and neuropathy.

**G3. No impact axis on strength movements.** `athletic.ts` carries impact for its 91 drills;
the 111 strength entries have nothing. This blocks the osteoporosis two-level impact rule
(ROS-SSS moderate impact versus brisk-walking-level once vertebral fracture is present), joint
replacement, and cancer bone metastases.

**G4. No spinal-load axis.** There is no flag for loaded spinal flexion, loaded extension, or
loaded rotation. This is the red line shared by ROS-SSS and ACSM-CANCER's bone-metastases list,
almost word for word, and it currently has to be approximated by the `lower-back` joint, which
over-blocks (it removes carries and supported hinges that are fine) and under-blocks (it does
not catch a loaded twist that stresses nothing on the joint list).

**G5. No grip-demand axis.** Blocks SCI and tetraplegia, stroke with hand involvement, arthritis
of the hand, and R6's `elbow` guidance about grip-intensive volume. Grip is an *implement*
change, not a pattern change, which is exactly the kind of modification the current graph
cannot make: `substitutesFor` can only hand back a different movement.

**G6. `avoid` is binary; there is no range modifier.** R6's own table says "Press within
pain-free range below shoulder height", "Box squats to a comfortable depth", "Partial range to
comfortable depth". The graph cannot express any of that. It can only delete the movement.
This is the most consequential mismatch between R6 and the code that exists today.

The concrete symptom, verifiable in the current catalog: **all seven `squat`-pattern movements
carry `stress: ['knee']`.** A user with a knee limitation therefore gets an empty substitute
list for the entire squat pattern, and the plan loses squatting altogether. ACR-OA and
OARSI-19 both make exercise a core or strongly recommended treatment for knee OA, and CDC-ARTH
says keep moving. Deleting the pattern is the opposite of the guidance. The graph is doing what
it was told; it was told the wrong thing, because "this joint is sensitive" and "this joint
cannot be loaded at all" are the same input today.

**G7. `stress` conflates "loads this joint" with "requires this segment to work".** For F3
(unilateral function) the question is not what a movement stresses, it is what it *requires*: a
barbell bench press requires two working arms, a dumbbell bench press does not. Hemiparesis,
limb absence, and severe post-polio asymmetry all need the second fact and there is nowhere to
put it.

**G8. Pattern-preserving substitution degrades to nothing rather than to something.** When a
whole pattern is unavailable (no standing at all, so the squat pattern is empty),
`substitutesFor` correctly returns `[]` and the caller must decide. `adapt.ts` handles this
gracefully for a *transient* flag. For a durable capability profile the right answer is a
**pattern fallback map**: squat and lunge fall back to a seated or supported lower-body push
for a person who can produce lower-body force, and to nothing at all for a person who cannot,
in which case the plan is legitimately upper-body and trunk plus a wheeled or arm-driven
conditioning modality, which is what SCI-PAG's "each major functioning muscle group" phrase
authorises.

**G9. `skill` is doing two jobs.** Its docstring is about execution technique ("harder to DO
CORRECTLY"), which is right. Section 3.9's cognitive profile needs a different number: how many
instructions and decisions the movement carries. A leg press is skill 0 and cognitively
trivial; a farmer's carry is skill 1 and also trivial; a dual-task balance drill from PF-ACSM is
cognitively heavy and mechanically simple. Reusing `skill` for O7 will mis-serve the population
that needs O7 most.

### 5.3 The proposed additions, minimal

Every addition is optional with a default that reproduces today's behaviour exactly. That is
the migration story and it is also the first guard test.

```
// movement.ts additions. All optional; absent means "no constraint",
// which is what the 111 existing entries mean today.
export type Position =
  | 'standing' | 'seated' | 'supine' | 'prone' | 'side-lying'
  | 'kneeling' | 'quadruped' | 'hanging'

export interface MovementMeta {
  // ... existing fields unchanged ...
  /** Positions the movement can be performed in. Absent = standing-or-seated, unconstrained. */
  positions?: Position[]
  /** Requires getting down to and up from the floor. */
  needsFloorTransfer?: boolean
  /** 0 supported … 3 unstable surface or unsupported single leg. */
  balance?: 0 | 1 | 2 | 3
  /** Ground reaction force. 0 none … 3 jumping and landing. */
  impact?: 0 | 1 | 2 | 3
  /** How much the hand must do. 0 none … 3 full body weight hanging. */
  grip?: 0 | 1 | 2 | 3
  /** Loads the spine in a way the osteoporosis and bone-lesion rules care about. */
  spinal?: ('axial' | 'flexion' | 'extension' | 'rotation')[]
  /** Segments that must function for the movement to exist at all. */
  requires?: ('both-arms' | 'both-legs' | 'one-arm' | 'one-leg' | 'trunk-control')[]
  /** Instructions and decisions to hold, distinct from execution difficulty. */
  cognitiveLoad?: 0 | 1 | 2 | 3
}
```

And on the query side:

```
export interface SubstituteQuery {
  // ... existing: can, avoid, maxSkill, maxFatigue ...
  positions?: Position[]        // intersect
  noFloorTransfer?: boolean
  maxBalance?: 0 | 1 | 2 | 3
  maxImpact?: 0 | 1 | 2 | 3
  maxGrip?: 0 | 1 | 2 | 3
  noSpinal?: ('axial' | 'flexion' | 'extension' | 'rotation')[]
  available?: ('both-arms' | 'both-legs' | 'one-arm' | 'one-leg' | 'trunk-control')[]
  maxCognitive?: 0 | 1 | 2 | 3
}
```

Each new filter is a `continue` in the same loop as the existing ones. No new algorithm, no
new catalog, no second graph. The scoring function is untouched.

Separately, and this is the part that is *not* a filter: **`avoid` needs a soft mode.**

```
export type JointConstraint = { joint: Joint; mode: 'exclude' | 'limit-range' | 'reduce-load' }
```

`exclude` is today's behaviour. `limit-range` keeps the movement and attaches a range note plus
a load reduction to the prescription, which is what R6's table actually describes and what
ACR-OA, OARSI-19 and CDC-ARTH all support. Without this, the knee-OA user loses squatting, and
that is a worse outcome than the one BodyT is trying to avoid.

### 5.4 What is still missing after all that

Honest list, so nobody thinks the graph is finished:

- **Per-side prescription.** `requires: ['both-arms']` says a movement needs two arms. It does
  not say "left side does 5, right side does 12". The `perSide` flag on `ExerciseDef` is
  presentational. Asymmetric prescription is a change to the prescription type, not to the
  graph, and it is the largest remaining piece for stroke, post-polio and single-side
  amputation.
- **Seated and arm-driven conditioning.** `conditioning` currently holds walking, jogging,
  hill and stair work, circuits, `bike-erg` and `rowing-erg`. There is no upper-body ergometer,
  no recumbent cycle distinct from the upright one, no wheelchair propulsion, and no
  water-based option. NSCA-OA names exactly the first two as the substitutions when standing is
  not practical; MS guidance points at water. Until those exist, a wheeled user's aerobic plan
  is `rowing-erg` and nothing else, and `rowing-erg` carries `stress: ['lower-back']`, which a
  lower-back constraint then deletes.
- **Session-level structure as data.** "Three ten-minute bouts" (AHA-STROKE), "timed for ON
  periods" (PF-ACSM), and "no more than two consecutive inactive days" (ADA-SOC) are all
  scheduling facts with no representation. `Prefs.sessionMinutes` is the only handle and it is
  a single number.
- **Daily life as load.** A manual wheelchair user's shoulders have already worked before the
  session starts. `engine/volume.ts` counts sets within a session against per-region ceilings
  and has no input for baseline daily load. Flagged HOUSE HEURISTIC; no tier-A source gives a
  number.

---

## 6. DOSE AND ON-RAMP BY POPULATION

R6 supplies the universal floor: the PAR-Q+ starting dose of 20 to 60 minutes of low-to-moderate
intensity, 3 to 5 days per week, building toward 150 minutes per week. R3 owns progression
increments, plateau detection and the layoff response in general. This section says only what
changes per population, and reconciles with R3 where the two collide.

Two conventions used in the table. **Rate** is how often the engine is permitted to attempt an
increase, not how big the increase is; R3 owns size. **Hold** means stay at the current
prescription, which is a normal state and not a failure.

### 6.1 The table

| Pack | Starting dose | Progression rate | Accelerate when | Hold when | Regress when |
|------|---------------|------------------|-----------------|-----------|--------------|
| Older adult, robust | Standard adult entry; add the WHO-2020 balance pillar 3+ d/wk from week 1 | Standard | Standard | Standard | Standard |
| Older adult, frail | 1 set per exercise (NSCA-OA); machine, band or isometric modality; load at a clearly submaximal level; sit-to-stand as a programmed exercise | Slower than standard: hold each rung an extra session before attempting the next (HOUSE HEURISTIC on the number; NSCA-OA sources the direction with "1 set for beginners and older adults with frailty progressing to multiple sets") | Chair-stand count improves, or the user reports daily tasks getting easier. Progress sets before load | Any new fall, new dizziness, or a week of missed sessions | Two sessions where the target was not reached, or any fall |
| Pregnancy, previously active | Continue accustomed activity with the position and heat operators applied | Maintenance is the goal, not progression. New PRs are not a target | Not applicable | Default state through T2 and T3 | Any warning sign (R6 RED), or symptom report |
| Pregnancy, new to exercise | R6 conservative floor, build toward 150 min/wk moderate | Standard but on minutes, not load | Comfortable completion for two consecutive weeks | Anything unfamiliar | Any warning sign, any pelvic or bleeding symptom |
| Postpartum | Restart at the conservative floor regardless of prior training, walking first | Symptom-governed. No calendar-based schedule (no tier-A number exists) | Symptom-free brisk walking is established | Any leaking, heaviness or pain | Same |
| Hypertension, diabetes, obesity, CKD | Standard adult entry at moderate; the ADA-SOC spacing rule if the diabetes flag is set | Standard | Standard | New symptoms (R6 owns) | Standard |
| Osteoarthritis | Standard entry with `limit-range` rather than pattern deletion; expect and normalise mild start-up soreness (CDC-ARTH, via R6) | Standard, but range before load: restore range first, then add load | Range improves at equal or lower pain | Pain that does not settle by the next session | Pain that is worse on the following day, or new swelling |
| Chronic low back pain | Standard entry; supported hinge and elevated pulling first | Standard | Standard | Flare-up: hold, do not delete | Flare-up with function loss; regress the movement, keep the pattern |
| Osteoporosis | **Do not start low.** Progressive resistance training to moderate or high intensity is recommended (ROS-SSS). Impact per the two-level rule. Balance work from week 1 | Standard on load; impact is not progressed past the ceiling | Standard | Standard | New back pain, height loss, or reported fracture: stop impact, suggest care |
| Joint replacement, past early phase | Standard entry with the impact ceiling set | Standard on load, never on impact | Standard | Standard | New joint pain, warmth, or instability: stop and suggest care |
| Post-polio | Low to moderate intensity; slow progression, "particularly in muscles that have not been exercised for a period of time" (PHI-POLIO); rotate types | **Per segment, not global.** Unaffected segments progress normally; flagged segments do not progress automatically at all | Only on unflagged segments, standard criteria | Default state for flagged segments | Marked pain or fatigue after a session: **hold that exercise**, per PHI-POLIO, and suggest a professional |
| Stroke | AHA-STROKE: aerobic RPE 11 to 14, 3 to 5 d/wk, 20 to 60 min or multiple 10-minute bouts; resistance 1 to 3 sets of 10 to 15 at 50 to 80% 1RM, 2 to 3 d/wk | "Resistance gradually increased over time as tolerance permits" (AHA-STROKE). Per side | Both sides tolerate the current rung | Asymmetry widening | New weakness or sensory change: R6 RED territory |
| Parkinson's | PF-ACSM: 10 to 15 reps starting out, at least 1 set of 8 to 12 at about 60% 1RM, progressing to 3 sets of 8 to 10 | Standard, on reps and sets before load. Never on heavy free weights | Standard, and only during ON periods | OFF-period sessions | Freezing episodes during a movement, new falls |
| Multiple sclerosis | WHO-2020 chronic conditions dose, split into short bouts; cool environment | Standard rate at a lower ceiling. **No numeric MS-specific dose in this pack: known gap** | Standard | Heat exposure, fatigue day, relapse | Relapse: hold the plan, do not count it as a lapse |
| Spinal cord injury | SCI-PAG verbatim: 20 min moderate-to-vigorous aerobic 2x/wk plus 3 sets of strength for each major functioning muscle group 2x/wk; cardiometabolic target 30 min 3x/wk | Standard on the functioning muscle groups | Standard | Shoulder soreness above baseline | Shoulder pain: cut pressing volume first, because propulsion is not optional |
| Cerebral palsy | CP-VERSCHUREN aerobic 2 to 3x/wk, 20 min minimum, 8 to 16 week blocks | Standard | Standard | Spasticity or pain increase | Same, plus the youth rules if under 18 |
| ME/CFS with PEM | **No starting dose is prescribed.** See section 4 | **No progression policy exists.** See section 4 | Never automatically | Default | Any delayed symptom worsening |
| POTS and orthostatic intolerance | Recumbent or reclined only; leg and core emphasis (DI-POTS) | **Position is the progression axis.** Upright exposure increases; load stays modest. Months, not weeks (DI-POTS: "a substantial amount of time") | Upright tolerance improves and stays improved | Default | Any presyncope, or PEM overlap reported: section 4 wins |
| Cancer, in treatment | ACSM-CANCER: "avoid inactivity" is the floor; the outcome-specific doses are targets, not entry points | Very slow, and expect non-monotone weeks. Treatment cycles dominate | A good week is not evidence: wait for two | Treatment days, low blood counts, any precaution flag set | Any new precaution flag |
| Cancer, survivorship | Standard adult entry with any residual precaution flags kept | Standard | Standard | Standard | Standard |
| Sensory or cognitive access profile | Standard dose. Only delivery changes | Standard on load. **Slower on novelty**: fewer new movements per block | Standard | New movement introduced this block | Confusion or unsafe execution reported |
| Youth | NSCA-YOUTH: light load, technique first; 1 to 3 sets of 6 to 15 reps, 2 to 3 d/wk nonconsecutive | Load increases of 5 to 10% "as strength improves" (NSCA-YOUTH), never to failure | Technique is consistently correct across a full session | Technique degrades | Technique degrades within a set |

### 6.2 Reconciling with the layoff and detraining literature

R3 already reconciled BodyT's `STALE_DAYS = 21`, `LAYOFF_STEP_DAYS = 28` and
`MAX_STALE_STEPS = 3` against Mujika and Padilla's detraining work and the CSCCa/NSCA transition
guidelines, and its conclusion is that BodyT has the levers backwards for a 2 to 4 week absence:
strength is largely retained to about 4 weeks, so the thing that must come down on return is
**volume**, roughly 50% in week 1 and 30% in week 2, while the load is kept. R7 does not reopen
that; it adds the population layer on top, and the population layer changes the *meaning of the
absence*, which changes the correct response.

**The buried assumption.** `repStepFor` treats time away as detraining: it resets the rep rung
at 21 days and hands back load past 28. That assumption is correct for a holiday, a busy month,
or a lost habit. It is wrong, in four different directions, for the populations in this pack.

| Absence means | Populations | Why the detraining response is wrong | Correct response |
|---|---|---|---|
| **A crash** | ME/CFS with PEM | The person is not detrained, they are past their limit. Returning to a fraction of the prior load is still an escalation relative to current capacity | NICE-NG206 1.11.15: reduce to within current energy limits, and establish a **new** baseline. The prior baseline must not be recoverable automatically. This is T-PEM-2 |
| **Disease activity or treatment** | MS relapse, cancer treatment cycles, post-viral flares | The prior rung may be unreachable for reasons training cannot address, and the absence recurs on a schedule the app does not know | Return at the user's declared current capacity, not at a fraction of the historical one. Never count the gap against a streak or a quit-risk model |
| **Protection** | Post-polio, and any overuse-sensitive segment | The absence may have been the correct response to overuse. Handing back "only" one load step still asks for more than the last session that caused harm | Hold at or below the pre-absence prescription for that segment; PHI-POLIO's rule is to hold the exercise entirely until a professional is consulted |
| **Expected life** | Pregnancy, postpartum, caregiving, treatment | The absence was planned and is not a lapse | Restart at the conservative floor with no penalty framing, and no "welcome back, you have lost ground" copy |

And one direction where the current constants may be **too generous**, not too strict: in frail
older adults and after hospitalization, function is lost faster than the general detraining
literature suggests, and NSCA-OA's whole frailty framing is built around how quickly disuse
compounds. R3's 21-day threshold is a general-population number. Applying it unchanged to a
frail 85-year-old is a HOUSE HEURISTIC either way, and the conservative choice is a shorter
window with a *volume* ramp rather than a load give-back, matching R3's general correction.

**The design consequence.** The layoff rule must take the capability profile as an input, not
just the day count:

```
function layoffResponse(daysAway: number, cap: CapabilityProfile): LayoffPlan
```

with four outcomes: `resume` (R3's general rule), `rebase` (declare a new baseline, PEM and
relapse), `hold` (post-polio and overuse-flagged segments), and `restart-floor` (planned
absence). None of them is "hand back N load steps and carry on", which is what the code does
today for every user.

**One thing that does not change.** For every population in this pack except ME/CFS with PEM,
the direction of the evidence is the same as for everyone else: some activity is better than
none (WHO-2020, CDC-CHRONIC), and the on-ramp exists so that people arrive at the same target,
not so they are permanently held below it. Over-restriction is the more common failure in this
domain, and the one an app is most likely to commit by accident.

---

## 7. PAIRED EVAL CASES

Every case is a **pair**: same goal, same equipment, same history length, one material
difference. Two families.

- **DIVERGE**: the difference is functional. The plans must differ, and the table names the
  specific difference to assert on. A pair that produces the same plan is a failure.
- **INVARIANT**: the difference is a label, a word, or a demographic fact with no functional
  content. The plans must be **byte-identical**. A pair that produces different plans is a
  failure, and is the diagnosis-leak bug this whole pack exists to prevent.

Both families are runnable against `generatePlan` as pure input-output tests with no UI, in
the style of the existing golden tests. INVARIANT cases are cheaper and should be written
first: they are the regression net that lets the DIVERGE work proceed safely.

### 7.1 DIVERGE: the five v12 mandated pairs

| # | Goal | A | B | Must differ in | Assertion |
|---|------|---|---|---------------|-----------|
| P1 | Get stronger, 3 d/wk, home dumbbells | 68, walks 5 km daily, has lifted for 20 years, chair-stand 18, no falls | 68, chair-stand 7, uses a cane outdoors, one fall last year, has not trained | Sets (3 vs 1), modality (free weight vs supported and band), balance content (absent vs present every session), impact (allowed vs none), floor work (present vs absent) | B contains a programmed balance progression and a sit-to-stand item; A does not. B has zero movements with `balance >= 2`. B has zero unsupported single-leg items. A's set count is at least double B's |
| P2 | Get stronger, 3 d/wk | Polio as a child, left calf slightly smaller, works full time, hikes, no new symptoms | Polio as a child, left leg braced, uses crutches, new fatigue and weakness over two years | Whether the affected segment progresses at all; modality; whether professional input is suggested | A progresses both sides on the standard rule. B's flagged segment has a progression policy that never auto-increases, and B's plan carries a professional-input suggestion. Neither plan deletes lower-body training |
| P3 | Build upper body, 4 d/wk, gym | Manual wheelchair user, T10 paraplegia, independent transfers, full trunk control, strong pressing history | Wheelchair user, C6 tetraplegia, no independent trunk control, assisted grip | Grip (implements and straps), stability (trunk-supported everything), pattern availability, whether pressing volume is capped | Both plans are built from the same movement graph, no adapted catalog. B selects only movements with `grip <= 1` or a strap-assisted variant, and only `balance 0` seated-supported options. A is capped on total pressing volume with the propulsion note; B is capped harder |
| P4 | Stay active through pregnancy, 3 d/wk | 30 weeks, no symptoms, lifted for 5 years | 30 weeks, reports regular painless contractions and some fluid leaking | Everything: B is not a plan | A generates: no supine, supported balance, moderate default, heat note, prior habit largely preserved. B generates **nothing**: R6 RED, warning-sign copy, care suggestion, no substitute session, no lighter alternative |
| P5 | Get fitter, has not exercised in 8 months | Deconditioned after a desk-job year, tired during workouts, fine the next day | Tired for two to three days after any exertion, worse 24 to 48 hours later, has crashed after a walk | Progression policy exists versus does not | A gets the standard on-ramp with normal progression. B gets `ProgressionPolicy = { kind: 'pacing' }` or a refusal (section 4.3), never a slower graded ramp. Assert B's 12-week simulated prescription never exceeds week 1 (T-PEM-1) |

### 7.2 DIVERGE: function differentiates

| # | Goal | A | B | Must differ in | Assertion |
|---|------|---|---|---------------|-----------|
| P6 | Lower-body strength | Knee discomfort in deep range, full range otherwise fine | Knee cannot bear load through any range, uses a cane | Range modifier versus pattern substitution | A keeps a squat-pattern movement with a `limit-range` modifier and a depth note. B's squat pattern falls back per the pattern fallback map. **Neither plan is empty of lower-body work.** This is the G6 regression test |
| P7 | General fitness, 65 | Osteoporosis, no fracture history, active | Osteoporosis with two vertebral fractures, back pain | Impact ceiling only | A includes moderate impact (low-level jumping or hopping) per ROS-SSS. B is capped at brisk-walking-equivalent impact. **Both** include progressive resistance training to moderate or high intensity, and both exclude loaded spinal flexion. Assert B's resistance prescription is not lower than A's |
| P8 | Build strength | Parkinson's, independent, no freezing | Parkinson's, freezing of gait, falls | Balance content, support requirement, free-weight ceiling | Both exclude heavy free weights (PF-ACSM) and both use RPE not heart rate. B requires a declared support point for every standing item and has zero `balance >= 2` movements |
| P9 | Aerobic fitness | MS, mild, no heat sensitivity reported | MS, reports heat makes everything worse, fatigue by afternoon | Session structure and environment copy | B is split into short bouts and scheduled with a cool-environment note. A is not. Neither plan reduces the weekly target |
| P10 | Get fitter | POTS, no post-exertional worsening | POTS **and** post-exertional worsening lasting days | Which pack wins | A gets the recumbent-first progression. B gets section 4. Assert B has no progression policy, even though the recumbent modality is identical |
| P11 | Regain strength | Breast cancer, treatment finished 2 years ago, no residual issues | In chemotherapy, fatigue varies by cycle week | Variance tolerance, streak behaviour, precaution flags | B's plan tolerates missed weeks with no streak penalty and no quit-risk escalation, and holds rather than regresses on a bad week. A is a standard plan |
| P12 | Return to training | Cancer survivor, no bone involvement | Cancer with bone metastases | Spinal and impact constraints | B excludes high impact, loaded trunk flexion and extension, and loaded twisting (ACSM-CANCER verbatim list). A does not. Note the constraint set is **identical** to P7B's osteoporosis set, which is the argument for one shared flag |
| P13 | Get stronger, 3 d/wk | Type 2 diabetes, metformin only, no neuropathy | Type 2 diabetes, insulin, reduced sensation in feet | Balance content, footwear and foot-check copy, session timing note | B has no unsupported single-leg work and carries the footwear and foot-check note. Both plans meet the same weekly target and both respect the no-more-than-2-consecutive-inactive-days rule |
| P14 | Get stronger | Stroke, mild residual weakness, symmetric grip | Stroke, dense hemiparesis, no functional grip on one side | Whether prescription is per side, and grip | B's plan prescribes per side with different targets, and selects only movements whose `requires` is satisfiable with one working arm or with strap assistance. A does not. Neither plan is upper-body-free |
| P15 | Build strength, 2 d/wk | 45, total knee replacement 3 years ago, no pain | 45, total knee replacement 6 weeks ago, in rehab | Whether a plan exists | A is a standard plan with an impact ceiling on the replaced side. B generates nothing for the lower body and suggests following the clinician's programme. This is the case the codebase's own comment about "eighteen months past a knee replacement" was written against, from the other end |
| P16 | General fitness | Blind, otherwise unrestricted | Sighted, otherwise identical | Instruction channel only | Movement selection is **identical**. Only cue text, timer channel and any balance default differ. This is a hybrid case: DIVERGE on delivery, INVARIANT on selection |
| P17 | Get stronger | 16, supervised by a parent who lifts | 16, unsupervised | Whether load progression exists | A gets NSCA-YOUTH increments of 5 to 10%. B gets a technique and habit product with the load lever removed, or no plan, per the product decision in 3.10. Neither gets 1RM testing or failure sets |
| P18 | Lose weight and get fitter | BMI 38, can get to the floor and back up, walks 8000 steps | BMI 38, cannot get to the floor unaided, knee pain on stairs | Position availability, impact, range | B has zero movements with `needsFloorTransfer`, an impact ceiling, and range-limited knee work. A has none of those constraints. **Weight is not an input to either difference**, which is the point |
| P19 | Get fitter | 30, no health conditions, no exercise for 3 years | 30, no health conditions, trained until last month | Layoff response | A gets the full on-ramp. B gets R3's short volume ramp with load kept. Both converge to the same target. This anchors the general case that section 6.2 is deviating from |
| P20 | Get stronger | Cerebral palsy, GMFCS I, walks and runs | Cerebral palsy, GMFCS IV, powered chair, limited trunk control | Everything selection-related | Divergence is total, and both plans are built from the same graph with no CP-specific content. Assert neither plan contains a movement id absent from `MOVEMENT` |

### 7.3 INVARIANT: changing the label must not change the plan

Each row states two onboarding inputs that differ only in wording. The generated plan must be
identical, including exercise ids, sets, reps, order and copy. Where copy legitimately echoes
the user's own words (`Limitation.label`), that string is excluded from the comparison and
nothing else is.

| # | A says | B says | Function held constant | Why it matters |
|---|--------|--------|------------------------|----------------|
| I1 | "I have arthritis in my knee" | "old football injury, knee gets sore in deep positions" | Knee sensitive, full range otherwise, no instability | The most common label leak. Neither phrasing should change depth, sets or selection |
| I2 | "I have MS" | "my legs get heavy and I overheat easily" | Same F8 and F9 answers | The diagnosis adds nothing the function answers did not |
| I3 | "I'm obese" | (says nothing about weight; same measurements) | Same floor-transfer and impact answers | Weight is already stored for other reasons. It must not become a programming input on its own |
| I4 | "I had a stroke" | "my right side is weaker than my left" | Same F3 asymmetry answers | The plan follows the asymmetry, not the cause |
| I5 | "I have fibromyalgia" | "I get sore easily and need longer to recover" | Same recovery answers, **no** post-exertional worsening | Guards against sweeping every fatigue label into section 4's refusal, which would be its own harm |
| I6 | "I'm 72" | "I'm 52" | Identical chair-stand, balance, falls, training history | Age alone must not change the plan. WHO-2020's older-adult balance pillar attaches to the function profile, and if it should attach to age instead that is a decision to make explicitly, not by accident |
| I7 | "I'm a woman" | "I'm a man" | Everything else identical | No sex-based programming difference exists in any source captured here. STEADI-CS norms differ by sex but that is a screening cut point, not a prescription |
| I8 | "I have post-polio syndrome" and reports no affected segments and no post-exercise pain | "no health conditions" | Identical function answers | The mirror of P2. A label with no functional content behind it changes nothing. Prevents over-restriction, which section 6.2 names as the more common failure |
| I9 | "type 2 diabetes on metformin" | "prediabetes, watching my blood sugar" | No hypoglycaemia risk, no neuropathy, same activity level | The ADA-SOC spacing rule attaches to the flag, not the word. If A and B answer the medication question the same way, they get the same plan |
| I10 | "I use a wheelchair" | "I can't stand or walk" | Identical transfer, trunk, grip and upper-body answers | Equipment is not function. A part-time chair user with full standing tolerance and a full-time user with none are the pair that must **diverge**, and that is P3, not this |

### 7.4 How these run

- INVARIANT cases: deep-equal on the generated plan object with the `label` strings and any
  free-text echo stripped. Cheap, fast, and they fail loudly the moment a diagnosis string
  reaches the generator.
- DIVERGE cases: assert on *specific named properties*, never on plan inequality. "The plans
  differ" is a test that passes for the wrong reason forever; "B contains zero movements with
  `balance >= 2`" is a test that means something.
- Both families belong in the same file as the existing golden tests so the contrast between
  a progressing plan and a non-progressing one is visible in one place.
- P4B, P15B and P5B are the three cases that assert on **absence**: no plan, or no
  progression. Those are the easiest to break silently and should be written first.

---

## 8. INTEGRATION NOTES

### 8.1 The typed shape: extend, do not fork

Three files change. Nothing forks.

**`src/prefsTypes.ts`** gains a capability profile beside the existing limitation, and the
limitation gains dates it already needs for R6's pregnancy staging.

```ts
import type { Joint } from './plan/movement'
import type { Position } from './plan/movement'

/** How the person moves through space. */
export type Locomotion = 'independent' | 'aided' | 'limited-distance' | 'wheeled' | 'mixed'
/** The hardest transfer they can do unaided. */
export type Transfer = 'floor' | 'floor-with-support' | 'chair' | 'assisted'
/** Balance available for programming, from most to least. */
export type BalanceLevel = 'dynamic-standing' | 'static-standing' | 'supported-standing' | 'seated' | 'seated-supported'
export type Grip = 'full' | 'reduced' | 'assisted' | 'none' | 'one-hand'
/** THE field section 4 turns on. */
export type ExertionResponse = 'normal' | 'elevated-fatigue' | 'post-exertional-exacerbation'

export interface CapabilityProfile {
  locomotion?: Locomotion
  transfer?: Transfer
  /** Sides that do not function normally, with how much. */
  asymmetry?: { side: 'left' | 'right'; segment: 'arm' | 'leg' | 'both'; degree: 'mild' | 'severe' | 'absent' }[]
  grip?: Grip
  balance?: BalanceLevel
  /** Positions the person cannot use at all. */
  positionsExcluded?: Position[]
  /** Per-joint, replacing R6's binary avoid. */
  joints?: { joint: Joint; mode: 'exclude' | 'limit-range' | 'reduce-load' }[]
  maxImpact?: 0 | 1 | 2 | 3
  /** Osteoporosis, bone lesions, and anything else that restricts the spine under load. */
  spinalRestricted?: ('axial' | 'flexion' | 'extension' | 'rotation')[]
  valsalvaAvoid?: boolean
  exertionResponse?: ExertionResponse
  orthostatic?: boolean
  heatSensitive?: boolean
  hypoglycaemiaRisk?: boolean
  protectiveSensation?: 'intact' | 'reduced' | 'absent'
  vision?: 'full' | 'low' | 'none'
  hearing?: 'full' | 'reduced' | 'none'
  maxCognitiveLoad?: 0 | 1 | 2 | 3
  /** Rotation and variation are costs, not benefits, for this person. */
  routineStable?: boolean
}

export interface Limitation {
  label: string
  joints: Joint[]        // kept, for the existing avoid path
  since: ISODate
  capability?: CapabilityProfile   // NEW
  asOf?: ISODate                   // NEW, for anything that advances (pregnancy trimester)
  review?: ISODate                 // NEW, when to ask again. Absent means never
}
```

Every field is optional. `emptyPrefs()` is unchanged. An envelope written before any of this
existed parses cleanly and produces the same plan, which is the same defaulted-all-the-way-down
argument `prefsSchema.ts` already makes for the whole Prefs key, and it means no
`SCHEMA_VERSION` bump.

**`src/plan/movement.ts`** gains the optional axes in section 5.3. `MovementMeta` grows; the
`M()` helper's defaults keep all 111 existing entries byte-identical in behaviour. Populating
the new fields is a separate, mechanical, reviewable pass and is **not** part of the type
change.

**`src/types.ts` `ExerciseDef`** gains almost nothing, deliberately. It is the *guide* type:
name, steps, cues, video, mistakes. The one thing it plausibly needs is an alternate
instruction channel for section 3.9, and even that may belong beside it rather than inside it:

```ts
export interface ExerciseDef {
  // ... unchanged ...
  /** Non-visual setup and execution description, for audio-first delivery. */
  spoken?: string[]
}
```

`ExerciseDef` must not gain capability fields. Capability belongs on `MovementMeta`, which is
where the reasoning happens. Mixing the two is how the `qualities` free-text drift described in
`movement.ts`'s own header started.

### 8.2 Which engines consume it

| Consumer | What it reads | What changes |
|---|---|---|
| `plan/movement.ts` `substitutesFor` | The new `SubstituteQuery` fields | Additional `continue` filters in the existing loop. Scoring untouched |
| `plan/generator.ts` | `CapabilityProfile` (never `Limitation`) | Candidate filtering before slot fill; pattern fallback map when a pattern is empty |
| `engine/adapt.ts` | `AdaptContext.limited` becomes `JointConstraint[]`, plus the profile | `limit-range` produces a *modified prescription*, not a substitution. The `unroutable` path gains the fallback map |
| `engine/reps.ts` | Nothing directly | The pacing path does not call it (section 4.4). `layoffResponse` takes the profile |
| `engine/volume.ts` | `maxImpact`, and eventually a daily-load baseline | Ceilings are reduced, not the ceiling *algorithm* |
| `engine/fatigue.ts`, quit and streak logic | `exertionResponse`, and treatment or relapse flags | Missed sessions stop counting as lapses. This is a real behavioural change and it is the one most likely to be missed |
| `plan/guide.ts` and the today screens | `vision`, `hearing`, `maxCognitiveLoad`, `routineStable` | Cue length, channel, and whether rotation happens |

Layering stays clean: `plan/` is rank 0, `engine/` and `store/` rank 1. `CapabilityProfile`
lives in `prefsTypes.ts` beside `Prefs`, which imports `Joint` from `plan/movement` already, so
no new edge is created and `structure.test.ts`'s layering rule is unaffected.

### 8.3 What J6 implements now, and what waits

J6 is scoped as "limitations lifecycle (short/long-term, what hurts, region routing,
expiry+restore) + core coverage guarantee + advisory volume cap". That scope already contains
the hard part of this pack's foundation.

**Now, in J6:**
1. The `Limitation` date fields (`asOf`, `review`) and the expiry/restore lifecycle. R6 needs
   them for pregnancy staging; R7 needs them for every temporary state.
2. `JointConstraint` with the `limit-range` mode, and the range modifier reaching the
   prescription. This is G6, it is the highest-value single change in the pack, and it fixes a
   live defect: a knee limitation currently empties the entire squat pattern.
3. `CapabilityProfile` as a type with **two** fields populated end to end and the rest declared
   but unread: `transfer` and `exertionResponse`. Two is enough to prove the wiring and small
   enough to review.
4. The section 4 refusal: `exertionResponse: 'post-exertional-exacerbation'` produces no
   progression policy. Ship the refusal, not a slow ramp.
5. The INVARIANT test family (7.3) in full. It is cheap and it is the net.
6. The `position` axis on `MovementMeta` as an optional field, **unpopulated**. Declaring the
   type early costs nothing and stops the next session inventing a parallel one.

**Waits:**
- Populating all nine new movement axes across 111 entries. Mechanical, reviewable, and it
  should be one dedicated pass with a coverage test, not smuggled into J6.
- Per-side prescription (P14, P2). It is a prescription-type change and it touches the rep
  engine, the log, and the UI.
- Seated and arm-driven conditioning movements. Catalog work; belongs with the ingestion waves.
- Session-level scheduling structure (short bouts, ON periods, spacing rules). Needs a
  scheduling concept BodyT does not have.
- Daily-life load for wheeled users. No source, no number, do not guess.
- The MS EDSS-banded doses and any CKD-specific dose. Known gaps, listed in 8.5.

### 8.4 Guard tests to write first

In this order, before any feature code.

1. **G-EMPTY.** A user with `capability: undefined` gets a plan byte-identical to today's, for
   every existing golden fixture. If this fails, nothing else matters.
2. **I1 to I10** (7.3). Diagnosis invariance. Deep-equal with label strings stripped.
3. **G-NOLEAK** (`structure.test.ts`). `src/plan/generator.ts` does not import `Limitation`,
   and no string in the generated plan matches a condition-name vocabulary list. Enforces INV-2
   structurally rather than by review.
4. **T-PEM-1 to T-PEM-5** (section 4.5). Written before the pacing path exists, so the first
   implementation is written against them.
5. **G-NONEMPTY.** For every `CapabilityProfile` in a fixture set, and every pattern the profile
   can train at all, the generated plan contains at least one movement in that pattern. This is
   the P6 regression and it catches the whole class of "the constraint deleted the training".
6. **G-SOFT.** A `limit-range` joint constraint keeps the movement and attaches a range note; an
   `exclude` constraint removes it. Two assertions, one behaviour split that does not exist yet.
7. **P1 to P20** (7.1, 7.2), as the packs land. Each pair is written with its pack, not in a
   batch at the end.

### 8.5 Known gaps, recorded so a future session does not silently fill them

- **MS.** The Kalb 2020 National MS Society / CMSC consensus stratifies by EDSS band, including
  bands where a person has no functional ambulation. `journals.sagepub.com` returned 403 through
  the session proxy. No MS-specific dose is in this pack.
- **CKD.** No tier-A dose captured. BodyT ships the general chronic-conditions recommendation
  and nothing CKD-specific.
- **Cerebral palsy strength.** CP-VERSCHUREN's aerobic prescription was captured at
  abstract level; its resistance prescription was not.
- **Vivifrail.** The prescription guide PDF exceeded the fetch size limit. Its four-level
  structure is recorded; its per-level doses are not, and must be re-verified before use.
- **REDs.** Captured at consensus-summary level only (`bjsm.bmj.com` and
  `stillmed.olympics.com` both 403). The CAT2 indicator list and the traffic-light participation
  guidance are not verbatim here. This matters because REDs is the one place where BodyT's
  *nutrition* engine and its *training* engine must agree: under-fuelling plus a rising training
  load is the failure mode, and R1 owns the other half. Flagged for a joint R1/R7 follow-up
  rather than filled in from memory.
- **POTS protocols.** The Levine, Dallas and CHOP heart-rate prescriptions reached this session
  only through clinic and blog reproductions. Not tier-A, not reproduced here, and not something
  a consumer app should administer regardless.
- **Numeric progression rates for every pack in section 6.** The directions are sourced. Almost
  every specific number is HOUSE HEURISTIC and is labelled as such in the table. R3 owns
  increment sizing and should stay the single place those numbers live.
- **Serving minors.** A product and legal decision (3.10), not made here.

### 8.6 Standing constraints this pack operates under

Restated because they bind every recommendation above: suggest only, never auto. Users never
pick reps, so a capability profile changes what the engine selects and never opens a menu. No em
dashes in user-visible copy. Never diagnose: copy names what the user reported, never a
condition, and `Limitation.label` is echoed back verbatim rather than interpreted. Layering runs
plan to engine and store to cloud, logic and platform to components and screens, never upward.
`structure.test.ts` allowances shrink only, so every addition here is sized to fit or comes with
its own file.

