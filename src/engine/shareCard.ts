import type { RunLog } from '../types'
import { avgMph, fmtDuration, fmtPace } from './runs'

// ============================================================
// The post-run share card: a 1080×1350 social-ready image drawn
// on canvas — route line, big numbers, brand mark. The in-app
// "finish" popup previews this exact image, so what you see is
// literally what you share.
// ============================================================

const W = 1080
const H = 1350

function tracePath(x: CanvasRenderingContext2D, pts: RunLog['points'], sx: (lo: number) => number, sy: (la: number) => number) {
  x.beginPath()
  pts.forEach((p, i) => (i ? x.lineTo(sx(p[1]), sy(p[0])) : x.moveTo(sx(p[1]), sy(p[0]))))
}

export async function buildShareImage(log: RunLog): Promise<Blob | null> {
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
  const DISPLAY = '"Space Grotesk", system-ui, sans-serif'

  // Ground: pure black with a heat bloom and a whisper of grid
  x.fillStyle = '#0a0a0a'
  x.fillRect(0, 0, W, H)
  const bloom = x.createRadialGradient(W * 0.82, H * 0.16, 0, W * 0.82, H * 0.16, 720)
  bloom.addColorStop(0, 'rgba(255,79,48,0.32)')
  bloom.addColorStop(1, 'rgba(255,79,48,0)')
  x.fillStyle = bloom
  x.fillRect(0, 0, W, H)
  x.strokeStyle = 'rgba(255,255,255,0.045)'
  x.lineWidth = 2
  for (let i = 1; i < 8; i++) {
    x.beginPath()
    x.moveTo((W / 8) * i, 0)
    x.lineTo((W / 8) * i, H)
    x.stroke()
  }
  for (let i = 1; i < 10; i++) {
    x.beginPath()
    x.moveTo(0, (H / 10) * i)
    x.lineTo(W, (H / 10) * i)
    x.stroke()
  }

  // Brand + context
  x.textBaseline = 'top'
  x.fillStyle = '#ff4f30'
  x.font = `700 46px ${DISPLAY}`
  x.fillText('BODYTEA', 72, 70)
  x.fillStyle = 'rgba(255,255,255,0.55)'
  x.font = `600 34px ${DISPLAY}`
  x.fillText(`${log.activity === 'bike' ? 'RIDE' : 'RUN'} · ${log.date}`, 72, 132)

  // The route — the hero of the card
  const pts = log.points
  if (pts.length >= 2) {
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
    x.fillText('no GPS route — indoor grind', 72, 480)
  }

  // The number that matters
  x.fillStyle = '#ffffff'
  x.font = `700 230px ${DISPLAY}`
  x.textBaseline = 'alphabetic'
  x.fillText(log.distanceMi.toFixed(2), 64, H - 360)
  x.fillStyle = 'rgba(255,255,255,0.55)'
  x.font = `700 54px ${DISPLAY}`
  x.fillText('MILES', 72, H - 282)

  // Supporting stats
  const stats: [string, string][] = [
    [fmtDuration(log.durationSec), 'TIME'],
    log.activity === 'bike'
      ? [`${avgMph(log.distanceMi, log.durationSec)}`, 'MPH AVG']
      : [fmtPace(log.avgPaceSec).replace('/mi', ''), 'AVG PACE'],
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

/** Share the card via the native sheet, or download it where share isn't supported. */
export async function shareRunCard(log: RunLog, blob: Blob): Promise<'shared' | 'downloaded'> {
  const file = new File([blob], `bodytea-${log.activity}-${log.date}.png`, { type: 'image/png' })
  const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean }
  if (nav.canShare?.({ files: [file] }) && navigator.share) {
    try {
      await navigator.share({ files: [file], title: `${log.distanceMi.toFixed(2)} mi ${log.activity}` })
      return 'shared'
    } catch {
      /* user cancelled — fall through to download */
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
