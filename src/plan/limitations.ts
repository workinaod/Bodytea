import type { ISODate } from '../types'
import type { Limitation } from '../prefsTypes'
import type { Joint } from './movement'

// ============================================================
// "Anything that hurts right now?" is the question every real coach asks
// in the first minute, and BodyT has asked it since the onboarding
// rebuild. Its own `informs` line says what it is for: "Routes the plan
// around the joint from day one instead of waiting for it to flare."
//
// It routed nothing. The answer landed in goalAnswers and stopped there.
// data.prefs.limitations, which the adapt engine reads on every day it
// resolves, was written by nobody, so the only way to keep the plan off a
// bad shoulder was to keep hurting it: pain is otherwise inferred from a
// rolling 14-day window, and fifteen quiet days brought the movement
// straight back. Somebody who told us on day one was in exactly the same
// position as somebody who never mentioned it.
//
// This is the translation from what they tapped to what the engine
// reasons over. Two rules, both about failing on the safe side:
//
//   A chip maps to its joint. No cleverness, no inference.
//
//   Free text is matched for joints and KEPT either way. A phrase we
//   cannot place still becomes a limitation with no joints on it: the
//   plan cannot route around a word it does not know, but the coach can
//   still say it back, and an athlete who typed "my hip flexor grabs on
//   squats" should never see a plan written as though they said nothing.
// ============================================================

/** The chips, which are unambiguous because we wrote them. */
const CHIP_JOINTS: Record<string, Joint[]> = {
  Knees: ['knee'],
  'Lower back': ['lower-back'],
  Shoulders: ['shoulder'],
  Hips: ['hip'],
  Ankles: ['ankle'],
}

/**
 * Their words. Ordered longest-reach first so "lower back" is not read
 * as a back that happens to contain the word "ack".
 *
 * Deliberately generous: a term that reaches one joint too many costs an
 * exercise substitution, and a term that reaches one too few costs
 * somebody a session on a joint they told us about.
 */
const WORD_JOINTS: [RegExp, Joint[]][] = [
  [/low(er)?[\s-]?back|lumbar|sciatic|disc|si joint|spine/, ['lower-back']],
  [/knee|acl|mcl|pcl|meniscus|patell|itb|it band|jumper/, ['knee']],
  [/shoulder|rotator|cuff|labrum|labral|delt|impinge|ac joint/, ['shoulder']],
  [/hip|groin|adductor|glute med|piriformis|flexor/, ['hip']],
  [/ankle|achilles|calf|plantar|shin|foot|feet/, ['ankle']],
  [/elbow|tennis|golfer|tricep tendon/, ['elbow']],
  [/wrist|carpal|forearm|thumb/, ['wrist']],
]

/** Joints named anywhere in a free-text answer. */
export function jointsInText(text: string): Joint[] {
  const s = text.toLowerCase()
  const out = new Set<Joint>()
  for (const [re, joints] of WORD_JOINTS) if (re.test(s)) for (const j of joints) out.add(j)
  return [...out]
}

/**
 * What the athlete told us in onboarding, as something the engine can
 * route around. Empty when they said nothing hurts, which is a real
 * answer and not a missing one.
 */
export function limitationsFrom(
  answers: Record<string, string> | undefined,
  since: ISODate,
): Limitation[] {
  const picked = answers?.['injuries']
  if (!picked || picked === 'Nothing') return []

  if (picked === 'Something else') {
    const label = (answers?.['injury-what'] ?? '').trim()
    // They chose the option that exists to let them say it, and then said
    // nothing. Recording an empty limitation would put a blank line in
    // their own notes back at them.
    if (!label) return []
    return [{ label, joints: jointsInText(label), since }]
  }

  const joints = CHIP_JOINTS[picked]
  if (!joints) return []
  return [{ label: picked, joints, since }]
}
