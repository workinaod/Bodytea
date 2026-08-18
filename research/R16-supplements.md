# R16 SUPPLEMENTS, EVIDENCE TIERS, AND THE CLAIMS FENCE

Job: R16. Date: 2026-08-18. Access date for all web sources: 2026-08-18.
Researcher: Claude (session d21c12d6). NO production code ships from this pack.

Scope: what BodyT is allowed to say about supplements, what it currently says, and the
gap between the two. The app already ships nine supplement recommendations with doses
and timing to real users. Section 4 audits every one of them against the evidence.

Out of scope, deferred entirely to `research/R1-nutrition.md`: calorie targets, BMR
models, protein grams per day, carb and fat splits, fibre, hydration volume. Protein
powder is FOOD in this app's model, not a supplement claim. R1 owns the protein number
(R1 section 5.1); R16 never restates it and never contradicts it. Where a supplement
question is really a food question (whey, casein, protein bars, electrolyte drinks as
fluid) the answer is R1's and R4's, not this pack's.

Related packs: `research/R6-safety.md` owns the red-flag gate and the "talk to a doctor"
posture. R16 reuses R6's tier vocabulary deliberately so the two fences read as one
system. Where R6 says STOP, R16 never speaks at all.

## Conventions used throughout

- **Evidence tier** (playbook rule, section 27): **A** = official guideline, consensus,
  or position stand. **B** = systematic review or meta-analysis. **C** = expert
  programming practice. **D** = commercial, community, or anecdotal. A and B govern
  safety and physiology. C and D never override them.
- **AIS class** = the Australian Institute of Sport ABCD framework class [S4-S8].
  Group A: strong evidence for use in specific situations. Group B: emerging or mixed,
  deserving consideration in specific situations. Group C: evidence not supportive, or
  no research. Group D: banned or high contamination risk.
- **App class** is BodyT's own decision and is NOT the same as the AIS class. It has four
  values: `SUGGEST` (may appear in a default stack), `OFFER` (may appear in the catalog
  a user browses, never suggested), `CATALOG-ONLY-IF-ASKED` (user can add it by name,
  app never names it first), `NEVER` (the app does not carry the word).
- `confidence: source` = grounded in a tier A or B document in section 1.
  `confidence: house` = HOUSE HEURISTIC, evidence-informed, not directly sourced.
  Neither is ever presented to a user as medical guidance.
- `file:line` references are against the worktree at
  `/tmp/claude-0/.../scratchpad/wt-fix2` at the time of writing (SCHEMA_VERSION 20,
  `src/types.ts:610`).
- No em dashes appear anywhere in this file, including in every proposed copy string.
- Doses are given as the studied dose, in the studied unit, for the studied population.
  A dose without a population is a marketing number.

## Contents

1. Sources (provenance, 32 entries)
2. Evidence tier table (every supplement the app might ever mention)
3. The audit of what ships today
4. The claims fence (forbidden phrasings, safe rewrites, doctor-line triggers)
5. Contraindication routing (the actual rule table)
6. Typed schema proposal (`SupplementRecord`, files, migration)
7. Eval fixtures (18 cases)
8. Coverage gaps and open decisions

---

## 1. SOURCES (provenance)

Tier per the playbook rule: A = guideline, consensus, position stand. B = systematic
review or meta-analysis or primary trial of record. C = expert practice. D = commercial.
Access quality is recorded so a future session does not re-burn usage on a blocked host.

### 1.1 Tier A: guidelines, consensus statements, position stands

| ID | Citation | What was taken | Access |
|----|----------|----------------|--------|
| S1 | Maughan RJ, Burke LM, Dvorak J, Larson-Meyer DE, Peeling P, Phillips SM, et al. IOC consensus statement: dietary supplements and the high-performance athlete. Br J Sports Med 2018;52(7):439-455. doi:10.1136/bjsports-2018-099027 | Supplements make at most a minor contribution to an athlete's nutrition programme. Performance supplements should be considered only where a strong evidence base supports them as safe, legal and effective, and only after dietary adequacy is established. Contamination and inadvertent doping framed as the primary risk of the category | FULL (open PDF at stillmed.olympics.com) |
| S2 | Kreider RB, Kalman DS, Antonio J, Ziegenfuss TN, Wildman R, Collins R, Candow DG, Kleiner SM, Almada AL, Lopez HL. ISSN position stand: safety and efficacy of creatine supplementation in exercise, sport, and medicine. J Int Soc Sports Nutr 2017;14:18. doi:10.1186/s12970-017-0173-z | Creatine monohydrate is the most effective ergogenic nutritional supplement available for increasing high-intensity exercise capacity and lean mass during training. Up to 30 g/day for 5 years shows no adverse effects in healthy and clinical populations. Maintenance 3 to 5 g/day, or roughly 0.03 g/kg/day, after or without a 5 to 7 day 20 g/day loading phase. Position is explicitly that creatine does not cause renal damage in healthy people; monitoring advised where renal disease pre-exists | FULL (open access, Springer + PubMed 28615996) |
| S3 | Guest NS, VanDusseldorp TA, Nelson MT, Grgic J, Schoenfeld BJ, Jenkins NDM, et al. ISSN position stand: caffeine and exercise performance. J Int Soc Sports Nutr 2021;18(1):1 | Caffeine consistently improves performance at 3 to 6 mg/kg body mass. Doses above 9 mg/kg add no benefit and increase side effects. Anhydrous caffeine is more reliable than coffee. Benefits are small to moderate and vary by individual (CYP1A2, ADORA2A genotype named). Endurance shows the most consistent moderate-to-large effect | FULL (open access, PMC7777221) |
| S4 | Trexler ET, Smith-Ryan AE, Stout JR, Hoffman JR, Wilborn CD, Sale C, et al. ISSN position stand: Beta-Alanine. J Int Soc Sports Nutr 2015;12:30 | 4 to 6 g/day for at least 2 to 4 weeks raises muscle carnosine and improves exercise capacity in efforts of roughly 1 to 4 minutes. Paraesthesia is the common side effect and is mitigated by divided or sustained-release doses. No benefit demonstrated for single-set strength work | ABSTRACT + reproductions |
| S5 | Jäger R, Kerksick CM, Campbell BI, Cribb PJ, Wells SD, Skwiat TM, et al. ISSN position stand: protein and exercise. J Int Soc Sports Nutr 2017;14:20 | 1.4 to 2.0 g/kg/day supports training adaptation. Protein powder is a convenience form of food, not an ergogenic aid with its own claim. Deferred to R1 section 5.1 for the app's own number | ABSTRACT |
| S6 | Kerksick CM, Arent S, Schoenfeld BJ, Stout JR, Campbell B, Wilborn CD, et al. ISSN position stand: nutrient timing. J Int Soc Sports Nutr 2017;14:33 | The post-exercise "anabolic window" is far wider than the 30 to 60 minutes popularly claimed; muscle remains sensitised to protein for at least 24 hours. Total daily intake dominates timing for most outcomes. This is the source that kills most timing copy | FULL (open access, PMC5596471) |
| S7 | AIS Sports Supplement Framework, ABCD Classification System, Group A. Australian Institute of Sport / Australian Sports Commission | Group A definition: "Strong scientific evidence for use in specific situations in sport using evidence-based protocols." Sports foods: sports drink, gel, confectionery, bar, electrolyte supplement, isolated protein supplement, mixed macronutrient supplement. Medical supplements: calcium, folate, iron, vitamin D, zinc. Performance supplements: caffeine, beta-alanine, dietary nitrate / beetroot juice, sodium bicarbonate, creatine monohydrate, glycerol | FULL (fetched 2026-08-18) |
| S8 | AIS Sports Supplement Framework, Group B | Group B definition: "Emerging and/or mixed scientific support, deserving of consideration in specific populations or situations", for use within research or clinical monitoring. Named: food polyphenols (cherries, berries, blackcurrant, pomegranate), vitamin C, menthol, pickle juice, quinine, carnitine, **collagen**, curcumin, egg shell membrane, **fish oil (omega-3 EPA and DHA)**, ketone supplements, **multivitamin**, N-acetylcysteine, probiotics, prebiotics | FULL (fetched 2026-08-18) |
| S9 | AIS Sports Supplement Framework, Group C | Group C definition: "Scientific evidence not supportive of benefit amongst athletes OR no research undertaken to guide an informed opinion", not advocated for use by athletes. Named after reclassification: **magnesium** (as magnesium oxide), alpha lipoic acid, HMB, BCAA, phosphate, SAMe, tyrosine, vitamin E | FULL (fetched 2026-08-18) |
| S10 | AIS Sports Supplement Framework, Group D | Group D definition: "Banned or at high risk of contamination with substances that could lead to a positive doping test", athletes instructed not to use. Named: ephedrine, strychnine, sibutramine, DMAA (methylhexanamine), DMBA, herbal stimulants, bitter orange, synephrine; DHEA, androstenedione, 19-norandrostenedione/ol, tribulus terrestris, maca root powder; GHRP-1, GHRP-2, CJC-1293, CJC-1295; higenamine; SARMs (andarine, ostarine, ligandrol); GW1516 (cardarine); colostrum | FULL (fetched 2026-08-18) |
| S11 | Thomas DT, Erdman KA, Burke LM. Position of the Academy of Nutrition and Dietetics, Dietitians of Canada, and the American College of Sports Medicine: Nutrition and Athletic Performance. Med Sci Sports Exerc 2016;48(3):543-568 (also J Acad Nutr Diet 2016;116(3):501-528) | Supplements do not compensate for poor food choices or inadequate diet. Only a small number have evidence for performance. Athletes should consult a qualified sports dietitian. Micronutrient supplementation is warranted for correcting a documented deficiency, not as routine insurance | ABSTRACT + widely reproduced summary |
| S12 | World Anti-Doping Agency Prohibited List (current edition) and WADA supplement guidance | Strict liability: the athlete is responsible for any prohibited substance found in their sample regardless of intent. Named stimulants, SARMs, hormone modulators relevant to the supplement market | FULL (wada-ama.org list is public) |
| S13 | NIH Office of Dietary Supplements. Dietary Supplements for Exercise and Athletic Performance: Fact Sheet for Health Professionals; plus ODS fact sheets for Vitamin D, Magnesium, Zinc, Omega-3 | Per-ingredient evidence summaries, RDA/UL values, and documented interactions. Used as the cross-check on every dose and interaction line in section 2 | FULL |
| S14 | Institute of Medicine (now NASEM). Dietary Reference Intakes for Calcium and Vitamin D. Washington DC: National Academies Press; 2011 | Vitamin D RDA 600 IU/day ages 1 to 70, 800 IU/day 71+. Tolerable Upper Intake Level 4000 IU/day for ages 9+, 3000 IU/day ages 4 to 8, 2500 IU/day ages 1 to 3. Serum 25(OH)D of 20 ng/mL meets the needs of at least 97.5% of the population | FULL (public summary) |
| S15 | Institute of Medicine. DRIs for Calcium, Phosphorus, Magnesium, Vitamin D and Fluoride; 1997 | Magnesium UL is **350 mg/day from supplements only** for adults (the UL excludes food magnesium). Diarrhoea is the dose-limiting effect. Adult RDA 310 to 420 mg/day total | FULL (public summary via NIH ODS) |
| S16 | Institute of Medicine. DRIs for Vitamin A, Vitamin K, Arsenic, Boron, Chromium, Copper, Iodine, Iron, Manganese, Molybdenum, Nickel, Silicon, Vanadium and Zinc; 2001 | Zinc RDA 11 mg/day men, 8 mg/day women. UL 40 mg/day adults. Chronic intake above the RDA suppresses copper absorption; copper deficiency is the recognised harm of long-term zinc supplementation | FULL (public summary via NIH ODS) |
| S17 | US Preventive Services Task Force. Vitamin, Mineral, and Multivitamin Supplementation to Prevent Cardiovascular Disease and Cancer: USPSTF Recommendation Statement. JAMA 2022;327(23):2334-2347. doi:10.1001/jama.2021.15650 | Recommends AGAINST beta-carotene and vitamin E for CVD or cancer prevention (grade D). Evidence INSUFFICIENT for multivitamins and for single or paired nutrients. This is the source that forbids any health-outcome framing of the app's multivitamin entry | FULL |
| S18 | American College of Obstetricians and Gynecologists. Moderate Caffeine Consumption During Pregnancy, Committee Opinion No. 462 (reaffirmed) | Moderate caffeine consumption, under 200 mg/day, does not appear to be a major contributing factor in miscarriage or preterm birth. 200 mg/day is the operative ceiling the app must respect if it ever knows a user is pregnant | SUMMARY-LEVEL (acog.org returned 402 in this environment per R6; figure is uncontested and reproduced across ACOG patient pages) |
| S19 | American Academy of Pediatrics, Council on Sports Medicine and Fitness. Use of Performance-Enhancing Substances. Pediatrics 2016;138(1):e20161300 | Pediatricians should discourage use of performance-enhancing substances in children and adolescents, including creatine, and should not recommend them. This is the source behind the app's minor rule even though creatine itself has a benign safety record | ABSTRACT + reproductions |
| S20 | FDA structure/function claim regulation, 21 CFR 101.93 and FDA guidance on structure/function claims; FTC Health Products Compliance Guidance (2022) | A dietary supplement label may describe an effect on the structure or function of the body but may not claim to diagnose, treat, cure or prevent disease. Any product-adjacent claim must be truthful, non-misleading and substantiated by competent and reliable scientific evidence. This is the legal shape of the fence in section 4 | FULL |
| S21 | NSF Certified for Sport and Informed Sport / LGC third party certification programme documentation | Batch testing against the WADA list. The only practical consumer-side mitigation for the contamination risk in S32 to S37. Named in copy as a category, never as a brand endorsement | FULL |

