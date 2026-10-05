import { createFileRoute } from "@tanstack/react-router"
import { api } from "@/server/http"
import { meResponse, requireSession } from "@/server/session"

export const Route = createFileRoute("/api/v1/me")({
  server: {
    handlers: {
      GET: api(async ({ request }) =>
        meResponse(await requireSession(request))
      ),
    },
  },
})
