import { useEffect, useMemo, useRef, useState } from 'react'
import type { RunLog } from '../types'
import { RouteMap } from './RouteMap'
import { fmtDuration, fmtPace } from '../engine/runs'
import { elevationStats } from '../engine/elevation'

// ============================================================
// The finished session, played back.
//
// A static route answers "where". Watching the line draw itself
// answers "how it went" — where the pace held, where the climb
// started, how long the flat middle really was. The telemetry
// strip underneath is the session's headline numbers over the
// ground they happened on, which is the thing worth sending to
// someone.
//
// Deliberately NOT a 3D flyover. That look needs photorealistic
// tiles from a billed API key shipped inside a public static
// bundle. This gets the same information across with satellite
// imagery that costs nothing and works everywhere.
// ============================================================

/** Seconds of session per second of playback. A 40-minute run replays in ~12s. */
const SPEED = 200

export function RunReplay({ log, height = 260 }: { log: RunLog; height?: number }) {
  const points = log.points
  const [cursor, setCursor] = useState(points.length)
  const [playing, setPlaying] = useState(false)
  const raf = useRef<number | null>(null)

  const elev = useMemo(() => elevationStats(points), [points])

  // Elapsed seconds at the cursor, straight off the track rather than
  // interpolated: the point carries its own timestamp.
  const atSec = points.length > 0 ? points[Math.min(points.length, cursor) - 1]?.[2] ?? 0 : 0

  useEffect(() => {
    if (!playing) return
    let last = performance.now()
    const step = (now: number) => {
      const dt = (now - last) / 1000
      last = now
      setCursor((c) => {
        // Advance by wall-clock so the replay runs at a steady rate
        // regardless of how densely the phone happened to sample.
        const targetSec = (points[Math.min(points.length, c) - 1]?.[2] ?? 0) + dt * SPEED
        let next = c
        while (next < points.length && points[next][2] <= targetSec) next++
        if (next >= points.length) {
          setPlaying(false)
          return points.length
        }
        return next
      })
      raf.current = requestAnimationFrame(step)
    }
    raf.current = requestAnimationFrame(step)
    return () => {
      if (raf.current !== null) cancelAnimationFrame(raf.current)
    }
  }, [playing, points])

  function toggle() {
    if (playing) {
      setPlaying(false)
      return
    }
    // Replaying from the end would show one frozen frame. Rewind first.
    if (cursor >= points.length) setCursor(1)
    setPlaying(true)
  }

  const label =
    log.activity === 'run' ? 'Run' : log.activity === 'bike' ? 'Ride' : log.activity === 'hike' ? 'Hike' : 'Walk'
  const when = new Date(log.startedAt)
  const stamp = Number.isNaN(when.getTime())
    ? ''
    : when.toLocaleString(undefined, { weekday: 'long', hour: 'numeric', minute: '2-digit' })

  return (
    <div className="relative overflow-hidden rounded-2xl ring-1 ring-white/[0.07]">
      <RouteMap points={points} height={height} graded upTo={cursor} />

      {/* Top strip: what this was and when. Sits over the imagery with
          its own gradient so it stays readable over bright ground. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/75 to-transparent px-3 pb-6 pt-2.5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[13px] font-black tracking-tight text-white">{label}</div>
            {stamp && <div className="text-[10px] font-semibold text-white/65">{stamp}</div>}
          </div>
          {log.feltIntensity && (
            <div className="rounded-full bg-black/45 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.18em] text-lime ring-1 ring-white/15">
              {log.feltIntensity}
            </div>
          )}
        </div>
      </div>

      {/* Bottom strip: the numbers, over the ground they were earned on.
          Climb takes the slot a heart-rate readout would occupy on a
          watch-fed app — it is the stat this one can actually measure. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-3 pb-6 pt-8">
        <div className="flex items-end justify-between gap-2">
          <Stat label="Distance" value={`${log.distanceMi.toFixed(2)} mi`} />
          <Stat
            label="Climb"
            value={elev.samples > 1 ? `${(log.elevGainFt ?? elev.gainFt).toLocaleString()} ft` : '—'}
          />
          <Stat
            label="Pace"
            value={log.avgPaceSec > 0 ? fmtPace(log.avgPaceSec).replace('/mi', '') : '—'}
          />
          <Stat label="Time" value={fmtDuration(playing || cursor < points.length ? atSec : log.durationSec)} />
        </div>
      </div>

      {/* Controls last, so they sit above both gradients and stay tappable. */}
      <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 px-3 pb-2">
        <button
          onClick={toggle}
          aria-label={playing ? 'Pause replay' : 'Play replay'}
          className="press flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/90 text-[11px] font-black text-black"
        >
          {playing ? '❚❚' : '▶'}
        </button>
        <input
          type="range"
          aria-label="Replay position"
          min={1}
          max={Math.max(1, points.length)}
          value={Math.min(cursor, Math.max(1, points.length))}
          onChange={(e) => {
            setPlaying(false)
            setCursor(Number(e.target.value))
          }}
          className="h-1 w-full appearance-none rounded-full bg-white/25 accent-lime"
        />
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[8.5px] font-bold uppercase tracking-[0.16em] text-white/55">{label}</div>
      <div className="num truncate text-[17px] font-bold leading-tight text-white">{value}</div>
    </div>
  )
}