### 1.2 Tier B: systematic reviews, meta-analyses, trials of record

| ID | Citation | Finding taken | Access |
|----|----------|---------------|--------|
| S22 | Hobson RM, Saunders B, Ball G, Harris RC, Sale C. Effects of beta-alanine supplementation on exercise performance: a meta-analysis. Amino Acids 2012;43(1):25-37 | Median total intake of 179 g beta-alanine gave a 2.85% improvement in exercise outcomes, concentrated in efforts lasting 60 to 240 seconds. No significant effect for efforts under 60 seconds | ABSTRACT (verified via search + Springer listing) |
| S23 | Morton RW, Murphy KT, McKellar SR, Schoenfeld BJ, Henselmans M, Helms E, et al. A systematic review, meta-analysis and meta-regression of the effect of protein supplementation on resistance training-induced gains in muscle mass and strength in healthy adults. Br J Sports Med 2018;52(6):376-384 | Protein supplementation increased 1RM strength (+9%) and fat-free mass (+0.3 kg) over training alone; the effect plateaued at roughly 1.6 g/kg/day. Deferred to R1: this is a FOOD result, not a supplement claim | ABSTRACT |
| S24 | Gencer B, Djousse L, Al-Ramady OT, Cook NR, Manson JE, Albert CM. Effect of long-term marine omega-3 fatty acids supplementation on the risk of atrial fibrillation in randomized controlled trials of cardiovascular outcomes: a systematic review and meta-analysis. Circulation 2021;144(25):1981-1990. doi:10.1161/CIRCULATIONAHA.121.055654 | Seven RCTs, over 81,000 participants, median follow-up 1 year or more. Omega-3 supplementation increased atrial fibrillation risk by roughly 25% (HR about 1.25, 95% CI 1.07 to 1.46), and the risk rose with dose: the increase was small at 1 g/day or less and substantially larger above 1 g/day | ABSTRACT + multiple independent reproductions (ahajournals.org returned 403, pubmed cookie wall) |
| S25 | Manson JE, Cook NR, Lee IM, et al. Vitamin D supplements and prevention of cancer and cardiovascular disease (VITAL). N Engl J Med 2019;380(1):33-44 | 2000 IU/day vitamin D3 for a median 5.3 years in 25,871 adults did not lower incidence of invasive cancer or major cardiovascular events. The definitive "vitamin D is not a health outcome intervention in replete people" trial | ABSTRACT |
| S26 | LeBoff MS, Chou SH, Ratliff KA, et al. Supplemental vitamin D and incident fractures in midlife and older adults (VITAL ancillary). N Engl J Med 2022;387(4):299-309 | 2000 IU/day did not reduce total, non-vertebral or hip fractures in generally healthy adults not selected for deficiency. Removes bone health as an app-sayable reason for vitamin D | ABSTRACT |
| S27 | Bolland MJ, Grey A, Avenell A. Effects of vitamin D supplementation on musculoskeletal health: a systematic review, meta-analysis, and trial sequential analysis. Lancet Diabetes Endocrinol 2018;6(11):847-858 | Vitamin D supplementation did not prevent fractures or falls or have clinically meaningful effects on bone mineral density; high and low dose trials both null. Authors conclude there is little justification for further trials in unselected populations | ABSTRACT |
| S28 | Mah J, Pitre T. Oral magnesium supplementation for insomnia in older adults: a systematic review and meta-analysis. BMC Complement Med Ther 2021;21:125 (correction 2024) | Three RCTs, 151 participants, all older adults. Sleep onset latency fell 17.36 minutes (95% CI -27.27 to -7.44). GRADE certainty **LOW**. Authors state plainly that "the quality of literature is substandard for physicians to make well-informed recommendations on usage of oral magnesium for older adults with insomnia" | FULL (PMC8053283) |
| S29 | Shaw G, Lee-Barthel A, Ross ML, Wang B, Baar K. Vitamin C-enriched gelatin supplementation before intermittent activity augments collagen synthesis. Am J Clin Nutr 2017;105(1):136-143 | 15 g vitamin C-enriched gelatin taken **1 hour before** a 6 minute rope-skipping bout roughly doubled the blood marker of collagen synthesis (PINP) versus placebo, dose-dependently versus 5 g. The tissue-level effect was measured in an **engineered ligament construct** bathed in the subjects' serum, not in a human tendon. n = 8 males | FULL (PMC5183725) |
| S30 | Lis DM, Baar K. Effects of different vitamin C-enriched collagen derivatives on collagen synthesis. Int J Sport Nutr Exerc Metab 2019;29(5):526-531 | Compares gelatin and hydrolysed collagen forms at 5, 10 and 15 g; supports the 15 g dose and the 1 hour pre-load window. Effect is on synthesis markers, not on injury rates | ABSTRACT |
| S31 | Balshaw TG, Funnell MP, McDermott E, Maden-Wilkinson TM, Abela S, Quteishat B, et al. The effect of specific bioactive collagen peptides on function and muscle remodeling during human resistance training. Eur J Nutr / Am J Clin Nutr (2023 series, Loughborough group) | 15 g/day collagen peptides alongside 15 weeks of resistance training produced greater muscle thickness change but no consistent advantage in strength; tendon outcomes remain inconsistent. Keeps collagen at "emerging" | ABSTRACT |
| S32 | Drake C, Roehrs T, Shambroom J, Roth T. Caffeine effects on sleep taken 0, 3, or 6 hours before going to bed. J Clin Sleep Med 2013;9(11):1195-1200 | 400 mg caffeine taken 6 hours before bed reduced total sleep time by more than 1 hour measured by polysomnography, with subjects largely unaware of the disruption. Source for the app's evening cutoff rule | FULL |
| S33 | Dawson-Hughes B, Harris SS, Lichtenstein AH, Dolnikowski G, Palermo NJ, Rasmussen H. Dietary fat increases vitamin D-3 absorption. J Acad Nutr Diet 2015;115(2):225-230; and Dawson-Hughes 2015 J Bone Miner Res companion | Taking vitamin D with a fat-containing meal, in particular the largest meal of the day, meaningfully increases absorption and serum 25(OH)D versus a fat-free or fasting context. Supports "with food", does NOT support "in the morning" | ABSTRACT |
| S34 | Antonio J, Ciccone V. The effects of pre versus post workout supplementation of creatine monohydrate on body composition and strength. J Int Soc Sports Nutr 2013;10:36 | n = 19 recreational bodybuilders, 4 weeks. A small post-workout advantage that did not reach significance on most measures. Cited here as the reason NOT to make a creatine timing claim | ABSTRACT |
| S35 | Antonio J, Candow DG, Forbes SC, Gualano B, Jagim AR, Kreider RB, et al. Common questions and misconceptions about creatine supplementation: what does the scientific evidence really show? J Int Soc Sports Nutr 2021;18:13 | Addresses the water-retention question directly: creatine loading increases total body water, with an early intracellular water gain typically 1 to 2 kg in the first days to weeks, which is not fat and not muscle protein. Also addresses hair loss, kidney and cramping myths | FULL (open access) |
| S36 | Fischer PW, Giroux A, L'Abbé MR. Effect of zinc supplementation on copper status in adult man. Am J Clin Nutr 1984;40(4):743-746 | 50 mg/day supplemental zinc for 6 weeks significantly reduced erythrocyte superoxide dismutase, a copper status marker, in healthy men. The primary citation behind the zinc-copper interaction that NIH ODS reproduces | ABSTRACT |

