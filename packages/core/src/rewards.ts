/**
 * Task rewards and how big the celebration should be. Pure; shared by the
 * server (what to credit) and the kid UI (what to animate).
 *
 * Every task carries a reward the kid sees BEFORE checking it off:
 * - rate: adds `ratePpm` to TODAY's rate (daily tasks only). Today's rate =
 *   floor + rate rewards earned today, capped at the ceiling. Parents can
 *   "split evenly" so that finishing every daily task lands exactly on the
 *   ceiling.
 * - cash: adds `cents` to the balance.
 *
 * Sets bundle tasks ("Morning routine") and pay a bonus when every task in
 * the set is done. The built-in "all daily tasks" set is the Perfect Day.
 *
 * Celebration size scales with what the reward is really worth to this kid:
 * value ÷ weekly allowance picks a tier (sprout → bloom → harvest → jackpot).
 * One check-off can finish a task, a set and the day at once; the UI plays ONE
 * celebration at the highest tier and lists every reward in it.
 */

import { type Cadence, daysInPeriod, PPM } from "./growth.ts"

export type Reward =
  | { kind: "rate"; ratePpm: number }
  | { kind: "cash"; cents: number }
  | { kind: "none" }

export interface TaskDef {
  id: string
  title: string
  schedule: "daily" | "weekly" | "once"
  reward: Reward
  /** Custom set this task belongs to, if any. */
  setId?: string | null
}

export interface SetDef {
  id: string
  title: string
  /** custom = its member tasks; allDaily = every daily task (Perfect Day). */
  scope: "custom" | "allDaily"
  bonus: Reward
}

// -------------------------------------------------------------------- rate

/**
 * Split (ceiling − floor) across `count` daily tasks so they add up exactly.
 * 1000 ppm over 3 tasks → [334, 333, 333].
 */
export function evenSplitPpm(
  floorPpm: number,
  ceilingPpm: number,
  count: number
) {
  if (count <= 0) return []
  const total = Math.max(0, ceilingPpm - floorPpm)
  const base = Math.floor(total / count)
  const extra = total - base * count
  return Array.from({ length: count }, (_, i) => base + (i < extra ? 1 : 0))
}

/** Today's rate from the rate rewards earned so far today. */
export function dayRatePpm(opts: {
  floorPpm: number
  ceilingPpm: number
  earnedRatePpm: number
}) {
  return Math.min(
    opts.ceilingPpm,
    opts.floorPpm + Math.max(0, opts.earnedRatePpm)
  )
}

/**
 * The most rate a kid can earn in a day (every rate task + every rate set
 * bonus). Parents can't save settings where this exceeds ceiling − floor, so
 * a reward the kid is shown is never silently capped away.
 */
export function maxEarnableRatePpm(tasks: TaskDef[], sets: SetDef[]) {
  const sum = (rs: Reward[]) =>
    rs.reduce((s, r) => s + (r.kind === "rate" ? r.ratePpm : 0), 0)
  return (
    sum(tasks.filter((t) => t.schedule === "daily").map((t) => t.reward)) +
    sum(sets.map((s) => s.bonus))
  )
}

// ------------------------------------------------------------------- value

export interface ValueContext {
  balanceCents: number
  cadence: Cadence
  /** ISO date the reward applies to (matters for monthly cadence). */
  date: string
  /** Active boost multiplier ×100; rate rewards get boosted too. */
  boostX100?: number
}

/** What a reward is worth today, in micro-cents. */
export function rewardValueMicroCents(reward: Reward, ctx: ValueContext) {
  if (reward.kind === "cash") return reward.cents * PPM
  if (reward.kind === "rate")
    return (
      (ctx.balanceCents * reward.ratePpm * ((ctx.boostX100 ?? 100) / 100)) /
      daysInPeriod(ctx.date, ctx.cadence)
    )
  return 0
}

// -------------------------------------------------------------------- tier

