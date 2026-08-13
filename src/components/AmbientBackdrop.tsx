// ============================================================
// The room behind onboarding.
//
// The first version was three soft radial masses drifting behind
// the content — the single most recognisable AI-generated
// background there is, and adding motion to it did not make it
// less so. A lava lamp that moves is still a lava lamp.
//
// This is a tunnel: a hard shaft of light across a dark room,
// linear and edged, coming from somewhere. A colder shaft sits
// further back so the room has depth rather than one stripe
// painted on flat black, and the name runs oversized and
// outlined across it as architecture rather than decoration.
//
// On the first screen it is sharp, because it IS the screen.
// From the second on it goes out of focus and the questions come
// forward on paper — the room is still there, you are just no
// longer looking at it.
// ============================================================

export function AmbientBackdrop({ blurred = false }: { blurred?: boolean }) {
  return (
    <div className="ambient" aria-hidden="true">
      {/* Scaled up under blur so the softened edges never pull the
          background in off the sides of the screen. */}
      <div
        className="absolute inset-0 transition-[filter,transform] duration-500"
        style={blurred ? { filter: 'blur(26px) saturate(1.15)', transform: 'scale(1.18)' } : undefined}
      >
        <div className="ambient-shaft-far" />
        <div className="ambient-shaft" />
        <div className="ambient-ghost">BodyT</div>
      </div>
      <div className="ambient-grain" />
    </div>
  )
}
