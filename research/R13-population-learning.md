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

## 4. COHORT DEFINITION AND MINIMUM CELL SIZE

### 4.1 The axes, and the ones we refuse

Playbook 52.3 is explicit: select cohorts by relevant behavioural and training context rather than
crude demographic stereotypes. That instruction happens also to be the privacy preserving choice,
because behavioural axes with three or four levels are far weaker quasi identifiers than
demographics. [S26] found ZIP plus birth date plus sex uniquely identifies 87.1% of the US
population using three attributes; nothing below has that resolving power, by construction.

**The six axes. Five are always available, one is domain restricted.**

| Axis | Levels | Cardinality | Where the app already holds it |
|---|---|---|---|
| `A1 trainingAge` | `unknown` / `lt6mo` / `6to24mo` / `gt24mo` | 4 | NOT stored today. Playbook 55 requires this to be per domain rather than global; R13 uses the domain relevant to the estimand, and `unknown` is a first class level, never inferred |
| `A2 goalFamily` | `sizeStrength` / `lean` / `athletic` / `endurance` | 4 | collapse of `PlanConfig.goal` (`store/schema.ts:76`: vertical, speed, muscle, strength, lean, general, endurance) |
| `A3 equipmentClass` | `bodyweight` / `home` / `gym` | 3 | collapse of `plan.equipment: EquipTag[]` (`types.ts:141` to `:161`, 20 tags). `gym` requires `rack` or `machine`, `home` requires `dumbbell` or `band` or `kettlebell`, else `bodyweight` |
| `A4 daysPerWeek` | `2to3` / `4to5` / `6plus` | 3 | already the second dimension of the shipped `LAYOUTS` table in `plan/generator.ts` |
| `A5 limitation` | `none` / `limited` | 2 | `limitedJoints(prefs).length > 0` (`prefsTypes.ts:79` to `:81`). BOOLEAN ONLY. Which joint is never a cohort axis |
| `A6 sex` | `male` / `female` | 2 | `Profile.bfFormula` (`types.ts:249`). **Nutrition domain estimands only (E2), at 2x the minimum cell size, and never combined with more than two other axes** |

`A5` is deliberately a boolean rather than the joint list. A cell keyed on "knee and shoulder and
lower back" would be small, and would also be a health disclosure at cell granularity, which is
the [S27] homogeneity attack waiting to happen. The joint list stays on device and drives
substitution locally, exactly as `engine/adapt.ts` already does through
`substitutesFor` and `limitedJoints`.

`A6` is the only axis that carries real re-identification weight, so it is fenced: it is
physiologically load bearing for E2 only (the shipped baseline at `plan/bookletOps.ts:53` already
splits 14 versus 15 kcal per lb on it), the app already stores it locally, and admitting it costs
nothing new at collection time. Everywhere else it is refused.

**Refused axes, and why:**

| Refused | Why |
|---|---|
| Age or age band | **The app does not collect age and has decided not to.** `plan/sportsNutrition.ts:129` to `:132` says so verbatim: "Mifflin-St Jeor proper needs age, which the app does not ask for and will not start asking for to buy a second-order term." Age is also one third of Sweeney's 87% triple [S26]. Refusing it costs nothing and removes the single strongest quasi identifier available |
| Geography at any resolution | [S29] two spatio temporal points identify over 50% of people and uniqueness decays only as the 1/10 power of resolution, so coarsening does not rescue it. [S30] and [S31] are the fitness specific proof: an aggregated, opt out, anonymised heatmap still yielded home addresses, and the determining factor was low local density. A cohort cell IS a low density region by definition |
| Ethnicity, income, occupation, device model | playbook 52.8: do not infer protected or sensitive traits merely to improve recommendations. None are collected, none should be |
| Bodyweight or height as continuous values | released as a cohort key they are near unique in combination. Used locally for normalisation only; E2's contribution is normalised to kcal per lb ON DEVICE so that neither the weight nor the absolute TDEE crosses the fence |
| Exact session counts, streaks, start dates | high dimensional behavioural quantities, which [S28] showed are effectively fingerprints |
| Free text of any kind | `plan.goalStatement` is currently truncated to 80 characters and shipped to a world readable table (`cloud/board.ts:48`). It is not a cohort axis and it never becomes one |

### 4.2 The lattice, and the fixed backoff ladder

Without `A6` the lattice is `4 x 4 x 3 x 3 x 2 = 288` cells. At a 200 athlete floor and a uniform
distribution that needs 57,600 contributing athletes to populate every cell; the distribution is
nothing like uniform, so realistically the full lattice never populates and most lookups land on
a partially specified cell. That is expected, and it is why the backoff ladder is the actual
retrieval mechanism rather than an error path.

**The ladder is fixed, published in the pack manifest, and evaluated most specific first.** Its
determinism is a hard requirement: B3 section 5 stage 3 ends its ranking on `id` ascending
specifically so `golden.test.ts` can lock retrieval, and a cohort lookup that could return two
different rungs for the same athlete would break that.

Default ladder, used unless the estimand declares its own:

| Rung | Key | Axes |
|---|---|---|
| L4 | `A1.A2.A3.A4.A5` | most specific |
| L3 | `A1.A2.A3.A4` | drop limitation |
| L2 | `A1.A2.A3` | drop days per week |
| L1 | `A1.A2` | drop equipment |
| L0 | `A2` | goal family only |
| Lg | `*` | global |

Two estimands declare their own ladder, because the default ordering is wrong for them:

- **E2 `tdee.maintenanceKcal`:** `A6.A2` then `A6` then `A2` then `*`. Sex first, because it is
  the axis that actually moves resting metabolism, and equipment does not. Capped at two axes
  including sex, per the section 4.1 fence.
- **E5 `volume.regionCeiling`:** `A1.A2.A4` then `A1.A2` then `A1` then `*`. Training age first,
  because tolerance tracks exposure history far more than it tracks goal.

**Retrieval rule:** walk the ladder from the top; return the first rung whose cell satisfies ALL
of the admission tests in section 4.3. The returned prior carries the rung that answered, and
the app's copy layer may use it ("people training three or four days a week with dumbbells"),
which is also what makes a wrong cohort visible to a user rather than silent.

**Cohort membership is never stored.** There is no `cohortId` on the user record, in `AppData`, or
in any cloud table. The key is recomputed from current state at every lookup. This satisfies
playbook 52.3's "do not freeze users into an early cluster" as a structural property rather than
a policy: there is no frozen thing to become stale, and there is no cohort label to leak. An
athlete who buys a rack moves from `home` to `gym` on the next plan regeneration with no migration
and no event.

### 4.3 Minimum cell size, and the four arguments that set it

**`MIN_CELL_ATHLETES = 200`. `MIN_CELL_OBSERVATIONS = 1000`. `MAX_ATHLETE_SHARE = 0.05`.**

**Argument 1, statistical. The cell mean must be much more precise than the thing it summarises.**
Writing `sigma_pop^2 = sigma_within^2 + tau^2 = tau^2 (k + 1)`, the standard error of a cell mean
over `m` athletes is `tau * sqrt(k+1) / sqrt(m)`. Requiring that error to be at most a quarter of
`tau`, so that the prior's own uncertainty is a minor term in the blend:

```
sqrt(k+1) / sqrt(m) <= 0.25    ->    m >= 16 (k + 1)
```

| Estimand | k | m required |
|---|---|---|
| E1 stride | 0.2 | 19 |
| E3 load increment | 5 | 96 |
| E2 TDEE | 6 | 112 |
| E4 intensity band | 6 | 112 |
| E5 volume ceiling | 13 | 224 |

So the statistically driven floor across the eleven estimands is about 112 for the typical case
and 224 for the worst. [S8] adds that estimating the hyperparameters from the data is itself
uncertain and needs a correction, which pushes the same direction.

**Argument 2, clustering. Athletes are not independent draws.** [S39] found 2.5 times more
variance between families than within them across 98 families in HERITAGE, with heritability of
the training response up to 47%. Households, gyms and training partners cluster in a fitness app
too. With clusters of size 2 and an intra cluster correlation of 0.3 the design effect is
`1 + (2-1)(0.3) = 1.3`, so the 112 becomes about 146 effective athletes.

**Argument 3, privacy. k-anonymity with headroom.** [S25] requires every released quantity to be
indistinguishable across at least `k-1` others on the quasi identifiers. Our cell key is five
coarse behavioural attributes, weaker than Sweeney's three demographic ones [S26], but the release
is a MEAN, and a mean over a small group is close to a disclosure of the group. A floor of 200
plus the release discipline below puts the per athlete influence on any published number at under
0.5%, which is inside the rounding.

