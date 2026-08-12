import type { ExerciseDef } from '../types'

// ============================================================
// The full-gym library: machines and cables.
//
// The catalog was built around a dunk plan, so it is deep in
// jumps, sprints and free weights and had exactly six machine
// entries in it: a pulldown, a cable row, leg press, one leg
// curl, and the two ergs. Somebody who ticks "commercial gym"
// owns half a room of equipment the app could not name, and the
// generator was quietly handing them a garage workout.
//
// WHY MACHINES EARN THEIR PLACE, rather than being a lesser
// version of a barbell. Three real reasons, and none of them is
// "easier":
//
//   STABILITY IS NOT THE POINT on an isolation movement. A
//   lateral raise limited by how well you can stand still is not
//   training the side delt to failure, it is training standing
//   still. A cable holds tension where a dumbbell loses it.
//
//   RESISTANCE PROFILE. A dumbbell curl is hardest at 90° and
//   nearly free at the top and bottom. A cable is loaded through
//   the whole range, which is most of why cables and machines
//   show up in hypertrophy programming at all.
//
//   FAILURE IS SAFE. Taking a set genuinely close to failure is
//   the single biggest driver of growth per set, and it is the
//   thing people will not do on a free-weight compound without a
//   spotter. A leg press does not need one.
//
// LOADING NOTE, because the app prescribes a weight: machine and
// cable stacks are not comparable between gyms, and a cable's
// pulley ratio can halve the load at the handle. Every entry
// here is prescribed by REPS and effort rather than by matching
// a barbell number, and the app's own progression reads what you
// logged last time on that machine. Nobody should chase another
// gym's plate number.
// ============================================================

const E = (def: ExerciseDef) => def

