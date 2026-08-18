import type { ExerciseDef } from '../types'
import type { AthleticMeta } from './athletic'

// ============================================================
// The drills the athletic library was missing, found by asking
// it the same question the equipment profiles were asked.
//
// 91 drills across 19 qualities looks like plenty until you
// count per quality and per LEVEL, at which point three real
// holes appear:
//
//   DECELERATION HAD NO FOUNDATION ENTRY. Six drills, three of
//   them advanced, and nothing anybody new could start on —
//   while change-of-direction had six advanced options. That
//   ordering is backwards and it is the specific backwards that
//   hurts people: stopping is the prerequisite for cutting, not
//   a refinement of it. The forces are highest in the braking
//   step, which is also the step non-contact knee injuries
//   overwhelmingly happen in. A library that will teach you to
//   cut before it teaches you to stop is not neutral, it is
//   pointed the wrong way.
//
//   ROTATIONAL POWER HAD ONE DRILL. One. For every sport built
//   on a throw, a swing or a shot, that is a whole quality with
//   a single option and nowhere to go from it.
//
//   MAX VELOCITY AND REACTIVE AGILITY HAD NO FOUNDATION EITHER,
//   which is the same problem in a less dangerous place: the
//   only way in was through drills marked intermediate or above.
//
// Separate module purely because athleticExercises.ts is at its
// size allowance; these belong to the same library and merge
// with it if that file is ever split by quality.
// ============================================================

const E = (def: ExerciseDef) => def

