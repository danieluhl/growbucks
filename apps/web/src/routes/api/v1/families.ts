import { createFamilySchema } from "@growbucks/core/api"
import { createFileRoute } from "@tanstack/react-router"
import { eq } from "drizzle-orm"
import { schema } from "@/db"
import { api, HttpError, parseBody } from "@/server/http"
import { meResponse, requireSession } from "@/server/session"

/** A newly signed-in parent creates their family (once). */
export const Route = createFileRoute("/api/v1/families")({
  server: {
    handlers: {
      POST: api(async ({ request }) => {
        const ctx = await requireSession(request, "parent")
        if (ctx.member.familyId)
          throw new HttpError(409, "has_family", "You already have a family.")
        const body = await parseBody(request, createFamilySchema)
        const { db } = ctx
        const familyId = crypto.randomUUID()

        await db.batch([
          db.insert(schema.families).values({
            id: familyId,
            name: body.familyName,
            timezone: body.timezone,
          }),
          db
            .update(schema.members)
            .set({ familyId, name: body.parentName })
            .where(eq(schema.members.id, ctx.member.id)),
          db
            .update(schema.devices)
            .set({ familyId })
            .where(eq(schema.devices.id, ctx.deviceId)),
        ])

        return meResponse({
          ...ctx,
          member: { ...ctx.member, familyId, name: body.parentName },
        })
      }),
    },
  },
})