export type Tier = 1 | 2 | 3 | 4
export const tierNames = {
  1: "sprout",
  2: "bloom",
  3: "harvest",
  4: "jackpot",
} as const satisfies Record<Tier, string>

/** When there's no allowance, size rewards against $5 a week. */
export const FALLBACK_ALLOWANCE_CENTS = 500

/**
 * Size a celebration by value relative to the kid's weekly allowance:
 *   < 5%   sprout   (a leaf floats up)
 *   < 25%  bloom    (coins burst from the task)
 *   < 100% harvest  (card celebration, plant grows)
 *   ≥ 100% jackpot  (full-screen)
 * `minTier` lets sets (bloom) and Perfect Day (harvest) feel like the
 * achievements they are even when the payout is small.
 */
export function rewardTier(
  valueMicroCents: number,
  weeklyAllowanceCents: number,
  minTier: Tier = 1
): Tier {
  const scale =
    weeklyAllowanceCents > 0 ? weeklyAllowanceCents : FALLBACK_ALLOWANCE_CENTS
  const ratio = valueMicroCents / PPM / scale
  const tier: Tier = ratio < 0.05 ? 1 : ratio < 0.25 ? 2 : ratio < 1 ? 3 : 4
  return Math.max(tier, minTier) as Tier
}

// --------------------------------------------------------------- check-off

export type RewardEvent =
  | { type: "task"; task: TaskDef; reward: Reward; valueMicroCents: number }
  | { type: "set"; set: SetDef; reward: Reward; valueMicroCents: number }

export interface CheckOffResult {
  events: RewardEvent[]
  /** One celebration for everything this check-off unlocked. */
  tier: Tier
  /** Waiting on a parent: show a smaller "seed planted" version. */
  pending: boolean
  /** Daily tasks done after this check-off, for the progress ring. */
  dailyDone: number
  dailyTotal: number
}

/**
 * What happens when a kid checks off `taskId` given what's already done
 * today. `pending` tasks (parent checks) celebrate at most at bloom until
 * approved, then play their full tier.
 */
export function checkOff(opts: {
  taskId: string
  doneIds: ReadonlySet<string>
  tasks: TaskDef[]
  sets: SetDef[]
  ctx: ValueContext
  weeklyAllowanceCents: number
  pending?: boolean
}): CheckOffResult {
  const { tasks, sets, ctx } = opts
  const task = tasks.find((t) => t.id === opts.taskId)
  if (!task) throw new Error(`Unknown task ${opts.taskId}`)

  const before = new Set(opts.doneIds)
  const after = new Set(before).add(task.id)
  const daily = tasks.filter((t) => t.schedule === "daily")
  const members = (set: SetDef) =>
    set.scope === "allDaily" ? daily : tasks.filter((t) => t.setId === set.id)
  const complete = (set: SetDef, done: Set<string>) => {
    const m = members(set)
    return m.length > 0 && m.every((t) => done.has(t.id))
  }

  const value = (r: Reward) => rewardValueMicroCents(r, ctx)
  const events: RewardEvent[] = [
    {
      type: "task",
      task,
      reward: task.reward,
      valueMicroCents: value(task.reward),
    },
  ]
  let minTier: Tier = 1
  for (const set of sets) {
    if (!complete(set, before) && complete(set, after)) {
      events.push({
        type: "set",
        set,
        reward: set.bonus,
        valueMicroCents: value(set.bonus),
      })
      minTier = Math.max(minTier, set.scope === "allDaily" ? 3 : 2) as Tier
    }
  }

  const total = events.reduce((s, e) => s + e.valueMicroCents, 0)
  let tier = rewardTier(total, opts.weeklyAllowanceCents, minTier)
  if (opts.pending) tier = Math.min(tier, 2) as Tier

  return {
    events,
    tier,
    pending: !!opts.pending,
    dailyDone: daily.filter((t) => after.has(t.id)).length,
    dailyTotal: daily.length,
  }
}
