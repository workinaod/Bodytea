import type { EarStatus } from '../../platform/speech'

// ============================================================
// What to do when the coach cannot hear you.
//
// The microphone used to fail silently: recognition died, the
// restart loop span, and the screen carried on looking like it
// was listening while somebody spent a set repeating "done" at a
// phone that could not hear them.
//
// Nearly always the cause is another app holding the audio route
// — music, a video — which iOS does not let a web page share. A
// native app asks for .playAndRecord with .mixWithOthers and
// keeps listening through it; Safari has no equivalent, so this
// is reported honestly rather than pretended away.
//
// Its own file to keep FocusView under the size it was cut down
// to, which is the whole point of that allowance.
// ============================================================

export function EarStatusNote({ status }: { status: EarStatus }) {
  if (status === 'listening') return null
  return (
    <div className="mt-2 px-4">
      <div className="rounded-xl border border-gold/30 bg-gold/8 px-3 py-2 text-[11.5px] font-semibold leading-snug text-gold">
        {status === 'denied'
          ? 'Microphone permission is off, so voice commands are not listening. Tap the buttons to move through the set.'
          : "Can't hear you. Something else is using the mic, usually music or a video playing. Tap the buttons instead, and voice comes back on its own when it stops."}
      </div>
    </div>
  )
}
