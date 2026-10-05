import { createFileRoute } from "@tanstack/react-router"
import { eq } from "drizzle-orm"
import { schema } from "@/db"
import { api } from "@/server/http"
import { requireSession } from "@/server/session"

export const Route = createFileRoute("/api/v1/auth/sign-out")({
  server: {
    handlers: {
      POST: api(async ({ request }) => {
        const { db, sessionId } = await requireSession(request)
        await db
          .update(schema.sessions)
          .set({ revokedAt: new Date() })
          .where(eq(schema.sessions.id, sessionId))
        return { ok: true as const }
      }),
    },
  },
})
