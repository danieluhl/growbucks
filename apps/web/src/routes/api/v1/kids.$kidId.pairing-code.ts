import type { PairingCodeResponse } from "@growbucks/core/api"
import {
  formatPairCode,
  newPairCode,
  PAIR_CODE_TTL_MINUTES,
  pairUrl,
  sha256Hex,
} from "@growbucks/core/pairing"
import { createFileRoute } from "@tanstack/react-router"
import { and, eq } from "drizzle-orm"
import { schema } from "@/db"
import { api, notFound } from "@/server/http"
import { requireParentWithFamily } from "@/server/session"

/** Parent's phone asks for a one-time code to link a kid's iPad. */
export const Route = createFileRoute("/api/v1/kids/$kidId/pairing-code")({
  server: {
    handlers: {
      POST: api<{ kidId: string }>(async ({ request, params }) => {
        const { db, familyId, member } = await requireParentWithFamily(request)
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

        const code = newPairCode()
        const expiresAt = new Date(Date.now() + PAIR_CODE_TTL_MINUTES * 60_000)
        await db.insert(schema.pairingCodes).values({
          codeHash: await sha256Hex(code),
          familyId,
          kidId: kid.id,
          createdById: member.id,
          expiresAt,
        })
        const res: PairingCodeResponse = {
          code,
          display: formatPairCode(code),
          url: pairUrl(code),
          expiresAt: expiresAt.toISOString(),
        }
        return res
      }),
    },
  },
})
