/// <reference types="vite/client" />
import { devSignInSchema } from "@growbucks/core/api"
import { createFileRoute } from "@tanstack/react-router"
import { eq } from "drizzle-orm"
import { getDb, schema } from "@/db"
import { api, notFound, parseBody } from "@/server/http"
import { authResponse, createDevice, createSession } from "@/server/session"

const { members } = schema

/**
 * Local development only (`pnpm dev:api`): sign in as a test parent without
 * Apple, so the app can be tried in a simulator with no Apple developer team.
 * Production builds have `import.meta.env.DEV === false`, so this 404s.
 */
export const Route = createFileRoute("/api/v1/auth/dev")({
  server: {
    handlers: {
      POST: api(async ({ request }) => {
        if (!import.meta.env.DEV) throw notFound("That page")
        const body = await parseBody(request, devSignInSchema)
        const db = getDb()
        const appleSub = `dev:${body.name.toLowerCase()}`

        let member = await db
          .select()
          .from(members)
          .where(eq(members.appleSub, appleSub))
          .get()
        if (!member) {
          ;[member] = await db
            .insert(members)
            .values({ role: "parent", appleSub, name: body.name })
            .returning()
        }
        if (!member) throw notFound("That parent")

        const deviceId = await createDevice(db, body.device, member.familyId)
        const token = await createSession(db, {
          memberId: member.id,
          deviceId,
          kind: "parent",
        })
        return authResponse(db, token, "parent", member)
      }),
    },
  },
})
