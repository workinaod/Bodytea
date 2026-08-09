// ============================================================
// Real photo demonstration SEQUENCES for the exercise demos.
// Each exercise plays an ordered list of frames (2–5); every
// frame's caption describes exactly what that photo shows, in
// the language of the exercise's steps — captions never drift
// from the visible position. Sequences were curated frame-by-
// frame (order fixed where the source pair played backwards,
// extra stages pulled from related library entries, e.g. the
// box-jump landing).
// Photos: Free Exercise DB (public domain), vendored into
// public/demo as webp so they work offline. Exercises with no
// faithful photo match keep the animated figure from demos.ts.
// ============================================================

export interface DemoPhotoFrame {
  file: string
  caption: string
}

export interface DemoPhotoSeq {
  frames: DemoPhotoFrame[]
}

const seq = (...frames: [string, string][]): DemoPhotoSeq => ({
  frames: frames.map(([file, caption]) => ({ file, caption })),
})

export const DEMO_PHOTOS: Record<string, DemoPhotoSeq> = {
  // ---- Monday: power + first step ----
  'box-jump': seq(
    ['Front_Box_Jump-0.webp', 'Quick dip — arms swing BACK'],
    ['Front_Box_Jump-1.webp', 'EXPLODE — throw the arms, knees ride up'],
    ['Box_Jump_Multiple_Response-1.webp', 'Land SOFT on top — stand tall, STEP down'],
  ),
  'goblet-squat': seq(
    ['Goblet_Squat-0.webp', 'Bell tight to the chest — brace tall'],
    ['Goblet_Squat-1.webp', 'Sit straight down — elbows inside the knees'],
  ),
  'db-front-squat': seq(
    ['Front_Squats_With_Two_Kettlebells-0.webp', 'Racked at the shoulders — elbows high'],
    ['Front_Squats_With_Two_Kettlebells-1.webp', 'Squat tall — below parallel, torso upright'],
  ),
  'heels-elevated-goblet': seq(
    ['Goblet_Squat-0.webp', 'Heels on the plate — bell at the chest'],
    ['Goblet_Squat-1.webp', 'Ride the knees FORWARD — sink deep'],
  ),
  'romanian-deadlift': seq(
    ['Romanian_Deadlift-1.webp', 'Stand tall — soft knees, bar on the thighs'],
    ['Romanian_Deadlift-0.webp', 'Hips BACK — hamstrings load like bowstrings'],
  ),
  'bulgarian-split-squat': seq(
    ['Split_Squat_with_Dumbbells-0.webp', 'Rear foot behind you — front leg carries the weight'],
    ['Split_Squat_with_Dumbbells-1.webp', 'Back knee drops straight down'],
  ),
  'walking-lunge': seq(
    ['Dumbbell_Lunges-0.webp', 'Tall — take a LONG step'],
    ['Dumbbell_Lunges-1.webp', 'Back knee kisses the floor — drive off the front heel'],
  ),
  'step-up': seq(
    ['Dumbbell_Step_Ups-1.webp', 'Whole foot on the box — drive through THAT heel'],
    ['Dumbbell_Step_Ups-0.webp', 'Stand fully tall on top — lower back slow'],
  ),
  'single-leg-calf-raise': seq(
    ['Standing_Dumbbell_Calf_Raise-0.webp', 'Heel sinks — pause the deep stretch'],
    ['Standing_Dumbbell_Calf_Raise-1.webp', 'Drive HIGH onto the big toe'],
  ),
  'hanging-leg-raise': seq(
    ['Hanging_Leg_Raise-0.webp', 'Dead hang — kill the swing'],
    ['Hanging_Leg_Raise-1.webp', 'Tuck the tailbone — legs UP'],
  ),

  // ---- Tuesday: push ----
  'incline-db-press': seq(
    ['Incline_Dumbbell_Press-0.webp', 'Lower to the OUTER chest — blades pinned'],
    ['Incline_Dumbbell_Press-1.webp', 'Press up and slightly IN'],
  ),
  'flat-db-press': seq(
    ['Dumbbell_Bench_Press-0.webp', 'Full stretch at the chest — elbows 45°'],
    ['Dumbbell_Bench_Press-1.webp', 'Press — squeeze at lockout'],
  ),
  'floor-press': seq(
    ['Floor_Press-0.webp', 'Wrists stacked — bar over the chest'],
    ['Floor_Press-1.webp', 'Upper arms settle on the floor — PAUSE, then press'],
  ),
  'standing-ohp': seq(
    ['Standing_Military_Press-0.webp', 'Bar at the collarbones — glutes and abs tight'],
    ['Standing_Military_Press-1.webp', 'Head through the window — lock out by the ears'],
  ),
  'lateral-raise': seq(
    ['Side_Lateral_Raise-0.webp', 'Soft elbows — torso dead still'],
    ['Side_Lateral_Raise-1.webp', 'To shoulder height — ELBOWS lead'],
  ),
  'close-grip-press': seq(
    ['Close-Grip_Barbell_Bench_Press-0.webp', 'Elbows TUCKED — bar to the lower chest'],
    ['Close-Grip_Barbell_Bench_Press-1.webp', 'Press — hard triceps lockout'],
  ),
  'overhead-tricep-extension': seq(
    ['Standing_Dumbbell_Triceps_Extension-0.webp', 'Elbows locked by your ears — arms tall'],
    ['Standing_Dumbbell_Triceps_Extension-1.webp', 'Lower behind the head — deep stretch, then extend'],
  ),

  // ---- Wednesday: lower strength ----
  'front-squat': seq(
    ['Front_Barbell_Squat-0.webp', 'Bar on the front delts — elbows HIGH'],
    ['Front_Barbell_Squat-1.webp', 'Below parallel — torso stays tall'],
  ),
  'hip-thrust': seq(
    ['Barbell_Hip_Thrust-1.webp', 'Upper back on the bench — bar padded on the hips'],
    ['Barbell_Hip_Thrust-0.webp', 'Squeeze to a FLAT table — hold one second'],
  ),
  'single-leg-rdl': seq(
    ['Kettlebell_One-Legged_Deadlift-0.webp', 'Balance — soft knee, hips square'],
    ['Kettlebell_One-Legged_Deadlift-1.webp', 'Hinge — free leg drives straight back'],
  ),
  'good-morning': seq(
    ['Good_Morning-0.webp', 'Bar on the back — lats on, knees fixed'],
    ['Good_Morning-1.webp', 'Hips straight BACK — table-flat to ~45°'],
  ),
  'slider-leg-curl': seq(
    ['Ball_Leg_Curl-1.webp', 'Bridge UP — heels under you'],
    ['Ball_Leg_Curl-0.webp', 'Slide out slow — hips stay tall'],
  ),
  'seated-calf-raise': seq(
    ['Dumbbell_Seated_One-Leg_Calf_Raise-0.webp', 'Heel sinks — one-second pause'],
    ['Dumbbell_Seated_One-Leg_Calf_Raise-1.webp', 'Press up on the ball of the foot'],
  ),
  'double-leg-calf-raise': seq(
    ['Standing_Dumbbell_Calf_Raise-0.webp', 'Heels sink — deep stretch, pause'],
    ['Standing_Dumbbell_Calf_Raise-1.webp', 'Drive tall onto the big toes'],
  ),
  'weighted-situp': seq(
    ['Sit-Up-0.webp', 'Lie back — plate hugged tight to the chest'],
    ['Sit-Up-1.webp', 'Curl UP — one vertebra at a time'],
  ),
  'plank-side-plank': seq(
    ['Plank-0.webp', 'Forearms down — set your base'],
    ['Plank-1.webp', 'One straight line — squeeze EVERYTHING'],
  ),

  // ---- Thursday: mobility + recovery ----
  'deep-squat-hold': seq(
    ['Bodyweight_Squat-0.webp', 'Feet a touch wide — chest proud'],
    ['Bodyweight_Squat-1.webp', 'Sink into the hole — heels down, pry the knees out'],
  ),
  'couch-stretch': seq(
    ['Kneeling_Hip_Flexor-0.webp', 'Half-kneel — back knee tucked into the corner'],
    ['Kneeling_Hip_Flexor-1.webp', 'Glute tight — tuck the pelvis, shift forward'],
  ),
  'easy-walk': seq(
    ['Walking_Treadmill-0.webp', 'Conversational pace — this is recovery'],
    ['Walking_Treadmill-1.webp', 'Relaxed arms — easy rhythm'],
  ),

  // ---- Friday: pull + grip ----
  'pull-up': seq(
    ['Pullups-0.webp', 'Dead hang — set the blades FIRST'],
    ['Pullups-1.webp', 'Elbows drive DOWN — chin over the bar'],
  ),
  'barbell-row': seq(
    ['Bent_Over_Barbell_Row-0.webp', 'Hinged flat — bar hangs at arm’s length'],
    ['Bent_Over_Barbell_Row-1.webp', 'Pull to the LOWER ribs — squeeze the blades'],
  ),
  'db-pullover': seq(
    ['Bent-Arm_Dumbbell_Pullover-0.webp', 'Both hands cup one bell — over the chest'],
    ['Bent-Arm_Dumbbell_Pullover-1.webp', 'Arc back — DEEP lat stretch, ribs down'],
  ),
  'one-arm-db-row': seq(
    ['One-Arm_Dumbbell_Row-0.webp', 'Flat like a table — let it hang, full stretch'],
    ['One-Arm_Dumbbell_Row-1.webp', 'Elbow to the HIP — squeeze the lat'],
  ),
  'chest-supported-row': seq(
    ['Dumbbell_Incline_Row-0.webp', 'Chest DOWN on the pad — blades spread'],
    ['Dumbbell_Incline_Row-1.webp', 'Row to the hips — pause at the top'],
  ),
  'rear-delt-raise': seq(
    ['Seated_Bent-Over_Rear_Delt_Raise-0.webp', 'Hinge low — weights hang, soft elbows'],
    ['Seated_Bent-Over_Rear_Delt_Raise-1.webp', 'Out to the sides — elbows lead, THREE seconds down'],
  ),
  'ez-bar-curl': seq(
    ['EZ-Bar_Curl-0.webp', 'Elbows pinned — full hang'],
    ['EZ-Bar_Curl-1.webp', 'Curl — squeeze at the top'],
  ),
  'incline-db-curl': seq(
    ['Incline_Dumbbell_Curl-0.webp', 'Arms hang BEHIND you — feel the stretch'],
    ['Incline_Dumbbell_Curl-1.webp', 'Curl — elbows stay back'],
  ),
  'hammer-curl': seq(
    ['Hammer_Curls-0.webp', 'Neutral grip — elbows pinned to your sides'],
    ['Hammer_Curls-1.webp', 'Squeeze — zero swinging'],
  ),
  'farmer-carry': seq(
    ['Farmers_Walk-0.webp', 'Flat back — the LEGS lift it up'],
    ['Farmers_Walk-1.webp', 'Stand TALL — short quick steps, crush grip'],
  ),

  // ---- Saturday: speed + reactive ----
  'dynamic-warmup': seq(
    ['Fast_Skipping-0.webp', 'Skips — springy and light'],
    ['Fast_Skipping-1.webp', 'Knees punch — build the buzz, not fatigue'],
  ),
  'max-velocity-sprint': seq(
    ['Wind_Sprints-0.webp', 'TALL — knee punches through'],
    ['Wind_Sprints-1.webp', 'Strike under the hips — stay LOOSE'],
  ),
  'flying-sprint': seq(
    ['Wind_Sprints-0.webp', 'Build in… then EXPLODE the fly zone'],
    ['Wind_Sprints-1.webp', 'Fastest strides — loose jaw, loose hands'],
  ),

  // ---- Cardio options ----
  'easy-jog': seq(
    ['Trail_Running_Walking-0.webp', 'Conversational pace — that’s the test'],
    ['Trail_Running_Walking-1.webp', 'Land soft — quick light steps'],
  ),
  'brisk-walk': seq(
    ['Walking_Treadmill-0.webp', 'Walk with PURPOSE'],
    ['Walking_Treadmill-1.webp', 'Arms swing — breathing up, conversation possible'],
  ),
  'incline-walk': seq(
    ['Walking_Treadmill-0.webp', 'Crank the incline — NO holding the rails'],
    ['Walking_Treadmill-1.webp', 'Tall lean into the hill — pump the arms'],
  ),
  'hill-sprint': seq(
    ['Wind_Sprints-0.webp', 'Attack the slope — big knee drive'],
    ['Wind_Sprints-1.webp', 'Lean into the hill — walk down as your rest'],
  ),
  'parking-lot-sprint': seq(
    ['Wind_Sprints-0.webp', '10–15 seconds ALL OUT'],
    ['Wind_Sprints-1.webp', 'If it’s not max effort — you’re done'],
  ),
  'stair-run': seq(
    ['Stairmaster-0.webp', 'Up hard — every step drives'],
    ['Stairmaster-1.webp', 'Balls of the feet — arms working'],
  ),
  'circuit-a': seq(
    ['Freehand_Jump_Squat-0.webp', 'Sink FAST — arms load'],
    ['Freehand_Jump_Squat-1.webp', 'EXPLODE — full extension'],
    ['Knee_Tuck_Jump-0.webp', 'Land soft — melt straight into the next rep'],
  ),
  'circuit-b': seq(
    ['Mountain_Climbers-0.webp', 'Hips low — drive the knee under you'],
    ['Mountain_Climbers-1.webp', 'Switch — quick light feet, steady pace'],
  ),

  // ---- Generator catalog ----
  'push-up': seq(
    ['Pushups-0.webp', 'One straight line — hands under the shoulders'],
    ['Pushups-1.webp', 'Chest to the floor — elbows 45°'],
  ),
  'chin-up': seq(
    ['Chin-Up-0.webp', 'Dead hang — palms toward you'],
    ['Chin-Up-1.webp', 'Elbows to your sides — chin clears the bar'],
  ),
  'inverted-row': seq(
    ['Inverted_Row-0.webp', 'Hang under the bar — body one straight line'],
    ['Inverted_Row-1.webp', 'Pull the CHEST to the bar — squeeze the blades'],
  ),
  'split-squat': seq(
    ['Split_Squats-1.webp', 'Long split stance — weight on the front leg'],
    ['Split_Squats-0.webp', 'Back knee sinks straight down'],
  ),
  'reverse-lunge': seq(
    ['Dumbbell_Rear_Lunge-0.webp', 'Tall — step straight BACK'],
    ['Dumbbell_Rear_Lunge-1.webp', 'Back knee drops — front shin stays vertical'],
  ),
  'glute-bridge': seq(
    ['Butt_Lift_Bridge-1.webp', 'Heels close — ribs down'],
    ['Butt_Lift_Bridge-0.webp', 'Squeeze UP to a straight line — hold the top'],
  ),
  'db-shoulder-press': seq(
    ['Dumbbell_Shoulder_Press-1.webp', 'Bells at the shoulders — abs braced'],
    ['Dumbbell_Shoulder_Press-0.webp', 'Press straight up — biceps by the ears'],
  ),
  'lat-pulldown': seq(
    ['Wide-Grip_Lat_Pulldown-0.webp', 'Blades set first — arms long overhead'],
    ['Wide-Grip_Lat_Pulldown-1.webp', 'Elbows DOWN — bar to the upper chest'],
  ),
  'seated-cable-row': seq(
    ['Seated_Cable_Rows-0.webp', 'Full stretch — blades slide forward'],
    ['Seated_Cable_Rows-1.webp', 'Pull to the lower ribs — chest proud'],
  ),
  'leg-press': seq(
    ['Leg_Press-0.webp', 'Feet mid-platform — knees tracking the toes'],
    ['Leg_Press-1.webp', 'Lower deep — butt stays ON the pad'],
  ),
  'machine-leg-curl': seq(
    ['Lying_Leg_Curls-0.webp', 'Hips pinned — legs long, pad above the heels'],
    ['Lying_Leg_Curls-1.webp', 'Curl the heels to the glutes — squeeze'],
  ),
  'bike-erg': seq(
    ['Bicycling_Stationary-0.webp', 'Smooth circles — quiet upper body'],
    ['Bicycling_Stationary-1.webp', 'Conversational pace = zone 2'],
  ),
  'rowing-erg': seq(
    ['Rowing_Stationary-0.webp', 'Catch — arms long, shins vertical'],
    ['Rowing_Stationary-1.webp', 'LEGS drive, hips swing, arms finish'],
  ),
}

/** Photo sequence for an exercise, or null (falls back to the animated figure). */
export function photosFor(id: string): DemoPhotoSeq | null {
  return DEMO_PHOTOS[id] ?? null
}
