/**
 * Pure interest engine. No I/O, safe on client and server. The nightly
 * ledger job and every chart/what-if run the SAME `stepDay`, so projections
 * always match what the kid will actually receive.
 *
 * Model (bank-style daily accrual):
 * - Parents pick a compounding cadence (daily | weekly | monthly) and a rate
 *   PER PERIOD in ppm (1_000_000 ppm = 100%). Default: daily, 0.10%–0.20%.
 * - Every day, interest ACCRUES on the balance at the start of the day:
 *     balance × periodRate × boost ÷ daysInPeriod
 *   so kids can see what their money made today whatever the cadence.
 * - On the period's last day (every day / payday / last day of the month)
 *   whole cents of accrued interest are POSTED to the balance. The fraction
 *   of a cent carries over, so small balances still grow and nothing is lost
 *   to rounding.
 * - Each day, in order: accrue → post (if period ends) → allowance (payday)
 *   → spending.
 *
 * Units: money in integer cents; accrued interest in micro-cents
 * (cents × ppm); calendar days as ISO "YYYY-MM-DD" strings in the family's
 * timezone.
 */

export type Cadence = "daily" | "weekly" | "monthly"
export const cadences = ["daily", "weekly", "monthly"] as const

export const PPM = 1_000_000

/** Default floor/ceiling: 0.10% to 0.20% per day. */
export const DEFAULT_CADENCE: Cadence = "daily"
export const DEFAULT_MIN_RATE_PPM = 1_000
export const DEFAULT_MAX_RATE_PPM = 2_000

/** A boost doubles the rate for 7 days unless the parent changes it. */
export const DEFAULT_BOOST_X100 = 200
export const BOOST_DAYS = 7

// ---------------------------------------------------------------- calendar

