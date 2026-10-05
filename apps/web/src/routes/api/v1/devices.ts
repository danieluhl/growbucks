import type { DevicesResponse } from "@growbucks/core/api"
import { createFileRoute } from "@tanstack/react-router"
import { and, desc, eq, isNull } from "drizzle-orm"
import { schema } from "@/db"
import { api } from "@/server/http"
import { requireParentWithFamily, toMember } from "@/server/session"

const { devices, sessions, members } = schema

/** Every phone/iPad signed in to the family, and who's on it. */
export const Route = createFileRoute("/api/v1/devices")({
  server: {
    handlers: {
      GET: api(async ({ request }) => {
        const ctx = await requireParentWithFamily(request)
        const rows = await ctx.db
          .select({ device: devices, member: members, kind: sessions.kind })
          .from(devices)
          .innerJoin(
            sessions,
            and(eq(sessions.deviceId, devices.id), isNull(sessions.revokedAt))
          )
          .innerJoin(members, eq(members.id, sessions.memberId))
          .where(eq(devices.familyId, ctx.familyId))
          .orderBy(desc(devices.lastSeenAt))
          .all()

        const byId = new Map<string, DevicesResponse["devices"][number]>()
        for (const { device, member, kind } of rows) {
          const entry = byId.get(device.id) ?? {
            id: device.id,
            name: device.name,
            platform: device.platform,
            kids: [],
            lastSeenAt: device.lastSeenAt?.toISOString() ?? null,
            isThisDevice: device.id === ctx.deviceId,
          }
          if (kind === "kid") entry.kids.push(toMember(member))
          byId.set(device.id, entry)
        }
        const res: DevicesResponse = { devices: [...byId.values()] }
        return res
      }),
    },
  },
})