### 1.3 Tier B: contamination, adulteration and hepatotoxicity

| ID | Citation | Finding taken | Access |
|----|----------|---------------|--------|
| S37 | Geyer H, Parr MK, Mareck U, Reinhart U, Schrader Y, Schänzer W. Analysis of non-hormonal nutritional supplements for anabolic-androgenic steroids: results of an international study. Int J Sports Med 2004;25(2):124-129 | 634 non-hormonal supplements bought in 13 countries from 215 suppliers. **94 (14.8%) contained prohormones not on the label.** Capsules 19.6% positive, tablets 11.7%, powders 6.9%. Concentrations 0.01 to 190 micrograms/g; over 1 microgram total intake produced positive norandrosterone doping results for hours | ABSTRACT + full reproduction of numbers |
| S38 | Cohen PA, Travis JC, Vanhee C, Ohana D, Venhuis BJ. Nine prohibited stimulants found in sports and weight loss supplements: deterenol, phenpromethamine, oxilofrine, octodrine, BMPEA, 1,3-DMAA, 1,4-DMAA, 1,3-DMBA and higenamine. Clin Toxicol 2021;59(11):975-981 | 17 sports and weight loss supplements labelled with deterenol contained nine different prohibited stimulants, several in combination, none of them lawful for human use in the US. Documented adverse events include palpitations, chest pain and cardiac arrest. **This is the single most important source for the app's pre-workout rule** | ABSTRACT + NSF and Harvard press reproductions |
| S39 | Duiven E, van Loon LJC, Spruijt L, Koert W, de Hon OM. Undeclared doping substances are highly prevalent in commercial sports nutrition supplements. J Sports Sci Med 2021;20(2):328-338 | 66 high-risk sports nutrition products from 21 brands sold through Dutch web shops. **38% contained prohibited substances not declared on the label.** High-risk categories are those claiming hormonal modulation, muscle gain, fat loss or energy | ABSTRACT + reproductions |
| S40 | Martínez-Sanz JM, Sospedra I, Ortiz CM, Baladía E, Gil-Izquierdo A, Ortiz-Moncada R. Intended or unintended doping? A review of the presence of doping substances in dietary supplements used in sports. Nutrients 2017;9(10):1093 | Review across studies: contamination rates ranging from roughly 6% to 9% in some sample sets up to over 20% in others, with pre-workouts, fat burners and "hormone boosters" carrying by far the highest risk. Single-ingredient basics (creatine monohydrate, plain whey) carry the lowest | FULL (open access) |
| S41 | Navarro VJ, Khan I, Björnsson E, Seeff LB, Serrano J, Hoofnagle JH. Liver injury from herbal and dietary supplements. Hepatology 2017;65(1):363-373 | In the NIH Drug-Induced Liver Injury Network, the proportion of cases caused by herbal and dietary supplements rose from 7% to 20% over the study period. 45 cases were caused by bodybuilding supplements (prolonged jaundice, median 91 days, in young men); non-bodybuilding HDS cases were more often severe, with death or transplant in 13% versus 3% for conventional medications | ABSTRACT + full PDF reproduction |
| S42 | Björnsson HK, Björnsson ES, Avula B, Khan IA, Jonasson JG, Ghabril M, Hayashi PH, Navarro V. Ashwagandha-induced liver injury: a case series from Iceland and the US Drug-Induced Liver Injury Network. Liver Int 2020;40(4):825-829 | Five cases of cholestatic or mixed liver injury after ashwagandha, latency 2 to 12 weeks, jaundice and prolonged pruritus 5 to 20 weeks, resolution in 1 to 5 months. Chemical analysis confirmed ashwagandha with no other toxic compound. The reason ashwagandha is `NEVER` in section 2 despite popular demand | ABSTRACT + full reproduction |
| S43 | NIDDK LiverTox database entries for Green Tea (Camellia sinensis) extract, Bodybuilding Supplements, Garcinia cambogia, Usnic acid | Green tea extract at high catechin doses is an established cause of acute hepatocellular injury, including cases requiring transplant; anabolic-steroid-containing bodybuilding products cause prolonged cholestasis. Basis for the `NEVER` list entries in section 2.5 | FULL |

### 1.4 Sources deliberately NOT used as authority

- Manufacturer product pages, supplement retailer "science" pages, and influencer stack
  videos. They are the D tier described in the playbook (line 138): useful for knowing
  what a user will ask about, never for what the app asserts.
- The NAOD V3 PDF that seeded `src/plan/foods.ts` (see the file header comment at
  `src/plan/foods.ts:5-9`). It is the owner's own booklet. It is authoritative for the
  owner's meal plan and it is **not** an evidence source for what a stranger should take.
  Section 3 treats every number it contributed as unsourced until matched to S1 to S43.

---

## 2. THE EVIDENCE TIER TABLE

Every supplement BodyT might ever put in front of a user, plus the ones it must never
name. The AIS column is the external classification [S7-S10]. The **App class** column is
BodyT's own decision and is deliberately stricter than AIS in several places, because AIS
is written for a supervised elite athlete with a sports dietitian and BodyT is talking to
a stranger on a phone with no supervision at all.

App class values:
- `SUGGEST`: may appear in a generated default stack, subject to section 5 routing.
- `OFFER`: may appear in the browsable catalog with its hedge string. Never auto-added.
- `ASK-ONLY`: the app never names it first. If the user types it into their own stack the
  app stores it and shows the safety line, nothing more.
- `NEVER`: the word does not appear in app-authored copy at all.

### 2.1 Reading the table

- **Claim** is the narrowest statement the evidence supports. Anything wider is a claims
  fence violation (section 4).
- **Effect size** is given in the units the study reported. "Not quantified" means the
  literature supports direction but not a defensible magnitude for this population.
- **Population** matters more than the effect. An effect shown in deficient older adults
  is not an effect in a 24 year old who eats fish twice a week.
- **Suppress if** is the machine-readable version, expanded into the routing table in
  section 5.

### 2.2 AIS Group A candidates

