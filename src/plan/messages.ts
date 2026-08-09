import type { CoachSituation } from '../types'

// ============================================================
// The Sergeant's voice. Variant pools keyed by situation (and
// escalation level for unproven skips). Placeholders like
// {count}, {dates}, {streak}, {exercise} are interpolated by
// the coach engine with live numbers — receipts, not vibes.
//
// Tone contract:
// - No proof + skipping  → drill sergeant, escalating with history
// - Proof shown          → respect. A planned choice is not a failure.
// - Plan-sanctioned      → zero roast (deload, readiness, gig rules)
// ============================================================

export interface MessagePool {
  id: string
  situation: CoachSituation
  /** Escalation level for skip-no-proof pools. */
  level?: 0 | 1 | 2 | 3
  variants: string[]
}

export const MESSAGE_POOLS: MessagePool[] = [
  // ---------- Skipping WITHOUT proof — escalation ladder ----------
  {
    id: 'skip-np-0',
    situation: 'skip-no-proof',
    level: 0,
    variants: [
      "One skip. Fine. It's logged — with a timestamp. It better be the last one this month.",
      "No proof, no sympathy. I wrote it down. The plan survives one of these; YOU decide if there's a second.",
      "Skipped with no receipts. Noted. Your goals didn't get the day off, just so you know.",
      "Alright. Skipping today, nothing to show for it. The ledger remembers even if you won't.",
      "Today: skipped, unproven. I'm not mad, I'm just keeping records. Lots of records.",
    ],
  },
  {
    id: 'skip-np-1',
    situation: 'skip-no-proof',
    level: 1,
    variants: [
      "That's TWO unproven skips in 30 days — the last one was {dates}. Show me a calendar or show me a workout.",
      "Second one this month ({dates} was the first). 'Busy' with no proof twice in a row starts to smell like a habit.",
      "You skipped on {dates} too. No proof then, no proof now. The rim doesn't care about your vibes, it cares about your reps.",
      "Two skips, zero evidence. Your vertical is watching you make choices right now.",
      "Here's the pattern forming: {dates}, and today. I catch patterns early. That's literally my job.",
    ],
  },
  {
    id: 'skip-np-2',
    situation: 'skip-no-proof',
    level: 2,
    variants: [
      "That's the {count}rd unproven skip this month — {dates}, and now today. Calendar photo or it didn't happen.",
      "{count} skips, zero receipts: {dates}. At this point 'busy' is a bedtime story you tell yourself. Prove it or train.",
      "Let me read your file: {dates}. All 'busy'. All unproven. You know who else was busy? Everyone who ever dunked.",
      "{count} no-proof skips in 30 days. I'd call that a slump but slumps end. Show evidence or show up.",
      "The receipts say {dates}. You're not busy, you're negotiating. I don't negotiate with excuses — bring proof.",
    ],
  },
  {
    id: 'skip-np-3',
    situation: 'skip-no-proof',
    level: 3,
    variants: [
      "Your own plan says it: a month of fallback weeks means the schedule needs a real look, NOT more willpower. {count} unproven skips ({dates}). Sit down Sunday, fix the week, or admit the goal changed.",
      "{count} skips this month, no evidence for any of them. This stopped being about motivation. Open your calendar Sunday and rebuild the week — or tell me the dunk isn't the goal anymore.",
      "I've run out of speeches. {dates}. The plan has Tier 3 — TWO days a week — exactly so this never happens. If two days is too many, the problem isn't time.",
      "Straight talk: {count} unproven skips. Either your schedule is genuinely broken (then we fix it — Tier picker, Sunday, 10 minutes) or you're lying to the one person keeping your logs. Pick one.",
    ],
  },

  // ---------- Skipping WITH proof — respect ----------
  {
    id: 'skip-proof',
    situation: 'skip-with-proof',
    variants: [
      'Proof received. A planned choice, not a failure — your plan\'s own words. Protein is still {proteinTarget} g today. That part never drops.',
      "Evidence checks out. Life happens; the plan is built for it. Hit your protein, sleep well, and we go again tomorrow.",
      'Receipt logged. This is exactly how to miss a day — honestly, with a plan. No penalty on the record.',
      "That's a real conflict, not an excuse. Logged as planned. The comeback session is already waiting for you.",
      "Fair enough — the calendar doesn't lie. Rest smart today: steps, protein, water. Tomorrow we collect.",
      'Documented and accepted. Missing with a reason beats grinding into the ground. Protein stays at {proteinTarget} g though — non-negotiable.',
    ],
  },

  // ---------- Lightening a day ----------
  {
    id: 'lighten',
    situation: 'lighten',
    variants: [
      'Lighter day it is. Showing up at 70% beats a heroic zero. The main lifts still count — leave the fluff, keep the iron.',
      "Volume trimmed. Smart, not soft — the plan cuts from the bottom of the list, never the top. Explosive work and main lifts stay.",
      'Downgraded, not cancelled. Big difference. Quality reps on the money exercises, then get out.',
      "A trimmed session logged is worth ten perfect sessions imagined. Do the top of the list, skip the tail.",
    ],
  },

  // ---------- Tier drops ----------
  {
    id: 'tier-drop-planned',
    situation: 'tier-drop-planned',
    variants: [
      'Tier {tier} picked at the start of the week — exactly how the plan says to do it. Hit these days and the week counts as a FULL win.',
      "Tier {tier} locked for the week. A planned fallback beats an abandoned full week every single time. Now hit every session on it.",
      'Smart call made early. Tier {tier} this week: fewer days, same standards. The explosive day is still sacred.',
      "Tier {tier}, chosen up front like a professional. Protein stays at {proteinTarget} g. Steps still count. Go.",
    ],
  },
  {
    id: 'tier-drop-midweek',
    situation: 'tier-drop-midweek',
    variants: [
      "Dropping tiers MID-week? The plan says pick at the START — deciding day-by-day is how weeks die. Your reason is on the record below; I'll be quoting it back if this becomes a pattern.",
      "Mid-week tier drop. That's not planning, that's renegotiating with yourself. Your own words are logged — make sure they'd survive being read out loud.",
      'You know the rule: tier at the start of the week, not when it gets hard. Your reason goes in the record. Next week gets picked on Monday.',
      "Changing the deal halfway through. Fine — your reason's on the record. Sunday: pick honestly, then DON'T renegotiate.",
    ],
  },

  // ---------- Unexplained misses (reconcile) ----------
  {
    id: 'unexplained-miss',
    situation: 'unexplained-miss',
    variants: [
      "{date} came and went. No log, no excuse, no proof. Silence isn't neutral — it's a skip with extra cowardice. What happened?",
      'Found a hole in the record: {date}. You trained, you skipped, or you hid. Pick the true one.',
      "A day went missing ({date}). I don't do missing days. Account for it and we move on.",
      "{date}: nothing logged. The plan only works if the record is honest. Close this out — what actually happened?",
      "You ghosted {date}. I notice everything, that's the whole point of me. Explain it — takes ten seconds.",
    ],
  },

  // ---------- Minimum viable taken ----------
  {
    id: 'minimum-taken',
    situation: 'minimum-taken',
    variants: [
      "THAT'S what I want to see. Couldn't do the whole thing, did something anyway. That's how streaks survive real life.",
      'The minimum on a bad day is worth more than the maximum on an easy one. Logged as a win.',
      "Ten minutes of showing up beats zero minutes of intending to. The habit lives another day.",
      "You negotiated DOWN instead of OUT. That's the difference between people who make it and people who restart every January.",
      'Small session, full credit. Consistency across a year is the whole game — your plan, page one.',
    ],
  },

  // ---------- Comeback after a miss ----------
  {
    id: 'comeback',
    situation: 'comeback',
    variants: [
      "Back in the building. The last session is ancient history — this one's the only one that exists. Go.",
      'A miss followed by a comeback is called training. A miss followed by a spiral is called quitting. You chose right.',
      "Good. You came back before the couch got comfortable. That's the skill nobody talks about.",
      'The plan never left. Glad you didn\'t either. Pick up exactly where the numbers say.',
      "One day off didn't kill the goal. Two might have started to. Well timed.",
    ],
  },

  // ---------- Streak milestones ----------
  {
    id: 'streak',
    situation: 'streak',
    variants: [
      '{streak} sessions without a miss. This is what "consistent" looks like in the actual data, not the mirror pep talk.',
      "{streak}-session streak. The vertical isn't built in a day; it's built in exactly this — boring, repeated showing up.",
      '{streak} in a row. Somewhere a version of you that skipped is wondering why the rim still feels far. Not your problem.',
      'Streak: {streak}. Protect it like a PR, because it is one.',
      "{streak} straight. You know what's rarer than talent? This. Keep stacking.",
      "That's {streak} on the bounce. The plan works when it's boring. You're making it boring. Beautiful.",
    ],
  },

  // ---------- PRs ----------
  {
    id: 'pr',
    situation: 'pr',
    variants: [
      'PR on {exercise}. The numbers went UP because you showed up. Write that formula down.',
      "New best on {exercise}. That's the progressive overload doing exactly what the plan promised it would.",
      '{exercise}: personal record. The core movers never rotate for exactly this reason — watch the line climb.',
      'PR: {exercise}. Strength banked today converts to inches on the vertical later. The exchange rate is in your favor.',
      "{exercise} just moved. Recomp lies on the scale but it can't lie on the bar.",
      'New {exercise} record. Quietly, week by week, you are becoming hard to guard. Continue.',
    ],
  },

  // ---------- Deload start ----------
  {
    id: 'deload-start',
    situation: 'deload-start',
    variants: [
      'DELOAD WEEK. Sets cut in half, weights stay. This is not a suggestion and it is not a vacation — it is when the adaptation catches up. Leave every session feeling like you could do more.',
      "Week 4: deload. The discipline this week is doing LESS on purpose. Add sets back and you're stealing from next block's PRs.",
      'Deload week is live. Half the sets, full effort, zero grinding. The pros deload; the injured skip it.',
      "This week the plan protects you from yourself: half volume, same weights. Finish every session annoyingly fresh. That's the assignment.",
    ],
  },

  // ---------- Week complete ----------
  {
    id: 'week-complete',
    situation: 'week-complete',
    variants: [
      'Week {weekIndex} complete — every scheduled session accounted for. That is a professional week.',
      "Week {weekIndex}: done in full. Stack about forty more of these and the mirror stops arguing with you.",
      'Full week banked. The plan only asks for weeks like this one — one at a time.',
      "Week {weekIndex} closed out clean. Consistency isn't a personality trait, it's a receipt. You just printed one.",
      'Another complete week in the books. This is what a 12-month project actually looks like up close.',
    ],
  },

  // ---------- Protein ----------
  {
    id: 'protein-miss',
    situation: 'protein-miss',
    variants: [
      "Yesterday's protein: {protein} g of {proteinTarget}. The one number the plan says you NEVER miss. Fix it today — front-load it, first meal.",
      'Protein came in short yesterday ({protein} g). Training tears it down; protein rebuilds it. You did half the job.',
      "{protein} g yesterday. The muscle you're trying to keep during this recomp is negotiable only through food. Hit {proteinTarget} today.",
      'Short on protein again: {protein} g. Skipping workouts wrecks weeks; skipping protein wrecks the workouts you DID do.',
      "The bar doesn't care and neither does the rim, but your muscle does: {protein} g isn't {proteinTarget} g. Shake + Greek yogurt closes most gaps in 5 minutes.",
    ],
  },
  {
    id: 'protein-streak',
    situation: 'protein-streak',
    variants: [
      '{streak} straight days at 200+ g protein. The most boring superpower in fitness, fully operational.',
      'Protein target hit {streak} days running. This is the invisible half of the recomp working.',
      "{streak} days of 200 g. The plan said it's the number you never miss — you listened. The mirror will too.",
      'Protein streak: {streak}. Meals are training. You are currently undefeated.',
    ],
  },

  // ---------- Chronic fallback ----------
  {
    id: 'chronic-fallback',
    situation: 'chronic-fallback',
    variants: [
      "That's {count} fallback weeks in the last 5. Your own plan: a month of them means the schedule needs a REAL look, not more willpower. Sunday. Calendar. Rebuild.",
      '{count} of the last 5 weeks on reduced tiers. Two in a row is fine — this is a trend. The fix is structural: move the sessions to when your life actually has room.',
      "Fallback weeks: {count} of 5. The plan flagged exactly this scenario. Not a character problem — a scheduling problem. Solve it like one.",
    ],
  },

  // ---------- Backup nudge ----------
  {
    id: 'backup-nudge',
    situation: 'backup-nudge',
    variants: [
      "No backup in {count} days. All your logs live on THIS phone. One tap in Coach → Export. Do it now, thank me at your next phone upgrade.",
      '{count} days since your last export. Browsers eat data without asking. Back it up — it takes literal seconds.',
      "Your streak, PRs, and receipts exist in exactly one place right now. {count} days unbacked. Export. Today.",
    ],
  },

  // ---------- "Need a push" ----------
  {
    id: 'push',
    situation: 'push',
    variants: [
      "You don't need motivation, you need the first exercise. Start the clock, do the warm-up. The rest follows — it always does.",
      'Feeling lazy is data, not destiny. The readiness check exists for real fatigue. If you pass it, this is just resistance — and resistance folds in about 4 minutes.',
      "The you that dunks in a year is built exclusively on days like this one. Easy days build nothing — they're already built.",
      "Deal: do the 10-minute minimum. If you genuinely want to stop after, stop. You won't, but the door's there.",
      'Nobody feels like it. The dunkers, the shredded guys, the fast ones — none of them felt like it either. They just have a shorter gap between "ugh" and the first rep.',
      "Your goals were made by past-you, funded by present-you, enjoyed by future-you. Present-you's only job is today's session. Clock in.",
      'The rim is 10 feet today, tomorrow, and in July. The only variable in this equation is you. Move the variable.',
      "Skipping feels good for one hour. Training feels good for two days. You're a DJ — you understand delayed drops. This is one.",
      "Every week you show up, the plan works. It's not magic, it's arithmetic. Don't break the math today.",
      "You're 4 clicks away from being mid-warm-up. You've scrolled further for less.",
    ],
  },

  // ---------- Session done (generic reactions) ----------
  {
    id: 'session-done',
    situation: 'session-done',
    variants: [
      'Work banked. Recovery starts NOW — the session tears it down, the next 24 hours build it back.',
      "Done and logged. The difference between you and last year's you is a stack of days exactly like this one.",
      'Session complete. Nothing flashy, everything counted. That is the whole method.',
      "Another deposit in the account. The vertical, the arms, the waist — they all draw from the same balance.",
      'Logged. The plan holds up its end when you hold up yours. Both ends held today.',
      "That's the work. Now do the boring champion stuff: eat, hydrate, sleep like it's your job.",
      'Clocked out. Todays reps are already turning into next months numbers.',
      "Good session. The mirror lags six weeks behind the logbook — keep feeding the logbook.",
    ],
  },

  // ---------- Contradiction heuristics ----------
  {
    id: 'contradiction-sick-pr',
    situation: 'contradiction',
    variants: [
      "Miraculous recovery. 'Sick' yesterday, PR today. I'm happy for your immune system and suspicious of your yesterday.",
      "Yesterday: too sick to train. Today: personal record. One of those days is lying and it isn't today.",
      "From deathbed to PR in 24 hours. Medical journals would love you. The ledger just raises an eyebrow.",
    ],
  },
  {
    id: 'contradiction-busy-meals',
    situation: 'contradiction',
    variants: [
      "'No time to train' — but 5 meals logged, on time, with servings. So there WAS time. There just wasn't training.",
      "Busy day, huh? Your meal log shows a man with a schedule under control. The workout was 40 minutes. Just saying.",
      "Too busy for the gym but not too busy for a 5-entry food log. The evidence cuts both ways, chief.",
    ],
  },
  {
    id: 'contradiction-tier-full',
    situation: 'contradiction',
    variants: [
      "So you had it in you. Tier-dropped on Monday, then logged a FULL session Wednesday. Next week: pick the real tier.",
      'You downgraded the week, then trained like Tier 1 anyway. Great session, terrible forecast. Plan honestly Sunday.',
      "The week you called 'brutal' contained a full voluntary session. Noted for the next time you plead busy.",
    ],
  },

  // ---------- Explosive day protection ----------
  {
    id: 'explosive-day-warning',
    situation: 'explosive-day-warning',
    variants: [
      "You're about to skip the EXPLOSIVE day — the one your plan says never to drop. It's the first thing people cut and the fastest thing to lose. The 12-minute version exists. Take it.",
      'Not the explosive day. Anything but that one. Speed leaves quietly and comes back slow. Move it to another day this week if you must — deleting it is how verticals die.',
      "Skipping speed work costs triple: today's stimulus, next week's timing, next month's inches. Reschedule it, downsize it, but don't zero it.",
    ],
  },
]

