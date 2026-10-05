import assert from "node:assert/strict"
import { describe, test } from "node:test"
import {
  addDays,
  compareSpendTiming,
  convertRatePpm,
  daysInMonth,
  daysUntilInterestCovers,
  formatMicroCents,
  formatRatePpm,
  isPostingDay,
  type ProjectionInput,
  project,
  stepDay,
  weekday,
} from "./growth.ts"

// 2026-10-03 is a Saturday.
const SAT = 6
const base = {
  startDate: "2026-10-01",
  startCents: 2000,
  cadence: "daily",
  ratePpm: 1500,
  payday: SAT,
  weeklyAllowanceCents: 0,
} satisfies Omit<ProjectionInput, "days">

const final = (input: ProjectionInput) => {
  const last = project(input).at(-1)
  assert.ok(last)
  return last
}

describe("calendar", () => {
  test("date helpers", () => {
    assert.equal(addDays("2026-12-31", 1), "2027-01-01")
    assert.equal(weekday("2026-10-03"), SAT)
    assert.equal(daysInMonth("2028-02-10"), 29)
  })

  test("posting days per cadence", () => {
    assert.equal(isPostingDay("2026-10-01", "daily", SAT), true)
    assert.equal(isPostingDay("2026-10-02", "weekly", SAT), false)
    assert.equal(isPostingDay("2026-10-03", "weekly", SAT), true)
    assert.equal(isPostingDay("2026-10-30", "monthly", SAT), false)
    assert.equal(isPostingDay("2026-10-31", "monthly", SAT), true)
  })
})

describe("stepDay", () => {
  test("daily: posts whole cents and carries the fraction", () => {
    // $20 × 0.15% = 3¢ exactly
    const r = stepDay(
      { balanceCents: 2000, accruedMicroCents: 0 },
      "2026-10-01",
      base
    )
    assert.equal(r.interestPostedCents, 3)
    assert.equal(r.accruedMicroCents, 0)

    // $2 × 0.15% = 0.3¢ → nothing posted, 0.3¢ carried
    const small = stepDay(
      { balanceCents: 200, accruedMicroCents: 0 },
      "2026-10-01",
      base
    )
    assert.equal(small.interestPostedCents, 0)
    assert.equal(small.accruedMicroCents, 300_000)
  })

  test("small balances still grow thanks to carry", () => {
    const end = final({ ...base, startCents: 200, days: 30 })
    assert.ok(end.totalInterestCents >= 9, `got ${end.totalInterestCents}`)
  })

  test("weekly: accrues daily, posts on payday only", () => {
    const rules = { ...base, cadence: "weekly" as const, ratePpm: 7000 }
    const fri = stepDay(
      { balanceCents: 10_000, accruedMicroCents: 0 },
      "2026-10-02",
      rules
    )
    assert.equal(fri.interestPostedCents, 0)
    assert.equal(fri.accruedTodayMicroCents, 10_000_000) // 10¢ today
    const sat = stepDay(
      { balanceCents: 10_000, accruedMicroCents: 60_000_000 },
      "2026-10-03",
      rules
    )
    assert.equal(sat.interestPostedCents, 70) // a full week = 0.7% of $100
  })

  test("boost doubles today's accrual", () => {
    const r = stepDay(
      { balanceCents: 2000, accruedMicroCents: 0 },
      "2026-10-01",
      {
        ...base,
        boostX100: 200,
      }
    )
    assert.equal(r.interestPostedCents, 6)
  })

  test("allowance lands on payday after interest", () => {
    const r = stepDay({ balanceCents: 0, accruedMicroCents: 0 }, "2026-10-03", {
      ...base,
      weeklyAllowanceCents: 500,
    })
    assert.equal(r.allowanceCents, 500)
    assert.equal(r.interestPostedCents, 0)
    assert.equal(r.balanceCents, 500)
  })
})

describe("rates", () => {
  test("cadence conversion keeps growth equal", () => {
    const weekly = convertRatePpm(1000, "daily", "weekly")
    assert.equal(weekly, 7021)
    assert.ok(Math.abs(convertRatePpm(weekly, "weekly", "daily") - 1000) <= 1)
  })

  test("formatting", () => {
    assert.equal(formatRatePpm(1500), "0.15%")
    assert.equal(formatRatePpm(100_000), "10%")
    assert.equal(formatRatePpm(1000), "0.10%")
    assert.equal(formatRatePpm(7021), "0.702%")
    assert.equal(formatMicroCents(6_750_000), "6.8¢")
  })
})

describe("projections", () => {
  test("policies rank as expected", () => {
    const input = { ...base, weeklyAllowanceCents: 500, days: 56 }
    const save = final({ ...input, policy: "saveAll" }).balanceCents
    const interest = final({ ...input, policy: "spendInterest" }).balanceCents
    const allowance = final({ ...input, policy: "spendAllowance" }).balanceCents
    const all = final({ ...input, policy: "spendEverything" }).balanceCents
    assert.ok(save > interest && interest > allowance && allowance > all)
    assert.equal(all, 2000)
    assert.equal(interest, 2000 + 8 * 500)
  })

  test("a boost window only applies inside the window", () => {
    const plain = final({ ...base, days: 14 }).totalInterestCents
    const boosted = final({
      ...base,
      days: 14,
      boosts: [{ fromDay: 1, toDay: 7, x100: 200 }],
    }).totalInterestCents
    assert.ok(boosted > plain)
    assert.ok(boosted < plain * 2)
  })

  test("waiting to spend leaves more money", () => {
    const r = compareSpendTiming({
      ...base,
      startCents: 6000,
      weeklyAllowanceCents: 500,
      purchaseCents: 4000,
      laterDay: 28,
      horizonDays: 60,
    })
    assert.ok(r.differenceCents > 0)
  })

  test("interest eventually pays for the toy", () => {
    const days = daysUntilInterestCovers({ ...base, targetCents: 2000 })
    assert.ok(days !== null && days > 300 && days < 600, `got ${days}`)
  })
})
