import type { ExerciseDef } from '../types'

// ============================================================
// The cues that were never written.
//
// R10 counted the corpus and found the hole: 194 movements,
// 129 cues. 65 movements had NOTHING to say in the one slot the
// athlete actually reads mid-set. It went unnoticed because
// data.test.ts asserts steps, muscles, qualities, why, mistakes,
// a video query and a rest time, and never once asked for a cue.
// A silent field is not a crash.
//
// They live here rather than beside their defs because
// exercises.ts is four lines under its allowance and the
// allowances are shrink-only. A def may carry its own cue OR
// appear here, never both: a test enforces that, so there is
// still exactly one place any given cue can come from.
//
// HOUSE STYLE, from R10 s3.7: verb, external referent, one
// target. Under 80 characters and under 12 words, because the
// voice layer says these out loud and a 10-word cue is already
// 4.3 seconds of speech. External phrasing by default, held
// loosely: the meta-analytic support for external focus is
// contested and nothing here depends on the effect being real.
// Isolation lifts are the documented exception, which is why the
// lateral raise is allowed to say "feel the side delt".
//
// What is NOT here, deliberately: any claim about what the body
// is doing. BodyT cannot see anybody. A cue tells them what to
// aim at, never what they are getting wrong.
// ============================================================

/** Movement id to cue, for movements whose def carries none. */
export const MISSING_CUES: Record<string, string> = {
  'db-front-squat': 'Elbows up, chest tall. Push the floor away.',
  'heels-elevated-goblet': 'Heels up lets the knees travel. Sit straight down.',
  'bulgarian-split-squat': 'Weight through the front heel. The back leg is a kickstand.',
  'walking-lunge': 'Step long, drop straight down, then push the floor back.',
  'step-up': 'Drive through the top foot. The back leg does nothing.',
  'single-leg-calf-raise': 'All the way up, all the way down. Pause at the bottom.',
  'hanging-leg-raise': 'Curl the hips up, not just the legs. No swinging.',
  'flat-db-press': 'Press the bells toward each other as they go up.',
  'floor-press': 'Elbows tucked. Pause the moment the arms touch the floor.',
  'standing-ohp': 'Squeeze the glutes, punch the ceiling, head through at the top.',
  'lateral-raise': 'Feel the side delt do the work. Lead with the elbows.',
  'close-grip-press': 'Elbows close to the ribs. Drive the bar straight up.',
  'overhead-tricep-extension': 'Only the elbows move. Feel the stretch behind the arm.',
  'front-squat': 'Elbows high the whole way. Sit straight down between the hips.',
  'single-leg-rdl': 'Reach the back heel at the wall behind you.',
  'good-morning': 'Push the hips at the wall behind you. Bar stays glued.',
  'slider-leg-curl': 'Hips stay high. Drag the heels in slowly.',
  'seated-calf-raise': 'Slow all the way down, then press the knees at the ceiling.',
  'double-leg-calf-raise': 'Full range, no bouncing. Pause at the top of every rep.',
  'weighted-situp': 'Peel the spine off the floor one piece at a time.',
  'plank-side-plank': 'Squeeze everything and keep breathing. Hips stay level.',
  'hip-9090-switch': 'Move slowly and keep the chest tall. No hands if you can.',
  'deep-squat-hold': 'Sit in it and breathe. Pry the knees out with the elbows.',
  'ankle-wall-mobilization': 'Drive the knee past the toes with the heel glued down.',
  'couch-stretch': 'Squeeze the back glute and tuck the hips under.',
  't-spine-opener': 'Reach long and let the chest open. Breathe out at the end.',
  'dead-hang': 'Hang tall and breathe. The grip is the only thing working.',
  'easy-walk': 'Easy enough to hold a conversation the whole way.',
  'pull-up': 'Pull the chest to the bar. Lower slower than you pulled.',
  'barbell-row': 'Row to the belly button. The chest stays where it started.',
  'db-pullover': 'Reach the bell back over the head. Ribs stay down.',
  'one-arm-db-row': 'Row the bell to the hip, not to the shoulder.',
  'chest-supported-row': 'Squeeze for a full second at the top. No body English.',
  'ez-bar-curl': 'Elbows pinned to the ribs. Only the forearms move.',
  'incline-db-curl': 'Let the arms hang all the way down between reps.',
  'hammer-curl': 'Thumbs up the whole way. Squeeze at the top.',
  'farmer-carry': 'Stand tall, walk quiet, crush the handles.',
  'towel-hang': 'Grip the towel and hang. Stop the set when the hands slip.',
  'dynamic-warmup': 'Build up gradually. Finish ready, not tired.',
  'pogo-hop': 'Stiff ankles, quick off the floor. Barely bend the knees.',
  'easy-jog': 'Easy enough to talk in full sentences.',
  'brisk-walk': 'Quick enough that you would rather be walking slower.',
  'incline-walk': 'Let the hill do the work. Hands off the rails.',
  'hill-sprint': 'Hard and short. Walk all the way down before the next one.',
  'parking-lot-sprint': 'Build up over the first few, then go. Full recovery between.',
  'stair-run': 'Quick feet up, walk down. Stop when the feet get heavy.',
  'circuit-a': 'Keep moving through the round. Rest at the end of it.',
  'circuit-b': 'Straight through, then rest. Pace it so you can repeat it.',
  'push-up': 'Push the floor away. One straight line from head to heels.',
  'pike-push-up': 'Hips high. Crown of the head toward the floor.',
  'inverted-row': 'Chest to the bar. One straight line from head to heels.',
  'chin-up': 'Palms toward you. Drive the elbows down to the ribs.',
  'split-squat': 'Drop the back knee straight down. The front shin stays quiet.',
  'reverse-lunge': 'Step back and down, then push the front floor away.',
  'glute-bridge': 'Squeeze at the top and hold a second. Ribs stay down.',
  'hollow-hold': 'Press the lower back into the floor and keep it there.',
  'dead-bug': 'Slow, opposite arm and leg. The back stays flat throughout.',
  'db-shoulder-press': 'Press up and slightly in. Finish with the arms by the ears.',
  'lat-pulldown': 'Bar to the collarbone. Lead with the elbows, not the hands.',
  'seated-cable-row': 'Pull to the belly, pause, then stretch all the way out.',
  'leg-press': 'As deep as you can with the hips staying on the pad.',
  'machine-leg-curl': 'Slow on the way back. Feel the hamstrings do the work.',
  'bike-erg': 'Enough resistance to push against, not a spin against nothing.',
  'rowing-erg': 'Legs, then back, then arms. Reverse that order coming in.',
  'db-rdl': 'Slide the bells down the legs. Hips back at the wall.',
}

/** A def keeps its own cue; one from the table fills a blank. */
export function withCue(def: ExerciseDef): ExerciseDef {
  const cue = def.cue?.trim() ? def.cue : MISSING_CUES[def.id]
  return cue === def.cue ? def : { ...def, cue }
}
