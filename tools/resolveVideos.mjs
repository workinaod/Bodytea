#!/usr/bin/env node
// ============================================================
// Instructional-video resolver: for every exercise in the
// catalog without a hand-verified videoId, search YouTube for a
// short how-to and pick the best scoring result. Emits
// src/plan/videoMap.ts (exerciseId → videoId).
//
// Run:  node tools/resolveVideos.mjs
// Re-run whenever exercises are added. Hand-verified videoId
// fields on ExerciseDef always win over this map.
// ============================================================
import { readFileSync, writeFileSync } from 'node:fs'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

// Node's fetch ignores HTTPS_PROXY; curl honors it (and the CA bundle),
// so all traffic goes through the environment's agent proxy.
const run = promisify(execFile)
async function fetchText(url) {
  const { stdout } = await run('curl', ['-s', '--max-time', '20', '-H', 'accept-language: en-US,en', url], {
    maxBuffer: 32 * 1024 * 1024,
  })
  return stdout
}

const FILES = ['src/plan/exercises.ts', 'src/plan/athleticExercises.ts']

// Pull id / name / videoId per definition. Fields are NOT ordered: a
// videoId usually sits at the end of a def, past long steps/mistakes
// arrays, so each block runs from one top-level id to the next.
//
// The two catalogs nest differently: exercises.ts indents a def's id by
// six spaces, athleticExercises.ts by four. Matching only one of them
// silently skips half the library, which is how a re-run can quietly
// delete seventy videos.
function extractDefs(src) {
  const heads = [...src.matchAll(/^ {4}(?: {2})?id: '([^']+)',$/gm)]
  return heads.map((h, i) => {
    const block = src.slice(h.index, i + 1 < heads.length ? heads[i + 1].index : src.length)
    return {
      id: h[1],
      name: block.match(/name: '([^']+)'/)?.[1] ?? h[1],
      videoId: block.match(/videoId: '([^']+)'/)?.[1],
    }
  })
}

const expand = (name) =>
  name
    .replace(/\bDB\b/g, 'dumbbell')
    .replace(/\bOHP\b/g, 'overhead press')
    .replace(/\bRDL\b/g, 'Romanian deadlift')
    .replace(/\(.*?\)/g, '')
    .trim()

function parseDuration(t) {
  if (!t) return null
  const parts = t.split(':').map(Number)
  if (parts.some(Number.isNaN)) return null
  return parts.reduce((s, p) => s * 60 + p, 0)
}

// Length policy: 2 minutes or less is the target, 3 minutes is the
// last resort, anything longer is disqualified outright. Nobody watches
// a 10-minute lecture mid-set.
const IDEAL_MAX = 120
const HARD_MAX = 180
const MIN_USEFUL = 20

function lengthScore(sec) {
  if (sec === null) return null // unknown length: cannot be trusted, skip
  if (sec > HARD_MAX || sec < MIN_USEFUL) return null // disqualified
  if (sec <= 60) return 10
  if (sec <= IDEAL_MAX) return 8
  return 3 // 2-3 min: acceptable, never preferred
}

function score(video, tokens) {
  const title = video.title.toLowerCase()
  const ls = lengthScore(video.sec)
  if (ls === null) return -1 // length gate comes first, always
  let s = ls
  const hits = tokens.filter((t) => title.includes(t)).length
  if (hits === 0) return -1 // must mention the movement at all
  s += hits * 3
  if (/how to|form|technique|tutorial|guide|properly|explained/.test(title)) s += 3
  if (/podcast|episode|full workout|day in the life|vlog/.test(title)) s -= 6
  return s
}

async function searchYouTube(query) {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
  const html = await fetchText(url)
  if (!html) return []
  const m = html.match(/var ytInitialData = (\{.+?\});<\/script>/s)
  if (!m) return []
  let data
  try {
    data = JSON.parse(m[1])
  } catch {
    return []
  }
  const out = []
  const walk = (node) => {
    if (!node || typeof node !== 'object' || out.length > 30) return
    if (node.videoRenderer?.videoId) {
      const v = node.videoRenderer
      out.push({
        id: v.videoId,
        title: v.title?.runs?.[0]?.text ?? '',
        sec: parseDuration(v.lengthText?.simpleText),
      })
      return
    }
    for (const k of Object.keys(node)) walk(node[k])
  }
  walk(data)
  return out
}

