import { createFileRoute } from "@tanstack/react-router"
import { sql } from "drizzle-orm"
import { getDb } from "@/db"

/** Smoke check that the Worker is up and D1 answers. */
export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        try {
          await getDb().run(sql`select 1`)
          return Response.json({ ok: true, db: "up" })
        } catch (error) {
          console.error("health check failed", error)
          return Response.json({ ok: false, db: "down" }, { status: 503 })
        }
      },
    },
  },
})