**Argument 4, the differencing attack, which a size floor alone does not stop.** If two consecutive
releases of the same cell show counts of 200 and 201 with means `mu1` and `mu2`, the newcomer's
value is exactly `201*mu2 - 200*mu1`. Size floors are useless against this. Three release rules
close it:

- counts published rounded DOWN to a multiple of 50, never exact, so a published count never
  overstates the cell;
- **a cell is republished only when its rounded count changes, or when four quarters have passed
  since its last publication.** The consequence is the whole defence: two consecutive published
  records of one cell differ either by at least 50 athletes, in which case differencing yields the
  mean of at least 50 unidentified newcomers rather than one person's value, or by up to a year of
  membership churn of unknown size. The exact-one-newcomer differencing attack is not made
  expensive, it is made unobservable;
- the four quarter forced refresh exists so a genuinely drifting cohort is not frozen forever by
  the count rule. It goes through human review, per section 8 fixture EV-20;
- one release per quarter, tied to a pack version bump (B3 section 3: version is a monotonic
  integer, the URL is immutable, so a release is a discrete, auditable event).

**Rounding 112, then 146 for clustering, then doubling for the release headroom and the
[S8] hyperparameter correction, lands at 200.** `MIN_CELL_ATHLETES = 200` for every estimand,
`400` for any cell whose key includes `A6 sex`.

**`MIN_CELL_OBSERVATIONS = 1000` and `MAX_ATHLETE_SHARE = 0.05`** exist for a different failure:
a cell can hold 200 athletes of whom one logs 40 times a week and the rest log twice. Each
athlete's contribution to a cell is capped at 5% of the cell's total observation weight before the
mean is taken. This also bounds sensitivity in the [S19] sense: with a per athlete cap, the amount
one person can move the published mean is bounded, which is the precondition for saying anything
at all about privacy loss.

**Two admission tests beyond size, both of which suppress the cell entirely on failure:**

- **Diversity, against the [S27] homogeneity attack.** A cell of 200 athletes who all report the
  same value discloses that value for every one of them. Require the cell's standard deviation to
  be at least `0.25 * tau_global` for the estimand. A cell that fails is suppressed, not published
  with a warning.
- **Contribution spread.** Require at least 200 DISTINCT athletes after the 5% weight cap is
  applied, so a cell cannot be rescued by one prolific contributor's volume.

**Suppression is silent and complete.** A cell that fails any test does not appear in the pack at
all. The retrieval ladder then falls to the next rung, and if every rung fails the answer is
`theta_house`, which is what the app does today. **The failure mode of this entire system is
"BodyT behaves exactly as it does now", which is the property that makes it safe to ship.**

---

## 5. THE PRIVACY FENCE

### 5.1 What may never leave the device

Absolute list. Nothing here appears in `cohort_contrib`, in any derived aggregate, in any published
pack, or in any query the aggregation job is permitted to write.

| Never leaves | Where it lives now |
|---|---|
| **Phone number** | `profiles.phone` (`0001_core_tables_rls.sql:7`) and device local `SyncMeta.phone` (`cloud/logic.ts:174`). The aggregation job's SQL is forbidden from referencing `public.profiles` at all, and `cohort_contrib` has no phone column to hold one |
| **Recovery hash** | `profiles.recovery_hash` (`0001_core_tables_rls.sql:9`). Same rule |
| PIN, derived password, recovery code | derived in `cloud/logic.ts:98` and `:114`, never stored client side |
| Username | `profiles.username`, `board_stats.username` (`cloud/board.ts:46`) |
| Any free text | `plan.goalStatement`, limitation labels, coach notes, excuse reasons |
| **Every GPS point, split, route and elevation series** | `RunLog.points`, `RunLog.splits`, `activityTypes.ts:47` and `:46`. [S29] four points identify 95% of people, [S30] an aggregated heatmap still gave up home addresses. There is no k that makes route geometry safe, so there is no release at any k |
| Any date or timestamp of any activity | contributions carry a QUARTER string, nothing finer |
| Body weight, height, measurements, body fat, photos | `AppData.measurements` (`types.ts:415`), `AppData.photos`. E2 normalises to kcal per lb ON DEVICE precisely so the weight itself never crosses |
| Which joints are limited | `Prefs.limitations[].joints` (`prefsTypes.ts:79`). Only the boolean `A5` crosses, per section 4.1 |
| Any session, set, meal or measurement level record | only sufficient statistics cross, per 5.2 |
| Cohort membership as a stored label | there is no `cohortId` field anywhere, per section 4.2 |

### 5.2 What may leave, in exactly what form

**One row, per athlete, per quarter, per estimand. Seven fields. Opt in, default off.**

```sql
-- supabase/migrations/0003_cohort_contrib.sql   (project: bodytea-prod)
create table public.cohort_contrib (
  user_id        uuid not null references auth.users(id) on delete cascade,
  quarter        text not null check (quarter ~ '^\d{4}Q[1-4]$'),
  estimand       text not null check (char_length(estimand) <= 40),
  cohort_key     text not null check (char_length(cohort_key) <= 64),
  n              int  not null check (n between 1 and 500),
  sum            double precision not null,
  sumsq          double precision not null check (sumsq >= 0),
  engine_version int  not null,
  primary key (user_id, quarter, estimand)
);
alter table public.cohort_contrib enable row level security;
create policy "contrib insert own" on public.cohort_contrib
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "contrib update own" on public.cohort_contrib
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
-- DELIBERATELY NO SELECT POLICY. Not even the owner can read this table back through
-- the anon key, so it cannot be enumerated by anyone holding a session.
```

Notes on that shape, each of which is load bearing:

- **No select policy at all.** The client upserts with `returning: 'minimal'`. The only reader is
  the scheduled aggregation job running under the service role. This is the opposite of
  `board_stats`, whose `using (true)` select policy is the defect in section 5.5.
- **`user_id` is present only so RLS can scope the write.** It is never carried into an aggregate.
  A rotating on device pseudonym was considered and rejected: any pseudonym the client can derive,
  the server can recompute from data it already holds, so it would buy nothing and cost a key
  rotation mechanism.
- **`(user_id, quarter, estimand)` is the primary key**, so one account contributes at most one
  row per estimand per quarter. This is the Sybil bound in section 5.4.
- **`n` is capped at 500 by a CHECK**, and the client caps it again before writing. An unbounded
  count is an unbounded sensitivity [S19], and a table constraint is the only version of that cap
  an attacker cannot skip.
- **`sum` and `sumsq` rather than a mean.** The second moment is what lets the offline job measure
  `sigma_within` and `tau` and therefore derive `k` per estimand per cohort [S7][S2], instead of
  hand typing it the way `engine/calibration.ts:69` does today. That is the whole reason there are
  three numbers and not one.
- **Values are winsorized on device** to the estimand's published 5th and 95th percentile bounds,
  which ship in the previous quarter's pack. A value outside the bound contributes at the bound.
- **`engine_version`** so an aggregate can be attributed to the engine that produced it, per
  playbook 52.5. Contributions from different engine versions are aggregated separately, never
  pooled.

**The path from that table to the athlete's phone is one directional and never runs at runtime:**

```
device  ->  cohort_contrib          quarterly, opt in, one row per estimand
            (service role only)
   offline job  ->  cohort_priors   applies section 4.3 admission tests, suppresses failures
   CI           ->  scripts/buildPacks.ts reads cohort_priors under the service role
                ->  public/packs/population/cohort-priors@N/records.jsonl.gz
   gh-pages     ->  a static file, content addressed, sha256 pinned in plan/packRegistry.ts
   device       ->  installs it opportunistically, per B3 section 2 WARM rules
```

**The app never queries Supabase for a prior.** There is no runtime read path from the engine to
the population layer, and the layering test already enforces the direction: `plan` is rank 0 and
`engine` is rank 1, `cloud` is rank 2 (`src/structure.test.ts:158` to `:167`), so nothing in
`plan/` or `engine/` can import `cloud/` without failing the existing test. No new rule is needed,
which is the same argument B3 section 10 makes for `platform/foodLookup.ts`.

### 5.3 Threat model: four attackers, and what each actually gets

**Attacker 1: any authenticated user, against the system as it stands today. This one succeeds,
and it is a live defect, not a hypothetical.**

`board_stats` carries the policy `for select to authenticated using (true)`
(`0001_core_tables_rls.sql:45` to `:46`). No server side limit exists; the 50 row cap and the
`sessions_total >= 3` filter at `cloud/board.ts:74` and `:78` are client politeness. Anyone with
an account can page the entire table. Per user they obtain:

