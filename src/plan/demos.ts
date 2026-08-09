import type { DemoEase, DemoFrame, DemoHeld, DemoPose, DemoSpec, SceneItem } from '../components/ExerciseDemo'

// ============================================================
// Animated movement demos — one hand-tuned keyframe sequence
// per exercise. Poses use the world-frame angle conventions in
// ExerciseDemo.tsx (0 = limb straight down, +forward; torso 0
// upright; ground line at y=90, standing hip ≈ y58).
// Each frame's label is the visual step-by-step caption shown
// while the figure travels INTO that frame.
// ============================================================

const BASE: DemoPose = {
  hx: 48, hy: 58, torso: 3, head: 0,
  thighF: 4, shinF: 0, footF: 8,
  thighB: -4, shinB: 2, footB: 8,
  armF: 10, foreF: 12, armB: -8, foreB: -6,
}

const P = (o: Partial<DemoPose> = {}): DemoPose => ({ ...BASE, ...o })
const F = (p: DemoPose, d: number, label?: string | null, o: { hold?: number; ease?: DemoEase } = {}): DemoFrame => ({
  p, d, hold: o.hold ?? 0, label: label ?? null, ease: o.ease ?? 'inout',
})
const spec = (frames: DemoFrame[], held: DemoHeld = { kind: 'none' }, scene: SceneItem[] = [], ground = true): DemoSpec => ({
  frames, held, scene, ground,
})
const seg = (x1: number, y1: number, x2: number, y2: number, w = 2.5, tone?: 'faint' | 'accent'): SceneItem => ({
  kind: 'seg', x1, y1, x2, y2, w, tone,
})
const rect = (x: number, y: number, w: number, h: number): SceneItem => ({ kind: 'rect', x, y, w, h })

// ---- Shared scenes ----
const PULL_BAR: SceneItem[] = [seg(30, 12, 70, 12, 2.2)]
const FLAT_BENCH: SceneItem[] = [seg(26, 78, 68, 78, 3.5), seg(33, 78, 33, 90, 1.8), seg(60, 78, 60, 90, 1.8)]
const INCLINE_BENCH: SceneItem[] = [seg(30, 84, 58, 58, 4), seg(43, 72, 43, 90, 1.8)]
const PRONE_INCLINE: SceneItem[] = [seg(32, 82, 62, 56, 4), seg(46, 70, 46, 90, 1.8)]
const HOOP: SceneItem[] = [seg(88, 6, 88, 26, 2), seg(79, 22, 88, 22, 1.8, 'accent')]

// ---- Shared arm shapes ----
const GOBLET = { armF: 34, foreF: 108, armB: 30, foreB: 104 }
const RACKED = { armF: 55, foreF: 235, armB: 50, foreB: 230 } // elbows high, hands at shoulders
const HANG_ARMS = { armF: 2, foreF: 2, armB: 2, foreB: 2 }

// ---- Gait cycles (4 frames: contact / pass / mirrored contact / pass) ----
function walkCycle(o: { d?: number; lean?: number; swing?: number; hy?: number; labels: [string, string | null] }): DemoFrame[] {
  const d = o.d ?? 460
  const lean = o.lean ?? 2
  const s = o.swing ?? 1
  const hy = o.hy ?? 58.2
  const c1 = P({ hy, torso: lean, thighF: 22, shinF: 4, footF: -12, thighB: -20, shinB: -12, footB: 30, armF: -14 * s, foreF: -12 * s, armB: 16 * s, foreB: 18 * s })
  const p1 = P({ hy: hy - 0.6, torso: lean, thighF: 2, shinF: 2, footF: 8, thighB: 6, shinB: -40, footB: 15, armF: 2, foreF: 4, armB: -2, foreB: 0 })
  const c2 = P({ hy, torso: lean, thighF: -20, shinF: -12, footF: 30, thighB: 22, shinB: 4, footB: -12, armF: 16 * s, foreF: 18 * s, armB: -14 * s, foreB: -12 * s })
  const p2 = P({ hy: hy - 0.6, torso: lean, thighF: 6, shinF: -40, footF: 15, thighB: 2, shinB: 2, footB: 8, armF: -2, foreF: 0, armB: 2, foreB: 4 })
  return [F(c1, d, o.labels[0]), F(p1, d), F(c2, d, o.labels[1]), F(p2, d)]
}

function runCycle(o: { d?: number; lean?: number; hyDrive?: number; hyFlight?: number; amp?: number; labels: [string, string | null] }): DemoFrame[] {
  const d = o.d ?? 340
  const lean = o.lean ?? 10
  const hd = o.hyDrive ?? 55.5
  const hf = o.hyFlight ?? 53.5
  const drive = P({ hx: 48, hy: hd, torso: lean, head: -2, thighF: 90, shinF: -58, footF: 35, thighB: -40, shinB: -20, footB: 50, armF: 48, foreF: 115, armB: -44, foreB: -48 })
  const flight = P({ hy: hf, torso: lean, thighF: 34, shinF: -75, footF: 40, thighB: -12, shinB: -55, footB: 45, armF: 10, foreF: 60, armB: -10, foreB: -15 })
  const drive2 = P({ hx: 48, hy: hd, torso: lean, head: -2, thighF: -40, shinF: -20, footF: 50, thighB: 90, shinB: -58, footB: 35, armF: -44, foreF: -48, armB: 48, foreB: 115 })
  const flight2 = P({ hy: hf, torso: lean, thighF: -12, shinF: -55, footF: 45, thighB: 34, shinB: -75, footB: 40, armF: -10, foreF: -15, armB: 10, foreB: 60 })
  return [F(drive, d, o.labels[0]), F(flight, d), F(drive2, d, o.labels[1]), F(flight2, d)]
}

// ---- Squat family ----
function squatDemo(o: {
  arms: Partial<DemoPose>
  held: DemoHeld
  scene?: SceneItem[]
  upright?: boolean
  deep?: boolean
  labels: [string, string, string]
  slow?: boolean
}): DemoSpec {
  const stand = P({ ...o.arms })
  const bottom = o.deep
    ? P({ hx: 41, hy: 73.3, torso: 14, thighF: 82, shinF: -26, thighB: 78, shinB: -30, ...o.arms })
    : o.upright
      ? P({ hx: 39.5, hy: 71, torso: 16, thighF: 76, shinF: -18, thighB: 72, shinB: -22, ...o.arms })
      : P({ hx: 39, hy: 71.5, torso: 24, thighF: 76, shinF: -20, thighB: 72, shinB: -24, ...o.arms })
  return spec(
    [
      F(stand, 550, o.labels[0], { hold: 250 }),
      F(bottom, o.slow ? 1050 : 950, o.labels[1], { hold: 220 }),
      F(P({ ...o.arms }), 620, o.labels[2], { ease: 'out', hold: 350 }),
    ],
    o.held,
    o.scene ?? [],
  )
}

// ---- Hinge family ----
function hingeDemo(o: {
  depth: number // torso angle at the bottom
  arms?: Partial<DemoPose>
  bottomArms?: Partial<DemoPose>
  held: DemoHeld
  labels: [string, string, string]
}): DemoSpec {
  const arms = o.arms ?? HANG_ARMS
  const stand = P({ ...arms })
  const bottom = P({
    hx: 43, hy: 59.5, torso: o.depth, head: -8,
    thighF: 18, shinF: 2, thighB: 16, shinB: 4,
    ...(o.bottomArms ?? { armF: -8, foreF: -8, armB: -8, foreB: -8 }),
  })
  return spec(
    [
      F(stand, 550, o.labels[0], { hold: 250 }),
      F(bottom, 1000, o.labels[1], { hold: 300 }),
      F(P({ ...arms }), 650, o.labels[2], { ease: 'out', hold: 320 }),
    ],
    o.held,
  )
}