/** Length of an existing video id, via the watch page. */
async function durationOf(id) {
  try {
    const html = await fetchText(`https://www.youtube.com/watch?v=${id}`)
    const m = html.match(/"lengthSeconds":"(\d+)"/)
    return m ? Number(m[1]) : null
  } catch {
    return null
  }
}

const defs = FILES.flatMap((f) => extractDefs(readFileSync(f, 'utf8')))
console.log(`catalog: ${defs.length} exercises, ${defs.filter((d) => d.videoId).length} hand-verified`)

const map = {}
const durations = {}
// One clip may only belong to one exercise. Two lifts showing the same
// video is the same lie as two lifts showing the same photo: at most one
// of them is what the viewer is actually watching. When a clip is already
// spoken for, the next exercise takes its next-best candidate instead.
const claimed = new Map() // videoId → the exercise that got there first
let miss = 0
let bumped = 0
for (const def of defs) {
  // Hand-verified clips still have to obey the length policy: keep the
  // ones that fit, re-resolve the ones that run long.
  if (def.videoId) {
    const owner = claimed.get(def.videoId)
    if (owner) {
      console.log(`~ ${def.id}: hand-verified ${def.videoId} already used by ${owner}, re-resolving`)
    } else {
      const sec = await durationOf(def.videoId)
      if (sec !== null && sec >= MIN_USEFUL && sec <= HARD_MAX) {
        durations[def.id] = sec
        claimed.set(def.videoId, def.id)
        console.log(`= ${def.id}: keeping hand-verified ${def.videoId} (${sec}s)`)
        continue
      }
      console.log(`~ ${def.id}: hand-verified ${def.videoId} is ${sec ?? '?'}s, too long, re-resolving`)
    }
  }
  const clean = expand(def.name)
  const tokens = clean.toLowerCase().split(/[^a-z]+/).filter((t) => t.length > 2)
  try {
    const vids = await searchYouTube(`${clean} exercise how to proper form`)
    const ranked = vids
      .map((v) => ({ ...v, s: score(v, tokens) }))
      .filter((v) => v.s >= 6)
      .sort((a, b) => b.s - a.s)
    const best = ranked.find((v) => !claimed.has(v.id))
    if (best) {
      if (ranked[0] && ranked[0].id !== best.id) bumped++
      map[def.id] = best.id
      durations[def.id] = best.sec
      claimed.set(best.id, def.id)
      console.log(`✓ ${def.id} → ${best.id}  (${best.sec}s) ${best.title.slice(0, 60)}`)
    } else {
      miss++
      // Better no video than the wrong one: the figure and photos still explain it.
      const why = ranked.length ? 'every candidate already taken' : 'no confident match'
      console.log(`· ${def.id}: ${why}, leaving without video`)
    }
  } catch (e) {
    miss++
    console.log(`! ${def.id}: ${e.message}`)
  }
  await new Promise((r) => setTimeout(r, 350))
}

const body = Object.entries(map)
  .map(([k, v]) => `  '${k}': '${v}',${durations[k] ? ` // ${durations[k]}s` : ''}`)
  .join('\n')
writeFileSync(
  'src/plan/videoMap.ts',
  `// ============================================================
// GENERATED by tools/resolveVideos.mjs. Do not hand-edit.
// Short instructional clips, 3 minutes max and 2 minutes or less
// wherever possible. Every id appears at most once: a clip can only
// honestly show one movement. This map WINS over a def's videoId:
// entries here were length-checked, hand-verified ids may not be.
// ============================================================

export const VIDEO_MAP: Record<string, string> = {
${body}
}
`,
)
console.log(
  `\nwrote src/plan/videoMap.ts: ${Object.keys(map).length} resolved, ${miss} without, ` +
    `${bumped} moved off an already-claimed clip`,
)