- `username`, self chosen and frequently reused across services;
- `goal_statement`, up to 80 characters of the user's own free text (`cloud/board.ts:48`);
- `goal`, `streak`, `consistency30`, `pr_gain90`, `protein30`, `sessions_total`;
- `updated_at`, server stamped by trigger (`0001_core_tables_rls.sql:70` to `:71`).

The concrete inference: the board row is rewritten on every successful envelope backup
(`cloud/sync.ts:100`), gated to once per hour (`cloud/board.ts:29`), and the envelope push itself
fires 10 seconds after any state change (`cloud/sync.ts:155`, `:166`). **Polling `board_stats`
hourly therefore yields a per user app activity timeline at hour resolution**, and differencing
`sessions_total` between polls gives the exact number of sessions logged in the interval.
Add a self chosen username and 80 characters of self written text and this is precisely the
auxiliary information attack of [S28], with the fitness specific precedent in [S30].

R13's position: **this is a per user table, not an aggregate, and no population aggregate may be
derived from it, joined to it, or published beside it while that policy stands.** Fixing it is a
prerequisite for section 5.2, not a follow up. The minimal fix is a security definer view that
returns only the top 50 rows for one category and drops `goal_statement`, with the base table's
select policy removed.

**Attacker 2: anyone holding the published prior pack, which is everyone, since it ships with the
app.** What can they learn about one named user?

| Attack | Status under this design |
|---|---|
| Read a cell mean and attribute it to a member | The mean is over at least 200 distinct athletes with each capped at 5% of the weight, so one person's maximum influence on a published number is under the 50 count rounding |
| Differencing across two releases [S20] | Closed deterministically: counts are published rounded to 50, and **a cell is republished only when its rounded count changes**, so a mean never moves against a stable count |
| Homogeneity attack [S27] | Closed by the diversity admission test: a cell whose SD is under `0.25 * tau_global` is suppressed entirely rather than published |
| Membership inference [S32] | The published object is three moments over at least 200 athletes and at least 1,000 observations, a parameter to example ratio of 3 to 1,000. [S32] shows attack success rises with parameters relative to training examples; this is the far end of that curve. **This is why a prior must always be moments and never a fitted per cell model** |
| Auxiliary knowledge, the [S25] caveat | An attacker who already knows the values of 199 of the 200 members can solve for the last. This requires knowing 199 people's training data, which is a stronger assumption than any realistic adversary and is not defended against |

**Attacker 3: the server operator, or anyone holding the service role key.** Can join
`cohort_contrib.user_id` to `profiles.phone`. **This is real and it is not cryptographically
prevented. Saying otherwise would be a lie.** Two things make it the wrong place to spend
engineering:

1. The join yields a coarse cohort key and three moments per estimand per quarter. The same actor
   can already read `states.envelope`, which is the athlete's entire training and health record
   (`0001_core_tables_rls.sql:19` to `:24`). `cohort_contrib` adds close to zero marginal
   disclosure against this adversary.
2. The defence that does work is minimisation, which is what section 5.1 is. The rule that
   actually binds is procedural and testable: **the aggregation job's SQL may not reference
   `public.profiles`, and CI fails if it does.**

**Attacker 4: a malicious contributor poisoning a prior [S18].** Three bounds compose:

- one account writes at most one row per estimand per quarter (the primary key), so volume
  stuffing needs many accounts, and an account needs a unique phone number
  (`0001_core_tables_rls.sql:7`, `phone text not null unique`). The account model is accidentally a
  Sybil cost, which is worth noting and worth not removing;
- the aggregation applies the 5% per athlete weight cap and winsorizes to the cell's 5th to 95th
  percentile before taking moments, so an extreme value contributes at the bound;
- **even a fully captured prior is clamped.** `MAX_DRIFT = 0.5` at the client (section 3.2, guard
  G2) anchors to `theta_house`, and guard G6 forbids any safety gate from being a learned
  estimand. The worst achievable outcome of a successful poisoning campaign is that a suggested
  rest interval or step band moves by up to half, in a suggest only surface, with the provenance
  visible in the copy (guard G3).

### 5.4 Differential privacy: not first, and the honest reason

The recommendation is **do not ship differential privacy in the first version, and write down the
condition that changes the answer.** The reasoning, not the conclusion, is the point:

1. **The budget is the hard part, not the mechanism.** Under sequential composition [S20], eleven
   estimands at epsilon 1 each is epsilon 11 per quarter and 44 per year, and the lifetime budget
   is unbounded unless something tracks it across releases forever. [S22] is exactly this failure
   in a shipped product: reverse engineered per submission epsilon of 6 on macOS and 14 on iOS,
   data sent daily, and no cross day accounting, making the effective lifetime loss unbounded.
   An unaccounted epsilon is a number in a slide, not a guarantee.
2. **Local DP needs a population BodyT does not have.** [S21] deploys local DP at Chrome scale
   precisely because per client noise needs enormous n to average out. With cells at the 200
   athlete floor, local DP noise would swamp the signal, and **a noisy prior is strictly worse than
   the house constant it would replace**, because the house constant at least has a citation.
3. **What DP would buy here is already bought deterministically.** Its main contribution against
   this release shape is protection from the differencing attack, and the republish rule in
   section 4.3 closes that exactly rather than probabilistically.
4. **[S24] says choose epsilon from the harm, not from convention**, and [S23] shows a real national
   deployment set its budget by a utility argument that moved repeatedly through the demonstration
   cycle. The harm from disclosing "athletes training four to five days a week with a full gym who
   are chasing size add about 4 lb per exposure on lower body lifts" is not zero, but it is not
   meaningfully reduced by adding Laplace noise to it either.

**Condition to revisit, in B3's style:** add central DP with a persisted lifetime budget ledger the
moment any of these becomes true. Publish a cell COUNT or a histogram rather than only moments;
move the release cadence from quarterly to continuous; admit any axis with more than four levels;
or drop `MIN_CELL_ATHLETES` below 200. The mechanism to add first is Laplace noise on the cell
mean at sensitivity `0.05 * (p95 - p05)`, which the 5% weight cap and the winsorization already
make well defined. That the sensitivity is already bounded is not an accident, it is the reason
those two rules are in section 5.2 rather than in a later phase.

### 5.5 The three live defects this fence catches

| # | Defect | `file:line` | Fix |
|---|---|---|---|
| DEF-1 | `board_stats` is a world readable per user behavioural table with free text and an activity timestamp | `0001_core_tables_rls.sql:45` to `:46` (`using (true)`), `cloud/board.ts:48` (`goal_statement`), `0001_core_tables_rls.sql:70` to `:71` (`updated_at` trigger) | replace the select policy with a security definer view returning a bounded top 50 per category and no `goal_statement`; prerequisite for any population work |
| DEF-2 | Leaderboard participation cannot be declined separately from cloud backup: the board push is piggybacked on every successful envelope push | `cloud/sync.ts:100` | separate the consents. **Population contribution must be a third, independent, default off opt in**, never coupled to either |
| DEF-3 | The phone number is fetched from `profiles` after every sign in and written to device `localStorage` | `cloud/sync.ts:205` to `:208`, `cloud/logic.ts:174`, `:190` to `:196` | out of scope for R13 to fix, in scope to fence: nothing in `plan/` or `engine/` may import `cloud/`, which `src/structure.test.ts:158` to `:167` already enforces by rank. R13 adds no new path to it |

---

## 6. COLD START

### 6.1 What a brand new athlete gets, hour by hour

**Before onboarding finishes: `theta_house` for all eleven estimands, `w = 0` everywhere.** This is
byte for byte what the app does today. There is no network call, no pack requirement, and no
degraded path, because `theta_prior := theta_house` when a pack is absent (guard G9).

**Immediately after onboarding**, the app knows `A2 goalFamily`, `A3 equipmentClass`,
`A4 daysPerWeek`, `A5 limitation`, and `A6 sex` where the athlete gave it. It does not know
`A1 trainingAge`, and it does not ask a question to get it.

**`A1 = 'unknown'` is a first class cohort level, not a fallback.** Playbook 55.13 states it
directly: unknown is a valid state. A cell keyed `unknown.sizeStrength.gym.4to5.none` is a real
cell that real people are in, it clears `MIN_CELL` before most specified cells do because it is
where every new athlete lands, and its prior is the correct answer for someone who has told the
app nothing about their history. Treating unknown as missing rather than as a level is the single
most common way a cold start system gets worse than the constant it replaced.

