import {
  cadences,
  DEFAULT_BOOST_X100,
  DEFAULT_CADENCE,
  DEFAULT_MAX_RATE_PPM,
  DEFAULT_MIN_RATE_PPM,
} from "@growbucks/core/growth"
import { sql } from "drizzle-orm"
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core"

/**
 * Units (see packages/core/src/growth.ts for the interest model):
 * - money: integer cents
 * - rates: ppm PER COMPOUNDING PERIOD (1_000_000 = 100%)
 * - accrued-but-unposted interest: micro-cents (cents × 1e6)
 * - calendar days: ISO "YYYY-MM-DD" in the family's timezone
 */

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID())

const createdAt = () =>
  integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`)

export const families = sqliteTable("families", {
  id: id(),
  name: text("name").notNull(),
  /** IANA zone; decides when "today" ends for interest and allowance. */
  timezone: text("timezone").notNull().default("America/New_York"),
  createdAt: createdAt(),
})

export const members = sqliteTable(
  "members",
  {
    id: id(),
    /** Null only for a parent who has signed in but not created a family. */
    familyId: text("family_id").references(() => families.id, {
      onDelete: "cascade",
    }),
    role: text("role", { enum: ["parent", "kid"] }).notNull(),
    name: text("name").notNull(),
    /** Parents sign in with Apple: the stable `sub` from Apple's token. */
    appleSub: text("apple_sub").unique(),
    /** From Apple when the parent shares it (may be a private relay address). */
    email: text("email"),
    /** Emoji or avatar key picked by the kid. */
    avatar: text("avatar"),
    /**
     * Optional 4-digit PIN, only used when siblings share one device so they
     * can't open each other's garden.
     */
    pinHash: text("pin_hash"),
    createdAt: createdAt(),
  },
  (t) => [index("members_family_idx").on(t.familyId)]
)

/** A phone or iPad signed in to a family (parent's iPhone, kid's iPad). */
export const devices = sqliteTable(
  "devices",
  {
    id: id(),
    familyId: text("family_id").references(() => families.id, {
      onDelete: "cascade",
    }),
    name: text("name").notNull(),
    platform: text("platform").notNull(),
    model: text("model"),
    expoPushToken: text("expo_push_token"),
    lastSeenAt: integer("last_seen_at", { mode: "timestamp_ms" }),
    createdAt: createdAt(),
  },
  (t) => [index("devices_family_idx").on(t.familyId)]
)

/**
 * One signed-in person on one device. A kid device holds kid sessions only;
 * a shared iPad can hold one per sibling. Only the token's hash is stored.
 */
export const sessions = sqliteTable(
  "sessions",
  {
    id: id(),
    tokenHash: text("token_hash").notNull().unique(),
    memberId: text("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    deviceId: text("device_id")
      .notNull()
      .references(() => devices.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["parent", "kid"] }).notNull(),
    lastSeenAt: integer("last_seen_at", { mode: "timestamp_ms" }),
    revokedAt: integer("revoked_at", { mode: "timestamp_ms" }),
    createdAt: createdAt(),
  },
  (t) => [
    index("sessions_member_idx").on(t.memberId),
    index("sessions_device_idx").on(t.deviceId),
  ]
)

/** One-time codes a parent shows to link a kid's device (10 minutes). */
export const pairingCodes = sqliteTable("pairing_codes", {
  id: id(),
  codeHash: text("code_hash").notNull().unique(),
  familyId: text("family_id")
    .notNull()
    .references(() => families.id, { onDelete: "cascade" }),
  kidId: text("kid_id")
    .notNull()
    .references(() => members.id, { onDelete: "cascade" }),
  createdById: text("created_by_id")
    .notNull()
    .references(() => members.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  usedAt: integer("used_at", { mode: "timestamp_ms" }),
  usedByDeviceId: text("used_by_device_id").references(() => devices.id, {
    onDelete: "set null",
  }),
  createdAt: createdAt(),
})

/** One savings "garden" per kid. Parents own every setting here. */
export const accounts = sqliteTable("accounts", {
  id: id(),
  kidId: text("kid_id")
    .notNull()
    .unique()
    .references(() => members.id, { onDelete: "cascade" }),
  /** How often accrued interest is added to the balance. */
  cadence: text("cadence", { enum: cadences })
    .notNull()
    .default(DEFAULT_CADENCE),
  /**
   * Rate per period. Today's rate = floor + rate rewards from tasks done
   * today, capped at the ceiling (see `dayRatePpm` in lib/rewards). Parents
   * can't configure more earnable rate than ceiling − floor.
   */
  minRatePpm: integer("min_rate_ppm").notNull().default(DEFAULT_MIN_RATE_PPM),
  maxRatePpm: integer("max_rate_ppm").notNull().default(DEFAULT_MAX_RATE_PPM),
  /** Rate multiplier used when a parent hits Boost (200 = 2×). */
  boostX100: integer("boost_x100").notNull().default(DEFAULT_BOOST_X100),
  /** Keep daily rate rewards split evenly so all done = ceiling. */
  autoSplitRate: integer("auto_split_rate", { mode: "boolean" })
    .notNull()
    .default(true),
  weeklyAllowanceCents: integer("weekly_allowance_cents").notNull().default(0),
  /** 0 = Sunday … 6 = Saturday. Allowance day and weekly posting day. */
  payday: integer("payday").notNull().default(6),
  /** Interest earned but not yet posted (includes the sub-cent carry). */
  accruedMicroCents: integer("accrued_micro_cents").notNull().default(0),
  /** Last calendar day the nightly job processed for this account. */
  lastProcessedOn: text("last_processed_on"),
  createdAt: createdAt(),
})

/**
 * A parent-triggered boost: `boostX100` × rate for 7 days
 * (startsOn … endsOn inclusive). One active boost per account at a time.
 */
export const boosts = sqliteTable(
  "boosts",
  {
    id: id(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    x100: integer("x100").notNull(),
    startsOn: text("starts_on").notNull(),
    endsOn: text("ends_on").notNull(),
    reason: text("reason"),
    createdById: text("created_by_id").references(() => members.id),
    createdAt: createdAt(),
  },
  (t) => [index("boosts_account_idx").on(t.accountId, t.endsOn)]
)

export const transactionKinds = [
  "allowance",
  "task",
  "set_bonus",
  "bonus",
  "interest",
  "spend",
  "adjustment",
] as const

/** Append-only ledger. Balance = SUM(amount_cents). */
export const transactions = sqliteTable(
  "transactions",
  {
    id: id(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: transactionKinds }).notNull(),
    /** Positive for money in, negative for spending. */
    amountCents: integer("amount_cents").notNull(),
    memo: text("memo"),
    /** The task or set completion that paid this, if any. */
    completionId: text("completion_id"),
    createdById: text("created_by_id").references(() => members.id),
    occurredAt: integer("occurred_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("transactions_account_idx").on(t.accountId, t.occurredAt)]
)

export const rewardKinds = ["rate", "cash", "none"] as const

/** A named bundle of tasks with a bonus ("Morning routine", Perfect Day). */
export const taskSets = sqliteTable(
  "task_sets",
  {
    id: id(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    /** custom = its member tasks; allDaily = every daily task (Perfect Day). */
    scope: text("scope", { enum: ["custom", "allDaily"] })
      .notNull()
      .default("custom"),
    bonusKind: text("bonus_kind", { enum: rewardKinds })
      .notNull()
      .default("none"),
    bonusCents: integer("bonus_cents").notNull().default(0),
    bonusRatePpm: integer("bonus_rate_ppm").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("task_sets_account_idx").on(t.accountId)]
)

/**
 * Something a kid can check off, with the reward shown up front.
 * rate rewards are only allowed on daily tasks (they raise today's rate).
 */
export const tasks = sqliteTable(
  "tasks",
  {
    id: id(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    emoji: text("emoji"),
    schedule: text("schedule", { enum: ["daily", "weekly", "once"] })
      .notNull()
      .default("daily"),
    rewardKind: text("reward_kind", { enum: rewardKinds })
      .notNull()
      .default("rate"),
    rewardCents: integer("reward_cents").notNull().default(0),
    rewardRatePpm: integer("reward_rate_ppm").notNull().default(0),
    setId: text("set_id").references(() => taskSets.id, {
      onDelete: "set null",
    }),
    /**
     * trust: reward lands the moment the kid checks it (parent can undo
     * the same day). parent: celebration shows a "seed planted" and the
     * reward lands when a parent approves.
     */
    checkMode: text("check_mode", { enum: ["trust", "parent"] })
      .notNull()
      .default("trust"),
    status: text("status", { enum: ["active", "proposed", "archived"] })
      .notNull()
      .default("active"),
    proposedById: text("proposed_by_id").references(() => members.id),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("tasks_account_idx").on(t.accountId, t.status)]
)

/**
 * A check-off (or a finished set). The reward is copied at completion time
 * so editing a task later never rewrites history.
 */
export const completions = sqliteTable(
  "completions",
  {
    id: id(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    taskId: text("task_id").references(() => tasks.id, {
      onDelete: "set null",
    }),
    setId: text("set_id").references(() => taskSets.id, {
      onDelete: "set null",
    }),
    /** Calendar day in the family timezone. */
    onDate: text("on_date").notNull(),
    rewardKind: text("reward_kind", { enum: rewardKinds }).notNull(),
    rewardCents: integer("reward_cents").notNull().default(0),
    rewardRatePpm: integer("reward_rate_ppm").notNull().default(0),
    status: text("status", {
      enum: ["done", "pending", "approved", "rejected", "undone"],
    }).notNull(),
    reviewedAt: integer("reviewed_at", { mode: "timestamp_ms" }),
    reviewedById: text("reviewed_by_id").references(() => members.id),
    createdAt: createdAt(),
  },
  (t) => [
    index("completions_account_day_idx").on(t.accountId, t.onDate),
    uniqueIndex("completions_task_day_uq").on(t.taskId, t.onDate),
    uniqueIndex("completions_set_day_uq").on(t.setId, t.onDate),
  ]
)

/** Kids pitch new tasks, rewards or rate changes; parents decide. */
export const proposals = sqliteTable(
  "proposals",
  {
    id: id(),
    kidId: text("kid_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["task", "reward", "rate"] }).notNull(),
    /** JSON validated by `proposalPayloadSchema` in @growbucks/core/validators. */
    payload: text("payload", { mode: "json" }).notNull(),
    pitch: text("pitch"),
    status: text("status", { enum: ["pending", "approved", "declined"] })
      .notNull()
      .default("pending"),
    decidedById: text("decided_by_id").references(() => members.id),
    decidedAt: integer("decided_at", { mode: "timestamp_ms" }),
    createdAt: createdAt(),
  },
  (t) => [index("proposals_kid_idx").on(t.kidId, t.status)]
)

export type Family = typeof families.$inferSelect
export type Member = typeof members.$inferSelect
export type Device = typeof devices.$inferSelect
export type Session = typeof sessions.$inferSelect
export type Account = typeof accounts.$inferSelect
export type Boost = typeof boosts.$inferSelect
export type Transaction = typeof transactions.$inferSelect
export type TaskSet = typeof taskSets.$inferSelect
export type Task = typeof tasks.$inferSelect
export type Completion = typeof completions.$inferSelect
export type Proposal = typeof proposals.$inferSelect
