import assert from "node:assert/strict"
import { describe, test } from "node:test"
import {
  checkOff,
  dayRatePpm,
  evenSplitPpm,
  maxEarnableRatePpm,
  rewardTier,
  rewardValueMicroCents,
  type SetDef,
  type TaskDef,
  type ValueContext,
} from "./rewards.ts"

const rate = (ratePpm: number) => ({ kind: "rate", ratePpm }) as const
const cash = (cents: number) => ({ kind: "cash", cents }) as const

const tasks: TaskDef[] = [
  {
    id: "bed",
    title: "Make bed",
    schedule: "daily",
    reward: rate(200),
    setId: "am",
  },
  {
    id: "teeth",
    title: "Brush teeth",
    schedule: "daily",
    reward: rate(200),
    setId: "am",
  },
  { id: "dog", title: "Feed Biscuit", schedule: "daily", reward: rate(200) },
  { id: "dishes", title: "Clear dishes", schedule: "daily", reward: rate(200) },
  { id: "hw", title: "Homework", schedule: "daily", reward: rate(200) },
  { id: "leaves", title: "Rake leaves", schedule: "once", reward: cash(200) },
  { id: "book", title: "Finish a book", schedule: "once", reward: cash(500) },
]
const sets: SetDef[] = [
  { id: "am", title: "Morning routine", scope: "custom", bonus: cash(25) },
  { id: "all", title: "Perfect day", scope: "allDaily", bonus: cash(50) },
]
const ctx: ValueContext = {
  balanceCents: 4438,
  cadence: "daily",
  date: "2026-09-30",
}
const ALLOWANCE = 500

const check = (taskId: string, done: string[], pending = false) =>
  checkOff({
    taskId,
    doneIds: new Set(done),
    tasks,
    sets,
    ctx,
    weeklyAllowanceCents: ALLOWANCE,
    pending,
  })

describe("rate rewards", () => {
  test("even split lands exactly on the ceiling", () => {
    assert.deepEqual(evenSplitPpm(1000, 2000, 3), [334, 333, 333])
    assert.equal(
      evenSplitPpm(1000, 2000, 7).reduce((a, b) => a + b),
      1000
    )
  })

  test("today's rate is floor + earned, capped", () => {
    const opts = { floorPpm: 1000, ceilingPpm: 2000 }
    assert.equal(dayRatePpm({ ...opts, earnedRatePpm: 600 }), 1600)
    assert.equal(dayRatePpm({ ...opts, earnedRatePpm: 5000 }), 2000)
  })

  test("max earnable counts daily rate tasks and rate bonuses", () => {
    assert.equal(maxEarnableRatePpm(tasks, sets), 1000)
    assert.equal(
      maxEarnableRatePpm(tasks, [
        ...sets,
        { id: "x", title: "x", scope: "custom", bonus: rate(100) },
      ]),
      1100
    )
  })

  test("rate reward value is today's extra interest, boosted", () => {
    // $44.38 × 0.02% = 0.8876¢
    assert.equal(rewardValueMicroCents(rate(200), ctx), 887_600)
    assert.equal(
      rewardValueMicroCents(rate(200), { ...ctx, boostX100: 200 }),
      1_775_200
    )
    // weekly cadence spreads a period rate over 7 days
    assert.equal(
      rewardValueMicroCents(rate(1400), { ...ctx, cadence: "weekly" }),
      887_600
    )
  })
})

describe("tiers", () => {
  test("scale with value vs weekly allowance", () => {
    const c = (cents: number) => cents * 1_000_000
    assert.equal(rewardTier(c(1), ALLOWANCE), 1)
    assert.equal(rewardTier(c(25), ALLOWANCE), 2)
    assert.equal(rewardTier(c(200), ALLOWANCE), 3)
    assert.equal(rewardTier(c(500), ALLOWANCE), 4)
  })

  test("no allowance falls back to $5", () => {
    assert.equal(rewardTier(200 * 1_000_000, 0), 3)
  })
})

describe("checkOff", () => {
  test("a routine task is a sprout", () => {
    const r = check("dog", [])
    assert.equal(r.tier, 1)
    assert.equal(r.events.length, 1)
    assert.deepEqual([r.dailyDone, r.dailyTotal], [1, 5])
  })

  test("finishing a set adds its bonus and is at least a bloom", () => {
    const r = check("teeth", ["bed"])
    assert.deepEqual(
      r.events.map((e) => e.type),
      ["task", "set"]
    )
    assert.equal(r.tier, 2)
  })

  test("the last daily task is a Perfect Day: harvest or bigger", () => {
    const r = check("hw", ["bed", "teeth", "dog", "dishes"])
    const set = r.events.find((e) => e.type === "set")
    assert.equal(set?.type === "set" && set.set.scope, "allDaily")
    assert.ok(r.tier >= 3)
  })

  test("one check can finish a task, a set and the day", () => {
    const r = check("teeth", ["bed", "dog", "dishes", "hw"])
    assert.equal(r.events.length, 3)
    assert.ok(r.tier >= 3)
  })

  test("a big cash task is a jackpot", () => {
    assert.equal(check("book", []).tier, 4)
  })

  test("pending (parent checks) celebrates small until approved", () => {
    assert.equal(check("book", [], true).tier, 2)
    assert.equal(check("book", [], true).pending, true)
  })
})
