import type { RunLog } from '../types'
import type { Reaction } from '../engine/reactions'
import { avgMph, fmtDuration, fmtPace } from '../engine/runs'

// ============================================================
// The live finish card: a dimensional, animated object, the
// reaction plays BEHIND the route line, the route stays in
// front, the numbers on top. The shared PNG mirrors this frame.
// ============================================================

const CARD_CSS = `
@keyframes rrc-burst { 0% { transform: translate(0,0) scale(0.2); opacity: 0 } 12% { opacity: 1 } 70% { opacity: .9 } 100% { transform: translate(var(--dx), var(--dy)) scale(1); opacity: 0 } }
@keyframes rrc-spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
@keyframes rrc-glim { 0%, 100% { opacity: .1 } 50% { opacity: .9 } }
@keyframes rrc-star { 0% { transform: translate(-30%, -10%) rotate(-18deg); opacity: 0 } 15% { opacity: 1 } 60% { opacity: 1 } 100% { transform: translate(140%, 60%) rotate(-18deg); opacity: 0 } }
@keyframes rrc-fall { 0% { transform: translateY(-12%) rotate(0deg); opacity: 0 } 10% { opacity: 1 } 100% { transform: translateY(112%) rotate(240deg); opacity: 0 } }
@keyframes rrc-ember { 0%, 100% { opacity: .16; transform: scale(1) } 50% { opacity: .38; transform: scale(1.12) } }
@keyframes rrc-shine { 0% { transform: translateX(-140%) } 100% { transform: translateX(240%) } }
`

function FireworksLayer() {
  const bursts = [
    { x: '24%', y: '30%', hue: '#ff4f30' },
    { x: '72%', y: '22%', hue: '#f2c14e' },
    { x: '58%', y: '48%', hue: '#c6f24e' },
  ]
  return (
    <div className="absolute inset-0 overflow-hidden">
      {bursts.map((b, bi) =>
        Array.from({ length: 10 }, (_, i) => {
          const ang = (i / 10) * Math.PI * 2
          return (
            <span
              key={`${bi}-${i}`}
              className="absolute h-1.5 w-1.5 rounded-full"
              style={{
                left: b.x,
                top: b.y,
                background: b.hue,
                animation: `rrc-burst 2.2s ease-out ${bi * 0.55}s infinite`,
                ['--dx' as string]: `${Math.cos(ang) * 74}px`,
                ['--dy' as string]: `${Math.sin(ang) * 74}px`,
              }}
            />
          )
        }),
      )}
    </div>
  )
}

function DiscoLayer() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        className="absolute left-1/2 top-[26%] h-24 w-24 -translate-x-1/2 rounded-full"
        style={{
          background:
            'repeating-conic-gradient(from 0deg, rgba(255,255,255,0.55) 0deg 8deg, rgba(160,160,180,0.25) 8deg 16deg)',
          animation: 'rrc-spin 6s linear infinite',
          boxShadow: '0 0 60px rgba(255,255,255,0.25)',
        }}
      />
      {['12%/58%', '30%/70%', '52%/64%', '72%/72%', '86%/52%', '64%/34%'].map((p, i) => {
        const [l, t] = p.split('/')
        return (
          <span
            key={i}
            className="absolute h-2 w-2 rounded-full bg-white"
            style={{ left: l, top: t, animation: `rrc-glim 1.8s ease-in-out ${i * 0.3}s infinite` }}
          />
        )
      })}
    </div>
  )
}

function StarsLayer() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="absolute h-1 w-28 rounded-full"
          style={{
            left: `${8 + i * 10}%`,
            top: `${14 + i * 16}%`,
            background: 'linear-gradient(90deg, transparent, #fff, #f2c14e)',
            animation: `rrc-star 2.8s ease-in ${i * 0.9}s infinite`,
          }}
        />
      ))}
    </div>
  )
}

function ConfettiLayer() {
  const hues = ['#ff4f30', '#c6f24e', '#6fb2e8', '#f2c14e', '#ffffff']
  return (
    <div className="absolute inset-0 overflow-hidden">
      {Array.from({ length: 16 }, (_, i) => (
        <span
          key={i}
          className="absolute h-2 w-1.5"
          style={{
            left: `${(i * 61) % 100}%`,
            top: '-6%',
            background: hues[i % hues.length],
            animation: `rrc-fall ${2.6 + (i % 4) * 0.5}s linear ${(i % 5) * 0.5}s infinite`,
          }}
        />
      ))}
    </div>
  )
}