export const ATHLETIC_COVERAGE_EXERCISES: ExerciseDef[] = [
  // ---------------- Deceleration: the missing entry point ----------------
  E({
    id: 'jog-to-stop',
    name: 'Jog to a Two-Foot Stop',
    kind: 'sprint',
    equipment: 'Open space',
    steps: [
      'Jog forward at about half speed toward a line or a cone.',
      'Two or three yards out, sink your hips, widen your base, and stop on BOTH feet at the line.',
      'Hold the landing for a count of two. Chest up, knees over the middle of your feet, not caving inward.',
    ],
    targets: {
      muscles: ['Quads', 'Glutes', 'Hamstrings', 'Calves'],
      qualities: ['Deceleration', 'Force absorption', 'Landing mechanics'],
    },
    why: 'Every cut, every change of direction and every landing is a braking problem before it is a producing one, and the braking step is where the forces are highest and where non-contact knee injuries overwhelmingly happen. This is the slowest, safest version of that skill, and it is the one the library had no entry for. Own it before anything asks you to stop at speed.',
    mistakes: [
      'Stopping on one foot. Two feet first; one comes later and only once two is clean.',
      'Knees collapsing inward on the stop, which is the exact position to be training away from.',
      'Stopping upright with straight legs. If the hips do not sink, nothing is absorbing anything.',
    ],
    cue: 'Sink, widen, stick. Hold for two.',
    videoQuery: 'deceleration two foot stop drill technique',
    restSec: 60,
  }),
  E({
    id: 'decel-to-backpedal',
    name: 'Decelerate to Backpedal',
    kind: 'sprint',
    equipment: 'Open space',
    steps: [
      'Jog forward to a line, stop under control on both feet.',
      'Immediately backpedal five yards, staying low with short steps and the chest over the knees.',
      'Walk back. The stop is the drill; the backpedal is what proves you actually stopped in balance.',
    ],
    targets: {
      muscles: ['Quads', 'Glutes', 'Hamstrings'],
      qualities: ['Deceleration', 'Balance under load', 'Re-acceleration'],
    },
    why: 'A stop you cannot immediately move out of is a fall you got away with. Adding the backpedal makes balance non-negotiable, and it rehearses the actual sequence a defender lives in: arrive, stop, go the other way. This is the step between stopping on a line and cutting at speed.',
    mistakes: [
      'Standing up between the stop and the backpedal, which loses every bit of the position.',
      'Crossing the feet on the backpedal instead of pushing back with short steps.',
      'Rushing the stop to get to the backpedal. The stop is the point.',
    ],
    cue: 'Stop in balance, then move. No standing up in between.',
    videoQuery: 'deceleration backpedal drill agility technique',
    restSec: 75,
  }),
  // ---------------- Reactive agility: the missing entry point ----------------
  E({
    id: 'reaction-start',
    name: 'Reaction Start',
    kind: 'sprint',
    equipment: 'Open space (a partner or the app cues it)',
    steps: [
      'Stand in an athletic stance, feet under the hips, weight forward on the balls of the feet.',
      'On the cue (a shout, a clap, a hand drop) accelerate five yards as fast as you can.',
      'Full recovery between reps. This is a reaction drill, not conditioning; a tired reaction is not a reaction.',
    ],
    targets: {
      muscles: ['Glutes', 'Quads', 'Calves'],
      qualities: ['Reactive agility', 'Acceleration', 'First step'],
    },
    why: 'Every agility drill in this library above foundation level asks you to react to something, and there was no simple version to start on. Reacting to a cue rather than to your own count is the whole difference between a drill and a sport skill, and five yards off a shout is the cheapest possible way to train it.',
    mistakes: [
      'Anticipating the cue by rocking or pre-loading, which trains guessing rather than reacting.',
      'Short rest. Reaction quality falls off a cliff when tired and you end up practising being slow.',
      'Standing too upright to start. The stance should already look like it wants to go.',
    ],
    cue: 'Still, then gone. React, do not guess.',
    videoQuery: 'reaction start drill first step acceleration',
    restSec: 90,
  }),
  // ---------------- Max velocity: the missing entry point ----------------
  E({
    id: 'relaxed-stride',
    name: 'Relaxed Strides (60-70%)',
    kind: 'sprint',
    equipment: 'Field / track (40-60 yd)',
    steps: [
      'Build gradually over the first fifteen yards to about two-thirds effort.',
      'Hold that speed for twenty to thirty yards with a tall posture, loose jaw and shoulders, arms swinging from the shoulder.',
      'Ease down over the last stretch rather than stopping dead. Walk back fully.',
    ],
    targets: {
      muscles: ['Hamstrings', 'Glutes', 'Calves', 'Hip flexors'],
      qualities: ['Sprint mechanics', 'Relaxation at speed', 'Max velocity entry'],
    },
    why: 'Top-speed work had no foundation entry at all: every option was intermediate or advanced, which is a poor way to introduce the highest-force thing a body does. Strides give you the posture and rhythm of fast running at an effort that will not pull a hamstring, and relaxation at speed is a trained skill rather than a personality trait.',
    mistakes: [
      'Treating it as a race. Two-thirds effort means it should feel almost easy.',
      'Straining the face, neck and shoulders, which is tension that costs speed everywhere else.',
      'Stopping abruptly at the end instead of easing down.',
    ],
    cue: 'Tall, loose, two-thirds. Ease down, do not stop dead.',
    videoQuery: 'relaxed strides sprint mechanics submaximal technique',
    restSec: 120,
  }),
  // ---------------- Rotational power: a quality with one drill ----------------
  E({
    id: 'mb-side-throw',
    name: 'Medicine Ball Side Throw',
    kind: 'jump',
    equipment: 'Medicine ball (6-12 lb) + a wall',
    steps: [
      'Stand side-on to a wall, about an arm and a ball away, feet a little wider than the hips.',
      'Take the ball back across the body, load into the back hip, then drive that hip through and throw the ball into the wall as hard as you can.',
      'Catch or collect it and reset. Every rep is maximal; the moment they stop being sharp, the set is over.',
    ],
    targets: {
      muscles: ['Obliques', 'Glutes', 'Abs', 'Chest'],
      qualities: ['Rotational power', 'Hip-to-shoulder separation'],
    },
    why: 'Rotational power had exactly one drill in the whole library, which is a strange gap for anything involving a throw, a swing or a shot. Power in rotation comes from the hips leading and the shoulders following, and a throw is the only way to train that at full speed, because it is the only version where nothing has to be decelerated at the end.',
    mistakes: [
      'Throwing with the arms. The arms are the last link; if the hip does not go first there is no power in it.',
      'Feet stuck flat. The back foot should pivot as the hip drives through.',
      'Grinding out reps once the speed drops, which trains a slow version of a fast quality.',
    ],
    cue: 'Hip first, arms last. Every rep maximal.',
    videoQuery: 'medicine ball rotational side throw wall technique',
    restSec: 90,
  }),
  E({
    id: 'mb-step-through-throw',
    name: 'Step-Through Rotational Throw',
    kind: 'jump',
    equipment: 'Medicine ball (6-12 lb) + open space',
    steps: [
      'Start side-on with the ball at the back hip, weight loaded on the back leg.',
      'Step through with the back leg as you rotate, so the throw finishes with your weight transferring forward and across, and release the ball as far as you can.',
      'Full reset every rep. Alternate sides across the set.',
    ],
    targets: {
      muscles: ['Obliques', 'Glutes', 'Abs', 'Quads'],
      qualities: ['Rotational power', 'Weight transfer', 'Full-body sequencing'],
    },
    why: 'The side throw trains rotation from a fixed base; this adds the step, which is what rotation looks like in every sport that actually uses it. It is the harder version and it belongs above the side throw rather than beside it: sequencing a step, a rotation and a release is a coordination problem before it is a power one.',
    mistakes: [
      'Stepping and rotating as separate events instead of one movement.',
      'Falling forward rather than transferring through a stable front leg.',
      'Using a ball heavy enough to slow the throw down. Light and fast beats heavy and laboured here.',
    ],
    cue: 'Step and turn as one thing. Throw it a mile.',
    videoQuery: 'step through rotational medicine ball throw power',
    restSec: 105,
  }),
  // ---------------- Foot and ankle: a quality with nowhere to go ----------------
  E({
    id: 'single-leg-pogo-hold',
    name: 'Single-Leg Pogo to Stick',
    kind: 'jump',
    equipment: 'Firm floor',
    steps: [
      'Hop in place on one foot three times, staying tall with a stiff ankle and barely bending the knee.',
      'On the fourth, land and STICK it, absolutely still, for a count of three.',
      'The stick is the rep. If you wobble or have to put the other foot down, the set is done.',
    ],
    targets: {
      muscles: ['Calves', 'Feet', 'Quads', 'Glutes'],
      qualities: ['Ankle stiffness', 'Foot strength', 'Single-leg landing control'],
    },
    why: 'Foot and ankle work had two drills, both foundation, with nowhere to progress to. Adding the stick turns a springy rhythm drill into a control one: bouncing is easy and stopping dead on one foot is not, and the ankle that can do both is the one that survives a season of cutting.',
    mistakes: [
      'Bending the knee to absorb, which takes the ankle out of the drill entirely.',
      'Counting a wobbly landing as a stick. Still means still.',
      'Doing them on a soft surface, which hides exactly the stiffness being trained.',
    ],
    cue: 'Stiff ankle, three hops, dead stop.',
    videoQuery: 'single leg pogo hop stick landing ankle stiffness',
    restSec: 60,
  }),
  // ---------------- Sprint hamstring: no top end ----------------
  E({
    id: 'single-leg-rdl-hop',
    name: 'Single-Leg RDL to Hop',
    kind: 'jump',
    equipment: 'Open space',
    steps: [
      'Stand on one leg. Hinge at the hip, back flat, free leg extending behind you until you feel the hamstring lengthen.',
      'Drive back up and finish with a small hop off that same leg, landing softly on it.',
      'Reset fully between reps. Quality over quantity, and stop when the balance goes.',
    ],
    targets: {
      muscles: ['Hamstrings', 'Glutes', 'Calves'],
      qualities: ['Sprint hamstring', 'Elastic strength', 'Single-leg power'],
    },
    why: 'Hamstring work in this library topped out at intermediate, and the hamstring at top speed is doing something specific: taking a long, fast, lengthening load and then producing force from it. This trains that sequence, lengthen under control and then produce, on one leg, which is the only way sprinting ever asks for it.',
    mistakes: [
      'Rounding the back to reach further. The range comes from the hip, and a rounded back is a different exercise.',
      'Hopping before standing fully tall, which turns it into a hinge with a stumble on the end.',
      'Doing it tired. This is a coordination drill and fatigue ruins it.',
    ],
    cue: 'Long hamstring, stand tall, then pop.',
    videoQuery: 'single leg RDL to hop hamstring power drill',
    restSec: 90,
  }),
  // ---------------- Acceleration: no top end ----------------
  E({
    id: 'accel-to-flying',
    name: 'Acceleration into a Flying Finish',
    kind: 'sprint',
    equipment: 'Field / track (50-60 yd)',
    steps: [
      'Accelerate hard from a standing start for the first twenty yards, low and driving.',
      'Over the next ten, gradually rise into an upright sprinting posture without losing speed.',
      'Sprint the last twenty at full speed, tall and relaxed. Walk back and take a full recovery.',
    ],
    targets: {
      muscles: ['Glutes', 'Hamstrings', 'Quads', 'Calves'],
      qualities: ['Acceleration', 'Transition to max velocity', 'Sprint mechanics'],
    },
    why: 'The library had ten acceleration drills and not one advanced option, so there was nothing to progress to once starts were clean. The transition, the ten yards where a low drive becomes upright sprinting, is the part nobody practises and the part every sport spends its time in. It is also the hardest to do without either popping up early or staying down too long.',
    mistakes: [
      'Popping upright in one step instead of rising gradually across the middle section.',
      'Staying low too long and never actually reaching top speed.',
      'Short recoveries. This is the most demanding thing in here and it needs full rest between reps.',
    ],
    cue: 'Drive, rise, fly. Never a step of it rushed.',
    videoQuery: 'acceleration to max velocity transition sprint drill',
    restSec: 180,
  }),
]

