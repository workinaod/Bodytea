// ============================================================
// Post-session debrief content pools. Selected by day type with
// anti-repeat rotation (see engine/coach.ts pickVariant) so the
// debrief never reads the same two sessions in a row.
// Placeholders: {proteinSoFar} {proteinLeft} {kcalLeft}
// {proteinTarget} {kcalTarget} — interpolated with live numbers.
// ============================================================

/** Recovery notes keyed by day ROLE (template.debriefKey points here). */
export const RECOVERY_POOLS: Record<string, string[]> = {
  power: [
    'CNS day is done — the fatigue you earned today is invisible, not absent. An easy 10-minute walk this evening flushes the legs better than the couch does.',
    'Explosive work drains the nervous system more than the muscles. Protect tonight: real dinner, phone away earlier, no “one more episode”.',
    'Your calves and achilles took the box-jump landings. Thirty seconds per side of gentle calf stretching tonight pays interest on Saturday.',
    'Power day complete. Hydrate harder than usual — explosive work runs on fluid-filled, springy tissue, and tomorrow is a press day that wants fresh shoulders.',
    'Legs got both speed and load today. If they feel heavy tonight, that’s scheduled — Wednesday is built two days away precisely so this fatigue clears.',
    'First-step work rewires coordination while you sleep. The reps are done; the learning happens tonight. Give it the full eight hours to consolidate.',
    'Nervous-system days respond to warmth and calm: hot shower, big meal, low lights. Treat tonight like part of the program, because it is.',
  ],
  push: [
    'Shoulders and elbows did precision work today. Shake the arms loose during the evening — tension held after pressing is tension you warm up against Friday.',
    'Push day is done. Your rotator cuff work at the end was the insurance payment — the return shows up as pain-free pressing in month six.',
    'Chest and triceps rebuild fastest with protein spread through the evening, not one pile at dinner. Two feeds between now and bed beats one.',
    'The incline volume you just did is the upper-chest builder working. Soreness along the collarbone line tomorrow is the right kind — stiffness in the front of the shoulder is the wrong kind. Know the difference.',
    'Upper-body days leave the legs fresh on purpose: tomorrow is heavy lower. Eat like it — tomorrow morning starts the fueling for it.',
    'If the elbows feel tender from pressing, a few slow wrist and forearm stretches tonight cost one minute and save a cranky close-grip day.',
    'Pressing posture bleeds into desk posture. Once tonight: squeeze the shoulder blades for 10 seconds, open the chest, undo the day.',
  ],
  lower: [
    'Heavy lower is in the bank. Expect the glutes and quads to speak tomorrow — Thursday’s mobility session is scheduled as the answer, not a coincidence.',
    'Tonight is the most important recovery night of the training week: biggest muscles, biggest repair job. Carbs AND protein at dinner — this is what training-day calories are for.',
    'Hip thrusts and squats drain deep. Legs-up-the-wall for five minutes tonight moves the pooled fluid and genuinely speeds tomorrow.',
    'The soreness from today should peak tomorrow and clear by Saturday — that’s the design: heavy legs two days before sprints, never one.',
    'Do NOT stack extra cardio tonight to “finish the day strong”. Wednesday’s job is done. Extra work now is stolen from Saturday’s speed.',
    'A hot shower on the quads and glutes tonight, easy walk tomorrow. Boring, proven, effective — the pro recovery stack costs nothing.',
    'You lifted heavy and slow today so Saturday can be light and violent. Honor the trade: rest the legs tonight like they have a gig this weekend. They do.',
  ],
  mobility: [
    'Mobility banked. The new ankle and hip range you just opened is temporary until you use it — tomorrow’s pulls and Saturday’s jumps cash it in.',
    'Active recovery means the work today WAS the recovery. Don’t undo it with a random hard workout tonight because you feel fresh. Feeling fresh is the product.',
    'The dead hangs decompressed your spine after three loading days. Sleep flat and let it stay long tonight.',
    'Today cost you almost nothing and bought back range, blood flow, and a clear head. Log it with the same pride as a PR day — adherence to easy days is rarer than effort on hard ones.',
    'Hips opened today close again with hours of sitting. One extra couch-stretch round tonight while watching whatever you watch: free gains.',
    'Your walk counted. Steps are the quiet engine of the recomp — they burn without borrowing from recovery.',
    'Two hard days are coming (pull Friday, speed Saturday). Today was the breath in between. Eat at rest-day numbers, sleep big, arrive hungry.',
  ],
  pull: [
    'Pull day done — lats, grip, and rear delts all paid. Forearms may pump up tonight from the carries and hangs; a minute of gentle wrist flexor stretching helps.',
    'Grip work today directly feeds tomorrow: rim grabs and ball security run on the forearms you just cooked. They recover fast — by morning they’re ready.',
    'IMPORTANT for tomorrow: Saturday is max speed. No leg work happened today on purpose. Keep it that way tonight — no bonus cardio, no late-night ball.',
    'Back days respond to the evening meal like nothing else — big muscle group, big appetite. Feed it properly and the width you’re chasing gets built overnight.',
    'The 3-second rear-delt lowering you did doubles as shoulder therapy. If the shoulders feel warm and loose tonight, that’s the system working.',
    'Hangs and pulls lengthened the lats and spine. You’ll stand taller tonight — enjoy it, and get to bed early: tomorrow is the crown-jewel session of the week.',
    'Tomorrow morning: dynamic warm-up, then the fastest running of your week. Lay out what you need tonight. Remove every excuse before it forms.',
  ],
  speed: [
    'Speed day complete — the most valuable session of your week is banked. The elastic system you just trained adapts over 48 quiet hours: tomorrow is FULL rest, and Monday arrives fresh.',
    'Max-velocity work leaves invisible fatigue: you feel fine, but the hamstrings and nervous system are spent. Respect Sunday completely — no “bonus” anything.',
    'Every approach jump today taught the penultimate rhythm. The pattern gets carved in during sleep — jumpers are made overnight, literally.',
    'Sprinting at true max effort is the strongest muscle-building signal your hamstrings ever get. Feed them tonight: full training-day calories, no shortcuts.',
    'If the achilles or calves feel tight tonight, that’s pogo adaptation in progress — gentle stretching yes, aggressive digging no. Stiffness is the goal; soreness passes.',
    'Week’s hardest work is done. Take the win: check your best jump today against last month’s, not yesterday’s. The trend is the truth.',
    'One-foot jumping feels weaker than two-foot for the first weeks — the plan told you it would. Elasticity compounds. Log the numbers, ignore the doubt.',
  ],
  cardio: [
    'Conditioning banked. This replaced ball this week — same engine, controlled dose. Don’t double-dip with another session; one is the prescription.',
    'Zone-2 work builds the base that lets you play full games without fading. It works by staying EASY — if it felt easy, it worked.',
    'Hard conditioning today counts as leg work. If tomorrow is a CNS day, you already know the rule: fresh beats fatigued — check in honestly.',
    'Cardio on a no-ball week keeps the game-shape without the game. The plan asks for at least one of these — done. Box checked, engine warm.',
    'Hydrate extra tonight — conditioning sweats out more than lifting does, and tomorrow’s quality depends on topping back up.',
    'Steps, sprints, or circuits — it all serves the same master: a leaner waist without touching your recovery budget. Efficient day.',
  ],
  generic: [
    'Session logged. Recovery is the other half of training — dinner, water, sleep, in that order, starting now.',
    'The work is done; the adaptation is scheduled for tonight. Show up for it the same way you showed up today.',
    'Done. Muscles are torn down on purpose — the rebuild runs on tonight’s protein and tonight’s sleep. Fund it.',
    'Banked. Tomorrow’s readiness is being decided right now, in the kitchen and in bed. Decide well.',
    'That’s a wrap. Low lights, big plate, early night — the least glamorous, most effective performance stack there is.',
    'Complete. One session never matters; the streak always does. Protect the streak with boring evenings.',
  ],
}

