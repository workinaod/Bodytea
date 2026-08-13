// ============================================================
// The field behind onboarding.
//
// Onboarding is the emptiest the app ever is: one question, four
// options, a button. On a flat #0a0a0a ground that reads as
// unfinished rather than as calm — there is nothing on screen
// telling you the app has a point of view.
//
// So: heat moving over asphalt. Two ember masses and one cold
// counter-light, drifting on cycles long enough that nothing
// ever appears to loop, with grain over the top because a 72px
// blur bands on an OLED panel and banding looks like a bug.
//
// It sits behind everything, catches no taps, and holds still
// for anyone who has asked their phone to stop moving things.
// ============================================================

export function AmbientBackdrop() {
  return (
    <div className="ambient" aria-hidden="true">
      {/* Warm, top-left, the biggest mass — where the eye starts. */}
      <div
        className="ambient-glow drift-a"
        style={{
          top: '-16%',
          left: '-20%',
          width: '104vw',
          height: '104vw',
          background: 'radial-gradient(circle, rgba(255,79,48,0.42) 0%, rgba(255,79,48,0.11) 42%, transparent 68%)',
        }}
      />
      {/* Deeper ember, bottom-right, so the screen has a diagonal. */}
      <div
        className="ambient-glow drift-b"
        style={{
          bottom: '-22%',
          right: '-24%',
          width: '110vw',
          height: '110vw',
          background: 'radial-gradient(circle, rgba(224,58,28,0.34) 0%, rgba(224,58,28,0.09) 45%, transparent 70%)',
        }}
      />
      {/* One cold light. Without it the whole screen is one hue and
          reads as a filter rather than as a room with lights in it. */}
      <div
        className="ambient-glow drift-c"
        style={{
          top: '30%',
          right: '-14%',
          width: '72vw',
          height: '72vw',
          background: 'radial-gradient(circle, rgba(111,178,232,0.20) 0%, rgba(111,178,232,0.05) 48%, transparent 70%)',
        }}
      />
      <div className="ambient-grain" />
      {/* A vignette rather than a lid: it holds contrast where the text
          sits without flattening the field back to black. */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 120% 78% at 50% 46%, rgba(10,10,10,0.72) 0%, rgba(10,10,10,0.34) 55%, transparent 100%)' }}
      />
    </div>
  )
}
