import { env } from "cloudflare:workers"
import {
  APPLE_KEYS_URL,
  type AppleJwk,
  AppleTokenError,
  verifyAppleIdentityToken,
} from "@growbucks/core/apple"
import { HttpError } from "./http"

const KEYS_TTL_MS = 60 * 60_000

let cached: { keys: AppleJwk[]; at: number } | null = null

async function appleKeys(force = false) {
  if (!force && cached && Date.now() - cached.at < KEYS_TTL_MS)
    return cached.keys
  const res = await fetch(APPLE_KEYS_URL).catch(() => null)
  if (!res?.ok) {
    console.error(`Apple keys fetch failed: ${res?.status ?? "network"}`)
    throw new HttpError(
      503,
      "apple_unreachable",
      "Couldn't reach Apple to check your sign-in. Try again in a moment."
    )
  }
  const { keys } = (await res.json()) as { keys: AppleJwk[] }
  cached = { keys, at: Date.now() }
  return keys
}

/**
 * Check a Sign in with Apple identity token. Apple rotates its keys, so an
 * unknown key id refetches them once before giving up.
 */
export async function verifyAppleToken(token: string) {
  const audience = env.APPLE_BUNDLE_ID
  try {
    try {
      return await verifyAppleIdentityToken(token, {
        keys: await appleKeys(),
        audience,
      })
    } catch (e) {
      if (!(e instanceof AppleTokenError && e.message === "unknown key"))
        throw e
      return await verifyAppleIdentityToken(token, {
        keys: await appleKeys(true),
        audience,
      })
    }
  } catch (e) {
    if (!(e instanceof AppleTokenError)) throw e
    throw new HttpError(
      401,
      "apple_sign_in_failed",
      "Apple sign-in didn't go through. Try again."
    )
  }
}
