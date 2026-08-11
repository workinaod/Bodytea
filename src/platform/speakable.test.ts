import { describe, expect, it } from 'vitest'
import { intoChunks, speakable } from './speakable'
import { pickVoice, scoreVoice } from './voices'

// Every input below is a real string from the catalog or the coach.

describe('speakable', () => {
  it('expands gym shorthand instead of spelling it out', () => {
    expect(speakable('Incline DB Press')).toBe('Incline dumbbell Press')
    expect(speakable('DB RDL')).toBe('dumbbell Romanian deadlift')
    expect(speakable('Seated OHP')).toBe('Seated overhead press')
    expect(speakable('KB Swing')).toBe('kettlebell Swing')
    expect(speakable('MB Rotational Throw')).toBe('medicine ball Rotational Throw')
    expect(speakable('EZ-bar Curl')).toBe('easy bar Curl')
    expect(speakable('Repeated CMJ')).toBe('Repeated countermovement jump')
  })

  it('reads a rep range as a range, not as a hyphen', () => {
    expect(speakable('8-12')).toBe('8 to 12')
    expect(speakable('30–40 yd')).toBe('30 to 40 yards')
    expect(speakable('5–10 yd')).toBe('5 to 10 yards')
  })

  it('leaves hyphenated words alone', () => {
    // The range rule must only fire between digits, or compound exercise
    // names come apart.
    expect(speakable('Heels-Elevated Goblet Squat')).toBe('Heels-Elevated Goblet Squat')
    expect(speakable('Single-Leg Calf Raise')).toBe('Single-Leg Calf Raise')
    expect(speakable('Push-Up')).toBe('Push-Up')
  })

  it('says set counts as counts', () => {
    expect(speakable('3 × 8')).toBe('3 by 8')
    expect(speakable('4x6')).toBe('4 by 6')
    expect(speakable('3 × 8-12')).toBe('3 by 8 to 12')
  })

  it('expands units only after a number', () => {
    expect(speakable('45 sec')).toBe('45 seconds')
    expect(speakable('90 min')).toBe('90 minutes')
    expect(speakable('135 lb')).toBe('135 pounds')
    expect(speakable('3 mi')).toBe('3 miles')
    // "in" as a preposition, "min" inside a word: untouched
    expect(speakable('Drive in the ground')).toBe('Drive in the ground')
    expect(speakable('Minutes matter')).toBe('Minutes matter')
  })

  it('reads a slash as per after a measurement and or between words', () => {
    expect(speakable('45 sec / side')).toBe('45 seconds per side')
    expect(speakable('3 sets / leg')).toBe('3 sets per leg')
    expect(speakable('Walk / hike')).toBe('Walk or hike')
    expect(speakable('DB / Barbell Front Squat')).toBe('dumbbell or Barbell Front Squat')
  })

  it('decides per-versus-or on the word before the slash, not the whole line', () => {
    // Scanning the line for any digit made "Set 2: Walk / hike" say
    // "walk per hike", which is how a real exercise name broke.
    expect(speakable('Set 2: Walk / hike')).toBe('Set 2: Walk or hike')
    expect(speakable('Set 2: 45 sec / side')).toBe('Set 2: 45 seconds per side')
  })

  it('handles a whole prescription line end to end', () => {
    expect(speakable('Incline DB Press · 3 × 8-12 · 45 sec / side')).toBe(
      'Incline dumbbell Press, 3 by 8 to 12, 45 seconds per side',
    )
  })

  it('reads symbols as words', () => {
    expect(speakable('3 sets @ 80%')).toBe('3 sets at 80 percent')
    expect(speakable('Squat + press')).toBe('Squat plus press')
  })
})

describe('intoChunks', () => {
  it('breaks a line at its real boundaries so each part gets its own arc', () => {
    expect(intoChunks('Set 1 of 5. Eight reps. Tap go when ready.')).toEqual([
      'Set 1 of 5.',
      'Eight reps.',
      'Tap go when ready.',
    ])
  })

  it('splits at the colon that used to sit mid-sentence', () => {
    expect(intoChunks('Rest. Next: Goblet Squat, set 2.')).toEqual([
      'Rest.',
      'Next:',
      'Goblet Squat, set 2.',
    ])
  })

  it('never emits empties', () => {
    expect(intoChunks('   ')).toEqual([])
    expect(intoChunks('Go.  ')).toEqual(['Go.'])
  })
})

// A minimal stand-in: only the four fields the picker reads.
const voice = (name: string, voiceURI: string, lang = 'en-US', localService = true) =>
  ({ name, voiceURI, lang, localService, default: false }) as SpeechSynthesisVoice

describe('voice selection', () => {
  it('finds quality in the URI, which is where Apple puts it', () => {
    // The old picker scored `name` for "premium" and so never fired on iOS.
    const premium = voice('Samantha', 'com.apple.voice.premium.en-US.Samantha')
    const compact = voice('Samantha', 'com.apple.ttsbundle.Samantha-compact')
    expect(scoreVoice(premium)).toBeGreaterThan(scoreVoice(compact))
  })

  it('does not veto every iOS voice for saying compact in its URI', () => {
    // "compact" appears in every iOS voiceURI. Vetoing on it would reject
    // the whole catalogue and fall back to the default we are avoiding.
    const compact = voice('Samantha', 'com.apple.ttsbundle.Samantha-compact')
    expect(scoreVoice(compact)).toBeGreaterThan(-100)
    expect(pickVoice([compact])).toBe(compact)
  })

  it('refuses the 1990s screen-reader voices', () => {
    for (const n of ['Eddy', 'Flo', 'Grandma', 'Grandpa', 'Reed', 'Rocko', 'Sandy', 'Shelley']) {
      expect(scoreVoice(voice(n, `com.apple.eloquence.en-US.${n}`)), n).toBe(-100)
    }
  })

  it('refuses the joke voices', () => {
    for (const n of ['Albert', 'Zarvox', 'Bad News', 'Bubbles', 'Trinoids']) {
      expect(scoreVoice(voice(n, `com.apple.speech.synthesis.voice.${n}`)), n).toBe(-100)
    }
  })

  it('picks the best of a real iOS list', () => {
    const list = [
      voice('Eddy', 'com.apple.eloquence.en-US.Eddy'),
      voice('Albert', 'com.apple.speech.synthesis.voice.Albert'),
      voice('Samantha', 'com.apple.ttsbundle.Samantha-compact'),
      voice('Samantha', 'com.apple.voice.enhanced.en-US.Samantha'),
    ]
    expect(pickVoice(list)?.voiceURI).toBe('com.apple.voice.enhanced.en-US.Samantha')
  })

  it('prefers English, and takes the engine default over a joke voice', () => {
    const fr = voice('Thomas', 'com.apple.voice.enhanced.fr-FR.Thomas', 'fr-FR')
    const en = voice('Ava', 'com.apple.ttsbundle.Ava-compact')
    expect(pickVoice([fr, en])).toBe(en)
    expect(pickVoice([voice('Zarvox', 'x.Zarvox')])).toBeNull()
    expect(pickVoice([])).toBeNull()
  })
})