| id | Supplement | AIS | Tier | Claim the evidence actually supports | Effect size | Population shown in | Dose | Timing | Interactions | Contraindications / suppress if | App class |
|----|-----------|-----|------|--------------------------------------|-------------|---------------------|------|--------|--------------|-------------------------------|-----------|
| creatine | Creatine monohydrate | A (performance) | A [S2], B [S35] | Increases capacity for repeated high-intensity effort and supports lean mass gain alongside resistance training | Typically 5 to 15% improvement in work performed during sets of maximal effort; roughly 1 to 2 kg extra lean mass over 4 to 12 weeks of training versus training alone [S2] | Healthy adults across ages and both sexes; largest trials in trained and recreationally trained men | 3 to 5 g/day maintenance, or 0.03 g/kg/day. Optional 20 g/day split into 4 doses for 5 to 7 days to load faster [S2] | Any time of day. The pre versus post question is unresolved and the only trial of record is n=19 and largely null [S34], so the app makes NO timing claim | No clinically important drug interactions established in healthy people [S2]. Caffeine co-ingestion has an old and unreplicated interference finding, not actionable | Suppress: known kidney disease or reduced kidney function, on dialysis; pregnancy or breastfeeding (no safety data, not a known harm); under 18 [S19]. Note to user, not a suppression: 1 to 2 kg of water weight in the first weeks [S35], which the app's own weight trend must be told about | `SUGGEST` |
| caffeine | Caffeine (anhydrous, as a measured dose) | A | A [S3] | Improves endurance performance, and to a smaller degree strength, power and sprint outcomes, for a few hours after a dose | Small to moderate. Aerobic endurance shows the most consistent moderate-to-large benefit; strength and power effects are small [S3] | Healthy trained and untrained adults. Habitual users still respond, though individual variation is large and partly genetic [S3] | 3 to 6 mg/kg body mass. Below 3 mg/kg some people still respond; above 9 mg/kg gives no extra benefit and more side effects [S3] | Roughly 60 minutes before for capsules or powder, because that is where plasma caffeine peaks [S3]. Gum and liquid act faster | Fluvoxamine and other strong CYP1A2 inhibitors raise caffeine levels sharply; theophylline; ephedrine-type stimulants; may blunt some blood pressure medication effect | Suppress: pregnancy (or cap at 200 mg/day total including coffee [S18]); under 18 [S19]; user-reported arrhythmia, palpitations, or any R6 RF-PALP flag; anxiety or panic disorder; uncontrolled hypertension; sessions ending within 6 hours of the user's stated bedtime [S32] | `SUGGEST` with a hard dose and cutoff rule |
| betaAlanine | Beta-alanine | A | A [S4], B [S22] | Improves exercise capacity in efforts lasting roughly 1 to 4 minutes, after weeks of daily loading | 2.85% median improvement in the meta-analysis, concentrated in the 60 to 240 second window; no significant effect under 60 seconds [S22] | Trained and untrained adults, mostly cycling and running time-to-exhaustion protocols | 4 to 6 g/day for at least 2 to 4 weeks. It is a loading supplement, not an acute one [S4] | Not acute. Taken daily regardless of session timing. Divided doses of 0.8 to 1.6 g reduce tingling [S4] | None established | Suppress: under 18; pregnancy. Warn: harmless skin tingling (paraesthesia) is expected and is the single most common reason people stop | `OFFER` only when the user's actual training contains 1 to 4 minute maximal efforts. For a general lifter it is a supplement for a demand they do not have |
| bicarb | Sodium bicarbonate | A | A [S7] | Buffers acidosis in high-intensity efforts of roughly 1 to 7 minutes | Small, roughly 2%, and highly protocol dependent | Trained athletes in controlled lab protocols | 0.2 to 0.4 g/kg, 60 to 180 minutes before | Acute, pre-event | Sodium load interacts with blood pressure management and diuretics | Suppress: any hypertension, heart failure, kidney disease, sodium-restricted diet, pregnancy, under 18. GI distress is common enough that it is a real adherence problem | `ASK-ONLY`. HOUSE decision: a general-population coaching app has no business suggesting an acute GI-distress protocol |
| nitrate | Dietary nitrate / beetroot juice | A | A [S7] | Reduces the oxygen cost of submaximal exercise and can improve endurance time trial performance | Roughly 1 to 3% in time trial performance, smaller or absent in highly trained athletes | Recreationally trained adults; effect shrinks as training status rises | 6 to 13 mmol nitrate, 2 to 3 hours before | Acute pre-event, or daily loading for several days | Antibacterial mouthwash abolishes the effect (oral bacteria are part of the pathway). Caution alongside blood pressure medication | Suppress: on nitrate medication for angina, on PDE5 inhibitors, pregnancy, under 18 | `OFFER` to endurance users only |
| vitD | Vitamin D3 | A (as a **medical** supplement, i.e. for correcting deficiency) | A [S14], B [S25][S26][S27] | Corrects a low blood level of vitamin D. That is the whole claim | Deficiency correction is reliable. Performance, fracture and disease prevention effects in people who are **not** deficient are null in the largest trials: VITAL found no cancer or CVD benefit at 2000 IU/day over 5.3 years [S25], no fracture benefit [S26], and the Bolland meta-analysis found no musculoskeletal benefit [S27] | 25,871 adults in VITAL, unselected for deficiency. Deficiency-correction data come from deficient populations, which is the point | RDA 600 IU/day ages 1 to 70, 800 IU 71+. **UL 4000 IU/day for ages 9 and up, 3000 IU ages 4 to 8, 2500 IU ages 1 to 3** [S14] | With a fat-containing meal, ideally the largest meal of the day, which measurably raises absorption [S33]. "Morning" is not supported by anything | Thiazide diuretics plus high-dose vitamin D raise hypercalcaemia risk; digoxin; orlistat and cholestyramine reduce absorption; corticosteroids alter metabolism | Suppress: sarcoidosis or other granulomatous disease, hyperparathyroidism, history of kidney stones or hypercalcaemia, on thiazides or digoxin. Cap at 2000 IU when the app has no blood test and no deficiency signal (HOUSE, from [S14] UL and [S25] null benefit) | `OFFER`, framed as an insurance dose, never as a performance or health outcome |
| iron | Iron | A (medical) | A [S7][S11] | Corrects iron deficiency, which does impair endurance capacity | Large in genuinely deficient athletes, zero and potentially harmful otherwise | Deficient endurance athletes, especially menstruating women | Prescriber-set. Not an app number | With vitamin C, away from calcium and tea | Reduces absorption of levothyroxine, quinolones, tetracyclines; proton pump inhibitors reduce iron absorption | Suppress ALWAYS unless a clinician has told the user to take it. Haemochromatosis makes unsupervised iron dangerous. Iron overdose is a leading cause of paediatric poisoning fatality | `ASK-ONLY` and the only response is the doctor line |
| zinc | Zinc | A (medical) | A [S7][S16] | Corrects zinc deficiency. There is no ergogenic claim for a replete person | None demonstrated for performance in replete adults | Deficiency populations | RDA 11 mg/day men, 8 mg/day women. UL 40 mg/day. 50 mg/day for 6 weeks measurably degraded copper status in healthy men [S36] | Irrelevant for the deficiency claim | Reduces absorption of quinolone and tetracycline antibiotics (separate by 2 hours or more); penicillamine; chronic use suppresses copper absorption [S16][S36] | Suppress: no deficiency signal, which for this app means always. Long-term daily zinc without a reason is a copper deficiency risk, not a neutral act | `ASK-ONLY`. See section 3.9 for why the shipped entry has to be removed |
| electrolyte | Electrolyte supplement (sodium first) | A (sports food) | A [S7][S11] | Replaces sodium and fluid lost in sweat during long or hot sessions, and helps rehydration afterwards | Meaningful for sessions over roughly 60 to 90 minutes, in heat, or in heavy sweaters. Not measurable for a 45 minute indoor gym session | Endurance athletes and team sport athletes in heat | Product dependent, which is the problem: commercial servings range from roughly 200 mg to over 1000 mg sodium | During and after long or hot sessions | Additive with a high-sodium diet against blood pressure management; interacts with sodium-restricted regimens | Suppress: hypertension, heart failure, kidney disease, or any stated sodium restriction. Suppress when the user's actual logged sessions are short and indoor | `SUGGEST` but only when the log justifies it (session duration, heat, or run/endurance modality), never as a default |
| protein | Isolated protein supplement (whey, casein, plant) | A (sports food) | A [S5], B [S23] | A convenient way to reach a protein target. The protein target is the claim, not the powder | +9% 1RM and +0.3 kg fat free mass versus training alone, plateauing near 1.6 g/kg/day [S23] | Healthy training adults | Deferred to R1 section 5.1 | Deferred to R1. [S6] establishes the anabolic window is at least 24 hours wide, so the app must not sell timing | Lactose intolerance and dairy allergy are the real-world issues | Suppress dairy forms on `FoodLimits.dairyFree` or a milk/dairy/whey/lactose allergy term | **Not a supplement in this app.** It lives in `FOODS` (`src/plan/foods.ts:32` whey, `:35` casein) and stays there |

### 2.3 AIS Group B candidates

| id | Supplement | AIS | Tier | Claim the evidence actually supports | Effect size | Population shown in | Dose | Timing | Interactions | Contraindications / suppress if | App class |
|----|-----------|-----|------|--------------------------------------|-------------|---------------------|------|--------|--------------|-------------------------------|-----------|
| fishOil | Fish oil (omega-3, EPA and DHA) | B [S8] | B [S24] | Raises omega-3 intake. Claims about soreness, recovery and adaptation are mixed and mostly small-study | Not quantified for any training outcome the app cares about. The best-established supplement-specific effect is a harm: a roughly 25% relative increase in atrial fibrillation risk across 7 cardiovascular outcome RCTs, rising with dose [S24] | Older, higher cardiovascular risk adults in the AF trials. Training studies are small and short | Doses must be expressed as **EPA + DHA**, not as grams of oil. A 1 g fish oil capsule typically holds 250 to 350 mg EPA + DHA. Studied ranges for training outcomes sit around 1 to 2 g/day EPA + DHA | With food, for tolerability and absorption | Antiplatelet and anticoagulant medication (warfarin, DOACs, clopidogrel, and aspirin at cardiac doses): additive bleeding risk at higher doses. Relevant before surgery | Suppress: fish or shellfish allergy; vegetarian and vegan diet styles; anticoagulant or antiplatelet medication; known atrial fibrillation or arrhythmia; pregnancy without a clinician's word | `OFFER`, with the dose stated as EPA + DHA and the AF line for anyone over 60 or reporting heart rhythm issues |
| collagen | Collagen or gelatin, with vitamin C | B [S8] | B [S29][S30][S31] | Raises blood markers of collagen synthesis after a dose taken before short loading. That is genuinely all that has been shown in humans | PINP roughly doubled versus placebo at 15 g. The tissue-level strength effect was measured in an **engineered ligament construct** bathed in subjects' serum, not in a human tendon [S29]. No trial shows fewer tendon injuries | n = 8 healthy males in the anchor study [S29]. Later resistance training work at 15 g/day is mixed on strength [S31] | 15 g gelatin or hydrolysed collagen with roughly 50 mg vitamin C, which is the studied protocol. 5 g gave a smaller response [S29][S30] | 1 hour before the loading bout in every study of record [S29][S30] | None established. It is a protein, and a poor quality one: it lacks tryptophan and must not displace the day's protein target (R1 section 5.1) | Suppress: vegan and vegetarian (collagen is always animal-derived, bovine, porcine or marine); fish allergy where the product is marine collagen and the source is unknown | `OFFER` to users doing genuine tendon loading (jumps, sprints, plyometrics), with a hedge string that says the evidence is early |
| multivitamin | Multivitamin | B [S8] | A [S17], A [S11] | Covers gaps in an inadequate diet. Nothing else | USPSTF: evidence INSUFFICIENT for multivitamins for cardiovascular or cancer prevention; recommends AGAINST beta-carotene and vitamin E [S17]. No performance effect in replete athletes [S11] | General adult populations in prevention trials | One standard serving | With food | Iron-containing products interact as per the iron row. Vitamin K content matters on warfarin. Retinol (preformed vitamin A) above 3000 mcg RAE is teratogenic, which makes the pregnancy case specific. Beta-carotene raises lung cancer risk in smokers | Suppress: pregnancy (needs a prenatal formulation chosen with a clinician, not a generic multi); haemochromatosis or any iron-loading condition; smokers where the product carries beta-carotene; on warfarin | `OFFER`, described as a gap filler only, never as health insurance or a performance aid |
| curcumin | Curcumin | B [S8] | C | Possible reduction in delayed onset muscle soreness. Trials are small, formulations are not comparable | Not quantified | Small samples, heterogeneous formulations | No defensible single dose | Not established | Antiplatelet effect at high doses; interferes with several CYP substrates | Suppress: anticoagulants, gallbladder disease, pregnancy | `ASK-ONLY` |
| probiotic | Probiotics | B [S8] | C | Strain-specific effects on GI symptoms in endurance athletes and possibly on upper respiratory illness days | Not quantified; strain-specific, so a category-level claim is meaningless | Endurance athletes, small trials | Strain and product specific | Daily | None broadly established | Suppress: immunocompromised users | `ASK-ONLY` |
| tartCherry | Tart cherry, beetroot polyphenols and other food polyphenols | B [S8] | C | Possible small effect on recovery markers and soreness | Not quantified | Small trials, inconsistent protocols | Food-form doses | Around hard sessions | None established | None specific | `ASK-ONLY`. These are foods; R4 owns them if they appear at all |

