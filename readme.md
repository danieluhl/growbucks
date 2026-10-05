# Description

The idea with this app is to get kids to recognize the power of compound
interest. They get regular allowance or allowance based on tasks they have
completed. The money is not really there, it's just a number game. Spending
needs to be manually entered.

Interest is the main thing here. Since we should be dealing with small amounts
and we want to show the real growth so recommend the interest be high: maybe
10%? We can also realize the gains early by doing weekly compound interest.

Show the interest graph and the graph that includes "if you get all your
allowance and you keep interest"

Show "what if" scenarios: In 2 weeks what if I save everything?

- what if I spend all the interest gained?
- what if I spend all of the allowance gained but don't touch the base/interest?
- if I spend $40 today vs in one month, how much money will I have in 2 months?

Include brief catchy descriptions, analogies, stories, and cuted little phrases
that the child can catch onto to understand the power of saving and interest.

Kids to the analysis, parents do the add/subtract and the settings.

Kids can also propose tasks and reward amounts, they could even propose interest
rate changes.

What if the baseline chores drive the interest rate (with a min/max) and extra
chores drive the principle.


# Naming ideas

growbucks.cash 

Catchy description/marketing for the main homepage:

GrowBucks teaches kids (and parents) about the power of compound interest.

Parents set the rules, kids learn and play with the savings. Do chores to earn
money or go above and beyond to impact the interest rate!

GrowBucks presents the reality of compound interest and puts the decision in the
hands of the kid. Spend $20 now and it's only worth $20, but wait a couple
months and the interest off that $20 will pay for that toy itself!




# Development

GrowBucks is an iPhone + iPad app (Expo) backed by a Cloudflare Worker API
(TanStack Start, D1 + Drizzle). Shared logic and Zod schemas live in
`packages/core`. Conventions: `CLAUDE.md`. Approved scope:
`docs/features.md`. Design sketches: `docs/design/feature-sketches.html`.

```
apps/mobile     Expo app (iPhone + iPad)
apps/web        Worker: growbucks.cash landing page + /api/v1
packages/core   interest engine, task rewards, pairing codes, API schemas
```

## First-time setup

You need Node 22+, Xcode (for the iOS simulator) and an Apple developer
account for installing on a real iPhone/iPad.

```sh
corepack enable                           # once; provides the pinned pnpm
pnpm install
pnpm --filter @growbucks/web db:generate  # first SQL migration from the schema
pnpm --filter @growbucks/web db:migrate:local
pnpm test                                 # interest/reward/pairing unit tests
```

## Running it

Two terminals:

```sh
pnpm dev:api    # Worker + local D1 on http://localhost:3000 (also on your LAN)
pnpm dev:app    # Expo dev server
```

The first time, build the app into the simulator or onto a device (camera,
Keychain and haptics need a development build, not Expo Go):

```sh
pnpm --filter @growbucks/mobile ios          # simulator
pnpm --filter @growbucks/mobile ios:device   # plugged-in iPhone/iPad
```

In development the app talks to the computer running `expo start` on port
3000. Parents sign in with Apple. The app has the Sign in with Apple
capability, so Xcode needs a paid Apple developer team to sign it (select it
under Signing & Capabilities the first time). In the simulator, sign in to an
Apple ID under Settings first; the API needs to reach appleid.apple.com.

Without a paid team or an Apple ID, use **Dev: sign in as a test parent**
under the Apple button. It only shows in development builds, and the API only
accepts it from `pnpm dev:api` (production builds return 404).

## Everyday commands

| Command | What it does |
| --- | --- |
| `pnpm lint` / `pnpm lint:fix` | Biome lint + format check / autofix |
| `pnpm test` | Unit tests in `packages/core` (node:test) |
| `pnpm typecheck` | `tsc --noEmit` in every package |
| `pnpm --filter @growbucks/web db:generate` | New migration after editing the schema |
| `pnpm --filter @growbucks/web test:e2e` | Playwright smoke test of the Worker |
| `pnpm --filter @growbucks/mobile test:e2e` | Maestro app flows (simulator) |

## Deploying

```sh
pnpm --filter @growbucks/web exec wrangler login
pnpm --filter @growbucks/web db:create     # copy database_id into wrangler.jsonc
pnpm --filter @growbucks/web run deploy    # build → remote migrations → deploy
```

App builds go through EAS (`apps/mobile/eas.json`): `eas build --profile
preview` for TestFlight-style internal installs, `production` for the App
Store. Those profiles point the app at https://growbucks.cash.
