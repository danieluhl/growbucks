import { appleSignInSchema } from "@growbucks/core/api"
import { createFileRoute } from "@tanstack/react-router"
import { eq } from "drizzle-orm"
import { getDb, schema } from "@/db"
import { verifyAppleToken } from "@/server/apple"
import { api, clientIp, forbidden, parseBody, throttle } from "@/server/http"
import { authResponse, createDevice, createSession } from "@/server/session"

const { members } = schema

/** Trade a Sign in with Apple identity token for a parent session. */
export const Route = createFileRoute("/api/v1/auth/apple")({
  server: {
    handlers: {
      POST: api(async ({ request }) => {
        const body = await parseBody(request, appleSignInSchema)
        await throttle(`login-apple:${clientIp(request)}`)
        const apple = await verifyAppleToken(body.identityToken)
        const db = getDb()

        let member = await db
          .select()
          .from(members)
          .where(eq(members.appleSub, apple.sub))
          .get()
        if (!member) {
          ;[member] = await db
            .insert(members)
            .values({
              role: "parent",
              appleSub: apple.sub,
              email: apple.email,
              name: body.givenName || "Parent",
            })
            .returning()
        }
        if (member?.role !== "parent")
          throw forbidden("This Apple ID can't sign in as a parent.")

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
