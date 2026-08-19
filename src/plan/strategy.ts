import type { Goal } from '../types'
import { positionOf, sportOf } from './followups'
import { sportStrategy } from './sportPlan'

// ============================================================
// The plan's thinking, per goal, in plain language.
//
// This came out of generator.ts whole. It is copy, not structure:
// nothing here decides which exercise anybody does, and keeping it
// beside the code that builds templates made the generator's
// allowance carry a hundred and eighty lines of prose. The allowance
// follows it down, because an oversized file that shrinks does not
// get to keep the headroom it earned.
// ============================================================
// ---------- The deep-goal framework ----------
// Every goal family gets the same treatment weight loss got first: the
// real physiology written in plain language, sharpened by the follow-up
// answers, and honest about what the plan actually does. One builder
// per goal; adding depth to a goal (or a new goal) happens here.

export type NutritionNums = { kcalTraining: number; kcalRest: number; proteinTargetG: number }
/**
 * Two lists, not one. `base` is what this goal always says; `personal`
 * is what an ANSWER earned. Keeping them apart is what lets the preview
 * show three bullets and have two of them be about this person — when
 * they were one flat array the personal ones were appended last and were
 * exactly the ones a cut would drop.
 */
type StrategyBuilder = (ans: Record<string, string>, n: NutritionNums) => { base: string[]; personal: string[] }

