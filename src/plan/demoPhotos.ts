// ============================================================
// Real photo demonstration pairs (start / end position) for the
// exercise demos. Photos: Free Exercise DB (public domain,
// github.com/yuhonas/free-exercise-db), vendored into public/demo
// as webp so they work offline. Exercises with no faithful photo
// match keep the animated figure from demos.ts.
// ============================================================

export const DEMO_PHOTOS: Record<string, [string, string]> = {
  'box-jump': ['Front_Box_Jump-0.webp', 'Front_Box_Jump-1.webp'],
  'goblet-squat': ['Goblet_Squat-0.webp', 'Goblet_Squat-1.webp'],
  'db-front-squat': ['Front_Squats_With_Two_Kettlebells-0.webp', 'Front_Squats_With_Two_Kettlebells-1.webp'],
  'heels-elevated-goblet': ['Goblet_Squat-0.webp', 'Goblet_Squat-1.webp'],
  'romanian-deadlift': ['Romanian_Deadlift-0.webp', 'Romanian_Deadlift-1.webp'],
  'bulgarian-split-squat': ['Split_Squat_with_Dumbbells-0.webp', 'Split_Squat_with_Dumbbells-1.webp'],
  'walking-lunge': ['Dumbbell_Lunges-0.webp', 'Dumbbell_Lunges-1.webp'],
  'step-up': ['Dumbbell_Step_Ups-0.webp', 'Dumbbell_Step_Ups-1.webp'],
  'single-leg-calf-raise': ['Standing_Dumbbell_Calf_Raise-0.webp', 'Standing_Dumbbell_Calf_Raise-1.webp'],
  'hanging-leg-raise': ['Hanging_Leg_Raise-0.webp', 'Hanging_Leg_Raise-1.webp'],
  'incline-db-press': ['Incline_Dumbbell_Press-0.webp', 'Incline_Dumbbell_Press-1.webp'],
  'flat-db-press': ['Dumbbell_Bench_Press-0.webp', 'Dumbbell_Bench_Press-1.webp'],
  'floor-press': ['Floor_Press-0.webp', 'Floor_Press-1.webp'],
  'standing-ohp': ['Standing_Military_Press-0.webp', 'Standing_Military_Press-1.webp'],
  'lateral-raise': ['Side_Lateral_Raise-0.webp', 'Side_Lateral_Raise-1.webp'],
  'close-grip-press': ['Close-Grip_Barbell_Bench_Press-0.webp', 'Close-Grip_Barbell_Bench_Press-1.webp'],
  'overhead-tricep-extension': ['Standing_Dumbbell_Triceps_Extension-0.webp', 'Standing_Dumbbell_Triceps_Extension-1.webp'],
  'front-squat': ['Front_Barbell_Squat-0.webp', 'Front_Barbell_Squat-1.webp'],
  'hip-thrust': ['Barbell_Hip_Thrust-0.webp', 'Barbell_Hip_Thrust-1.webp'],
  'single-leg-rdl': ['Kettlebell_One-Legged_Deadlift-0.webp', 'Kettlebell_One-Legged_Deadlift-1.webp'],
  'good-morning': ['Good_Morning-0.webp', 'Good_Morning-1.webp'],
  'slider-leg-curl': ['Ball_Leg_Curl-0.webp', 'Ball_Leg_Curl-1.webp'],
  'seated-calf-raise': ['Dumbbell_Seated_One-Leg_Calf_Raise-0.webp', 'Dumbbell_Seated_One-Leg_Calf_Raise-1.webp'],
  'double-leg-calf-raise': ['Standing_Dumbbell_Calf_Raise-0.webp', 'Standing_Dumbbell_Calf_Raise-1.webp'],
  'weighted-situp': ['Sit-Up-0.webp', 'Sit-Up-1.webp'],
  'plank-side-plank': ['Plank-0.webp', 'Plank-1.webp'],
  'deep-squat-hold': ['Bodyweight_Squat-0.webp', 'Bodyweight_Squat-1.webp'],
  'couch-stretch': ['Kneeling_Hip_Flexor-0.webp', 'Kneeling_Hip_Flexor-1.webp'],
  'easy-walk': ['Walking_Treadmill-0.webp', 'Walking_Treadmill-1.webp'],
  'pull-up': ['Pullups-0.webp', 'Pullups-1.webp'],
  'barbell-row': ['Bent_Over_Barbell_Row-0.webp', 'Bent_Over_Barbell_Row-1.webp'],
  'db-pullover': ['Bent-Arm_Dumbbell_Pullover-0.webp', 'Bent-Arm_Dumbbell_Pullover-1.webp'],
  'one-arm-db-row': ['One-Arm_Dumbbell_Row-0.webp', 'One-Arm_Dumbbell_Row-1.webp'],
  'chest-supported-row': ['Dumbbell_Incline_Row-0.webp', 'Dumbbell_Incline_Row-1.webp'],
  'rear-delt-raise': ['Seated_Bent-Over_Rear_Delt_Raise-0.webp', 'Seated_Bent-Over_Rear_Delt_Raise-1.webp'],
  'ez-bar-curl': ['EZ-Bar_Curl-0.webp', 'EZ-Bar_Curl-1.webp'],
  'incline-db-curl': ['Incline_Dumbbell_Curl-0.webp', 'Incline_Dumbbell_Curl-1.webp'],
  'hammer-curl': ['Hammer_Curls-0.webp', 'Hammer_Curls-1.webp'],
  'farmer-carry': ['Farmers_Walk-0.webp', 'Farmers_Walk-1.webp'],
  'dynamic-warmup': ['Fast_Skipping-0.webp', 'Fast_Skipping-1.webp'],
  'max-velocity-sprint': ['Wind_Sprints-0.webp', 'Wind_Sprints-1.webp'],
  'flying-sprint': ['Wind_Sprints-0.webp', 'Wind_Sprints-1.webp'],
  'easy-jog': ['Trail_Running_Walking-0.webp', 'Trail_Running_Walking-1.webp'],
  'brisk-walk': ['Walking_Treadmill-0.webp', 'Walking_Treadmill-1.webp'],
  'incline-walk': ['Walking_Treadmill-0.webp', 'Walking_Treadmill-1.webp'],
  'hill-sprint': ['Wind_Sprints-0.webp', 'Wind_Sprints-1.webp'],
  'parking-lot-sprint': ['Wind_Sprints-0.webp', 'Wind_Sprints-1.webp'],
  'stair-run': ['Stairmaster-0.webp', 'Stairmaster-1.webp'],
  'circuit-a': ['Freehand_Jump_Squat-0.webp', 'Freehand_Jump_Squat-1.webp'],
  'circuit-b': ['Mountain_Climbers-0.webp', 'Mountain_Climbers-1.webp'],
}

/** Photo pair filenames (under BASE_URL + 'demo/') or null. */
export function photosFor(id: string): [string, string] | null {
  return DEMO_PHOTOS[id] ?? null
}