**Where the first prior comes from when there are zero contributors.** This is the [S9] new
community problem, and the answer is not to wait. **Pack version 1 is seeded from the literature,
not from the user base.** Several of the meta analyses the other packs already cite report their
results STRATIFIED, which is a cohort prior in every sense except that it did not come from BodyT
users. R3's source S22 (Peterson, Rhea and Alvar) reports optimal dose by training status: roughly
60% 1RM and 3 days per week and 4 sets per muscle for untrained, 80% and 2 days and 4 sets for
recreationally trained, 85% and 2 days and 8 sets for athletes. That is a tier A cohort prior on
`A1` available before a single contribution row exists. R7's population stratifications and R3's
rest bands by training status [S3 in R3 terms, Grgic 2018: trained lifters need over 2 minutes,
60 to 120 seconds suffices for untrained] are the same shape. Pack version 1 therefore ships with
`source_refs` pointing at papers and `evidence_tier: 'A'` or `'B'`; user derived cells arrive in
version 2 and later and carry `evidence_tier: 'D'` with a `derivedFrom` block, so the audit trail
never confuses the two.

### 6.2 The decay schedule, in numbers

Modelled athlete: four sessions per week, two exposures per week on each primary lift, one GPS run
per week, meals logged daily from day one, body weight logged twice a week, rest timer used.
`w = n / (n + k)`, with the shipped admission gates applied first.

| Estimand | k | wk 1 | wk 2 | wk 4 | wk 6 | wk 8 | wk 12 | wk 26 |
|---|---|---|---|---|---|---|---|---|
| E10 reach ratio | 0 | **1.00** on the day it is measured, else 0 forever | | | | | | |
| E11 session minutes | 0.4 | **0.91** | 0.95 | 0.98 | 0.98 | 0.99 | 0.99 | 1.00 |
| E1 stride, per pace bin | 0.2 | **0.83** | 0.91 | 0.95 | 0.97 | 0.98 | 0.98 | 0.99 |
| E7 rest sufficiency | 6 | 0.40 | **0.57** | 0.73 | 0.80 | 0.84 | 0.89 | 0.95 |
| E3 load increment | 5 | 0.29 | 0.44 | **0.62** | 0.71 | 0.76 | 0.83 | 0.91 |
| E6 weekday miss rate | 4 | 0.20 | 0.33 | **0.50** | 0.60 | 0.67 | 0.75 | 0.87 |
| E4 intensity band | 6 | 0 (gate) | 0 (gate) | **0.40** | 0.50 | 0.57 | 0.67 | 0.81 |
| E2 TDEE | 6 wk | 0 (gate) | 0 (gate) | 0.40 | **0.50** | 0.57 | 0.67 | 0.81 |
| E9 e1RM divisor | 4 pairs | 0 | 0.20 | 0.33 | 0.43 | **0.50** | 0.60 | 0.76 |
| E5 volume ceiling | 13 | 0.13 | 0.24 | 0.38 | 0.48 | **0.55** | 0.65 | 0.80 |
| E8 detraining | 2 layoffs | 0 | 0 | 0 | 0 | 0 | 0 | 0 in almost every case |

Bold marks the first column in which that estimand crosses `w >= 0.5` and the individual becomes
the majority of the answer. The gates in the E4 and E2 rows are the shipped ones:
`MIN_ACTIVITY_SAMPLES = 4` and `MIN_BIAS_SAMPLES = 3` at `engine/calibration.ts:53` and `:56` for
E4, and the section 3.4 requirement of at least 14 logged meal days plus three weight readings
spanning at least 21 days for E2. A gate forces `w = 0` outright; it is not a soft weight.

**Summary, which is the answer to "how fast should the app stop leaning on the prior":**

| By the end of | Estimands where the individual is the majority of the answer |
|---|---|
| week 1 | 3 of 11 (E10 if measured, E11, E1) |
| week 2 | 4 of 11 (adds E7) |
| week 4 | 6 of 11 (adds E3, E6) |
| week 6 | 8 of 11 (adds E4, E2) |
| week 12 | 10 of 11 (adds E9, E5) |
| ever | E8 stays prior driven for almost every athlete, correctly |

**This spread is the point.** A single global "trust the user after N sessions" number would be
wrong for nine of the eleven. Stride is nearly directly measured and should abandon the population
constant after one run; per region volume tolerance is a Bernoulli outcome with a base rate near
0.15 and needs three months. [S35] is the reason to be comfortable with the slow end: across 24
studies the majority of variation in observed change scores was measurement error, so an app that
concluded "this person is different" from four sessions would usually be concluding it from noise.
[S36] makes the same point structurally: separating a participant by training interaction from
within participant variance requires each participant to complete an intervention twice, and an
app watching one athlete on one program is in the weakest possible design for that inference. The
correct response is not to give up, it is to shrink hard and say so.

### 6.3 What cold start must never do

| # | Rule | Why |
|---|---|---|
| C1 | **A prior may lower or hold a starting dose. It may never raise one.** The cold start blend is clamped to `min(theta_blend, theta_house)` for every dose bearing estimand (E3 increment, E5 ceiling, E7 rest is exempt since more rest is not more dose) | The cost is asymmetric. A prior that says "people like you start at 135" applied to someone who cannot lift it is an injury; applied downward it is one easy session. Playbook 54 on ramp logic says the same thing from the other direction |
| C2 | A prior may never open or close a gate | Guard G6. A cohort that tolerates something does not make it safe for this person |
| C3 | A prior may never reintroduce a blocked movement or contradict an explicit preference | `Prefs.blocked` via `blockedIds` (`prefsTypes.ts:84`). Playbook 52.11 bullets 2 and 3: an explicit "I hate burpees" outranks any population preference, and one skipped exercise is not a durable dislike in either direction |
| C4 | A prior may never be presented as a fact about this person | Playbook 52.8 final bullet. The copy pattern that already works is at `engine/calibration.ts:292`: it names the sample size and says what it is graded against |
| C5 | Cohort membership may never be shown as a label the athlete is sorted into | It is recomputed per lookup (section 4.2) and surfaced only as the rung that answered, in plain words |
| C6 | With zero contributors, every rung falls through and the app behaves exactly as it does today | This is an acceptance test, not an aspiration. See section 10 |

---

## 7. TYPED SCHEMA PROPOSAL

### 7.1 The cohort prior, inside B3's envelope

The prior is a `KnowledgeRecord<'population', CohortPrior>`. B3 section 4 already reserves
`'population'` in its `Domain` union, so this is a payload, not an envelope change.

```ts
// src/plan/cohort.ts        plan layer (rank 0), pure types plus three pure functions
// Budget <= 180 lines. NOT added to types.ts: that file sits at 695 against a 696
// allowance in structure.test.ts, and the repo has already established the pattern of
// giving a subsystem its own shape file (journeyTypes.ts, prefsTypes.ts, foodTypes.ts).

export type CohortAxis =
  | 'trainingAge' | 'goalFamily' | 'equipmentClass' | 'daysPerWeek' | 'limitation' | 'sex'

export type TrainingAge    = 'unknown' | 'lt6mo' | '6to24mo' | 'gt24mo'
export type GoalFamily     = 'sizeStrength' | 'lean' | 'athletic' | 'endurance'
export type EquipmentClass = 'bodyweight' | 'home' | 'gym'
export type DaysBand       = '2to3' | '4to5' | '6plus'
export type LimitationFlag = 'none' | 'limited'
export type SexAxis        = 'male' | 'female'

/** Every axis optional: a partially specified key IS a rung of the ladder. */
export interface CohortKey {
  trainingAge?: TrainingAge
  goalFamily?: GoalFamily
  equipmentClass?: EquipmentClass
  daysPerWeek?: DaysBand
  limitation?: LimitationFlag
  /** Nutrition estimands only, at 2x MIN_CELL_ATHLETES. See section 4.1. */
  sex?: SexAxis
}

/** Canonical and sorted, so one cohort has exactly one string forever.
 *  'ta=unknown|gf=sizeStrength|eq=gym|dw=4to5|lim=none'. Absent axes are omitted. */
export function cohortKeyString(k: CohortKey): string

export type EstimandId =
  | 'stride.byPaceBin'        | 'tdee.maintenanceKcal'    | 'load.incrementLb'
  | 'intensity.bandScale'     | 'volume.regionCeiling'    | 'schedule.weekdayMissRate'
  | 'rest.sufficientSec'      | 'detrain.giveBackSteps'   | 'e1rm.divisor'
  | 'anthro.reachRatio'       | 'session.preferredMinutes'

export interface CohortPrior {
  estimand: EstimandId
  cohort: CohortKey
  /** Which rung answered. 0 is global, 5 is fully specified. Shown in the copy. */
  rung: 0 | 1 | 2 | 3 | 4 | 5
  /** The cohort central value, in `units`. */
  mean: number
  /** tau: the between athlete SD of the TRUE value. Not the SD of observations. */
  tau: number
  /** sigma_within: the SD of one observation within an athlete. */
  sigmaWithin: number
  /** EPV/VHM. DERIVED by kOf(), never hand typed. This is the crossover sample size. */
  k: number
  /** Contributing athletes, ROUNDED TO 50. Never exact: section 4.3, differencing. */
  nAthletes: number
  /** Contributing observations, ROUNDED TO 100. */
  nObservations: number
  units: string
  /** Winsorization bounds shipped for NEXT quarter's contributions (p05, p95). */
  bounds: [number, number]
  /** Present only on user derived priors. Literature seeded priors carry
   *  source_refs on the envelope instead, and evidence_tier A or B. */
  derivedFrom?: { quarter: string; engineVersion: number }
}

const K_MIN = 0.1
const K_MAX = 50

/**
 * k is computed, not asserted. This is the exact analogue of B3's rule that
 * `confidence` equals confidenceOf()'s output and the build refuses a hand typed one:
 * a hand typed shrinkage constant is a preference about how much to trust users,
 * dressed as a statistic. The clamp exists because a cohort whose measured tau is
 * near zero would otherwise produce an infinite k and freeze every member on the prior.
 */
export function kOf(p: Omit<CohortPrior, 'k'>): number {
  const raw = (p.sigmaWithin / p.tau) ** 2
  return Math.round(Math.min(K_MAX, Math.max(K_MIN, raw)) * 10) / 10
}

/** The fixed backoff ladder for an estimand, most specific first. Section 4.2. */
export function ladderFor(e: EstimandId): CohortAxis[][]
```

