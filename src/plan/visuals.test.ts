import { describe, expect, it } from 'vitest'
import { DEMO_PHOTOS } from './demoPhotos'
import { VIDEO_MAP } from './videoMap'
import { EXERCISE_DEMOS } from './demos'
import { EXERCISES } from './exercises'
import { videoFor } from './videos'

// ============================================================
// Visual honesty.
//
// A photo or a clip attached to an exercise is a claim: "this is
// what that movement looks like". The same asset on two exercises
// means at most one of those claims is true, and the user has no
// way to tell which. That is worse than showing nothing, because
// the figure and the written steps are still right.
//
// This caught a real one: four different sprints all showed
// Wind_Sprints-0/1.webp, which is a man hanging from a pull-up
// bar doing knee raises.
// ============================================================

describe('exercise photos', () => {
  it('no photo sequence is used by two exercises', () => {
    const owners = new Map<string, string>()
    const shared: string[] = []
    for (const [id, seq] of Object.entries(DEMO_PHOTOS)) {
      const key = seq.frames.map((f) => f.file).join('|')
      const first = owners.get(key)
      if (first) shared.push(`${id} reuses ${first}'s photos (${key})`)
      else owners.set(key, id)
    }
    expect(shared).toEqual([])
  })

  it('every frame has a caption describing that frame', () => {
    const empty = Object.entries(DEMO_PHOTOS).flatMap(([id, seq]) =>
      seq.frames.filter((f) => !f.caption.trim()).map((f) => `${id}: ${f.file}`),
    )
    expect(empty).toEqual([])
  })
})

describe('exercise videos', () => {
  it('no clip is used by two exercises', () => {
    // The map wins over a def's own videoId, so uniqueness has to hold on
    // what `videoFor` actually returns, not on the map alone.
    const owners = new Map<string, string>()
    const shared: string[] = []
    for (const def of Object.values(EXERCISES)) {
      const vid = videoFor(def)
      if (!vid) continue
      const first = owners.get(vid)
      if (first) shared.push(`${def.id} shows the same clip as ${first} (${vid})`)
      else owners.set(vid, def.id)
    }
    expect(shared).toEqual([])
  })

  it('the generated map only references exercises that exist', () => {
    const known = new Set(Object.keys(EXERCISES))
    const orphans = Object.keys(VIDEO_MAP).filter((id) => !known.has(id))
    expect(orphans).toEqual([])
  })
})

describe('exercise figures', () => {
  it('every exercise can still show something when it has no video', () => {
    // Dropping a wrong photo or a duplicated clip is only safe because the
    // hand-authored figure is always there to fall back on.
    const naked = Object.keys(EXERCISES).filter((id) => !EXERCISE_DEMOS[id])
    expect(naked).toEqual([])
  })
})
