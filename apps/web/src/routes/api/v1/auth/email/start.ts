import { startEmailSignInSchema } from "@growbucks/core/api"
import {
  LOGIN_CODE_TTL_MINUTES,
  newLoginCode,
  normalizeEmail,
  sha256Hex,
} from "@growbucks/core/pairing"
import { createFileRoute } from "@tanstack/react-router"
import { getDb, schema } from "@/db"
import { sendLoginCode } from "@/server/email"
import { api, clientIp, parseBody, throttle } from "@/server/http"

/** Email a parent a 6-digit sign-in code. Same reply whether or not the account exists. */
export const Route = createFileRoute("/api/v1/auth/email/start")({
  server: {
    handlers: {
      POST: api(async ({ request }) => {
        const body = await parseBody(request, startEmailSignInSchema)
        const email = normalizeEmail(body.email)
        await throttle(`login-start:${clientIp(request)}`)
        await throttle(`login-start:${email}`)

        const code = newLoginCode()
        await getDb()
          .insert(schema.loginCodes)
          .values({
            email,
            codeHash: await sha256Hex(`${email}:${code}`),
            expiresAt: new Date(Date.now() + LOGIN_CODE_TTL_MINUTES * 60_000),
          })
        await sendLoginCode(email, code)
        return { ok: true as const }
      }),
    },
  },
})
