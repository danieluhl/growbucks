import {
  DEFAULT_CADENCE,
  formatCents,
  type ProjectionInput,
  project,
} from "@growbucks/core/growth"
import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"

export const Route = createFileRoute("/")({
  component: Home,
})

// Demo: $20 today, $5 every Saturday, 0.15% a day compounded daily.
const demo = {
  startDate: "2026-01-01",
  startCents: 2000,
  cadence: DEFAULT_CADENCE,
  ratePpm: 1500,
  payday: 6,
  weeklyAllowanceCents: 500,
} satisfies Omit<ProjectionInput, "days">

function Home() {
  const [weeks, setWeeks] = useState(8)
  const saveAll = project({ ...demo, days: weeks * 7 }).at(-1)
  const spendAll = project({
    ...demo,
    days: weeks * 7,
    policy: "spendEverything",
  }).at(-1)

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-10 px-4 py-12 sm:py-20">
      <header className="flex flex-col gap-4">
        <Badge variant="secondary" className="w-fit">
          growbucks.cash
        </Badge>
        <h1 className="text-5xl leading-none font-extrabold text-primary sm:text-6xl">
          Plant a dollar. Watch it grow.
        </h1>
        <p className="max-w-prose text-lg text-muted-foreground">
          GrowBucks teaches kids (and parents) the power of compound interest.
          Parents set the rules, kids learn and play with the savings. Do chores
          to earn money, or go above and beyond to boost the interest rate.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="lg" disabled>
            Start a family garden
          </Button>
          <Button size="lg" variant="outline" disabled>
            Kid sign-in
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-2xl">
            $20 today, $5 a week, 0.15% a day
          </CardTitle>
          <CardDescription>
            Drag to see what saving does in {weeks} weeks.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <Slider
            aria-label="Weeks"
            min={1}
            max={52}
            value={[weeks]}
            onValueChange={([w]) => setWeeks(w ?? 1)}
          />
          <div className="grid grid-cols-2 gap-4">
            <Stat
              label="If you save it all"
              value={formatCents(saveAll?.balanceCents ?? 0)}
              tone="text-leaf"
            />
            <Stat
              label="Interest you earned"
              value={formatCents(saveAll?.totalInterestCents ?? 0)}
              tone="text-sun"
            />
            <Stat
              label="If you spend it all"
              value={formatCents(spendAll?.balanceCents ?? 0)}
              tone="text-berry"
            />
          </div>
        </CardContent>
      </Card>
    </main>
  )
}

function Stat(props: { label: string; value: string; tone: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm text-muted-foreground">{props.label}</span>
      <span
        className={`font-mono text-3xl font-semibold tabular ${props.tone}`}
      >
        {props.value}
      </span>
    </div>
  )
}
