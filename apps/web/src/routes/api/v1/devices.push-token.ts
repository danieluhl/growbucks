import { pushTokenSchema } from "@growbucks/core/api"
import { createFileRoute } from "@tanstack/react-router"
import { eq } from "drizzle-orm"
import { schema } from "@/db"
import { api, parseBody } from "@/server/http"
import { requireSession } from "@/server/session"

/** The app registers its Expo push token so we can notify this device. */
export const Route = createFileRoute("/api/v1/devices/push-token")({
  server: {
    handlers: {
      POST: api(async ({ request }) => {
        const { db, deviceId } = await requireSession(request)
        const { expoPushToken } = await parseBody(request, pushTokenSchema)
        await db
          .update(schema.devices)
          .set({ expoPushToken })
          .where(eq(schema.devices.id, deviceId))
        return { ok: true as const }
      }),
    },
  },
})