A record on the wire, for size. This is the shape `scripts/buildPacks.ts` emits into
`records.jsonl.gz`:

```json
{ "id": "population:load.incrementLb@ta=gt24mo|gf=sizeStrength|eq=gym",
  "domain": "population",
  "payload": { "estimand": "load.incrementLb", "rung": 3,
               "cohort": {"trainingAge":"gt24mo","goalFamily":"sizeStrength","equipmentClass":"gym"},
               "mean": 4.1, "tau": 2.5, "sigmaWithin": 5.6, "k": 5.0,
               "nAthletes": 450, "nObservations": 12800,
               "units": "lb per exposure", "bounds": [0, 15],
               "derivedFrom": {"quarter":"2026Q3","engineVersion":21} },
  "source_refs": [], "evidence_tier": "D", "confidence": 0.4,
  "valid_from": "2026-10-01", "schema_version": 1, "review_status": "published",
  "tags": ["population","load"] }
```

**B3 packet compatibility, which is the constraint that had to be checked rather than assumed.**
That record is roughly 520 bytes of JSON, well under B3's per record projection budget of 2 KB.
More importantly, **at most one population record per estimand can enter a decision packet**, and
no single decision touches more than five estimands: plan generation reads E3, E5, E6, E7 and E11;
a nutrition build reads E2 alone; a cardio log reads E1 and E4. So population learning consumes at
most 5 of B3's 24 record slots and roughly 2.6 KB of its 32,768 byte cap, leaving 19 slots for
evidence, safety, movement and program records. **Population learning cannot starve the packet,
and that is a property of the estimand list being fixed and small, not of a quota.**

`evidence_tier: 'D'` on user derived priors is deliberate and follows B3's own ladder: a pattern
observed in BodyT's own users is a house heuristic with a large n, not a position stand. It ranks
BELOW every sourced record in B3's stage 3 lexicographic ranking, which is exactly playbook 41.1's
rule that population similarity cannot silently override hard evidence.

### 7.2 The blend

```ts
// src/engine/blend.ts       engine layer (rank 1), pure, no I/O. Budget <= 200 lines.

import { MAX_DRIFT } from './calibration'   // ONE definition of 0.5, already at calibration.ts:66

export type BlendSource = 'measured' | 'individual' | 'blended' | 'cohort' | 'house'

export interface Individual {
  value: number
  /** Usable observations after the estimand's freshness and quality gates. */
  n: number
  /** True when this is a direct measurement, not an estimate. Guard G4. */
  measured?: boolean
}

export interface Blended {
  value: number
  /** w = n / (n + k). Zero when no individual estimate survived its gate. */
  weight: number
  source: BlendSource
  samples: number
  /** Which ladder rung supplied theta_prior. Null when the house constant answered. */
  rung: number | null
  /** True when MAX_DRIFT bit. Surfaced, because a silent clamp is a silent bug. */
  clamped: boolean
  /** The sentence the app says. No em dashes. Null when nothing moved. */
  note: string | null
}

export function blend(args: {
  /** The HOT constant that ships in the bundle. Never absent. */
  house: number
  /** From the installed WARM pack, or null when absent or suppressed. */
  prior: CohortPrior | null
  /** From src/engine/estimates.ts, or null when under the gate. */
  individual: Individual | null
  /** Dose bearing estimands are clamped downward only at cold start. Rule C1. */
  doseBearing?: boolean
}): Blended
```

Reference implementation of the body, which is nine lines and has no branches worth hiding:

```ts
const prior = args.prior?.mean ?? args.house
const k     = args.prior?.k ?? 6                      // calibration.ts:69's value as fallback
const ind   = args.individual
if (ind?.measured) return { value: ind.value, weight: 1, source: 'measured', /* ... */ }
const w     = ind ? ind.n / (ind.n + k) : 0
const raw   = (1 - w) * prior + w * (ind?.value ?? prior)
const lo    = args.house * (1 - MAX_DRIFT)
const hi    = args.doseBearing && w < 0.5 ? args.house : args.house * (1 + MAX_DRIFT)
const value = Math.min(hi, Math.max(lo, raw))
```

The `hi` line is rule C1: while the individual is still the minority of the answer, a dose bearing
estimand may not exceed the house constant. Once `w >= 0.5` the athlete's own record has earned the
right to be above it.

### 7.3 What leaves the device, typed

```ts
// src/cloud/contributeLogic.ts    cloud layer (rank 2), PURE, unit testable, no I/O.
// Mirrors the existing cloud/logic.ts vs cloud/sync.ts split. Budget <= 160 lines.

export const CONTRIB_MAX_N = 500          // matches the CHECK in 0003_cohort_contrib.sql

export interface Contribution {
  quarter: string          // '2026Q3'. NOT a date. Section 5.1.
  estimand: EstimandId
  cohortKey: string        // canonical L4 string from cohortKeyString()
  n: number                // capped at CONTRIB_MAX_N
  sum: number              // of WINSORIZED values, bounds from last quarter's pack
  sumsq: number
  engineVersion: number
}

/** Pure. Everything the fence allows out, and nothing else, in one function
 *  that a test can read end to end and confirm carries no date, no id, no text. */
export function buildContributions(args: {
  estimates: Partial<Record<EstimandId, Individual>>
  cohortKey: string
  quarter: string
  bounds: Partial<Record<EstimandId, [number, number]>>
  engineVersion: number
}): Contribution[]
```

```ts
// src/cloud/contribute.ts     cloud layer (rank 2), I/O only, DYNAMIC IMPORT ONLY.
// Budget <= 140 lines. Same discipline as cloud/sync.ts: a local only user never parses it.

/** No-op unless settings.contributeAnonymously === true. Default false, forever. */
export async function pushContributions(): Promise<void>
```

### 7.4 The real repo files that would change

