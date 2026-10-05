import { env } from "cloudflare:workers"
import type { ApiError } from "@growbucks/core/api"
import type { z } from "zod"

/** Throw from a handler to send a JSON error; `api()` turns it into a Response. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly issues?: unknown[]
  ) {
    super(message)
  }
}

export const unauthorized = () =>
  new HttpError(401, "unauthorized", "Sign in again to continue.")
export const forbidden = (message = "You can't do that.") =>
  new HttpError(403, "forbidden", message)
export const notFound = (what = "That") =>
  new HttpError(404, "not_found", `${what} doesn't exist.`)

type Handler<P> = (ctx: { request: Request; params: P }) => Promise<unknown>

/**
 * Wrap a server-route handler: JSON in/out, HttpError → JSON error body,
 * anything else → 500 without leaking details.
 */
export function api<P = Record<string, never>>(handler: Handler<P>) {
  return async (ctx: { request: Request; params: P }) => {
    try {
      const data = await handler(ctx)
      return Response.json(data)
    } catch (error) {
      if (error instanceof HttpError) {
        const body: ApiError = {
          error: error.code,
          message: error.message,
          ...(error.issues && { issues: error.issues }),
        }
        return Response.json(body, { status: error.status })
      }
      console.error(error)
      const body: ApiError = {
        error: "server_error",
        message: "Something went wrong on our side. Try again in a moment.",
      }
      return Response.json(body, { status: 500 })
    }
  }
}

export async function parseBody<S extends z.ZodType>(
  request: Request,
  schema: S
): Promise<z.infer<S>> {
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    throw new HttpError(400, "bad_json", "The request body isn't valid JSON.")
  }
  const result = schema.safeParse(raw)
  if (!result.success)
    throw new HttpError(
      400,
      "invalid_input",
      "Some fields need fixing.",
      result.error.issues
    )
  return result.data
}

/** Per-key throttle backed by the Workers rate-limit binding. */
export async function throttle(key: string) {
  const { success } = await env.AUTH_LIMITER.limit({ key })
  if (!success)
    throw new HttpError(
      429,
      "too_many_attempts",
      "Too many tries. Wait a minute and try again."
    )
}

export const clientIp = (request: Request) =>
  request.headers.get("cf-connecting-ip") ?? "local"
