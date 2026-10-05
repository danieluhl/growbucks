import {
  type EndpointName,
  type Endpoints,
  endpoints,
} from "@growbucks/core/api"
import Constants from "expo-constants"
import type { z } from "zod"

/**
 * API base URL. Set EXPO_PUBLIC_API_URL for builds; in development the app
 * talks to the machine running `expo start`, port 3000 (`pnpm dev:api`).
 */
export function apiBase() {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL
  if (fromEnv) return fromEnv.replace(/\/$/, "")
  const host = Constants.expoConfig?.hostUri?.split(":")[0] ?? "localhost"
  return `http://${host}:3000`
}

type Ep<N extends EndpointName> = Endpoints[N]
type PathParams<N extends EndpointName> = Parameters<Ep<N>["path"]>[0]
type Body<N extends EndpointName> = Ep<N>["body"] extends z.ZodType
  ? z.input<Ep<N>["body"]>
  : undefined
export type Res<N extends EndpointName> = z.infer<Ep<N>["response"]>

export class ApiClientError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string
  ) {
    super(message)
  }
}

/**
 * Typed call into the Worker API. Request and response shapes come from
 * @growbucks/core/api, the same schemas the server validates with.
 */
export async function call<N extends EndpointName>(
  name: N,
  opts: {
    params?: PathParams<N>
    body?: Body<N>
    token?: string | null
  } = {}
): Promise<Res<N>> {
  const ep = endpoints[name]
  const path = (ep.path as (p: unknown) => string)(opts.params)
  let res: Response
  try {
    res = await fetch(`${apiBase()}${path}`, {
      method: ep.method,
      headers: {
        accept: "application/json",
        ...(opts.body !== undefined && { "content-type": "application/json" }),
        ...(opts.token && { authorization: `Bearer ${opts.token}` }),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    })
  } catch {
    throw new ApiClientError(
      0,
      "offline",
      "Can't reach GrowBucks. Check the internet connection and try again."
    )
  }

  const json: unknown = await res.json().catch(() => null)
  if (!res.ok) {
    const err = json as { error?: string; message?: string } | null
    throw new ApiClientError(
      res.status,
      err?.error ?? "http_error",
      err?.message ?? `Something went wrong (${res.status}).`
    )
  }
  return (ep.response as unknown as z.ZodType<Res<N>>).parse(json)
}
