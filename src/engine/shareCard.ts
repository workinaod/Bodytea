import type { RunLog } from '../types'
import type { Reaction } from './reactions'
import { avgMph, fmtDuration, fmtPace } from './runs'

// ============================================================
// The post-run share card: a 1080×1350 social-ready image drawn
// on canvas, route line, big numbers, brand mark. The in-app
// "finish" popup previews this exact image, so what you see is
// literally what you share.
// ============================================================

const W = 1080
const H = 1350

function tracePath(x: CanvasRenderingContext2D, pts: RunLog['points'], sx: (lo: number) => number, sy: (la: number) => number) {
  x.beginPath()
  pts.forEach((p, i) => (i ? x.lineTo(sx(p[1]), sy(p[0])) : x.moveTo(sx(p[1]), sy(p[0]))))
}

/** The tier's celebration, frozen mid-moment behind the route. */
function drawFrozenReaction(x: CanvasRenderingContext2D, tier: Reaction['tier']): void {
  x.save()
  if (tier === 'fireworks') {
    for (const [cx, cy, hue] of [[300, 420, '#ff4f30'], [760, 330, '#f2c14e'], [600, 560, '#c6f24e']] as const) {
      x.strokeStyle = hue
      x.lineWidth = 5
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2
        x.beginPath()
        x.moveTo(cx + Math.cos(a) * 26, cy + Math.sin(a) * 26)
        x.lineTo(cx + Math.cos(a) * 86, cy + Math.sin(a) * 86)
        x.stroke()
      }
    }
  } else if (tier === 'disco') {
    x.fillStyle = 'rgba(230,230,245,0.85)'
    x.beginPath()
    x.arc(540, 380, 90, 0, Math.PI * 2)
    x.fill()
    x.strokeStyle = 'rgba(255,255,255,0.5)'
    x.lineWidth = 4
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2
      x.beginPath()
      x.moveTo(540 + Math.cos(a) * 100, 380 + Math.sin(a) * 100)
      x.lineTo(540 + Math.cos(a) * 190, 380 + Math.sin(a) * 190)
      x.stroke()
    }
  } else if (tier === 'shooting-star') {
    for (const [sx, sy] of [[140, 240], [420, 180], [700, 300]] as const) {
      const g = x.createLinearGradient(sx, sy, sx + 260, sy + 90)
      g.addColorStop(0, 'rgba(255,255,255,0)')
      g.addColorStop(1, '#f2c14e')
      x.strokeStyle = g
      x.lineWidth = 8
      x.beginPath()
      x.moveTo(sx, sy)
      x.lineTo(sx + 260, sy + 90)
      x.stroke()
    }
  } else if (tier === 'first') {
    const hues = ['#ff4f30', '#c6f24e', '#6fb2e8', '#f2c14e', '#ffffff']
    for (let i = 0; i < 22; i++) {
      x.fillStyle = hues[i % hues.length]
      x.save()
      x.translate(((i * 173) % 1000) + 40, ((i * 259) % 700) + 160)
      x.rotate((i * 47) % 360)
      x.fillRect(-7, -10, 14, 20)
      x.restore()
    }
  } else {
    const g = x.createRadialGradient(540, 480, 0, 540, 480, 320)
    g.addColorStop(0, 'rgba(255,79,48,0.4)')
    g.addColorStop(1, 'rgba(255,79,48,0)')
    x.fillStyle = g
    x.fillRect(0, 100, W, 800)
  }
  x.restore()
}

