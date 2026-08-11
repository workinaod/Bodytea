import type { CoachSituation, CopyFlavor } from '../types'

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
      "One skip. Fine. It's logged, timestamp and all. Make it the last one this month.",
      "No proof, no sympathy. I wrote it down. One of these is survivable. A second is a choice.",
      "Skipped, no receipts. Noted. Your goals didn't take the day off.",
      "Alright, skipping with nothing to show. The ledger remembers even if you won't.",
      "Today: skipped, unproven. Not mad. Just keeping records. Lots of records.",
    ],
  },
  {
    id: 'skip-np-1',
    situation: 'skip-no-proof',
    level: 1,
    variants: [
      "That's TWO unproven skips in 30 days. Last one was {dates}. Show me a calendar or show me a workout.",
      "Second one this month ({dates} was the first). 'Busy' with no proof twice starts to smell like a habit.",
      "You skipped on {dates} too. No proof then, none now. The rim doesn't care about vibes, only reps.",
      "Two skips, zero evidence. Your vertical is watching you make choices right now.",
      "Pattern forming: {dates}, now today. I catch patterns early. Literally my job.",
    ],
  },
  {
    id: 'skip-np-2',
    situation: 'skip-no-proof',
    level: 2,
    variants: [
      "That's {count} unproven skips this month: {dates}, now today. Calendar photo or it didn't happen.",
      "{count} skips, zero receipts: {dates}. 'Busy' is turning into a bedtime story. Prove it or train.",
      "Your file reads: {dates}. All 'busy'. All unproven. Know who else was busy? Everyone who ever dunked.",
      "{count} no-proof skips in 30 days. I'd call it a slump but slumps end. Show evidence or show up.",
      "The receipts say {dates}. You're not busy, you're negotiating. Bring proof or bring shoes.",
    ],
  },
  {
    id: 'skip-np-3',
    situation: 'skip-no-proof',
    level: 3,
    variants: [
      "Your own plan says it: a month of fallback weeks means the schedule needs a real look, not more willpower. {count} unproven skips ({dates}). Fix the week Sunday or admit the goal changed.",
      "{count} skips this month, zero evidence. This stopped being about motivation. Rebuild the week Sunday or tell me the dunk's off.",
      "I'm out of speeches. {dates}. Tier 3 is TWO days a week, built exactly for this. If two days is too many, time isn't the problem.",
      "Straight talk: {count} unproven skips. Either the schedule is actually broken (fixable: Tier picker, Sunday, 10 minutes) or you're lying to your own logbook. Pick one.",
    ],
  },

  // ---------- Skipping WITH proof — respect ----------
  {
    id: 'skip-proof',
    situation: 'skip-with-proof',
    variants: [
      'Proof received. A planned choice, not a failure. Protein is still {proteinTarget} g today. That part never drops.',
      'Evidence checks out. Life happens, the plan is built for it. Hit your protein, sleep well, go again tomorrow.',
      'Receipt logged. This is how you miss a day: honestly, with a plan. No mark on the record.',
      "Real conflict, not an excuse. Logged as planned. The comeback session is already waiting.",
      "Fair enough, the calendar doesn't lie. Rest smart: steps, protein, water. Tomorrow we collect.",
      'Documented and accepted. Missing with a reason beats grinding into the ground. Protein stays at {proteinTarget} g though.',
    ],
  },

  // ---------- Lightening a day ----------
  {
    id: 'lighten',
    situation: 'lighten',
    variants: [
      'Lighter day it is. 70% beats a heroic zero. Main lifts still count. Skip the fluff, keep the iron.',
      'Volume trimmed. Smart, not soft. The plan cuts from the bottom of the list, never the top.',
      'Downgraded, not cancelled. Big difference. Quality reps on the money exercises, then get out.',
      'A trimmed session logged beats ten perfect ones imagined. Top of the list, skip the tail.',
    ],
  },

  // ---------- Tier drops ----------
  {
    id: 'tier-drop-planned',
    situation: 'tier-drop-planned',
    variants: [
      'Tier {tier} picked at the start of the week. Exactly how it should go. Hit these days and the week counts as a FULL win.',
      'Tier {tier} locked. A planned fallback beats an abandoned full week every time. Now hit every session on it.',
      'Smart call made early. Tier {tier} this week: fewer days, same standards. Explosive day is still sacred.',
      'Tier {tier}, chosen up front like a pro. Protein stays at {proteinTarget} g. Steps still count. Go.',
    ],
  },
  {
    id: 'tier-drop-midweek',
    situation: 'tier-drop-midweek',
    variants: [
      "Dropping tiers MID-week? You pick at the START. Day-by-day deciding is how weeks die. Your reason's on the record and I'll quote it back if this becomes a pattern.",
      "Mid-week tier drop. That's not planning, that's renegotiating with yourself. Your words are logged. Make sure they'd survive being read out loud.",
      'You know the rule: tier at the start of the week, not when it gets hard. Reason goes in the record. Next week gets picked Monday.',
      "Changing the deal halfway through. Fine, it's on the record. Sunday: pick honestly, then DON'T renegotiate.",
    ],
  },

  // ---------- Unexplained misses (reconcile) ----------
  {
    id: 'unexplained-miss',
    situation: 'unexplained-miss',
    variants: [
      "{date} came and went. No log, no excuse, no proof. Silence isn't neutral. It's a skip with extra cowardice. What happened?",
      'Found a hole in the record: {date}. You trained, you skipped, or you hid. Pick the true one.',
      "A day went missing ({date}). I don't do missing days. Account for it and we move on.",
      '{date}: nothing logged. The record only works if it\'s honest. What actually happened?',
      "You ghosted {date}. I notice everything, that's the whole point of me. Takes ten seconds to explain.",
    ],
  },

  // ---------- Minimum viable taken ----------
  {
    id: 'minimum-taken',
    situation: 'minimum-taken',
    variants: [
      "THAT'S what I want to see. Couldn't do the whole thing, did something anyway. That's how streaks survive real life.",
      'The minimum on a bad day is worth more than the maximum on an easy one. Logged as a win.',
      'Ten minutes of showing up beats zero minutes of intending to. The habit lives another day.',
      "You negotiated DOWN instead of OUT. That's the difference between making it and restarting every January.",
      'Small session, full credit. Consistency is the whole game.',
    ],
  },

  // ---------- Comeback after a miss ----------
  {
    id: 'comeback',
    situation: 'comeback',
    variants: [
      "Back in the building. The last session is ancient history. This one's the only one that exists. Go.",
      'A miss then a comeback is called training. A miss then a spiral is called quitting. You chose right.',
      "Good. You came back before the couch got comfortable. That's the skill nobody talks about.",
      "The plan never left. Glad you didn't either. Pick up where the numbers say.",
      "One day off didn't kill the goal. Two might have started to. Well timed.",
    ],
  },

  // ---------- Streak milestones ----------
  {
    id: 'streak',
    situation: 'streak',
    variants: [
      '{streak} sessions without a miss. That\'s what "consistent" looks like in actual data.',
      '{streak}-session streak. The vertical gets built exactly like this: boring, repeated showing up.',
      '{streak} in a row. Somewhere a version of you that skipped is wondering why the rim still feels far. Not your problem.',
      'Streak: {streak}. Protect it like a PR, because it is one.',
      "{streak} straight. Know what's rarer than talent? This. Keep stacking.",
      "That's {streak} on the bounce. The plan works when it's boring. You're making it boring. Beautiful.",
    ],
  },

  // ---------- PRs ----------
  {
    id: 'pr',
    situation: 'pr',
    variants: [
      'PR on {exercise}. The numbers went UP because you showed up. Write that formula down.',
      "New best on {exercise}. That's progressive overload doing exactly what it promised.",
      '{exercise}: personal record. This is why the core movers never rotate. Watch the line climb.',
      'PR: {exercise}. Strength banked now turns into inches on the vertical later. Good trade.',
      "{exercise} just moved. Recomp lies on the scale but it can't lie on the bar.",
      "New {exercise} record. Quietly, week by week, you're getting hard to guard. Continue.",
    ],
  },

  // ---------- Deload start ----------
  {
    id: 'deload-start',
    situation: 'deload-start',
    variants: [
      'DELOAD WEEK. Sets cut in half, weights stay. Not a vacation, it\'s when the adaptation catches up. Leave every session feeling like you could do more.',
      "Week 4: deload. The discipline this week is doing LESS on purpose. Add sets back and you're stealing from next block's PRs.",
      'Deload week is live. Half the sets, full effort, zero grinding. Pros deload. The injured skip it.',
      'This week the plan protects you from yourself: half volume, same weights. Finish every session annoyingly fresh.',
    ],
  },

  // ---------- Week complete ----------
  {
    id: 'week-complete',
    situation: 'week-complete',
    variants: [
      'Week {weekIndex} complete. Every scheduled session accounted for. Professional week.',
      'Week {weekIndex}: done in full. Stack about forty more and the mirror stops arguing with you.',
      'Full week banked. The plan only asks for weeks like this, one at a time.',
      "Week {weekIndex} closed out clean. Consistency is a receipt, and you just printed one.",
      'Another complete week in the books. This is what a 12-month project looks like up close.',
    ],
  },

  // ---------- Protein ----------
  {
    id: 'protein-miss',
    situation: 'protein-miss',
    variants: [
      "Yesterday's protein: {protein} g of {proteinTarget}. The one number you NEVER miss. Fix it today, first meal.",
      'Protein came in short yesterday ({protein} g). Training tears it down, protein rebuilds it. You did half the job.',
      '{protein} g yesterday. Muscle through a recomp is bought with food. Hit {proteinTarget} today.',
      'Short on protein again: {protein} g. Skipping workouts wrecks weeks. Skipping protein wrecks the workouts you DID do.',
      "{protein} g isn't {proteinTarget} g. A shake and some Greek yogurt closes most gaps in 5 minutes.",
    ],
  },
  {
    id: 'protein-streak',
    situation: 'protein-streak',
    variants: [
      '{streak} straight days at {proteinTarget}+ g protein. The most boring superpower in fitness, fully operational.',
      'Protein target hit {streak} days running. The invisible half of the recomp, working.',
      '{streak} days of {proteinTarget} g. The number you never miss, and you didn\'t. The mirror will notice.',
      'Protein streak: {streak}. Meals are training. You are currently undefeated.',
    ],
  },

  // ---------- Chronic fallback ----------
  {
    id: 'chronic-fallback',
    situation: 'chronic-fallback',
    variants: [
      "That's {count} fallback weeks in the last 5. Your own plan's rule: a month of them means the schedule needs a REAL look, not more willpower. Sunday. Calendar. Rebuild.",
      '{count} of the last 5 weeks on reduced tiers. Two in a row is fine. This is a trend. Move the sessions to where your life actually has room.',
      'Fallback weeks: {count} of 5. The plan flagged exactly this. Not a character problem, a scheduling problem. Solve it like one.',
    ],
  },

  // ---------- Backup nudge ----------
  {
    id: 'backup-nudge',
    situation: 'backup-nudge',
    variants: [
      'No backup in {count} days. All your logs live on THIS phone. One tap in Coach → Export. Thank me at your next phone upgrade.',
      '{count} days since your last export. Browsers eat data without asking. Takes seconds. Go.',
      'Your streak, PRs, and receipts exist in exactly one place right now. {count} days unbacked. Export. Today.',
    ],
  },

  // ---------- "Need a push" ----------
  {
    id: 'push',
    situation: 'push',
    variants: [
      "Be honest: half the reason anyone trains is to look good naked. That's not shallow, that's fuel. Use it.",
      "There's always a beach day, a pool day, a wedding. Your body gets seen. Train for the day it does.",
      'You wrote it down: "{goal}" That gets built on days exactly like this one. Not from the couch.',
      'People notice arms, posture, how clothes sit. Nobody ever notices the reasons you skipped.',
      "Catch your reflection and either like it or look away fast. Today's session picks which one you get.",
      "That first \"you been working out?\" feels better than any night off ever did. It's closer than you think.",
      'The mirror runs on a delay. What you see in 30 days is being decided right now.',
      'You know that quiet mad-at-yourself feeling after a skip. Trade it for sore and smug.',
      "Somebody with your exact schedule and your exact excuses is training right now. They'll look like it.",
      "Skip today and nothing happens. That's the trap. Nothing keeps happening, and the mirror stays exactly where it is.",
    ],
  },

  // ---------- Session done (generic reactions) ----------
  {
    id: 'session-done',
    situation: 'session-done',
    variants: [
      'Work banked. Recovery starts NOW. The session tears it down, the next 24 hours build it back.',
      "Done and logged. The difference between you and last-year you is a stack of days exactly like this one.",
      "Session complete. Nothing flashy, everything counted. That's the whole method.",
      'Another deposit in the account. The vertical, the arms, the waist all draw from the same balance.',
      'Logged. The plan held up its end, you held up yours.',
      "That's the work. Now the boring champion stuff: eat, hydrate, sleep like it's your job.",
      "Clocked out. Today's reps are already turning into next month's numbers.",
      'Good session. The mirror runs six weeks behind the logbook. Keep feeding the logbook.',
    ],
  },

  // ---------- Contradiction heuristics ----------
  {
    id: 'contradiction-sick-pr',
    situation: 'contradiction',
    variants: [
      "Miraculous recovery. 'Sick' yesterday, PR today. Happy for your immune system, suspicious of your yesterday.",
      "Yesterday: too sick to train. Today: personal record. One of those days is lying and it isn't today.",
      'Deathbed to PR in 24 hours. Medical journals would love you. The ledger just raises an eyebrow.',
    ],
  },
  {
    id: 'contradiction-busy-meals',
    situation: 'contradiction',
    variants: [
      "'No time to train', but 5 meals logged on time with servings. So there WAS time. Just no training.",
      'Busy day, huh? Your meal log shows a man with his schedule under control. The workout was 40 minutes. Just saying.',
      'Too busy for the gym but not too busy for a 5-entry food log. The evidence cuts both ways, chief.',
    ],
  },
  {
    id: 'contradiction-tier-full',
    situation: 'contradiction',
    variants: [
      'So you had it in you. Tier-dropped Monday, then logged a FULL session Wednesday. Next week: pick the real tier.',
      'You downgraded the week, then trained like Tier 1 anyway. Great session, terrible forecast. Plan honestly Sunday.',
      "The week you called 'brutal' had a full voluntary session in it. Noted for the next time you plead busy.",
    ],
  },

  // ---------- Explosive day protection ----------
  {
    id: 'explosive-day-warning',
    situation: 'explosive-day-warning',
    variants: [
      "You're about to skip the EXPLOSIVE day, the one the plan says never to drop. First thing people cut, fastest thing to lose. The 12-minute version exists. Take it.",
      'Not the explosive day. Anything but that one. Speed leaves quietly and comes back slow. Move it to another day if you must, just don\'t delete it.',
      "Skipping speed work costs triple: today's stimulus, next week's timing, next month's inches. Reschedule it, shrink it, don't zero it.",
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

const CORE_VIDEOS: MotivationVideo[] = [
  { title: 'Rise and grind', note: 'Classic workout motivation to get you off the couch.', query: 'best gym motivation speech workout' },
  { title: 'Discipline over motivation', note: 'For the days when motivation is nowhere to be found.', query: 'discipline over motivation speech' },
  { title: 'The 1% better mindset', note: 'Consistency and small wins compounding over a year.', query: 'atomic habits 1 percent better every day' },
]

// The fuel matches the mission: dunk journeys for the vertical chasers,
// transformations for physique goals, hybrid grind for everyone else.
const FLAVOR_VIDEOS: Record<CopyFlavor, MotivationVideo[]> = {
  explosive: [
    { title: 'Dunk journey fuel', note: 'Guys documenting the grind from first rim graze to first dunk.', query: 'my dunk journey progression first dunk' },
    { title: 'Speed is a skill', note: 'Sprint training motivation and what max effort really looks like.', query: 'sprint training motivation athletes' },
    { title: 'Bounce science', note: 'How real vertical jump programs get built, and why yours looks like this.', query: 'vertical jump training explained science' },
  ],
  physique: [
    { title: 'One-year naturals', note: 'Honest 12-month transformations. What a year of showing up buys.', query: 'natural body transformation 1 year gym' },
    { title: 'Eat big, lift big', note: 'Why the kitchen builds what the gym only sketches.', query: 'eating for muscle growth explained' },
    { title: 'Recomp reality check', note: 'Why body recomposition is slow and how people actually did it.', query: 'body recomposition transformation 1 year natural' },
  ],
  general: [
    { title: 'Hybrid athlete life', note: 'Strong AND conditioned, training for everything at once.', query: 'hybrid athlete training motivation' },
    { title: 'Consistency wins', note: 'Ordinary people, extraordinary streaks.', query: 'gym consistency transformation motivation' },
    { title: 'Recomp reality check', note: 'Why body recomposition is slow and how people actually did it.', query: 'body recomposition transformation 1 year natural' },
  ],
}

/** The pep-talk video shelf, personalized to this user's plan flavor. */
export function fuelVideosFor(flavor: CopyFlavor): MotivationVideo[] {
  return [...FLAVOR_VIDEOS[flavor], ...CORE_VIDEOS]
}