export const EXERCISE_DEMOS: Record<string, DemoSpec> = {
  // ================= MONDAY =================
  'falling-start-sprint': spec([
    F(P({ thighF: 1, thighB: -1, shinB: 0, armF: 4, foreF: 5, armB: -3, foreB: -4 }), 600, 'Stand tall — feet together', { hold: 400 }),
    F(P({ hx: 54, hy: 57, torso: 14, thighF: 12, shinF: 8, footF: 25, thighB: 10, shinB: 8, footB: 25, armF: 4, foreF: 5, armB: -3, foreB: -4 }), 900, 'Lean from the ANKLES — one straight line', { ease: 'in' }),
    F(P({ hx: 60, hy: 63, torso: 40, head: -6, thighF: 82, shinF: -48, footF: 30, thighB: -32, shinB: -14, footB: 45, armF: -38, foreF: -42, armB: 48, foreB: 118 }), 340, 'CATCH — fire the leg into the ground', { ease: 'out' }),
    F(P({ hx: 66, hy: 62, torso: 34, head: -6, thighF: -30, shinF: -16, footF: 45, thighB: 78, shinB: -52, footB: 30, armF: 46, foreF: 112, armB: -40, foreB: -44 }), 360, 'Stay LOW — drive the ground back'),
  ]),

  'box-jump': spec(
    [
      F(P({ hx: 30 }), 500, 'STEP down — reset, every rep max', { hold: 200 }),
      F(P({ hx: 30, hy: 64, torso: 24, thighF: 48, shinF: -18, thighB: 44, shinB: -22, armF: -50, foreF: -55, armB: -46, foreB: -50 }), 380, 'Quick dip — arms BACK', { ease: 'in' }),
      F(P({ hx: 42, hy: 42, torso: 8, thighF: 10, shinF: -14, footF: 40, thighB: 4, shinB: -10, footB: 40, armF: 150, foreF: 160, armB: 145, foreB: 155 }), 340, 'EXPLODE — throw the arms', { ease: 'out' }),
      F(P({ hx: 56, hy: 42, torso: 12, thighF: 80, shinF: -60, footF: 15, thighB: 74, shinB: -66, footB: 15, armF: 60, foreF: 70, armB: 55, foreB: 65 }), 280, 'Knees up'),
      F(P({ hx: 68, hy: 43, torso: 20, thighF: 46, shinF: -18, thighB: 42, shinB: -22, armF: 20, foreF: 30, armB: 14, foreB: 24 }), 320, 'Land SOFT — both feet flat', { ease: 'in', hold: 350 }),
      F(P({ hx: 68, hy: 37.5, torso: 3, thighF: 3, shinF: 0, thighB: -3, shinB: 1, armF: 6, foreF: 8, armB: -5, foreB: -6 }), 420, 'Stand fully TALL on top', { hold: 450 }),
    ],
    { kind: 'none' },
    [rect(58, 70, 26, 20)],
  ),

  'goblet-squat': squatDemo({
    arms: GOBLET,
    held: { kind: 'db', at: 'wristMid' },
    labels: ['Brace — chest proud', 'Sit straight down — controlled', 'Drive the floor away FAST'],
  }),

  'db-front-squat': squatDemo({
    arms: RACKED,
    held: { kind: 'db', at: 'wrists' },
    upright: true,
    labels: ['Elbows HIGH — big breath, brace', 'Squat tall — stay upright', 'Drive up through mid-foot'],
  }),

  'heels-elevated-goblet': squatDemo({
    arms: GOBLET,
    held: { kind: 'db', at: 'wristMid' },
    deep: true,
    scene: [seg(43, 88.8, 49, 88.8, 2.6, 'accent')],
    labels: ['Heels on the plate', 'Ride the knees FORWARD — deep', 'Stand explosively'],
  }),

  'romanian-deadlift': spec(
    [
      F(P({ ...HANG_ARMS }), 550, 'Soft knees — lats tight', { hold: 250 }),
      F(P({ hx: 43, hy: 59.5, torso: 52, head: -8, thighF: 18, shinF: 2, thighB: 16, shinB: 4, armF: -8, foreF: -8, armB: -8, foreB: -8 }), 1000, 'Hips BACK — bar slides the thighs', { hold: 300 }),
      F(P({ ...HANG_ARMS }), 650, 'Drive hips through — squeeze tall', { ease: 'out', hold: 350 }),
    ],
    { kind: 'barbell', at: 'wristMid' },
  ),

  'bulgarian-split-squat': spec(
    [
      F(P({ hx: 55, hy: 60.5, torso: 8, thighF: 26, shinF: -8, thighB: -36, shinB: -76, footB: 155, armF: 12, foreF: 14, armB: -10, foreB: -8 }), 550, 'Weight lives on the FRONT leg', { hold: 250 }),
      F(P({ hx: 57, hy: 68, torso: 16, thighF: 64, shinF: -12, thighB: -50, shinB: -92, footB: 140, armF: 12, foreF: 14, armB: -10, foreB: -8 }), 850, 'Back knee straight DOWN', { hold: 250 }),
      F(P({ hx: 55, hy: 60.5, torso: 8, thighF: 26, shinF: -8, thighB: -36, shinB: -76, footB: 155, armF: 12, foreF: 14, armB: -10, foreB: -8 }), 620, 'Drive up through the front heel', { ease: 'out', hold: 300 }),
    ],
    { kind: 'db', at: 'wrists' },
    [seg(14, 78, 32, 78, 3.5), seg(18, 78, 18, 90, 1.8), seg(28, 78, 28, 90, 1.8)],
  ),

  'walking-lunge': spec(
    [
      F(P({ hy: 57.5, thighF: 6, shinF: 2, thighB: 22, shinB: -38, footB: 5, armF: -12, foreF: -14, armB: 14, foreB: 16 }), 480, 'Tall — take a LONG step'),
      F(P({ hx: 52, hy: 71, torso: 10, thighF: 80, shinF: -6, thighB: -30, shinB: -82, footB: 28, armF: -16, foreF: -18, armB: 18, foreB: 20 }), 750, 'Drop the back knee', { hold: 250 }),
      F(P({ hx: 58, hy: 58, torso: 6, thighF: -14, shinF: -4, footF: 20, thighB: 38, shinB: -50, footB: 0, armF: 14, foreF: 16, armB: -14, foreB: -16 }), 550, 'Push HARD off the front heel', { ease: 'out' }),
    ],
    { kind: 'db', at: 'wrists' },
  ),

  'step-up': spec(
    [
      F(P({ hx: 46, hy: 56, torso: 12, thighF: 66, shinF: -22, footF: 6, thighB: -6, shinB: 2, footB: 30, armF: 8, foreF: 10, armB: -8, foreB: -6 }), 550, 'Whole foot ON the box', { hold: 300 }),
      F(P({ hx: 62, hy: 43.5, torso: 4, thighF: 4, shinF: 0, footF: 6, thighB: -32, shinB: -18, footB: 30, armF: 8, foreF: 10, armB: -8, foreB: -6 }), 700, 'Drive through THAT heel — stand tall', { ease: 'out', hold: 400 }),
      F(P({ hx: 46, hy: 56, torso: 12, thighF: 66, shinF: -22, footF: 6, thighB: -6, shinB: 2, footB: 30, armF: 8, foreF: 10, armB: -8, foreB: -6 }), 950, 'Lower yourself SLOWLY', { hold: 200 }),
    ],
    { kind: 'db', at: 'wrists' },
    [rect(52, 76, 22, 14)],
  ),

  'single-leg-calf-raise': spec(
    [
      F(P({ hx: 48, hy: 57.5, torso: 4, thighF: 3, shinF: 0, footF: -22, thighB: -4, shinB: -60, footB: 20, armF: 4, foreF: 4, armB: -35, foreB: 40 }), 800, 'Heel BELOW the step — pause', { hold: 500 }),
      F(P({ hx: 48, hy: 52.5, torso: 3, thighF: 3, shinF: 0, footF: 42, thighB: -4, shinB: -60, footB: 20, armF: 4, foreF: 4, armB: -35, foreB: 40 }), 550, 'Drive HIGH onto the big toe', { ease: 'out', hold: 450 }),
      F(P({ hx: 48, hy: 57.5, torso: 4, thighF: 3, shinF: 0, footF: -22, thighB: -4, shinB: -60, footB: 20, armF: 4, foreF: 4, armB: -35, foreB: 40 }), 850, 'Lower slow — no bounce'),
    ],
    { kind: 'db', at: 'wristF' },
    [rect(40, 86, 20, 4)],
  ),

  'hanging-leg-raise': spec(
    [
      F(P({ hx: 50, hy: 52, torso: 0, thighF: 3, shinF: 1, footF: 30, thighB: -3, shinB: 0, footB: 30, armF: 179, foreF: 179, armB: 177, foreB: 177 }), 600, 'Hang quiet — kill the swing', { hold: 300 }),
      F(P({ hx: 51.5, hy: 51, torso: -10, head: 6, thighF: 86, shinF: 82, footF: 55, thighB: 80, shinB: 78, footB: 55, armF: 175, foreF: 175, armB: 173, foreB: 173 }), 850, 'Tuck the tailbone — legs UP', { hold: 350 }),
      F(P({ hx: 50, hy: 52, torso: 0, thighF: 3, shinF: 1, footF: 30, thighB: -3, shinB: 0, footB: 30, armF: 179, foreF: 179, armB: 177, foreB: 177 }), 1500, 'Lower 2–3 seconds — dead quiet', { hold: 300 }),
    ],
    { kind: 'none' },
    PULL_BAR,
  ),

  // ================= TUESDAY =================
  'incline-db-press': spec(
    [
      F(P({ hx: 36, hy: 77, torso: 47, head: 0, thighF: -55, shinF: -81, footF: -20, thighB: -50, shinB: -77, footB: -20, armF: 170, foreF: 172, armB: 166, foreB: 168 }), 600, 'Blades pinned — start pressed', { hold: 300 }),
      F(P({ hx: 36, hy: 77, torso: 47, head: 0, thighF: -55, shinF: -81, footF: -20, thighB: -50, shinB: -77, footB: -20, armF: -35, foreF: 178, armB: -30, foreB: 174 }), 900, 'Lower to the OUTER chest', { hold: 300 }),
      F(P({ hx: 36, hy: 77, torso: 47, head: 0, thighF: -55, shinF: -81, footF: -20, thighB: -50, shinB: -77, footB: -20, armF: 170, foreF: 172, armB: 166, foreB: 168 }), 650, 'Press up and slightly IN', { ease: 'out', hold: 300 }),
    ],
    { kind: 'db', at: 'wrists' },
    INCLINE_BENCH,
  ),

  'flat-db-press': spec(
    [
      F(P({ hx: 40, hy: 74.5, torso: 88, head: 2, thighF: -70, shinF: -45, footF: -30, thighB: -66, shinB: -41, footB: -30, armF: 172, foreF: 174, armB: 168, foreB: 170 }), 550, 'Start over the chest', { hold: 250 }),
      F(P({ hx: 40, hy: 74.5, torso: 88, head: 2, thighF: -70, shinF: -45, footF: -30, thighB: -66, shinB: -41, footB: -30, armF: -20, foreF: 176, armB: -16, foreB: 172 }), 850, 'Full stretch — elbows 45°', { hold: 300 }),
      F(P({ hx: 40, hy: 74.5, torso: 88, head: 2, thighF: -70, shinF: -45, footF: -30, thighB: -66, shinB: -41, footB: -30, armF: 172, foreF: 174, armB: 168, foreB: 170 }), 600, 'Press — squeeze at lockout', { ease: 'out', hold: 300 }),
    ],
    { kind: 'db', at: 'wrists' },
    FLAT_BENCH,
  ),

  'floor-press': spec(
    [
      F(P({ hx: 42, hy: 84, torso: 87, head: 2, thighF: -95, shinF: -67, footF: -20, thighB: -91, shinB: -63, footB: -20, armF: 170, foreF: 172, armB: 166, foreB: 168 }), 550, 'Wrists stacked over elbows', { hold: 250 }),
      F(P({ hx: 42, hy: 84, torso: 87, head: 2, thighF: -95, shinF: -67, footF: -20, thighB: -91, shinB: -63, footB: -20, armF: -55, foreF: 178, armB: -51, foreB: 174 }), 800, 'Upper arms to the floor — PAUSE', { hold: 550 }),
      F(P({ hx: 42, hy: 84, torso: 87, head: 2, thighF: -95, shinF: -67, footF: -20, thighB: -91, shinB: -63, footB: -20, armF: 170, foreF: 172, armB: 166, foreB: 168 }), 550, 'Press HARD from the dead stop', { ease: 'out', hold: 300 }),
    ],
    { kind: 'barbell', at: 'wristMid' },
  ),

  'standing-ohp': spec(
    [
      F(P({ torso: 4, armF: 15, foreF: 172, armB: 12, foreB: 169 }), 550, 'Bar at the collarbones — squeeze everything', { hold: 300 }),
      F(P({ torso: 2, head: -14, armF: 118, foreF: 176, armB: 115, foreB: 173 }), 420, 'Press — pull the chin BACK'),
      F(P({ torso: 0, head: 5, armF: 174, foreF: 177, armB: 171, foreB: 174 }), 380, 'Head THROUGH — biceps by ears', { ease: 'out', hold: 500 }),
      F(P({ torso: 4, armF: 15, foreF: 172, armB: 12, foreB: 169 }), 850, 'Lower under control', { hold: 250 }),
    ],
    { kind: 'barbell', at: 'wristMid' },
  ),

  'lateral-raise': spec(
    [
      F(P({ armF: 10, foreF: 12, armB: -8, foreB: -6 }), 500, 'Soft elbows — stand tall', { hold: 250 }),
      F(P({ armF: 80, foreF: 86, armB: -76, foreB: -82 }), 700, 'To shoulder height — ELBOWS lead', { hold: 400 }),
      F(P({ armF: 10, foreF: 12, armB: -8, foreB: -6 }), 1300, 'Lower 2–3 seconds — half the set', { hold: 300 }),
    ],
    { kind: 'db', at: 'wrists' },
  ),

  'close-grip-press': spec(
    [
      F(P({ hx: 40, hy: 74.5, torso: 88, head: 2, thighF: -70, shinF: -45, footF: -30, thighB: -66, shinB: -41, footB: -30, armF: 172, foreF: 174, armB: 168, foreB: 170 }), 550, 'Grip just inside the shoulders', { hold: 250 }),
      F(P({ hx: 40, hy: 74.5, torso: 88, head: 2, thighF: -70, shinF: -45, footF: -30, thighB: -66, shinB: -41, footB: -30, armF: -28, foreF: 176, armB: -24, foreB: 172 }), 850, 'Elbows TUCKED — lower slow', { hold: 300 }),
      F(P({ hx: 40, hy: 74.5, torso: 88, head: 2, thighF: -70, shinF: -45, footF: -30, thighB: -66, shinB: -41, footB: -30, armF: 172, foreF: 174, armB: 168, foreB: 170 }), 600, 'Lockout = pure triceps', { ease: 'out', hold: 300 }),
    ],
    { kind: 'barbell', at: 'wristMid' },
    FLAT_BENCH,
  ),

  'overhead-tricep-extension': spec(
    [
      F(P({ torso: 2, armF: 168, foreF: 174, armB: 165, foreB: 171 }), 550, 'Elbows locked by your head', { hold: 300 }),
      F(P({ torso: 2, head: 2, armF: 168, foreF: 288, armB: 165, foreB: 285 }), 850, 'Lower BEHIND the head — deep stretch', { hold: 350 }),
      F(P({ torso: 2, armF: 168, foreF: 174, armB: 165, foreB: 171 }), 600, 'Extend — upper arms frozen', { ease: 'out', hold: 300 }),
    ],
    { kind: 'db', at: 'wristMid' },
  ),

  'prone-y-raise': spec(
    [
      F(P({ hx: 35, hy: 79, torso: 47, head: 4, thighF: -78, shinF: -52, footF: -30, thighB: -72, shinB: -46, footB: -30, armF: -5, foreF: -5, armB: -9, foreB: -9 }), 550, 'Thumbs UP — arms hang', { hold: 300 }),
      F(P({ hx: 35, hy: 79, torso: 47, head: 4, thighF: -78, shinF: -52, footF: -30, thighB: -72, shinB: -46, footB: -30, armF: 128, foreF: 132, armB: 122, foreB: 126 }), 800, 'Sweep to a Y — squeeze the lower traps', { hold: 550 }),
      F(P({ hx: 35, hy: 79, torso: 47, head: 4, thighF: -78, shinF: -52, footF: -30, thighB: -72, shinB: -46, footB: -30, armF: -5, foreF: -5, armB: -9, foreB: -9 }), 950, 'Lower slow — stay LIGHT', { hold: 250 }),
    ],
    { kind: 'db', at: 'wrists' },
    PRONE_INCLINE,
  ),

  // ================= WEDNESDAY =================
  'front-squat': squatDemo({
    arms: RACKED,
    held: { kind: 'barbell', at: 'wristMid' },
    upright: true,
    slow: true,
    labels: ['Elbows HIGH — big breath', 'Below parallel — torso tall', 'Drive up HARD through mid-foot'],
  }),

  'hip-thrust': spec(
    [
      F(P({ hx: 50, hy: 82, torso: -43, head: 40, thighF: 118, shinF: -10, thighB: 114, shinB: -6, armF: 42, foreF: 44, armB: 38, foreB: 40 }), 550, 'Upper back on the bench — bar padded', { hold: 300 }),
      F(P({ hx: 56, hy: 67, torso: -92, head: 88, thighF: 53, shinF: -25, thighB: 49, shinB: -21, armF: 88, foreF: 90, armB: 84, foreB: 86 }), 650, 'Squeeze to a FLAT table — hold it', { ease: 'out', hold: 650 }),
      F(P({ hx: 50, hy: 82, torso: -43, head: 40, thighF: 118, shinF: -10, thighB: 114, shinB: -6, armF: 42, foreF: 44, armB: 38, foreB: 40 }), 850, 'Lower under control', { hold: 200 }),
    ],
    { kind: 'barbell', at: 'hips' },
    [seg(18, 70, 38, 70, 3.5), seg(22, 70, 22, 90, 1.8), seg(34, 70, 34, 90, 1.8)],
  ),

  'single-leg-rdl': spec(
    [
      F(P({ thighB: -10, shinB: -20, footB: 30, armF: 2, foreF: 2, armB: -20, foreB: -22 }), 550, 'Balance — soft knee', { hold: 250 }),
      F(P({ hx: 45, hy: 57, torso: 72, head: -12, thighF: 16, shinF: 2, footF: 0, thighB: -88, shinB: -95, footB: 178, armF: -4, foreF: -4, armB: -45, foreB: -50 }), 1000, 'Hinge — hips stay SQUARE', { hold: 350 }),
      F(P({ thighB: -10, shinB: -20, footB: 30, armF: 2, foreF: 2, armB: -20, foreB: -22 }), 650, 'Drive the hips through — squeeze', { ease: 'out', hold: 300 }),
    ],
    { kind: 'db', at: 'wristF' },
  ),

  'good-morning': hingeDemo({
    depth: 48,
    arms: { armF: 115, foreF: 232, armB: 112, foreB: 229 },
    bottomArms: { armF: 115, foreF: 232, armB: 112, foreB: 229 },
    held: { kind: 'barbell', at: 'backNeck' },
    labels: ['Bar on the back — lats on', 'Hips straight BACK — table-flat spine', 'Stand tall — glutes finish it'],
  }),

  'slider-leg-curl': spec([
    F(P({ hx: 44, hy: 77.5, torso: -62, head: -38, thighF: 100, shinF: -27, footF: -10, thighB: 96, shinB: -23, footB: -10, armF: -78, foreF: -80, armB: 78, foreB: 80 }), 600, 'Bridge UP — heels under you', { hold: 300 }),
    F(P({ hx: 46, hy: 80.5, torso: -70, head: -32, thighF: 72, shinF: 84, footF: 40, thighB: 68, shinB: 80, footB: 40, armF: -78, foreF: -80, armB: 78, foreB: 80 }), 1100, 'Slide out SLOW — hips stay up', { hold: 250 }),
    F(P({ hx: 44, hy: 77.5, torso: -62, head: -38, thighF: 100, shinF: -27, footF: -10, thighB: 96, shinB: -23, footB: -10, armF: -78, foreF: -80, armB: 78, foreB: 80 }), 750, 'DRAG the heels back — hamstrings', { ease: 'out', hold: 350 }),
  ]),

  'seated-calf-raise': spec(
    [
      F(P({ hx: 42, hy: 70, torso: 6, thighF: 91, shinF: 5, footF: 15, thighB: 89, shinB: 6, footB: 15, armF: 42, foreF: 100, armB: 38, foreB: 96 }), 750, 'Heel sinks — one-second pause', { hold: 550 }),
      F(P({ hx: 42, hy: 70, torso: 6, thighF: 102, shinF: -10, footF: 45, thighB: 100, shinB: -9, footB: 45, armF: 42, foreF: 100, armB: 38, foreB: 96 }), 550, 'Press UP on the ball of the foot', { ease: 'out', hold: 450 }),
      F(P({ hx: 42, hy: 70, torso: 6, thighF: 91, shinF: 5, footF: 15, thighB: 89, shinB: 6, footB: 15, armF: 42, foreF: 100, armB: 38, foreB: 96 }), 800, 'Slow down — deep stretch'),
    ],
    { kind: 'db', at: 'kneeF' },
    [seg(28, 72, 50, 72, 3.5), seg(32, 72, 32, 90, 1.8), seg(46, 72, 46, 90, 1.8), rect(56, 86, 12, 4)],
  ),

  'double-leg-calf-raise': spec(
    [
      F(P({ hx: 47, hy: 57.5, torso: 4, thighF: 3, shinF: 0, footF: -22, thighB: -2, shinB: 1, footB: -22, armF: 6, foreF: 6, armB: -5, foreB: -5 }), 750, 'Both heels sink — pause', { hold: 500 }),
      F(P({ hx: 47, hy: 52.5, torso: 4, thighF: 3, shinF: 0, footF: 40, thighB: -2, shinB: 1, footB: 40, armF: 6, foreF: 6, armB: -5, foreB: -5 }), 550, 'Drive tall — jump without leaving', { ease: 'out', hold: 500 }),
      F(P({ hx: 47, hy: 57.5, torso: 4, thighF: 3, shinF: 0, footF: -22, thighB: -2, shinB: 1, footB: -22, armF: 6, foreF: 6, armB: -5, foreB: -5 }), 850, 'Lower 2–3 seconds'),
    ],
    { kind: 'db', at: 'wrists' },
    [rect(38, 86, 24, 4)],
  ),

  'weighted-situp': spec(
    [
      F(P({ hx: 46, hy: 84, torso: -82, head: -18, thighF: 105, shinF: -55, thighB: 101, shinB: -51, armF: 78, foreF: -45, armB: 74, foreB: -49 }), 550, 'Plate to the chest — exhale', { hold: 250 }),
      F(P({ hx: 46, hy: 84, torso: 22, head: 6, thighF: 105, shinF: -55, thighB: 101, shinB: -51, armF: 35, foreF: -55, armB: 31, foreB: -59 }), 800, 'Curl UP — one vertebra at a time', { hold: 350 }),
      F(P({ hx: 46, hy: 84, torso: -82, head: -18, thighF: 105, shinF: -55, thighB: 101, shinB: -51, armF: 78, foreF: -45, armB: 74, foreB: -49 }), 1300, 'Lower SLOW — resist the whole way', { hold: 300 }),
    ],
    { kind: 'plate', at: 'chest' },
  ),

  'plank-side-plank': spec([
    F(P({ hx: 48, hy: 78.5, torso: 82, head: 6, thighF: -80, shinF: -81, footF: 115, thighB: -76, shinB: -77, footB: 115, armF: 12, foreF: 86, armB: 8, foreB: 82 }), 900, 'One straight line — squeeze EVERYTHING', { hold: 700 }),
    F(P({ hx: 48, hy: 77.5, torso: 84, head: 6, thighF: -80, shinF: -81, footF: 115, thighB: -76, shinB: -77, footB: 115, armF: 12, foreF: 86, armB: 8, foreB: 82 }), 800, 'Push the floor away — upper back full', { hold: 600 }),
    F(P({ hx: 48, hy: 78.8, torso: 82, head: 6, thighF: -80, shinF: -81, footF: 115, thighB: -76, shinB: -77, footB: 115, armF: 12, foreF: 86, armB: 8, foreB: 82 }), 800, 'Breathe behind the brace', { hold: 600 }),
  ]),

  // ================= THURSDAY =================
  'hip-9090-switch': spec([
    F(P({ hx: 46, hy: 81, torso: 8, thighF: 74, shinF: -86, footF: 150, thighB: -72, shinB: -94, footB: 30, armF: 30, foreF: 45, armB: -25, foreB: -35 }), 700, 'Sit tall — both knees down', { hold: 500 }),
    F(P({ hx: 47, hy: 79, torso: 4, thighF: 96, shinF: -50, footF: 30, thighB: -94, shinB: 48, footB: 150, armF: 25, foreF: 35, armB: -20, foreB: -30 }), 650, 'Lift and rotate together'),
    F(P({ hx: 48, hy: 81, torso: -2, thighF: -74, shinF: 86, footF: 30, thighB: 72, shinB: 94, footB: 150, armF: 28, foreF: 40, armB: -22, foreB: -32 }), 750, 'Swing to the other side — sit tall', { hold: 500 }),
    F(P({ hx: 47, hy: 79, torso: 4, thighF: 96, shinF: -50, footF: 30, thighB: -94, shinB: 48, footB: 150, armF: 25, foreF: 35, armB: -20, foreB: -30 }), 650, 'Chest over the front shin — breathe'),
  ]),

  'deep-squat-hold': spec([
    F(P({ hx: 39, hy: 72.5, torso: 20, thighF: 78, shinF: -22, thighB: 74, shinB: -26, armF: 42, foreF: 118, armB: 38, foreB: 114 }), 700, 'Sink into the hole — heels DOWN', { hold: 800 }),
    F(P({ hx: 39, hy: 73.5, torso: 16, thighF: 78, shinF: -22, thighB: 74, shinB: -26, armF: 42, foreF: 118, armB: 38, foreB: 114 }), 900, 'Elbows pry the knees out', { hold: 800 }),
    F(P({ hx: 39, hy: 72.8, torso: 22, thighF: 78, shinF: -22, thighB: 74, shinB: -26, armF: 42, foreF: 118, armB: 38, foreB: 114 }), 900, 'Exhale — sink deeper', { hold: 700 }),
  ]),

  'ankle-wall-mobilization': spec(
    [
      F(P({ hx: 44, hy: 74, torso: 6, thighF: 87, shinF: -5, thighB: -38, shinB: -92, footB: 155, armF: 48, foreF: 135, armB: -10, foreB: -8 }), 650, 'Heel GLUED down', { hold: 300 }),
      F(P({ hx: 48.5, hy: 74.5, torso: 10, thighF: 88, shinF: -21, thighB: -30, shinB: -95, footB: 155, armF: 48, foreF: 135, armB: -8, foreB: -6 }), 750, 'Drive the knee OVER the toes — pause', { hold: 550 }),
      F(P({ hx: 44, hy: 74, torso: 6, thighF: 87, shinF: -5, thighB: -38, shinB: -92, footB: 155, armF: 48, foreF: 135, armB: -10, foreB: -8 }), 700, 'Return — smooth reps'),
    ],
    { kind: 'none' },
    [seg(70, 50, 70, 90, 2.5)],
  ),

  'couch-stretch': spec(
    [
      F(P({ hx: 38, hy: 70, torso: 6, head: 2, thighF: 72, shinF: -12, thighB: -50, shinB: 191, footB: 265, armF: 42, foreF: 125, armB: 38, foreB: 121 }), 700, 'Back shin up the wall — settle in', { hold: 400 }),
      F(P({ hx: 40, hy: 69, torso: -4, head: 4, thighF: 74, shinF: -14, thighB: -53, shinB: 193, footB: 265, armF: 42, foreF: 125, armB: 38, foreB: 121 }), 900, 'Squeeze the glute — TUCK, grow tall', { hold: 800 }),
      F(P({ hx: 38, hy: 70, torso: 4, head: 2, thighF: 72, shinF: -12, thighB: -50, shinB: 191, footB: 265, armF: 42, foreF: 125, armB: 38, foreB: 121 }), 800, 'Breathe — intense, never sharp', { hold: 500 }),
    ],
    { kind: 'none' },
    [seg(22, 50, 22, 90, 2.5)],
  ),

  't-spine-opener': spec([
    F(P({ hx: 46, hy: 84, torso: -85, head: -14, thighF: 95, shinF: -78, footF: 40, thighB: 91, shinB: -74, footB: 40, armF: 88, foreF: 88, armB: 86, foreB: 86 }), 650, 'Arms stacked — knees glued down', { hold: 350 }),
    F(P({ hx: 46, hy: 84, torso: -85, head: -8, thighF: 95, shinF: -78, footF: 40, thighB: 91, shinB: -74, footB: 40, armF: 88, foreF: 88, armB: 178, foreB: 176 }), 750, 'Sweep up — eyes follow the hand'),
    F(P({ hx: 46, hy: 84, torso: -83, head: -2, thighF: 95, shinF: -78, footF: 40, thighB: 91, shinB: -74, footB: 40, armF: 88, foreF: 88, armB: -78, foreB: -80 }), 850, 'Chest opens — BREATHE into it', { hold: 700 }),
    F(P({ hx: 46, hy: 84, torso: -85, head: -14, thighF: 95, shinF: -78, footF: 40, thighB: 91, shinB: -74, footB: 40, armF: 88, foreF: 88, armB: 86, foreB: 86 }), 900, 'Return slow', { hold: 250 }),
  ]),

  'dead-hang': spec(
    [
      F(P({ hx: 50, hy: 52.5, torso: 0, head: 3, thighF: 3, shinF: 1, footF: 35, thighB: -3, shinB: 0, footB: 35, armF: 179, foreF: 179, armB: 177, foreB: 177 }), 900, 'Hang — let the spine LENGTHEN', { hold: 800 }),
      F(P({ hx: 51, hy: 53, torso: 0, head: 3, thighF: 3, shinF: 1, footF: 35, thighB: -3, shinB: 0, footB: 35, armF: 179, foreF: 179, armB: 177, foreB: 177 }), 1100, 'Shoulders up by the ears — relax', { hold: 700 }),
      F(P({ hx: 49.5, hy: 52.7, torso: 0, head: 3, thighF: 3, shinF: 1, footF: 35, thighB: -3, shinB: 0, footB: 35, armF: 179, foreF: 179, armB: 177, foreB: 177 }), 1000, 'Breathe slow — grip works for free', { hold: 700 }),
    ],
    { kind: 'none' },
    PULL_BAR,
  ),

  'easy-walk': spec(walkCycle({ labels: ['Conversational pace — relax', 'Nose-breathing easy — bank the steps'] })),

  // ================= FRIDAY =================
  'pull-up': spec(
    [
      F(P({ hx: 50, hy: 52, torso: 0, thighF: 3, shinF: 1, footF: 30, thighB: -3, shinB: 0, footB: 30, armF: 179, foreF: 179, armB: 177, foreB: 177 }), 650, 'Dead hang — set the blades FIRST', { hold: 300 }),
      F(P({ hx: 50, hy: 39, torso: 4, head: -4, thighF: 8, shinF: -22, footF: 35, thighB: 2, shinB: -28, footB: 35, armF: 95, foreF: 227, armB: 92, foreB: 224 }), 750, 'ELBOWS down to the hips — chin over', { hold: 400 }),
      F(P({ hx: 50, hy: 52, torso: 0, thighF: 3, shinF: 1, footF: 30, thighB: -3, shinB: 0, footB: 30, armF: 179, foreF: 179, armB: 177, foreB: 177 }), 950, 'ALL the way down — every rep', { hold: 300 }),
    ],
    { kind: 'none' },
    PULL_BAR,
  ),

  'barbell-row': spec(
    [
      F(P({ hx: 43, hy: 59, torso: 46, head: -6, thighF: 16, shinF: 2, thighB: 14, shinB: 4, armF: -4, foreF: -4, armB: -4, foreB: -4 }), 600, 'Hinged — bar hangs, back FLAT', { hold: 300 }),
      F(P({ hx: 43, hy: 59, torso: 46, head: -6, thighF: 16, shinF: 2, thighB: 14, shinB: 4, armF: -58, foreF: 92, armB: -58, foreB: 92 }), 500, 'Pull to the LOWER ribs', { ease: 'out', hold: 400 }),
      F(P({ hx: 43, hy: 59, torso: 46, head: -6, thighF: 16, shinF: 2, thighB: 14, shinB: 4, armF: -4, foreF: -4, armB: -4, foreB: -4 }), 850, 'Lower to full stretch — torso STILL', { hold: 250 }),
    ],
    { kind: 'barbell', at: 'wristMid' },
  ),

  'db-pullover': spec(
    [
      F(P({ hx: 40, hy: 74.5, torso: 88, head: 2, thighF: -70, shinF: -45, footF: -30, thighB: -66, shinB: -41, footB: -30, armF: 168, foreF: 170, armB: 165, foreB: 167 }), 600, 'Both hands cup ONE bell — over the chest', { hold: 250 }),
      F(P({ hx: 40, hy: 74.5, torso: 88, head: 2, thighF: -70, shinF: -45, footF: -30, thighB: -66, shinB: -41, footB: -30, armF: 105, foreF: 96, armB: 102, foreB: 93 }), 950, 'Arc back — DEEP lat stretch', { hold: 400 }),
      F(P({ hx: 40, hy: 74.5, torso: 88, head: 2, thighF: -70, shinF: -45, footF: -30, thighB: -66, shinB: -41, footB: -30, armF: 168, foreF: 170, armB: 165, foreB: 167 }), 700, 'Pull back over — ribs DOWN', { ease: 'out', hold: 300 }),
    ],
    { kind: 'db', at: 'wristMid' },
    FLAT_BENCH,
  ),

  'one-arm-db-row': spec(
    [
      F(P({ hx: 42, hy: 59, torso: 80, head: 4, thighF: 8, shinF: 3, thighB: 40, shinB: -60, footB: 200, armF: 10, foreF: 42, armB: -6, foreB: -6 }), 650, 'Flat like a table — let it HANG', { hold: 300 }),
      F(P({ hx: 42, hy: 59, torso: 80, head: 4, thighF: 8, shinF: 3, thighB: 40, shinB: -60, footB: 200, armF: 10, foreF: 42, armB: -95, foreB: -18 }), 550, 'Elbow to the HIP — squeeze the lat', { ease: 'out', hold: 400 }),
      F(P({ hx: 42, hy: 59, torso: 80, head: 4, thighF: 8, shinF: 3, thighB: 40, shinB: -60, footB: 200, armF: 10, foreF: 42, armB: -6, foreB: -6 }), 900, 'Lower — blade slides forward', { hold: 250 }),
    ],
    { kind: 'db', at: 'wristB' },
    [seg(50, 73, 78, 73, 3.5), seg(55, 73, 55, 90, 1.8), seg(73, 73, 73, 90, 1.8)],
  ),

  'chest-supported-row': spec(
    [
      F(P({ hx: 35, hy: 79, torso: 47, head: 4, thighF: -78, shinF: -52, footF: -30, thighB: -72, shinB: -46, footB: -30, armF: -6, foreF: -6, armB: -10, foreB: -10 }), 600, 'Chest DOWN — blades spread wide', { hold: 300 }),
      F(P({ hx: 35, hy: 79, torso: 47, head: 4, thighF: -78, shinF: -52, footF: -30, thighB: -72, shinB: -46, footB: -30, armF: -60, foreF: 30, armB: -64, foreB: 26 }), 550, 'Row to the hips — pause at the top', { ease: 'out', hold: 450 }),
      F(P({ hx: 35, hy: 79, torso: 47, head: 4, thighF: -78, shinF: -52, footF: -30, thighB: -72, shinB: -46, footB: -30, armF: -6, foreF: -6, armB: -10, foreB: -10 }), 900, 'Lower slow — chest stays ON the pad', { hold: 250 }),
    ],
    { kind: 'db', at: 'wrists' },
    PRONE_INCLINE,
  ),

  'rear-delt-raise': spec(
    [
      F(P({ hx: 43, hy: 59, torso: 68, head: -10, thighF: 18, shinF: 2, thighB: 16, shinB: 4, armF: -2, foreF: -2, armB: 2, foreB: 2 }), 600, 'Hinge low — weights hang', { hold: 300 }),
      F(P({ hx: 43, hy: 59, torso: 68, head: -10, thighF: 18, shinF: 2, thighB: 16, shinB: 4, armF: 66, foreF: 72, armB: -62, foreB: -68 }), 650, 'Out to the sides — elbows lead', { hold: 350 }),
      F(P({ hx: 43, hy: 59, torso: 68, head: -10, thighF: 18, shinF: 2, thighB: 16, shinB: 4, armF: -2, foreF: -2, armB: 2, foreB: 2 }), 1500, 'THREE seconds down — that IS the set', { hold: 300 }),
    ],
    { kind: 'db', at: 'wrists' },
  ),

  'ez-bar-curl': spec(
    [
      F(P({ armF: 6, foreF: 6, armB: 4, foreB: 4 }), 550, 'Elbows pinned — full hang', { hold: 250 }),
      F(P({ armF: 6, foreF: 162, armB: 4, foreB: 160 }), 550, 'Curl — squeeze at the top', { ease: 'out', hold: 400 }),
      F(P({ armF: 6, foreF: 6, armB: 4, foreB: 4 }), 1100, 'Lower 2–3s to STRAIGHT arms', { hold: 300 }),
    ],
    { kind: 'barbell', at: 'wristMid' },
  ),

  'incline-db-curl': spec(
    [
      F(P({ hx: 36, hy: 77, torso: 47, head: 0, thighF: -55, shinF: -81, footF: -20, thighB: -50, shinB: -77, footB: -20, armF: -28, foreF: -28, armB: -32, foreB: -32 }), 650, 'Arms hang BEHIND you — feel the stretch', { hold: 300 }),
      F(P({ hx: 36, hy: 77, torso: 47, head: 0, thighF: -55, shinF: -81, footF: -20, thighB: -50, shinB: -77, footB: -20, armF: -28, foreF: 118, armB: -32, foreB: 114 }), 550, 'Curl — elbows stay BACK', { ease: 'out', hold: 350 }),
      F(P({ hx: 36, hy: 77, torso: 47, head: 0, thighF: -55, shinF: -81, footF: -20, thighB: -50, shinB: -77, footB: -20, armF: -28, foreF: -28, armB: -32, foreB: -32 }), 1000, 'Slow down into the deep hang', { hold: 300 }),
    ],
    { kind: 'db', at: 'wrists' },
    INCLINE_BENCH,
  ),

  'hammer-curl': spec(
    [
      F(P({ armF: 6, foreF: 6, armB: 4, foreB: 4 }), 550, 'Neutral grip — like a hammer', { hold: 250 }),
      F(P({ armF: 6, foreF: 162, armB: 4, foreB: 160 }), 550, 'Squeeze — zero swinging', { ease: 'out', hold: 400 }),
      F(P({ armF: 6, foreF: 6, armB: 4, foreB: 4 }), 1000, 'Control the lowering', { hold: 300 }),
    ],
    { kind: 'db', at: 'wrists' },
  ),

  'farmer-carry': spec(
    walkCycle({ d: 420, lean: 1, swing: 0, labels: ['Stand TALL — crush the handles', 'Short quick steps — ribs down'] }).map((f) => ({
      ...f,
      p: { ...f.p, armF: 6, foreF: 7, armB: -4, foreB: -3 },
    })),
    { kind: 'db', at: 'wrists' },
  ),

  'towel-hang': spec(
    [
      F(P({ hx: 50, hy: 57, torso: 0, head: 2, thighF: 3, shinF: 1, footF: 35, thighB: -3, shinB: 0, footB: 35, armF: 178, foreF: 178, armB: 176, foreB: 176 }), 900, 'CRUSH the towel', { hold: 800 }),
      F(P({ hx: 50.8, hy: 57.4, torso: 0, head: 2, thighF: 3, shinF: 1, footF: 35, thighB: -3, shinB: 0, footB: 35, armF: 178, foreF: 178, armB: 176, foreB: 176 }), 1000, 'Quiet body — working hands', { hold: 700 }),
      F(P({ hx: 49.4, hy: 57.2, torso: 0, head: 2, thighF: 3, shinF: 1, footF: 35, thighB: -3, shinB: 0, footB: 35, armF: 178, foreF: 178, armB: 176, foreB: 176 }), 1000, 'Fight for every second — log it', { hold: 700 }),
    ],
    { kind: 'towel', barY: 12 },
    PULL_BAR,
  ),

  // ================= SATURDAY =================
  'dynamic-warmup': spec([
    F(P({ hy: 56, torso: 6, thighF: 92, shinF: -55, footF: 30, thighB: -18, shinB: -8, footB: 40, armF: 45, foreF: 110, armB: -40, foreB: -45 }), 400, 'Skips — knees punch UP'),
    F(P({ hy: 54.5, torso: 6, thighF: 40, shinF: -65, footF: 35, thighB: -6, shinB: -30, footB: 35, armF: 5, foreF: 40, armB: -5, foreB: -10 }), 400),
    F(P({ hy: 56, torso: 6, thighF: -18, shinF: -8, footF: 40, thighB: 92, shinB: -55, footB: 30, armF: -40, foreF: -45, armB: 45, foreB: 110 }), 400, 'Loose and springy — build the buzz'),
    F(P({ hy: 54.5, torso: 6, thighF: -6, shinF: -30, footF: 35, thighB: 40, shinB: -65, footB: 35, armF: -5, foreF: -10, armB: 5, foreB: 40 }), 400),
  ]),

  'max-velocity-sprint': spec(runCycle({ labels: ['TALL — knees punch, hips high', 'Strike under the hips — stay LOOSE'] })),

  'flying-sprint': spec(runCycle({ d: 320, labels: ['Build in… then EXPLODE the fly zone', 'Fastest strides — jaw loose, hands loose'] })),

  'pogo-hop': spec([
    F(P({ hx: 48, hy: 57.8, torso: 3, thighF: 2, shinF: 0, footF: 10, thighB: -2, shinB: 1, footB: 10, armF: 12, foreF: 14, armB: -10, foreB: -8 }), 240, 'Contact = HOT floor', { ease: 'in' }),
    F(P({ hx: 48, hy: 51.5, torso: 3, thighF: 2, shinF: 1, footF: 48, thighB: -2, shinB: 1, footB: 48, armF: 12, foreF: 14, armB: -10, foreB: -8 }), 260, 'Ankle SNAP — knees stay straight', { ease: 'out' }),
    F(P({ hx: 48, hy: 57.8, torso: 3, thighF: 2, shinF: 0, footF: 10, thighB: -2, shinB: 1, footB: 10, armF: 12, foreF: 14, armB: -10, foreB: -8 }), 240, null, { ease: 'in' }),
    F(P({ hx: 48, hy: 51.5, torso: 3, thighF: 2, shinF: 1, footF: 48, thighB: -2, shinB: 1, footB: 48, armF: 12, foreF: 14, armB: -10, foreB: -8 }), 260, 'Springy rhythm — tall body', { ease: 'out' }),
  ]),

  'approach-jump': spec(
    [
      F(P({ hx: 22, hy: 56.5, torso: 8, thighF: 70, shinF: -50, footF: 30, thighB: -30, shinB: -18, footB: 45, armF: 35, foreF: 100, armB: -35, foreB: -40 }), 500, 'Approach 70–80% — smooth'),
      F(P({ hx: 36, hy: 63, torso: 14, thighF: 42, shinF: 24, footF: -14, thighB: -34, shinB: -50, footB: 45, armF: -30, foreF: -35, armB: -25, foreB: -30 }), 420, 'PENULTIMATE: long & LOW — hips drop', { ease: 'in' }),
      F(P({ hx: 50, hy: 60, torso: 6, thighF: 18, shinF: 6, footF: 0, thighB: -55, shinB: -85, footB: 155, armF: -45, foreF: -50, armB: -40, foreB: -45 }), 300, 'Plant FAST — stiff like a pole'),
      F(P({ hx: 62, hy: 34, torso: 2, head: 2, thighF: 95, shinF: -60, footF: 30, thighB: -25, shinB: -12, footB: 55, armF: 165, foreF: 170, armB: 150, foreB: 160 }), 380, 'KNEE and arms UP — fly', { ease: 'out', hold: 350 }),
      F(P({ hx: 74, hy: 66, torso: 18, thighF: 52, shinF: -20, thighB: 48, shinB: -24, armF: 20, foreF: 30, armB: 15, foreB: 25 }), 420, 'Land soft on TWO — absorb', { ease: 'in', hold: 400 }),
    ],
    { kind: 'none' },
    HOOP,
  ),

  'dunk-attempt': spec(
    [
      F(P({ hx: 20, hy: 56.5, torso: 8, thighF: 70, shinF: -50, footF: 30, thighB: -30, shinB: -18, footB: 45, armF: 35, foreF: 100, armB: -35, foreB: -40 }), 480, 'Full approach — full intent'),
      F(P({ hx: 34, hy: 63, torso: 14, thighF: 42, shinF: 24, footF: -14, thighB: -34, shinB: -50, footB: 45, armF: -30, foreF: -35, armB: -25, foreB: -30 }), 400, 'Long-low second-to-last step', { ease: 'in' }),
      F(P({ hx: 48, hy: 60, torso: 6, thighF: 18, shinF: 6, footF: 0, thighB: -55, shinB: -85, footB: 155, armF: -45, foreF: -50, armB: -40, foreB: -45 }), 300, 'Short last step — PLANT'),
      F(P({ hx: 63, hy: 52, torso: 4, head: 4, thighF: 92, shinF: -62, footF: 35, thighB: -22, shinB: -14, footB: 55, armF: 130, foreF: 145, armB: 30, foreB: 80 }), 400, 'RISE — hand over the rim', { ease: 'out', hold: 400 }),
      F(P({ hx: 76, hy: 64, torso: 18, thighF: 52, shinF: -20, thighB: 48, shinB: -24, armF: 20, foreF: 30, armB: 15, foreB: 25 }), 450, 'Land soft — track your touch height', { ease: 'in', hold: 350 }),
    ],
    { kind: 'none' },
    HOOP,
  ),

  // ================= CARDIO OPTIONS =================
  'easy-jog': spec([
    F(P({ hy: 56.5, torso: 6, thighF: 55, shinF: -50, footF: 25, thighB: -25, shinB: -12, footB: 35, armF: 30, foreF: 95, armB: -28, foreB: -32 }), 400, 'Conversational pace'),
    F(P({ hy: 55.5, torso: 6, thighF: 15, shinF: -55, footF: 30, thighB: -5, shinB: -35, footB: 30, armF: 5, foreF: 60, armB: -5, foreB: 5 }), 400),
    F(P({ hy: 56.5, torso: 6, thighF: -25, shinF: -12, footF: 35, thighB: 55, shinB: -50, footB: 25, armF: -28, foreF: -32, armB: 30, foreB: 95 }), 400, 'Land soft — quick light steps'),
    F(P({ hy: 55.5, torso: 6, thighF: -5, shinF: -35, footF: 30, thighB: 15, shinB: -55, footB: 30, armF: -5, foreF: 5, armB: 5, foreB: 60 }), 400),
  ]),

  'brisk-walk': spec(walkCycle({ d: 400, lean: 4, swing: 1.6, labels: ['Walk with PURPOSE', 'Arms swinging — breathe easy'] })),

  'incline-walk': spec(
    walkCycle({ d: 430, lean: 16, hy: 54.5, labels: ['Tall lean INTO the hill', 'NO rails — pump the arms'] }),
    { kind: 'none' },
    [seg(14, 93, 86, 79, 2.5)],
    false,
  ),

  'hill-sprint': spec(
    runCycle({ lean: 26, hyDrive: 50.5, hyFlight: 48.5, labels: ['Attack UP the hill — big knees', 'Walk down = the rest'] }),
    { kind: 'none' },
    [seg(8, 94, 92, 68, 2.8)],
    false,
  ),

  'parking-lot-sprint': spec(runCycle({ d: 330, labels: ['10–15 seconds ALL OUT', "If it's not max — you're done"] })),

  'stair-run': spec(
    [
      F(P({ hx: 48, hy: 56, torso: 14, thighF: 52, shinF: -16, footF: 10, thighB: -24, shinB: -6, footB: 50, armF: 40, foreF: 105, armB: -38, foreB: -42 }), 380, 'Up HARD — arms driving'),
      F(P({ hx: 54, hy: 50, torso: 14, thighF: 85, shinF: -70, footF: 20, thighB: -8, shinB: -2, footB: 30, armF: -30, foreF: -35, armB: 42, foreB: 108 }), 380, 'Knees UP — balls of the feet'),
    ],
    { kind: 'none' },
    [rect(56, 82, 14, 8), rect(70, 74, 26, 16)],
  ),

  'circuit-a': spec([
    F(P({}), 400, 'Reset tall', { hold: 150 }),
    F(P({ hx: 46, hy: 66, torso: 22, thighF: 55, shinF: -20, thighB: 51, shinB: -24, armF: -45, foreF: -50, armB: -41, foreB: -46 }), 330, 'Sink FAST', { ease: 'in' }),
    F(P({ hx: 48, hy: 42, torso: 4, thighF: 8, shinF: -6, footF: 45, thighB: 4, shinB: -4, footB: 45, armF: 160, foreF: 168, armB: 155, foreB: 163 }), 340, 'EXPLODE — full extension', { ease: 'out', hold: 150 }),
    F(P({ hx: 46, hy: 65, torso: 20, thighF: 52, shinF: -18, thighB: 48, shinB: -22, armF: 15, foreF: 20, armB: 10, foreB: 15 }), 320, 'Land SOFT — sink and go again', { ease: 'in' }),
  ]),

  'circuit-b': spec([
    F(P({ hy: 56, torso: 8, thighF: 95, shinF: -60, footF: 30, thighB: -8, shinB: -2, footB: 20, armF: 40, foreF: 105, armB: -36, foreB: -40 }), 300, '30s high knees — quick feet'),
    F(P({ hy: 56.5, torso: 8, thighF: 30, shinF: -50, footF: 30, thighB: -4, shinB: -1, footB: 15, armF: 5, foreF: 50, armB: -5, foreB: 0 }), 300),
    F(P({ hy: 56, torso: 8, thighF: -8, shinF: -2, footF: 20, thighB: 95, shinB: -60, footB: 30, armF: -36, foreF: -40, armB: 40, foreB: 105 }), 300, 'Tall chest — steady repeatable pace'),
    F(P({ hy: 56.5, torso: 8, thighF: -4, shinF: -1, footF: 15, thighB: 30, shinB: -50, footB: 30, armF: -5, foreF: 0, armB: 5, foreB: 50 }), 300),
  ]),

  // ================= GENERATOR CATALOG =================
  'push-up': spec([
    F(P({ hx: 46, hy: 71, torso: 84, head: 6, thighF: -80, shinF: -81, footF: 115, thighB: -76, shinB: -77, footB: 115, armF: 10, foreF: 14, armB: 6, foreB: 10 }), 600, 'One straight line — hands under the shoulders', { hold: 250 }),
    F(P({ hx: 46, hy: 78, torso: 84, head: 6, thighF: -80, shinF: -81, footF: 115, thighB: -76, shinB: -77, footB: 115, armF: -42, foreF: 55, armB: -46, foreB: 51 }), 800, 'Chest to the floor — elbows 45°', { hold: 250 }),
    F(P({ hx: 46, hy: 71, torso: 84, head: 6, thighF: -80, shinF: -81, footF: 115, thighB: -76, shinB: -77, footB: 115, armF: 10, foreF: 14, armB: 6, foreB: 10 }), 600, 'Press the floor away', { ease: 'out', hold: 300 }),
  ]),
  'pike-push-up': spec([
    F(P({ hx: 50, hy: 52, torso: 122, head: 10, thighF: -30, shinF: -25, footF: 100, thighB: -26, shinB: -21, footB: 100, armF: 16, foreF: 18, armB: 12, foreB: 14 }), 650, 'Hips HIGH — inverted V', { hold: 300 }),
    F(P({ hx: 50, hy: 56, torso: 126, head: 10, thighF: -32, shinF: -27, footF: 100, thighB: -28, shinB: -23, footB: 100, armF: -30, foreF: 62, armB: -34, foreB: 58 }), 800, 'Head slides between the hands', { hold: 250 }),
    F(P({ hx: 50, hy: 52, torso: 122, head: 10, thighF: -30, shinF: -25, footF: 100, thighB: -26, shinB: -21, footB: 100, armF: 16, foreF: 18, armB: 12, foreB: 14 }), 620, 'Press back to the V', { ease: 'out', hold: 300 }),
  ]),
  'inverted-row': spec(
    [
      F(P({ hx: 50, hy: 72, torso: 70, head: -8, thighF: 42, shinF: 55, footF: -20, thighB: 46, shinB: 59, footB: -20, armF: 155, foreF: 160, armB: 151, foreB: 156 }), 650, 'Hang under the bar — arms long', { hold: 300 }),
      F(P({ hx: 50, hy: 65, torso: 70, head: -8, thighF: 38, shinF: 51, footF: -20, thighB: 42, shinB: 55, footB: -20, armF: 185, foreF: 105, armB: 181, foreB: 101 }), 550, 'Pull the CHEST to the bar', { ease: 'out', hold: 350 }),
      F(P({ hx: 50, hy: 72, torso: 70, head: -8, thighF: 42, shinF: 55, footF: -20, thighB: 46, shinB: 59, footB: -20, armF: 155, foreF: 160, armB: 151, foreB: 156 }), 850, 'Lower to a full stretch', { hold: 250 }),
    ],
    { kind: 'none' },
    [seg(28, 46, 76, 46, 2.5), seg(30, 46, 30, 90, 1.8), seg(74, 46, 74, 90, 1.8)],
  ),
  'chin-up': spec(
    [
      F(P({ hx: 50, hy: 52, torso: 0, thighF: 3, shinF: 1, footF: 30, thighB: -3, shinB: 0, footB: 30, armF: 179, foreF: 179, armB: 177, foreB: 177 }), 650, 'Dead hang — palms toward you', { hold: 300 }),
      F(P({ hx: 50, hy: 39, torso: 4, head: -4, thighF: 8, shinF: -22, footF: 35, thighB: 2, shinB: -28, footB: 35, armF: 95, foreF: 227, armB: 92, foreB: 224 }), 700, 'Elbows to your sides — chin over', { hold: 400 }),
      F(P({ hx: 50, hy: 52, torso: 0, thighF: 3, shinF: 1, footF: 30, thighB: -3, shinB: 0, footB: 30, armF: 179, foreF: 179, armB: 177, foreB: 177 }), 950, 'All the way down — full stretch', { hold: 300 }),
    ],
    { kind: 'none' },
    PULL_BAR,
  ),
  'split-squat': spec([
    F(P({ hx: 52, hy: 60.5, torso: 6, thighF: 26, shinF: -8, thighB: -30, shinB: -60, footB: 40, armF: 12, foreF: 14, armB: -10, foreB: -8 }), 600, 'Long split stance — weight on the front leg', { hold: 300 }),
    F(P({ hx: 52, hy: 70, torso: 12, thighF: 74, shinF: -8, thighB: -32, shinB: -84, footB: 140, armF: 12, foreF: 14, armB: -10, foreB: -8 }), 800, 'Back knee straight DOWN', { hold: 250 }),
    F(P({ hx: 52, hy: 60.5, torso: 6, thighF: 26, shinF: -8, thighB: -30, shinB: -60, footB: 40, armF: 12, foreF: 14, armB: -10, foreB: -8 }), 620, 'Drive through the front heel', { ease: 'out', hold: 300 }),
  ]),
  'reverse-lunge': spec([
    F(P({}), 550, 'Tall — step straight BACK', { hold: 250 }),
    F(P({ hx: 46, hy: 71, torso: 8, thighF: 78, shinF: -6, thighB: -32, shinB: -82, footB: 145, armF: -14, foreF: -16, armB: 16, foreB: 18 }), 800, 'Back knee drops — front shin vertical', { hold: 250 }),
    F(P({}), 620, 'Front heel drives you home', { ease: 'out', hold: 300 }),
  ]),
  'glute-bridge': spec([
    F(P({ hx: 46, hy: 84, torso: -82, head: -18, thighF: 105, shinF: -55, thighB: 101, shinB: -51, armF: -78, foreF: -80, armB: 78, foreB: 80 }), 600, 'Heels close — ribs down', { hold: 250 }),
    F(P({ hx: 48, hy: 74, torso: -62, head: -34, thighF: 96, shinF: -24, thighB: 92, shinB: -20, armF: -78, foreF: -80, armB: 78, foreB: 80 }), 600, 'Squeeze UP to a straight line — hold', { ease: 'out', hold: 600 }),
    F(P({ hx: 46, hy: 84, torso: -82, head: -18, thighF: 105, shinF: -55, thighB: 101, shinB: -51, armF: -78, foreF: -80, armB: 78, foreB: 80 }), 800, 'Lower under control', { hold: 200 }),
  ]),
  'hollow-hold': spec([
    F(P({ hx: 46, hy: 82, torso: -68, head: -26, thighF: 62, shinF: 66, footF: 45, thighB: 58, shinB: 62, footB: 45, armF: 100, foreF: 102, armB: 96, foreB: 98 }), 900, 'Lower back GLUED to the floor', { hold: 700 }),
    F(P({ hx: 46, hy: 82, torso: -70, head: -28, thighF: 58, shinF: 62, footF: 45, thighB: 54, shinB: 58, footB: 45, armF: 104, foreF: 106, armB: 100, foreB: 102 }), 900, 'Shallow dish — breathe behind the brace', { hold: 700 }),
  ]),
  'dead-bug': spec([
    F(P({ hx: 46, hy: 84, torso: -82, head: -18, thighF: 100, shinF: -15, thighB: 96, shinB: -11, armF: 170, foreF: 172, armB: 166, foreB: 168 }), 650, 'Arms up, knees over hips', { hold: 300 }),
    F(P({ hx: 46, hy: 84, torso: -82, head: -18, thighF: 100, shinF: -15, thighB: 55, shinB: 35, footB: -10, armF: 115, foreF: 117, armB: 166, foreB: 168 }), 850, 'Opposite arm + leg lower — SLOW', { hold: 350 }),
    F(P({ hx: 46, hy: 84, torso: -82, head: -18, thighF: 100, shinF: -15, thighB: 96, shinB: -11, armF: 170, foreF: 172, armB: 166, foreB: 168 }), 700, 'Back stays pressed down — switch', { hold: 300 }),
    F(P({ hx: 46, hy: 84, torso: -82, head: -18, thighF: 55, shinF: 35, footF: -10, thighB: 96, shinB: -11, armF: 170, foreF: 172, armB: 111, foreB: 113 }), 850, 'Other side — exhale as you reach', { hold: 350 }),
  ]),
  'db-shoulder-press': spec(
    [
      F(P({ torso: 3, armF: 30, foreF: 168, armB: 27, foreB: 165 }), 600, 'Bells at the shoulders — ribs down', { hold: 300 }),
      F(P({ torso: 1, armF: 172, foreF: 176, armB: 169, foreB: 173 }), 550, 'Press straight up — biceps by the ears', { ease: 'out', hold: 450 }),
      F(P({ torso: 3, armF: 30, foreF: 168, armB: 27, foreB: 165 }), 850, 'Lower with control', { hold: 250 }),
    ],
    { kind: 'db', at: 'wrists' },
  ),
  'lat-pulldown': spec(
    [
      F(P({ hx: 46, hy: 70, torso: 8, thighF: 88, shinF: -6, thighB: 84, shinB: -2, armF: 168, foreF: 172, armB: 165, foreB: 169 }), 650, 'Blades set — arms long overhead', { hold: 300 }),
      F(P({ hx: 46, hy: 70, torso: 12, thighF: 88, shinF: -6, thighB: 84, shinB: -2, armF: 55, foreF: 195, armB: 52, foreB: 192 }), 550, 'Elbows DOWN — bar to the chest', { ease: 'out', hold: 400 }),
      F(P({ hx: 46, hy: 70, torso: 8, thighF: 88, shinF: -6, thighB: 84, shinB: -2, armF: 168, foreF: 172, armB: 165, foreB: 169 }), 900, 'Ride the stretch all the way up', { hold: 250 }),
    ],
    { kind: 'none' },
    [seg(40, 12, 72, 12, 2.2), seg(28, 78, 52, 78, 3), seg(32, 78, 32, 90, 1.8), seg(48, 78, 48, 90, 1.8)],
  ),
  'seated-cable-row': spec(
    [
      F(P({ hx: 44, hy: 74, torso: 22, head: -6, thighF: 82, shinF: 40, footF: -30, thighB: 78, shinB: 36, footB: -30, armF: 95, foreF: 97, armB: 92, foreB: 94 }), 650, 'Full stretch — blades slide forward', { hold: 300 }),
      F(P({ hx: 44, hy: 74, torso: 2, head: 0, thighF: 82, shinF: 40, footF: -30, thighB: 78, shinB: 36, footB: -30, armF: -25, foreF: 85, armB: -28, foreB: 82 }), 550, 'Pull to the lower ribs — chest proud', { ease: 'out', hold: 400 }),
      F(P({ hx: 44, hy: 74, torso: 22, head: -6, thighF: 82, shinF: 40, footF: -30, thighB: 78, shinB: 36, footB: -30, armF: 95, foreF: 97, armB: 92, foreB: 94 }), 900, 'Return slow to the stretch', { hold: 250 }),
    ],
    { kind: 'none' },
    [seg(24, 78, 60, 78, 3), seg(76, 60, 76, 90, 2.2)],
  ),
  'leg-press': spec(
    [
      F(P({ hx: 38, hy: 68, torso: -38, head: 30, thighF: 62, shinF: 30, footF: -20, thighB: 58, shinB: 26, footB: -20, armF: 35, foreF: 40, armB: 31, foreB: 36 }), 650, 'Feet mid-platform — back on the pad', { hold: 300 }),
      F(P({ hx: 38, hy: 68, torso: -38, head: 30, thighF: 105, shinF: -20, footF: 20, thighB: 101, shinB: -24, footB: 20, armF: 35, foreF: 40, armB: 31, foreB: 36 }), 800, 'Lower until knees near the chest', { hold: 250 }),
      F(P({ hx: 38, hy: 68, torso: -38, head: 30, thighF: 62, shinF: 30, footF: -20, thighB: 58, shinB: 26, footB: -20, armF: 35, foreF: 40, armB: 31, foreB: 36 }), 600, 'Press through mid-foot — never slam lockout', { ease: 'out', hold: 300 }),
    ],
    { kind: 'none' },
    [seg(66, 44, 84, 78, 3), seg(20, 82, 48, 82, 3)],
  ),
  'machine-leg-curl': spec(
    [
      F(P({ hx: 46, hy: 76, torso: 86, head: 8, thighF: -82, shinF: -84, footF: 100, thighB: -78, shinB: -80, footB: 100, armF: 25, foreF: 60, armB: 21, foreB: 56 }), 650, 'Hips pinned — pad above the heels', { hold: 300 }),
      F(P({ hx: 46, hy: 76, torso: 86, head: 8, thighF: -82, shinF: -160, footF: 40, thighB: -78, shinB: -156, footB: 40, armF: 25, foreF: 60, armB: 21, foreB: 56 }), 550, 'Curl the heels to the glutes — squeeze', { ease: 'out', hold: 400 }),
      F(P({ hx: 46, hy: 76, torso: 86, head: 8, thighF: -82, shinF: -84, footF: 100, thighB: -78, shinB: -80, footB: 100, armF: 25, foreF: 60, armB: 21, foreB: 56 }), 1000, 'Three seconds down — full stretch', { hold: 250 }),
    ],
    { kind: 'none' },
    [seg(20, 84, 80, 84, 3)],
  ),
  'bike-erg': spec(
    [
      F(P({ hx: 46, hy: 62, torso: 28, head: -8, thighF: 78, shinF: -30, footF: 15, thighB: 30, shinB: 25, footB: 15, armF: 55, foreF: 75, armB: 51, foreB: 71 }), 400, 'Smooth circles — quiet upper body'),
      F(P({ hx: 46, hy: 62, torso: 28, head: -8, thighF: 30, shinF: 25, footF: 15, thighB: 78, shinB: -30, footB: 15, armF: 55, foreF: 75, armB: 51, foreB: 71 }), 400, 'Conversational pace = zone 2'),
    ],
    { kind: 'none' },
    [seg(30, 78, 30, 90, 2), seg(64, 66, 64, 78, 2), seg(24, 90, 40, 90, 2.5), seg(56, 84, 74, 84, 2.5)],
  ),
  'rowing-erg': spec(
    [
      F(P({ hx: 42, hy: 72, torso: 30, head: -6, thighF: 95, shinF: -35, footF: -20, thighB: 91, shinB: -31, footB: -20, armF: 85, foreF: 88, armB: 81, foreB: 84 }), 700, 'Catch — arms long, shins vertical', { hold: 200 }),
      F(P({ hx: 50, hy: 72, torso: -18, head: 10, thighF: 70, shinF: 35, footF: -20, thighB: 66, shinB: 31, footB: -20, armF: -20, foreF: 70, armB: -24, foreB: 66 }), 600, 'LEGS drive — then swing, then pull', { ease: 'out', hold: 350 }),
      F(P({ hx: 42, hy: 72, torso: 30, head: -6, thighF: 95, shinF: -35, footF: -20, thighB: 91, shinB: -31, footB: -20, armF: 85, foreF: 88, armB: 81, foreB: 84 }), 800, 'Arms away, hips forward, slide up', { hold: 200 }),
    ],
    { kind: 'none' },
    [seg(18, 82, 86, 82, 2.5), seg(80, 62, 80, 82, 2.2)],
  ),
  'db-rdl': spec(
    [
      F(P({ armF: 4, foreF: 4, armB: 2, foreB: 2 }), 550, 'Bells on the thighs — soft knees', { hold: 250 }),
      F(P({ hx: 43, hy: 59.5, torso: 52, head: -8, thighF: 18, shinF: 2, thighB: 16, shinB: 4, armF: -6, foreF: -6, armB: -6, foreB: -6 }), 1000, 'Hips BACK — bells slide the legs', { hold: 300 }),
      F(P({ armF: 4, foreF: 4, armB: 2, foreB: 2 }), 650, 'Drive the hips through — squeeze tall', { ease: 'out', hold: 350 }),
    ],
    { kind: 'db', at: 'wrists' },
  ),
}

/** Demo for an exercise, with a safe standing fallback. */
export function demoFor(id: string): DemoSpec {
  return (
    EXERCISE_DEMOS[id] ?? spec([F(P(), 900, null, { hold: 400 }), F(P({ hy: 57.4 }), 900, null, { hold: 400 })])
  )
}
