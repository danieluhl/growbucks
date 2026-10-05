import { Link } from "@tanstack/react-router"
import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"

export function NotFound({ children }: { children?: ReactNode }) {
  return (
    <main className="mx-auto flex max-w-lg flex-col items-center gap-6 px-4 py-16 text-center">
      <h1 className="text-3xl font-bold">Nothing planted here.</h1>
      <div className="text-muted-foreground">
        {children ?? <p>We couldn't find that page.</p>}
      </div>
      <Button asChild>
        <Link to="/">Back to the garden</Link>
      </Button>
    </main>
  )
}
