/**
 * Codes and tokens for signing in and linking a kid's device.
 *
 * - Kid device linking: the parent's phone shows an 8-character pairing code
 *   (and a QR code of `growbucks://pair/<code>`). The kid's iPad scans or
 *   types it and receives its own kid-only session token.
 * - Session tokens: 32 random bytes, base64url. Only SHA-256 hashes of codes
 *   and tokens are stored server-side.
 *
 * Generation and hashing use Web Crypto and run on the server (Workers).
 * The app only uses the parsing/formatting helpers.
 */

/** No 0/O, 1/I/L so codes survive being read aloud or typed by a kid. */
export const PAIR_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"
export const PAIR_CODE_LENGTH = 8
export const PAIR_CODE_TTL_MINUTES = 10

export const PAIR_URL_PREFIX = "growbucks://pair/"

/** Uniform random characters from `alphabet` (rejection sampling). */
export function randomString(alphabet: string, length: number) {
  const max = 256 - (256 % alphabet.length)
  let out = ""
  while (out.length < length) {
    const bytes = crypto.getRandomValues(new Uint8Array(length * 2))
    for (const b of bytes) {
      if (b < max && out.length < length) out += alphabet[b % alphabet.length]
    }
  }
  return out
}

export const newPairCode = () => randomString(PAIR_ALPHABET, PAIR_CODE_LENGTH)

export function newSessionToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  let bin = ""
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

export async function sha256Hex(text: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text)
  )
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

/** "K7MQ4XRT" → "K7MQ-4XRT" for display. */
export function formatPairCode(code: string) {
  return `${code.slice(0, 4)}-${code.slice(4)}`
}

/**
 * Accepts what a kid might type or a scanned QR: "k7mq 4xrt", "K7MQ-4XRT",
 * "growbucks://pair/K7MQ4XRT". Returns the canonical code or null.
 */
export function parsePairInput(input: string) {
  let raw = input.trim()
  if (raw.toLowerCase().startsWith(PAIR_URL_PREFIX))
    raw = raw.slice(PAIR_URL_PREFIX.length)
  const code = raw.toUpperCase().replace(/[\s-]/g, "")
  if (code.length !== PAIR_CODE_LENGTH) return null
  for (const ch of code) if (!PAIR_ALPHABET.includes(ch)) return null
  return code
}

export const pairUrl = (code: string) => `${PAIR_URL_PREFIX}${code}`
