# R13 POPULATION LEARNING, COHORT INFERENCE AND PRIVACY-PRESERVING AGGREGATION

Job: R13. Date: 2026-08-18. Scope: what BodyT may learn across users, how a cohort prior blends
with an individual's own history, how cohorts are cut without leaking identity, what may leave a
device and in what form, and what a brand new athlete gets on day zero. Playbook v12 sections
41.1, 52.1 to 52.11, 55.4. NO production code here. Design plus evidence.

This pack plugs into `research/B3-knowledge-store.md`. Everything it proposes lands inside B3's
`KnowledgeRecord` envelope on the `population` domain (B3 section 4), ships through B3's warm
pack mechanism (B3 section 2), and is retrieved through B3's five stage pipeline under the hard
`PACKET_MAX_RECORDS = 24` / `PACKET_MAX_BYTES = 32_768` cap (B3 section 5, stage 4).

## The four rules this pack is built inside, restated because they decide every design choice

1. **Local first and deterministic.** The individual engine works fully offline with zero cloud.
   Population learning produces PRIORS THAT SHIP AS DATA. There is never a runtime service call
   to a population model. This is what forces the offline house default to stay in the HOT tier
   and the learned prior to be a WARM refinement that can only ever be absent, never required.
2. **Zero runtime LLM calls.** Every blend in this pack is arithmetic with a closed form.
3. **Suggest only, never auto.** A cohort prior may move a suggested number. It may never move a
   safety gate, an explicit preference, a trainer instruction, or a load without the athlete
   accepting it. Playbook 52.1 decision rule, and the shipped precedent in
   `src/engine/calibration.ts`.
4. **The privacy fence is one directional.** A phone number and a recovery hash never appear in
   any cloud surface reachable by population learning. Route points never leave the device in any
   form, aggregated or not. Supabase project is `bodytea-prod`.

## Conventions

- **Prior** means a cohort level estimate that ships as data. **Individual estimate** means a
  number computed on device from this athlete's own logs. **Blend** means the shrunk combination.
- **Estimand** is the specific quantity being learned, named and versioned. There are eleven in
  section 3.1. Population learning is not a vague capability, it is a fixed list.
- **n** is the count of this athlete's usable observations for one estimand. **m** is the count
  of contributing athletes in a cohort cell.
- **k** is the shrinkage constant. It is `EPV / VHM`: expected within athlete variance over
  variance of the true athlete means. This is Buhlmann credibility [S7] and it is also what
  `PRIOR_STRENGTH = 6` in `src/engine/calibration.ts:69` already is, without the name.
- Evidence tiers follow B3 section 4: **A** position stand, guideline body, systematic review, or
  a foundational peer reviewed result. **B** single trial, single strong empirical paper, or an
  authoritative reproduction. **C** summary level access, contested, or a secondary report.
  **D** HOUSE HEURISTIC, `source_refs` may be empty.
- Every number in sections 3 to 6 is either derived in place from a cited quantity, or labelled
  HOUSE. Nothing is a guess wearing a decimal point.
- No em dashes anywhere in this file, per the standing copy rule.

Contents: 1 sources · 2 audit of the live code · 3 the two layer model and the shrinkage rule ·
4 cohort definition and minimum cell size · 5 the privacy fence and threat model · 6 cold start ·
7 typed schema proposal and the files that change · 8 eval fixtures · 9 what not to build yet ·
10 integration notes and acceptance criteria.

---

## 1. SOURCES

All accessed 2026-08-18. "What was taken" is the only thing this pack uses from each source.

### 1.1 Hierarchical models, partial pooling and empirical Bayes shrinkage

| ID | Tier | Source | URL | What was taken |
|----|------|--------|-----|----------------|
| S1 | A | James W, Stein C, "Estimation with Quadratic Loss", Proc. Fourth Berkeley Symposium 1961;1:361-379 | https://projecteuclid.org/ebooks/berkeley-symposium-on-mathematical-statistics-and-probability/Proceedings-of-the-Fourth-Berkeley-Symposium-on-Mathematical-Statistics-and/chapter/Estimation-with-Quadratic-Loss/bsmsp/1200512173 | The founding result: for three or more means estimated jointly, the sample mean is inadmissible under total squared error loss, and a shrinkage estimator dominates it. Shrinking an individual estimate toward a group mean is not a compromise, it strictly reduces expected error |
| S2 | A | Efron B, Morris C, "Data Analysis Using Stein's Estimator and Its Generalizations", JASA 1975;70(350):311-319 | https://www.tandfonline.com/doi/abs/10.1080/01621459.1975.10479864 | The empirical Bayes reading of James-Stein, worked on real data including the 18 batting averages. The shrinkage factor is estimated FROM the data rather than assumed, which is the licence to derive `k` per estimand instead of hand typing it |
| S3 | B | Efron B, Morris C, "Stein's Paradox in Statistics", Scientific American 1977;236(5):119-127 | https://efron.ckirby.su.domains/other/Article1977.pdf | The plain language statement of the tradeoff: shrinkage reduces total error across the group while sometimes making one individual's estimate worse. Directly relevant to a coaching app, where the person harmed by shrinkage is a real user with a name |
| S4 | A | Efron B, Morris C, "Stein's Estimation Rule and Its Competitors: An Empirical Bayes Approach", JASA 1973;68(341):117-130 | https://www.tandfonline.com/doi/abs/10.1080/01621459.1973.10481350 | The limited translation rule: cap how far shrinkage may move any single estimate, so an atypical individual is protected. This is exactly `MAX_DRIFT = 0.5` in `src/engine/calibration.ts:66`, arrived at independently |
| S5 | A | Gelman A, Hill J, "Data Analysis Using Regression and Multilevel/Hierarchical Models", Cambridge University Press 2007 | http://www.stat.columbia.edu/~gelman/arm/ | Complete pooling, no pooling, and partial pooling as the three options; partial pooling weights the group mean by `sigma_y^2 / (sigma_y^2 + n * sigma_alpha^2)` and the individual mean by the complement. Multilevel models are the correct frame for "many athletes, few observations each" |
| S6 | A | Gelman A, Carlin JB, Stern HS, Dunson DB, Vehtari A, Rubin DB, "Bayesian Data Analysis", 3rd ed., ch. 5 "Hierarchical Models" | http://www.stat.columbia.edu/~gelman/book/ | The eight schools example: the posterior mean for each school is a precision weighted average of its own estimate and the pooled mean, and with a small between group variance the estimates collapse almost entirely onto the pooled value |
| S7 | A | Buhlmann H, "Experience Rating and Credibility", ASTIN Bulletin 1967;4(3):199-207 | https://www.cambridge.org/core/journals/astin-bulletin-journal-of-the-iaa/article/experience-rating-and-credibility/0EC60711D65BFF225845CBA50C4B04D4 | The credibility factor `Z = n / (n + k)` with `k = EPV / VHM`, expected value of process variance over variance of hypothetical means. This is the exact algebraic form already shipped in `calibration.ts`, and it supplies the missing piece: `k` is a measurable ratio, not a taste |
| S8 | A | Morris CN, "Parametric Empirical Bayes Inference: Theory and Applications", JASA 1983;78(381):47-55 | https://www.tandfonline.com/doi/abs/10.1080/01621459.1983.10477920 | Estimating the hyperparameters from the data and the correction needed because that estimation is itself uncertain. The reason a cohort cell needs many more members than intuition suggests before its mean is a usable prior |