| File | Layer (rank) | New / change | Budget and headroom |
|---|---|---|---|
| `src/plan/cohort.ts` | plan (0) | **new** | <= 180 lines. Types, `cohortKeyString`, `kOf`, `ladderFor` |
| `src/plan/cohortPriors.ts` | plan (0) | **new, generated** | <= 60 lines. The HOUSE fallback table plus the pack pin, same pattern as B3's `packRegistry.ts` |
| `src/engine/blend.ts` | engine (1) | **new** | <= 200 lines |
| `src/engine/estimates.ts` | engine (1) | **new** | <= 400 lines. The eleven individual estimators, each `(data) => Individual \| null`, memoised on `AppData` identity exactly as `calibration.ts:169` does |
| `src/engine/calibration.ts` | engine (1) | change | 309 lines today. `PRIOR_STRENGTH = 6` at `:69` becomes the FALLBACK when no prior record supplies `k`; the file keeps working unchanged with zero packs installed. Export `MAX_DRIFT` for `blend.ts` so 0.5 has one definition |
| `src/plan/cardio.ts` | plan (0) | change | 479 lines. The 12 bands (`:300` etc) and 11 strides (`:297` etc) each gain a `priorId` naming the estimand they are the house default for. Data only, no logic |
| `src/engine/intensity.ts` | engine (1) | change | 236 lines. `stepDistanceMi` at `:116` takes an optional learned stride; `usableHeightIn` at `:77` keeps 69 but names it as a prior |
| `src/plan/bookletOps.ts` | plan (0) | change | 288 lines. `byorNutrition` at `:43` accepts an optional blended maintenance instead of always computing `bw * 15` at `:53`. Defect D1 |
| `src/engine/reps.ts` | engine (1) | change | 320 lines. `loadStepLb` at `:273` takes an optional blended increment. Defect D4 |
| `src/engine/volume.ts` | engine (1) | change | `ceilingFor` at `:133` takes an optional blended ceiling. Defect D6 |
| `src/cloud/contributeLogic.ts` | cloud (2) | **new** | <= 160 lines |
| `src/cloud/contribute.ts` | cloud (2) | **new** | <= 140 lines, dynamic import only |
| `src/store/schema.ts` | store (1) | change | 633 lines against B3's recorded 649 ceiling, so ~16 lines of headroom. `SCHEMA_VERSION` 20 to 21 (`types.ts:610`), one migration adding two optional settings fields: `contributeAnonymously?: boolean` (default false) and `lastContributedQuarter?: string` |
| `supabase/migrations/0003_cohort_contrib.sql` | n/a | **new** | the table in section 5.2 |
| `supabase/migrations/0004_board_stats_view.sql` | n/a | **new** | DEF-1. Prerequisite, not a follow up |
| `scripts/deriveCohortPriors.ts` | scripts | **new** | the offline job. Not under `src/`, not size capped |
| `scripts/buildPacks.ts` | scripts | change | B3 owns it; add the `population` domain adapter |
| `src/structure.test.ts` | n/a | change | new file entries only. **Nothing joins `OVERSIZE_ALLOWED`**, and `types.ts` is untouched at 695 against its 696 allowance |

**Layering verification against the ranks at `src/structure.test.ts:158` to `:167`:**

- `engine/blend.ts` (1) imports `plan/cohort` (0) and `engine/calibration` (1). Down or level. OK.
- `engine/estimates.ts` (1) imports `plan/*` (0) and `engine/*` (1). OK.
- `cloud/contributeLogic.ts` (2) imports `plan/cohort` (0) and `engine/estimates` (1). Down. OK.
- **Nothing in `plan/` or `engine/` imports `cloud/` or `platform/`.** The existing layering test
  already fails such an import, so the "priors ship as data, never a service call" rule is enforced
  by a test that is already in the tree. No new rule is needed, which is the same argument B3
  section 10 makes.
- `plan/cohortPriors.ts` is generated and committed, so a prior change is a small reviewable diff,
  per B3 section 3.

---

## 8. EVAL FIXTURES

Twenty cases. Each states the population state and the individual history going in, and the
expected blended output. Every arithmetic result is worked so the fixture is checkable by hand
before it is checkable by a test. House constants are the real ones at the `file:line` given.

**EV-1. The identity case: no pack, no history.**
In: `house = 5` (`engine/reps.ts:275`, upper body `loadStepLb`), `prior = null`,
`individual = null`.
Out: `{ value: 5, weight: 0, source: 'house', rung: null, clamped: false, note: null }`.
**This fixture is the whole safety argument.** With zero population data the app is
byte identical to today. It must be the first test written and the last one allowed to fail.

**EV-2. Pure cold start: cohort present, zero history.**
In: E3, cell `ta=gt24mo|gf=sizeStrength|eq=gym`, `mean = 4.1`, `k = 5`, rung 3.
`house = 5`, `individual = null`, `doseBearing = true`.
`w = 0`, `raw = 4.1`, `lo = 2.5`, `hi = 5` (dose bearing and `w < 0.5`, rule C1).
Out: `{ value: 4.1, weight: 0, source: 'cohort', rung: 3, clamped: false }`.
The prior lowers the starting increment and is allowed to. It could not have raised it.

**EV-3. The crossover, at exactly `n = k`.**
In: same prior. `individual = { value: 7.5, n: 5 }`.
`w = 5 / (5 + 5) = 0.50`. `raw = 0.5(4.1) + 0.5(7.5) = 5.80`.
`hi = 5 * 1.5 = 7.5` because `w >= 0.5` now.
Out: `{ value: 5.8, weight: 0.5, source: 'blended', rung: 3, clamped: false }`.
**This fixture pins the definition of the crossover: `w >= 0.5` exactly when `n >= k`.**

**EV-4. `MAX_DRIFT` bites upward.**
In: same prior. `individual = { value: 15, n: 40 }`, a novice on a lower body lift climbing fast,
or an e1RM artefact.
`w = 40 / 45 = 0.889`. `raw = 0.111(4.1) + 0.889(15) = 13.79`. `hi = 7.5`.
Out: `{ value: 7.5, weight: 0.89, source: 'individual', clamped: true }`.
`clamped: true` is surfaced, not swallowed. A silent clamp is a silent bug.

**EV-5. `MAX_DRIFT` bites downward.**
In: E7 `rest.sufficientSec`, `house = 90` s. Prior `mean = 75`, `k = 6`.
`individual = { value: 20, n: 30 }`, an athlete who rushes every set.
`w = 30 / 36 = 0.833`. `raw = 0.167(75) + 0.833(20) = 29.2`. `lo = 90 * 0.5 = 45`.
Out: `{ value: 45, weight: 0.83, source: 'individual', clamped: true }`.
The app cannot learn its way to a 20 second rest on a compound. R3 section 6.4 sets an
independent hard floor of 45 s on a compound, and the two agree, which is the point of checking.

**EV-6. A measurement beats everything (guard G4).**
In: E10 `anthro.reachRatio`, `house = 1.33` (`plan/reach.ts:26`). Prior `mean = 1.35`, `k = 0`.
`individual = { value: 1.28, n: 1, measured: true }`.
Out: `{ value: 1.28, weight: 1, source: 'measured', clamped: false }`.
No blending and no clamp. Precedent: `engine/calibration.ts:270`, `if (felt) return felt`.

**EV-7. A gate is not a soft weight.**
In: E4 `intensity.bandScale` for basketball. The athlete has TWO rated sessions.
`MIN_ACTIVITY_SAMPLES = 4` (`engine/calibration.ts:53`), so the per activity individual estimate
is not built at all and `individual = null`. Prior for `ta=unknown|gf=athletic` is `scale = 0.94`.
Out: `{ value: 0.94, weight: 0, source: 'cohort' }`, applied to basketball's shipped
`4500 / 8000` band (`plan/cardio.ts:331`) giving `4230 / 7520`.
The two samples contribute nothing. A gate forces `w = 0`; it does not produce a small weight.

**EV-8. The ladder backs off because a sex bearing cell is too thin.**
In: E2 `tdee.maintenanceKcal`. Athlete key `sex=female|gf=lean`. That cell holds 180 athletes
against the 400 required for a sex bearing key (section 4.3), so it is suppressed. The ladder's
next rung `sex=female` holds 900 and clears. Prior `mean = 13.6` kcal per lb, rung 1, `k = 6`.
`house = 14` (`plan/bookletOps.ts:53`, female multiplier).
`individual = { value: 12.4, n: 8 }` from 8 complete weeks. `w = 8 / 14 = 0.571`.
`raw = 0.429(13.6) + 0.571(12.4) = 12.91`. `lo = 7`, `hi = 21`.
Out: `{ value: 12.91, weight: 0.57, source: 'blended', rung: 1, clamped: false }`.
At 175 lb this is 2,259 kcal against the 2,450 the shipped `bw * 14` gives.
**E2 is deliberately NOT `doseBearing`.** The dangerous direction for a calorie target is
downward, and `plan/kcalFloor.ts:34` and `:44` already gate it. Stacking a second protection on
the same risk would hide which one fired.

**EV-9. Every rung fails: individual shrunk toward the house constant, no cohort in play.**
In: E5 `volume.regionCeiling` for `delts-front`. Every rung is either under 200 athletes or fails
the diversity test, so nothing is published. `house = 8` (`engine/volume.ts:105`, `SMALL_CEILING`).
`individual = { value: 5, n: 6 }`, `k = 13` fallback. `w = 6 / 19 = 0.316`.
`raw = 0.684(8) + 0.316(5) = 7.05`. `lo = 4`, `hi = 8` (dose bearing, `w < 0.5`).
Out: `{ value: 7.05, weight: 0.32, source: 'blended', rung: null, clamped: false }`.
`rung: null` with a non house value is legal and means exactly this. It is also precisely what
`engine/calibration.ts` does today for its one estimand.

