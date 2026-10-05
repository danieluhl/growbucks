# GrowBucks v1 features

Approved Sep 30, 2026. Visual design: `docs/design/feature-sketches.html`.
Interest engine: `src/lib/growth.ts`. Task rewards and celebration sizing:
`src/lib/rewards.ts`. Both are unit tested (`pnpm test`).

## Platform

- iPhone and iPad app (Expo). Parents usually use an iPhone; a kid may have
  their own iPad or use a parent's phone.
- Cloudflare Worker API + D1; growbucks.cash hosts the landing page.

## Sign-in and kid devices

- **Parents** sign in with an emailed 6-digit code (no password). A new
  parent creates the family, then adds kids.
- **Linking a kid's iPad**: on the parent's phone, "Link Maya's iPad" shows a
  QR code and an 8-character code (no 0/O/1/I/L), valid once for 10
  minutes. The kid opens the app, taps "I'm a kid" (shown first on iPads),
  scans or types it. The iPad gets a kid-only session and stays signed in.
  The parent's screen switches to "Linked!" automatically.
- **Kid sessions** can view, explore, check off tasks and propose; they can't
  change money, rules or devices.
- **Siblings sharing an iPad**: each links with their own code; the kid home
  shows a name switcher. (Optional per-kid PIN on shared devices: later.)
- **Devices**: parents see every linked phone/iPad with who's on it and when
  it was last used, and can remove one, which signs it out at once.
- Sign-in and linking are rate-limited; only hashes of codes and tokens are
  stored.

## Roles

- **Parents** do every add/subtract and own all settings.
- **Kids** look, explore what-ifs, check off tasks, and make proposals.

## Interest model

- Parents choose the **compounding cadence** per kid: `daily` (default),
  `weekly` (posts on payday) or `monthly` (posts on the last day of the month).
- Parents set a **rate floor and ceiling per period**. Default: 0.10%–0.20% per
  day (≈3.1%–6.3% a month). Switching cadence converts the rates so growth
  stays the same (`convertRatePpm`).
- **Today's rate** = floor + rate rewards from tasks checked off today,
  capped at the ceiling (`dayRatePpm`). See Task rewards below.
- Interest **accrues daily** on the balance at the start of each day, whatever
  the cadence, so kids always see what their money made today. Whole cents are
  posted at the end of the period; the sub-cent remainder carries over.
- Daily order: accrue → post (if the period ends) → allowance (on payday) →
  spending.
- All days are calendar days in the family's timezone.

## Boost week

- A parent taps **Boost** (optional reason, e.g. "Great report card!").
- The kid's accrual is multiplied by the account's boost strength
  (default 2×, adjustable 1.1×–5×) for 7 days: today through 6 days from now.
- One active boost per kid. It ends by itself; parents can't stack or extend.
- Kid sees a banner ("Boost week! Until Sunday") and the boosted counter.

## Task rewards and celebrations

- Every task shows its reward before it's checked off:
  - **rate**: adds to today's rate (daily tasks only), shown to the kid as
    the extra cents it earns today (e.g. "+1.8¢ today · +0.02% rate").
  - **cash**: added to the balance.
  - **none**: just progress.
- **Split evenly** (default on): the ceiling − floor is divided across daily
  rate tasks so finishing all of them lands exactly on the ceiling. Parents can
  switch it off and set each task's amount, but can't configure more earnable
  rate than ceiling − floor, so a shown reward is never silently capped.
- **Sets** bundle tasks ("Morning routine") and pay a cash or rate bonus
  when all are done. **Perfect Day** is the built-in set of all daily tasks.
- **Check mode** per task: *trust* (reward lands instantly; the kid or a
  parent can undo it the same day) or *parent checks* (the kid sees a
  "seed planted" and the full celebration plays when a parent approves).
  Default: trust for daily tasks, parent checks for one-off cash tasks.
- The reward is copied onto the completion row, so editing a task later
  never changes history.
- **Progress**: a ring shows daily tasks done today (e.g. 3/5), next to
  today's rate and the live "made today" counter, which speeds up as the
  rate rises.
- **Celebration size** follows what the reward is worth today ÷ the kid's
  weekly allowance ($5 if none), summed over everything one tap unlocked:

  | Tier | When | What plays |
  | --- | --- | --- |
  | Sprout | < 5% | chip floats up from the task, ring fills (~1 s) |
  | Bloom | 5–25%, or any finished set | coin burst from the checkbox, bigger chip (~1.5 s) |
  | Harvest | 25–100%, or Perfect Day | card over the screen, plant grows, coin rain, every reward listed (tap to close) |
  | Jackpot | ≥ 100% | full screen, sun rays, leaves + coins, big count-up (stays until tapped) |

  Pending (parent-checks) completions play at most Bloom until approved.
  One tap that finishes a task, a set and the day plays **one** celebration
  at the highest tier. Reduced-motion users get the same content without
  movement. Sound is off by default.

## v1

1. **Kid garden home**: balance, live "made today" counter that ticks up
   through the day, boost banner, plant stage (seed → sprout → sapling → tree →
   orchard), rotating saying, doubling trick (rule of 72).
2. **Growth chart**: put in vs interest earned, "if you kept it all" line,
   projection past today, what a past purchase would be worth now.
3. **What-if lab**: save all / spend interest / spend allowance / spend all
   over N weeks; spend now vs later.
4. **Rates & compounding settings** (above).
5. **Boost week** (above).
6. **Automatic interest & allowance**: nightly Cron job; per account, runs
   `stepDay` for each unprocessed day up to yesterday in the family timezone
   and writes ledger rows. Idempotent via `accounts.last_processed_on`.
7. **Parent ledger**: quick add gift/bonus/spend per kid; system interest rows
   are grouped by week in the UI; task and set payouts link to their
   completion.
8. **Rules per kid**: allowance, payday, PIN, boost strength, cadence, rates,
   whether the kid may propose rate changes.
9. **Task rewards & celebrations** (above).
10. **Family sign-in & kid devices** (above).
11. **Kid proposals**: new task, new reward for a task, or rate change; parent
    accepts, declines or counters.
12. **Money seeds**: sayings, analogies and short stories tied to the kid's own
    numbers.
13. **Parent notifications**: "Maya finished Rake the leaves. Approve?" for
    parent-checks tasks, plus new proposals and newly linked devices (Expo
    push; the app registers its token on sign-in).

## Later

Savings goals · payday recap · milestone badges · spend check-in ·
home-screen widget and boost-week lock-screen countdown · kid notifications
("your money made 7¢ today") · second parent
invite · per-kid PIN on shared devices.

## Not planned

Sibling view.
