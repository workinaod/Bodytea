// ============================================================
// Post-session debrief content pools. Selected by day type with
// anti-repeat rotation (see engine/coach.ts pickVariant) so the
// debrief never reads the same two sessions in a row.
// Placeholders: {proteinSoFar} {proteinLeft} {kcalLeft}
// {proteinTarget} {kcalTarget}, interpolated with live numbers.
// ============================================================

/** Recovery notes keyed by day ROLE (template.debriefKey points here). */
export const RECOVERY_POOLS: Record<string, string[]> = {
  power: [
    'CNS day done. The fatigue is invisible, not absent. An easy 10-minute walk tonight beats the couch.',
    'Explosive work drains the nervous system more than the muscles. Protect tonight: real dinner, phone away early, no “one more episode”.',
    'Calves and achilles took those landings. Thirty seconds per side of easy calf stretching tonight pays off Saturday.',
    'Power day done. Hydrate harder than usual. Springy tissue runs on fluid, and tomorrow wants fresh shoulders.',
    'Legs got both speed and load today. Heavy tonight is normal. Wednesday sits two days away so this clears.',
    'First-step work rewires coordination while you sleep. Reps are done, the learning happens tonight. Get the full eight hours.',
    'CNS days like warmth and calm: hot shower, big meal, low lights. Tonight counts as part of the program.',
  ],
  push: [
    'Shoulders and elbows did precision work today. Shake the arms loose tonight so Friday starts clean.',
    'Push day done. That rotator cuff work at the end was the insurance payment. It pays out as pain-free pressing in month six.',
    'Chest and triceps rebuild fastest with protein spread through the evening. Two feeds before bed beats one pile at dinner.',
    'The incline volume is the upper-chest builder working. Soreness along the collarbone tomorrow is right. Stiffness in the front of the shoulder is wrong.',
    'Legs stayed fresh on purpose. Tomorrow is heavy lower. Eat like it.',
    'Elbows tender from pressing? One minute of slow wrist and forearm stretches tonight saves a cranky close-grip day.',
    'Pressing posture bleeds into desk posture. Once tonight: squeeze the shoulder blades for 10 seconds, open the chest.',
  ],
  lower: [
    'Heavy lower is in the bank. Glutes and quads will talk tomorrow. Thursday mobility is the scheduled answer.',
    'Tonight is the biggest recovery night of the week: biggest muscles, biggest repair job. Carbs AND protein at dinner.',
    'Hip thrusts and squats drain deep. Legs up the wall for five minutes tonight genuinely speeds up tomorrow.',
    "Today's soreness should peak tomorrow and clear by Saturday. That's the design: heavy legs two days before sprints, never one.",
    'Do NOT stack extra cardio tonight to “finish strong”. Wednesday’s job is done. Extra work now is stolen from Saturday’s speed.',
    'Hot shower on the quads and glutes, easy walk tomorrow. Boring, proven, free.',
    'You lifted heavy and slow today so Saturday can be light and violent. Rest the legs like they have a gig this weekend. They do.',
  ],
  mobility: [
    'Mobility banked. The new ankle and hip range is temporary until you use it. Tomorrow’s pulls and Saturday’s jumps cash it in.',
    'Active recovery means today WAS the recovery. Don’t undo it with a random hard workout because you feel fresh. Fresh is the product.',
    'The dead hangs decompressed your spine after three loading days. Sleep flat, let it stay long.',
    'Today cost almost nothing and bought back range, blood flow, and a clear head. Log it with PR-day pride. Easy-day adherence is rarer than hard-day effort.',
    'Hips opened today close again with sitting. One extra couch-stretch round tonight while you watch whatever. Free gains.',
    'Your walk counted. Steps are the quiet engine of the recomp. They burn without touching recovery.',
    'Two hard days coming: pull Friday, speed Saturday. Today was the breath in between. Eat rest-day numbers, sleep big.',
  ],
  pull: [
    'Pull day done. Lats, grip, and rear delts all paid. If the forearms pump up tonight, a minute of gentle wrist stretching helps.',
    'Grip work today feeds tomorrow: rim grabs and ball security run on the forearms you just cooked. They recover fast.',
    'Heads up: tomorrow is max speed. No leg work happened today on purpose. Keep it that way. No bonus cardio, no late-night ball.',
    'Back days love the evening meal. Big muscle group, big appetite. Feed it and the width gets built overnight.',
    'That slow rear-delt lowering doubles as shoulder therapy. Warm, loose shoulders tonight means it worked.',
    'Hangs and pulls lengthened the lats and spine. Stand tall, get to bed early. Tomorrow is the crown jewel of the week.',
    'Tomorrow morning is the fastest running of your week. Lay out what you need tonight. Remove every excuse before it forms.',
  ],
  speed: [
    'Speed day banked, the most valuable session of your week. It adapts over 48 quiet hours. Tomorrow is FULL rest.',
    'Max-velocity work leaves invisible fatigue. You feel fine, but the hamstrings and nervous system are spent. Respect Sunday. No “bonus” anything.',
    'Every approach jump today taught the penultimate rhythm. The pattern gets carved in during sleep. Jumpers are made overnight, literally.',
    'Sprinting at true max effort is the strongest signal your hamstrings ever get. Feed them tonight, full training-day calories.',
    'Tight achilles or calves tonight is pogo adaptation in progress. Gentle stretching yes, aggressive digging no.',
    "Week's hardest work is done. Check today's best jump against last month's, not yesterday's. The trend is the truth.",
    'One-foot jumping feels weaker than two-foot for the first weeks. The plan said it would. Elasticity compounds. Log the numbers, ignore the doubt.',
  ],
  cardio: [
    'Conditioning banked. This replaced ball this week, same engine, controlled dose. One is the prescription. Don’t double-dip.',
    'Zone 2 builds the base that lets you play full games without fading. It works by staying EASY. If it felt easy, it worked.',
    'Hard conditioning today counts as leg work. If tomorrow is a CNS day, you know the rule: fresh beats fatigued.',
    'Cardio on a no-ball week keeps the game-shape without the game. The plan asks for one of these. Box checked, engine warm.',
    'Hydrate extra tonight. Conditioning sweats out more than lifting, and tomorrow’s quality depends on topping back up.',
    'Steps, sprints, or circuits, it all serves the same master: a leaner waist without touching your recovery budget.',
  ],
  generic: [
    'Session logged. Recovery is the other half: dinner, water, sleep, in that order, starting now.',
    'The work is done. The adaptation runs tonight. Show up for it like you showed up today.',
    'Done. The rebuild runs on tonight’s protein and tonight’s sleep. Fund it.',
    'Banked. Tomorrow’s readiness is being decided right now, in the kitchen and in bed.',
    'That’s a wrap. Low lights, big plate, early night. The least glamorous, most effective stack there is.',
    'Complete. One session never matters, the streak always does. Protect it with boring evenings.',
  ],
}