/** Sleep guidance pool — engine appends a tomorrow-aware line. */
export const SLEEP_TIPS: string[] = [
  'Target 7.5–8 hours tonight. Under 6 is the red line your readiness check watches for — don’t hand tomorrow a flag.',
  'Sleep is when today’s work becomes tomorrow’s muscle. 8 hours is the dose; the last hour phone-free doubles the quality.',
  'Same bedtime as last night, then 15 minutes earlier. Sneaking sleep forward beats heroic early nights that never stick.',
  'Cool room, dark room, boring room. Growth hormone does its heaviest lifting in the first deep-sleep cycles — protect them.',
  'Two short sleep nights in a row and the plan cuts your volume by a third — its rule, not a suggestion. Bank tonight so it never triggers.',
  'Caffeine after mid-afternoon steals from tonight’s deep sleep even if you fall asleep fine. Cut it off early on training days.',
  'The gym tears, the kitchen supplies, the bed builds. Two of three are done today — finish the trilogy.',
  'If your mind races tonight, dump tomorrow’s to-do list onto paper before bed. Sleep quality is a recovery metric, not a luxury.',
  'A 10-minute wind-down walk after dinner drops your heart rate and buys deeper early-night sleep — the cheapest recovery tool you own after water.',
]

/** Eat-now guidance. {proteinSoFar}/{proteinLeft}/{kcalLeft} interpolated live. */
export const EAT_NOW: { training: string[]; rest: string[] } = {
  training: [
    'You’re at {proteinSoFar} g protein — {proteinLeft} g to go. The post-workout window is generous but real: shake + banana now, real meal within two hours.',
    'Training day: {kcalLeft} kcal and {proteinLeft} g protein left on the books. Dinner from the plan (steak or salmon + potatoes + veg) covers most of it in one plate.',
    'Refuel now, not at midnight: {proteinLeft} g protein remaining. The 1.5-scoop shake + PB + banana from your plan knocks out 40 g in five minutes.',
    'The session spent it — dinner reinvests it. {kcalLeft} kcal left today and every one of them has a job on a training day. Don’t leave them unspent.',
    'Protein check: {proteinSoFar} g down, {proteinLeft} g to target. Cottage cheese + trail mix before bed closes a 30 g gap without cooking anything.',
    'Carbs tonight are not cheating — they’re the refill for the legs you just emptied. Rice or potatoes with dinner, per the plan, {kcalLeft} kcal to work with.',
    'Eat like the session mattered, because it did: {proteinLeft} g protein left. Miss it and today’s work rebuilds at half speed.',
  ],
  rest: [
    'Rest-day targets: lighter on carbs, never on protein. {proteinSoFar} g so far, {proteinLeft} g to go — the number that never drops.',
    'No session today, but the rebuild from yesterday is running on today’s food. {proteinLeft} g protein remaining — casein or cottage cheese tonight finishes it.',
    'Rest day, {kcalLeft} kcal left. Keep it to the plan’s food list and half a plate of veg — volume without the calorie bill.',
    'Late-night hunger tonight? The plan’s yes-list: casein shake, cottage cheese, Greek yogurt, protein pudding. The no-list you already know.',
    'Recovery day nutrition is quiet work: {proteinLeft} g protein left to hit. Spread it — one feed every few hours beats a bedtime pile.',
    'Today the muscles rebuild while the calories drop to {kcalTarget}. That combination — full protein, controlled energy — is the actual recomp mechanism. Execute it.',
  ],
}

/** Extra pool for rest-day (Sunday) cards — no session, still coached. */
export const REST_DAY_CARDS: string[] = [
  'Full rest. Eat, sleep, stretch, recover. Steps are fine, lifting is not — the plan’s exact words. The discipline today is restraint.',
  'Rest day. The adaptation from the whole week lands today. Do gloriously little, eat to rest-day numbers, and show up Monday dangerous.',
  'Nothing to log today except food and maybe a walk. Enjoy it without apology — recovery is a scheduled part of the program, not time off from it.',
  'Sunday: the plan asks for nothing. Take the win, prep some food for the week if you’re feeling productive, and let the legs get springy for Monday.',
  'Rest means rest. No sneaky workouts — fatigue you add today gets subtracted from Monday’s power. Walk, stretch, eat, sleep.',
  'Weekly check-in day: same morning, same conditions. Weight, waist, chest, arms, thigh, vert. Write it down or it didn’t happen.',
]
