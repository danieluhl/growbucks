import { z } from "zod"
import { cadences } from "./growth.ts"

/** Whole cents. $1,000 cap per entry keeps typos from wrecking a garden. */
export const centsSchema = z.number().int().min(0).max(100_000)

/** Rate per compounding period in ppm: 0 to 20% per period. */
export const ratePpmSchema = z.number().int().min(0).max(200_000)

/** Boost multiplier ×100: 1.1× to 5×. */
export const boostX100Schema = z.number().int().min(110).max(500)

export const nameSchema = z.string().trim().min(1).max(40)

/** Everything a parent controls about how a kid's money grows. */
export const accountRulesSchema = z
  .object({
    cadence: z.enum(cadences),
    minRatePpm: ratePpmSchema,
    maxRatePpm: ratePpmSchema,
    boostX100: boostX100Schema,
    weeklyAllowanceCents: centsSchema,
    payday: z.number().int().min(0).max(6),
  })
  .refine((v) => v.minRatePpm <= v.maxRatePpm, {
    message: "The floor can't be higher than the ceiling",
    path: ["minRatePpm"],
  })

export const updateAccountRulesSchema = z.object({
  accountId: z.uuid(),
  rules: accountRulesSchema,
})

/** Parent hits Boost: the account's multiplier applies for 7 days. */
export const startBoostSchema = z.object({
  accountId: z.uuid(),
  reason: z.string().trim().max(80).optional(),
})

/** Parents record money in/out by hand. Interest is posted by the system. */
export const recordTransactionSchema = z.object({
  accountId: z.uuid(),
  kind: z.enum(["allowance", "bonus", "spend", "adjustment"]),
  amountCents: centsSchema.positive(),
  memo: z.string().trim().max(120).optional(),
  occurredAt: z.coerce.date().optional(),
})

/** A reward as shown to the kid before they check the task off. */
export const rewardSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("rate"), ratePpm: ratePpmSchema.positive() }),
  z.object({ kind: z.literal("cash"), cents: centsSchema.positive() }),
  z.object({ kind: z.literal("none") }),
])

export const taskSchema = z
  .object({
    title: z.string().trim().min(1).max(60),
    emoji: z.string().max(16).optional(),
    schedule: z.enum(["daily", "weekly", "once"]),
    reward: rewardSchema,
    setId: z.uuid().nullable().optional(),
    checkMode: z.enum(["trust", "parent"]),
  })
  .refine((t) => t.reward.kind !== "rate" || t.schedule === "daily", {
    message: "Rate rewards raise today's rate, so they only fit daily tasks",
    path: ["reward"],
  })

export const taskSetSchema = z.object({
  title: z.string().trim().min(1).max(40),
  scope: z.enum(["custom", "allDaily"]),
  bonus: rewardSchema,
})

/** Kid checks a task off (or unchecks it the same day). */
export const checkTaskSchema = z.object({
  taskId: z.uuid(),
  done: z.boolean(),
})

/** Parent approves or rejects a "parent checks" completion. */
export const reviewCompletionSchema = z.object({
  completionId: z.uuid(),
  approve: z.boolean(),
})

export const proposalPayloadSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("task"), task: taskSchema }),
  z.object({
    kind: z.literal("reward"),
    taskId: z.uuid(),
    reward: rewardSchema,
  }),
  z.object({
    kind: z.literal("rate"),
    minRatePpm: ratePpmSchema,
    maxRatePpm: ratePpmSchema,
  }),
])

export const createProposalSchema = z.object({
  kidId: z.uuid(),
  payload: proposalPayloadSchema,
  pitch: z.string().trim().max(280).optional(),
})

export type AccountRules = z.infer<typeof accountRulesSchema>
export type RecordTransactionInput = z.infer<typeof recordTransactionSchema>
export type ProposalPayload = z.infer<typeof proposalPayloadSchema>
export type TaskInput = z.infer<typeof taskSchema>
export type TaskSetInput = z.infer<typeof taskSetSchema>