const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`)
const toIso = (d: Date) => d.toISOString().slice(0, 10)

export function addDays(iso: string, days: number) {
  const d = toDate(iso)
  d.setUTCDate(d.getUTCDate() + days)
  return toIso(d)
}

/** 0 = Sunday … 6 = Saturday. */
export const weekday = (iso: string) => toDate(iso).getUTCDay()

export function daysInMonth(iso: string) {
  const d = toDate(iso)
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)
  ).getUTCDate()
}

const isLastDayOfMonth = (iso: string) =>
  toDate(iso).getUTCDate() === daysInMonth(iso)

/** Whole days from `a` to `b` (b − a). */
export const daysBetween = (a: string, b: string) =>
  Math.round((toDate(b).getTime() - toDate(a).getTime()) / 86_400_000)

/** Today's ISO date in a given IANA timezone. */
export function todayIn(timeZone: string, now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(now)
}

// ------------------------------------------------------------------- rates

export function daysInPeriod(iso: string, cadence: Cadence) {
  if (cadence === "daily") return 1
  if (cadence === "weekly") return 7
  return daysInMonth(iso)
}

/** Does the period end (interest gets posted) at the end of this day? */
export function isPostingDay(iso: string, cadence: Cadence, payday: number) {
  if (cadence === "daily") return true
  if (cadence === "weekly") return weekday(iso) === payday
  return isLastDayOfMonth(iso)
}

const AVG_DAYS: Record<Cadence, number> = {
  daily: 1,
  weekly: 7,
  monthly: 365.25 / 12,
}

/**
 * Same growth, different cadence. Used when a parent switches cadence so
 * the kid's money grows at the same pace. 1000 ppm/day ≈ 7021 ppm/week.
 */
export function convertRatePpm(ratePpm: number, from: Cadence, to: Cadence) {
  if (from === to) return ratePpm
  const perDay = (1 + ratePpm / PPM) ** (1 / AVG_DAYS[from])
  return Math.round((perDay ** AVG_DAYS[to] - 1) * PPM)
}

/** Days for money to double if everything is kept (no allowance). */
export function doublingDays(ratePpm: number, cadence: Cadence) {
  if (ratePpm <= 0) return null
  return (Math.log(2) / Math.log(1 + ratePpm / PPM)) * AVG_DAYS[cadence]
}

// -------------------------------------------------------------------- core

export interface DayRules {
  cadence: Cadence
  /** Rate per compounding period, before any boost. */
  ratePpm: number
  /** 100 = no boost, 200 = double. */
  boostX100?: number
  /** Allowance day (and weekly posting day). */
  payday: number
  weeklyAllowanceCents: number
}

export interface DayResult {
  balanceCents: number
  accruedMicroCents: number
  /** Interest earned today (micro-cents), posted or not. */
  accruedTodayMicroCents: number
  /** Whole cents moved from accrued to balance today. */
  interestPostedCents: number
  allowanceCents: number
}

/**
 * Advance one calendar day (before spending). The nightly job calls this
 * once per missed day and writes `interestPostedCents` / `allowanceCents` to
 * the ledger when non-zero.
 */
export function stepDay(
  state: { balanceCents: number; accruedMicroCents: number },
  iso: string,
  rules: DayRules
): DayResult {
  const boost = (rules.boostX100 ?? 100) / 100
  const accruedToday =
    (Math.max(0, state.balanceCents) * rules.ratePpm * boost) /
    daysInPeriod(iso, rules.cadence)

  let balance = state.balanceCents
  let accrued = state.accruedMicroCents + accruedToday
  let posted = 0

  if (isPostingDay(iso, rules.cadence, rules.payday)) {
    posted = Math.floor(accrued / PPM)
    accrued -= posted * PPM
    balance += posted
  }

  const allowance =
    weekday(iso) === rules.payday ? rules.weeklyAllowanceCents : 0
  balance += allowance

  return {
    balanceCents: balance,
    accruedMicroCents: accrued,
    accruedTodayMicroCents: accruedToday,
    interestPostedCents: posted,
    allowanceCents: allowance,
  }
}

// -------------------------------------------------------------- projection

export type SpendPolicy =
  /** Keep everything. */
  | "saveAll"
  /** Spend interest as it's posted; keep allowance + principal. */
  | "spendInterest"
  /** Spend allowance as it arrives; keep principal + interest. */
  | "spendAllowance"
  /** Spend everything that comes in (nothing grows). */
  | "spendEverything"

export interface ProjectionInput extends Omit<DayRules, "boostX100"> {
  startDate: string
  startCents: number
  startAccruedMicroCents?: number
  days: number
  policy?: SpendPolicy
  /** One-off purchases by day offset. `{ day: 0, cents: 4000 }` = $40 today. */
  purchases?: ReadonlyArray<{ day: number; cents: number }>
  /** Boost windows by day offset, inclusive. */
  boosts?: ReadonlyArray<{ fromDay: number; toDay: number; x100: number }>
}

export interface DayPoint {
  day: number
  date: string
  balanceCents: number
  accruedMicroCents: number
  accruedTodayMicroCents: number
  totalAllowanceCents: number
  totalInterestCents: number
  totalSpentCents: number
}

export function project(input: ProjectionInput): DayPoint[] {
  const { policy = "saveAll", purchases = [], boosts = [] } = input
  const spendOn = (day: number) =>
    purchases.filter((p) => p.day === day).reduce((s, p) => s + p.cents, 0)
  const boostOn = (day: number) =>
    boosts.find((b) => day >= b.fromDay && day <= b.toDay)?.x100 ?? 100

  let balance = input.startCents
  let accrued = input.startAccruedMicroCents ?? 0
  let totalAllowance = 0
  let totalInterest = 0
  let totalSpent = 0

  const spend = (cents: number) => {
    const actual = Math.min(Math.max(0, cents), balance)
    balance -= actual
    totalSpent += actual
  }

  spend(spendOn(0))
  const points: DayPoint[] = [
    {
      day: 0,
      date: input.startDate,
      balanceCents: balance,
      accruedMicroCents: accrued,
      accruedTodayMicroCents: 0,
      totalAllowanceCents: 0,
      totalInterestCents: 0,
      totalSpentCents: totalSpent,
    },
  ]

  for (let day = 1; day <= input.days; day++) {
    const date = addDays(input.startDate, day)
    const r = stepDay(
      { balanceCents: balance, accruedMicroCents: accrued },
      date,
      {
        ...input,
        boostX100: boostOn(day),
      }
    )
    balance = r.balanceCents
    accrued = r.accruedMicroCents
    totalInterest += r.interestPostedCents
    totalAllowance += r.allowanceCents

    if (policy === "spendInterest" || policy === "spendEverything")
      spend(r.interestPostedCents)
    if (policy === "spendAllowance" || policy === "spendEverything")
      spend(r.allowanceCents)
    spend(spendOn(day))

    points.push({
      day,
      date,
      balanceCents: balance,
      accruedMicroCents: accrued,
      accruedTodayMicroCents: r.accruedTodayMicroCents,
      totalAllowanceCents: totalAllowance,
      totalInterestCents: totalInterest,
      totalSpentCents: totalSpent,
    })
  }

  return points
}

const last = (points: DayPoint[]) => points[points.length - 1] as DayPoint

/** "If I spend $40 today vs in a month, what do I have in 2 months?" */
export function compareSpendTiming(
  input: Omit<ProjectionInput, "days" | "purchases" | "policy"> & {
    purchaseCents: number
    laterDay: number
    horizonDays: number
  }
) {
  const final = (day: number) =>
    last(
      project({
        ...input,
        days: input.horizonDays,
        purchases: [{ day, cents: input.purchaseCents }],
      })
    ).balanceCents
  const nowCents = final(0)
  const laterCents = final(input.laterDay)
  return { nowCents, laterCents, differenceCents: laterCents - nowCents }
}

/**
 * Days until interest alone adds up to `targetCents`
 * ("the interest pays for the toy"). null if not within `maxDays`.
 */
export function daysUntilInterestCovers(
  input: Omit<ProjectionInput, "days" | "policy"> & {
    targetCents: number
    maxDays?: number
  }
) {
  const points = project({ ...input, days: input.maxDays ?? 3 * 365 })
  return (
    points.find((p) => p.totalInterestCents >= input.targetCents)?.day ?? null
  )
}

// -------------------------------------------------------------- formatting

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
})

export const formatCents = (cents: number) => usd.format(cents / 100)

/** Sub-cent amounts for "made today": 0.7¢, 12.4¢, then $1.23. */
export function formatMicroCents(micro: number) {
  const cents = micro / PPM
  if (cents < 100) return `${cents.toFixed(cents < 10 ? 1 : 0)}¢`
  return formatCents(Math.round(cents))
}

/** 1500 ppm → "0.15%", 1000 → "0.10%", 7021 → "0.702%", 100000 → "10%". */
export function formatRatePpm(ppm: number) {
  const pct = (ppm / PPM) * 100
  const text =
    pct < 1 ? pct.toFixed(3).replace(/0$/, "") : String(Number(pct.toFixed(2)))
  return `${text}%`
}

export const cadenceLabel: Record<Cadence, string> = {
  daily: "a day",
  weekly: "a week",
  monthly: "a month",
}