/** Metadata for the drills above, in the same shape as ATHLETIC. */
export const ATHLETIC_COVERAGE_META: Record<string, AthleticMeta> = {
  'jog-to-stop': {
    qualities: ['deceleration', 'force-absorption'], direction: 'horizontal', laterality: 'bilateral',
    footing: 'two-foot', emphasis: 'absorption', level: 'foundation', impact: 1, cns: 1, fresh: true,
    program: { sets: '2-3', reps: '4-5', restSec: 60, intensity: 'half speed, perfect stop' },
    progressions: ['decel-to-backpedal', 'decel-stick'],
  },
  'decel-to-backpedal': {
    qualities: ['deceleration', 'balance-stability'], direction: 'horizontal', laterality: 'bilateral',
    footing: 'two-foot', emphasis: 'absorption', level: 'foundation', impact: 1, cns: 1, fresh: true,
    program: { sets: '2-3', reps: '4-5', restSec: 75, intensity: 'controlled, never rushed' },
    regressions: ['jog-to-stop'], progressions: ['decel-stick', 'plant-and-go'],
  },
  'reaction-start': {
    qualities: ['reactive-agility', 'acceleration'], direction: 'horizontal', laterality: 'bilateral',
    emphasis: 'concentric', level: 'foundation', impact: 1, cns: 2, fresh: true,
    program: { sets: '3-4', reps: '3-4', distance: '5 yd', restSec: 90, intensity: 'maximal, fully recovered' },
    reactiveCues: ['visual', 'audio', 'partner', 'app'],
    progressions: ['mirror-drill', 'reactive-shuttle'],
  },
  'relaxed-stride': {
    qualities: ['max-velocity', 'sprint-mechanics'], direction: 'horizontal', laterality: 'alternating',
    emphasis: 'concentric', level: 'foundation', impact: 2, cns: 1, fresh: true,
    program: { sets: '4-6', distance: '40-60 yd', restSec: 120, intensity: '60-70%, relaxed' },
    progressions: ['build-up-sprint', 'flying-20'],
  },
  'mb-side-throw': {
    qualities: ['rotational-power'], direction: 'rotational', laterality: 'unilateral',
    emphasis: 'concentric', level: 'foundation', impact: 0, cns: 2, fresh: true,
    program: { sets: '3', reps: '4-5 / side', restSec: 90, intensity: 'maximal intent' },
    progressions: ['mb-step-through-throw'],
  },
  'mb-step-through-throw': {
    qualities: ['rotational-power', 'coordination'], direction: 'rotational', laterality: 'unilateral',
    emphasis: 'concentric', level: 'intermediate', impact: 0, cns: 2, fresh: true,
    program: { sets: '3', reps: '3-4 / side', restSec: 105, intensity: 'maximal, full reset' },
    regressions: ['mb-side-throw', 'mb-rotational-throw'],
  },
  'single-leg-pogo-hold': {
    qualities: ['foot-ankle', 'ankle-stiffness', 'balance-stability'], direction: 'vertical',
    laterality: 'unilateral', footing: 'one-foot', emphasis: 'elastic', level: 'intermediate',
    impact: 2, cns: 1, fresh: false,
    program: { sets: '2-3', reps: '4 / leg', restSec: 60, intensity: 'stiff and still' },
    regressions: ['single-leg-pogo', 'ankle-hop'],
  },
  'single-leg-rdl-hop': {
    qualities: ['sprint-hamstring', 'elastic-reactive'], direction: 'vertical', laterality: 'unilateral',
    footing: 'one-foot', emphasis: 'elastic', level: 'advanced', impact: 2, cns: 2, fresh: true,
    program: { sets: '3', reps: '4-5 / leg', restSec: 90, intensity: 'controlled down, sharp up' },
    regressions: ['single-leg-rdl'],
    warning: 'Skip it entirely on any hamstring that is currently sore. Lengthened load on an irritated hamstring is how a niggle becomes a tear.',
  },
  'accel-to-flying': {
    qualities: ['acceleration', 'max-velocity', 'sprint-mechanics'], direction: 'horizontal',
    laterality: 'alternating', emphasis: 'concentric', level: 'advanced', impact: 3, cns: 3, fresh: true,
    program: { sets: '3-5', distance: '50-60 yd', restSec: 180, intensity: 'maximal, full recovery' },
    regressions: ['accel-20', 'build-up-sprint', 'flying-20'],
    warning: 'Top-speed running is the highest-force thing most people ever do. Never on tired legs, never without a full warm-up.',
  },
}