### 2.4 AIS Group C: evidence does not support a benefit

| id | Supplement | AIS | Tier | Why it is here | App class |
|----|-----------|-----|------|----------------|-----------|
| magnesium | Magnesium | C [S9] | B [S28] | AIS moved magnesium to Group C after reviewing the evidence. The sleep claim rests on 3 trials, 151 older adults, GRADE certainty LOW, whose own authors say the literature is substandard for making recommendations [S28]. **Supplemental magnesium UL is 350 mg/day for adults** [S15], so any range whose top is 400 mg exceeds the UL. Dose-limiting effect is diarrhoea. Interacts with tetracyclines, quinolones and bisphosphonates (separate by 2 hours); accumulates in kidney disease | `ASK-ONLY`. Must come out of the suggested catalog. See section 3.6 |
| bcaa | BCAA | C [S9] | B | Superseded by whole protein. If the protein target is met, BCAAs add nothing | `NEVER` (the app has no reason to name it) |
| hmb | HMB | C [S9] | B | Reclassified to Group C by AIS. Effects in trained lifters are not reproducible | `NEVER` |
| vitE | Vitamin E | C [S9] | A [S17] | USPSTF recommends AGAINST vitamin E for CVD or cancer prevention. High-dose antioxidants may blunt training adaptation | `NEVER` |
| vitC-highdose | High-dose vitamin C as an antioxidant | B (as a Group B tastant/antioxidant) [S8] | B | Low doses alongside collagen are fine and are part of the collagen protocol. High-dose antioxidant supplementation around training may blunt adaptation | `NEVER` as a standalone. Appears only as the 50 mg partner in the collagen row |
| glutamine | Glutamine | C | B | No performance or immune benefit in adequately fed athletes | `NEVER` |
| testBooster | "Testosterone boosters", tribulus, maca, DAA | D [S10] | B | AIS puts tribulus and maca in Group D. Category is a marketing construct and a contamination hotspot [S39][S40] | `NEVER` |
| fatBurner | "Fat burners", thermogenics | D-adjacent | B [S38][S41] | The category with the highest documented rate of undeclared stimulants [S38][S39] and a documented share of DILIN liver injury cases [S41] | `NEVER` |

### 2.5 Never named by the app, and why

These are the entries the pack exists to keep out. The rule is not "the app says they are
bad"; the rule is the app does not raise the subject. Naming a substance in a coaching app
is an implicit endorsement no disclaimer undoes.

| Substance or category | Reason | Source |
|-----------------------|--------|--------|
| Any multi-ingredient "pre-workout" as a product category | 17 products labelled with one stimulant contained nine different prohibited stimulants including deterenol, DMAA, DMHA/octodrine, BMPEA, phenpromethamine and higenamine; documented adverse events include palpitations, chest pain and cardiac arrest | [S38] |
| SARMs (ostarine, ligandrol, andarine), GW1516 | AIS Group D, WADA prohibited, sold openly in the supplement channel | [S10][S12] |
| Prohormones, DHEA, androstenedione, 19-nor compounds | AIS Group D. 14.8% of ordinary non-hormonal supplements already carry these as contaminants [S37] | [S10][S37] |
| Peptides and GH secretagogues (GHRP-2, CJC-1295, ipamorelin) | AIS Group D, prescription-only or unapproved drugs | [S10] |
| Ephedrine, DMAA, DMBA, bitter orange / synephrine, higenamine | AIS Group D stimulants, cardiac adverse events | [S10][S38] |
| Ashwagandha | Five cases of cholestatic liver injury with confirmed ashwagandha content and no other toxin, latency 2 to 12 weeks, prolonged jaundice. Popular demand does not offset a documented hepatotoxicity signal in an unsupervised app | [S42] |
| Green tea extract (concentrated catechins) | Established cause of acute hepatocellular injury including transplant-level cases | [S43] |
| Garcinia cambogia, usnic acid, "detox" and "cleanse" blends | LiverTox-documented hepatotoxicity; no benefit claim worth the risk | [S43] |
| Weight-loss and "hormone modulation" products generally | 38% of high-risk products from mainstream web shops contained undeclared prohibited substances | [S39] |
| Melatonin | Not a performance supplement. Dosing in the consumer market is wildly inconsistent, and it is a hormone. Sleep advice belongs in behaviour change, not in a bottle | HOUSE, informed by [S11] |
| Anything the app cannot name a dose, a population and a source for | The fence in section 4.1 | HOUSE |

### 2.6 The one-line summary the product team needs

Of the nine things BodyT ships today, exactly **two** (creatine, and electrolytes when the
session actually warrants them) survive contact with a Group A classification, a defensible
dose, a defensible timing claim and a general population. One (caffeine) survives on
evidence but is shipped at the wrong dose model and with no cutoff. The other six are
either Group B with an overstated claim, Group C, or over a Tolerable Upper Intake Level.

---

## 3. THE AUDIT: what BodyT ships to real users today

This section is the reason the pack exists. Everything below is live code in the deploy
branch, reaching real users through three screens. Nothing here is hypothetical.

### 3.1 What ships, verbatim

Two arrays. They are not the same array, and four entries are duplicated between them
character for character.

`src/plan/foods.ts:144-149`, the owner's booklet stack, consumed by `buildNaodMealPlan`
at `src/plan/foods.ts:211`:

```
144  export const SUPPLEMENTS: { id: SupplementId; name: string; dose: string; when: string }[] = [
145    { id: 'creatine', name: 'Creatine monohydrate', dose: '5 g', when: 'Daily, any time' },
146    { id: 'fishOil', name: 'Fish oil', dose: '1-2 g', when: 'With a meal' },
147    { id: 'vitD3', name: 'Vitamin D3', dose: '2000-4000 IU', when: 'Morning, with fat' },
148    { id: 'electrolytes', name: 'Electrolytes', dose: '1 serving', when: 'Around training / hot days' },
149  ]
```

`src/plan/foods.ts:194-204`, the catalog every generated plan and every user browsing the
stack sheet sees:

```
194  export const SUPPLEMENT_CATALOG: SupplementDef[] = [
195    { id: 'creatine', name: 'Creatine monohydrate', dose: '5 g', when: 'Daily, any time' },
196    { id: 'fishOil', name: 'Fish oil', dose: '1-2 g', when: 'With a meal' },
197    { id: 'vitD3', name: 'Vitamin D3', dose: '2000-4000 IU', when: 'Morning, with fat' },
198    { id: 'electrolytes', name: 'Electrolytes', dose: '1 serving', when: 'Around training / hot days' },
199    { id: 'magnesium', name: 'Magnesium glycinate', dose: '200-400 mg', when: 'Evening' },
200    { id: 'multivitamin', name: 'Multivitamin', dose: '1 serving', when: 'With breakfast' },
201    { id: 'caffeine', name: 'Caffeine / pre-workout', dose: '100-200 mg', when: '30-45 min pre-session' },
202    { id: 'collagen', name: 'Collagen + vitamin C', dose: '10-15 g', when: '30-60 min before jumps/sprints' },
203    { id: 'zinc', name: 'Zinc', dose: '15-25 mg', when: 'Evening, not with calcium' },
204  ]
```

The header comment at `src/plan/foods.ts:5-9` says the file's data comes from "the NAOD V3
PDF" and that "Protein numbers are the PDF's own (authoritative)". The supplement table has
no such provenance claim and no source at all. It is one person's stack, shipped to
strangers as a coach's recommendation.

### 3.2 The five structural findings, before any individual entry

**F1. Supplements bypass the food-limits filter that the same function applies to
groceries.** `src/plan/foods.ts:296-300` reads:

```
296  // A shopping list is an instruction too. Telling somebody with a nut
297  // allergy to buy nut butter is the same failure as putting it on a plate,
298  // so every line goes through the same filter the meals do.
299  const shop = (items: string[]) =>
300    items.filter((i) => blockedBy({ name: i, ingredients: [] }, limits) === null)
```

Eighteen lines later, at `src/plan/foods.ts:318-322`, the supplement list is built and
`limits` is never consulted:

```
318    supplements: SUPPLEMENT_CATALOG.filter(
319      (s) => dietStyle !== 'vegan' || !['fishOil', 'collagen'].includes(s.id),
320    )
321      .slice(0, 3)
322      .map((s) => ({ ...s })),
```

The file states the principle in its own words and then fails to apply it to the one
category where the instruction is swallowed rather than eaten. A user who types "fish" or
"shellfish" or "seafood" into the onboarding allergy box at
`src/screens/onboarding/MealStep.tsx:89-91` gets **Fish oil** in their default stack.
`src/plan/foodLimits.ts:71` already knows that "fish" means salmon, tuna, cod, sardine,
mackerel, anchovy, haddock and tilapia. Nothing calls it here. This is the single most
serious defect in the pack: an allergy answer the app collected, stored and honoured for
meals is ignored for the only item the user swallows as a concentrate.

**F2. The default stack is unconditional.** `src/plan/foods.ts:321` is `.slice(0, 3)`.
Every non-vegan user who completes onboarding gets creatine, fish oil and vitamin D3
written into their booklet, before the app knows their age, their medications, their
medical conditions, whether they are pregnant, or whether they wanted supplements at all.
Vegan users get creatine, vitamin D3 and electrolytes by the same slice. There is no
signal, no question, no opt-in. This is the opposite of "suggest only, never auto":
the items are written into `plan.mealPlan.supplements` at generation time and rendered as
tick-boxes the user is invited to complete each day
(`src/screens/meals/MealsScreen.tsx:213-230`).

