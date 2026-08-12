import type { ExerciseDef } from '../types'

// ============================================================
// The no-gym library: bands, and bodyweight with somewhere to go.
//
// Two holes this fills, both of them the same hole really.
//
// BANDS were a tag with one exercise behind it. Someone who owns
// a set of loop bands and nothing else — which is the most common
// home setup there is — had a tag the generator could match and
// almost nothing to match it to.
//
// BODYWEIGHT had about ten movements total, which is enough to
// build one workout and not enough to build a PROGRAMME. That
// distinction is the whole point: the app's progression engine
// runs on double progression, add a rep until you reach the top
// of the range, then add load. With no load to add, a bodyweight
// user hits the top of the range and the ladder ends. They do
// three sets of fifteen push-ups forever and the app has nothing
// to offer them.
//
// So these are written as PROGRESSIONS. Harder leverage instead
// of heavier weight: hands elevated to feet elevated, two legs to
// one, short lever to long. That gives the same engine somewhere
// to send someone whose only equipment is the floor, and it is
// also simply how calisthenics has always worked.
//
// BAND LOADING, honestly: a band's resistance climbs as it
// stretches, so it is easiest exactly where a muscle is weakest
// (stretched) and hardest where it is strongest. That is the
// opposite of a free weight and it is why bands are excellent for
// pull-aparts and pressdowns and mediocre for squats. Nothing
// here asks a band to be a barbell.
// ============================================================

const E = (def: ExerciseDef) => def

