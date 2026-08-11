import { describe, expect, it } from 'vitest'
import { briefingFor, cadencePlan, tempoFor } from './cadence'
import { getExercise } from '../plan/exercises'
import type { ResolvedExercise } from '../types'

function res(exerciseId: string, over: Partial<ResolvedExercise> = {}): ResolvedExercise {
  const def = getExercise(exerciseId)
  return {
    exerciseId,
    name: def.name,
    kind: def.kind,
    restSec: def.restSec,
    sets: 3,
    repText: '8',
    repsNum: 8,
    ...over,
  }
}

describe('tempoFor', () => {
  it('classifies holds, timed work, explosive, slow lifts, and standard lifts', () => {
    expect(tempoFor(getExercise('front-squat'), res('front-squat'))).toBe('standard')
    expect(tempoFor(getExercise('romanian-deadlift'), res('romanian-deadlift'))).toBe('controlled')
    expect(tempoFor(getExercise('countermovement-jump'), res('countermovement-jump', { repsNum: 3, repText: '3' }))).toBe('explosive')
    expect(tempoFor(getExercise('front-squat'), res('front-squat', { repText: '30 sec hold', repsNum: undefined }))).toBe('hold')
    expect(tempoFor(getExercise('front-squat'), res('front-squat', { repText: '2 min', repsNum: undefined }))).toBe('timed')
    expect(tempoFor(getExercise('dynamic-warmup'), res('dynamic-warmup', { repsNum: undefined, repText: '6-8 min' }))).toBe('timed')
  })
})

describe('cadencePlan', () => {
  it('standard reps count on a ~2.8s rhythm and close the set', () => {
    const plan = cadencePlan(res('front-squat', { repsNum: 5 }), getExercise('front-squat'))
    expect(plan).toHaveLength(6)
    expect(plan[1].atMs - plan[0].atMs).toBe(2800)
    expect(plan[4].say).toBe('5')
    expect(plan[5].say).toMatch(/set done/i)
  })

  it('controlled lifts count slower with a tempo cue early', () => {
    const plan = cadencePlan(res('romanian-deadlift', { repsNum: 4 }), getExercise('romanian-deadlift'))
    expect(plan[1].atMs - plan[0].atMs).toBe(4500)
    expect(plan[0].say).toMatch(/down slow/)
  })

  it('holds count seconds with halfway + last-five milestones', () => {
    const plan = cadencePlan(res('front-squat', { repText: '30 sec', repsNum: undefined }), getExercise('front-squat'))
    expect(plan.some((e) => /halfway/i.test(e.say))).toBe(true)
    expect(plan.some((e) => /last five/i.test(e.say))).toBe(true)
    expect(plan[plan.length - 1].atMs).toBe(30_000)
  })

  it('explosive sets cue intent and never count reps', () => {
    const plan = cadencePlan(res('countermovement-jump', { repsNum: 3, repText: '3' }), getExercise('countermovement-jump'))
    expect(plan).toHaveLength(1)
    expect(plan[0].say).toMatch(/max intent/i)
  })
})

describe('briefingFor', () => {
  it('new exercise reads setup steps; familiar gets the benefit line', () => {
    const def = getExercise('front-squat')
    expect(briefingFor(def, 0)).toContain(def.steps[0])
    expect(briefingFor(def, 3, 'It builds your legs.')).toContain('It builds your legs.')
    expect(briefingFor(def, 5)).toContain(def.why.slice(0, 20))
  })
})
