import { createFileRoute } from "@tanstack/react-router"
import { and, eq } from "drizzle-orm"
import { schema } from "@/db"
import { api, notFound } from "@/server/http"
import {
  authResponse,
  createSession,
  requireParentWithFamily,
} from "@/server/session"

/**
 * A parent opens a kid's view on their own phone, for a kid with no device
 * of their own yet. The kid session lives on the parent's device, so
 * removing that device in Devices signs it out too.
 */
export const Route = createFileRoute("/api/v1/kids/$kidId/session")({
  server: {
    handlers: {
      POST: api<{ kidId: string }>(async ({ request, params }) => {
        const { db, familyId, deviceId } =
          await requireParentWithFamily(request)
        const kid = await db
          .select()
          .from(schema.members)
          .where(
            and(
              eq(schema.members.id, params.kidId),
              eq(schema.members.familyId, familyId),
              eq(schema.members.role, "kid")
            )
          )
          .get()
        if (!kid) throw notFound("That kid")

        const token = await createSession(db, {
          memberId: kid.id,
          deviceId,
          kind: "kid",
        })
        return authResponse(db, token, "kid", kid)
      }),
    },
  },
})