**EV-10. Homogeneity suppression [S27].**
In: E6 `schedule.weekdayMissRate`, cell `ta=lt6mo|gf=lean|eq=bodyweight`, 260 athletes, but the
cell is dominated by recent signups who have not missed anything yet, so its SD is 0.02.
`tau_global = 0.20`, threshold `0.25 * 0.20 = 0.05`. `0.02 < 0.05`.
Out: **the cell does not appear in the pack at all.** The ladder backs off to
`ta=lt6mo|gf=lean`. A 260 member cell whose members all report the same value would have
disclosed that value for all 260.

**EV-11. Differencing is unobservable, not merely expensive.**
In: a cell holds 212 contributing athletes in 2026Q3 and 231 in 2026Q4. Rounded DOWN to a
multiple of 50, both are 200. The mean moved from 4.1 to 4.4.
Out: the Q4 pack carries the Q3 record unchanged, with `derivedFrom.quarter = '2026Q3'`.
An attacker sees one mean against one count and can solve for nothing. Even when the rounded count
does change, the two releases differ by at least 50 athletes, so the difference of the means
identifies the mean of at least 50 unidentified newcomers, never one person's value.

**EV-12. The prolific contributor is capped.**
In: a cell holds 210 athletes and 4,000 raw observations, of which one athlete supplied 500 (the
`CONTRIB_MAX_N` ceiling in `0003_cohort_contrib.sql`). `MAX_ATHLETE_SHARE = 0.05`.
Out: weights are capped and re-normalised to a fixed point, at most five passes, and the job
ASSERTS the post cap invariant that no athlete's share exceeds 0.05. CI fails the pack build if
the assertion does not hold. Capping once against the pre cap total would leave this athlete at
`200 / 3700 = 5.4%`, which is why the cap iterates rather than being applied once.

**EV-13. Poisoning is bounded by the clamp, not by the aggregation.**
In: 50 sock puppet accounts join a 250 athlete cell and all submit 40 lb per exposure for E3
against a true cohort mean of 4.1. Winsorization bounds from the prior quarter are `[0, 15]`, so
each contributes at 15. Even at 5% weight each, 50 of them reach `50 / 300 = 16.7%` of the cell.
Poisoned mean `= 0.833(4.1) + 0.167(15) = 5.92`.
A zero history athlete then gets `w = 0`, `raw = 5.92`, `house = 5`, dose bearing so `hi = 5`.
Out: `{ value: 5, weight: 0, source: 'cohort', clamped: true }`. **The attack bought nothing at
cold start.** At `n = 20`, `w = 0.8`, and the poisoned prior moves the answer by
`0.2 * (5.92 - 4.1) = 0.36` lb. The Sybil cost is one unique phone number per account
(`0001_core_tables_rls.sql:7`), and one row per account per quarter (the primary key).

**EV-14. Stride overtakes on the first GPS run.**
In: E1 `stride.byPaceBin`. `house = 0.55` (`plan/cardio.ts:297`). Prior for `gf=endurance`
`mean = 0.545`, `k = 0.2`. One run: `distanceMi = 5.02`, `distanceSource = 'gps'`
(`activityTypes.ts:40`), `steps = 9180` (`activityTypes.ts:42`), `heightIn = 71`.
`5.02 * 63360 = 318,067` inches; `318,067 / 9,180 = 34.65` inches per step;
`34.65 / 71 = 0.488` of standing height. `w = 1 / 1.2 = 0.833`.
`raw = 0.167(0.545) + 0.833(0.488) = 0.498`. `lo = 0.275`, `hi = 0.825`.
Out: `{ value: 0.498, weight: 0.83, source: 'individual', rung: 1, clamped: false }`.
**After one run this athlete's step distance is 9.5% off the population constant, and the app
knows it.** Today `engine/intensity.ts:124` would use 0.55 forever.

**EV-15. Missingness is preserved, not imputed.**
In: E2. The athlete logged meals on 9 days across 5 weeks and has 4 weight readings spanning 30
days. The gate requires at least 14 logged meal days.
Out: `individual = null`, `{ value: prior.mean, weight: 0, source: 'cohort' }`.
Playbook 52.5: preserve missingness, do not fabricate. A partial food log produces NO individual
TDEE rather than a confidently wrong one.

**EV-16. An explicit preference is a filter, not a weight.**
In: `Prefs.blocked` contains `burpee`. The cohort `ta=lt6mo|gf=lean|eq=bodyweight` shows burpees
strongly associated with adherence.
Out: burpee is not programmed, and no blend runs. `blockedIds(prefs)` (`prefsTypes.ts:84`) removes
it in B3 stage 1, before ranking ever sees it. Playbook 52.11 bullet 2. **The fence for an explicit
preference is set membership, never a large weight, because a large weight is a small weight
waiting for a bigger cohort.**

**EV-17. One skipped exercise changes nothing, anywhere.**
In: the athlete skipped `goblet-squat` once.
Out: no prior changes, no blend changes, no contribution row changes. Exercise preference is not
one of the eleven estimands, so there is nothing across users to move; the individual side is R3's
decline ledger with its own thresholds. Playbook 52.11 bullet 3. **This fixture pins the estimand
list as a CLOSED set: the correct answer to most population learning questions is that the
quantity is not learned at all.**

**EV-18. A safety gate is untouchable.**
In: cohort data shows athletes in `gf=lean|eq=gym` sustaining 22% deficits with no adverse signal.
`MAX_DEFICIT = 0.25` at `plan/kcalFloor.ts:44`.
Out: `MAX_DEFICIT` is unchanged. It is not an estimand, no record exists that could carry it, and
`scripts/buildPacks.ts` FAILS THE BUILD if any emitted record carries an `estimand` outside the
eleven. Guard G6. The same test covers `MIN_KCAL_TRAINING` (`kcalFloor.ts:34`),
`MIN_KCAL_REST` (`:37`) and every R6 red flag rule.

**EV-19. Engine versions are never pooled.**
In: 2026Q3 contributions arrive from `engineVersion` 21 and, after a mid quarter deploy, 22. The
cell holds 400 at v21 and 90 at v22.
Out: the aggregation partitions by `engineVersion`. Only the v21 partition clears `MIN_CELL` and
publishes; the v22 partition is suppressed and accumulates. v22 devices read the v21 prior, which
B3's `engineMin` field permits (it gates readability, not authorship). The manifest records which
engine version produced each cell. Playbook 52.5: log model and rule version identifiers so later
analysis can distinguish behaviour before and after engine changes.

**EV-20. Drift is flagged for a human, never auto published.**
In: the Q4 mean for E6 in a 250 athlete cell moves from 0.18 to 0.31 while the rounded count stays
at 250. `tau = 0.20`, so the between quarter noise scale is `2 * tau / sqrt(m) = 2(0.20)/15.8 =
0.025`. The observed move of 0.13 is over five times that.
Out: the Q3 value ships again under the EV-11 rule, AND the offline job raises a drift alarm on the
cell. A human reviews before the four quarter forced refresh publishes it. Playbook 52.11 bullet
14: new users shift behaviour after a product redesign, and drift monitoring should detect that old
priors are degrading. **A five sigma move in a cohort mean is far more likely to be an instrumentation
change than a change in people.**

---

## 9. WHAT NOT TO BUILD YET

Same discipline as B3 section 9: a refusal with a stated condition that changes the answer.

### Federated learning: no

[S14] defines the cross device setting as massively distributed, with client counts far exceeding
the number of examples per client, clients unreliable and typically participating at most once,
and no client addressability. **BodyT is the exact inverse.** It will have thousands of clients
holding thousands of observations each, every client is addressable through an account, and the
same client contributes every quarter for years. Three more specifics:

- [S17] reports accuracy loss up to 55% on highly skewed non IID client data, attributed to weight
  divergence. Fitness clients are maximally non IID by construction: one athlete trains one goal on
  one equipment set in one modality.
- [S16] reports that production rounds require devices to be idle, charging and on unmetered
  network, and that a round is abandoned when too few selected clients report. **A browser PWA has
  none of those signals.** There is no charging state, no idle daemon, and no background round
  participation on iOS Safari at all.
- [S15]'s secure aggregation degrades as participants per round fall, and at a 200 athlete cell the
  participant count per round is the worst it will ever be.

The decisive point is simpler than any of those. **Federated learning trains a MODEL. This design
ships MOMENTS.** There is nothing to train. Three numbers per cell computed from sums that a
`GROUP BY` produces is not a machine learning problem wearing a disguise, and treating it as one
would add a distributed systems dependency to arithmetic.

