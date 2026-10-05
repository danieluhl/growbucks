import { verifyEmailSignInSchema } from "@growbucks/core/api"
import {
  LOGIN_CODE_MAX_ATTEMPTS,
  normalizeEmail,
  sha256Hex,
} from "@growbucks/core/pairing"
import { createFileRoute } from "@tanstack/react-router"
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm"
import { getDb, schema } from "@/db"
import { api, clientIp, HttpError, parseBody, throttle } from "@/server/http"
import { authResponse, createDevice, createSession } from "@/server/session"

const { loginCodes, members } = schema

/** Trade an emailed code for a parent session on this device. */
export const Route = createFileRoute("/api/v1/auth/email/verify")({
  server: {
    handlers: {
      POST: api(async ({ request }) => {
        const body = await parseBody(request, verifyEmailSignInSchema)
        const email = normalizeEmail(body.email)
        await throttle(`login-verify:${clientIp(request)}`)
        const db = getDb()

        const wrong = new HttpError(
          400,
          "invalid_code",
          "That code didn't work. Check the latest email or ask for a new code."
        )
        const pending = await db
          .select()
          .from(loginCodes)
          .where(
            and(
              eq(loginCodes.email, email),
              isNull(loginCodes.usedAt),
              gt(loginCodes.expiresAt, new Date())
            )
          )
          .orderBy(desc(loginCodes.createdAt))
          .get()
        if (!pending) throw wrong
        if (pending.attempts >= LOGIN_CODE_MAX_ATTEMPTS)
          throw new HttpError(
            429,
            "too_many_attempts",
            "Too many wrong codes. Ask for a new one."
          )
        if (pending.codeHash !== (await sha256Hex(`${email}:${body.code}`))) {
          await db
            .update(loginCodes)
            .set({ attempts: sql`${loginCodes.attempts} + 1` })
            .where(eq(loginCodes.id, pending.id))
          throw wrong
        }
        await db
          .update(loginCodes)
          .set({ usedAt: new Date() })
          .where(eq(loginCodes.id, pending.id))

        let member = await db
          .select()
          .from(members)
          .where(eq(members.email, email))
          .get()
        if (!member) {
          ;[member] = await db
            .insert(members)
            .values({
              role: "parent",
              email,
              name: email.split("@")[0] ?? "Parent",
            })
            .returning()
        }
        if (member?.role !== "parent") throw wrong

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