const STRATEGY: Record<Goal, StrategyBuilder> = {
  lean: (ans, n) => {
    const base = [
      `Training days run ${n.kcalTraining} kcal, rest days ${n.kcalRest}. A deficit your body can hold for months without rebounding.`,
      `Protein holds at ${n.proteinTargetG} g so what you lose is fat, not muscle. Protein-first meals also keep insulin calm, and calm insulin is when fat actually burns.`,
      'Lifting through a cut is not optional: muscle is where blood sugar gets stored and burned, and keeping it is what keeps the weight off after.',
      'The deeper game: whole foods over packaged ones to cool inflammation, fiber and fermented foods for your gut, and a 10-minute walk after meals to flatten the sugar spike.',
    ]
    const personal: string[] = []
    if (ans['food-struggle'] === 'Late at night')
      personal.push('Your leak is late night. Meals front-load earlier so the 11pm pull loses its grip, and the late-night list keeps only safe picks.')
    if (ans['food-struggle'] === 'Drinks and sweets')
      personal.push('Liquid sugar is the fastest insulin spike there is. Swap the drinks first and half the deficit handles itself.')
    if (ans['food-struggle'] === 'Snacking')
      personal.push('Snacking usually means meals run too small. Yours are built bigger and protein-heavy so grazing loses its pull.')
    if (ans['food-struggle'] === 'Big portions')
      personal.push('Portions are pre-decided here: every meal carries its numbers. Eat what is written, skip the guessing.')
    if (ans['day-movement'] === 'Sitting')
      personal.push('Desk days burn less than formulas assume, so your target sits a notch lower and daily walks count as real training.')
    return { base, personal }
  },

  muscle: (ans, n) => {
    const base = [
      `A controlled surplus (${n.kcalTraining} kcal on training days) plus ${n.proteinTargetG} g protein. Big enough to build, small enough to stay lean.`,
      'Muscle grows from tension plus progression: the same lifts come back a little heavier or a rep better. The weight check-ins drive that automatically.',
      `Protein lands harder spread out: roughly ${Math.round(n.proteinTargetG / 4 / 5) * 5} g per meal keeps building all day instead of one giant dinner.`,
      'The growing happens between sessions. Sleep is when growth hormone peaks, and the plan spaces muscle groups so each one recovers before it gets hit again.',
    ]
    const personal: string[] = []
    if (ans['appetite'] === 'Struggle to eat enough')
      personal.push('Eating enough is your real bottleneck, so lean on the calorie-dense picks in your meal plan and liquid calories like shakes and milk.')
    if (ans['appetite'] === 'I can always eat')
      personal.push('A big appetite makes bulking easy and staying lean hard. Keep the surplus at the number, not at the appetite.')
    if (ans['sleep-hours'] === 'Under 6 hours')
      personal.push('Under 6 hours of sleep quietly caps muscle growth and spikes hunger hormones. Treat 7+ as part of the program.')
    if (ans['gain-amount'] === 'As much as I can')
      personal.push('Max growth still has a speed limit: about half a pound a week of actual muscle. The extra calories are in your numbers; patience is on you.')
    return { base, personal }
  },

  strength: (ans, n) => {
    const base = [
      'Strength is a skill before it is a size: the same big lifts return week after week so your nervous system learns to fire everything at once.',
      'Heavy but never to failure: one or two reps always left in the tank keeps every rep fast and clean. Grinding maxes teaches bad patterns.',
      `Protein at ${n.proteinTargetG} g and a small surplus keep the engine fed without adding a gut.`,
    ]
    const personal: string[] = []
    if (ans['bar-years'] === 'Under a year')
      personal.push('Your first year is the golden window: strength can climb almost every session. The plan rides that as long as it lasts.')
    if (ans['bar-years'] === 'Longer')
      personal.push('Past the early window strength moves in waves, not lines. The blocks and deloads in your plan are what make the wave rise.')
    if (ans['maxes-known'] === 'No idea')
      personal.push('No maxes needed. The first two weeks find your working weights through the check-ins, then the numbers climb from there.')
    if (ans['lift-focus'] && ans['lift-focus'] !== 'All of them')
      personal.push(`${ans['lift-focus']} leads its day every week. Priority lifts come first when you are freshest.`)
    return { base, personal }
  },

  vertical: (ans) => {
    const base = [
      'A vertical is rate of force: how much you can put into the ground in a quarter of a second. Everything here feeds that.',
      'Two engines: strength days build force, jump days teach your legs to release it fast. Skipping either caps the other.',
      'Landings are half the workout. Soft, quiet landings build the tendon stiffness that actually returns energy at takeoff.',
    ]
    const personal: string[] = []
    if (ans['limiting'] === 'Strength')
      personal.push('You feel the strength gap, so the lifting days are your growth edge. Treat them like the main event.')
    if (ans['limiting'] === 'Bounce')
      personal.push('Strong but not springy: the jump and sprint days are your edge. Arrive fresh for them, always.')
    if (ans['limiting'] === 'Not sure')
      personal.push('The first block tests both sides. Watch where your numbers move fastest; that is your edge.')
    if (ans['jump-history'] === 'Never')
      personal.push('Jump volume starts a set lighter than standard. Tendons adapt slower than muscles, and rushing that is how people get hurt.')
    if (ans['vert-now'] === 'Touch it')
      personal.push('You are inches away. The last inches come from speed and stiffness, not from more grinding.')
    return { base, personal }
  },

  speed: (ans) => {
    const base = [
      'Nothing trains speed like sprinting. The plan sprints you fresh, short, and sharp, never ground into fatigue.',
      'Full recovery between reps is the point, not a break from it: walk back, reset, go again at true max.',
      'Hamstrings are the engine at top speed. The lifting days load them on purpose, and gradual sprint exposure is what keeps them healthy.',
    ]
    const personal: string[] = []
    if (ans['speed-what'] === 'Changing direction')
      personal.push('Games are won in the first ten yards, so acceleration work gets the priority in your week.')
    if (ans['speed-what'] === 'Top speed')
      personal.push('Top speed is posture and rhythm. The max-velocity days matter most; treat them like game day.')
    if (ans['speed-what'] === 'First few steps')
      personal.push('Expect the first difference in how you move, not on a stopwatch. Fast feet change how everything else feels.')
    if (ans['sprint-feel'] === 'It has been years')
      personal.push('Sprint volume starts a set lighter than standard. Years off means the tissue needs a runway before true max efforts.')
    if (ans['sprint-feel'] === 'Stiff')
      personal.push('Stiff at speed usually means range. The mobility work in your week is not filler; it is where the stride opens up.')
    if (ans['sprint-space'] === 'Treadmill only')
      personal.push('Treadmill sprints work to start. When you can, find open ground: real acceleration is a different animal.')
    return { base, personal }
  },

  general: (ans, n) => {
    const base = [
      'Strength and cardio fitness are two of the strongest health markers there are. This plan trains both on purpose.',
      'Muscle is metabolic armor: it stores and burns blood sugar and keeps insulin in check as you age.',
      `Protein at ${n.proteinTargetG} g and daily movement do more for energy and health markers than any single workout.`,
    ]
    const personal: string[] = []
    if (ans['matters-most'] === 'Look better')
      personal.push('Visible change follows a boring loop: protein, progressive lifts, sleep. The mirror starts moving around week six.')
    if (ans['matters-most'] === 'Health numbers')
      personal.push('Blood pressure, resting heart rate, blood sugar: all of them respond to exactly this mix of lifting, cardio, and walking.')
    if (ans['matters-most'] === 'More energy')
      personal.push('Energy follows training, not the other way around. Give it two weeks of showing up and the afternoons change.')
    if (ans['barrier'] === 'No time')
      personal.push('Sessions are sized for a real day, and busy weeks drop to a smaller tier instead of dropping to zero.')
    if (ans['barrier'] === 'It gets boring')
      personal.push('Exercises rotate every block exactly so this never goes stale.')
    if (ans['barrier'] === 'I get sore')
      personal.push('Soreness fades as you adapt. Volume builds block by block so it never buries you.')
    if (ans['barrier'] === 'No energy')
      personal.push('Start lighter than pride wants. The intensity options at session start exist for low days; use them and keep the streak.')
    if (ans['day-movement'] === 'Sitting')
      personal.push('The biggest win outside the gym: break up the sitting. Short walks count, and the plan nudges you.')
    return { base, personal }
  },

  endurance: (ans, n) => {
    const base = [
      'The 80/20 rule runs this plan: most miles easy enough to talk through, a small dose hard. Easy miles build the engine; running everything medium builds nothing.',
      'Lifting is your injury insurance: strong hips, hamstrings and calves are what survive a training block. The gym days protect the road days.',
      `Mileage needs fuel: ${n.kcalTraining} kcal and ${n.proteinTargetG} g protein on training days keep the legs rebuilding instead of breaking down.`,
    ]
    const personal: string[] = []
    if (ans['race-what'] === 'Marathon')
      personal.push('The marathon is won by the long run: one a week, growing toward 20 mi. Every run you track here gets a goal check against that build.')
    if (ans['race-what'] === 'Half marathon')
      personal.push('The half rewards steady volume: a weekly long run toward 11 mi and honest easy pace everywhere else.')
    if (ans['race-what'] === '5K' || ans['race-what'] === '10K')
      personal.push('Short races are speed on top of base: mostly easy miles, one sharper session a week once the base is in.')
    if (ans['race-what'] === 'Something longer')
      personal.push('Ultras are eating and walking contests with running in between: time on feet beats pace, and practicing fueling every long run is non-negotiable.')
    if (ans['run-now'] === 'Under 10 miles a week')
      personal.push('Base first: add about 10% a week, never more. Tissue adapts slower than lungs, and rushing mileage is how shins and knees quit.')
    if (ans['race-when'] === 'Under 3 months')
      personal.push('Race is close, so specificity wins: long runs and race-pace segments matter more than anything new.')
    return { base, personal }
  },
}

/**
 * The plan's thinking, written out per goal: real physiology, sharpened
 * by the follow-up answers. Shown on the booklet preview and pinned to
 * the Record on day one. Capped so nobody drowns in bullets.
 */
export function deepGoalStrategy(goal: Goal, ans: Record<string, string>, n: NutritionNums): string[] {
  const { base, personal } = STRATEGY[goal](ans, n)
  // The numbers first, because they are what the rest hangs off. Then
  // everything their answers bought, then the rest of the standard read.
  const sport = sportStrategy(sportOf(ans), positionOf(ans))
  return [base[0], ...sport, ...personal, ...base.slice(1)].filter(Boolean).slice(0, 6)
}