**F3. Two sources of truth.** `SUPPLEMENTS` (`:144`) and `SUPPLEMENT_CATALOG` (`:194`)
duplicate four entries verbatim. Any dose correction has to be made twice. Half-fixing is
the default failure mode of a duplicated table, and the fix list in section 3.13 is long.

**F4. The type carries no safety information at all.** `src/types.ts:389-394`:

```
389  export interface SupplementDef {
390    id: SupplementId
391    name: string
392    dose: string
393    when: string
394  }
```

Four strings. There is nowhere to put a contraindication, an interaction, an evidence
tier, a source reference, or an upper limit, so the code cannot express any of them even
if somebody wanted to. `src/store/mealPlanSchema.ts:23-25` mirrors the same four fields, so
the persisted shape has the same hole. Section 6 replaces this.

**F5. Dose and timing are free strings, so nothing can validate them.** `dose: '2000-4000
IU'` is not a number the app can compare against a Tolerable Upper Intake Level, cannot be
scaled by body mass, and cannot be capped for a minor. Every dose in the catalog is a
string literal that no test, no schema and no engine can reason about.

### 3.3 `src/plan/foods.ts:195` and `:145`, creatine

```
{ id: 'creatine', name: 'Creatine monohydrate', dose: '5 g', when: 'Daily, any time' }
```

- **Dose: correct.** 3 to 5 g/day maintenance is exactly the ISSN position [S2]. 5 g is the
  right single number for a general population. Naming monohydrate specifically is also
  right: it is the studied form and the cheapest.
- **Timing: correct, and correct for the right reason.** "Daily, any time" refuses to make
  a timing claim, which is the honest reading of the evidence. The only pre versus post
  trial of record is n = 19 and largely null [S34]. Whoever wrote this line got it right.
- **Phrasing: allowed.** No claim is made at all, which is the safest possible framing.
- **Missing contraindications: yes, three.**
  1. **Kidney disease.** ISSN's own position is that creatine does not damage healthy
     kidneys, and also that people with pre-existing renal disease should be monitored by
     a physician [S2]. The app says nothing.
  2. **Under 18.** AAP guidance is that clinicians should discourage performance-enhancing
     substances including creatine in adolescents [S19]. The app does not know anyone's
     age (section 5.1), so it cannot honour this today.
  3. **Pregnancy and breastfeeding.** Not a known harm, but there is no safety dataset.
- **Missing, and this one is a product bug rather than a safety bug:** creatine causes a
  1 to 2 kg intracellular water gain in the first days to weeks [S35]. BodyT's own
  nutrition engine reads the weight trend and steps calories when the trend misses its
  band for 2 to 3 weeks (R1 section 4.2). A user who starts creatine on the app's
  suggestion will show a sudden gain that is not fat and not muscle, and the engine will
  respond to it. **The app suggests a supplement whose main side effect corrupts the input
  of its own adaptation loop, and the two systems do not know about each other.** Section
  6 proposes a `confoundsWeightTrend` flag on the record and a suppression window in the
  calorie-step rule.

**Verdict: the only entry in the catalog that is right as written.** It still needs the
kidney and minor gates and the weight-trend note.

### 3.4 `src/plan/foods.ts:196` and `:146`, fish oil

```
{ id: 'fishOil', name: 'Fish oil', dose: '1-2 g', when: 'With a meal' }
```

- **Dose: wrong, and wrong in the way that makes the number meaningless.** "1-2 g" of
  what? A typical 1 g fish oil capsule contains roughly 250 to 350 mg of EPA + DHA. Every
  dose in the omega-3 literature is expressed as EPA + DHA, not as grams of oil [S24]. A
  user reading "1-2 g" and taking two 1 g capsules is taking about 600 mg EPA + DHA, which
  is under a third of the studied range. A user taking 2 g of EPA + DHA is taking six
  capsules. **The string does not identify a dose.**
- **Timing: supported but trivial.** "With a meal" is fine for tolerability and absorption.
  No claim attached, so nothing to falsify.
- **Phrasing: the problem is what is absent.** The entry names no reason. A supplement in
  a coach's stack with no stated reason is read as "your coach thinks you should take
  this", which is a broader claim than any explicit sentence would be.
- **Missing contraindications: four, one of them serious.**
  1. **Fish and shellfish allergy.** See F1. `src/plan/foodLimits.ts:70-72` already holds
     the shellfish, fish and seafood families. Not consulted.
  2. **Anticoagulant and antiplatelet medication.** Additive bleeding risk at higher
     doses. The app has no medication field at all (section 5.1).
  3. **Atrial fibrillation.** The best-powered evidence about supplemental omega-3 is a
     harm signal: roughly 25% relative increase in AF across 7 cardiovascular outcome
     RCTs, rising with dose [S24]. An app that suggests fish oil to a 63 year old with
     palpitations, and separately runs an R6 red flag on palpitations
     (`research/R6-safety.md` RF-PALP), is contradicting itself between two screens.
  4. **Vegetarian.** See 3.11.
- **AIS class is B, not A** [S8]. The app presents it in the same visual weight as
  creatine, which is Group A.

**Verdict: the dose string is not a dose. Rewrite as EPA + DHA or drop the number.**

### 3.5 `src/plan/foods.ts:197` and `:147`, vitamin D3

```
{ id: 'vitD3', name: 'Vitamin D3', dose: '2000-4000 IU', when: 'Morning, with fat' }
```

- **Dose: the top of the range is the Tolerable Upper Intake Level.** The UL for adults
  is 4000 IU/day [S14]. The RDA is 600 IU. The app is suggesting a range that runs from
  3.3x the RDA to exactly the UL, to every user, with no blood test, no deficiency signal
  and no knowledge of the user's age. For a 12 year old the UL is still 4000 IU; for an
  8 year old it is 3000 IU and for a 3 year old it is 2500 IU [S14]. The app cannot tell
  the difference because it does not collect age (section 5.1).
- **A supplement range should not have its ceiling at the toxicity ceiling.** Any user
  who reads "2000-4000 IU" as "more is better" is at the UL from a single product before
  counting a multivitamin, which the same catalog also offers at `:200`, and which
  typically contains another 400 to 1000 IU. **The catalog can stack two of its own
  entries past the UL and has no way to notice.**
- **Timing: half wrong.** "with fat" is supported: absorption rises meaningfully when
  vitamin D is taken with a fat-containing meal [S33]. "Morning" is not supported by
  anything. It is filler that reads as precision.
- **Phrasing: no claim stated, but the implied claim is the problem.** Vitamin D in a
  training app implies performance or bone benefit. VITAL found no cancer or CVD benefit
  at 2000 IU/day over 5.3 years in 25,871 adults [S25], no fracture benefit [S26], and
  the Bolland meta-analysis found no musculoskeletal benefit [S27]. The only defensible
  claim is "corrects a low level", which the app cannot know is true for this user.
- **Missing contraindications: sarcoidosis and other granulomatous disease,
  hyperparathyroidism, history of hypercalcaemia or kidney stones, thiazide diuretics
  (hypercalcaemia risk), digoxin.** None mentioned.

**Verdict: cap at 2000 IU, drop "Morning", and state that the only reason is filling a
likely gap. UNSAFE AS WRITTEN in combination with the multivitamin entry.**

### 3.6 `src/plan/foods.ts:199`, magnesium glycinate

```
{ id: 'magnesium', name: 'Magnesium glycinate', dose: '200-400 mg', when: 'Evening' }
```

This is the entry that is factually over a published safety limit.

- **Dose: the top of the range exceeds the Tolerable Upper Intake Level.** The UL for
  **supplemental** magnesium in adults is **350 mg/day** [S15]. The UL applies to
  supplements specifically and excludes food magnesium, precisely because supplemental
  magnesium salts cause osmotic diarrhoea. The app's range tops out at 400 mg. This is not
  a judgement call or a conservative reading; it is a number above a published limit,
  shipped in a product.
- **Timing: "Evening" is an unstated sleep claim.** The word carries the claim without
  making it, which is worse, not better: the user infers "this helps me sleep" and the app
  never has to defend it. The evidence is 3 RCTs, 151 older adults, GRADE certainty LOW,
  whose authors write that the literature is "substandard for physicians to make
  well-informed recommendations" [S28]. Sleep onset latency fell 17 minutes in that
  population. The app's users are not that population.
- **AIS moved magnesium to Group C** [S9], meaning evidence not supportive of benefit
  among athletes.
- **Naming the glycinate form is a comparative claim the app cannot support.** There is no
  good head-to-head trial establishing glycinate over citrate or oxide for any outcome the
  app cares about. AIS lists magnesium oxide in Group C. Naming a form implies the app
  knows which form is better.
- **Missing interactions: three that matter.** Magnesium reduces absorption of
  tetracycline and quinolone antibiotics and of bisphosphonates (separate by at least 2
  hours), and accumulates dangerously in reduced kidney function [S13].

**Verdict: WRONG. The dose ceiling is above the UL and the timing implies a claim the
evidence does not support. Remove from the suggestable catalog; `ASK-ONLY` at most, and
if kept at all the range must end at 350 mg.**

### 3.7 `src/plan/foods.ts:201`, caffeine

```
{ id: 'caffeine', name: 'Caffeine / pre-workout', dose: '100-200 mg', when: '30-45 min pre-session' }
```

Two separate problems, and the first one is the most dangerous line in the file.

- **"/ pre-workout" must be deleted.** The entry equates a measured single ingredient with
  an unmeasured multi-ingredient proprietary blend. Pre-workout is the single highest-risk
  product category in the supplement market: 17 products labelled with one stimulant
  contained nine different prohibited stimulants including deterenol, DMAA, octodrine,
  BMPEA, phenpromethamine and higenamine, with documented adverse events up to cardiac
  arrest [S38]. 38% of high-risk sports nutrition products from mainstream web shops
  carried undeclared prohibited substances [S39]. **BodyT currently tells users that
  "pre-workout" is an acceptable way to take 100 to 200 mg of caffeine.** It is not the
  same product and it is not the same risk. This is a two-word fix with a large safety
  payoff.
