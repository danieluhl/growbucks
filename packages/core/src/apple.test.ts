import assert from "node:assert/strict"
import { before, describe, test } from "node:test"
import {
  APPLE_ISSUER,
  type AppleJwk,
  AppleTokenError,
  verifyAppleIdentityToken,
} from "./apple.ts"

const AUD = "cash.growbucks.app"
const NOW = new Date("2026-10-05T12:00:00Z")
const nowSec = Math.floor(NOW.getTime() / 1000)

const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
const encJson = (o: unknown) =>
  b64url(new TextEncoder().encode(JSON.stringify(o)))

let privateKey: CryptoKey
let otherKey: CryptoKey
let keys: AppleJwk[]

async function rsaPair() {
  return crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"]
  )
}

async function sign(
  claims: Record<string, unknown>,
  opts: { kid?: string; key?: CryptoKey; alg?: string } = {}
) {
  const h = encJson({ alg: opts.alg ?? "RS256", kid: opts.kid ?? "k1" })
  const p = encJson(claims)
  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    opts.key ?? privateKey,
    new TextEncoder().encode(`${h}.${p}`)
  )
  return `${h}.${p}.${b64url(new Uint8Array(sig))}`
}

const good = {
  iss: APPLE_ISSUER,
  aud: AUD,
  exp: nowSec + 600,
  iat: nowSec,
  sub: "001234.abcdef.1234",
  email: "dan@privaterelay.appleid.com",
}

const verify = (token: string) =>
  verifyAppleIdentityToken(token, { keys, audience: AUD, now: NOW })

describe("Apple identity tokens", () => {
  before(async () => {
    const pair = await rsaPair()
    privateKey = pair.privateKey
    otherKey = (await rsaPair()).privateKey
    const jwk = await crypto.subtle.exportKey("jwk", pair.publicKey)
    keys = [
      { kid: "k1", kty: "RSA", alg: "RS256", n: jwk.n ?? "", e: jwk.e ?? "" },
    ]
  })

  test("a valid token gives the Apple user id and email", async () => {
    assert.deepEqual(await verify(await sign(good)), {
      sub: good.sub,
      email: good.email,
    })
  })

  test("email is optional", async () => {
    const { email: _, ...noEmail } = good
    assert.equal((await verify(await sign(noEmail))).email, null)
  })

  const rejects = async (token: string | Promise<string>, why: RegExp) =>
    assert.rejects(verify(await token), (e: unknown) => {
      assert.ok(e instanceof AppleTokenError)
      assert.match(e.message, why)
      return true
    })

  test("rejects a token signed by someone else", () =>
    rejects(sign(good, { key: otherKey }), /signature/))

  test("rejects an unknown key id", () =>
    rejects(sign(good, { kid: "nope" }), /unknown key/))

  test("rejects a token for another app", () =>
    rejects(sign({ ...good, aud: "com.example.other" }), /audience/))

  test("rejects a token from another issuer", () =>
    rejects(sign({ ...good, iss: "https://evil.example" }), /issuer/))

  test("rejects an expired token", () =>
    rejects(sign({ ...good, exp: nowSec - 1 }), /expired/))

  test("rejects garbage", () => rejects("not.a.jwt", /malformed/))
})
