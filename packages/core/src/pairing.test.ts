import assert from "node:assert/strict"
import { describe, test } from "node:test"
import {
  formatPairCode,
  newPairCode,
  newSessionToken,
  PAIR_ALPHABET,
  pairUrl,
  parsePairInput,
  sha256Hex,
} from "./pairing.ts"

describe("pairing codes", () => {
  test("are 8 unambiguous characters", () => {
    for (let i = 0; i < 200; i++) {
      const code = newPairCode()
      assert.equal(code.length, 8)
      for (const ch of code) assert.ok(PAIR_ALPHABET.includes(ch), ch)
    }
  })

  test("parse typed and scanned input", () => {
    assert.equal(parsePairInput("k7mq 4xrt"), "K7MQ4XRT")
    assert.equal(parsePairInput(" K7MQ-4XRT "), "K7MQ4XRT")
    assert.equal(parsePairInput(pairUrl("K7MQ4XRT")), "K7MQ4XRT")
    assert.equal(parsePairInput(formatPairCode("K7MQ4XRT")), "K7MQ4XRT")
  })

  test("reject wrong length and ambiguous characters", () => {
    assert.equal(parsePairInput("K7MQ4XR"), null)
    assert.equal(parsePairInput("K7MQ4XR0"), null)
    assert.equal(parsePairInput("K7MQ4XRI"), null)
  })
})

describe("tokens", () => {
  test("session tokens are 43-char base64url and unique", () => {
    const a = newSessionToken()
    assert.match(a, /^[A-Za-z0-9_-]{43}$/)
    assert.notEqual(a, newSessionToken())
  })

  test("sha256Hex", async () => {
    assert.equal(
      await sha256Hex("abc"),
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    )
  })
})