export const GYM_EXERCISES: ExerciseDef[] = [
  // ---------------- Press ----------------
  E({
    id: 'machine-chest-press',
    name: 'Machine Chest Press',
    kind: 'lift',
    equipment: 'Chest press machine',
    steps: [
      'Set the seat so the handles line up with the middle of your chest, not your throat or your belly. Feet flat, back against the pad.',
      'Press out until your arms are straight but not locked hard, then let the handles come back until you feel the chest stretch, staying in control.',
      'Keep the shoulder blades pulled back and DOWN into the pad the whole set. Push through the whole hand, not just the fingers.',
    ],
    targets: {
      muscles: ['Chest', 'Front delts', 'Triceps'],
      qualities: ['Pressing strength', 'Chest size', 'Safe near-failure work'],
    },
    why: 'This is the pressing pattern with the balancing removed, which is exactly what you want on the last press of a session: you can take it to genuine near-failure without a spotter, and hard sets close to failure are what actually drive chest growth. The fixed path also lets you keep pressing on a day your shoulder does not like a barbell.',
    mistakes: [
      'Seat too low, which turns it into an incline press onto your collarbones.',
      'Letting the shoulders roll forward at the bottom. Blades stay pinned back and down.',
      'Slamming into the lockout and bouncing off the stack on the way back.',
    ],
    cue: 'Blades pinned. Press through the whole hand.',
    videoQuery: 'seated machine chest press proper form setup',
    restSec: 120,
  }),
  E({
    id: 'pec-deck',
    name: 'Pec Deck / Machine Fly',
    kind: 'lift',
    equipment: 'Pec deck machine',
    steps: [
      'Set the seat so your hands sit at roughly chest height with a soft bend in the elbow you will hold all set.',
      'Bring the pads together in front of your chest, squeeze for a beat, then let them open until you feel a real stretch across the chest.',
      'The elbow angle never changes. If it opens and closes, you have turned a fly into a press.',
    ],
    targets: {
      muscles: ['Chest', 'Front delts'],
      qualities: ['Chest size', 'Stretch under load'],
    },
    why: 'A fly trains the chest in the one job a press cannot isolate: bringing the arm across the body. This one loads that at the stretched position, which is where the growth stimulus per set is highest, and it does it without asking your shoulder to stabilise a dumbbell out to the side.',
    mistakes: [
      'Bending and straightening the elbows, turning it into a bad press.',
      'Going so deep the shoulders roll forward, chasing stretch past what the joint wants.',
      'Racing. This one is slow, and the squeeze at the front is half the exercise.',
    ],
    cue: 'Fixed elbows. Squeeze, then stretch.',
    videoQuery: 'pec deck machine fly proper form elbow angle',
    restSec: 90,
  }),
  E({
    id: 'cable-fly',
    name: 'Cable Fly',
    kind: 'lift',
    equipment: 'Cable station',
    steps: [
      'Set both pulleys at about shoulder height, take a handle in each hand, and step forward into a split stance so there is tension before you start.',
      'With a fixed soft elbow bend, bring your hands together in front of your chest and cross them slightly, then open back out under control.',
      'Lean forward slightly from the hips and keep the ribs down. Chest leads, not the arms.',
    ],
    targets: {
      muscles: ['Chest', 'Front delts'],
      qualities: ['Chest size', 'Constant tension'],
    },
    why: 'A cable keeps the chest loaded through the entire range, including the top, where a dumbbell fly is basically resting. Crossing the hands past the midline finishes the movement the chest actually does, which no barbell press ever reaches.',
    mistakes: [
      'Standing too far back in the machine so the start has no tension.',
      'Turning it into a press by bending the elbows through the rep.',
      'Setting the pulleys too high, which drags the work up into the front delts.',
    ],
    cue: 'Cross the hands. Chest leads.',
    videoQuery: 'cable fly chest proper form pulley height',
    restSec: 90,
  }),
  // ---------------- Pull ----------------
  E({
    id: 'chest-supported-row-machine',
    name: 'Chest-Supported Row (machine)',
    kind: 'lift',
    equipment: 'Chest-supported row machine',
    steps: [
      'Set the chest pad so your arms can reach the handles with the shoulders relaxed forward at the start.',
      'Pull the handles toward your waist by driving the elbows back and down, squeezing the shoulder blades together at the end.',
      'Let the arms straighten fully and allow the shoulder blades to travel forward again. Full range, both directions.',
    ],
    targets: {
      muscles: ['Mid-back', 'Lats', 'Rear delts', 'Biceps'],
      qualities: ['Back thickness', 'Posture', 'Rowing strength'],
    },
    why: 'The chest pad takes the lower back out of the equation entirely, so every rep is back work rather than a fight to stay bent over. That means you can row hard on a day your spine has already done squats, and it is the single best way to add rowing volume without adding lower-back fatigue.',
    mistakes: [
      'Yanking with the biceps and never moving the shoulder blades.',
      'Shrugging the weight up into the traps instead of pulling the elbows back.',
      'Cutting the stretch short by never letting the arms straighten.',
    ],
    cue: 'Elbows back and down. Let the blades travel.',
    videoQuery: 'chest supported row machine proper form scapular',
    restSec: 120,
  }),
  E({
    id: 'straight-arm-pulldown',
    name: 'Straight-Arm Pulldown',
    kind: 'lift',
    equipment: 'Cable station',
    steps: [
      'Stand facing a high pulley with a bar or rope, arms straight out in front, a soft unchanging bend in the elbows, hips pushed back slightly.',
      'Pull the bar down in an arc to your thighs using the lats only, keeping the arms straight the whole way.',
      'Let it travel back up until you feel the lats stretch overhead, without letting the ribs flare.',
    ],
    targets: {
      muscles: ['Lats', 'Triceps', 'Core'],
      qualities: ['Lat size', 'Mind-muscle connection'],
    },
    why: 'Every other back movement bends the elbow, which means the biceps can hide the lats. This one cannot be cheated with the arms, so it is the fastest way to actually learn what a lat contraction feels like, and it loads the lat in the stretched overhead position that pulldowns rush through.',
    mistakes: [
      'Bending the elbows, which turns it into a pushdown for the triceps.',
      'Standing bolt upright so the arc has nowhere to go.',
      'Using so much weight the whole torso rocks to move it.',
    ],
    cue: 'Straight arms. Feel the lat, not the arm.',
    videoQuery: 'straight arm pulldown lat form cable',
    restSec: 90,
  }),
  E({
    id: 'face-pull',
    name: 'Face Pull',
    kind: 'lift',
    equipment: 'Cable station + rope',
    steps: [
      'Set a rope at about face height. Step back until there is tension, palms facing each other, thumbs pointing back.',
      'Pull the rope toward your forehead, separating your hands as you go, until your knuckles are beside your ears and the elbows are high.',
      'Hold the end position for a beat, then let it back out slowly. Light weight, high reps.',
    ],
    targets: {
      muscles: ['Rear delts', 'Traps', 'Rotator cuff'],
      qualities: ['Shoulder health', 'Posture', 'Pressing longevity'],
    },
    why: 'Every pressing day loads the front of the shoulder and nothing loads the back of it, and that imbalance is what most nagging shoulder pain in a lifting programme actually is. This trains the rear delt and the external rotators together, which is the cheapest insurance there is on a plan that presses twice a week.',
    mistakes: [
      'Loading it heavy, which turns it into a bad upright row.',
      'Pulling to the chest instead of the face, so the elbows drop and the rear delt is skipped.',
      'Never separating the hands at the end, which is the whole rotation component.',
    ],
    cue: 'Knuckles to the ears. Light and high-rep.',
    videoQuery: 'face pull rope proper form rear delt external rotation',
    restSec: 60,
  }),
  E({
    id: 'assisted-pull-up',
    name: 'Assisted Pull-Up',
    kind: 'lift',
    equipment: 'Assisted pull-up machine',
    steps: [
      'Set the assistance so you can just complete the prescribed reps with the last one or two genuinely hard. More assistance means less bodyweight lifted.',
      'Start from a full hang with the arms straight, then pull until your chin clears the bar, leading with the elbows down to the ribs.',
      'Lower all the way back to a straight-arm hang every rep. Reduce the assistance as the reps get easier.',
    ],
    targets: {
      muscles: ['Lats', 'Mid-back', 'Biceps', 'Forearms'],
      qualities: ['Vertical pulling strength', 'Path to a real pull-up'],
    },
    why: 'The pull-up is the best upper-back builder there is and most people cannot yet do enough of them to train with. This gives you the exact same movement at a load you can actually get reps on, and because the assistance is a number on a stack, your progress toward an unassisted pull-up is measurable rather than a hope.',
    mistakes: [
      'So much assistance that the set is easy, which trains nothing.',
      'Half reps that never reach a straight-arm hang at the bottom.',
      'Kipping. If it needs a swing, add assistance instead.',
    ],
    cue: 'Full hang, chin over. Drop the assist over time.',
    videoQuery: 'assisted pull up machine proper form full range',
    restSec: 120,
  }),
  // ---------------- Arms & delts ----------------
  E({
    id: 'tricep-pushdown',
    name: 'Tricep Pushdown',
    kind: 'lift',
    equipment: 'Cable station',
    steps: [
      'Face a high pulley with a bar or rope. Elbows pinned to your sides, forearms up, ribs down.',
      'Straighten your arms fully by driving the hands down, then let the forearms come back up until you feel the triceps stretch.',
      'The elbows do not move forward or back. Only the forearms travel.',
    ],
    targets: {
      muscles: ['Triceps'],
      qualities: ['Arm size', 'Lockout strength'],
    },
    why: 'Pressing already trains the triceps, but never to a full lockout under tension, which is the head that actually adds size to the back of the arm. A cable keeps the load on through the whole range, so this is direct arm work you can take right to failure with no risk and no spotter.',
    mistakes: [
      'Elbows drifting forward and turning it into a press with the whole body.',
      'Leaning over the bar and pushing with bodyweight.',
      'Stopping short of a full lockout, which skips the part the presses missed.',
    ],
    cue: 'Elbows pinned. Only the forearms move.',
    videoQuery: 'tricep pushdown cable proper form elbow position',
    restSec: 60,
  }),
  E({
    id: 'cable-curl',
    name: 'Cable Curl',
    kind: 'lift',
    equipment: 'Cable station',
    steps: [
      'Stand facing a low pulley, bar or handle in both hands, elbows at your sides, shoulders back.',
      'Curl up by bending the elbow only, squeeze at the top, then lower under control until the arms are straight.',
      'Keep the elbows still and the ribs down. If the body swings, drop the weight.',
    ],
    targets: {
      muscles: ['Biceps', 'Forearms'],
      qualities: ['Arm size', 'Constant tension'],
    },
    why: 'A dumbbell curl is nearly weightless at the bottom and the top, which is why the bottom half of most peoples biceps training does almost nothing. A cable pulls the whole way, so the same set of ten is loaded through a range a dumbbell only partly covers.',
    mistakes: [
      'Swinging the torso to start the rep.',
      'Letting the elbows drift forward, which hands the work to the front delt.',
      'Stopping halfway down and never straightening the arm.',
    ],
    cue: 'Elbows still. Straighten all the way down.',
    videoQuery: 'cable curl biceps proper form constant tension',
    restSec: 60,
  }),
  E({
    id: 'cable-lateral-raise',
    name: 'Cable Lateral Raise',
    kind: 'lift',
    equipment: 'Cable station',
    steps: [
      'Stand side-on to a low pulley, handle in the far hand, cable crossing in front of your body.',
      'Raise your arm out to the side to about shoulder height with a soft elbow, leading with the elbow rather than the hand.',
      'Lower slowly all the way down. The cable stays under tension even at the bottom, which is the point.',
    ],
    targets: {
      muscles: ['Side delts', 'Traps'],
      qualities: ['Shoulder width', 'Constant tension'],
    },
    why: 'Shoulder width comes from the side delt, and the side delt gets almost nothing from pressing. A dumbbell version is weightless at the bottom of every rep; the cable is not, so you get a full range of loaded work and can train the muscle rather than your ability to stand still.',
    mistakes: [
      'Going far above shoulder height, which hands the work to the traps.',
      'Heaving with the legs and torso, a sure sign the weight is too heavy.',
      'Dropping the arm back down with no control, wasting half of every rep.',
    ],
    cue: 'Lead with the elbow. Slow on the way down.',
    videoQuery: 'cable lateral raise side delt proper form',
    restSec: 60,
  }),
  // ---------------- Legs ----------------
  E({
    id: 'hack-squat',
    name: 'Hack Squat',
    kind: 'lift',
    equipment: 'Hack squat machine',
    steps: [
      'Shoulders under the pads, feet about shoulder-width in the middle of the platform, back flat against the pad.',
      'Unlock, then lower under control until your thighs are at least parallel, knees tracking over your toes.',
      'Drive through the whole foot to come back up, stopping just short of locking the knees hard.',
    ],
    targets: {
      muscles: ['Quads', 'Glutes', 'Adductors'],
      qualities: ['Leg size', 'Safe near-failure squatting'],
    },
    why: 'The back pad removes the balance and bracing demand of a barbell squat, so the legs get the whole set instead of the trunk giving out first. That makes it the best way to train quads genuinely close to failure, and you can bail out of a rep safely, which nobody can do under a loaded bar alone.',
    mistakes: [
      'Cutting depth. Above parallel trains the top of a range the legs barely use.',
      'Letting the lower back peel off the pad at the bottom by chasing extra depth.',
      'Snapping into a hard knee lockout at the top rep after rep.',
    ],
    cue: 'At least parallel. Back stays on the pad.',
    videoQuery: 'hack squat machine proper form foot placement depth',
    restSec: 150,
  }),
  E({
    id: 'leg-extension',
    name: 'Leg Extension',
    kind: 'lift',
    equipment: 'Leg extension machine',
    steps: [
      'Set the back pad so your knee joint lines up with the machine pivot, and the shin pad sits low on your shins, not on your ankle bone.',
      'Straighten your legs fully, pause for a beat at the top, then lower under control without letting the weight touch down between reps.',
      'Sit back into the pad and hold the handles. Do not rock your hips to help.',
    ],
    targets: {
      muscles: ['Quads'],
      qualities: ['Quad size', 'Knee-extension strength'],
    },
    why: 'It is the only movement that trains the quad without the glutes and back sharing the load, and it is the only one that loads rectus femoris in a lengthened position at all. That makes it genuinely useful accessory work rather than a warm-up, and it is one of the safest places to take a set to failure.',
    mistakes: [
      'Knee not lined up with the pivot, which is where the joint pain comes from.',
      'Kicking the weight up with a hip rock instead of extending the knee.',
      'Resting the stack on the bottom between reps and losing all the tension.',
    ],
    cue: 'Knee on the pivot. Pause at the top.',
    videoQuery: 'leg extension machine setup knee alignment form',
    restSec: 90,
  }),
  E({
    id: 'seated-leg-curl',
    name: 'Seated Leg Curl',
    kind: 'lift',
    equipment: 'Seated leg curl machine',
    steps: [
      'Set the back pad so your knees line up with the pivot, secure the lap pad, and hold the handles.',
      'Curl your heels down and under as far as they will go, squeeze, then let the legs straighten under control.',
      'Keep your hips down in the seat. Do not lift off the pad to finish a rep.',
    ],
    targets: {
      muscles: ['Hamstrings', 'Calves'],
      qualities: ['Hamstring size', 'Knee-flexion strength', 'Sprint injury insurance'],
    },
    why: 'The hip is bent, so the hamstring is already lengthened before the rep starts, and training a muscle in a stretched position is the version that grows it fastest. It also directly trains knee flexion, which every hinge and deadlift in the plan misses entirely, and hamstring strength is the best-supported protection there is against pulling one sprinting.',
    mistakes: [
      'Hips lifting off the seat, which is the machine telling you it is too heavy.',
      'Half reps that never reach full knee bend.',
      'Slamming back to the start instead of controlling the way out.',
    ],
    cue: 'Hips down. Curl all the way under.',
    videoQuery: 'seated leg curl machine proper form setup',
    restSec: 90,
  }),
  E({
    id: 'standing-calf-machine',
    name: 'Standing Calf Raise (machine)',
    kind: 'lift',
    equipment: 'Standing calf machine',
    steps: [
      'Balls of the feet on the platform, heels hanging free, shoulders under the pads, knees straight but not locked hard.',
      'Drop the heels as far below the platform as they will go, pause in the stretch, then press up onto the toes as high as possible.',
      'Pause at the top too. Slow, full reps, no bouncing.',
    ],
    targets: {
      muscles: ['Calves', 'Achilles / feet'],
      qualities: ['Calf size', 'Jump force transfer', 'Ankle stiffness'],
    },
    why: 'The knee stays straight, which is what loads the gastrocnemius, the calf head that actually contributes to jumping. The extra range below the platform is the part a floor calf raise cannot give you, and the calf responds to that stretched position more than almost any other muscle.',
    mistakes: [
      'Bouncing out of the bottom on the Achilles rather than lifting with the muscle.',
      'Bending the knees, which quietly shifts the work to the soleus.',
      'A short choppy range. The whole point is heels well below the platform.',
    ],
    cue: 'Deep stretch, pause, all the way up.',
    videoQuery: 'standing calf raise machine full range stretch',
    restSec: 90,
  }),
  E({
    id: 'cable-pull-through',
    name: 'Cable Pull-Through',
    kind: 'lift',
    equipment: 'Cable station + rope',
    steps: [
      'Face away from a low pulley with the rope between your legs, hands holding the ends, feet about shoulder-width.',
      'Push your hips back with a flat back until you feel the hamstrings stretch, then drive the hips forward to stand tall and squeeze the glutes hard.',
      'The arms are just hooks. The movement is the hips, not a pull with the shoulders.',
    ],
    targets: {
      muscles: ['Glutes', 'Hamstrings', 'Lower back'],
      qualities: ['Hip hinge pattern', 'Glute strength', 'Learning to hinge'],
    },
    why: 'It is the hinge pattern with the load pulling your hips backwards instead of down through your spine, so it teaches the movement that a Romanian deadlift demands without loading the lower back to do it. That makes it the best way to learn to hinge, and useful glute work on a day the back has already had enough.',
    mistakes: [
      'Squatting it, bending the knees and going down instead of pushing the hips back.',
      'Pulling with the arms, which turns it into an awkward row.',
      'Hyperextending at the top. Stand tall and squeeze, do not lean back.',
    ],
    cue: 'Hips back, then snap them through. Arms are hooks.',
    videoQuery: 'cable pull through hip hinge glute proper form',
    restSec: 90,
  }),
  E({
    id: 'hip-abduction-machine',
    name: 'Hip Abduction (machine)',
    kind: 'lift',
    equipment: 'Hip abduction machine',
    steps: [
      'Sit with the pads against the outside of your knees, feet flat, back against the seat.',
      'Press your knees apart as far as the machine allows, hold for a beat, then let them come back together under control.',
      'Leaning the torso forward slightly biases the upper glute; sitting upright biases the side. Pick one and stay there for the set.',
    ],
    targets: {
      muscles: ['Glutes', 'Adductors'],
      qualities: ['Hip stability', 'Landing control', 'Cutting strength'],
    },
    why: 'Gluteus medius is what stops the knee collapsing inward when you land or cut, and no squat, hinge or lunge trains it directly. On a plan with jumping and change of direction in it, this is the muscle whose weakness shows up as knee pain, and this is the only movement here that loads it on its own.',
    mistakes: [
      'Slamming the pads out and letting them crash back, using momentum both ways.',
      'Arching the lower back to help push.',
      'Changing torso angle mid-set, which makes the set two half-exercises.',
    ],
    cue: 'Press out, hold, control back in.',
    videoQuery: 'hip abduction machine glute medius proper form',
    restSec: 60,
  }),
]
