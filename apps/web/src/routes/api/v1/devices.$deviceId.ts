import { createFileRoute } from "@tanstack/react-router"
import { and, eq } from "drizzle-orm"
import { schema } from "@/db"
import { api, notFound } from "@/server/http"
import { requireParentWithFamily } from "@/server/session"

/** Parent removes a device: every session on it stops working at once. */
export const Route = createFileRoute("/api/v1/devices/$deviceId")({
  server: {
    handlers: {
      DELETE: api<{ deviceId: string }>(async ({ request, params }) => {
        const { db, familyId } = await requireParentWithFamily(request)
        const [removed] = await db
          .delete(schema.devices)
          .where(
            and(
              eq(schema.devices.id, params.deviceId),
              eq(schema.devices.familyId, familyId)
            )
          )
          .returning({ id: schema.devices.id })
        if (!removed) throw notFound("That device")
        return { ok: true as const }
      }),
    },
  },
})
