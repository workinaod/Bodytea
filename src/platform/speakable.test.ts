import { describe, expect, it } from 'vitest'
import { intoChunks, speakable } from './speakable'
import { coachVoices, missingCoachVoices, pickVoice, scoreVoice } from './voices'

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


describe('the coach voice shortlist', () => {
  // The picker listed every English voice the device reported and never
  // consulted scoreVoice, which has vetoed the joke voices all along. On
  // an iPhone that put Albert, Bad News, Bahh and Bells at the top of the
  // list, in that order, with Samantha somewhere below the fold.
  const IOS_LIST = [
    voice('Albert', 'com.apple.speech.synthesis.voice.Albert'),
    voice('Bad News', 'com.apple.speech.synthesis.voice.BadNews'),
    voice('Bahh', 'com.apple.speech.synthesis.voice.Bahh'),
    voice('Bells', 'com.apple.speech.synthesis.voice.Bells'),
    voice('Samantha', 'com.apple.ttsbundle.Samantha-compact'),
    voice('Allison', 'com.apple.ttsbundle.Allison-compact'),
    voice('Nathan', 'com.apple.ttsbundle.Nathan-compact'),
    voice('Zoe', 'com.apple.ttsbundle.Zoe-compact'),
    voice('Jamie', 'com.apple.ttsbundle.Jamie-compact', 'en-GB'),
    voice('Tessa', 'com.apple.ttsbundle.Tessa-compact', 'en-ZA'),
    // Taken off the shortlist. Still installed on the device, which is
    // exactly why they are still in this fixture: the interesting case
    // is a voice that resolves fine and must not be used anyway.
    voice('Karen', 'com.apple.ttsbundle.Karen-compact', 'en-AU'),
    voice('Moira', 'com.apple.ttsbundle.Moira-compact', 'en-IE'),
    voice('Fred', 'com.apple.speech.synthesis.voice.Fred'),
    voice('Rocko', 'com.apple.eloquence.en-US.Rocko'),
    // Neither a joke voice nor shortlisted, and deliberately the HIGHEST
    // quality cut in the list. Without these two the fixture could not
    // tell the shortlist apart from "everything that is not a joke", and
    // a mutation removing the shortlist entirely survived the suite.
    voice('Ava', 'com.apple.voice.enhanced.en-US.Ava'),
    voice('Daniel', 'com.apple.voice.premium.en-GB.Daniel', 'en-GB'),
  ]

  it('offers exactly the shortlist, and nothing else', () => {
    expect(coachVoices(IOS_LIST).map((v) => v.name).sort()).toEqual([
      'Allison',
      'Jamie',
      'Nathan',
      'Samantha',
      'Tessa',
      'Zoe',
    ])
  })

  it('does not offer a voice that was taken off the list', () => {
    const names = coachVoices(IOS_LIST).map((v) => v.name)
    expect(names).not.toContain('Karen')
    expect(names).not.toContain('Moira')
  })

  it('names the shortlist voices a stock iPhone does not have', () => {
    // What the phone actually reports: one basic voice per English
    // accent. Allison, Nathan, Zoe and Jamie are not shipped at all,
    // they are Enhanced/Premium downloads, so the picker showed two
    // rows and no reason why.
    const stockIphone = [
      voice('Samantha', 'com.apple.ttsbundle.Samantha-compact'),
      voice('Tessa', 'com.apple.ttsbundle.Tessa-compact', 'en-ZA'),
      voice('Karen', 'com.apple.ttsbundle.Karen-compact', 'en-AU'),
      voice('Daniel', 'com.apple.ttsbundle.Daniel-compact', 'en-GB'),
    ]
    expect(missingCoachVoices(stockIphone).sort()).toEqual(['Allison', 'Jamie', 'Nathan', 'Zoe'])
  })

  it('says nothing is missing once they are installed', () => {
    const loaded = [
      voice('Samantha', 'com.apple.voice.premium.en-US.Samantha'),
      voice('Allison', 'com.apple.voice.premium.en-US.Allison'),
      voice('Nathan', 'com.apple.voice.premium.en-US.Nathan'),
      voice('Zoe', 'com.apple.voice.premium.en-US.Zoe'),
      voice('Jamie', 'com.apple.voice.premium.en-GB.Jamie', 'en-GB'),
      voice('Tessa', 'com.apple.ttsbundle.Tessa-compact', 'en-ZA'),
    ]
    expect(missingCoachVoices(loaded)).toEqual([])
  })

  it('counts Jaime as Jamie already installed', () => {
    const withJaime = [
      voice('Samantha', 'com.apple.ttsbundle.Samantha-compact'),
      voice('Jaime', 'com.apple.ttsbundle.Jaime-compact', 'en-GB'),
    ]
    expect(missingCoachVoices(withJaime)).not.toContain('Jamie')
  })

  it('does not nag an Android phone about Apple voices', () => {
    // None of the shortlist exists there, the fallback list already
    // offers the device's own voices, and naming six voices that cannot
    // be installed is advice nobody can act on.
    const android = [
      voice('Google US English', 'Google US English'),
      voice('Google UK English Female', 'Google UK English Female', 'en-GB'),
    ]
    expect(missingCoachVoices(android)).toEqual([])
  })

  it('matches Jamie however the device spells it', () => {
    // Apple's English voice is Jamie; Jaime is its Spanish one. Both
    // spellings resolve so no device is left without it, and the
    // Spanish voice never reaches here because callers filter to en-*.
    const jaime = [voice('Jaime', 'com.apple.ttsbundle.Jaime-compact', 'en-GB')]
    expect(coachVoices(jaime).map((v) => v.name)).toEqual(['Jaime'])
  })

  it('keeps every quality cut of a shortlisted voice, so the good one is pickable', () => {
    const both = [
      voice('Samantha', 'com.apple.ttsbundle.Samantha-compact'),
      voice('Samantha', 'com.apple.voice.premium.en-US.Samantha'),
    ]
    expect(coachVoices(both)).toHaveLength(2)
  })

  it('falls back to everything decent when none of the four exist', () => {
    // Android and desktop Chrome have none of these. An empty picker
    // there would take the choice away from the users who most need one.
    const android = [
      voice('Google US English', 'Google US English'),
      voice('Google UK English Female', 'Google UK English Female', 'en-GB'),
      voice('Albert', 'com.apple.speech.synthesis.voice.Albert'),
    ]
    const out = coachVoices(android).map((v) => v.name)
    expect(out).toContain('Google US English')
    expect(out).not.toContain('Albert')
  })

  it('never returns a joke voice through the fallback either', () => {
    expect(coachVoices([voice('Zarvox', 'com.apple.speech.synthesis.voice.Zarvox')])).toEqual([])
  })

  it('excludes good voices that are simply not on the list', () => {
    // The distinction the first version of this fixture could not make:
    // Ava and Daniel are perfectly nice voices and still not offered.
    const names = coachVoices(IOS_LIST).map((v) => v.name)
    expect(names).not.toContain('Ava')
    expect(names).not.toContain('Daniel')
  })

  it('automatic selection lands on the shortlist even against a better voice', () => {
    // The bug a mutation test found in the first fix: a +12 score bonus
    // for shortlisted names loses to an enhanced Ava at 21 against a
    // compact Samantha at 9, so "Reset to automatic" returned a voice the
    // picker refuses to show. Scoring cannot express set membership.
    const picked = pickVoice(IOS_LIST)
    expect(['Samantha', 'Tessa', 'Jamie', 'Allison', 'Nathan', 'Zoe']).toContain(picked?.name)
  })

  it('still prefers the better CUT of a shortlisted voice', () => {
    // Restricting the pool must not throw away quality ranking inside it.
    const picked = pickVoice([
      voice('Samantha', 'com.apple.ttsbundle.Samantha-compact'),
      voice('Samantha', 'com.apple.voice.premium.en-US.Samantha'),
    ])
    expect(picked?.voiceURI).toBe('com.apple.voice.premium.en-US.Samantha')
  })

  it('an explicit choice wins among the voices on offer', () => {
    const tessa = IOS_LIST.find((v) => v.name === 'Tessa') as SpeechSynthesisVoice
    expect(pickVoice(IOS_LIST, tessa.voiceURI)).toBe(tessa)
  })

  it('will not speak with a saved voice that is no longer offered', () => {
    // The reported bug, exactly. Karen was chosen while she was on the
    // list, the URI is still in settings, and she is still installed on
    // the phone — so she still resolved and still spoke, long after the
    // picker stopped offering her. Removing a voice has to remove it.
    const karen = IOS_LIST.find((v) => v.name === 'Karen') as SpeechSynthesisVoice
    const picked = pickVoice(IOS_LIST, karen.voiceURI)
    expect(picked?.name).not.toBe('Karen')
    expect(['Samantha', 'Tessa', 'Jamie', 'Allison', 'Nathan', 'Zoe']).toContain(picked?.name)
  })

  it('ignores a stored choice for a voice that was never offered', () => {
    const ava = voice('Ava', 'com.apple.voice.premium.en-US.Ava')
    expect(pickVoice([...IOS_LIST, ava], ava.voiceURI)?.name).not.toBe('Ava')
  })

  it('still honours a choice made from the Android fallback list', () => {
    // Where none of the shortlist exists, the offered set IS the decent
    // voices, so a choice made there must keep working.
    const android = [
      voice('Google US English', 'Google US English'),
      voice('Google UK English Female', 'Google UK English Female', 'en-GB'),
    ]
    expect(pickVoice(android, 'Google UK English Female')?.name).toBe('Google UK English Female')
  })
})
