import { useEffect, useState } from 'react'
import { useAppStore } from '../../store/appStore'
import {
  bestQualityAvailable,
  coachVoices,
  listEnglishVoices,
  missingCoachVoices,
  onVoicesChanged,
  voiceChoiceIsStale,
  voiceQuality,
  COACH_VOICE_SET_VERSION,
  type VoiceQuality,
} from '../../platform/voices'
import { cancelSpeech, say, setPreferredVoice } from '../../platform/speech'

// ============================================================
// Pick the coach's voice, and get a better one onto the phone.
//
// The honest limit: a web app can only speak with voices the
// device already has. iOS ships ONLY the "compact" cut of each
// voice, which is the tinny robotic one, and the good cuts
// (Enhanced, Premium) are a free download nobody knows about.
// No amount of picking in code helps while every candidate on the
// device is the same low-fi engine.
//
// So this does the two things that actually move the needle: it
// says out loud when the phone has nothing good installed and
// gives the exact path to fix that, and it lets the user choose
// and HEAR each option instead of trusting a scoring heuristic
// about what sounds nice.
// ============================================================

const QUALITY_LABEL: Record<VoiceQuality, string> = {
  premium: 'Premium',
  enhanced: 'Enhanced',
  compact: 'Basic',
  unknown: '',
}