**Condition to revisit:** an estimand genuinely needs a fitted function of more than three
parameters, AND the contributing population exceeds 100,000. Both, not either.

### Contextual bandits and online exploration: no

[S12] found that the regret advantage of posterior sampling over a fixed policy largely disappears
when feedback is delayed, and training outcomes here are delayed by weeks (strength) to months
(hypertrophy). [S11]'s LinUCB deliberately serves a suboptimal arm to learn, which collides head
on with suggest only: **the app does not control exposure, the athlete does**, so an assigned arm
is a request, not an assignment, and the resulting selection bias is unrecoverable. Playbook 52.6
independently forbids putting a safety relevant constraint in an exploration arm.

**Condition to revisit:** an estimand whose outcome is observable inside a single session, such as
rest interval sufficiency (E7) or cue wording, where feedback delay is minutes rather than months.
Even then, the arms must be inside an already acceptable evidence band.

### Learned cohort discovery by clustering or embeddings: no

B3 section 9 already refuses vector search for the planner, and this is the same refusal with an
extra reason. **A learned cluster is an unnamed cohort**, and an unnamed cohort cannot be explained
to a user in plain copy (playbook 41.7), cannot be audited for underperformance on athletes with
disabilities or unusual equipment access (playbook 52.8), and cannot be k-anonymity checked,
because its boundary moves every time the model is refit and the same person can leave a cell
without any of their own data changing. The six declared axes have four levels at most, are
human readable, and produce a key that is stable for as long as the athlete's answers are.

**Condition to revisit:** never, unless the cluster assignment is first frozen into a deterministic
published rule, at which point it is a declared axis and this section does not apply to it.

### Per cell fitted models of any kind: no

[S32] shows membership inference success rising with model parameters relative to training
examples. A published cell holds at least 1,000 observations; a per cell model with tens of
parameters would put the ratio into the range where the attack works. Priors are moments. If a
relationship needs a shape, it gets a shape with three parameters and a diagnostic, or it does not
ship.

### A runtime fetch of a prior: no, and this one is a hard constraint rather than a judgement

It would break the offline guarantee, break the golden tests (a plan would depend on the network),
and break the layering law, since `engine/` would need to reach `cloud/`. The existing test at
`src/structure.test.ts:158` to `:167` already fails such an import. There is no condition that
revisits this.

### An experimentation framework: not here, and not first

Playbook 52.6 owns it. It should not be built before the event layer exists at all, and today there
is no event log, no decision log and no outcome record anywhere in `src/` (Defect C, section 2.4).
Building an A/B framework on top of zero instrumentation would produce experiments nobody can
attribute.

### Storing a responder or non responder label: no

[S42] found responder status inconsistent across outcome measures within the same person, and [S41]
found apparent non response frequently resolves at a different dose or modality. **The correct
action when an athlete is not progressing is to change the dose, not to record a belief about the
person**, and a stored label is a belief with a schema migration attached.

---

## 10. INTEGRATION NOTES

### 10.1 Sequencing, and the part worth doing first

**Step 0, prerequisite, ships no population code: fix DEF-1.** Replace `board_stats`'s
`for select to authenticated using (true)` (`0001_core_tables_rls.sql:45` to `:46`) with a security
definer view that returns a bounded top 50 per category and drops `goal_statement`. No population
aggregate may be built while a world readable per user behavioural table exists beside it.

**Step 1, the highest value step, and it needs ZERO cloud.** Land `plan/cohort.ts`,
`engine/estimates.ts` and `engine/blend.ts` with `prior = null` at every call site. Behaviour is
unchanged by acceptance criterion A1, but the blend now runs against the house constants, and
**defects D1 and D2 become fixable entirely on device**: the athlete's own TDEE from their own
weight trend and food log, and their own stride from their own GPS runs, each shrunk toward the
shipped population constant with `w = n / (n + k)`. No cohort, no contribution, no new table, no
privacy surface, no opt in.

That ordering is the argument for this whole pack: **the two largest defects in section 2.3 are
individual learning problems, not population learning problems**, and the population layer is the
smaller, later, riskier half. Anyone tempted to build the cloud pipeline first is building the
second most valuable thing.

**Step 2:** seed `cohort-priors@1` from the literature (section 6.1), from stratifications R3 and
R7 already hold. Still zero user data, and the pack now exercises the full B3 warm path.

**Step 3:** `0003_cohort_contrib.sql`, the opt in default off contribution, the offline job, and
`cohort-priors@2` onward.

### 10.2 Acceptance criteria

| # | Criterion | How it is checked |
|---|---|---|
| A1 | With zero packs installed and zero contributions, `golden.test.ts` and `goldenLife.test.ts` produce output identical to the pre R13 baseline | the existing golden snapshots, unchanged |
| A2 | `blend()` is pure and total, and all twenty section 8 fixtures pass | a new `blend.test.ts` |
| A3 | Every record's `k` equals `kOf()`'s output on that record | build invariant in `scripts/buildPacks.ts`, mirroring B3's `confidenceOf` rule |
| A4 | No emitted record carries an `estimand` outside the eleven | build invariant. Covers EV-18 |
| A5 | No emitted record and no column of `cohort_contrib` carries a phone, a recovery hash, a username, free text, a date finer than a quarter, a coordinate, a weight, a height, or a joint name | field name allowlist asserted in CI, over both the SQL and the emitted JSONL |
| A6 | The aggregation job's SQL does not reference `public.profiles` | grep in CI. This is the only enforcement that exists against attacker 3, and it should be honest about that |
| A7 | Every published cell has `nAthletes >= 200` (400 with `sex`), `nObservations >= 1000`, `SD >= 0.25 * tau_global`, and max post cap athlete share `<= 0.05` | build invariant. Covers EV-10 and EV-12 |
| A8 | Published `nAthletes` is a multiple of 50 and `nObservations` a multiple of 100, both rounded down | build invariant. Covers EV-11 |
| A9 | `contributeAnonymously` defaults false, and is independent of both cloud backup and the leaderboard | a store test. Covers DEF-2 |
| A10 | Nothing in `plan/` or `engine/` imports `cloud/` or `platform/` | the existing layering test at `src/structure.test.ts:158` to `:167` |
| A11 | A population record projects to `<= 2 KB` and at most 5 enter any B3 decision packet | a retrieval test against B3's `PACKET_MAX_RECORDS` and `PACKET_MAX_BYTES` |
| A12 | No em dash in any user visible string the pack emits | B3 section 3 build invariant 5 already covers this |
| A13 | No file added or changed by R13 joins `OVERSIZE_ALLOWED`, and `types.ts` stays at 695 against its 696 allowance | `src/structure.test.ts` |

### 10.3 What must not change without golden review

`MAX_DRIFT` (`engine/calibration.ts:66`), `MIN_CELL_ATHLETES`, `MAX_ATHLETE_SHARE`, the eleven
estimand ids, the six cohort axes, the ladder order, and the anchoring of the clamp to
`theta_house` rather than to `theta_prior`. Each of those is load bearing for either a safety
property or a privacy property, and each has a fixture in section 8 that fails visibly if it moves.

### 10.4 Open questions for the owner

1. **`A1 trainingAge` is not stored anywhere today.** R13's default is that `unknown` is a real
   cohort level and nothing is asked, which costs one rung of ladder specificity. The alternative
   is that onboarding infers it from imported history, which playbook 55.5 prefers ("infer first,
   ask only what matters"). R13 does not need a decision to proceed, only to know which.
2. **Is `A6 sex` acceptable as a nutrition only cohort axis at 2x the cell floor?** It is the one
   axis carrying real re-identification weight. The app already splits on it locally at
   `plan/bookletOps.ts:53`, so admitting it collects nothing new, but it does put it into a
   published key. Refusing it costs E2 roughly one ladder rung of precision.
3. **The contribution opt in is user visible copy and needs owner approval**, like the sergeant
   quotes. It has to say what leaves, how often, and that it can be turned off, in three sentences,
   with no em dashes.
4. **DEF-1 is a live privacy defect independent of this pack** and should be triaged on its own
   schedule rather than waiting for population learning.

---

*R13 ends here. The one sentence version: BodyT already contains a correct two layer shrinkage
estimator at `src/engine/calibration.ts`, applied to exactly one of the roughly sixty population
constants hiding in the tree, and the work is to name that pattern, derive its shrinkage constant
instead of typing it, extend it to ten more estimands, and keep the population half of it behind a
fence whose failure mode is that the app behaves exactly as it does today.*
