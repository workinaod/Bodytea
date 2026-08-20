// ============================================================
// Real photo demonstration SEQUENCES for the exercise demos.
// Each exercise plays an ordered list of frames (2–5); every
// frame's caption describes exactly what that photo shows, in
// the language of the exercise's steps, captions never drift
// from the visible position. Sequences were curated frame-by-
// frame (order fixed where the source pair played backwards,
// extra stages pulled from related library entries, e.g. the
// box-jump landing).
// Photos: Free Exercise DB (public domain), vendored into
// public/demo as webp so they work offline. Exercises with no
// faithful photo match keep the animated figure from demos.ts.
// ============================================================

// RETIRED AS A MOVEMENT DEMO (OP12). These sequences used to cross-fade
// two to four stage photos where the demo goes. Stills cannot show a
// movement, only its endpoints, and 53 of the 55 exercises that have
// them also have a verified clip, which shows the whole thing. The
// clip took the slot. What still earns its keep here is FRAME 0, which
// ExercisePicker uses as the thumbnail on a list row: one still is
// exactly the right thing for a row icon.


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
    ['Front_Box_Jump-0.webp', 'Quick dip, arms swing BACK'],
    ['Front_Box_Jump-1.webp', 'EXPLODE, knees ride up'],
    ['Box_Jump_Multiple_Response-1.webp', 'Land SOFT, stand tall'],
  ),
  'goblet-squat': seq(
    ['Goblet_Squat-0.webp', 'Bell tight to the chest'],
    ['Goblet_Squat-1.webp', 'Sit straight down'],
  ),
  'db-front-squat': seq(
    ['Front_Squats_With_Two_Kettlebells-0.webp', 'Elbows HIGH, bells racked'],
    ['Front_Squats_With_Two_Kettlebells-1.webp', 'Below parallel, tall'],
  ),
  'romanian-deadlift': seq(
    ['Romanian_Deadlift-1.webp', 'Tall, soft knees'],
    ['Romanian_Deadlift-0.webp', 'Hips BACK, hams load'],
  ),
  'bulgarian-split-squat': seq(
    ['Split_Squat_with_Dumbbells-0.webp', 'Front leg does the work'],
    ['Split_Squat_with_Dumbbells-1.webp', 'Back knee drops down'],
  ),
  'walking-lunge': seq(
    ['Dumbbell_Lunges-0.webp', 'Tall, take a LONG step'],
    ['Dumbbell_Lunges-1.webp', 'Knee kisses the floor'],
  ),
  'step-up': seq(
    ['Dumbbell_Step_Ups-1.webp', 'Drive through THAT heel'],
    ['Dumbbell_Step_Ups-0.webp', 'Stand tall, lower slow'],
  ),
  'hanging-leg-raise': seq(
    ['Hanging_Leg_Raise-0.webp', 'Dead hang, kill the swing'],
    ['Hanging_Leg_Raise-1.webp', 'Tuck the tailbone, legs UP'],
  ),

  // ---- Tuesday: push ----
  'incline-db-press': seq(
    ['Incline_Dumbbell_Press-0.webp', 'Lower to the OUTER chest'],
    ['Incline_Dumbbell_Press-1.webp', 'Press up and slightly IN'],
  ),
  'flat-db-press': seq(
    ['Dumbbell_Bench_Press-0.webp', 'Full stretch, elbows 45°'],
    ['Dumbbell_Bench_Press-1.webp', 'Press, squeeze at lockout'],
  ),
  'floor-press': seq(
    ['Floor_Press-0.webp', 'Wrists stacked over chest'],
    ['Floor_Press-1.webp', 'Arms touch down. PAUSE'],
  ),
  'standing-ohp': seq(
    ['Standing_Military_Press-0.webp', 'Bar at the collarbones'],
    ['Standing_Military_Press-1.webp', 'Head through the window'],
  ),
  'lateral-raise': seq(
    ['Side_Lateral_Raise-0.webp', 'Torso dead still'],
    ['Side_Lateral_Raise-1.webp', 'ELBOWS lead the way'],
  ),
  'close-grip-press': seq(
    ['Close-Grip_Barbell_Bench_Press-0.webp', 'Elbows TUCKED to the ribs'],
    ['Close-Grip_Barbell_Bench_Press-1.webp', 'Hard triceps lockout'],
  ),
  'overhead-tricep-extension': seq(
    ['Standing_Dumbbell_Triceps_Extension-0.webp', 'Elbows locked by the ears'],
    ['Standing_Dumbbell_Triceps_Extension-1.webp', 'Deep stretch, then press'],
  ),

  // ---- Wednesday: lower strength ----
  'front-squat': seq(
    ['Front_Barbell_Squat-0.webp', 'Elbows HIGH, chest up'],
    ['Front_Barbell_Squat-1.webp', 'Below parallel, tall'],
  ),
  'hip-thrust': seq(
    ['Barbell_Hip_Thrust-1.webp', 'Upper back on the bench'],
    ['Barbell_Hip_Thrust-0.webp', 'Squeeze to a FLAT table'],
  ),
  'single-leg-rdl': seq(
    ['Kettlebell_One-Legged_Deadlift-0.webp', 'Hips SQUARE, soft knee'],
    ['Kettlebell_One-Legged_Deadlift-1.webp', 'Free leg drives back'],
  ),
  'good-morning': seq(
    ['Good_Morning-0.webp', 'Knees fixed, lats on'],
    ['Good_Morning-1.webp', 'Hips straight BACK'],
  ),
  'slider-leg-curl': seq(
    ['Ball_Leg_Curl-1.webp', 'Bridge UP, heels under you'],
    ['Ball_Leg_Curl-0.webp', 'Slide out slow, hips up'],
  ),
  'seated-calf-raise': seq(
    ['Dumbbell_Seated_One-Leg_Calf_Raise-0.webp', 'Heel sinks, PAUSE'],
    ['Dumbbell_Seated_One-Leg_Calf_Raise-1.webp', 'Up on the big toe'],
  ),
  'double-leg-calf-raise': seq(
    ['Standing_Dumbbell_Calf_Raise-0.webp', 'Heels sink, PAUSE'],
    ['Standing_Dumbbell_Calf_Raise-1.webp', 'Drive tall on the toes'],
  ),
  'weighted-situp': seq(
    ['Sit-Up-0.webp', 'Plate hugged to the chest'],
    ['Sit-Up-1.webp', 'Curl UP, slow and tight'],
  ),
  'plank-side-plank': seq(
    ['Plank-0.webp', 'Forearms down'],
    ['Plank-1.webp', 'Squeeze EVERYTHING'],
  ),

  // ---- Thursday: mobility + recovery ----
  'deep-squat-hold': seq(
    ['Bodyweight_Squat-0.webp', 'Feet wide, chest proud'],
    ['Bodyweight_Squat-1.webp', 'Sink deep, heels down'],
  ),
  'couch-stretch': seq(
    ['Kneeling_Hip_Flexor-0.webp', 'Back knee in the corner'],
    ['Kneeling_Hip_Flexor-1.webp', 'Glute tight, tuck the hips'],
  ),

  // ---- Friday: pull + grip ----
  'pull-up': seq(
    ['Pullups-0.webp', 'Set the blades FIRST'],
    ['Pullups-1.webp', 'Elbows drive DOWN'],
  ),
  'barbell-row': seq(
    ['Bent_Over_Barbell_Row-0.webp', 'Hinged flat, arms long'],
    ['Bent_Over_Barbell_Row-1.webp', 'Pull to the LOWER ribs'],
  ),
  'db-pullover': seq(
    ['Bent-Arm_Dumbbell_Pullover-0.webp', 'Both hands cup one bell'],
    ['Bent-Arm_Dumbbell_Pullover-1.webp', 'Arc back, DEEP stretch'],
  ),
  'one-arm-db-row': seq(
    ['One-Arm_Dumbbell_Row-0.webp', 'Flat table, full stretch'],
    ['One-Arm_Dumbbell_Row-1.webp', 'Elbow to the HIP'],
  ),
  'chest-supported-row': seq(
    ['Dumbbell_Incline_Row-0.webp', 'Chest DOWN on the pad'],
    ['Dumbbell_Incline_Row-1.webp', 'Row to the hips, pause'],
  ),
  'rear-delt-raise': seq(
    ['Seated_Bent-Over_Rear_Delt_Raise-0.webp', 'Hinge low, arms hang'],
    ['Seated_Bent-Over_Rear_Delt_Raise-1.webp', 'Elbows lead, SLOW down'],
  ),
  'ez-bar-curl': seq(
    ['EZ-Bar_Curl-0.webp', 'Elbows pinned, full hang'],
    ['EZ-Bar_Curl-1.webp', 'Curl, squeeze at the top'],
  ),
  'incline-db-curl': seq(
    ['Incline_Dumbbell_Curl-0.webp', 'Arms hang BEHIND you'],
    ['Incline_Dumbbell_Curl-1.webp', 'Curl, elbows stay back'],
  ),
  'hammer-curl': seq(
    ['Hammer_Curls-0.webp', 'Elbows pinned, thumbs up'],
    ['Hammer_Curls-1.webp', 'Squeeze, zero swinging'],
  ),
  'farmer-carry': seq(
    ['Farmers_Walk-0.webp', 'The LEGS lift it up'],
    ['Farmers_Walk-1.webp', 'TALL, short quick steps'],
  ),

  // ---- Saturday: speed + reactive ----
  'dynamic-warmup': seq(
    ['Fast_Skipping-0.webp', 'Skips, springy and light'],
    ['Fast_Skipping-1.webp', 'Knees punch, stay light'],
  ),

  // ---- Cardio options ----
  'easy-jog': seq(
    ['Trail_Running_Walking-0.webp', 'Conversational pace'],
    ['Trail_Running_Walking-1.webp', 'Land soft and light'],
  ),
  'brisk-walk': seq(
    ['Walking_Treadmill-0.webp', 'Walk with PURPOSE'],
    ['Walking_Treadmill-1.webp', 'Arms swing, breathing up'],
  ),
  'stair-run': seq(
    ['Stairmaster-0.webp', 'Up hard, every step drives'],
    ['Stairmaster-1.webp', 'Balls of the feet'],
  ),
  'circuit-a': seq(
    ['Freehand_Jump_Squat-0.webp', 'Sink FAST, arms load'],
    ['Freehand_Jump_Squat-1.webp', 'EXPLODE, full extension'],
    ['Knee_Tuck_Jump-0.webp', 'Land soft, straight in'],
  ),
  'circuit-b': seq(
    ['Mountain_Climbers-0.webp', 'Drive the knee under you'],
    ['Mountain_Climbers-1.webp', 'Switch, quick light feet'],
  ),

  // ---- Generator catalog ----
  'push-up': seq(
    ['Pushups-0.webp', 'Hands under the shoulders'],
    ['Pushups-1.webp', 'Chest down, elbows 45°'],
  ),
  'chin-up': seq(
    ['Chin-Up-0.webp', 'Dead hang'],
    ['Chin-Up-1.webp', 'Chin clears the bar'],
  ),
  'inverted-row': seq(
    ['Inverted_Row-0.webp', 'Hang under the bar'],
    ['Inverted_Row-1.webp', 'Pull the CHEST to the bar'],
  ),
  'split-squat': seq(
    ['Split_Squats-1.webp', 'Weight on the front leg'],
    ['Split_Squats-0.webp', 'Back knee sinks down'],
  ),
  'reverse-lunge': seq(
    ['Dumbbell_Rear_Lunge-0.webp', 'Tall, step straight BACK'],
    ['Dumbbell_Rear_Lunge-1.webp', 'Front shin stays vertical'],
  ),
  'glute-bridge': seq(
    ['Butt_Lift_Bridge-1.webp', 'Heels close, ribs down'],
    ['Butt_Lift_Bridge-0.webp', 'Squeeze UP, hold the top'],
  ),
  'db-shoulder-press': seq(
    ['Dumbbell_Shoulder_Press-1.webp', 'Bells at the shoulders'],
    ['Dumbbell_Shoulder_Press-0.webp', 'Biceps finish by the ears'],
  ),
  'lat-pulldown': seq(
    ['Wide-Grip_Lat_Pulldown-0.webp', 'Blades set FIRST'],
    ['Wide-Grip_Lat_Pulldown-1.webp', 'Elbows DOWN to the ribs'],
  ),
  'seated-cable-row': seq(
    ['Seated_Cable_Rows-0.webp', 'Full stretch, arms long'],
    ['Seated_Cable_Rows-1.webp', 'Pull to the lower ribs'],
  ),
  'leg-press': seq(
    ['Leg_Press-0.webp', 'Knees track the toes'],
    ['Leg_Press-1.webp', 'Butt stays ON the pad'],
  ),
  'machine-leg-curl': seq(
    ['Lying_Leg_Curls-0.webp', 'Hips pinned, legs long'],
    ['Lying_Leg_Curls-1.webp', 'Heels to the glutes'],
  ),
  'bike-erg': seq(
    ['Bicycling_Stationary-0.webp', 'Smooth, quiet circles'],
    ['Bicycling_Stationary-1.webp', 'Conversational pace'],
  ),
  'rowing-erg': seq(
    ['Rowing_Stationary-0.webp', 'Catch, shins vertical'],
    ['Rowing_Stationary-1.webp', 'LEGS, then hips, then arms'],
  ),
}

/** Photo sequence for an exercise, or null (falls back to the animated figure). */
export function photosFor(id: string): DemoPhotoSeq | null {
  return DEMO_PHOTOS[id] ?? null
}