export async function buildShareImage(log: RunLog, reaction?: Reaction): Promise<Blob | null> {
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const x = c.getContext('2d')
  if (!x) return null
  try {
    await document.fonts?.ready
  } catch {
    /* draw with fallback fonts */
  }
  const DISPLAY = '"Inter Tight", system-ui, sans-serif'

  // Ground: pure black with a heat bloom and a whisper of grid
  x.fillStyle = '#0a0a0a'
  x.fillRect(0, 0, W, H)
  const bloom = x.createRadialGradient(W * 0.82, H * 0.16, 0, W * 0.82, H * 0.16, 720)
  bloom.addColorStop(0, 'rgba(255,79,48,0.32)')
  bloom.addColorStop(1, 'rgba(255,79,48,0)')
  x.fillStyle = bloom
  x.fillRect(0, 0, W, H)
  // Brand + context
  x.textBaseline = 'top'
  x.fillStyle = '#ff4f30'
  x.font = `700 46px ${DISPLAY}`
  x.fillText('BODYT', 72, 70)
  x.fillStyle = 'rgba(255,255,255,0.55)'
  x.font = `600 34px ${DISPLAY}`
  x.fillText(`${log.activity === 'bike' ? 'RIDE' : 'RUN'} · ${log.date}`, 72, 132)

  // The celebration sits BEHIND the route
  if (reaction) drawFrozenReaction(x, reaction.tier)

  // A run that covered no ground has no route. Two GPS points a few
  // metres apart used to be stretched across the whole card as a bold
  // diagonal, which is a picture of a journey that did not happen.
  const hasDistance = log.distanceMi >= 0.05
  const pts = log.points
  const spread =
    pts.length >= 2
      ? Math.max(
          Math.max(...pts.map((p) => p[0])) - Math.min(...pts.map((p) => p[0])),
          Math.max(...pts.map((p) => p[1])) - Math.min(...pts.map((p) => p[1])),
        )
      : 0
  // ~0.0004 degrees is roughly 45 m, below which it is GPS jitter.
  if (pts.length >= 2 && hasDistance && spread > 0.0004) {
    const lats = pts.map((p) => p[0])
    const lngs = pts.map((p) => p[1])
    const minLa = Math.min(...lats)
    const maxLa = Math.max(...lats)
    const minLo = Math.min(...lngs)
    const maxLo = Math.max(...lngs)
    const pad = 150
    const bw = W - 2 * pad
    const top = 260
    const bh = 540
    const sx = (lo: number) => pad + (maxLo === minLo ? 0.5 * bw : ((lo - minLo) / (maxLo - minLo)) * bw)
    const sy = (la: number) => top + (maxLa === minLa ? 0.5 * bh : ((maxLa - la) / (maxLa - minLa)) * bh)
    x.lineJoin = 'round'
    x.lineCap = 'round'
    tracePath(x, pts, sx, sy)
    x.strokeStyle = 'rgba(255,79,48,0.22)'
    x.lineWidth = 30
    x.stroke()
    tracePath(x, pts, sx, sy)
    x.strokeStyle = '#ff4f30'
    x.lineWidth = 10
    x.stroke()
    // start / finish markers
    x.fillStyle = '#c6f24e'
    x.beginPath()
    x.arc(sx(pts[0][1]), sy(pts[0][0]), 16, 0, Math.PI * 2)
    x.fill()
    x.fillStyle = '#ffffff'
    x.beginPath()
    x.arc(sx(pts[pts.length - 1][1]), sy(pts[pts.length - 1][0]), 16, 0, Math.PI * 2)
    x.fill()
  } else {
    x.fillStyle = 'rgba(255,255,255,0.25)'
    x.font = `600 40px ${DISPLAY}`
    x.fillText(hasDistance ? 'no GPS route logged' : 'no route · indoor grind', 72, 480)
  }

  // Headline + note carry the reaction's voice
  x.textBaseline = 'alphabetic'
  if (reaction) {
    x.fillStyle = '#f2c14e'
    x.font = `700 34px ${DISPLAY}`
    x.fillText(reaction.headline, 72, H - 560)
    x.fillStyle = 'rgba(255,255,255,0.75)'
    x.font = `600 33px ${DISPLAY}`
    x.fillText(reaction.note.slice(0, 62), 72, H - 512)
  }

  // The number that matters, which is not always the distance. On a
  // treadmill or an indoor session the distance is 0.00 and leading
  // with it makes an honest hour of work look like nothing happened.
  // Time is the thing that was actually earned, so time leads.
  x.fillStyle = '#ffffff'
  x.font = `700 ${hasDistance ? 230 : 180}px ${DISPLAY}`
  x.fillText(hasDistance ? log.distanceMi.toFixed(2) : fmtDuration(log.durationSec), 64, H - 360)
  x.fillStyle = 'rgba(255,255,255,0.55)'
  x.font = `700 54px ${DISPLAY}`
  x.fillText(hasDistance ? 'MILES' : 'MOVING', 72, H - 282)

  // Supporting stats
  const stats: [string, string][] = hasDistance
    ? [
        [fmtDuration(log.durationSec), 'TIME'],
        log.activity === 'bike'
          ? [`${avgMph(log.distanceMi, log.durationSec)}`, 'MPH AVG']
          : [fmtPace(log.avgPaceSec).replace('/mi', ''), 'AVG PACE'],
      ]
    : [
        [`${log.kcalEst ?? 0}`, 'CALORIES'],
        log.steps ? [`${log.steps.toLocaleString()}`, 'STEPS'] : ['INDOOR', 'NO GPS'],
      ]
  stats.forEach(([v, label], i) => {
    const px = 72 + i * 420
    x.fillStyle = '#ffffff'
    x.font = `700 84px ${DISPLAY}`
    x.fillText(v, px, H - 130)
    x.fillStyle = 'rgba(255,255,255,0.5)'
    x.font = `700 34px ${DISPLAY}`
    x.fillText(label, px + 4, H - 78)
  })

  return await new Promise<Blob | null>((res) => c.toBlob((b) => res(b), 'image/png'))
}

/**
 * Share via the native sheet. Cancelling the sheet does NOTHING (no
 * surprise file popups); download is only the fallback when the share
 * sheet genuinely isn't available or errored.
 */
export async function shareRunCard(log: RunLog, blob: Blob): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([blob], `bodyt-${log.activity}-${log.date}.png`, { type: 'image/png' })
  const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean }
  if (nav.canShare?.({ files: [file] }) && navigator.share) {
    try {
      await navigator.share({
        files: [file],
        title:
          log.distanceMi >= 0.05
            ? `${log.distanceMi.toFixed(2)} mi ${log.activity}`
            : `${fmtDuration(log.durationSec)} ${log.activity}`,
      })
      return 'shared'
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortError') return 'cancelled'
      /* real failure, fall through to download */
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
  return 'downloaded'
}
