import type { ErrorComponentProps } from "@tanstack/react-router"
import { ErrorComponent, Link, useRouter } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"

export function DefaultCatchBoundary({ error }: ErrorComponentProps) {
  const router = useRouter()
  console.error(error)

  return (
    <main className="mx-auto flex max-w-lg flex-col items-center gap-6 px-4 py-16 text-center">
      <h1 className="text-3xl font-bold">Something wilted.</h1>
      <ErrorComponent error={error} />
      <div className="flex gap-2">
        <Button onClick={() => router.invalidate()}>Try again</Button>
        <Button variant="outline" asChild>
          <Link to="/">Home</Link>
        </Button>
      </div>
    </main>
  )
}