### 1.2 Cold start and recommender systems

| ID | Tier | Source | URL | What was taken |
|----|------|--------|-----|----------------|
| S9 | A | Schein AI, Popescul A, Ungar LH, Pennock DM, "Methods and Metrics for Cold-Start Recommendations", SIGIR 2002:253-260 | https://dl.acm.org/doi/10.1145/564376.564421 | The canonical statement of the cold start problem and its three distinct sub problems (new user, new item, new community). Content and attribute based features beat collaborative signal exactly when history is absent, which is the argument for cutting cohorts on declared training context rather than on behavioural similarity that does not exist yet |
| S10 | A | Koren Y, Bell R, Volinsky C, "Matrix Factorization Techniques for Recommender Systems", IEEE Computer 2009;42(8):30-37 | https://ieeexplore.ieee.org/document/5197422 | Baseline predictors with per user and per item biases shrunk toward the global mean by a regularisation constant, i.e. the same `n / (n + k)` structure in production at Netflix scale. Also the explicit warning that a latent factor model needs history the cold start user does not have |
| S11 | B | Li L, Chu W, Langford J, Schapire RE, "A Contextual-Bandit Approach to Personalized News Article Recommendation", WWW 2010:661-670 | https://arxiv.org/abs/1003.0146 | LinUCB and offline replay evaluation. Taken here mainly as the thing NOT to do: an exploration policy that deliberately serves a suboptimal arm is incompatible with suggest only coaching and with a safety gate that must never be an experimental arm (playbook 52.6) |
| S12 | B | Chapelle O, Li L, "An Empirical Evaluation of Thompson Sampling", NeurIPS 2011 | https://papers.nips.cc/paper_files/paper/2011/hash/e53a0a2978c28872a4505bdb51db06dc-Abstract.html | Posterior sampling as a low machinery alternative to explicit exploration, and the delayed feedback result: with feedback delayed by weeks the regret advantage of bandit methods over a fixed policy largely disappears. Training outcomes are delayed by weeks to months, so this is the empirical basis for not running bandits at all |

### 1.3 Federated learning and its real failure modes at small scale

| ID | Tier | Source | URL | What was taken |
|----|------|--------|-----|----------------|
| S13 | A | McMahan HB, Moore E, Ramage D, Hampson S, Aguera y Arcas B, "Communication-Efficient Learning of Deep Networks from Decentralized Data", AISTATS 2017 | https://arxiv.org/abs/1602.05629 | FedAvg. Also the honest reporting that non IID client data slows convergence and can destabilise it, and that the method assumes a large client population sampled per round |
| S14 | A | Kairouz P, McMahan HB, Avent B, et al., "Advances and Open Problems in Federated Learning", Foundations and Trends in ML 2021;14(1-2):1-210 | https://arxiv.org/abs/1912.04977 | The cross device setting is defined as massively distributed with client counts far exceeding per client example counts, clients unreliable and typically participating at most once, and no client addressability. Secure aggregation, DP and robustness are listed as open problems, not solved features |
| S15 | A | Bonawitz K, Ivanov V, Kreuter B, et al., "Practical Secure Aggregation for Privacy-Preserving Machine Learning", ACM CCS 2017:1175-1191 | https://dl.acm.org/doi/10.1145/3133956.3133982 | Secure aggregation with dropout tolerance, and its cost: multiple communication rounds, pairwise key agreement, and a server that must be honest about the participant set. The protocol's security degrades as the participant count per round falls |
| S16 | A | Bonawitz K, Eichner H, Grieskamp W, et al., "Towards Federated Learning at Scale: System Design", MLSys 2019 | https://arxiv.org/abs/1902.01046 | Production numbers: rounds are configured with a target client count and a fraction that must report before the round is accepted, device eligibility requires idle, charging and unmetered network, and a substantial fraction of selected clients drop out mid round. A round is abandoned when too few report |
| S17 | B | Zhao Y, Li M, Lai L, Suda N, Civin D, Chandra V, "Federated Learning with Non-IID Data", 2018 | https://arxiv.org/abs/1806.00582 | Accuracy loss of up to 55% for a CNN trained on highly skewed non IID client data, attributed to weight divergence. Fitness clients are extremely non IID by construction, since each athlete trains one goal on one equipment set |
| S18 | B | Wang H, Sreenivasan K, Rajput S, et al., "Attack of the Tails: Yes, You Really Can Backdoor Federated Learning", NeurIPS 2020 | https://arxiv.org/abs/2007.05084 | A small number of malicious clients can implant durable behaviour in the global model, and defences that work on the head of the distribution do not protect the tail. With few clients per cohort cell the ratio of attackers to honest clients is the worst it will ever be |

### 1.4 Differential privacy

| ID | Tier | Source | URL | What was taken |
|----|------|--------|-----|----------------|
| S19 | A | Dwork C, McSherry F, Nissim K, Smith A, "Calibrating Noise to Sensitivity in Private Data Analysis", TCC 2006:265-284 | https://link.springer.com/chapter/10.1007/11681878_14 | The definition, the Laplace mechanism, and sensitivity: the noise required scales with how much one individual can move the output. A sum with an unbounded per person contribution has unbounded sensitivity and therefore cannot be released privately at all without a cap |
| S20 | A | Dwork C, Roth A, "The Algorithmic Foundations of Differential Privacy", Foundations and Trends in TCS 2014;9(3-4):211-407 | https://www.cis.upenn.edu/~aaroth/Papers/privacybook.pdf | Sequential composition: k queries at epsilon each cost k*epsilon in total. Group privacy: an (epsilon, 0) mechanism gives k*epsilon for a group of size k. The budget is consumed across the LIFETIME of the dataset, which is why a per release epsilon with no global accounting is theatre |
| S21 | A | Erlingsson U, Pihur V, Korolova A, "RAPPOR: Randomized Aggregatable Privacy-Preserving Ordinal Response", ACM CCS 2014:1054-1067 | https://arxiv.org/abs/1407.6981 | Local DP in production at Chrome scale. The load bearing detail for us: local DP needs very large populations to recover a usable signal, because the noise is added per client rather than once centrally |
| S22 | B | Tang J, Korolova A, Bai X, Wang X, Wang X, "Privacy Loss in Apple's Implementation of Differential Privacy on MacOS 10.12", 2017 | https://arxiv.org/abs/1709.02753 | Reverse engineered per submission epsilon of 6 on macOS and 14 on iOS, with data sent daily and no cross day budget accounting, so the effective lifetime epsilon is unbounded. The concrete example of how a DP deployment fails: not by getting the mechanism wrong, but by not accounting the budget over time |
| S23 | B | Abowd J, Ashmead R, Cumings-Menon R, et al., "The 2020 Census Disclosure Avoidance System TopDown Algorithm", Harvard Data Science Review, Special Issue 2 | https://hdsr.mitpress.mit.edu/pub/7evz361i | A real national deployment. The production privacy loss budget was set far above textbook values after utility testing, and the value moved repeatedly through the demonstration cycle. Evidence that epsilon is chosen by a policy argument about utility, not derived |
| S24 | B | Hsu J, Gaboardi M, Haeberlen A, et al., "Differential Privacy: An Economic Method for Choosing Epsilon", IEEE CSF 2014 | https://arxiv.org/abs/1402.3329 | A framework for choosing epsilon from the actual harm to a participant and the value of the study, rather than from convention. The relevant conclusion for a small app: if the release is so coarse that the worst case harm is near zero, spending engineering on DP buys nothing that minimisation did not already buy |