// ---------- Motivation library (quotes + curated video links) ----------

export interface MotivationQuote {
  text: string
  source?: string
}

export const MOTIVATION_QUOTES: MotivationQuote[] = [
  { text: "We all have dreams. But in order to make dreams come into reality, it takes an awful lot of determination, dedication, self-discipline, and effort.", source: 'Jesse Owens' },
  { text: "The last three or four reps is what makes the muscle grow. This area of pain divides a champion from someone who is not a champion.", source: 'Arnold Schwarzenegger' },
  { text: "I've failed over and over and over again in my life. And that is why I succeed.", source: 'Michael Jordan' },
  { text: "Hard work beats talent when talent doesn't work hard.", source: 'Tim Notke' },
  { text: "You can't hire someone else to do your push-ups for you.", source: 'Jim Rohn' },
  { text: "The pain you feel today will be the strength you feel tomorrow." },
  { text: "Discipline is choosing between what you want now and what you want most.", source: 'Abraham Lincoln (attributed)' },
  { text: "Somewhere behind the athlete you've become is the little boy who fell in love with the game. Play for him." },
  { text: "It's not about having time. It's about making time." },
  { text: "A year from now you may wish you had started today.", source: 'Karen Lamb' },
  { text: "The body achieves what the mind believes." },
  { text: "Champions aren't made in gyms. Champions are made from something deep inside them — a desire, a dream, a vision.", source: 'Muhammad Ali' },
  { text: "Success is usually the culmination of controlling failure.", source: 'Sylvester Stallone' },
  { text: "If you're tired of starting over, stop giving up." },
  { text: "Everybody wants to be a beast — until it's time to do what real beasts do.", source: 'Eric Thomas' },
]

export interface MotivationVideo {
  title: string
  note: string
  /** YouTube search query — always resolves, never a dead link. */
  query: string
}

export const MOTIVATION_VIDEOS: MotivationVideo[] = [
  { title: 'Rise and grind', note: 'Classic workout motivation to get you off the couch.', query: 'best gym motivation speech workout' },
  { title: 'Dunk journey fuel', note: 'Guys documenting the grind from first rim graze to first dunk.', query: 'my dunk journey progression first dunk' },
  { title: 'Speed is a skill', note: 'Sprint training motivation and what max effort really looks like.', query: 'sprint training motivation athletes' },
  { title: 'Discipline over motivation', note: 'For the days when motivation is nowhere to be found.', query: 'discipline over motivation speech' },
  { title: 'The 1% better mindset', note: 'Consistency and small wins compounding over a year.', query: 'atomic habits 1 percent better every day' },
  { title: 'Recomp reality check', note: 'Why body recomposition is slow and how people actually did it.', query: 'body recomposition transformation 1 year natural' },
]