export function VoicePicker() {
  const chosen = useAppStore((s) => s.data.settings.voiceURI)
  const storedVersion = useAppStore((s) => s.data.settings.voiceSetVersion)
  const update = useAppStore((s) => s.update)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [allEnglish, setAllEnglish] = useState<SpeechSynthesisVoice[]>([])
  const [missing, setMissing] = useState<string[]>([])
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    // Shortlisted here rather than in listEnglishVoices, which is the
    // raw platform read and stays raw.
    const read = () => {
      const english = listEnglishVoices()
      setAllEnglish(english)
      setVoices(coachVoices(english))
      setMissing(missingCoachVoices(english))
    }
    read()
    return onVoicesChanged(read)
  }, [])

  // A choice made against an older shortlist clears itself, once.
  //
  // This is what retires a removed voice. The saved setting is a device
  // URI and the voice is still installed, so it kept resolving and kept
  // speaking after the picker stopped offering it.
  useEffect(() => {
    if (!voiceChoiceIsStale(storedVersion)) return
    update((d) => {
      delete d.settings.voiceURI
      d.settings.voiceSetVersion = COACH_VOICE_SET_VERSION
    })
    setPreferredVoice(undefined)
  }, [storedVersion, update])

  if (voices.length === 0) return null

  // Judged across every English voice on the phone, not just the
  // shortlisted rows. Asking two compact voices whether the DEVICE has
  // anything better is a question they cannot answer, and it printed
  // "your phone only has the basic voices" over a phone with premium
  // ones installed.
  const best = bestQualityAvailable(allEnglish.length ? allEnglish : voices)
  const onlyBasic = best === 'compact'
  // Good ones first, so the list opens on something worth hearing.
  const sorted = [...voices].sort((a, b) => {
    const rank = (q: VoiceQuality) => (q === 'premium' ? 0 : q === 'enhanced' ? 1 : q === 'unknown' ? 2 : 3)
    const d = rank(voiceQuality(a)) - rank(voiceQuality(b))
    return d !== 0 ? d : (a.name ?? '').localeCompare(b.name ?? '')
  })

  function choose(uri: string | undefined) {
    update((d) => {
      if (uri) d.settings.voiceURI = uri
      else delete d.settings.voiceURI
      // Stamped with the list it was chosen from, so this pick survives
      // until the shortlist itself changes.
      d.settings.voiceSetVersion = COACH_VOICE_SET_VERSION
    })
    setPreferredVoice(uri)
    cancelSpeech()
    say('Set one. Three reps left. Finish strong.', { interrupt: true })
  }

  return (
    <div className="space-y-2">
      <div>
        <div className="text-[13.5px] font-extrabold">Coach voice</div>
        <div className="mt-0.5 text-[11.5px] leading-snug text-ink-faint">
          Tap one to hear it. Whatever you pick is what she uses in a session.
        </div>
      </div>

      {onlyBasic && (
        <div className="rounded-xl border border-gold/30 bg-gold/8 px-3.5 py-2.5">
          <p className="text-[12.5px] font-bold text-gold">Your phone only has the basic voices</p>
          <p className="mt-1 text-[11.5px] leading-snug text-gold/85">
            That is the robotic one, and an app on the web can only use what the phone has
            installed. The good ones are a free download, once:
          </p>
          <p className="mt-1.5 text-[11.5px] font-semibold leading-snug text-gold">
            Settings → Accessibility → Spoken Content → Voices → English → pick a voice → download
            the Enhanced or Premium version.
          </p>
          <p className="mt-1.5 text-[11px] leading-snug text-gold/70">
            Come back here after and it will show up in this list.
          </p>
        </div>
      )}

      {/* Names the ones that are missing rather than leaving a short list
          with no explanation. A web app can only speak with voices the
          phone already has, and most of the shortlist is a download that
          nobody knows exists — so an absent voice looks like a bug in
          the app instead of an empty slot on the device. */}
      {missing.length > 0 && (
        <div className="rounded-xl bg-white/[0.04] px-3.5 py-2.5 ring-1 ring-white/[0.07]">
          <p className="text-[12.5px] font-bold">
            {missing.length === 1 ? '1 more voice' : `${missing.length} more voices`} you can add
          </p>
          <p className="mt-1 text-[11.5px] leading-snug text-ink-dim">
            <span className="font-semibold text-ink">{missing.join(', ')}</span>{' '}
            {missing.length === 1 ? "isn't" : "aren't"} on this phone yet. Apple ships one basic
            voice per accent and keeps the rest as a free download.
          </p>
          {!onlyBasic && (
            <p className="mt-1.5 text-[11.5px] font-semibold leading-snug text-ink">
              Settings → Accessibility → Spoken Content → Voices → English
            </p>
          )}
          <p className="mt-1.5 text-[11px] leading-snug text-ink-faint">
            Download {missing.length === 1 ? 'it' : 'any of them'} and{' '}
            {missing.length === 1 ? 'it appears' : 'they appear'} here automatically.
          </p>
        </div>
      )}

      <div className="max-h-64 overflow-y-auto overscroll-contain rounded-2xl ring-1 ring-white/[0.07]">
        {sorted.map((v) => {
          const q = voiceQuality(v)
          const active = chosen === v.voiceURI
          return (
            <button
              key={v.voiceURI}
              onClick={() => choose(v.voiceURI)}
              className={`flex w-full items-center justify-between gap-3 border-b border-white/[0.05] px-4 py-3 text-left last:border-b-0 ${
                active ? 'bg-accent/12' : 'bg-white/[0.03] active:bg-white/[0.08]'
              }`}
            >
              <span className="min-w-0">
                <span className={`block text-[13px] font-bold ${active ? 'text-accent-soft' : ''}`}>
                  {(v.name ?? '').replace(/\s*\((enhanced|premium|compact)\)/i, '')}
                </span>
                <span className="mt-0.5 block text-[10.5px] text-ink-faint">{v.lang}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                {QUALITY_LABEL[q] && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wider ${
                      q === 'compact'
                        ? 'bg-white/[0.07] text-ink-faint'
                        : 'bg-lime/15 text-lime'
                    }`}
                  >
                    {QUALITY_LABEL[q]}
                  </span>
                )}
                {active && <span className="text-[13px] text-accent">✓</span>}
              </span>
            </button>
          )
        })}
      </div>

      {/* The shortlist is a recommendation, not a cage.
          A curated list is right by default, but when a voice IS on the
          phone and simply is not on our list, hiding it leaves nothing
          to do and nothing to check. This shows exactly what the device
          reports — every name, accent and quality — and lets any of it
          be chosen. It is also the only honest way to tell "iOS is not
          exposing that voice to the browser" apart from "our list does
          not mention it", which no amount of guessing from here can. */}
      {allEnglish.length > voices.length && (
        <button
          onClick={() => setShowAll((s) => !s)}
          className="press text-[11.5px] font-bold text-ink-faint"
        >
          {showAll ? 'Hide' : `Not seeing a voice? Show all ${allEnglish.length} on this phone`}
        </button>
      )}

      {showAll && (
        <div className="max-h-64 overflow-y-auto overscroll-contain rounded-2xl ring-1 ring-white/[0.07]">
          {[...allEnglish]
            .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
            .map((v) => {
              const q = voiceQuality(v)
              const active = chosen === v.voiceURI
              return (
                <button
                  key={v.voiceURI}
                  onClick={() => choose(v.voiceURI)}
                  className={`flex w-full items-center justify-between gap-3 border-b border-white/[0.05] px-4 py-2.5 text-left last:border-b-0 ${
                    active ? 'bg-accent/12' : 'bg-white/[0.03] active:bg-white/[0.08]'
                  }`}
                >
                  <span className="min-w-0">
                    <span className={`block text-[12.5px] font-bold ${active ? 'text-accent-soft' : ''}`}>
                      {v.name}
                    </span>
                    <span className="mt-0.5 block text-[10px] text-ink-faint">{v.lang}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {QUALITY_LABEL[q] && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wider ${
                          q === 'compact' ? 'bg-white/[0.07] text-ink-faint' : 'bg-lime/15 text-lime'
                        }`}
                      >
                        {QUALITY_LABEL[q]}
                      </span>
                    )}
                    {active && <span className="text-[13px] text-accent">✓</span>}
                  </span>
                </button>
              )
            })}
        </div>
      )}

      {chosen && (
        <button onClick={() => choose(undefined)} className="press text-[11.5px] font-bold text-ink-faint">
          Reset to automatic
        </button>
      )}
    </div>
  )
}
