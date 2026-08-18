# R4 MEAL AND RECIPE CORPUS EXPANSION (feeds J9: meal & chef engine)

Job: R4. Date: 2026-08-18. Scope: v12 sections 25-26 practical layer. NO production code
shipped from this pack. Every count in section 1 was derived by script against
`origin/claude/app-audit-refinement-sjw2va` (the deploy branch), not from memory. Every
external number in section 2 carries a source tag [D#] from the table in 2.1. Anything that
is judgement rather than evidence is tagged **CRAFT**. Nutrient values are never invented
here: this pack specifies where they come from, not what they are.

Reads and builds on `research/R1-nutrition.md` (macro bands, calorie models, fibre floor,
weight-rate bands). R1 owns *how many* grams and calories. R4 owns *what plate*, *what it
costs*, *how long it takes*, and *whether it gets eaten twice*. Where R4 needs a macro rule
it cites R1's section number rather than restating it.

House rules honored throughout: no em dashes; suggest-only voice; users never pick reps or
portions they should not have to; ranges over fake precision.

---

## 1. WHAT EXISTS

### 1.1 Files and exact counts

Measured on the deploy branch, 2026-08-18.

| File | Lines | What it holds | Count |
|---|---|---|---|
| `src/plan/foods.ts` | 316 | `FOODS: FoodDef[]` | **62** |
| | | `MEAL_TEMPLATES` (owner's PDF plan, verbatim) | 10 |
| | | `SUPPLEMENTS` / `SUPPLEMENT_CATALOG` | 4 / 9 |
| | | `GROCERY_LIST` (static PDF list) | 5 categories, 30 items |
| | | `MEAL_SPLITS` (module-private, keyed by meals-per-day) | 4 keys: 2,3,4,5 |
| `src/plan/mealAlts.ts` | 135 | `COMMON_MEALS: CommonMeal[]` | **42** |
| `src/plan/cooking.ts` | 472 | `COOKING: Record<string, CookingMeta>` | **40** |
| `src/plan/sportsNutrition.ts` | 409 | protein/carb/fat bands, fuelling rules, supplement evidence | 28 exports |
| `src/plan/generator.ts` | 940 | plan assembly; calls `buildMealPlan` once at line 897 | 1 call site |

**Correction to the brief.** `FOODS` is **62** entries, not 85. The 85 figure counts every
`{ id: ... }` literal in `foods.ts`, which is 62 foods + 10 `MEAL_TEMPLATES` + 4 `SUPPLEMENTS`
+ 9 `SUPPLEMENT_CATALOG`. `FOODS` by category, verified against the `category:` tag on every
row (they sum exactly): **protein 25, carb 15, fat 10, snack 9, veg 3 = 62**.

The three numbers J9's guard test should assert against as a baseline:
`FOODS.length === 62`, `COMMON_MEALS.length === 42`, `Object.keys(COOKING).length === 40`.

### 1.2 The three shapes, as they actually are

```ts
// plan/foods.ts
interface FoodDef { id; name; serving: string; proteinG; kcal; carbsG; fatG;
                    category: 'protein'|'carb'|'fat'|'veg'|'snack' }

// plan/mealAlts.ts
interface CommonMeal { id; name; ingredients: string[]; proteinG; kcal;
                       slots: ('breakfast'|'lunch'|'dinner'|'snack'|'late')[];
                       diet: 'omni'|'pescatarian'|'vegetarian'|'vegan' }

// plan/cooking.ts, keyed by CommonMeal.id
interface CookingMeta { method: 'no-cook'|'assembly'|'stovetop'|'oven'|'microwave'|'blender';
                        gear: ('none'|'pan'|'pot'|'tray'|'kettle'|'blender'|'microwave'|'toaster')[];
                        activeMin; totalMin; skill: 0|1|2; steps: string[];
                        seasoning?: string; batch?: string; keepsDays?: number }

// types.ts, what the plan and every screen actually stores
interface MealTemplateDef { id; dayType: 'training'|'rest'; slot: string; name;
                            detail: string; proteinG; kcal }
```

**The load-bearing asymmetry.** `FoodDef` has carbs and fat. `CommonMeal` and
`MealTemplateDef` do not. So the moment a user takes a swap from the swap sheet, the meal
that lands in their plan carries protein and kcal only. `engine/stats.ts:macrosFor` computes
`coverage = coveredKcal / kcal` and only counts an entry toward carbs and fat when both are
present, so every swap taken is a hole in the macro ring by construction. J9 cannot add a cost
axis without also closing this, because a "fit the remaining macros" ranker needs carbs and
fat on the candidate or it is only fitting protein and calories.

### 1.3 What the meal screens and the generator actually read

| Consumer | Reads | Ignores |
|---|---|---|
| `screens/meals/MealDetailSheet.tsx` | `mealAlternatives(...)` (default **3** results), then per alt: `id, name, ingredients, proteinG, kcal`, plus `cookingFor(id)` -> `cookingLine(meta)`, which renders only `totalMin`, `activeMin` and a gear phrase (`"one pan"` at length 1, `"N pans"` above, `"no cooking"` at 0) | `steps`, `seasoning`, `batch`, `keepsDays`, `skill`, `method` |
| `screens/meals/PlanView.tsx` | `t.slot, t.name, t.proteinG, t.kcal`, day totals | everything else |
| `screens/meals/LogSheet.tsx` | `FOODS` chips: `name, serving, proteinG, kcal, id`; templates: `slot, name, proteinG, kcal` | `carbsG`, `fatG` (passed only via `foodId` back-reference in `macrosFor`) |
| `screens/meals/GroceryList.tsx` | `plan.mealPlan.grocery` (category + item strings) | nothing structured; items are free strings |
| `screens/meals/MealsScreen.tsx` | rings from `engine/stats`: `kcalFor`, `proteinFor`, `macrosFor` | - |
| `plan/generator.ts:897` | `buildMealPlan(goal, proteinTargetG, {kcalTraining,kcalRest}, mealsPerDay ?? 4, dietStyle ?? 'omnivore')` | cost, time, gear, allergens, batch |
| `plan/foods.ts:suggestDetail` | `mealAlternatives(target, 1)` -> renders `alt.name` + `alt.ingredients` into a prose `detail` string | the other 2 alts; all cooking meta |

Nothing in `src/` outside `cooking.test.ts` calls `withinActiveMinutes`, `noCookIds` or
`batchableIds`. **The three time and gear filters that J9 needs already exist and are dead
code.** That is the cheapest win in the whole job: they are written, tested, and unwired.

`cookingLine` is the only cooking output that reaches a user, and it renders as e.g.
`"25 min · 5 hands-on · one pan"`. `steps` and `seasoning` (present on 38 of 40 entries, and the
best-written data in the repo) have never been shown to anybody.

### 1.4 Measured coverage, today

Effective candidate pool per `DietStyle` per slot, after `mealAlternatives` applies its
`ALLOWED` cascade (omnivore sees all four diet rungs; pescatarian sees pescatarian +
vegetarian + vegan; vegetarian sees vegetarian + vegan; vegan sees vegan only):

| DietStyle | breakfast | lunch | dinner | snack | late | total meals visible |
|---|---|---|---|---|---|---|
| omnivore | 10 | 19 | 21 | 15 | 5 | 42 |
| pescatarian | 10 | 10 | 10 | 13 | 5 | 29 |
| vegetarian | 10 | 8 | 9 | 11 | 5 | 26 |
| **vegan** | **2** | **5** | **7** | **2** | **2** | **11** |

Raw authored counts by the meal's own `diet` rung (parsed, sums to 42): **vegetarian 15,
omni 13, vegan 11, pescatarian 3**. Note that a naive `grep -c "diet: 'omni'"` returns 14
because the interface declaration line matches; the parsed figure is 13.

**The vegan cliff is the headline defect.** A vegan user asking for a breakfast swap has a
pool of 2. `mealAlternatives` asks for 3, the slot pool is short, so it silently widens to the
whole diet-filtered list and returns dinners and shakes for breakfast. A vegan asking for a
late-night option has a pool of 2, one of which is a shake. Pescatarian has exactly 3 meals
authored at its own rung, so a pescatarian is functionally a vegetarian with tuna.

Macro reach of the whole corpus: protein 15 g to 59 g, kcal 190 to 750. Against R1's targets
this is a real ceiling. A 200 lb (91 kg) muscle-goal user at 1.8 g/kg is 164 g protein; at
3 meals per day the `MEAL_SPLITS[3]` dinner slot is `0.40 x 164 = 65 g` protein, and **no meal
in the corpus reaches 65 g**. The best is `chicken-stirfry` at 59 g. The ranker therefore
always returns an under-target dinner for large users, and `suggestDetail` papers over it with
`" + a side to fill it out"` when the gap exceeds 250 kcal.

Per goal: there is no goal axis at all. `buildMealPlan` takes `goal` and uses it for exactly
one thing, a sentence appended when `goal === 'lean'`. Cutting, bulking and maintenance see an
identical corpus and identical ranking; only the target numbers move.

Per meals-per-day split: `MEAL_SPLITS` divides protein and kcal into 2, 3, 4 or 5 slots. At 5
meals the two snack slots are 15% protein / 14% kcal each. For the 164 g / 2800 kcal user that
is 25 g / 390 kcal, which the snack pool serves adequately. At 2 meals the "anchor" slot is
55% of both, i.e. 90 g protein / 1540 kcal for the same user. **Nothing in the corpus is within
30 g of that.** The 2-meals-per-day path is unserved; it is offered in onboarding and produces
suggestions that are structurally wrong by a factor of 1.5.

Slot mapping gaps: `slotKindOf` maps `'Pre / Post'` to `'snack'` and `'Meal 1'`/`'Meal 2'`
(the 2-meal split's slot names) to **null**, which drops slot filtering entirely for that
split. `'Snack 1'` and `'Snack 2'` map correctly.

Cooking coverage: 40 of 42 meals have `CookingMeta`. **`burger` and `chili` have none**, so
the swap sheet shows those two without the time line that decides whether they happen. Methods:
stovetop 18, no-cook 8, assembly 5, microwave 4, oven 3, blender 2. `activeMin` 1 to 15,
`totalMin` 1 to 45. `batch` present on 12 entries, `keepsDays` on 17, `seasoning` on **38 of 40** (`pbj-milk` and
`cheese-jerky` have none, which is defensible for a PB&J and a cheese plate but must be an
explicit decision once the field becomes required in section 4.1).

### 1.5 The dropped-restriction bug, precisely

`src/types.ts:135` defines:

```ts
export interface FoodLimits {
  dairyFree?: boolean
  /** In their words. Shown to the user, never parsed into a rule. */
  allergies?: string
}
```

`src/screens/onboarding/MealStep.tsx` collects both: a "Dairy free" toggle that stacks on any
of the four diet styles, and a free-text allergy field (free text on purpose, per its own
comment: "A list is always missing somebody's allergy").

`src/screens/onboarding/Onboarding.tsx:142` puts them into the answers object:

```ts
foodLimits: { dairyFree, allergies: allergies.trim() || undefined },
```

`OnboardingAnswers` in `plan/generator.ts:29` **has no `foodLimits` field**. The literal is the
return value of a `useMemo`, so TypeScript's excess-property freshness check is lost through
the call and `tsc` stays silent. `git grep foodLimits src/` returns exactly one hit: the line
that writes it. Nothing reads it, nothing persists it, and no test covers it.

Net effect today: **a user can tell BodyT they are dairy free and have a nut allergy, and the
very next screen can suggest them a Greek yogurt bowl and PB oatmeal.** This is not a
prioritisation call; it is the one defect in the food layer with a safety edge, and it must be
fixed in J9's first commit, before any corpus work.

### 1.6 What is missing versus what the owner asked for

| Owner requirement | Exists today | Where it must go |
|---|---|---|
| cost 1-4 | nothing | new field on the extended meal record |
| active prep + cook minutes | `activeMin`/`totalMin` exist on 40 meals | promote into the ranker, not just the label |
| effort simple vs fancy | `skill` 0/1/2 is close but is difficulty, not effort | derive `effort` from skill + gear count + steps.length |
| batchFriendly | `batch?: string` prose on 12 entries | boolean + yields + keeps_for_days |
| fit-the-remaining-macros | fixed % slots via `MEAL_SPLITS` | new ranker, section 5 |
| batch and leftovers chaining | nothing | section 8 |
| refresh-on-swap | nothing; the sheet computes alts once in a `useMemo` keyed on `[meal, diet]` | section 5.6 |
| no-repeat guard, 3 slots per goal x cost | nothing | section 10 guard tests |
| allergen filtering | nothing (section 1.5) | section 7 |

---

## 2. NUTRITION DATA SOURCES

This is the section where the domain is genuinely million-scale, and it is also the section
where getting the licence wrong could force BodyT to open-source a database it paid to build.
Read 2.3 before writing a line of T21.

### 2.1 Source table

All accessed 2026-08-18 from this session.

| ID | Source | URL | Licence | Scale |
|---|---|---|---|---|
| D1 | USDA FoodData Central, download datasets page | https://fdc.nal.usda.gov/download-datasets/ | (page states none; see D2/D3) | 5 data types, CSV + JSON |
| D2 | FoodData Central on data.gov | https://catalog.data.gov/dataset/fooddata-central | licence field = `https://www.usa.gov/publicdomain/label/1.0/` (US Public Domain) | 5 data types listed |
| D3 | FoodData Central API guide | https://fdc.nal.usda.gov/api-guide/ | "in the public domain and they are not copyrighted", CC0 1.0 Universal; requested citation "U.S. Department of Agriculture, Agricultural Research Service. FoodData Central, 2019. fdc.nal.usda.gov" | 1,000 req/hr per key; DEMO_KEY 30/hr, 50/day |
| D4 | USDA ARS, "Taking a Deep Dive into FoodData Central" | https://www.ars.usda.gov/oc/utm/taking-a-deep-dive-into-fooddata-central/ | - | "hundreds of thousands of foods and tens of millions of nutrient and food-component values" across all types |
| D5 | Open Food Facts homepage | https://world.openfoodfacts.org/ | - | **4,690,154 products** stated on the page, 2026-08-18 |
| D6 | Open Food Facts data page | https://world.openfoodfacts.org/data | Data: ODbL. Individual contents: Database Contents License. Images: **CC BY-SA** | CSV export ~0.9 GB gzipped / ~9 GB uncompressed; MongoDB dump; JSONL; Parquet on Hugging Face; RDF (unmaintained) |
| D7 | Open Food Facts API conditions | https://support.openfoodfacts.org/help/en-gb/12-api-data-reuse/94-are-there-conditions-to-use-the-api | ODbL: attribution + share-alike; custom User-Agent required | 15 req/min read product, 10 req/min search, 2 req/min facets, per IP (per user for mobile apps) |
| D8 | ODbL 1.0 full text | https://opendatacommons.org/licenses/odbl/1-0/ | definitions + s4.3, s4.4, s4.5 | - |
| D9 | Canadian Nutrient File 2015, Health Canada / Open Government Portal | https://open.canada.ca/data/en/dataset/089885f9-ed53-44e6-854a-14d21a1ec2e0 | Open Government Licence - Canada | up to **152 nutrients in over 5,690 foods**; CSV ~2.9 MB zipped |
| D10 | CoFID (McCance and Widdowson's Composition of Foods Integrated Dataset), gov.uk | https://www.gov.uk/government/publications/composition-of-foods-integrated-dataset-cofid | **Open Government Licence v3.0**, Crown copyright | ~**3,300 foods and drinks**; Excel, 4.42 MB; last updated 19 Mar 2021 |
| D11 | AUSNUT 2011-13, Food Standards Australia New Zealand | https://www.foodstandards.gov.au/science-data/food-composition-databases/ausnut | **CC BY 3.0**, commercial use permitted with attribution | **5,740 foods and beverages** |
| D12 | FAO/INFOODS tables and databases | https://www.fao.org/food-composition/tables-and-databases/en | per-table, heterogeneous; many not held by the Secretariat and out of print | a directory of national tables, plus FAO's own AnFood, uPulses etc. |
| D13 | RecipeNLG dataset terms | https://recipenlg.cs.put.poznan.pl/dataset | **non-commercial research and education only** | built on Recipe1M+ (1M+ recipes, 13M images) |
| D14 | Secondary blog analysis of OFF completeness | https://nutrola.app/en/blog/open-nutrition-datasets-compared-usda-openfoodfacts-nutrola | - | claims ~67% of OFF entries have complete macros, <20% have micronutrients beyond sodium. **Blog-sourced, not primary. Treat as directional only, verify against the dump before quoting it anywhere.** |

### 2.2 USDA FoodData Central: the safe backbone

Five data types, each a different quality contract:

- **Foundation Foods** (latest release April 2026). Laboratory-analysed, minimally processed
  foods with extensive metadata and sample provenance. Smallest, highest quality.
- **SR Legacy** (April 2018, final release, never updated again). The classic Standard
  Reference. Still the best single table for generic whole foods: "chicken breast, roasted".
- **FNDDS / Survey Foods** (October 2024, covering the 2021-2023 NHANES cycle). What people
  actually reported eating, including mixed dishes and restaurant items, with portion weights.
  This is the one that has "spaghetti with meat sauce" as a single record with gram weights.
- **Branded Foods** (April 2026 download; API refreshed monthly, downloads every six months).
  Label-transcribed manufacturer data. Large and noisy in the way labels are noisy.
- **Experimental Foods**. Research data, not for consumer lookup.

**Licence: public domain.** data.gov marks it `usa.gov/publicdomain/label/1.0/` [D2] and the
API guide states the data "are in the public domain and they are not copyrighted", published
under CC0 1.0 [D3]. There is no share-alike, no copyleft, no attribution obligation. USDA
*requests* a citation and asks to be told about products using the data; that is courtesy, not
a condition. **FDC can be copied into BodyT's own tables, edited, mixed with anything, and
shipped in a paid app with no licence consequence.** This is the only major source of which
that is true.

**Record counts: USDA does not publish them.** The downloads page, the data-documentation
page, the FAQ, the about page and the data.gov catalog entry all omit per-type counts (checked,
2026-08-18). ARS says only "hundreds of thousands of foods and tens of millions of nutrient and
food-component values" across all types [D4]. **Do not put a per-type count in code comments or
marketing copy from memory.** The correct move for J9/T21 is to download the CSV bundle once and
count `food.csv` rows grouped by `data_type`, then record the number with its release date.
Everything else circulating on the web (including "7,793 SR Legacy foods") is a community
figure with no current primary citation and it goes stale on every release.

API: a free api.data.gov key is required; 1,000 requests per hour per key, and DEMO_KEY is
capped at 30/hour and 50/day, which is why the DEMO_KEY probe from this session returned
`OVER_RATE_LIMIT` [D3]. Four endpoints: `/food/{fdcId}`, `/foods`, `/foods/list`,
`/foods/search`. The key must live behind C1's proxy, never in the PWA bundle.

### 2.3 Open Food Facts: read this before T21 ships

4,690,154 products as of 2026-08-18 [D5], barcode-keyed, crowd-contributed, ~40+ interface
languages, no API key required. It is the only realistic source for "scan the barcode on the
thing in my hand". It is also the one with a licence that can bite.

**The data is ODbL. The images are CC BY-SA.** [D6] Two different copyleft regimes on one
record.

The ODbL 1.0 text draws the line that decides whether BodyT is affected [D8]:

- **Derivative Database**: "a database based upon the Database, and includes any translation,
  adaptation, arrangement, modification, or any other alteration of the Database or of a
  Substantial part of the Contents."
- **Produced Work**: "a work (such as an image, audiovisual material, text, or sounds)
  resulting from using the whole or a Substantial part of the Contents (via a search or other
  query) from this Database, a Derivative Database, or this Database as part of a Collective
  Database."
- s4.4(b): extracting a Substantial part of the Contents into a new database **makes that new
  database a Derivative Database**, and s4.4(a) requires any publicly used Derivative Database
  to be offered under ODbL or a compatible licence.
- s4.5(b): creating a Produced Work from a Derivative Database **does not itself create a
  Derivative Database**. Share-alike does not attach to the Produced Work.
- s4.3: publicly using a Produced Work requires a notice "reasonably calculated" to tell people
  the content came from the Database and that the Database is available under this licence.

Translated into decisions BodyT actually faces:

| What BodyT does | ODbL consequence | Verdict |
|---|---|---|
| User scans a barcode, app queries OFF live, shows "Nutri-Grain bar, 130 kcal, 2 g protein" and logs it to that user's diary | Produced Work. No share-alike on the app or its database [D8 s4.5(b)]. Attribution notice required [D8 s4.3] | **SAFE**, ship it |
| Same, but the fetched record is cached on the user's device to make offline logging work | Arguably still a Produced Work per user, but a device cache of many records starts to look like an Extraction | **SAFE if bounded**: cache only records that user actually looked up, per user, with a size cap and a TTL. Do not pre-seed |
| BodyT downloads the OFF dump and builds a server-side food table from it | Derivative Database under s4.4(b). Publicly using it obliges BodyT to offer that database under ODbL | **DANGEROUS.** Do not do this without a deliberate owner decision to open the resulting table |
| BodyT merges OFF records into `plan/foods.ts` or the extended meal corpus | The merged corpus becomes a Derivative Database. **BodyT's own hand-authored corpus, the actual product asset, gets pulled into ODbL** | **DO NOT.** This is the failure mode. It is one careless import script away |
| BodyT shows an OFF product photo | Images are CC BY-SA, a different licence with its own attribution and share-alike on the image | **AVOID.** Do not render OFF images. It buys nothing and adds a second copyleft |

**The rule for T21, stated as a constraint J9 must respect:** OFF data may enter BodyT only as
a *per-user, per-lookup* value that lands in that user's own food log, with a visible "source:
Open Food Facts (ODbL)" attribution on the entry and in the about screen, and a custom
User-Agent on every request [D7]. It must never touch `FOODS`, `COMMON_MEALS`, or the extended
meal corpus, and no OFF record may be written into any shared/server table. Enforce it with a
structure test: no import from the OFF client module inside `src/plan/`.

Practical limits: 15 req/min for product reads, 10 req/min for search, 2 req/min for facets,
per IP, and per user for mobile apps [D7]. That is fine for barcode scanning and hostile to
search-as-you-type. Debounce search hard, or do not offer OFF text search at all and use FDC
for it.

Quality: crowd-contributed, so coverage is uneven and label transcription errors exist. A
secondary blog analysis claims ~67% of entries carry complete macros and under 20% carry
micronutrients beyond sodium [D14]; that is **not a primary figure** and should be verified
against a dump before anyone repeats it. The design consequence holds regardless: **a lookup
that returns a record with missing protein or missing kcal must fall through to manual entry,
never block logging, and never silently log a zero.**

### 2.4 The national tables

| Source | Foods | Licence | Why BodyT would want it |
|---|---|---|---|
| Canadian Nutrient File 2015 [D9] | 5,690+ foods, up to 152 nutrients | Open Government Licence - Canada (attribution, commercial use fine, **no share-alike**) | Canadian users; strong micronutrient depth |
| CoFID 2021 [D10] | ~3,300 foods and drinks | OGL v3.0, Crown copyright (attribution, commercial use fine, **no share-alike**) | UK users; UK-specific staples and portion conventions |
| AUSNUT 2011-13 [D11] | 5,740 foods and beverages | CC BY 3.0 (attribution, commercial use explicitly permitted, **no share-alike**) | AU/NZ users |
| FAO/INFOODS [D12] | a directory of national tables plus FAO's own compilations | **heterogeneous and per-table**; many tables are not held by FAO and are out of print | Regional coverage where nothing else exists. Every table needs its own licence check |

All three national tables are permissive-with-attribution and **none of them is share-alike**,
which puts them in the same safety class as FDC for BodyT's purposes. They are also all a
fraction of FDC's size and largely overlapping for whole foods.

**Recommendation.** BodyT does not need them today. FDC covers whole foods well enough that a
second generic table adds duplicate ambiguity ("which chicken breast?") for marginal gain. The
honest ranking:

1. **FDC (public domain)** as the nutrient backbone for generic foods and for anything BodyT
   stores in its own tables.
2. **OFF (ODbL, per-lookup only)** for barcodes, strictly fenced per 2.3.
3. **CoFID / CNF / AUSNUT** only if and when localisation becomes a real requirement, added as
   region-tagged overlays with a per-source attribution line, never merged into one table
   without a `source` column.
4. **FAO/INFOODS** only as a lookup of last resort for a region with no national table, and
   only after reading that specific table's terms.

### 2.5 What must not be used

- **RecipeNLG / Recipe1M+**: non-commercial research and education only [D13]. A scraped
  million-recipe corpus is exactly the shortcut somebody will propose for section 6 and it is
  categorically unavailable to a commercial app. **Not a grey area.**
- **Scraped recipe sites generally**: recipe *ingredient lists* are thinly protected, but the
  prose method steps, the headnotes and the photos are ordinary copyrighted text. BodyT's
  `cooking.ts` steps are original writing and must stay that way.
- **Commercial nutrition APIs** (Nutritionix, Edamam, Spoonacular and similar) solve barcode
  and recipe lookup with clean commercial terms and a per-call price. Not evaluated in depth
  here because T21 is scoped to keyless-OFF-first plus FDC. Flag as the escape hatch if the OFF
  fence proves too restrictive in practice.

### 2.6 What R4 does not do

R4 specifies provenance, not values. **No nutrient number in the extended corpus may be typed
from memory.** Section 4's `source_refs` field exists so that every macro line in every new
meal record points at an FDC `fdcId` (or an explicit `HOUSE_ESTIMATE` tag with the arithmetic
shown). The corpus expansion in section 6 is a data-authoring job with a lookup step, not a
writing job.

---

## 3. ADHERENCE KNOWLEDGE

Sources here are tagged [A#]. Evidence in this domain is thinner and more observational than
in R1's macro literature, and I have said so where it is true. Anything without an [A#] tag is
**CRAFT**: my judgement or the repo's existing judgement, offered as a design default and not
as a finding.

### 3.1 Source table

| ID | Source | URL | What was taken |
|---|---|---|---|
| A1 | Dansinger ML et al. / A TO Z and DIRECT adherence analyses; Shai I et al., "Adherence and success in long-term weight loss diets: DIRECT", 2009; Alhassan S et al., A TO Z, Int J Obes 2008 | https://pubmed.ncbi.nlm.nih.gov/19828901/ and https://pubmed.ncbi.nlm.nih.gov/18268511/ | Adherence predicts weight-loss success more strongly than which macronutrient pattern was assigned; DIRECT 24-month compliance 85% overall (90% low-fat, 85% Mediterranean, 78% low-carb) |
| A2 | Wingo BC / MacLean PS commentary as summarised by Healio, "Adherence, not diet type, strong predictor for weight-loss success", 2021 | https://www.healio.com/news/endocrinology/20211202/adherence-not-diet-type-strong-predictor-for-weightloss-success | Multiple dietary pathways work; "adherence to the diet is the best predictor of success". Secondary/trade source, use as framing not as a statistic |
| A3 | Estruch/Downer et al., "Predictors of short- and long-term adherence with a Mediterranean-type diet intervention: PREDIMED", IJBNPA 2016 | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4907003/ | Independent predictors of POORER adherence: more CV risk factors, larger waist, lower physical activity, lower total energy intake, poorer baseline adherence score |
| A4 | Rao M, Afshin A, Singh G, Mozaffarian D, "Do healthier foods and diet patterns cost more than less healthy options? A systematic review and meta-analysis", BMJ Open 2013 | https://pubmed.ncbi.nlm.nih.gov/24309174/ | 27 studies, 10 countries. Healthiest vs least healthy diet patterns: **+$1.48/day (95% CI 1.01 to 1.95)** and **+$1.54 per 2000 kcal (1.15 to 1.94)**, 2013 USD |
| A5 | Raynor HA et al., "Effect of limiting snack food variety on long-term sensory-specific satiety and monotony during obesity treatment", 2006 | https://pubmed.ncbi.nlm.nih.gov/16360618/ | Limiting food-group variety over 8 weeks produced measurable long-term sensory-specific satiety and monotony; the weight-loss advantage did NOT reach significance |
| A6 | Raynor HA, "Dietary Variety: An Overlooked Strategy for Obesity and Chronic Disease Control", Am J Prev Med 2015 | https://www.ajpmonline.org/article/S0749-3797(15)00322-0/abstract | Greater variety of available foods raises total intake; the strategy is narrow variety in energy-dense foods, wide variety in nutrient-dense ones |
| A7 | Mills S et al., "Frequency of eating home cooked meals and potential benefits for diet and health", IJBNPA 2017 (Fenland cohort) | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5561571/ | Eating home-cooked meals more often was associated with greater adherence to DASH and Mediterranean patterns, higher fruit/veg intake and higher plasma vitamin C, adjusted. Cross-sectional |
| A8 | Monsivais P, Aggarwal A, Drewnowski A, "Time spent on home food preparation and indicators of healthy eating", Am J Prev Med 2014 | https://www.sciencedirect.com/science/article/pii/S0749379714004000 | Americans spend ~33 min/day on food preparation and cleanup; time spent on preparation tracks with healthier eating indicators |
| A9 | Ducrot P et al., "Meal planning is associated with food variety, diet quality and body weight status in a large sample of French adults", IJBNPA 2017 (NutriNet-Sante, n=40,554) | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5288891/ | 57% planned meals at least occasionally; meal planners had higher food variety, better guideline adherence, lower obesity odds. **Cross-sectional, association not causation** |
| A10 | Welch N et al. / European adult barrier surveys as summarised in "Exploring the relationship between perceived barriers to healthy eating and dietary behaviours in European adults", 2018 | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6060804/ | Lack of time is the leading self-reported barrier to adopting dietary guidance; time pressure reported as a barrier by a large minority of respondents |

### 3.2 What the evidence actually supports

**1. The plan that gets followed beats the plan that is optimal.** Adherence predicts outcome
more strongly than macronutrient composition does [A1, A2]. This is the single most
consequential fact for J9 and it argues directly against a ranker that maximises macro fit and
ignores everything else. **Design consequence: macro fit is a filter and a term, not the whole
objective function.**

**2. Cost is a real and quantified barrier.** Healthier diet patterns cost about $1.48 more per
day, or $1.54 per 2000 kcal, than the least healthy patterns, pooled across 27 studies in 10
countries [A4]. That is a small number in absolute terms and a large one for somebody on a tight
budget: roughly $45/month, or $540/year, for one person. **Design consequence: cost tiers must
be anchored to a real per-serving figure, not to vibes (section 4.2). And a cost ceiling must be
a hard filter, because a suggestion the user cannot afford is not a suggestion.**

**3. Time is the leading self-reported barrier.** Lack of time is the barrier European adults
name first [A10]; Americans spend about 33 minutes a day on all food preparation and cleanup
combined [A8]. **Design consequence: 33 min/day across every meal is the realistic denominator.
`cooking.ts` already gets this right by splitting active from total minutes, and its comment
("forty minutes of oven with five minutes of hands-on is a weeknight meal; twenty minutes of
constant stirring is not") is the correct rule. The ranker must filter on active minutes and
budget the day's total active minutes, not per-meal minutes in isolation.**

**4. Cooking at home and planning ahead both correlate with better diet quality**, home cooking
with DASH/Mediterranean adherence and fruit-and-veg intake [A7], meal planning with food
variety, guideline adherence and lower obesity odds in 40,554 adults [A9]. **Both are
cross-sectional.** People who cook and plan differ from people who do not in many ways. The
honest claim is "planning is associated with the behaviours we want", not "planning causes
them". **Design consequence: the grocery list and the batch chain are worth building, and
BodyT must not claim they cause results.**

**5. Variety cuts both ways, and the direction depends on the food.** More variety of available
foods raises total intake, which helps a bulk and hurts a cut [A6]. Restricting variety produces
real, measurable monotony and sensory-specific satiety over 8 weeks, but the trials did **not**
show a significant weight-loss benefit from restricting it [A5]. So: narrow variety in
energy-dense foods, wide variety in nutrient-dense ones [A6]. **Design consequence: the
recent-variety penalty in section 5 should be goal-aware. On a cut, mild repetition of a small
set of high-satiety staples is defensible and honest; on a bulk, variety is a feature. Neither
direction is strongly evidenced, so the penalty weight should be small and tunable, not a
dominant term.**

**6. Who struggles is partly predictable.** In PREDIMED, poorer adherence was independently
predicted by lower physical activity, larger waist, more CV risk factors, lower total energy
intake and a poorer baseline adherence score [A3]. Lower prescribed energy intake predicting
worse adherence is the uncomfortable one: **the tighter the cut, the more likely it is
abandoned.** This corroborates R1 section 4.1's preference for slower rate bands from a
completely different direction.

### 3.3 What is CRAFT, stated as such

None of the following is evidenced. All of it is judgement, and it is where most of the actual
product lives. Marked so that a future session can overturn any of it without arguing with a
citation that does not exist.

- **CRAFT: three options is the right size for a swap sheet.** One reads as a command, two as a
  binary, five as homework. The repo already defaults `mealAlternatives` to 3 and the sheet
  renders 3. Keep it, and make "three distinct options must exist for every reachable state" a
  guard test rather than a hope (section 10).
- **CRAFT: seasoning is adherence, not garnish.** `cooking.ts` says this in its header comment
  and it is right, and there is no trial for it. Every new corpus entry needs a seasoning line
  for the same reason, and the field should become required rather than optional.
- **CRAFT: the honest answer is sometimes "eat the same thing again".** A ranker that never
  repeats is a ranker that eventually recommends something the user will not cook. The repeat
  penalty must be a penalty, never a hard exclusion, and there must be at least one eval case
  (section 9, case 15) where the correct output is the meal they had yesterday.
- **CRAFT: effort and skill are different axes.** `skill` in `cooking.ts` measures how easy it
  is to ruin. `effort` measures how much of you it takes. A 45-minute tray bake is skill 0 and
  effort simple. A 15-minute stir-fry with three things finishing at once is skill 2 and effort
  fancy. The owner asked for effort; the repo has skill; section 4 derives one from the other
  plus gear count and step count.
- **CRAFT: a cost tier must mean money, not stars.** "Tier 2" is meaningless to a user and
  unfalsifiable to a reviewer. Section 4.2 attaches a per-serving band in currency.
- **CRAFT: leftovers are the highest-leverage unbuilt feature in the food layer.** One cook
  session that feeds three meals converts a 25-minute meal into three 3-minute meals in the
  time budget. Nothing in the adherence literature measures this; the arithmetic is
  self-evident and it is why section 8 exists.
- **CRAFT: never show a plan the user cannot execute today.** If the filters (diet + allergens
  + cost ceiling + time budget) leave fewer than 3 candidates, the correct behaviour is to relax
  a named axis and **say which one was relaxed**, not to silently widen the pool the way
  `mealAlternatives` does today. Silent widening is how a vegan gets shown a dinner at breakfast.

---

## 4. EXTENDED MEAL RECORD

### 4.1 The shape

One record, reconciling `CommonMeal` and `CookingMeta` into a single typed entry. It lives in
`plan/` (constants and rule data, per the layering law) and is the thing the ranker in section 5
reads. `CommonMeal` stays as a narrowing view for backward compatibility during the migration,
then goes away.

```ts
// plan/mealCorpus.ts  (new file; mealAlts.ts becomes a thin re-export during migration)

export type CostTier = 1 | 2 | 3 | 4
export type Effort = 'simple' | 'fancy'
export type DietTag = 'omni' | 'pescatarian' | 'vegetarian' | 'vegan'
export type AllergenTag =
  | 'milk' | 'egg' | 'peanut' | 'tree-nut' | 'soy' | 'wheat' | 'gluten'
  | 'fish' | 'shellfish' | 'sesame'

export interface MacroProfile {
  proteinG: number
  carbsG: number      // NEW, non-optional. See 1.2: the corpus has no carbs today
  fatG: number        // NEW, non-optional
  kcal: number
  fibreG?: number     // R1 s5.5 wants a fibre floor; optional until the corpus carries it
}

export interface SourceRef {
  /** 'fdc' = a FoodData Central fdcId. 'house' = derived, arithmetic shown in note. */
  kind: 'fdc' | 'house'
  id?: string                 // fdcId when kind === 'fdc'
  dataType?: 'foundation' | 'sr-legacy' | 'fndds' | 'branded'
  note?: string               // required when kind === 'house'
}

export interface MealRecord {
  id: string
  name: string
  /** Plain shopping words. Unchanged from CommonMeal. */
  ingredients: string[]
  /** Normalised ingredient keys for the grocery list and the allergen filter. */
  ingredientKeys: string[]

  macros: MacroProfile
  /** Per one serving as described by `ingredients`. */
  servings: number            // usually 1; >1 for a tray bake authored at batch size

  slots: MealSlotKind[]       // 'breakfast'|'lunch'|'dinner'|'snack'|'late', unchanged
  diet: DietTag               // strictest eater this suits, unchanged semantics
  allergenTags: AllergenTag[] // what it CONTAINS. Empty array is a claim, not a default

  costTier: CostTier          // 1..4, meaning in 4.2
  activeMinutes: number       // hands-on. The number that decides whether it happens
  totalMinutes: number        // start to eating
  effort: Effort              // derived, rule in 4.3
  skill: 0 | 1 | 2            // unchanged from CookingMeta

  batchFriendly: boolean
  /** Servings produced when cooked at batch size. Absent when batchFriendly is false. */
  batchYields?: number
  /** Days it keeps in the fridge, cooked. Absent = eat fresh. */
  keepsForDays?: number
  /** What the leftovers become. See section 8.3. */
  chainsTo?: string[]         // MealRecord ids reachable from this one's leftovers

  gearRequired: CookGear[]    // unchanged vocabulary
  method: CookMethod          // unchanged vocabulary

  steps: string[]             // longest thing first, unchanged rule
  seasoning: string           // NOW REQUIRED. See 3.3
  batchNote?: string          // the prose that `CookingMeta.batch` holds today

  sourceRefs: SourceRef[]     // one per macro-bearing ingredient. Never empty
}
```

Migration is mechanical for the 40 meals that have both halves: `CommonMeal` fields plus
`COOKING[id]` fields, minus the two orphans (`burger`, `chili`) which need `CookingMeta`
written, plus four genuinely new fields per meal that a human must supply: `carbsG`, `fatG`,
`costTier`, `allergenTags`, and `sourceRefs`. **That is the real cost of the migration: 42
meals x 5 hand-supplied facts, each of which needs an FDC lookup for the macro half.** Budget
it honestly rather than pretending the merge is free.

### 4.2 cost_tier with real money meaning

A tier is a *per-serving ingredient cost band*, at a mainstream supermarket, for one serving as
the record describes it. Anchored to the Rao meta-analysis finding that the gap between the
healthiest and least healthy diet patterns is about $1.54 per 2000 kcal [A4], which means a
meal-level spread of roughly a dollar is the real decision range, not ten dollars.

| Tier | Per-serving ingredient cost | Label the user sees | Typical content |
|---|---|---|---|
| 1 | under $2.00 | "Cheap" | eggs, oats, rice, dried lentils, canned beans, frozen veg, peanut butter, in-season fruit |
| 2 | $2.00 to $3.50 | "Everyday" | chicken thigh, tinned tuna, tofu, pasta with jarred sauce, Greek yogurt, deli turkey |
| 3 | $3.50 to $6.00 | "Treat" | chicken breast, lean beef mince, tempeh, protein powder servings, most rotisserie plates |
| 4 | over $6.00 | "Splurge" | salmon, steak, shrimp, most prepared/convenience proteins |

**Honesty requirements, all of them mandatory:**

- The dollar figures are **2026 US mainstream-supermarket estimates and they are HOUSE, not
  sourced.** Grocery prices vary by country, city and week by more than the width of these
  bands. The tier is a *ranking*, and it is stable (salmon outranks lentils everywhere); the
  dollar band is an *illustration*.
- The user-visible copy shows the label and, at most, the band, never a computed total. BodyT
  must not tell anybody their week costs $87.40.
- `costTier` is authored per record, once, by a human, and never computed at runtime from an
  ingredient price table BodyT does not have.
- **CRAFT:** the four labels above ("Cheap / Everyday / Treat / Splurge") are placeholder copy
  and need the owner's voice pass before shipping.

### 4.3 effort, derived not authored

`effort` is a pure function of three fields already present, so it cannot drift out of sync:

```
effort = 'fancy' if any of:
    skill === 2                              // two things finishing at once
    gearRequired (excluding 'none').length >= 3
    steps.length >= 6
    activeMinutes > 20
otherwise 'simple'
```

Checked against today's data, this yields a sane split: the 8 no-cook and 5 assembly entries are
all simple; the three skill-2 entries become fancy; nothing in the current corpus exceeds
`activeMinutes` 15, so the active-minutes clause only bites on new records. **Derive it in code,
assert it in the guard test, do not store it in the data.**

### 4.4 The reconciliation rules

| Conflict | Rule |
|---|---|
| `CommonMeal.proteinG` vs a new FDC lookup | FDC wins. Record the `fdcId`. Where the old number was materially different, that is a data fix, not a rounding change |
| `CookingMeta.batch` prose present but `batchFriendly` absent | `batchFriendly = (batchNote !== undefined)` for the migration, then a human confirms and supplies `batchYields` |
| `keepsDays` absent | means "eat fresh", not "unknown". Migration must not turn absent into a default number |
| Meal with no `COOKING` entry (`burger`, `chili`) | blocks the migration. Write the two entries first |
| `allergenTags` empty | is an affirmative claim that the meal contains none of the ten. It must be reviewed per record, never defaulted by the migration script |
| `sourceRefs` empty | invalid. The guard test fails the build |

### 4.5 How leftovers chain

`chainsTo` is the field that makes batch cooking real rather than a note in prose. Semantics:

- A record with `batchFriendly: true` and `batchYields: n` produces `n` servings from one cook
  session with `activeMinutes` paid **once**.
- Servings 2..n are *leftover servings*. A leftover serving has `activeMinutes` replaced by a
  reheat cost (**CRAFT: 3 minutes, flat**) and `totalMinutes` by the same, and keeps the same
  macros, cost, diet and allergen tags.
- Leftover servings are valid for any slot in the parent's `slots`, and additionally for
  `'lunch'` (**CRAFT: cold leftovers are the canonical next-day lunch**).
- `chainsTo` names records that the leftovers can *become* with a small addition, distinct from
  simply reheating: `chicken-rice` chains to a `chicken-burrito-bowl` (add a tortilla and
  salsa), `lentil-soup` chains to a `lentil-pasta-sauce`. A chained record is a separate
  `MealRecord` with its own macros; the chain edge only asserts that its main protein component
  is already cooked, so its `activeMinutes` may be quoted at the chained (lower) figure when
  the parent was cooked within `keepsForDays`.
- Chains are one hop. **No transitive chaining**, because two-hop chains are how a plan starts
  telling somebody to eat five-day-old chicken. The guard test asserts `chainsTo` targets have
  no `chainsTo` of their own, or that the ranker never follows a second hop.
- `keepsForDays` is a hard bound on the chain. A chain edge whose parent has
  `keepsForDays === undefined` is invalid.

The state carried between days for this to work is small and belongs in the store, not the plan:

```ts
interface LeftoverStock {
  mealId: string
  servingsRemaining: number
  cookedOn: ISODate      // chain expires at cookedOn + keepsForDays
}
```

---

## 5. FIT-THE-REMAINING-MACROS ALGORITHM

Replaces the fixed-percentage `MEAL_SPLITS` allocation for *suggestion*. `MEAL_SPLITS` stays as
the initial plan skeleton (it is what makes a printable plan possible); the ranker is what
answers "it is 8pm, I have 900 kcal and 60 g protein left, what do I eat".

Requirements: fast, deterministic, explainable in one sentence.

### 5.1 Input

```ts
interface FitRequest {
  remaining: { kcal: number; proteinG: number; carbsG: number; fatG: number }
  slot: MealSlotKind            // from slotKindOf, or inferred from clock time
  diet: DietStyle
  excludeAllergens: AllergenTag[]
  costCeiling: CostTier         // 1..4; 4 = no ceiling
  activeMinutesBudget: number   // what they have RIGHT NOW, not the day's total
  recentMealIds: string[]       // last 14 eaten/suggested, most recent first
  leftoverStock: LeftoverStock[]
  count: number                 // 3
  seed: string                  // the date + slot; makes refresh deterministic. See 5.6
}
```

### 5.2 Hard filters, applied in this order

Order matters only for the diagnostic (which filter emptied the pool), never for the result.

1. **Allergen.** `record.allergenTags` and `excludeAllergens` must not intersect. **Never relaxable.**
2. **Diet.** `ALLOWED[diet].includes(record.diet)`, the existing cascade in `mealAlts.ts`. Never
   relaxable.
3. **Slot.** `record.slots.includes(slot)`, or the record is a leftover serving of something
   whose parent slots include it (section 4.5). Relaxable, last.
4. **Cost.** `record.costTier <= costCeiling`. Relaxable, second.
5. **Time.** `effectiveActiveMinutes(record) <= activeMinutesBudget`, where a leftover serving
   uses the reheat cost. Relaxable, first (**CRAFT:** time is the axis a user can most easily
   choose to spend more of, and the copy can ask).
6. **Macro sanity.** `record.macros.kcal <= remaining.kcal * 1.25`. A meal 25% over the
   remaining budget is a defensible "slightly over"; 60% over is a wrong answer. **HOUSE.**

If fewer than `count` records survive, relax in the order time -> cost -> slot, one axis at a
time, and **return which axis was relaxed** so the copy can say "nothing fits 15 minutes, here
is what 25 gets you". Never widen silently (contrast with `mealAlternatives` today).

### 5.3 Scoring

Lower is better. Every term is a normalised fraction, so weights are comparable and tunable.

```
fit(r) =  W_PROTEIN * |r.proteinG - remaining.proteinG| / max(remaining.proteinG, 20)
        + W_KCAL    * |r.kcal     - remaining.kcal|     / max(remaining.kcal, 200)
        + W_CARB    * |r.carbsG   - remaining.carbsG|   / max(remaining.carbsG, 30)
        + W_FAT     * |r.fatG     - remaining.fatG|     / max(remaining.fatG, 15)

penalty(r) = W_REPEAT * repeatPenalty(r.id, recentMealIds)
           + W_TIME   * max(0, effectiveActiveMinutes(r) - comfortMinutes) / max(comfortMinutes, 5)
           + W_COST   * max(0, r.costTier - costComfort) / 3
           + W_EFFORT * (r.effort === 'fancy' ? 1 : 0)

bonus(r)   = W_LEFTOVER * (isLeftoverServing(r) ? 1 : 0)
           + W_BATCH    * (goalWantsBatch && r.batchFriendly ? 1 : 0)

score(r) = fit(r) + penalty(r) - bonus(r)
```

`repeatPenalty(id, recent)`: `1.0` if eaten today, `0.6` if within the last 2 days, `0.3`
within 7, `0` beyond. Uses position in `recentMealIds`, so it is O(1) per record with a prefix
map. **Never infinite**: repeating is allowed, just discouraged (3.3).

Starting weights. All **HOUSE**, all tunable, and the eval fixtures in section 9 are how they
get tuned:

| Weight | Value | Why |
|---|---|---|
| `W_PROTEIN` | 1.5 | the number the plan rides on; matches the 1.5 factor already in `mealAlternatives` |
| `W_KCAL` | 1.0 | the ceiling |
| `W_CARB` | 0.4 | remainder macro per R1 s5.3; matters, but not equally |
| `W_FAT` | 0.4 | has a floor (R1 s5.2) not a target, so distance matters less |
| `W_REPEAT` | 0.35 | deliberately small; see 3.2 point 5 |
| `W_TIME` | 0.5 | leading self-reported barrier [A10] |
| `W_COST` | 0.4 | quantified barrier [A4] |
| `W_EFFORT` | 0.15 | a nudge, not a veto |
| `W_LEFTOVER` | 0.5 | strong: it is already cooked and paid for |
| `W_BATCH` | 0.25 | applied only on a batch-cook day (section 8.2) |

Goal modulation, the only place `goal` enters, and the only place it enters today's code at all:

- `lean` (cut): `W_KCAL` 1.0 -> **1.4** (the ceiling is the point), `W_REPEAT` 0.35 -> **0.25**
  (narrow variety in energy-dense foods is defensible on a cut [A6]).
- `muscle` (bulk): `W_KCAL` 1.0 -> **0.8**, `W_REPEAT` 0.35 -> **0.45** (variety raises intake
  [A6], which is the goal here).
- `strength`, `general`, `vertical`, `speed`, `endurance`: defaults.

### 5.4 Tie-breaks

Deterministic, in order. No randomness anywhere in the ranking.

1. lower `score` (rounded to 4 decimal places, so float noise cannot flip an order)
2. lower `costTier`
3. lower `effectiveActiveMinutes`
4. `id.localeCompare(otherId)` (the existing tie-break in `mealAlternatives`; keep it)

### 5.5 Diversity of the returned set

Ranking alone will hand back three chicken-and-rice variants. After scoring, select greedily:

- take the best-scoring record;
- for each subsequent pick, skip any record sharing the **primary protein key** with an
  already-picked one, until `count` are chosen;
- if that exhausts the pool, fall back to plain score order and mark the result
  `diversityRelaxed: true`.

`primaryProteinKey` is the first entry of `ingredientKeys` that resolves to a `FoodDef` with
`category === 'protein'`. This is what makes "no meal appears twice in one swap sheet" a
guarantee about *the plate*, not just about the id.

### 5.6 Refresh on swap, and why it needs a seed

Today `MealDetailSheet` computes `alts` in a `useMemo` keyed `[meal, diet]`, so the same three
options appear forever. Refresh means: same request, next-best three, deterministically.

```
rank(request) -> ordered list
page = hash(request.seed) is NOT used to shuffle; refresh advances an OFFSET
offset 0 -> results 1..3
offset 1 -> results 4..6, with the diversity rule reapplied within the new window
wraps to 0 when the pool is exhausted
```

The offset lives in component state, the ordering is pure. So the sheet is refreshable, the
engine is deterministic, and the same user on the same day with the same remaining macros and
the same offset always sees the same three. **This is what makes the fixtures in section 9
testable at all**; a shuffled ranker cannot be regression-tested.

### 5.7 Explaining it in one sentence

The template is filled from the top scoring term, not from a summary of all of them.

- macro-led: `"{name}: {protein}g protein and {kcal} kcal, which is about what you have left."`
- time-led: `"{name}: {activeMin} minutes hands-on, which is what you said you had."`
- leftover-led: `"{name}: already in the fridge from {weekday}, {reheatMin} minutes to reheat."`
- cost-led: `"{name}: cheapest thing that still gets you to {protein}g."`
- relaxed: `"Nothing fit {budget} minutes, so this is what {relaxedBudget} gets you."`

No em dashes. Suggest-only voice. Never states a total cost in money.

### 5.8 Cost

Pool is ~200 records after section 6. Filters are O(n) with set lookups, scoring is O(n)
arithmetic, diversity selection is O(n * count). At n = 200 this is sub-millisecond and needs
no memoisation beyond what React already does. **No index, no precomputation, no bucketing.**
If the corpus ever reaches thousands, bucket by `(diet, slot)` first; not before.

---

## 6. CORPUS EXPANSION PLAN

### 6.1 The coverage guarantee, stated as a testable predicate

The owner's requirement, made precise. Define:

- `timeTier(r)` = `quick` if `activeMinutes <= 10`, `medium` if `<= 25`, `long` otherwise.
- `goalBand(r)`: `cut` if `proteinG / kcal >= 0.09` **and** `kcal <= 650`; `bulk` if
  `kcal >= 450`; `maintain` always. **These bands overlap on purpose.** A 550 kcal / 55 g meal
  is in all three. Goal is not a partition of the corpus, it is a re-weighting (5.3) plus a
  soft band.

**GUARANTEE G.** For every combination of
`dietStyle` (4) x `slot` (5) x `costCeiling` in {1,2,3,4} x `timeBudget` in {10, 25, 60} x
`goalBand` (3), the hard filters of 5.2 leave **at least 3 records with distinct
`primaryProteinKey`**, with no allergens excluded.

That is 4 x 5 x 4 x 3 x 3 = **720 cells**. Because cost is a *ceiling*, time is a *budget*, and
the diet cascade is *inclusive*, coverage is cumulative: a record that is vegan, cost tier 1,
quick and in all three goal bands satisfies its slot's cell for all 4 diet styles, all 4 cost
ceilings and all 3 time budgets at once, i.e. 48 cells from one record.

**So the binding constraint is small and nameable: the 15 tight-corner cells**
(5 slots x 3 goal bands) at `vegan / costTier 1 / quick`, each needing 3 distinct-protein
records. **45 records at the tight corner satisfy all 720 cells**, and with goal-band overlap
the true figure is lower still. The rest of the corpus exists for quality, not for coverage.

**GUARANTEE H (no repeats in a sheet).** Any single `rank()` call returns `count` records with
pairwise-distinct `id` **and** pairwise-distinct `primaryProteinKey`, or sets
`diversityRelaxed: true` and says so in the copy.

Both guarantees are guard tests (section 10), and both must be written **before** any corpus
authoring, so they fail loudly against today's 42 and turn green as waves land.

### 6.2 Today versus target

Record counts by the meal's own `diet` rung (a record may sit in several slots, so the slot
columns sum higher than the record column).

**Today (parsed from `mealAlts.ts`):**

| diet rung | records | breakfast | lunch | dinner | snack | late |
|---|---|---|---|---|---|---|
| vegan | 11 | 2 | 5 | 7 | 2 | 2 |
| vegetarian | 15 | 8 | 3 | 2 | 9 | 3 |
| pescatarian | 3 | 0 | 2 | 1 | 2 | 0 |
| omni | 13 | 0 | 9 | 11 | 2 | 0 |
| **total** | **42** | **10** | **19** | **21** | **15** | **5** |

**Target:**

| diet rung | records | breakfast | lunch | dinner | snack | late |
|---|---|---|---|---|---|---|
| vegan | 60 | 14 | 22 | 24 | 18 | 10 |
| vegetarian | 50 | 20 | 16 | 16 | 18 | 10 |
| pescatarian | 30 | 4 | 14 | 16 | 8 | 3 |
| omni | 60 | 10 | 26 | 32 | 12 | 4 |
| **total** | **200** | **48** | **78** | **88** | **56** | **27** |

**Gap: 158 new records** (42 -> 200), plus 42 migrations, plus 2 missing `CookingMeta`.

Effective pool each diet style sees, after the cascade:

| DietStyle | today, total | target, total | today, dinner | target, dinner | today, late | target, late |
|---|---|---|---|---|---|---|
| omnivore | 42 | 200 | 21 | 88 | 5 | 27 |
| pescatarian | 29 | 140 | 10 | 56 | 5 | 23 |
| vegetarian | 26 | 110 | 9 | 40 | 5 | 20 |
| **vegan** | **11** | **60** | **7** | **24** | **2** | **10** |

**Why vegan gets the largest single allocation (60) despite being the smallest user segment:**
every vegan record is visible to all four diet styles, so it is the only rung with 4x leverage.
Authoring at the strictest honest rung is both the cheapest way to satisfy Guarantee G and the
fix for the cliff in 1.4.

Cost-tier distribution target, across the whole 200 (**HOUSE**, chosen so a cost-1 ceiling is
never a dead end):

| Cost tier | share | records | rationale |
|---|---|---|---|
| 1 (under $2) | 35% | 70 | must alone satisfy Guarantee G at every slot |
| 2 ($2-3.50) | 35% | 70 | the everyday default |
| 3 ($3.50-6) | 22% | 44 | |
| 4 (over $6) | 8% | 16 | salmon/steak/shrimp; a garnish on the corpus, not a third of it |

Time-tier target: **quick (<=10 active min) 45%, medium (11-25) 40%, long (>25) 15%.** Today's
corpus is almost entirely quick and medium (`activeMin` maxes at 15), so the long tier is
entirely new and is where the batch-cook and tray-bake records live.

### 6.3 Staged waves with acceptance gates

Each wave is a shippable increment with a gate that must pass before the next starts. **No wave
ships without the ship ritual** (`npx tsc -b`, `npx vitest run`, `npm run build`, playwright,
push, bundle-hash check, 390px screenshots).

**Wave 0: guards and the bug. No corpus work.**
- Fix section 1.5: add `foodLimits` to `OnboardingAnswers`, thread it into `buildMealPlan` and
  the ranker, persist it on `PlanConfig`.
- Write Guarantee G and Guarantee H as tests. **They must fail**, and the failure output must
  name the empty cells.
- Write `CookingMeta` for `burger` and `chili`.
- Gate: G and H fail with a readable cell list; every other test green; the allergy field
  reaches the plan and a test proves it.

**Wave 1: the type migration. Still 42 meals.**
- `plan/mealCorpus.ts` with `MealRecord`; migrate all 42; `mealAlts.ts` becomes a compatibility
  shim exporting `CommonMeal` views.
- Every record gains `carbsG`, `fatG`, `costTier`, `allergenTags`, `sourceRefs`. **Every macro
  number gets an FDC lookup** (section 2.6). This is the slow wave and it is unavoidable.
- Gate: `sourceRefs` non-empty on all 42; `macrosFor` coverage no longer drops when a swap is
  taken (a test that takes a swap and asserts `coverage === 1`); derived `effort` matches the
  rule in 4.3 for all 42; structure test file allowances still shrink-only.

**Wave 2: the tight corner. +45 records.**
- Author the 45 records that satisfy Guarantee G: vegan, cost tier 1, quick, spread across the
  5 slots and the 3 goal bands.
- Gate: **Guarantee G turns green.** Guarantee H green. Vegan breakfast pool >= 3 at every cost
  ceiling and time budget.

**Wave 3: depth where people eat. +60 records.**
- Omni dinner (13 -> 32 slot-memberships), omni lunch, vegetarian lunch and dinner (the two
  cells at 3 and 2 today), pescatarian across the board (3 records is not a diet style).
- Gate: no `(dietStyle, slot)` effective pool below 8; the protein ceiling issue in 1.4 closed
  (at least 3 records per diet style reaching 65 g protein, so the 2-meals-per-day and
  large-user cases stop being structurally under-served).

**Wave 4: batch, leftovers, long tier. +35 records, plus chains.**
- The `long` time tier: tray bakes, one-pot batches, slow-cooker records with
  `batchYields >= 4`.
- `chainsTo` edges authored across the corpus; `LeftoverStock` in the store; section 8 logic.
- Gate: every `batchFriendly` record has `batchYields` and `keepsForDays`; no chain is longer
  than one hop; a Sunday-batch fixture (section 9, case 13) produces a week whose total active
  minutes fall by at least 30% versus the same week cooked fresh.

**Wave 5: fill to 200. +18 records, plus polish.**
- Whatever the coverage report still names as thin.
- Gate: 200 records; cost-tier and time-tier distributions within 5 points of 6.2; G and H
  green; the coverage report is a committed artifact so the next session does not re-derive it.

**Total: 158 new records across four authoring waves.** At a realistic 6 to 10 records per
session with FDC lookups, that is 16 to 26 sessions of authoring. **Say that out loud in
BODYT_STATE.md rather than letting J9 be marked done at wave 2.**

---

## 7. ALLERGEN AND RESTRICTION HANDLING

### 7.1 The vocabulary

Two regulatory lists exist and they do not match.

- **US FDA, 9 major food allergens** [E1]: milk, eggs, fish, crustacean shellfish, tree nuts,
  peanuts, wheat, soybeans, **sesame** (added by the FASTER Act, signed 23 Apr 2021, effective
  1 Jan 2023).
- **EU, 14 substances** under Regulation (EU) No 1169/2011 [E2]: cereals containing gluten,
  crustaceans, eggs, fish, peanuts, soybeans, milk, tree nuts, celery, mustard, sesame,
  sulphur dioxide and sulphites, lupin, molluscs.

| ID | Source | URL |
|---|---|---|
| E1 | FDA, "FASTER Act: Sesame as the ninth major food allergen" | https://www.fda.gov/food/food-allergies/faster-act-sesame-ninth-major-food-allergen |
| E2 | EU Regulation (EU) No 1169/2011 allergen annex, as summarised by the European Commission | https://food.ec.europa.eu/food-safety/campaign-2026/allergies_en |

**BodyT ships the FDA 9 plus `gluten` as a separate tag from `wheat`.** Ten tags:

```
'milk' | 'egg' | 'peanut' | 'tree-nut' | 'soy' | 'wheat' | 'gluten'
      | 'fish' | 'shellfish' | 'sesame'
```

Rationale, all **CRAFT**: the FDA 9 is the smallest list that covers the overwhelming majority
of real user allergies; `gluten` is separated from `wheat` because coeliac disease and wheat
allergy are different conditions with different safe foods (oats, barley, rye), and because
"gluten free" is the phrase users type. The four EU-only entries (celery, mustard, sulphites,
lupin, molluscs) are deferred until BodyT has EU users who ask, and their absence should be
stated in the app's own copy rather than pretended away.

`allergenTags` records **what the meal contains**, never what it avoids. An empty array is an
affirmative claim reviewed per record (4.4), not a migration default.

### 7.2 Mapping the two collected signals onto filters

Today both signals are collected and dropped (1.5). The mapping:

**`dairyFree: boolean`** is unambiguous. It maps to `excludeAllergens += ['milk']`. It stacks on
any of the four diet styles, exactly as `types.ts` already says it should. A dairy-free
omnivore is a real and common user and BodyT already knows how to represent them; it just does
not carry the flag anywhere.

**`allergies: string`** is free text, and `types.ts` currently says "Shown to the user, never
parsed into a rule". That comment must change, because a restriction that is only displayed is
a restriction the engine violates. The correct treatment, in order:

1. **Normalise and match** against a synonym table, in `plan/` alongside the tag vocabulary:

```
peanut    <- "peanut", "peanuts", "groundnut", "pb"
tree-nut  <- "tree nut", "nuts", "almond", "walnut", "cashew", "pecan",
             "pistachio", "hazelnut", "macadamia", "brazil nut"
milk      <- "milk", "dairy", "lactose", "lactose intolerant", "casein", "whey", "cheese"
egg       <- "egg", "eggs"
soy       <- "soy", "soya", "soybean", "tofu", "edamame"
wheat     <- "wheat"
gluten    <- "gluten", "coeliac", "celiac"
fish      <- "fish", "salmon", "tuna", "cod", "tilapia"
shellfish <- "shellfish", "shrimp", "prawn", "crab", "lobster", "scallop"
sesame    <- "sesame", "tahini"
```

Matching is case-insensitive, on word boundaries, over comma/`and`/newline-split fragments.
`"nuts"` maps to `tree-nut` **and** `peanut`, because a user who writes "nuts" and gets peanut
butter has been failed. **CRAFT, and deliberately over-inclusive: false positives cost variety,
false negatives cost a hospital visit.**

2. **Confirm, do not assume.** The matched tags are shown back as chips with the user's own
words beside them: "You said 'nuts'. I will avoid peanuts and tree nuts." One tap to correct.
This satisfies suggest-only and gives the user the veto.

3. **Preserve the unmatched remainder verbatim.** Anything the table did not match stays in
`allergies` and is shown on the plan and the grocery list as a standing note: "You told me:
'nightshades'. I cannot filter for that automatically, so check the ingredients." **Never
silently discard the tail, and never claim to have handled it.** This is the honest version of
"every chip list is missing somebody's allergy" and it keeps that comment's spirit while making
the matched part real.

Storage: `FoodLimits` gains a derived, editable field.

```ts
export interface FoodLimits {
  dairyFree?: boolean
  /** In their words. Always preserved and always shown. */
  allergies?: string
  /** Derived from `allergies` + `dairyFree`, user-confirmed, user-editable. */
  excludeAllergens?: AllergenTag[]
  /** Fragments of `allergies` no tag matched. Shown as a standing caution. */
  unmatchedNotes?: string[]
}
```

### 7.3 The never-appears rule

**A filtered ingredient never appears in a suggestion, a swap sheet, a generated `detail`
string, a grocery list, or a batch chain.** Concretely, four places today would leak it:

| Leak site | Today | Fix |
|---|---|---|
| `mealAlternatives` | no allergen filter | hard filter 1 in 5.2, never relaxable |
| `foods.ts:suggestDetail` | calls `mealAlternatives(..., 1)` with no limits, then writes the ingredient list into `MealTemplateDef.detail`, which is persisted | pass limits through; a generated `detail` is a suggestion and obeys the same filter |
| `buildMealPlan` grocery block | hardcoded string arrays branched on `dietStyle` only. The vegetarian branch lists "Greek yogurt or skyr" and "Cottage cheese"; the omnivore branch lists both plus eggs | derive the grocery list from the selected records' `ingredientKeys` (section 8), so filtering happens once, upstream |
| `LATE_NIGHT.yes` | `['Casein shake', 'Cottage cheese', 'Protein pudding', 'Greek yogurt']`, all four contain milk, shown to every user unconditionally | tag each entry and filter |

Guard test: for every allergen tag, generate a full plan with that tag excluded and assert that
**no rendered string anywhere in `PlanConfig`** contains any synonym of it. Run it over
`mealPlan.templates[].detail`, `mealPlan.grocery[].items`, `mealPlan.lateNight.yes`, and every
`rank()` result. This is the same shape as the existing `mealAlts.test.ts` vegan check, which
already scans rendered text against a regex (including a `PLANT_DAIRY` carve-out so "soy milk"
does not trip the dairy check). **Reuse that test's structure; it is the right pattern and it
already exists.**

### 7.4 What this is not

BodyT is not a medical allergen-avoidance tool and must not present itself as one. The corpus
carries ingredient-level tags for meals BodyT itself composed; it knows nothing about a
manufacturer's "may contain" statement, shared production lines, or the contents of a
restaurant meal. The standing copy line (**CRAFT**, needs the owner's voice): *"I filter what I
suggest. Check labels yourself, always."*

---

## 8. GROCERY AND BATCH LOGIC

### 8.1 Weekly list assembly

Today the grocery list is a hardcoded string array branched on `dietStyle`, with three fixed
categories plus veg, and it has no relationship whatsoever to the meals in the plan
(`foods.ts:buildMealPlan`). `GroceryList.tsx` lets the user check items off and add their own,
persisted in `data.grocery`. That check-off state is worth keeping; the list generation is not.

Replacement, derived from the plan:

```
weeklyList(plan, weekMeals: MealRecord[], limits: FoodLimits) =
  1. collect ingredientKeys across every meal scheduled that week, with a multiplier
     for how many times each meal appears
  2. dedupe by ingredientKey, summing multiplicities
  3. resolve each key to a FoodDef for its category, and to a display noun
  4. group by FoodDef.category: protein, carb, fat, veg, snack
  5. drop anything whose key carries an excluded allergen tag
  6. render quantity as a shopping phrase, not a gram figure
  7. merge with the user's own manually added items, preserving check-off state by string
```

**Step 6 is where honesty matters.** BodyT does not know package sizes, and telling somebody to
buy "1,340 g of chicken breast" is both wrong-feeling and wrong. The rule (**CRAFT**): bucket
the multiplicity into shopping language. 1 to 2 uses = "a pack", 3 to 5 = "a big pack", 6+ =
"stock up". Whole-item foods (eggs, bananas) get counts rounded up to the pack: 7 eggs becomes
"a dozen eggs". This preserves the register of the existing list ("Chicken breast (4-5 lb)",
"Whatever's fresh") while making it actually reflect the plan.

**Dedupe by ingredient key, not by display string.** "1 cup Greek yogurt" and "Greek yogurt +
honey" must collapse to one `greek-yogurt` line. That requires `ingredientKeys` on every record
(section 4.1), which is the second reason that field exists after the allergen filter.

### 8.2 What batch cooking changes

A batch-cook day is a user choice, not an inference. **CRAFT: BodyT should ask once, in the
meal setup sheet, "Do you cook ahead?" with options none / one day / two days, and store the
weekday.** Suggest-only: never assume Sunday.

When a batch day is set, three things change:

1. **The ranker's `W_BATCH` bonus (5.3) applies on that day only.** On the batch day the
   ranking prefers `batchFriendly` records with high `batchYields`, and the time filter uses
   the day's *total* budget rather than the per-meal budget, because the user has explicitly
   allocated a block.
2. **The following days' pools gain leftover servings** (4.5) at reheat cost. Those score well
   via `W_LEFTOVER` and dominate the early-week suggestions, which is correct: it is already
   cooked and already paid for.
3. **The grocery list consolidates.** A batch of 4 servings buys one large pack instead of four
   separate meal ingredient sets, which is the mechanism by which batching lowers cost tier in
   practice. **CRAFT: do not model this as a cost-tier change on the record.** The record's tier
   is per-serving and stays fixed; the *list* gets shorter. Claiming a per-serving price drop
   BodyT cannot verify is exactly the fake precision the house rules forbid.

Expected effect, arithmetic not evidence: a 5-meal week where two meals are 25-minute batches
yielding 3 servings each converts 6 meals x 25 min = 150 active minutes into 2 x 25 + 4 x 3 =
62 minutes. That is the section 6 wave-4 gate (>= 30% reduction) and it clears it comfortably.

### 8.3 What a mid-week swap changes

The hard case, and the one that makes leftovers dangerous if handled naively. When a user swaps
Wednesday's dinner:

| Consequence | Rule |
|---|---|
| Grocery list | If the week's shopping has **not** been checked off yet, regenerate the list and show a diff. If it **has** (any item checked), do **not** regenerate. Instead constrain the swap: prefer records whose `ingredientKeys` are a subset of what is already bought, and add a line "uses what you already have". **CRAFT, and the single most important rule in this section:** a swap that silently invalidates a completed shop is a swap that loses the user. |
| Leftover stock | If the swapped-out meal was a leftover serving, return the serving to `LeftoverStock`. If it was the *parent* batch cook, **every downstream leftover serving for that week disappears**, and the affected days must be re-ranked and shown as changed. Never leave a plan pointing at leftovers of a meal that was never cooked. |
| Chained meals | If the swapped-out meal was the parent of a `chainsTo` edge in use, the chained meal is invalidated the same way. One hop only (4.5) bounds the blast radius to a single day. |
| Remaining macros | Recompute for the rest of that day only. A swap never reaches back into logged days or forward past midnight. |
| Refresh offset | Resets to 0 for the new slot (5.6), so a swap followed by a refresh shows the next three, not the same three. |

The user-visible summary of a swap, one line, no em dashes: *"Swapped Wednesday's dinner.
Nothing else moves, and the shopping list is unchanged."* Or, when it does move: *"Swapped
Wednesday's dinner. Thursday's lunch was leftovers from it, so that changed too."*

---

## 9. EVAL FIXTURES

Table tests for J9. Protein targets are computed with the repo's own
`proteinTargetG(bodyweightLb, context)` from `plan/sportsNutrition.ts` (bands confirmed in R1
s5.1), so the fixtures stay consistent with the nutrition engine rather than inventing numbers.
Every case states an **assertion**, not a vibe, so it can fail.

Cases 1 to 15 are the required set. 16 to 18 are the regression cases that come from bugs found
in section 1 and must exist before J9 is called done.

| # | Case | Input | Assertion |
|---|---|---|---|
| 1 | **Vegan cutting, tight budget, 20 minutes** | 135 lb, `deficit` -> 145 g protein; diet `vegan`; `costCeiling` 1; `activeMinutesBudget` 20; slot dinner; remaining 55 g / 600 kcal | 3 results, all `diet === 'vegan'`, all `costTier === 1`, all `activeMinutes <= 20`, 3 distinct `primaryProteinKey`. **Fails today: the vegan dinner pool is 7 and has no cost axis at all.** |
| 2 | **Omnivore bulking, full kitchen** | 190 lb, `hypertrophy` -> 190 g protein; diet `omnivore`; `costCeiling` 4; budget 60 min; slot dinner; remaining 70 g / 1100 kcal | 3 results; at least one has `kcal >= 700`; `W_REPEAT` uplift applied (bulk branch, 5.3); no result more than 25% over the remaining kcal. **Fails today: the corpus tops out at 750 kcal and 59 g protein** |
| 3 | **Nut allergy plus dairy free** | `excludeAllergens: ['peanut','tree-nut','milk']`; diet `omnivore`; any slot | Zero results carry any of the three tags. Additionally: the generated `detail` strings, the grocery list and `lateNight.yes` contain no synonym of any of the three. **Fails today at all four sites (7.3)** |
| 4 | **3 meals per day** | 165 lb `general` -> 150 g protein, 2400 kcal; `mealsPerDay: 3` | Slot targets from `MEAL_SPLITS[3]`: breakfast 45 g/725 kcal, lunch 45 g/775 kcal, dinner 60 g/900 kcal. Every slot returns 3 results whose protein is within 30% of its slot target |
| 5 | **5 meals per day, same user** | as case 4, `mealsPerDay: 5` | Slot targets 30/25/40/25/40 g. Snack slots must return real snacks, not down-portioned dinners: every snack result has `slots.includes('snack')`, no widening |
| 6 | **2 meals per day, large user** | 200 lb `hypertrophy` -> 200 g protein; `mealsPerDay: 2` | The anchor slot target is 110 g / 55% of kcal. Either 3 results reach >= 90 g, or the response is explicitly marked as a *combination* (a record plus a named addition) rather than a single record silently under-delivering. **Fails today: nothing exceeds 59 g and `slotKindOf('Meal 2')` returns null, so slot filtering is skipped entirely** |
| 7 | **Late-night training day, 900 kcal left** | slot `late`; remaining 900 kcal / 60 g protein; diet `omnivore`; budget 10 min | 3 results in the `late` pool. At least one is a real meal rather than a shake, because 900 kcal of casein is not an answer. **Fails today: the whole `late` pool is 5 records and 3 of them are dairy** |
| 8 | **Late-night, vegan, 300 kcal left** | slot `late`; diet `vegan`; remaining 300 kcal / 25 g | 3 distinct results. **Fails today: the vegan late pool is exactly 2** |
| 9 | **Swap sheet needs three distinct options** | any reachable `(diet, slot, costCeiling, timeBudget, goalBand)` cell, all 720 | Guarantee G: >= 3 results, pairwise distinct `id` and `primaryProteinKey`. Failure output names the empty cell. This is the coverage test, run as a loop, not a single case |
| 10 | **Refresh gives new options** | any request; `offset` 0 then 1 | The two result sets are disjoint by `id`; both satisfy the diversity rule; calling twice with the same offset gives byte-identical output |
| 11 | **Sunday batch cooker** | batch day = Sunday; 4 dinners across the week; `costCeiling` 2 | Sunday's suggestions favour `batchFriendly` with `batchYields >= 3`; Monday and Tuesday dinners are offered as leftover servings at reheat cost; **week total active minutes at least 30% below the same week ranked without a batch day** |
| 12 | **Leftovers expire** | a batch cooked Sunday with `keepsForDays: 3` | Wednesday's pool contains no leftover serving from it. No chained record from it is offered after Wednesday either |
| 13 | **Mid-week swap with the shop already done** | grocery list has >= 1 checked item; user swaps Wednesday dinner | The grocery list is not regenerated; results prefer records whose `ingredientKeys` are a subset of the existing list; the response carries `usesExistingGroceries: true` for at least one result (8.3) |
| 14 | **Mid-week swap of a batch parent** | user swaps out Sunday's batch cook | All downstream leftover servings for that week are removed and the affected days are re-ranked and flagged as changed. No day is left pointing at leftovers of an uncooked meal |
| 15 | **The honest answer is a simple repeatable meal** | 150 lb `hypertrophy` -> 150 g; diet omnivore; `costCeiling` 1; budget 8 min; slot breakfast; `recentMealIds` contains yesterday's `eggs-toast` at position 0 | `eggs-toast` still appears in the 3, ranked below the fresh options but present. **The repeat penalty must never exclude.** Asserting on presence, not rank, is the point |
| 16 | **Regression: the allergy field reaches the plan** | onboarding with `dairyFree: true`, `allergies: "peanuts and shellfish"` | `plan.foodLimits.excludeAllergens` equals `['milk','peanut','shellfish']` (order-insensitive) and the plan's suggestions honour it. **This is the section 1.5 bug and it currently fails by silently doing nothing** |
| 17 | **Regression: unmatched allergy text is preserved and surfaced** | `allergies: "nightshades and peanuts"` | `excludeAllergens` includes `peanut`; `unmatchedNotes` includes the nightshades fragment; the plan renders a standing caution containing the user's own word. **Never silently drop the tail (7.2 step 3)** |
| 18 | **Regression: a taken swap does not break the macro ring** | take any swap from the sheet, then compute `macrosFor` on a day containing it | `coverage === 1`. **Fails today because `CommonMeal` carries no carbs or fat (1.2)** |
| 19 | **Relaxation is announced, never silent** | vegan, slot breakfast, `costCeiling` 1, budget 5 min, before wave 2 lands | Either 3 valid results, or a response with `relaxedAxis: 'time'` and copy that names it. **Never a dinner returned for a breakfast slot with no explanation, which is exactly what happens today** |
| 20 | **Determinism under identical input** | any request, called 100 times | Byte-identical results. No `Math.random`, no `Date.now` inside the ranker; the seed is an explicit input |

**Fixtures 1, 2, 3, 6, 7, 8, 9, 16, 17, 18 and 19 must fail against today's library.** If any of
them passes on the current corpus, the fixture is wrong and needs tightening before the corpus
work starts.

---

## 10. INTEGRATION NOTES

No production code ships from R4. This section is the handover to J9.

### 10.1 Layering

Per the repo non-negotiable (`plan -> engine/store -> cloud/logic/platform ->
components/screens`, never upward):

| Concern | Layer | File |
|---|---|---|
| `MealRecord`, the corpus, the vocabularies (`AllergenTag`, `CostTier`, synonym table), the derived-`effort` rule | **plan** | new `plan/mealCorpus.ts`; `plan/allergens.ts` |
| the ranker `rank(FitRequest)` and its weights | **plan** | new `plan/mealFit.ts`. Pure, no store access, no dates |
| `LeftoverStock`, batch-day setting, refresh offset persistence, "remaining macros so far today" | **engine/store** | extends `engine/stats.ts` and the store schema |
| grocery list assembly from the week's records | **engine** | it needs the schedule, so it is not plan-layer |
| the swap sheet, the refresh button, the relaxation copy, the batch-day question | **screens** | `screens/meals/*` |

`structure.test.ts` allowances shrink only, so **`mealAlts.ts` must not grow**. The corpus goes
in a new file, and `mealAlts.ts` shrinks to a compatibility shim and then disappears. Same for
`foods.ts`: `MEAL_SPLITS` and `buildMealPlan` stay, the hardcoded grocery block leaves.

### 10.2 What extends what

**`plan/foods.ts`**: `FOODS` (62) stays as the *logging* vocabulary and gains
`ingredientKey`-compatible ids plus `allergenTags`, so the grocery list and the allergen filter
can resolve `MealRecord.ingredientKeys` against it. The hardcoded `GROCERY_LIST` and the
`buildMealPlan` grocery block are deleted and replaced by 8.1. `LATE_NIGHT.yes/.no` gain
allergen tags. `MEAL_SPLITS` stays: it is the plan skeleton, and the ranker is the *suggestion*
path, not a replacement for the printable plan.

**`plan/mealAlts.ts`**: `slotKindOf` moves to the new file and gains the missing mappings
(`'Meal 1'`, `'Meal 2'`, `'Meal'` -> inferred from position, never null). `COMMON_MEALS` becomes
a derived view over `MealRecord[]` during wave 1 and is then removed. The `ALLOWED` cascade is
correct as written and moves across unchanged, comment included: it was written out longhand
precisely because the chained version mis-bucketed pescatarian, and that comment is the reason
the bug will not come back.

**`plan/cooking.ts`**: merges into `MealRecord`. The four-things-every-entry-carries doctrine in
its header comment (time split active/total, gear, step order longest-first, seasoning as
adherence) is the best-reasoned prose in the food layer and must survive the merge verbatim.
`withinActiveMinutes`, `noCookIds` and `batchableIds` **already exist, are already tested, and
are already dead** (1.3): wire them into the ranker's hard filters instead of writing new ones.

**`plan/sportsNutrition.ts`**: untouched by J9. R1/J7 own it. The ranker consumes
`macroTargets()` output; it does not compute macros.

### 10.3 What the meal screens need

| Screen | Change |
|---|---|
| `MealDetailSheet.tsx` | a **Refresh** control driving the 5.6 offset; render `steps` and `seasoning` (40 sets of steps and 38 seasoning lines of good writing that no user has ever seen); show `costTier` label and `effort`; show the one-sentence explanation from 5.7; show the relaxation notice when `relaxedAxis` is set |
| `MealsScreen.tsx` | a "what fits what's left" entry point: today's remaining macros -> `rank()` -> three options. This is the fit-the-remaining-macros feature as a user sees it, and it does not exist in any form today |
| `MealPlanSetupSheet.tsx` | the cost ceiling, the weekday time budget, and the batch-day question. Suggest-only defaults, never assumed |
| `GroceryList.tsx` | derived list (8.1) while preserving the existing check-off persistence in `data.grocery`; the "shopping already done" state that 8.3 depends on |
| `onboarding/MealStep.tsx` | unchanged UI. The allergy free-text field is already right. What changes is that its value now reaches the plan, plus the confirmation chips from 7.2 step 2 |
| `PlanView.tsx` | show `costTier` and `activeMinutes` on each meal row so the plan is legible at a glance |

### 10.4 Guard tests, to write first

All four must **fail against today's library**. Write them in wave 0, before any corpus or type
work, so the failure list is the work list.

1. **`coverage.test.ts` (Guarantee G).** Loop all 720 cells; assert >= 3 results with distinct
   `primaryProteinKey`; on failure print the cell tuple. Today: fails at minimum on every vegan
   breakfast and vegan late cell, and on every cell at all, since `costTier` does not exist.
2. **`noRepeat.test.ts` (Guarantee H).** Every `rank()` result set has pairwise-distinct `id`
   and `primaryProteinKey`, or `diversityRelaxed === true`. Today: fails, there is no diversity
   rule and no protein key.
3. **`allergen.test.ts`.** For each of the 10 tags, generate a full plan excluding it and scan
   every rendered string in `PlanConfig` (`templates[].detail`, `grocery[].items`,
   `lateNight.yes`) plus every `rank()` result against the synonym regex. Model it on the
   existing vegan text-scan in `mealAlts.test.ts`, including the `PLANT_DAIRY` carve-out
   pattern. Today: fails at all four sites.
4. **`provenance.test.ts`.** Every `MealRecord` has non-empty `sourceRefs`; every `fdc` ref has
   an `id` and a `dataType`; every `house` ref has a `note`. Every `batchFriendly` record has
   `batchYields` and `keepsForDays`. Every `chainsTo` target exists and has no `chainsTo` of its
   own. Derived `effort` matches the 4.3 rule. Today: fails, none of the fields exist.

Plus one non-test gate: **`foodLimits` must be unreachable-by-accident no longer.** Add
`foodLimits` to `OnboardingAnswers` and a test that `generatePlan` round-trips it. The current
silence exists only because excess-property freshness is lost through `useMemo` (1.5); a typed
field makes the compiler the guard.

### 10.5 J9 versus T21

**J9 owns** (dependencies: J1 done, J7 feeds it):

- the `MealRecord` type and the corpus migration (waves 0 to 5, section 6.3)
- the ranker, the diversity rule, the refresh offset (section 5)
- allergen vocabulary, synonym table, the `foodLimits` wiring, the never-appears rule
  (section 7)
- derived grocery list, batch day, leftovers and chaining (section 8)
- all four guard tests and the 20 fixtures (sections 9, 10.4)

**T21 owns** (dependencies: J9, C1) and must not start early:

- barcode and text food lookup against Open Food Facts and FDC
- `platform/foodLookup.ts` (transport, User-Agent, rate limiting, retry) and
  `engine/nutrition.ts` (normalisation, caching, fallback)
- the per-user local cache, bounded and TTL'd
- the manual-entry fallback that never blocks logging

**The fence between them is licensing, not scope** (section 2.3). J9's corpus is BodyT's
proprietary asset and must stay clean of ODbL data. T21's lookups are per-user Produced Works
and stay in the user's log. **Enforce it structurally: a structure test asserting that nothing
under `src/plan/` imports from `platform/foodLookup` or `engine/nutrition`'s OFF path.** That
test is cheap, it is the layering law restated, and it is the only thing standing between BodyT
and an accidental obligation to open-source its meal corpus.

**What waits for T21 and must not be faked in J9:** any nutrient value BodyT does not author.
J9's corpus is hand-authored with FDC-sourced macros (2.6). It does not need a live lookup to
ship, and it must not grow a "we'll fill these in later" placeholder. `sourceRefs` non-empty is
the guard that prevents it.

### 10.6 Open questions for the owner

1. **Cost tier currency and market.** Section 4.2 anchors to 2026 US supermarket prices. Is
   BodyT US-only for now, or do the tiers need a per-region table? If per-region, cost tier
   stays authored (a ranking) and only the displayed band changes.
2. **The four labels** ("Cheap / Everyday / Treat / Splurge") need the owner's voice pass.
3. **Corpus size.** 200 records is 158 new, i.e. 16 to 26 authoring sessions (6.3). Is that the
   right investment, or should the target be 120 with a narrower guarantee (drop `late` to a
   2-record floor, drop pescatarian to a cascade-only rung)?
4. **EU allergens.** Ship the FDA 9 plus gluten now (7.1) and add celery, mustard, sulphites,
   lupin and molluscs when there are EU users, or carry all 14 from the start?
5. **Sergeant quotes** in the new meal copy need owner approval, per the standing constraint.
   Section 5.7's templates are deliberately plain and quote-free.

---

## APPENDIX: verification commands

Every count in section 1 is reproducible from the deploy branch
(`origin/claude/app-audit-refinement-sjw2va`):

```
git show $B:src/plan/mealAlts.ts | grep -cE "^\s*\{ id: '"          # 42
git show $B:src/plan/cooking.ts  | grep -cE "^  '[a-z0-9-]+': C\("   # 40
git grep -n foodLimits $B -- 'src/*'                                 # 1 hit, the write site
git grep -l "withinActiveMinutes\|noCookIds\|batchableIds" $B -- 'src/*'
                                       # only cooking.ts and its test: dead code
```

`FOODS.length` is 62 (25 protein / 15 carb / 10 fat / 9 snack / 3 veg), not 85; the 85 figure
counts every `{ id: ... }` literal in `foods.ts` including `MEAL_TEMPLATES`, `SUPPLEMENTS` and
`SUPPLEMENT_CATALOG`.
