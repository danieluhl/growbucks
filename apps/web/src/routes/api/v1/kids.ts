import { addKidSchema } from "@growbucks/core/api"
import { createFileRoute } from "@tanstack/react-router"
import { schema } from "@/db"
import { api, parseBody } from "@/server/http"
import { requireParentWithFamily, toMember } from "@/server/session"

/** Parent adds a kid; the kid gets a savings account with the parent's rules. */
export const Route = createFileRoute("/api/v1/kids")({
  server: {
    handlers: {
      POST: api(async ({ request }) => {
        const { db, familyId } = await requireParentWithFamily(request)
        const body = await parseBody(request, addKidSchema)
        const kidId = crypto.randomUUID()
        const [[kid]] = await db.batch([
          db
            .insert(schema.members)
            .values({
              id: kidId,
              familyId,
              role: "kid",
              name: body.name,
              avatar: body.avatar,
            })
            .returning(),
          db.insert(schema.accounts).values({ kidId, ...body.rules }),
        ])
        if (!kid) throw new Error("kid insert returned nothing")
        return { kid: toMember(kid) }
      }),
    },
  },
})