/** Sleep guidance pool, engine appends a tomorrow-aware line. */
export const SLEEP_TIPS: string[] = [
  'Target 7.5 to 8 hours tonight. Under 6 is the red line the readiness check watches for. Don’t hand tomorrow a flag.',
  'Sleep is when today’s work becomes muscle. 8 hours is the dose. The last hour phone-free doubles the quality.',
  'Same bedtime as last night, then 15 minutes earlier. Sneaking sleep forward beats heroic early nights that never stick.',
  'Cool room, dark room, boring room. Growth hormone does its heaviest lifting in the first deep-sleep cycles.',
  'Two short nights in a row and the plan cuts your volume by a third. Its rule, not a suggestion. Bank tonight.',
  'Caffeine after mid-afternoon steals from deep sleep even if you fall asleep fine. Cut it off early on training days.',
  'The gym tears, the kitchen supplies, the bed builds. Two of three done today. Finish the trilogy.',
  'Mind racing tonight? Dump tomorrow’s to-do list onto paper before bed. Sleep is a recovery metric, not a luxury.',
  'A 10-minute walk after dinner drops the heart rate and buys deeper early sleep. Cheapest recovery tool you own after water.',
]

/** Eat-now guidance. {proteinSoFar}/{proteinLeft}/{kcalLeft} interpolated live. */
export const EAT_NOW: { training: string[]; rest: string[] } = {
  training: [
    'You’re at {proteinSoFar} g protein, {proteinLeft} g to go. Shake and a banana now, real meal within two hours.',
    'Training day: {kcalLeft} kcal and {proteinLeft} g protein left. Dinner from the plan covers most of it in one plate.',
    'Refuel now, not at midnight: {proteinLeft} g protein left. The 1.5-scoop shake + PB + banana knocks out 40 g in five minutes.',
    'The session spent it, dinner reinvests it. {kcalLeft} kcal left today and every one of them has a job.',
    'Protein check: {proteinSoFar} g down, {proteinLeft} g to target. Cottage cheese + trail mix before bed closes a 30 g gap, no cooking.',
    'Carbs tonight aren’t cheating, they’re the refill for the legs you just emptied. Rice or potatoes with dinner. {kcalLeft} kcal to work with.',
    'Eat like the session mattered, because it did: {proteinLeft} g protein left. Miss it and today’s work rebuilds at half speed.',
  ],
  rest: [
    'Rest-day targets: lighter on carbs, never on protein. {proteinSoFar} g so far, {proteinLeft} g to go.',
    'No session today, but yesterday’s rebuild runs on today’s food. {proteinLeft} g protein left. Casein or cottage cheese tonight finishes it.',
    'Rest day, {kcalLeft} kcal left. Stick to the plan’s food list plus half a plate of veg.',
    'Late-night hunger tonight? The yes-list: casein shake, cottage cheese, Greek yogurt, protein pudding. You know the no-list.',
    'Quiet work today: {proteinLeft} g protein left to hit. One feed every few hours beats a bedtime pile.',
    'Muscles rebuild while the calories drop to {kcalTarget}. Full protein, controlled energy. That IS the recomp. Run it.',
  ],
}

/** Extra pool for rest-day (Sunday) cards, no session, still coached. */
export const REST_DAY_CARDS: string[] = [
  'Full rest. Eat, sleep, stretch, recover. Steps are fine, lifting is not. Today’s discipline is restraint.',
  'Rest day. The whole week’s adaptation lands today. Do gloriously little and show up Monday dangerous.',
  'Nothing to log today except food and maybe a walk. Enjoy it. Recovery is part of the program, not time off from it.',
  'Sunday: the plan asks for nothing. Take the win, maybe prep some food, let the legs get springy for Monday.',
  'Rest means rest. No sneaky workouts. Fatigue added today comes out of Monday’s power. Walk, stretch, eat, sleep.',
  'Weekly check-in day: same morning, same conditions. Weight, waist, chest, arms, thigh, vert. Write it down or it didn’t happen.',
]