- **Dose: the model is wrong even though the number is not dangerous.** The evidence is
  dosed per kilogram: 3 to 6 mg/kg [S3]. For a 60 kg user that is 180 to 360 mg; for a
  100 kg user, 300 to 600 mg. A flat 100 to 200 mg is below the studied range for almost
  everybody, which is defensible as a cautious starting dose but should be stated as one
  rather than presented as the dose.
- **Timing: off by the studied interval.** Every anhydrous caffeine protocol in the
  position stand uses roughly 60 minutes, because that is where plasma caffeine peaks
  [S3]. "30-45 min" is a gum or liquid number applied to a capsule.
- **Missing contraindications: six, and the app currently has none of them.**
  Pregnancy (ACOG ceiling is 200 mg/day total including coffee [S18], and the app's own
  suggestion alone could hit it); under 18 [S19]; arrhythmia or palpitations, which the
  app separately treats as an R6 red flag; anxiety and panic disorder; uncontrolled
  hypertension; and an **evening cutoff**, since 400 mg six hours before bed cost more
  than an hour of measured sleep in people who did not notice it happening [S32].
- **Missing interaction:** fluvoxamine and other strong CYP1A2 inhibitors raise caffeine
  exposure substantially.
- **Missing anti-doping note:** caffeine is on the WADA monitoring programme, and any
  multi-ingredient stimulant product is a strict-liability risk for a tested athlete
  [S12].

**Verdict: UNSAFE AS WRITTEN because of "pre-workout". Highest priority fix in the pack.**

### 3.8 `src/plan/foods.ts:202`, collagen

```
{ id: 'collagen', name: 'Collagen + vitamin C', dose: '10-15 g', when: '30-60 min before jumps/sprints' }
```

- **Dose: the bottom of the range is below the studied dose.** The anchor study compared
  5 g and 15 g and found the response was dose dependent, with 15 g roughly doubling the
  synthesis marker [S29]. 10 g is an interpolation nobody measured. The vitamin C partner
  has **no dose at all** in the entry, even though the protocol is specifically vitamin
  C-enriched gelatin and the vitamin C is part of the mechanism [S29][S30].
- **Timing: close but not the studied window.** Every study of record used **1 hour**
  before loading [S29][S30]. "30-60 min" starts half an hour early.
- **Phrasing: this is the entry that makes an unearned structure claim.** "before
  jumps/sprints" tells the user that collagen does something protective for the tissue
  those activities load. What was actually shown: a blood marker of collagen synthesis
  roughly doubled in **8 healthy males**, and the mechanical effect was measured in an
  **engineered ligament construct** bathed in their serum, not in a human tendon [S29].
  No trial shows fewer tendon injuries in humans. The distance between "PINP rose in eight
  men" and "take this before jumps" is the exact distance the claims fence exists to
  police.
- **AIS class B** [S8]: emerging, deserving of consideration, not established.
- **Missing contraindications:** vegetarian (collagen is always animal-derived; only vegan
  is filtered today, see 3.11) and fish allergy where the product is marine collagen.
- **Missing note:** collagen is a low quality protein with no tryptophan and must not
  count toward the day's protein target (R1 section 5.1).

**Verdict: overstated. Fix the dose to 15 g, the timing to 1 hour, add the vitamin C
number, and hedge the reason honestly.**

### 3.9 `src/plan/foods.ts:203`, zinc

```
{ id: 'zinc', name: 'Zinc', dose: '15-25 mg', when: 'Evening, not with calcium' }
```

This entry should not exist.

- **There is no claim.** Zinc is AIS Group A only as a **medical** supplement, that is,
  for correcting a documented deficiency [S7]. There is no ergogenic effect in a replete
  person. The app has no deficiency signal and cannot have one.
- **Dose: 1.4 to 3.1 times the RDA, indefinitely, with no stop condition.** RDA is 11 mg
  for men and 8 mg for women [S16]. The entry has no duration and the UI has no end date,
  so "Evening" means every evening forever.
- **The real risk is copper, and it is not mentioned.** Chronic zinc intake above the RDA
  suppresses copper absorption; 50 mg/day for 6 weeks measurably degraded copper status
  in healthy men [S36], and copper deficiency presents as anaemia and neurological signs.
  A daily 25 mg habit for a year is a genuine copper concern, not a theoretical one.
- **The interaction it names is not the one that matters.** "not with calcium" is folk
  precision. The documented, clinically relevant interaction is that zinc reduces
  absorption of **quinolone and tetracycline antibiotics** and interacts with
  penicillamine [S13]. The entry states a minor interaction with confidence and omits the
  ones a pharmacist would flag.

**Verdict: REMOVE. There is no user of this app for whom the app can justify suggesting
zinc.**

### 3.10 `src/plan/foods.ts:198` and `:148`, electrolytes; `:200`, multivitamin

**Electrolytes**, `{ dose: '1 serving', when: 'Around training / hot days' }`:

- **"1 serving" is not a dose.** Commercial electrolyte servings range from roughly 200 mg
  to over 1000 mg of sodium. The number that matters is sodium, and the entry does not
  name it.
- **The trigger is too wide.** Sodium replacement matters for sessions beyond roughly 60 to
  90 minutes, in heat, or for heavy sweaters [S11]. "Around training" includes a 40 minute
  indoor lifting session where it does nothing. BodyT knows session duration and modality
  from its own logs, so this is a suggestion it could actually condition on and does not.
- **Missing contraindications: hypertension, heart failure, kidney disease, and any
  sodium-restricted diet.** Suggesting a sodium load to a hypertensive user is the clearest
  medication-adjacent failure in the catalog after fish oil and anticoagulants.

**Multivitamin**, `{ dose: '1 serving', when: 'With breakfast' }`:

- **The claim is unstated and the evidence is against the implied one.** USPSTF found
  evidence insufficient for multivitamins in CVD or cancer prevention and recommends
  against beta-carotene and vitamin E [S17]. There is no performance effect in replete
  athletes [S11]. The only honest framing is "covers gaps in an imperfect diet".
- **Missing contraindications: four specific ones.** Pregnancy needs a prenatal
  formulation, and generic multivitamins can carry preformed vitamin A (retinol) at levels
  that are teratogenic above 3000 mcg RAE. Iron-containing multivitamins are a real risk in
  haemochromatosis. Beta-carotene raises lung cancer risk in smokers. Vitamin K content
  matters on warfarin.
- **It stacks with the vitamin D entry past the UL**, see 3.5.

### 3.11 The dietary filter at `src/plan/foods.ts:318-322`

```
318    supplements: SUPPLEMENT_CATALOG.filter(
319      (s) => dietStyle !== 'vegan' || !['fishOil', 'collagen'].includes(s.id),
320    )
```

- **Vegetarians get fish oil and collagen.** The exclusion fires only for `'vegan'`.
  `DietStyle` includes `'vegetarian'` (`src/screens/onboarding/MealStep.tsx:23`), and
  vegetarians do not eat fish. Collagen is animal-derived in every commercial form, so
  vegetarians should not be offered it either. The test at `src/plan/foods.test.ts:67`
  checks the vegan case and stops there, which is why this has survived.
- **Pescatarians are handled correctly by accident**, since fish is fine for them.
- **`.slice(0, 3)` is a silent policy.** The first three surviving entries become the
  user's stack. Reordering the catalog array silently changes what every future user is
  told to take. There is no comment marking `:321` as a product decision, and it is one.

### 3.12 UI layer findings

| Finding | file:line | Severity |
|---------|-----------|----------|
| An empty dose field falls back to the literal string `', '`, so a user-added supplement renders as ", · Daily" in three screens. This is almost certainly damage from the em dash sweep (commit 84a120d, "Em dashes are gone everywhere") replacing a dash placeholder with a comma-space | `src/screens/meals/SupplementStackSheet.tsx:67` | Cosmetic, but it is visible in the supplement UI on every user-added item with no dose |
| The dose and timing strings render with equal visual weight for a Group A single ingredient and for anything a user typed by hand, in three places. Nothing distinguishes app-authored advice from user-entered text | `src/screens/meals/SupplementStackSheet.tsx:32`, `src/screens/meals/PlanView.tsx:157`, `src/screens/meals/MealsScreen.tsx:224` | Medium. The app lends its authority to strings it did not write |
| A user can add any name at all, including a Group D substance, and the app renders it inside a section headed "My supplement stack" with a daily tick box. Storing it is correct; the app should not editorialise, but it also should not present it identically to its own suggestions | `src/screens/meals/SupplementStackSheet.tsx:56-72` | Medium |
| Daily tick boxes on suggested supplements turn a suggestion into an adherence target. Ticking creatine every day is streak-shaped behaviour applied to something the user was never asked to consent to taking | `src/screens/meals/MealsScreen.tsx:213-230`, `src/logic/mealActions.ts:60-64` | Medium. Product decision, owner call |
| No screen anywhere carries a "this is not medical advice" line, a third-party-testing note, or a doctor prompt | all three screens | High |

### 3.13 Fix list, ranked by severity

