// ============================================================
// The NAOD V3 education content, readable in-app (Coach tab).
// Transcribed from the PDF so the "why" is never more than
// two taps away.
// ============================================================

export interface GuideSection {
  id: string
  title: string
  paragraphs: string[]
  bullets?: string[]
}

export const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'goal',
    title: 'The Goal',
    paragraphs: [
      'Physique: athletic, explosive, muscular, functional, and aesthetically sharp. Wide shoulders, big upper chest, wide lats, strong arms, thick legs. Visible abs, smaller waist.',
      'Athletic: consistent dunking and a higher vertical. Faster sprint speed and more power. More overall strength.',
      '12-month targets: ~195 lb lean and muscular, 12-15% body fat, 16"+ arms, consistent dunks.',
    ],
  },
  {
    id: 'how-it-works',
    title: 'How the Plan Works',
    paragraphs: [
      'Five training days, two true rest days. Power and jumps come early in the week on fresh legs. Strength and hypertrophy come later. This protects your recovery so your vertical goes up, not down, and it survives a DJ gig or a long shift on your feet.',
    ],
    bullets: [
      'Monday — Acceleration + Two-Foot Power, then lower lifts',
      'Tuesday — Push (Chest / Shoulders / Triceps) + Shoulder Health',
      'Wednesday — Lower Strength + Hypertrophy',
      'Thursday — Mobility + Active Recovery OR Cardio Backup',
      'Friday — Pull (Back / Biceps / Rear Delts) + Grip + Shoulder Health',
      'Saturday — Max Speed + One-Foot + Multidirectional, then arms',
      'Sunday — Rest',
    ],
  },
  {
    id: 'speed-jump',
    title: 'Speed + Jump Development',
    paragraphs: [
      'Four explosive qualities matter for you: first step, top sprint speed, two-foot jump, and one-foot jump. They split cleanly into two groups, so they live on two different days. The rule that makes it all work: every explosive thing gets done FRESH, before you tire your legs out. Speed and jump work always come first in the session, lifts and arms after.',
      'Monday — catch force, then produce it. V4 starts with snap-downs to stick (landing is a skill, and it protects everything else), then falling starts, max countermovement jumps, and broad jumps to stick. Acceleration and two-foot power on completely fresh legs. Your squat/RDL/hip thrust strength feeds all of it. This is your natural strength. You are just sharpening it and learning to catch it.',
      'Saturday — speed, springs, and cuts. Max-velocity and flying sprints build the back half of your sprint. TRUE max effort, full recovery, never tired, which is why they go first. V4 adds the multidirectional layer: lateral bounds to stick and the 5-10-5 shuttle train the sideways force and braking that games actually run on. Then the money jump: the penultimate-step approach converts your speed into height through one long-low, short-quick plant.',
    ],
  },
  {
    id: 'penultimate',
    title: 'The Penultimate Step',
    paragraphs: [
      'The single most important piece of the one-foot jump is the penultimate step, the second-to-last step of your run-up. You lower your hips there to load the plant leg, then fire fast off one foot and drive the opposite knee up.',
      'Most converting jumpers stay too upright and lose all their height. Practice the run-up rhythm as much as the strength.',
    ],
  },
  {
    id: 'reality-checks',
    title: 'Two Reality Checks',
    paragraphs: [
      'One-foot jump: when you first switch to one foot it will feel WEAKER than your two-foot jump. Normal. The elasticity takes weeks. It climbs steadily, and for many converted jumpers it eventually passes the two-foot number because you keep all your run-up momentum. Do not quit in the first month.',
      'Pickup ball: a hard run is basically a sprint and jump session. Do not play hard the day before or the morning of Monday or Saturday, or you will be doing your speed work pre-fatigued. If you ball hard the day before, swap that day to rest or lifting only.',
    ],
  },
  {
    id: 'blocks',
    title: '4-Week Block Rotation',
    paragraphs: [
      'Run each block for 4 weeks, then swap. CORE movers stay fixed the whole year so you can progressively overload them and watch the numbers climb: squat pattern, Romanian deadlift, hip thrust, max-velocity sprints, falling-start sprints, countermovement jumps, approach jumps, pull-ups, overhead press, incline press.',
      'Only the accessories and variations rotate, which keeps things fresh and spreads stress across slightly different angles so the same joints are not grinding the identical groove all year. After Block 3 it loops back to Block 1.',
      'Rotation is for variety and joint health, not for cutting fatigue. Fatigue is handled by the trimmed volume on each day. Don't add the old exercises back in. The trim is the point.',
    ],
  },
  {
    id: 'deload',
    title: 'Deload Every 4th Week (Non-negotiable)',
    paragraphs: [
      'The last week of each 4-week block is a DELOAD. You are running max-effort sprints and jumps twice a week plus lifting plus pickup. Without a lighter week the fatigue stacks until you stall or get hurt.',
      'Then the new block starts fresh and you will often hit new numbers right after. Deloading is when the adaptation actually catches up.',
    ],
    bullets: [
      'Cut all lifting sets roughly in half (keep the weight, drop the volume)',
      'Sprints and jumps: HALF the reps, still full effort but fewer of them',
      'Keep mobility and easy walks as normal',
      'Leave every session feeling like you could have done more. That is the point.',
    ],
  },
  {
    id: 'readiness',
    title: 'Daily Readiness Check',
    paragraphs: [
      'Before any CNS day (Monday or Saturday), check in with yourself. If two or more of these are true, downgrade the day: drop the sprint/jump volume by a third and keep the lifts light.',
      'On a max-speed or max-jump day, fast and fresh beats tired and grinding every time. Backing off a fatigued day isn't weakness. It's how pros stay healthy enough to train all year.',
    ],
    bullets: [
      'Slept under 6 hours',
      'Resting heart rate feels elevated or you feel wired/run-down',
      'Legs still sore or heavy from the last session',
      'Genuinely low energy or motivation, not just lazy',
    ],
  },
  {
    id: 'tiers',
    title: 'Time-Crunch Fallback Tiers',
    paragraphs: [
      'Life is going to get in the way. Work, gigs, all of it. These tiers are the plan surviving a busy month instead of dying in week three. Dropping to a lower tier is a PLANNED CHOICE, not a failure. You pick the tier at the start of the week, hit it, and the week counts as a win.',
      'TIER 1 — Full week (5 days). The plan as written. Run this whenever life allows.',
      'TIER 2 — Fallback week (3 days). The Saturday session (your athletic progress lives here), lower strength, and upper combined. Space them however the week allows. Steps still count. Skip the formal cardio.',
      'TIER 3 — Bare minimum (2 days). One explosive session and one full-body lift. You are holding ground, not progressing, until the week clears.',
      'A 3-day week you actually complete beats a 5-day week you abandon on Wednesday. Consistency across a year is the whole game.',
    ],
    bullets: [
      'Pick the tier at the START of the week based on what you honestly have. Do not decide day by day.',
      'Never drop the explosive day. It is the first thing people cut and the fastest thing to lose.',
      'Cardio goes FIRST when time is tight. Steps are free.',
      'Protein does NOT drop with the tier.',
      'Two fallback weeks in a row is fine. A month of them means the schedule needs a real look, not more willpower.',
    ],
  },
  {
    id: 'session-length',
    title: 'Keeping Sessions to About an Hour',
    paragraphs: [
      'If a session runs long, cut from the BOTTOM of the list, never the top. The explosive work and main lifts ARE the session; the accessories are the tail. Dropping a set of calf raises or a curl costs you nothing. Dropping sprint quality costs you the goal.',
    ],
  },
  {
    id: 'gigs',
    title: 'Gig + Work Flexibility Rules',
    paragraphs: [
      'DJ sets and long venue shifts are real leg fatigue and lost sleep. Respect them.',
    ],
    bullets: [
      'DJ Friday night: move the Friday pull session to that morning, or push it to Saturday as a lighter combined day. Never lift heavy on 4 hours of sleep.',
      'DJ Saturday night: do sprints/jumps earlier in the day, or skip them if your legs are dead from standing. Jumping fatigued teaches bad mechanics.',
      'Long shift on your feet before Monday: drop a jump set or two. The legs are pre-fatigued.',
      'Two bad sleep nights in a row: cut that day\'s volume by a third. No heroics. The plan resets tomorrow.',
      'A gig or full shift counts toward your daily steps. Do not grind extra cardio on top.',
    ],
  },
  {
    id: 'nutrition',
    title: 'Nutrition — The Numbers',
    paragraphs: [
      'Recomp at your size. Eat more on training days, less on rest days. The protein number is the one you never miss.',
      'Training day: 2,800 kcal · 200 g protein, 300 g carbs, 70-80 g fat. Rest day: 2,500 kcal · 200 g protein, 225 g carbs, 70-80 g fat.',
      'Check-in rule: if after 3 to 4 weeks the scale is not creeping up while your strength climbs, add 150 to 200 calories to training days. Recomp is slow. Do not panic-cut.',
      'Late night if hungry? Yes: casein shake, cottage cheese, protein pudding, Greek yogurt. No: fast food, pizza, chips, big portions, heavy desserts.',
    ],
  },
  {
    id: 'tracking',
    title: 'Track Weekly',
    paragraphs: [
      'Same morning each week (Sunday is good), same conditions. Write it down or it did not happen: weight, waist, chest, arms, thigh, vertical/rim touch.',
      'Progress photos: front, side, back, same lighting.',
    ],
  },
  {
    id: 'honest-note',
    title: 'The One Honest Note',
    paragraphs: [
      'You are at 197 and you want to STAY around this weight while getting visibly muscular and athletic. That is a recomp, not a cut to a smaller number. The scale will barely move; the waist and the mirror are your real feedback.',
      'Losing the lower-belly fat while holding this mass is what turns 197 from "kinda big" into "clearly built". It is a 12-month project, not a 12-week one. Treat the targets as a direction, not a deadline.',
      'Do the work. Track the numbers. Adjust every 4 weeks.',
    ],
  },
]
