import { redeemPairingCodeSchema } from "@growbucks/core/api"
import { sha256Hex } from "@growbucks/core/pairing"
import { createFileRoute } from "@tanstack/react-router"
import { and, eq, gt, isNull } from "drizzle-orm"
import { getDb, schema } from "@/db"
import { api, clientIp, HttpError, parseBody, throttle } from "@/server/http"
import {
  authResponse,
  createDevice,
  createSession,
  getSession,
} from "@/server/session"

const { pairingCodes, members } = schema

/**
 * A kid's device redeems a pairing code and gets a kid-only session.
 * If the device already holds a kid session from this family (siblings
 * sharing an iPad), the new kid is added to the same device.
 */
export const Route = createFileRoute("/api/v1/pair")({
  server: {
    handlers: {
      POST: api(async ({ request }) => {
        await throttle(`pair:${clientIp(request)}`)
        const body = await parseBody(request, redeemPairingCodeSchema)
        const db = getDb()

        const [claimed] = await db
          .update(pairingCodes)
          .set({ usedAt: new Date() })
          .where(
            and(
              eq(pairingCodes.codeHash, await sha256Hex(body.code)),
              isNull(pairingCodes.usedAt),
              gt(pairingCodes.expiresAt, new Date())
            )
          )
          .returning()
        if (!claimed)
          throw new HttpError(
            400,
            "invalid_code",
            "That code didn't work. Codes last 10 minutes and work once. Ask a parent for a new one."
          )

        const kid = await db
          .select()
          .from(members)
          .where(eq(members.id, claimed.kidId))
          .get()
        if (!kid)
          throw new HttpError(400, "invalid_code", "That kid no longer exists.")

        const existing = await getSession(request)
        const deviceId =
          existing?.kind === "kid" &&
          existing.member.familyId === claimed.familyId
            ? existing.deviceId
            : await createDevice(db, body.device, claimed.familyId)

        await db
          .update(pairingCodes)
          .set({ usedByDeviceId: deviceId })
          .where(eq(pairingCodes.id, claimed.id))
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