export const HOME_EXERCISES: ExerciseDef[] = [
  // ---------------- Bands: pull ----------------
  E({
    id: 'band-row',
    name: 'Band Row',
    kind: 'lift',
    equipment: 'Resistance band',
    steps: [
      'Anchor the band at about waist height, or sit on the floor with it looped around your feet. Arms straight, band already under tension.',
      'Pull the handles to your waist by driving the elbows back, squeezing the shoulder blades together at the end of each rep.',
      'Let the arms straighten fully and allow the shoulder blades to travel forward again before the next rep.',
    ],
    targets: {
      muscles: ['Mid-back', 'Lats', 'Rear delts', 'Biceps'],
      qualities: ['Back strength anywhere', 'Posture'],
    },
    why: 'Almost every home setup can press and almost none can pull, which is how people end up round-shouldered from a year of push-ups. A band is at its best here: the resistance climbs as you pull, which is exactly the direction a row gets stronger, so the hardest part of the band matches the strongest part of you.',
    mistakes: [
      'Standing so close to the anchor that the band is slack at the start.',
      'Shrugging toward the ears instead of driving the elbows back.',
      'Never letting the arms straighten, which halves the range.',
    ],
    cue: 'Elbows back. Squeeze the blades.',
    videoQuery: 'resistance band row proper form scapular retraction',
    restSec: 90,
  }),
  E({
    id: 'band-pull-apart',
    name: 'Band Pull-Apart',
    kind: 'lift',
    equipment: 'Resistance band',
    steps: [
      'Hold a light band in both hands at shoulder height, arms straight out in front, hands about shoulder-width apart.',
      'Pull your hands apart until the band touches your chest and your arms are out wide, squeezing the shoulder blades together.',
      'Come back slowly under control. High reps, light band, arms stay straight throughout.',
    ],
    targets: {
      muscles: ['Rear delts', 'Traps', 'Mid-back'],
      qualities: ['Shoulder health', 'Posture', 'Pressing longevity'],
    },
    why: 'The rear delt is the muscle that balances everything the front of your shoulder does, and it gets nothing from pressing. This is the cheapest, most portable way to train it, and on a plan that presses regularly it is the difference between shoulders that keep working and shoulders that start complaining.',
    mistakes: [
      'A band so heavy the elbows bend and the movement becomes a bad row.',
      'Shrugging the shoulders up toward the ears as the hands separate.',
      'Snapping back to the start instead of controlling the return.',
    ],
    cue: 'Straight arms. Squeeze the blades together.',
    videoQuery: 'band pull apart rear delt proper form',
    restSec: 45,
  }),
  E({
    id: 'band-face-pull',
    name: 'Band Face Pull',
    kind: 'lift',
    equipment: 'Resistance band',
    steps: [
      'Anchor a band at face height, or loop it around something solid. Take an end in each hand, palms facing each other, and step back until it is tight.',
      'Pull toward your forehead, separating your hands as you go, until your knuckles are beside your ears and your elbows are high.',
      'Hold for a beat, then let it back out slowly. Light resistance, high reps.',
    ],
    targets: {
      muscles: ['Rear delts', 'Traps', 'Rotator cuff'],
      qualities: ['Shoulder health', 'Posture'],
    },
    why: 'This trains the rear delt and the small external rotators of the shoulder together, which is the exact combination that keeps a pressing programme from slowly wearing the shoulder down. It needs one band and a door, so there is no reason to skip it at home.',
    mistakes: [
      'Pulling to the chest instead of the face, so the elbows drop and the rear delt is skipped.',
      'Going too heavy and turning it into a hunched upright row.',
      'Never separating the hands, which removes the rotation the movement exists for.',
    ],
    cue: 'Knuckles to the ears, elbows high.',
    videoQuery: 'band face pull proper form external rotation',
    restSec: 45,
  }),
  E({
    id: 'band-curl',
    name: 'Band Curl',
    kind: 'lift',
    equipment: 'Resistance band',
    steps: [
      'Stand on the middle of the band with both feet, an end in each hand, arms straight down, elbows at your sides.',
      'Curl up by bending the elbows only, squeeze hard at the top, then lower slowly until the arms are straight.',
      'To make it harder, stand on a wider base or step onto the band with both feet further apart.',
    ],
    targets: {
      muscles: ['Biceps', 'Forearms'],
      qualities: ['Arm size', 'Peak tension'],
    },
    why: 'A band gets harder as it shortens, so the top of the curl, where a dumbbell has gone weightless, is where the band fights hardest. It is a genuinely good match for the biceps, and stepping wider is a load increase you can make in a second without owning a single plate.',
    mistakes: [
      'Elbows drifting forward, which hands the work to the front delt.',
      'Swinging the torso to get the last few reps.',
      'Letting the band snap the arms back down instead of controlling it.',
    ],
    cue: 'Elbows pinned. Squeeze at the top.',
    videoQuery: 'resistance band biceps curl proper form',
    restSec: 60,
  }),
  // ---------------- Bands: push & hinge ----------------
  E({
    id: 'band-pressdown',
    name: 'Band Pressdown',
    kind: 'lift',
    equipment: 'Resistance band',
    steps: [
      'Anchor a band above head height. Face it, elbows pinned to your sides, forearms up.',
      'Straighten your arms fully by driving your hands down, squeeze the triceps, then let the forearms come back up under control.',
      'The elbows stay at your sides and do not travel. Only the forearms move.',
    ],
    targets: {
      muscles: ['Triceps'],
      qualities: ['Arm size', 'Lockout strength'],
    },
    why: 'Push-ups train the triceps but never at a hard lockout, which is where the muscle that adds size to the back of the arm actually works. A band is strongest exactly there, so this is a near-perfect pairing and needs nothing but a door anchor.',
    mistakes: [
      'Elbows drifting forward so the whole body pushes.',
      'Leaning over the band and using bodyweight instead of the triceps.',
      'Stopping short of a full lockout, which is the part push-ups already missed.',
    ],
    cue: 'Elbows pinned. Lock it out.',
    videoQuery: 'band tricep pressdown proper form elbow position',
    restSec: 60,
  }),
  E({
    id: 'band-overhead-press',
    name: 'Band Overhead Press',
    kind: 'lift',
    equipment: 'Resistance band',
    steps: [
      'Stand on the middle of the band, hands at shoulder height, palms forward, ribs down and abs braced.',
      'Press straight overhead until the arms are locked out and your head passes through the window your arms make.',
      'Lower under control to shoulder height. Do not let the ribs flare or the lower back arch to finish a rep.',
    ],
    targets: {
      muscles: ['Front delts', 'Side delts', 'Triceps', 'Core'],
      qualities: ['Overhead strength', 'Trunk stiffness'],
    },
    why: 'Overhead pressing is the shoulder movement bodyweight training struggles to reach without a handstand, and the band version gives you a real lockout with no equipment beyond the band. The resistance climbing toward the top matches the press getting stronger as the elbows straighten.',
    mistakes: [
      'Arching the lower back to press, which turns it into a standing incline press.',
      'Pressing around the head instead of straight up.',
      'A band so light the top half of the movement is free.',
    ],
    cue: 'Ribs down. Head through the window.',
    videoQuery: 'resistance band overhead press standing proper form',
    restSec: 90,
  }),
  E({
    id: 'band-good-morning',
    name: 'Band Good Morning',
    kind: 'lift',
    equipment: 'Resistance band',
    steps: [
      'Stand on the band, loop the top behind your neck across your upper back, feet about hip-width, knees softly bent.',
      'Push your hips straight back with a flat back until you feel a real hamstring stretch, chest facing the floor.',
      'Drive your hips forward to stand tall and squeeze the glutes. Do not round the back at any point.',
    ],
    targets: {
      muscles: ['Hamstrings', 'Glutes', 'Lower back'],
      qualities: ['Hip hinge pattern', 'Posterior chain strength'],
    },
    why: 'The hinge is the pattern that builds the back of your legs and it is the one bodyweight training has almost no answer for. A band loaded across the upper back gives you resistance that increases as you stand up, which is exactly where a hinge is strongest, and it teaches the pattern safely before any barbell is involved.',
    mistakes: [
      'Squatting instead of hinging, bending the knees and dropping straight down.',
      'Rounding the lower back at the bottom to reach further.',
      'Leaning back at the top instead of just standing tall.',
    ],
    cue: 'Hips BACK, flat back, then stand tall.',
    videoQuery: 'band good morning hip hinge proper form',
    restSec: 90,
  }),
  E({
    id: 'band-lateral-walk',
    name: 'Band Lateral Walk',
    kind: 'lift',
    equipment: 'Loop band',
    steps: [
      'Loop a band around your legs just above the knees or around the ankles. Half-squat, feet hip-width, chest up.',
      'Step sideways, keeping tension on the band the whole time and keeping your feet pointing forward.',
      'Take the prescribed steps one way, then come back the other. Stay low, do not bob up and down.',
    ],
    targets: {
      muscles: ['Glutes', 'Quads'],
      qualities: ['Hip stability', 'Landing control', 'Knee health'],
    },
    why: 'Gluteus medius is what stops your knee caving inward when you land or cut, and squats and lunges do not train it directly. On a plan with jumping in it that muscle is knee insurance, and this loads it with one small band and a few feet of floor.',
    mistakes: [
      'Standing too upright, which lets the hips do nothing.',
      'Letting the trailing foot get dragged along instead of stepping it in under control.',
      'Feet turning outward, which lets the movement happen at the ankle.',
    ],
    cue: 'Stay low. Keep tension the whole way.',
    videoQuery: 'band lateral walk glute medius proper form',
    restSec: 45,
  }),
  // ---------------- Bodyweight push progression ----------------
  E({
    id: 'incline-push-up',
    name: 'Incline Push-Up',
    kind: 'lift',
    equipment: 'Bench, table or wall',
    steps: [
      'Hands on a raised surface, just outside shoulder-width. Walk your feet back until your body is one straight line.',
      'Lower your chest to the surface with the elbows about 45° from the body, then press away hard to straight arms.',
      'The higher the surface, the easier it is. Lower the surface as you get stronger, that is the progression.',
    ],
    targets: {
      muscles: ['Chest', 'Front delts', 'Triceps', 'Core'],
      qualities: ['Pressing strength', 'Entry point to the push-up'],
    },
    why: 'This is the push-up made scalable. A full push-up is roughly two-thirds of your bodyweight, which is a lot for a first pressing movement, and doing bad half reps because of it teaches nothing. Raising the hands lowers the load smoothly, and the surface coming down over the weeks is the load going up.',
    mistakes: [
      'Hips sagging or piking, the straight line matters as much here as on the floor.',
      'Half reps that never bring the chest to the surface.',
      'Staying on the same height for months. Lower it when the reps get easy.',
    ],
    cue: 'One straight line. Chest to the surface.',
    videoQuery: 'incline push up proper form progression',
    restSec: 75,
  }),
  E({
    id: 'decline-push-up',
    name: 'Decline Push-Up (feet raised)',
    kind: 'lift',
    equipment: 'Floor + a chair or box',
    steps: [
      'Hands on the floor just outside shoulder-width, feet up on a chair, bench or box, body in one straight line.',
      'Lower your chest to just above the floor, elbows about 45° from the body, then press the floor away to straight arms.',
      'The higher the feet, the harder it is, and the more of the work moves to the upper chest and shoulders.',
    ],
    targets: {
      muscles: ['Upper chest', 'Front delts', 'Triceps', 'Core'],
      qualities: ['Pressing strength', 'Upper chest', 'Progression past the push-up'],
    },
    why: 'This is where a bodyweight presser goes once floor push-ups stop being hard, which otherwise is the end of the ladder. Raising the feet shifts weight onto the hands and tilts the angle upward, so it loads the upper chest the way an incline press does, without owning an incline bench.',
    mistakes: [
      'Hips piking up, which shortens the movement and hides the difficulty.',
      'Going straight to a very high box and doing partial reps.',
      'Letting the head drop toward the floor instead of keeping a neutral neck.',
    ],
    cue: 'Straight line, chest to the floor.',
    videoQuery: 'decline push up feet elevated proper form',
    restSec: 90,
  }),
  E({
    id: 'archer-push-up',
    name: 'Archer Push-Up',
    kind: 'lift',
    equipment: 'Floor',
    steps: [
      'Set up in a push-up with your hands much wider than normal, body in one straight line.',
      'Lower toward one hand, bending that elbow while the other arm stays nearly straight and slides out sideways.',
      'Press back up through the bent arm. Alternate sides each rep, or do all reps on one side then the other.',
    ],
    targets: {
      muscles: ['Chest', 'Front delts', 'Triceps', 'Core'],
      qualities: ['One-arm pressing strength', 'Trunk anti-rotation'],
    },
    why: 'Most of your bodyweight lands on one arm, so it is a genuine strength step up from a decline push-up rather than just more reps, and it is the honest path toward a one-arm push-up. The trunk also has to stop you twisting, which is real core work no plank gives you.',
    mistakes: [
      'Twisting the hips to get down, which is the core giving up.',
      'Bending the straight arm and turning it into a wide push-up.',
      'Adding it before floor push-ups are genuinely easy for the full set.',
    ],
    cue: 'Hips square. One arm does the work.',
    videoQuery: 'archer push up proper form progression one arm',
    restSec: 120,
  }),
  E({
    id: 'diamond-push-up',
    name: 'Diamond Push-Up',
    kind: 'lift',
    equipment: 'Floor',
    steps: [
      'Hands together under your chest, index fingers and thumbs making a triangle, body in one straight line.',
      'Lower your chest to your hands keeping the elbows close to your sides, then press back to straight arms.',
      'Elbows track back along the ribs, not out to the sides.',
    ],
    targets: {
      muscles: ['Triceps', 'Chest', 'Front delts'],
      qualities: ['Arm size', 'Lockout strength'],
    },
    why: 'Narrow hands and tucked elbows make this the closest a bodyweight exercise gets to direct triceps work, which is otherwise the hardest muscle to train without equipment. It is the no-gear answer to a pressdown, and it is measurably harder than a standard push-up so it fits the progression rather than replacing it.',
    mistakes: [
      'Elbows flaring out wide, which hands the work back to the chest.',
      'Hips sagging because the harder variation broke the line.',
      'Wrist pain from forcing a perfect diamond. A slightly wider triangle is fine.',
    ],
    cue: 'Elbows tight to the ribs.',
    videoQuery: 'diamond push up triceps proper form elbow position',
    restSec: 90,
  }),
  // ---------------- Bodyweight leg progression ----------------
  E({
    id: 'cossack-squat',
    name: 'Cossack Squat',
    kind: 'lift',
    equipment: 'Floor',
    steps: [
      'Stand with your feet very wide, toes slightly out. Shift your weight to one side and sit down into that hip.',
      'Keep the other leg straight with the toes up, chest tall, and go as deep as your hips allow without rounding.',
      'Drive back to the middle and shift to the other side. Hold something in front for balance if you need to.',
    ],
    targets: {
      muscles: ['Quads', 'Glutes', 'Adductors', 'Hamstrings'],
      qualities: ['Single-leg strength', 'Hip mobility', 'Groin strength'],
    },
    why: 'It trains one leg deeply and it is the only movement here that loads the adductors at a long length, which is the muscle group most often pulled in sports that cut sideways. Strength and mobility in the same rep, with nothing but floor space.',
    mistakes: [
      'Rounding the lower back to reach depth the hips do not have yet.',
      'Letting the heel of the working leg come off the floor.',
      'Rushing. Depth comes from control, not from bouncing at the bottom.',
    ],
    cue: 'Sit into one hip. Chest tall.',
    videoQuery: 'cossack squat proper form depth mobility',
    restSec: 90,
  }),
  E({
    id: 'shrimp-squat',
    name: 'Shrimp Squat',
    kind: 'lift',
    equipment: 'Floor',
    steps: [
      'Stand on one leg, bend the other knee and hold that foot behind you with the same-side hand.',
      'Sit down on the standing leg until the back knee touches the floor, keeping the chest tall and the standing heel down.',
      'Drive back up through the whole foot. Hold a support in front until you can balance through the full rep.',
    ],
    targets: {
      muscles: ['Quads', 'Glutes', 'Core'],
      qualities: ['Single-leg strength', 'Balance', 'Path to a pistol squat'],
    },
    why: 'Single-leg strength is what jumping and sprinting actually run on, and a bodyweight programme runs out of leg exercises fast. This is a genuine strength step past a split squat, needs no equipment at all, and the back knee touching down gives you a fixed depth so the reps stay honest.',
    mistakes: [
      'The standing heel lifting, which shortens the range and stresses the knee.',
      'Crashing the back knee into the floor instead of touching it lightly.',
      'Trying it before split squats are comfortable, which just teaches a wobble.',
    ],
    cue: 'Back knee taps. Heel stays down.',
    videoQuery: 'shrimp squat progression proper form',
    restSec: 120,
  }),
  E({
    id: 'single-leg-glute-bridge',
    name: 'Single-Leg Glute Bridge',
    kind: 'lift',
    equipment: 'Floor',
    steps: [
      'Lie on your back, one foot flat and close to your glutes, the other leg lifted with the knee bent or straight.',
      'Drive through the heel of the down foot to lift your hips until your body is a straight line from knee to shoulder, squeezing the glute hard.',
      'Lower under control without letting the hips twist. Keep them level the whole set.',
    ],
    targets: {
      muscles: ['Glutes', 'Hamstrings', 'Core'],
      qualities: ['Hip extension power', 'Hip stability', 'Sprint drive'],
    },
    why: 'Hip extension is what drives a sprint and a jump, and doing it on one leg both doubles the load and forces the hip to stay level, which is the stability the two-legged version never asks for. It is the bodyweight step up from a glute bridge, so the ladder keeps going.',
    mistakes: [
      'Arching the lower back to get higher instead of finishing with the glute.',
      'Hips twisting toward the working side.',
      'Pushing through the toes rather than the heel, which recruits the hamstring instead.',
    ],
    cue: 'Drive the heel. Keep the hips level.',
    videoQuery: 'single leg glute bridge proper form hips level',
    restSec: 75,
  }),
  E({
    id: 'wall-sit',
    name: 'Wall Sit',
    kind: 'lift',
    equipment: 'Wall',
    steps: [
      'Back flat against a wall, walk your feet out and slide down until your thighs are parallel to the floor and your knees are over your ankles.',
      'Hold. Weight through the whole foot, back flat on the wall, breathing normally.',
      'To progress, hold longer, then shift more weight onto one leg, then lift one foot entirely.',
    ],
    targets: {
      muscles: ['Quads', 'Glutes', 'Core'],
      qualities: ['Quad endurance', 'Isometric strength', 'Knee resilience'],
    },
    why: 'It loads the quads hard with zero equipment and no impact, which makes it the safest way to finish a leg day at home and a useful option on a day the knees are cranky. Held near parallel it also builds the isometric strength that landing from a jump actually demands.',
    mistakes: [
      'Sitting too high, above parallel, which makes it far easier than it looks.',
      'Knees drifting past the toes because the feet are too close to the wall.',
      'Holding the breath. Breathe through it.',
    ],
    cue: 'Thighs parallel. Back flat on the wall.',
    videoQuery: 'wall sit proper form knee angle',
    restSec: 60,
  }),
  E({
    id: 'bird-dog',
    name: 'Bird Dog',
    kind: 'core',
    equipment: 'Floor',
    steps: [
      'On hands and knees, hands under shoulders, knees under hips, back flat and ribs down.',
      'Reach one arm forward and the opposite leg back until both are level with your torso, without letting the hips tilt.',
      'Hold for a beat, come back under control, and switch sides. Slow is the point.',
    ],
    targets: {
      muscles: ['Core', 'Lower back', 'Glutes'],
      qualities: ['Anti-rotation', 'Spine stability', 'Hip control'],
    },
    why: 'The trunk\'s real job in sport is to resist movement, not create it, and this trains exactly that: the load tries to twist and tilt you, and the work is refusing. It also costs nothing to recover from, which is why it belongs on a day that already had heavy legs.',
    mistakes: [
      'Hips rocking open as the leg goes back, which is the exact thing being trained away.',
      'Lifting the leg above hip height and arching the lower back.',
      'Rushing through reps. Two slow ones beat ten fast ones.',
    ],
    cue: 'Level hips. Reach long, do not lift high.',
    videoQuery: 'bird dog exercise proper form hip stability',
    restSec: 45,
  }),
  E({
    id: 'superman-hold',
    name: 'Superman Hold',
    kind: 'core',
    equipment: 'Floor',
    steps: [
      'Lie face down, arms out in front, legs straight, forehead down.',
      'Lift your chest, arms and legs off the floor at the same time and hold, squeezing the glutes and upper back.',
      'Look at the floor, not forward. Breathe through the hold.',
    ],
    targets: {
      muscles: ['Lower back', 'Glutes', 'Rear delts'],
      qualities: ['Posterior chain endurance', 'Posture'],
    },
    why: 'Home training is almost entirely front-of-body, and the muscles that hold you upright get nothing. This trains the whole back line at once with no equipment, and lower-back endurance is one of the better-supported protections against the back pain that comes from sitting all day.',
    mistakes: [
      'Craning the neck to look forward instead of keeping it neutral.',
      'Bouncing up and down instead of holding a steady position.',
      'Trying to get high. Height is not the goal, tension is.',
    ],
    cue: 'Squeeze glutes and upper back. Eyes down.',
    videoQuery: 'superman hold exercise proper form neck neutral',
    restSec: 45,
  }),
  E({
    id: 'prone-rear-delt-raise',
    name: 'Prone Y-T Raise',
    kind: 'lift',
    equipment: 'Floor',
    steps: [
      'Lie face down, forehead resting on a towel, arms out in front in a Y with thumbs up.',
      'Lift both arms off the floor as high as they will go without shrugging, hold for a beat, lower slowly. That is the Y.',
      'Then take the arms straight out to the sides in a T and repeat. Slow, small range, no weight needed at all.',
    ],
    targets: {
      muscles: ['Rear delts', 'Traps', 'Mid-back'],
      qualities: ['Shoulder health', 'Posture', 'Rear delt with zero equipment'],
    },
    why: 'With no equipment at all this is the only thing that trains the back of the shoulder as the main mover, and the back of the shoulder is what balances a programme full of push-ups. It needs nothing but floor, and the muscles are small enough that bodyweight against gravity is genuinely enough load.',
    mistakes: [
      'Shrugging the shoulders up toward the ears instead of lifting from the mid-back.',
      'Craning the neck up. The forehead stays down.',
      'Rushing. This is a slow lift with a pause, not a flap.',
    ],
    cue: 'Thumbs up, lift from the mid-back, no shrug.',
    videoQuery: 'prone Y T raise floor rear delt no weight',
    restSec: 45,
  }),
  E({
    id: 'underhand-inverted-row',
    name: 'Underhand Inverted Row',
    kind: 'lift',
    equipment: 'Sturdy table or low bar',
    steps: [
      'Lie under a sturdy table or low bar and take an underhand grip about shoulder-width, palms facing you.',
      'With your body in one straight line and heels on the floor, pull your chest to the edge, leading with the elbows down past your ribs.',
      'Lower all the way to straight arms. Walk your feet further out to make it harder, or bend your knees to make it easier.',
    ],
    targets: {
      muscles: ['Biceps', 'Lats', 'Mid-back'],
      qualities: ['Arm size with no equipment', 'Path to a chin-up'],
    },
    why: 'The underhand grip puts the biceps in the strongest position they have, which makes this the one movement that trains arms as the main mover when you own nothing at all. It is also the honest step toward a chin-up, and the difficulty is set by where you put your feet rather than by weight you do not have.',
    mistakes: [
      'Hips sagging so the body stops being one line.',
      'Half reps that never reach the edge or never straighten the arms.',
      'Using a table that is not solid. Check it holds your weight before the first rep.',
    ],
    cue: 'Straight line, chest to the edge, arms all the way down.',
    videoQuery: 'underhand inverted row table biceps proper form',
    restSec: 90,
  }),
  E({
    id: 'bodyweight-calf-raise',
    name: 'Single-Leg Calf Raise (step)',
    kind: 'lift',
    equipment: 'Stair or step',
    steps: [
      'Stand on one foot with the ball of the foot on the edge of a step, heel hanging free. Hold something for balance.',
      'Let the heel drop as far below the step as it will go, pause in the stretch, then press up as high onto the toes as possible.',
      'Pause at the top too. Slow reps, no bouncing off the bottom.',
    ],
    targets: {
      muscles: ['Calves', 'Achilles / feet'],
      qualities: ['Calf size', 'Ankle stiffness', 'Jump force transfer'],
    },
    why: 'Calves are strong enough that two-legged bodyweight raises are barely training, so one leg on a step is the version that actually loads them. The range below the step is what a flat-floor raise cannot give you, and the calf grows more from that stretched position than almost any other muscle does.',
    mistakes: [
      'Bouncing out of the bottom on the Achilles rather than lifting with the muscle.',
      'Bending the knee, which shifts the work off the muscle that helps you jump.',
      'A short range that never drops the heel below the step.',
    ],
    cue: 'Heel well below the step. Pause top and bottom.',
    videoQuery: 'single leg calf raise step full range stretch',
    restSec: 60,
  }),
]