| # | Fix | file:line | Why now |
|---|-----|-----------|---------|
| 1 | Delete `/ pre-workout` from the caffeine name | `src/plan/foods.ts:201` | Endorses the highest-contamination product category [S38][S39]. Two-word change |
| 2 | Remove the zinc entry | `src/plan/foods.ts:203` | No supportable claim for any user of this app; chronic copper risk [S16][S36] |
| 3 | Cap magnesium at 350 mg or remove the entry | `src/plan/foods.ts:199` | Shipped range exceeds the supplemental UL [S15] |
| 4 | Run supplements through `blockedBy` with the user's `FoodLimits` | `src/plan/foods.ts:318-322` | A stored fish allergy is currently ignored for fish oil (F1) |
| 5 | Exclude fish oil and collagen for `'vegetarian'`, not only `'vegan'` | `src/plan/foods.ts:319` | Straight logic bug |
| 6 | Cap vitamin D at 2000 IU and delete "Morning" | `src/plan/foods.ts:197`, `:147` | Ceiling currently sits at the UL and stacks with the multivitamin [S14] |
| 7 | Express fish oil as EPA + DHA, or remove the number | `src/plan/foods.ts:196`, `:146` | Current string does not identify a dose |
| 8 | Collagen: 15 g, 1 hour before, name the vitamin C dose, hedge the reason | `src/plan/foods.ts:202` | Dose and timing both off the studied protocol [S29][S30] |
| 9 | Condition the electrolyte suggestion on session duration, modality or heat | `src/plan/foods.ts:198`, `:148` | The app has the log and does not use it |
| 10 | Replace the default `.slice(0, 3)` with "empty stack plus an invitation" | `src/plan/foods.ts:321` | "Suggest only, never auto" is a repo non-negotiable and this violates it |
| 11 | Add the caffeine evening cutoff and per-kg framing | `src/plan/foods.ts:201` | [S3][S32] |
| 12 | Fix the `', '` dose fallback | `src/screens/meals/SupplementStackSheet.tsx:67` | Visible nonsense string |
| 13 | Collapse `SUPPLEMENTS` and `SUPPLEMENT_CATALOG` into one table | `src/plan/foods.ts:144-149`, `:194-204` | Two sources of truth guarantee a half-applied fix |
| 14 | Replace `SupplementDef` with `SupplementRecord` | `src/types.ts:389-394`, section 6 | Nothing above can be enforced by a type that holds four strings |
| 15 | Tell the calorie-step rule about creatine water weight | R1 section 4.2 consumer | The app's own suggestion corrupts its own adaptation input [S35] |

Note for whoever takes fix 10: `src/plan/generator.test.ts:170` asserts
`expect(mp.supplements.length).toBeGreaterThanOrEqual(1)` and
`src/store/store.test.ts:239` asserts the migrated owner plan contains `creatine`. Both
tests encode the current behaviour and both will need to change deliberately, not
incidentally.

---

## 4. THE CLAIMS FENCE

### 4.1 What kind of thing the app is doing when it names a supplement

BodyT is a general wellness app. It does not diagnose, treat, cure or prevent anything,
and it must not appear to. The nearest legal analogue for what a supplement line does is
the structure/function claim boundary that governs supplement labels: a product may
describe an effect on the normal structure or function of the body, and may not claim to
treat a disease [S20]. Anything a coaching app says about a supplement has to sit inside
that same boundary, be truthful and non-misleading, and be backed by competent and
reliable evidence.

Three practical consequences, and they are stricter than the label rules because a coach
is more persuasive than a bottle:

1. **Naming is endorsing.** Putting a substance in a list headed "Supplement stack",
   inside a personalised plan, with a dose and a time, is a recommendation. There is no
   disclaimer that converts it into neutral information.
2. **The claim is the narrowest sentence the evidence supports, or there is no sentence.**
   If the app cannot state the reason in one honest short line, it does not carry the item.
3. **Silence still claims.** An entry with a dose and a time and no stated reason
   (every entry shipping today) is read as "your coach thinks you need this". Unstated
   claims are harder to audit than stated ones, which is why section 6 makes the reason a
   required field.

### 4.2 The four claim classes

| Class | Meaning | Example that qualifies |
|-------|---------|------------------------|
| STATE | The app may say it plainly | "Creatine helps you get more out of hard sets." [S2] |
| HEDGE | The app may say it only with the uncertainty attached, in the same sentence | "Early research on collagen before jumping is promising. It is not settled." [S29][S31] |
| SILENT | The app carries the item with a dose and no reason, or does not carry it | Multivitamin as a gap filler |
| FORBIDDEN | The app never says it, in any wording | Anything in 4.3 |

### 4.3 Forbidden phrasings, with the rewrite

Every "safe" string below is written to the repo voice: short, casual, no jargon, no em
dashes, suggest only. These are copy candidates, not shipped strings.

| # | Forbidden phrasing (or shipped string) | Why it is over the line | Safe rewrite |
|---|----------------------------------------|--------------------------|--------------|
| C1 | "Prevents injury" / "protects your tendons" / "keeps your joints healthy" | Disease and injury prevention claim. No human trial shows a supplement reducing tendon injuries [S29][S31] | "Some early research says collagen before jumping might help the tissue adapt. Worth a try, not a guarantee." |
| C2 | `'30-60 min before jumps/sprints'` as shipped at `src/plan/foods.ts:202` | Implies a protective mechanism during that activity that was shown in a lab construct, not in a person | "About an hour before jumping or sprinting, if you want to try it." |
| C3 | "Boosts your immune system" | Disease claim, and the underlying evidence is strain and context specific | Do not carry the item. |
| C4 | "Fixes your sleep" / "for better sleep" / `'Evening'` on magnesium at `:199` | Treatment claim for insomnia on 3 small trials rated LOW certainty [S28] | Do not carry the item. If a user adds it themselves: "Noted. The sleep evidence here is thin, so treat it as an experiment." |
| C5 | "Boosts testosterone" | Hormone modulation claim, and the category is a contamination hotspot [S10][S39] | Never mention. |
| C6 | "Burns fat" / "speeds up your metabolism" | Treatment-adjacent weight claim; highest adulteration category [S38][S41] | Never mention. |
| C7 | "Reduces inflammation" | Reads as a disease claim | "Some people find it helps them feel less beaten up. The evidence is mixed." (HEDGE, only for items that earn it) |
| C8 | "You need this" / "you are probably deficient" | Implies a diagnosis the app cannot make | "Most people get enough from food. This is just insurance if your diet is patchy." |
| C9 | "Clinically proven" / "research-backed" / "science-based" | Marketing certainty language the playbook already bans (line 874) | Name the actual limit instead: "Tested in a handful of small studies." |
| C10 | "Safe" or "no side effects" | Unqualifiable, and false for several catalog items | "Common at this dose. If anything feels off, stop and ask a doctor." |
| C11 | "Take 4000 IU" (shipped ceiling at `:197`, `:147`) | Sits at the Tolerable Upper Intake Level with no deficiency signal [S14] | "2000 IU with your biggest meal is a sensible insurance dose." |
| C12 | "Take 400 mg" magnesium (shipped at `:199`) | Above the 350 mg supplemental UL [S15] | Do not carry the item. |
| C13 | `'Caffeine / pre-workout'` (shipped at `:201`) | Equates a measured ingredient with the most-adulterated product category [S38] | "Caffeine. Plain, so you know what you are getting." |
| C14 | "Loading phase required" / any protocol stated as mandatory | Turns a suggestion into an instruction | "You can just take 5 g a day. No loading needed." |
| C15 | "Stack" language that implies synergy between items | Combination claim, unsupported | Keep the word "stack" only as the name of the user's own list, never as a claimed combination |
| C16 | "Better absorbed" / "the best form" (as in "Magnesium glycinate" at `:199`) | Comparative bioavailability claim with no head-to-head evidence | Name the plain form, or name none |
| C17 | "Supports recovery" without a hedge | Sounds specific, means nothing, and is read as a promise | "It may take the edge off. Hard to say for any one person." |
| C18 | "Everyone should take X" / a default stack written in without asking | Violates suggest only, never auto, and cannot honour any contraindication | "Want me to suggest a couple of basics? Totally optional." |
| C19 | "Helps you lose weight" | Weight-loss treatment claim | Never mention. |
| C20 | "Natural, so it is safe" | Directly contradicted by the hepatotoxicity record [S41][S42][S43] | Never say. |
| C21 | Any dose given without a population, e.g. `'1 serving'` at `:198` and `:200` | Not a dose. The user cannot act on it and the app cannot check it | Name the number that matters: "Look for around 500 mg sodium a serving." |
| C22 | "Ask your coach" as a substitute for a doctor line | The app is the coach. It cannot refer to itself | Use the doctor line in 4.4 |

### 4.4 What triggers a "talk to a doctor" line

The line fires **before** the suggestion is made, not after, and the suggestion is
suppressed either way. Suppression and the doctor line are separate: suppression is silent
routing (section 5), the doctor line is copy the user reads.

| Trigger | Fires the line? | Copy candidate |
|---------|-----------------|----------------|
| Any medication reported at all | Yes, once | "Since you are on medication, run any supplement past your doctor or pharmacist first. Some of them interact." |
| Anticoagulant, antiplatelet, thyroid, diuretic, digoxin, antibiotics named | Yes, and suppress the specific item | "Worth checking with your pharmacist. This one can interact with what you are taking." |
| Pregnancy or breastfeeding | Yes, and suppress everything except a clinician-chosen prenatal | "During pregnancy this is your provider's call, not mine. I will leave supplements out of the plan." |
| Kidney or liver condition reported | Yes, and suppress everything | "With a kidney or liver condition, supplements are a doctor conversation. I will keep them out of your plan." |
| Under 18 | No line about doctors is needed; suppress the whole feature | "Supplements are not part of a plan at your age. Food and sleep do more anyway." |
| Heart rhythm issue, palpitations, high blood pressure | Yes, suppress caffeine, electrolytes, bicarbonate, fish oil | "Given the heart stuff, skip the stimulants and salty electrolyte mixes unless a doctor says otherwise." |
| Any R6 RED flag active | No supplement copy appears at all | R6 owns the screen |
| User asks about something on the NEVER list | Yes | "That one is outside what I will suggest. If you are set on it, talk it through with a doctor first." |
| Competitive or tested athlete | Different line, not the doctor line | "If you get drug tested, only use products with a third party tested logo. Contamination is common and the rule is strict." [S12][S21] |

### 4.5 Standing copy rules for this feature

1. Never more than two sentences per supplement.
2. Never a reason the app cannot source. `SILENT` is an allowed outcome.
3. The word "suggest" or "optional" appears wherever the app introduces the feature.
4. No em dashes, per the repo non-negotiable.
5. No jargon: no "bioavailability", "ergogenic", "structure/function", "upper limit",
   "meta-analysis". Say "how much your body takes in", "helps performance", "the most it
   makes sense to take".
6. Never a streak, badge, or adherence pressure attached to a supplement (see 3.12).
7. One "not medical advice" line, once, where the feature is introduced, in plain words:
   "I am a coach, not a doctor. This is general info, not a prescription."
8. The app never tells a user to stop a medication, change a prescribed dose, or take a
   supplement instead of one.