### 1.5 k-anonymity, re-identification and fitness / location data specifically

| ID | Tier | Source | URL | What was taken |
|----|------|--------|-----|----------------|
| S25 | A | Sweeney L, "k-Anonymity: A Model for Protecting Privacy", Int. J. Uncertainty, Fuzziness and Knowledge-Based Systems 2002;10(5):557-570 | https://dataprivacylab.org/dataprivacy/projects/kanonymity/kanonymity.pdf | The definition: every released record is indistinguishable from at least k-1 others on the quasi identifiers. Also the explicit warning that k-anonymity alone does not defend against attackers with external knowledge |
| S26 | A | Sweeney L, "Simple Demographics Often Identify People Uniquely", Carnegie Mellon Data Privacy Working Paper 3, 2000 | https://dataprivacylab.org/projects/identifiability/paper1.pdf | 87.1% of the 1990 US population uniquely identified by ZIP, birth date and sex alone. Three coarse attributes. This is the number that decides how many cohort axes we may publish |
| S27 | A | Machanavajjhala A, Kifer D, Gehrke J, Venkitasubramaniam M, "l-Diversity: Privacy Beyond k-Anonymity", ACM TKDD 2007;1(1) | https://dl.acm.org/doi/10.1145/1217299.1217302 | The homogeneity attack: a k-anonymous group whose sensitive values are all identical leaks the value for every member. A cohort cell of 200 athletes who all did the same thing is not private just because it has 200 members |
| S28 | A | Narayanan A, Shmatikov V, "Robust De-anonymization of Large Sparse Datasets", IEEE S&P 2008:111-125 | https://www.cs.cornell.edu/~shmat/shmat_oak08netflix.pdf | The Netflix Prize result. High dimensional sparse behavioural data is effectively unique per person, and an adversary with a little auxiliary knowledge recovers records. Directly applicable to per user training histories, which are sparser and higher dimensional than movie ratings |
| S29 | A | de Montjoye YA, Hidalgo CA, Verleysen M, Blondel VD, "Unique in the Crowd: The Privacy Bounds of Human Mobility", Scientific Reports 2013;3:1376 | https://www.nature.com/articles/srep01376 | Four spatio temporal points uniquely identify 95% of 1.5 million individuals; two points still identify more than 50%; uniqueness decays only as the 1/10 power of resolution, so coarsening barely helps. This is why GPS route data has no safe aggregated release |
| S30 | B | Childs K, Nolting D, Das A, "Heat Marks the Spot: De-Anonymizing Users' Geographical Data on the Strava Heatmap", 7th Workshop on Technology and Consumer Protection (ConPro '23) | https://anupamdas.org/paper/CONPRO2023.pdf | The aggregated, opt out, anonymised Strava heatmap was used to recover home addresses of active users in low density areas, by crawling the heatmap and cross referencing publicly visible activity metadata. AGGREGATION WAS APPLIED AND IT WAS NOT ENOUGH. The determining factor was low local density, which is exactly the thin cell problem in cohort form |
| S31 | B | Hern A / press reporting on the Strava global heatmap and military base disclosure, Jan 2018; Future of Privacy Forum analysis "If You Can't Take the Heat Map" | https://fpf.org/blog/if-you-cant-take-the-heat-map-benefits-risks-of-releasing-location-datasets/ | The 2018 incident: an aggregate visualisation of activity density disclosed the layout and patrol routes of military facilities because in a sparse region the aggregate IS the individual. The general lesson stated by FPF: aggregate releases need a density floor, not just an aggregation step |
| S32 | A | Shokri R, Stronati M, Song C, Shmatikov V, "Membership Inference Attacks Against Machine Learning Models", IEEE S&P 2017:3-18 | https://arxiv.org/abs/1610.05820 | Black box access to a fitted model reveals whether a given record was in its training set, with attack success rising as the model has more parameters relative to training examples. The reason a shipped cohort prior must be a handful of moments and never a fitted per cell model |

### 1.6 Individual response variability in exercise science, and why measurement error explains much of it

| ID | Tier | Source | URL | What was taken |
|----|------|--------|-----|----------------|
| S33 | A | Atkinson G, Batterham AM, "True and false interindividual differences in the physiological response to an intervention", Experimental Physiology 2015;100(6):577-588 | https://physoc.onlinelibrary.wiley.com/doi/abs/10.1113/EP085070 | Within subject random variation is inevitable even with gold standard measurement and is sometimes large enough to explain ALL apparent individual response differences. True individual response variance is identified only by comparing the SD of change in an intervention arm against a comparator arm. Percentile, SD threshold and cluster methods manufacture responders and non responders even with no intervention at all |
| S34 | A | Hecksteden A, Kraushaar J, Scharhag-Rosenberger F, Theisen D, Senn S, Meyer T, "Individual response to exercise training: a statistical perspective", J Appl Physiol 2015;118(12):1450-1459 | https://journals.physiology.org/doi/full/10.1152/japplphysiol.00714.2014 | Individual response is a subject by training interaction and needs repeated measurement or repeated intervention to be identified at all. A single pre to post change score for one person confounds true response with noise and cannot be decomposed |
| S35 | A | Renwick JRM, Preobrazenski N, Wu Z, et al., "Standard Deviation of Individual Response for VO2max Following Exercise Interventions: A Systematic Review and Meta-analysis", Sports Medicine 2024;54:3069-3080 | https://pubmed.ncbi.nlm.nih.gov/39160296/ | 32,968 records screened, 24 studies analysed. Conclusions: the MAJORITY of variation in observed change scores following an intervention is measurement error; a single study's sample size is generally too small to estimate SD of individual response accurately; there is not strong evidence supporting VO2max trainability differences across single interventions. This is the strongest single argument in this pack for shrinking hard toward the cohort prior |
| S36 | A | Steele J, Fisher JP, Smith D, et al., "N of 1: Optimizing Methodology for the Detection of Individual Response Variation in Resistance Training", Sports Medicine 2024 | https://pubmed.ncbi.nlm.nih.gov/38878117/ | To separate signal (participant by training interaction) from noise (within participant variance) a design must have each participant complete both interventions and at least one intervention twice. Gross variability can be entirely within participant variation. An app observing one athlete on one program is in the worst possible design for this |
| S37 | A | Swinton PA, Hemingway BS, Saunders B, Gualano B, Dolan E, "A Statistical Framework to Interpret Individual Response to Intervention", Frontiers in Nutrition 2018;5:41 | https://www.frontiersin.org/articles/10.3389/fnut.2018.00041/full | A practical framework for expressing individual response as a probability rather than a label, given the measurement error of the instrument. The source for "report a band, not a verdict" |
| S38 | B | Hubal MJ, Gordish-Dressman H, Thompson PD, et al., "Variability in muscle size and strength gain after unilateral resistance training", Med Sci Sports Exerc 2005;37(6):964-972 | https://pubmed.ncbi.nlm.nih.gov/16087829/ | 585 subjects, 12 weeks. 1RM gains: 232 subjects between 40 and 60%, 36 subjects over 100%, 12 subjects under 5%. Biceps CSA: 232 between 15 and 25%, 10 over 40%, 36 under 5%. The raw spread that motivates personalisation, and which S33 to S36 then show is largely not what it looks like |
| S39 | A | Bouchard C, An P, Rice T, et al., "Familial aggregation of VO2max response to exercise training: results from the HERITAGE Family Study", J Appl Physiol 1999;87(3):1003-1008 | https://pubmed.ncbi.nlm.nih.gov/10484570/ | 481 sedentary adults in 98 families, 20 weeks standardised training. 2.5 times more variance BETWEEN families than within; maximal heritability of the response 47%. Two consequences: real between person variance exists, and athletes are clustered rather than independent, which inflates the effective cell size needed |
| S40 | A | Grgic J, Lazinica B, Schoenfeld BJ, Pedisic Z, "Test-Retest Reliability of the One-Repetition Maximum (1RM) Strength Assessment: a Systematic Review", Sports Medicine Open 2020;6:31 | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7367986/ | 32 studies, pooled n = 1595, median ICC 0.97, median CV 4.2% (range 0.5 to 12.1%). This is the measurement error floor for every strength estimand in section 3, and it is larger than the 5 lb increment in `src/engine/reps.ts:227` |
| S41 | B | Pickering C, Kiely J, "Do Non-Responders to Exercise Exist, and If So, What Should We Do About Them?", Sports Medicine 2019;49:1-7 | https://link.springer.com/article/10.1007/s40279-018-01041-1 | Non response to one modality at one dose is often response at a different dose or modality; apparent non response frequently disappears when dose is increased or the outcome is broadened. The argument for the app changing the dose before it changes its belief about the person |
| S42 | B | Bonafiglia JT, Rotundo MP, Whittall JP, Scribbans TD, Graham RB, Gurd BJ, "Inter-Individual Variability in the Adaptive Responses to Endurance and Sprint Interval Training", PLoS ONE 2016;11(12):e0167790 | https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0167790 | Individuals classified as non responders to one training type frequently responded to another, and responder status was inconsistent across outcome measures within the same person. Responder status is not a stable trait to store on a user record |

**Count: 42 sources. Tier A: 25. Tier B: 17. Tier C: 0. Tier D: 0 (house heuristics are labelled
inline where used rather than given source ids).**

---

## 2. AUDIT OF THE LIVE CODE

Every claim in this section was verified by reading the line at the stated path. Read against the
working tree at `research/` sibling commit, same tree B3 was written against.

### 2.1 The one real shrinkage estimator already shipped

`src/engine/calibration.ts` is a Buhlmann credibility estimator [S7] that nobody called one. It
already contains, in production, the entire two layer model this pack is asked to design, applied
to exactly one estimand.

| Line | Constant | Value | What it actually is |
|---|---|---|---|
| `calibration.ts:53` | `MIN_ACTIVITY_SAMPLES` | 4 | minimum n before a per activity individual estimate is used at all |
| `calibration.ts:56` | `MIN_BIAS_SAMPLES` | 3 | minimum n before the coarser cross activity individual estimate is used |
| `calibration.ts:63` | `BIAS_STEP` | 0.18 | how far one tier of disagreement moves the band |
| `calibration.ts:66` | `MAX_DRIFT` | 0.5 | the limited translation cap of [S4]: the blend may never move more than 50% from the population value |
| `calibration.ts:69` | `PRIOR_STRENGTH` | 6 | **this is `k` in `Z = n / (n + k)`** [S7], hand typed |
| `calibration.ts:235` | | `w = samples.length / (samples.length + PRIOR_STRENGTH)` | the credibility factor, verbatim |
| `calibration.ts:241` | | `population * (1 - w) + personal * w` | the partial pooling blend of [S5] |
| `calibration.ts:79` | `PersonalBand.source` | `'population' \| 'bias' \| 'activity'` | provenance of the estimate, surfaced to the user by `calibrationNote` |

Two design choices in that file are the house precedent every other estimand should copy:

1. **The file states in its own header comment (`calibration.ts:15` to `:20`) that
   "the bands in plan/cardio.ts come from population research, and population research is about a
   population."** That is the correct diagnosis, written before this pack existed. The gap is that
   only ONE of the app's dozens of population constants got the treatment.
2. **`calibration.ts:40` to `:49` refuses to let the learned quantity touch calories**, because a
   MET is an absolute physical claim and perceived effort is not. Population learning inherits
   this rule directly: a learned prior may move a suggestion, and may never move a physical
   constant, a safety gate, or a number the user reads as a measurement.

**Defect A (design, not a bug): `PRIOR_STRENGTH = 6` is asserted, not derived.** Under [S7] `k` is
`EPV / VHM`, a ratio of two measurable variances, and under [S2] it is estimated from the data
rather than chosen. Six is defensible as a conservative value (it shrinks harder than the likely
true ratio, see section 3.3) but the app cannot currently say why it is six rather than three or
twelve, and it uses the same six for every activity. Section 3.3 gives the derivation and the per
estimand table that replaces it.

### 2.2 Hardcoded constants that are secretly population averages

These are population priors. They ship as data already, which is the correct architecture; what
is missing is that they are unlabelled, uncohorted, and no individual estimate ever overtakes
them even when the app is holding the measurements that would.

| `file:line` | Constant | Value | The population it silently is |
|---|---|---|---|
| `plan/cardio.ts:300,308,316,331,339,349,362,376,386,402,415,444` | 12 `band: {low, high}` step rate bands | e.g. run `7800/10200`, basketball `4500/8000`, volleyball `1500/2400` | Compendium of Physical Activities and sport tracking studies. The file header at `cardio.ts:9` to `:14` names Ainsworth 2011 explicitly. These ARE cohort means with no cohort attached |
| `plan/cardio.ts:297,306,315,326,337,346,355,373,382,401,443` | 11 `stride` fractions of standing height | 0.55 run, 0.415 walk, 0.342 basketball, 0.2 combat | population mean stride to height ratios |
| `plan/cardio.ts` per activity `met` triples | e.g. `{low: 4.5, standard: 6.5, high: 8.0}` | Compendium METs, which are group means of measured oxygen cost |
| `engine/stats.ts:30` | Epley divisor `/ 30` in `e1RM` | fixed 30 | the population average load to reps relationship. An individual's true rep to max curve varies materially with fibre type and movement, and this is the single most reused derived number in the app |
| `engine/stats.ts:23` | `E1RM_MAX_REPS` | 12 | where the population fit's evidence runs out. Correctly bounded, still population level |
| `engine/bodyfat.ts:28` and `:32` | US Navy circumference coefficients `86.010 / 70.041 / 36.76` and `163.205 / 97.684 / 78.387` | fixed | a regression fitted to US Navy personnel, a young, fit, mostly male sample. Applied unchanged to every user |
| `plan/bookletOps.ts:53` | maintenance `= bw * (sex === 'female' ? 14 : 15)` | 14 or 15 kcal per lb | a population mean multiplier standing in for TDEE. **This is the largest single population prior in the app by user visible impact** |
| `plan/sportsNutrition.ts:117` | `REFERENCE_HEIGHT_IN` | male 69, female 63.5 | US adult mean heights, explicitly documented as such at `sportsNutrition.ts:114` to `:116` |
| `plan/sportsNutrition.ts:124` | `KCAL_PER_INCH = 6.25 * 2.54 * 1.55` | ~24.6 | the Mifflin-St Jeor height slope times a population activity factor of 1.55 |
| `plan/sportsNutrition.ts:66` to `:85` | `PROTEIN_G_PER_KG` | 1.5 / 2.0 / 2.2 / 2.4 / 2.6 | meta analytic group means by training context |
| `plan/reach.ts:26` | `STANDING_REACH_RATIO` | 1.33 | a population anthropometric ratio, documented as "remarkably stable" at `reach.ts:22` to `:25` |
| `plan/reach.ts:59` | `MAX_TRAINABLE_VERT_IN` | 30 | the upper edge of a population's trainable jump gain |
| `plan/reach.ts:114` | `DEFAULT_HEIGHT_IN` | male 69, female 64 | population mean, used as a stepper default |
| `engine/intensity.ts:77` | `usableHeightIn` fallback | 69 | population mean height substituted silently when height is unknown |
| `engine/reps.ts:273` to `:275` | `loadStepLb` | 10 lb lower body, 5 lb upper | a population average of a usable weekly increment |
| `engine/reps.ts:135,138,141` | `STALE_DAYS` 21, `LAYOFF_STEP_DAYS` 28, `MAX_STALE_STEPS` 3 | | population detraining rates [S12 in R3 terms, Mujika]. Individual detraining rates differ substantially and are observable from return sessions |
| `engine/volume.ts:105,106,116` | `SMALL_CEILING` 8, `LARGE_CEILING` 10, `FOCUS_BONUS` 4 | fractional sets per session | volume landmarks. R3 section 2.8 already records these as INVENTED |
| `engine/fatigue.ts:39,78` | `DROP_FRACTION` 0.875, `LIGHT_DAY_FRACTION` 0.85 | | the middle of the coaching convention band for a back off set |
| `plan/kcalFloor.ts:34,37,44,47` | `MIN_KCAL_TRAINING` 1500, `MIN_KCAL_REST` 1200, `MAX_DEFICIT` 0.25, `REST_DAY_DROP` 300 | | population safety floors. **These must never be cohort learned.** They are a safety gate, and section 5.1 forbids it |
| `types.ts:636` | `defaultSettings.proteinTargetG` | 200 | a single number carried from the owner's own preset into every new install before onboarding overwrites it |

**Count: 19 distinct sites, covering roughly 60 individual constants, every one of which is a
population statistic wearing the costume of a physical constant.**

### 2.3 Every place a per user constant is used where a learned individual estimate belongs

This is the actionable list. In each row the app is ALREADY holding the data that would produce
an individual estimate, and is not computing it.

| # | `file:line` | The constant in use | The individual estimate the app could compute today, from data it already stores |
|---|---|---|---|
| D1 | `plan/bookletOps.ts:53` | `bw * 15` (or 14) maintenance | **TDEE from the athlete's own weight trajectory against logged intake.** `AppData.measurements` (`types.ts:415` to `:417`, `weightLb`) and `AppData.meals` are both persisted. `engine/stats.ts` `kcalBumpSuggestion` already walks a 21 day weight window and never revises the multiplier; it fires once, adds a fixed 150 or 200, and stops. There is no adaptive TDEE anywhere in the tree |
| D2 | `engine/intensity.ts:124` | `steps * usableHeightIn(heightIn) * track.stride` | **Measured stride from GPS.** `RunLog` carries BOTH `distanceMi` (`activityTypes.ts:33`) and `steps` (`activityTypes.ts:42`) with a `distanceSource` discriminator (`activityTypes.ts:40`). A single GPS run where `distanceSource === 'gps'` yields this athlete's true stride to within GPS error. The population 0.55 is used anyway, forever |
| D3 | `engine/intensity.ts:77` | height fallback 69 in | Nothing to learn here, but the substitution is silent. It should be a declared prior with a visible provenance, not an inline `: 69` |
| D4 | `engine/reps.ts:273` to `:275` | `loadStepLb` 10 or 5 | **This athlete's sustainable increment per movement**, from the slope of `liftSeries` (`engine/stats.ts:58` onward), which the app already computes for the progress chart and for `computeBoardStats` (`engine/board.ts:37` to `:47`) |
| D5 | `engine/stats.ts:30` | Epley `/ 30` | **This athlete's own load to reps curve**, fittable from any two sets at different rep counts in the same session. The app logs every set with weight and achieved reps (`SetLog`) |
| D6 | `engine/volume.ts:105,106` | per muscle ceilings 8 and 10 | **This athlete's own tolerance**, from the fatigue notes `engine/fatigue.ts` already collects per region with `REGION_WATCH_COUNT = 3` (`fatigue.ts:48`). R3 section 2.10 item 3 records this gap independently |
| D7 | `engine/reps.ts:135,138` | `STALE_DAYS` 21, `LAYOFF_STEP_DAYS` 28 | **This athlete's observed give back**, from what they actually completed on their own return sessions after a documented layoff |
| D8 | `engine/bodyfat.ts:28,32` | Navy coefficients | Not learnable per person without a criterion measure, and the file already says so at `bodyfat.ts:3` to `:5` ("the TREND is the truth"). Listed so it is explicitly ruled OUT of learning in section 3.1 |
| D9 | `plan/reach.ts:26` | `STANDING_REACH_RATIO` 1.33 | **Measured reach.** `Measurement` already carries a vertical / rim touch field (`types.ts:427`). Once an athlete logs both a reach related measurement and a height, the ratio is measured, not assumed |
| D10 | `plan/sportsNutrition.ts:66` to `:85` | protein g/kg by context | NOT individually learnable from anything the app observes, and must not be. Ruled out in section 3.1 |
| D11 | `engine/calibration.ts:69` | `PRIOR_STRENGTH = 6` for every activity | **`k` per activity**, from the within athlete and between athlete variance the contribution pipeline in section 5 would measure |

**D1 and D2 are the two defects worth fixing first.** D1 because the calorie ring is the most
looked at number in the app and it is currently a population multiplier that never learns; D2
because it is the cheapest possible win, needing one GPS run and no new storage.

### 2.4 What the cloud actually sends today

Three writes leave the device. Read from `src/cloud/` and `supabase/migrations/0001_core_tables_rls.sql`.

**Write 1: the whole envelope.** `cloud/sync.ts:75` to `:85` upserts `{user_id, envelope, schema_version, exported_at}` into `states`. `envelope` is the ENTIRE `AppData`: sessions, meals,
measurements, prefs including `limitations` (health data), `runs` including every GPS point.
Capped at `ENVELOPE_MAX_BYTES = 2_000_000` (`cloud/logic.ts:15`) against the DB's own
`pg_column_size(envelope) <= 2097152` (`0001_core_tables_rls.sql:21`). RLS is
`for all to authenticated using (auth.uid() = user_id)` (`0001_core_tables_rls.sql:27` to `:30`),
so it is private to the owner. Pushed on a 10 second debounce (`cloud/sync.ts:155`, `:166`).

**Write 2: the leaderboard row.** `cloud/board.ts:42` to `:54` upserts into `board_stats`:
`user_id`, `username`, `goal`, `goal_statement` truncated to 80 characters
(`cloud/board.ts:48`), `streak`, `consistency30`, `pr_gain90`, `protein30`, `sessions_total`.
Piggybacked on every successful envelope push (`cloud/sync.ts:100`), interval gated to once an
hour (`cloud/board.ts:29`).

**Write 3: the profile,** written server side only by the two edge functions. The table is
`profiles(user_id, phone UNIQUE, username UNIQUE, recovery_hash, reset_fails,
reset_locked_until, created_at)` (`0001_core_tables_rls.sql:5` to `:13`). RLS is read own row
only, with no insert, update or delete policy, so it is service role write only
(`0001_core_tables_rls.sql:15` to `:17`). `cloud/sync.ts:205` to `:208` selects
`username, phone` from it after sign in and stores the phone in device local `SyncMeta`
(`cloud/logic.ts:171` to `:179`).

**Defect B, and it is the important one for this pack:
`board_stats` has `create policy "board read all" ... for select to authenticated using (true)`
(`0001_core_tables_rls.sql:45` to `:46`).** Any authenticated account can select every row of
that table with no limit. The client happens to ask for 50 (`cloud/board.ts:78`) with a
`sessions_total >= 3` filter (`cloud/board.ts:74`), but that is client politeness, not a policy.
The table is a per user, non aggregated, world readable behavioural table carrying a username, an
80 character free text `goal_statement`, four behaviour metrics, and a server stamped
`updated_at` trigger (`0001_core_tables_rls.sql:70` to `:71`). Section 5.3 works through what an
attacker does with it. R13's position: **no population aggregate may ever be derived from,
joined to, or published alongside `board_stats` while that policy stands**, and the fence in
section 5 is designed so that fixing `board_stats` is a prerequisite, not a follow up.

**Defect C: there is no telemetry at all.** There is no event log, no decision log, and no
outcome record anywhere in `src/`. R3 section 2.10 item 1 states the same finding from the
autoregulation side. So the population layer this pack designs has, today, an input of zero rows.
That is a feature for sequencing: the fence can be built before there is anything to leak.

---

## 3. THE TWO LAYER MODEL AND THE SHRINKAGE RULE

### 3.1 What is learned where

Population learning in BodyT is not a capability, it is a **fixed, versioned list of eleven
estimands**. Anything not on this list is not learned across users, full stop. That is what makes
the privacy fence in section 5 checkable rather than aspirational: you can enumerate every number
that crosses it.

**Layer I, per individual, stays on device, never uploaded in raw form:**

every set, rep, load, RPE, meal entry, weight, measurement, GPS point, limitation, preference,
decline, note, photo, and the eleven individual estimates derived from them. This is `AppData` in
`src/types.ts:550`. It reaches the cloud only as the private per user envelope backup already
described in section 2.4, and population learning never reads that table.

**Layer II, per cohort, ships as a data pack, never as a service call:**

| # | Estimand id | Units | Replaces / refines | Individual estimator uses |
|---|---|---|---|---|
| E1 | `stride.byPaceBin` | fraction of standing height | `plan/cardio.ts:297` etc, via `engine/intensity.ts:124` | `RunLog.distanceMi` where `distanceSource === 'gps'`, over `RunLog.steps` |
| E2 | `tdee.maintenanceKcal` | kcal per day | `plan/bookletOps.ts:53` | `measurements[].weightLb` trend against `meals` intake |
| E3 | `load.incrementLb` | lb per exposure | `engine/reps.ts:273` | OLS slope of `liftSeries` e1RM |
| E4 | `intensity.bandScale` | multiplier on `plan/cardio.ts` bands | already shipped in `engine/calibration.ts` | felt versus measured tier gap |
| E5 | `volume.regionCeiling` | fractional sets per session | `engine/volume.ts:105,106` | per region fatigue complaint rate |
| E6 | `schedule.weekdayMissRate` | probability | nothing today | scheduled versus honoured per weekday |
| E7 | `rest.sufficientSec` | seconds | `restSec` in `plan/exercises.ts` | reps achieved given the rest actually taken (R3 section 6.4) |
| E8 | `detrain.giveBackSteps` | load steps | `engine/reps.ts:135,138,141` | completed return sessions after a documented layoff |
| E9 | `e1rm.divisor` | dimensionless | `engine/stats.ts:30` (Epley 30) | pairs of same session sets at rep distance >= 4 |
| E10 | `anthro.reachRatio` | dimensionless | `plan/reach.ts:26` | measured reach against height |
| E11 | `session.preferredMinutes` | minutes | nothing today | median completed session duration |

**Explicitly refused, and the reason, because a refusal list is the load bearing half of a
learning design:**

| Refused | Why |
|---|---|
| Body fat coefficients (`engine/bodyfat.ts:28,32`) | no criterion measure exists on device, so there is nothing to shrink toward. `bodyfat.ts:3` to `:5` already takes the right position: the trend is the truth |
| Protein g/kg (`plan/sportsNutrition.ts:66`) | a guideline value, not an observable quantity. Nothing the app logs identifies an individual's protein requirement |
| Calorie floors (`plan/kcalFloor.ts:34,37,44`) | a SAFETY GATE. Section 5.1 forbids learning any gate. A cohort that tolerates a deeper cut does not make a deeper cut safe |
| R6 red flag classification | same reason, and B3 stage 5 already validates that a RED packet contains zero plan constructing records |
| Anything derived from route geometry | [S29] four spatio temporal points identify 95% of people, [S30] an aggregated heatmap still yielded home addresses. There is no safe aggregation, so there is no aggregation |
| "Responder" or "non responder" as a stored trait | [S42] responder status was inconsistent across outcome measures within the same person; [S41] apparent non response is frequently response at a different dose. The correct action is to change the dose, not to record a belief about the person |
| Any free text (`plan.goalStatement`) | unbounded, unstructured, and [S28] shows high dimensional behavioural data is effectively a fingerprint |

### 3.2 The blend, with the actual formula

Three values exist for every estimand. Two of them may be missing; the first never is.

```
theta_house   the constant that ships in the bundle today, HOT tier, always present,
              works with zero network and zero installed packs
theta_prior   the cohort value from the installed WARM pack, when a pack is installed AND
              the athlete's cell cleared MIN_CELL; otherwise theta_prior := theta_house
theta_ind     the on device estimate, when n >= n_min for that estimand; otherwise undefined
```

The blend is Buhlmann credibility [S7] under a limited translation cap [S4]:

```
w      = n / (n + k)                                  when theta_ind is defined, else w = 0

raw    = (1 - w) * theta_prior  +  w * theta_ind

theta  = clamp( raw,
                theta_house * (1 - MAX_DRIFT),
                theta_house * (1 + MAX_DRIFT) )       MAX_DRIFT = 0.5
```

Three things about that clamp are deliberate:

1. **It is anchored to `theta_house`, not to `theta_prior`.** If the clamp moved with the cohort
   prior, successive pack versions could walk an athlete arbitrarily far from the shipped
   evidence based value, one bounded step at a time. Anchoring to the house constant means the
   worst a wrong prior plus a wrong individual estimate can jointly do is bounded at 50% forever.
   `MAX_DRIFT = 0.5` is already in the tree at `engine/calibration.ts:66`; this generalises it.
2. **It is the same mechanism as the limited translation rule of [S4]**, which exists precisely so
   that shrinkage does not destroy a genuinely exceptional individual. [S3] states the cost of
   shrinkage plainly: total error across the group falls while one individual's estimate can get
   worse. In a coaching app that individual has a name, so the cap is not optional.
3. **`n` is a count of USABLE observations**, filtered by the estimand's own freshness horizon and
   quality floor, exactly as `engine/calibration.ts:99` to `:101` already refuses samples under
   `MIN_STEPS_TO_JUDGE` or `MIN_MINUTES_TO_JUDGE`.

The cohort prior is itself a shrunk quantity, computed offline over the cohort ladder of section
4.2. Writing `L` for a rung of the ladder, `L0` global and `L_max` the most specific cell that
cleared the floor:

```
theta_prior(L0)  = the global mean
theta_prior(L)   = (1 - w_L) * theta_prior(L-1) + w_L * cellMean(L)
w_L              = m_L / (m_L + K_COHORT)             K_COHORT = 200, m_L = athletes in the cell
```

This is a two level hierarchical model [S5][S6] with the ladder as the hierarchy. `K_COHORT` is
set equal to `MIN_CELL` on purpose: a cell that only just clears the minimum is weighted exactly
0.5 against its parent, so a barely populated cell can never dominate. Section 4.3 derives the
value.

### 3.3 Where `k` comes from, and why the shipped 6 is defensible

Under [S7], `k = EPV / VHM`: expected within athlete process variance over the variance of the
true athlete means. Written the way it gets used here:

```
k  =  sigma_within^2  /  tau^2
```

where `sigma_within` is the noise on ONE of this athlete's observations and `tau` is the standard
deviation of the true value ACROSS athletes in the cohort. Both are measurable from the
contribution pipeline in section 5.2, which is the whole reason that pipeline uploads a sum of
squares and not just a mean.

The crossover is trivial and worth stating flatly:

```
w >= 0.5   exactly when   n >= k
```

**The sample size at which the individual estimate overtakes the prior IS `k`.** There is no
second number to tune. `k` is not a policy dial, it is a ratio of two variances, and if the two
variances are measured then `k` is measured.

The weight curve, for the `k` values used below:

| n | k = 0.2 | k = 1 | k = 4 | k = 5 | k = 6 | k = 13 |
|---|---|---|---|---|---|---|
| 1 | 0.83 | 0.50 | 0.20 | 0.17 | 0.14 | 0.07 |
| 3 | 0.94 | 0.75 | 0.43 | 0.38 | 0.33 | 0.19 |
| 5 | 0.96 | 0.83 | 0.56 | 0.50 | 0.45 | 0.28 |
| 6 | 0.97 | 0.86 | 0.60 | 0.55 | **0.50** | 0.32 |
| 12 | 0.98 | 0.92 | 0.75 | 0.71 | 0.67 | 0.48 |
| 24 | 0.99 | 0.96 | 0.86 | 0.83 | 0.80 | 0.65 |
| 52 | 1.00 | 0.98 | 0.93 | 0.91 | 0.90 | 0.80 |

### 3.4 `k` per estimand, derived

Each row shows the arithmetic. Where a variance is a house estimate it says HOUSE, and the
contribution pipeline replaces it with a measured value once section 5.2 ships.

**E1 `stride.byPaceBin`, crossover k = 0.2, threshold 1 GPS run per pace bin.**
`sigma_within` is GPS distance error plus pedometer error on one run, roughly 2.5% relative
(HOUSE, and cheap to measure: the app can compare two runs on the same route). `tau` across
adults for stride as a fraction of standing height is roughly 6% relative (HOUSE).
`k = (0.025 / 0.06)^2 = 0.17`, rounded to 0.2. At n = 1 the weight is already 0.83.
**This is the degenerate, wonderful case: the quantity is nearly directly measured, so the
population constant should be abandoned almost immediately.** Bin by pace into three bins, because
stride is a function of speed, and require one qualifying run per bin.

**E2 `tdee.maintenanceKcal`, derived k = 4.3 weeks, shipped k = 6 weeks.**
Over an `m` week window the individual estimate is
`mean intake + (weight change lb / days) * 3500`. Weekly mean body weight noise from water,
glycogen and gut content is about 1.2 lb SD (HOUSE); an endpoint difference carries
`1.2 * sqrt(2) = 1.70 lb`, spread over `7m` days, giving `1.70 * 3500 / (7m) = 850 / m` kcal/day.
Add a random intake logging component of 150 kcal/day on a weekly mean (HOUSE; systematic under
reporting is a bias, not noise, and largely cancels in a delta). So
`sigma_within(m) = sqrt((850/m)^2 + 150^2)`. Between athlete `tau` at fixed bodyweight, sex and
height is about 250 kcal/day, from the roughly 10% individual level error of predictive equations
on a 2,600 kcal maintenance. Setting `sigma_within(m) = tau` gives `(850/m)^2 = 40,000`, so
`m = 4.25` weeks. **Shipped `k = 6` weeks**, because that derivation assumes complete meal
logging and this app's users will not have it. Hard gate before any individual TDEE is used:
`>= 14 logged meal days` and `>= 3 weight readings spanning >= 21 days`.

**E3 `load.incrementLb`, k = 5 exposures.**
`sigma_within` per e1RM reading is the 1RM test retest CV of 4.2% [S40], which on a 185 lb bench
is 7.8 lb. The standard error of an OLS slope over `m` equally spaced exposures is
`sigma * sqrt(12 / (m(m^2 - 1)))`:

| m | 4 | 5 | 6 | 8 | 12 |
|---|---|---|---|---|---|
| SE, lb per exposure | 3.49 | 2.55 | 1.86 | 1.20 | 0.65 |

`tau` for the true sustainable increment is about 2.5 lb per exposure (HOUSE, bounded above by the
fact that the app's own step is 5 or 10 lb at `engine/reps.ts:275`). Solving `SE(m) = tau` gives
`m(m^2 - 1) = 116.8`, so `m = 5.2`. **k = 5.**
Note that `sigma_within` of 7.8 lb is LARGER than the 5 lb upper body step this estimate is meant
to size. That is not a flaw in the derivation, it is the finding: **a single session cannot see a
5 lb increment at all**, which is why the shipped double progression rule at
`engine/reps.ts:157` onward is right to require a cleared target rather than a measured slope.

**E4 `intensity.bandScale`, derived k = 2.6, shipped k = 6 (unchanged).**
The felt answer is a three point ordinal; per session disagreement noise is about 0.8 rank units
SD and the true cross athlete bias about 0.5 rank units SD (both HOUSE).
`k = 0.64 / 0.25 = 2.56`. The shipped `PRIOR_STRENGTH = 6` at `engine/calibration.ts:69`
therefore shrinks roughly 2.3 times harder than the derivation suggests. **Leave it at 6.** Given
[S35], which found the majority of variation in observed change scores is measurement error,
erring toward the population is the correct direction to be wrong in, and section 5.2's pipeline
can replace 6 with a measured value later without a behaviour change the athlete would notice.

**E5 `volume.regionCeiling`, k = 13 sessions per region, per ceiling level.**
The observation is Bernoulli: did this athlete report a fatigue complaint for this region after a
session at this ceiling. Base rate about 0.15 (HOUSE), so within observation variance
`p(1-p) = 0.1275`. `tau` for the true per athlete complaint rate is about 0.10 (HOUSE).
`k = 0.1275 / 0.01 = 12.75`. Since a ceiling needs the rate at more than one level, the practical
requirement is 30 to 50 sessions per region. **The cohort prior dominates volume tolerance for
months, and that is the correct answer, not a limitation.** R3 section 2.10 item 3 flags static
ceilings as a gap; this is the number that says how long it takes to close it honestly.

**E6 `schedule.weekdayMissRate`, k = 4 occurrences of that weekday.**
Bernoulli per scheduled weekday occurrence, base miss rate 0.2 (HOUSE), within variance 0.16.
`tau` is high here because people genuinely have one bad weekday: 0.20 (HOUSE).
`k = 0.16 / 0.04 = 4`, so four weeks. This is the fastest learning behavioural estimand in the
list, which matches the intuition that a Tuesday problem is obvious by the fourth Tuesday.

**E7 `rest.sufficientSec`, k = 6.** Adopted unchanged from R3 section 6.4, which set it by mirror
of `PRIOR_STRENGTH`. Not re-derived here; R3 owns it.

**E8 `detrain.giveBackSteps`, k = 2 layoffs.** Each documented layoff with completed return
sessions is one observation, and most athletes will produce fewer than two in a year, so in
practice the population constants at `engine/reps.ts:135,138,141` stay in charge. Stated so
nobody builds a learner that will never see data.

**E9 `e1rm.divisor`, k = 4 qualifying pairs.** A pair is two sets of the same movement in the same
session at a rep distance of at least 4. The implied divisor from one pair carries roughly 30%
relative SE (HOUSE, propagated from the 4.2% per set CV [S40] through a ratio). `tau` across
athletes is about 15% relative, since published formulas span divisors of roughly 25 to 35.
`k = (0.30 / 0.15)^2 = 4`.

**E10 `anthro.reachRatio`, k = 0.** A logged reach measurement plus a height IS the individual
value. There is nothing to shrink. This is the degenerate case and the app already has the
precedent: `engine/calibration.ts:270` returns the athlete's own answer outright with
`if (felt) return felt`, because a measurement is not a guess to be improved on.

**E11 `session.preferredMinutes`, k = 0.4, threshold 1 session.**
Per session duration noise about 8 minutes SD, between athlete `tau` about 12 minutes (both
HOUSE). `k = 64 / 144 = 0.44`.

**Summary table, which is the operational answer to "when does the individual overtake the prior":**

| Estimand | k | Crossover in plain words | Fully individual (w >= 0.9) at |
|---|---|---|---|
| E10 reach ratio | 0 | immediately, on one measurement | n = 1 |
| E1 stride | 0.2 | one GPS run per pace bin | n = 2 |
| E11 session minutes | 0.4 | one session | n = 4 |
| E8 detraining | 2 | two documented layoffs | n = 18, i.e. never in practice |
| E9 e1RM divisor | 4 | four qualifying set pairs | n = 36 |
| E6 weekday adherence | 4 | four weeks | n = 36 weeks |
| E3 load increment | 5 | five exposures of that movement | n = 45 |
| E2 TDEE | 6 weeks | six weeks of complete logging | n = 54 weeks |
| E4 intensity band | 6 | six rated sessions (shipped) | n = 54 |
| E7 rest | 6 | six sets with measured rest | n = 54 |
| E5 volume ceiling | 13 | thirteen sessions per region | n = 117 |

### 3.5 The guards, all of which have a shipped precedent

| # | Guard | Precedent in the tree |
|---|---|---|
| G1 | An individual estimate that is not internally sane is discarded and the prior is returned, silently and safely | `engine/calibration.ts:249` to `:252`: a band whose low is not below its high hands back the researched band |
| G2 | `MAX_DRIFT = 0.5` against `theta_house`, never against `theta_prior` | `engine/calibration.ts:66`, `:198`, `:242` to `:244` |
| G3 | Every blended value carries its provenance and the app says which layer won | `PersonalBand.source` at `engine/calibration.ts:79`, surfaced by `calibrationNote` at `:286` |
| G4 | A direct measurement beats every estimate outright, with no blending | `engine/calibration.ts:270` |
| G5 | Observations age out of `n` on the estimand's own horizon | `engine/fatigue.ts:42` `RECENT_DAYS = 21`, `engine/adapt.ts:73` `SIGNAL_WINDOW_DAYS = 14`, `engine/reps.ts:135` `STALE_DAYS = 21` |
| G6 | No estimand that feeds a safety gate may be learned at any layer | section 3.1 refusal list, and B3 section 5 stage 5 already validates the RED case |
| G7 | The blend is a pure function of (house constant, pinned pack version, on device history), so `golden.test.ts` and `goldenLife.test.ts` can lock it | B3 section 3 pins `{packId, version, sha256}` in a generated `plan/packRegistry.ts` |
| G8 | A prior is never presented as certainty about this person | playbook 52.8 final bullet; copy pattern already correct at `engine/calibration.ts:292` ("Graded against your own N rated sessions, not the average") |
| G9 | The engine must produce the identical answer with zero packs installed as it did before packs existed | B3 section 2, HOT tier rule. `theta_prior := theta_house` when absent, so this is true by construction |

---
