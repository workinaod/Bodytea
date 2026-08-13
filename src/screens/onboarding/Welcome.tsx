
// ============================================================
// The first screen anyone sees.
//
// Five versions. Ninety words of claims. Then five goal buttons
// that were one person's life. Then the same five rounded and
// glowing on a dark gradient, which is what every generated app
// looks like. Then hard-edged tags on a tunnel, which looked
// right and still made you choose something before the app had
// said a single thing to you.
//
// This one says one thing and offers one door. The goals live
// on the goal screen, where there are twelve of them and the
// app already knows who it is talking to — asking here meant
// asking twice with a worse list.
// ============================================================

export function Welcome({
  rebuilding,
  onBuild,
  onOwnRoutine,
}: {
  rebuilding: boolean
  onBuild: () => void
  onOwnRoutine: () => void
}) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="headline text-[24px] leading-none tracking-[-0.04em]">
        Body<span className="text-accent">T</span>
      </div>

      <div className="mt-auto">
        <h1 className="headline text-[54px] uppercase leading-[0.86] tracking-[-0.045em]">
          Tell us
          <br />
          your goals.
          <br />
          <span className="text-accent">We'll get</span>
          <br />
          <span className="text-accent">you there.</span>
        </h1>
      </div>

      {rebuilding && (
        <p className="enter mt-7 border-l-2 border-accent py-1 pl-3 text-[12px] leading-snug text-ink-dim">
          <span className="font-black uppercase tracking-[0.08em] text-accent">Rebuilding.</span> Everything you
          logged is safe. Answer again and you get the better version.
        </p>
      )}

      <div className="mt-10">
        <button
          type="button"
          onClick={onBuild}
          className="press w-full bg-[#EFEFEE] py-[20px] text-[15px] font-black uppercase tracking-[0.14em] text-[#0B0B0C]"
        >
          {rebuilding ? 'Rebuild my plan' : "Let's get started"}
        </button>
        {/* The only other door there is. It stays because it is the sole
            way into bring-your-own-routine, and quiet because almost
            nobody arrives already holding a programme. */}
        <button
          type="button"
          onClick={onOwnRoutine}
          className="press mt-1 w-full py-3.5 text-[11px] font-black uppercase tracking-[0.18em] text-ink-faint"
        >
          I already have a routine
        </button>
      </div>
    </div>
  )
}