function EmberLayer() {
  return (
    <div
      className="absolute left-1/2 top-[38%] h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full"
      style={{
        background: 'radial-gradient(circle, rgba(255,79,48,0.5), transparent 65%)',
        animation: 'rrc-ember 3.2s ease-in-out infinite',
      }}
    />
  )
}

export function RunReactionCard({ log, reaction }: { log: RunLog; reaction: Reaction }) {
  const pts = log.points
  let path = ''
  if (pts.length >= 2) {
    const lats = pts.map((p) => p[0])
    const lngs = pts.map((p) => p[1])
    const minLa = Math.min(...lats)
    const maxLa = Math.max(...lats)
    const minLo = Math.min(...lngs)
    const maxLo = Math.max(...lngs)
    path = pts
      .map((p, i) => {
        const x = 10 + (maxLo === minLo ? 40 : ((p[1] - minLo) / (maxLo - minLo)) * 80)
        const y = 8 + (maxLa === minLa ? 22 : ((maxLa - p[0]) / (maxLa - minLa)) * 44)
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
      })
      .join(' ')
  }

  return (
    <div style={{ perspective: '1100px' }}>
      <style>{CARD_CSS}</style>
      <div
        className="relative aspect-[4/5] w-full overflow-hidden rounded-3xl border border-edge/80 bg-[#0a0a0a]"
        style={{
          transform: 'rotateX(3deg) rotateY(-2deg)',
          boxShadow: '0 30px 60px -20px rgba(0,0,0,0.9), 0 8px 24px -8px rgba(255,79,48,0.25)',
        }}
      >
        {/* depth base */}
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(120% 80% at 82% 12%, rgba(255,79,48,0.3), transparent 60%)' }}
        />
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(130% 100% at 50% 115%, rgba(0,0,0,0.75), transparent 55%)' }}
        />

        {/* the reaction. BEHIND the route */}
        {reaction.tier === 'fireworks' && <FireworksLayer />}
        {reaction.tier === 'disco' && <DiscoLayer />}
        {reaction.tier === 'shooting-star' && <StarsLayer />}
        {reaction.tier === 'first' && <ConfettiLayer />}
        {reaction.tier === 'steady' && <EmberLayer />}

        {/* the route, in front of the show */}
        {path && (
          <svg viewBox="0 0 100 62" className="absolute inset-x-0 top-[8%] h-[52%] w-full">
            <path d={path} fill="none" stroke="rgba(255,79,48,0.3)" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
            <path d={path} fill="none" stroke="#ff4f30" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}

        {/* one-time shine sweep */}
        <div
          className="pointer-events-none absolute inset-y-0 w-1/3"
          style={{
            background: 'linear-gradient(105deg, transparent, rgba(255,255,255,0.09), transparent)',
            animation: 'rrc-shine 1.6s ease-out 0.4s 1 both',
          }}
        />

        {/* type */}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4">
          <span className="font-display text-[15px] font-bold tracking-tight text-accent">BODYT</span>
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-faint">
            {log.activity === 'bike' ? 'Ride' : 'Run'} · {log.date}
          </span>
        </div>
        <div className="absolute inset-x-0 bottom-0 p-4">
          <div className="text-[9.5px] font-black uppercase tracking-[0.22em] text-gold">{reaction.headline}</div>
          <div className="font-display text-[52px] font-bold leading-none text-white">
            {log.distanceMi.toFixed(2)}
            <span className="ml-1 text-[18px] text-ink-dim">mi</span>
          </div>
          <p className="mt-1 max-w-[34ch] text-[11.5px] font-semibold leading-snug text-ink-dim">{reaction.note}</p>
          <div className="mt-2 flex gap-5 font-mono text-[12px] font-bold text-ink">
            <span>{fmtDuration(log.durationSec)}</span>
            <span>
              {log.activity === 'bike' ? `${avgMph(log.distanceMi, log.durationSec)} mph` : fmtPace(log.avgPaceSec)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
