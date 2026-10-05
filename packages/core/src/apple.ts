/**
 * Sign in with Apple: check the identity token the app gets from
 * `AppleAuthentication.signInAsync()` before trusting who it says it is.
 *
 * The token is a JWT signed (RS256) by one of Apple's published keys
 * (https://appleid.apple.com/auth/keys). We check the signature, issuer,
 * audience (our bundle id) and expiry, then key the parent on `sub`, which is
 * stable for one Apple ID within our team.
 *
 * Web Crypto only, so it runs on the Worker and under node's test runner.
 */

export const APPLE_ISSUER = "https://appleid.apple.com"
export const APPLE_KEYS_URL = "https://appleid.apple.com/auth/keys"

export interface AppleJwk {
  kid: string
  kty: string
  alg?: string
  use?: string
  n: string
  e: string
}

export interface AppleIdentity {
  /** Stable user id for this Apple ID in our team. */
  sub: string
  /** Only present when the user shares it; may be a private relay address. */
  email: string | null
}

export class AppleTokenError extends Error {}

const decoder = new TextDecoder()

function base64UrlBytes(s: string) {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/")
  const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4))
  return Uint8Array.from(bin, (ch) => ch.charCodeAt(0))
}

function decodePart(s: string): Record<string, unknown> {
  try {
    return JSON.parse(decoder.decode(base64UrlBytes(s)))
  } catch {
    throw new AppleTokenError("malformed token")
  }
}

/**
 * Verify an Apple identity token and return who it belongs to.
 * Throws AppleTokenError if anything doesn't check out.
 */
export async function verifyAppleIdentityToken(
  token: string,
  opts: { keys: AppleJwk[]; audience: string; now?: Date }
): Promise<AppleIdentity> {
  const parts = token.split(".")
  if (parts.length !== 3) throw new AppleTokenError("malformed token")
  const [h, p, sig] = parts as [string, string, string]
  const header = decodePart(h)
  const claims = decodePart(p)

  if (header.alg !== "RS256") throw new AppleTokenError("unexpected alg")
  const jwk = opts.keys.find((k) => k.kid === header.kid)
  if (!jwk) throw new AppleTokenError("unknown key")

  const key = await crypto.subtle.importKey(
    "jwk",
    { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: "RS256", ext: true },
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  )
  const ok = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    base64UrlBytes(sig),
    new TextEncoder().encode(`${h}.${p}`)
  )
  if (!ok) throw new AppleTokenError("bad signature")

  if (claims.iss !== APPLE_ISSUER) throw new AppleTokenError("wrong issuer")
  const aud = claims.aud
  if (
    aud !== opts.audience &&
    !(Array.isArray(aud) && aud.includes(opts.audience))
  )
    throw new AppleTokenError("wrong audience")
  const nowSec = Math.floor((opts.now ?? new Date()).getTime() / 1000)
  if (typeof claims.exp !== "number" || claims.exp < nowSec)
    throw new AppleTokenError("expired")
  if (typeof claims.sub !== "string" || !claims.sub)
    throw new AppleTokenError("missing subject")

  return {
    sub: claims.sub,
    email: typeof claims.email === "string" ? claims.email : null,
  }
}
