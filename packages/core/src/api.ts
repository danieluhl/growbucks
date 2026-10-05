/**
 * The HTTP contract between the app and the Worker API. The server parses
 * requests with these schemas; the app's typed client uses the same ones, so
 * a change here breaks both sides at compile time instead of at runtime.
 *
 * Auth: `Authorization: Bearer <token>`. Parents get a token by email code;
 * a kid device gets one by redeeming a pairing code.
 */
import { z } from "zod"
import { PAIR_ALPHABET, PAIR_CODE_LENGTH } from "./pairing.ts"
import { accountRulesSchema, nameSchema } from "./validators.ts"

export const API_PREFIX = "/api/v1"

export const deviceInfoSchema = z.object({
  /** e.g. "Maya's iPad" (from the OS, editable by parents later). */
  name: z.string().trim().min(1).max(60),
  platform: z.enum(["ios", "android", "web"]),
  model: z.string().max(60).optional(),
})

export const sessionKindSchema = z.enum(["parent", "kid"])

export const memberSchema = z.object({
  id: z.string(),
  role: z.enum(["parent", "kid"]),
  name: z.string(),
  avatar: z.string().nullable(),
})

export const familySchema = z.object({
  id: z.string(),
  name: z.string(),
  timezone: z.string(),
})

export const authResponseSchema = z.object({
  token: z.string(),
  kind: sessionKindSchema,
  member: memberSchema,
  family: familySchema.nullable(),
})

// ------------------------------------------------------------ parent auth

/** What the app gets back from Sign in with Apple, passed on to the server. */
export const appleSignInSchema = z.object({
  identityToken: z.string().min(1).max(4096),
  /** Apple only shares the name the first time someone signs in. */
  givenName: z.string().trim().max(60).nullish(),
  device: deviceInfoSchema,
})

/** Local development only: sign in as a test parent without Apple. */
export const devSignInSchema = z.object({
  name: z.string().trim().min(1).max(60),
  device: deviceInfoSchema,
})

// ---------------------------------------------------------------- family

export const createFamilySchema = z.object({
  familyName: nameSchema,
  parentName: nameSchema,
  timezone: z.string().min(1).max(64),
})

export const addKidSchema = z.object({
  name: nameSchema,
  avatar: z.string().max(16).optional(),
  rules: accountRulesSchema,
})

// --------------------------------------------------------------- pairing

export const pairingCodeResponseSchema = z.object({
  code: z.string(),
  /** Pretty version for display, "K7MQ-4XRT". */
  display: z.string(),
  /** QR payload: growbucks://pair/<code>. */
  url: z.string(),
  expiresAt: z.string(),
})

export const redeemPairingCodeSchema = z.object({
  code: z
    .string()
    .length(PAIR_CODE_LENGTH)
    .refine((c) => [...c].every((ch) => PAIR_ALPHABET.includes(ch))),
  device: deviceInfoSchema,
})

export const deviceSchema = z.object({
  id: z.string(),
  name: z.string(),
  platform: z.string(),
  /** Kids signed in on this device (a shared iPad can hold siblings). */
  kids: z.array(memberSchema),
  lastSeenAt: z.string().nullable(),
  isThisDevice: z.boolean(),
})

export const devicesResponseSchema = z.object({
  devices: z.array(deviceSchema),
})

export const pushTokenSchema = z.object({ expoPushToken: z.string().max(200) })

export const meResponseSchema = z.object({
  kind: sessionKindSchema,
  member: memberSchema,
  family: familySchema.nullable(),
  kids: z.array(memberSchema),
})

export const apiErrorSchema = z.object({
  error: z.string(),
  message: z.string(),
  issues: z.array(z.unknown()).optional(),
})

export type DeviceInfo = z.infer<typeof deviceInfoSchema>
export type AuthResponse = z.infer<typeof authResponseSchema>
export type MeResponse = z.infer<typeof meResponseSchema>
export type PairingCodeResponse = z.infer<typeof pairingCodeResponseSchema>
export type DevicesResponse = z.infer<typeof devicesResponseSchema>
export type ApiError = z.infer<typeof apiErrorSchema>

/**
 * Endpoint table used by the app's client. `path` builders keep params typed.
 */
export const endpoints = {
  appleSignIn: {
    method: "POST",
    path: () => `${API_PREFIX}/auth/apple`,
    body: appleSignInSchema,
    response: authResponseSchema,
  },
  devSignIn: {
    method: "POST",
    path: () => `${API_PREFIX}/auth/dev`,
    body: devSignInSchema,
    response: authResponseSchema,
  },
  signOut: {
    method: "POST",
    path: () => `${API_PREFIX}/auth/sign-out`,
    body: z.object({}),
    response: z.object({ ok: z.literal(true) }),
  },
  me: {
    method: "GET",
    path: () => `${API_PREFIX}/me`,
    body: null,
    response: meResponseSchema,
  },
  createFamily: {
    method: "POST",
    path: () => `${API_PREFIX}/families`,
    body: createFamilySchema,
    response: meResponseSchema,
  },
  addKid: {
    method: "POST",
    path: () => `${API_PREFIX}/kids`,
    body: addKidSchema,
    response: z.object({ kid: memberSchema }),
  },
  createPairingCode: {
    method: "POST",
    path: (p: { kidId: string }) =>
      `${API_PREFIX}/kids/${p.kidId}/pairing-code`,
    body: z.object({}),
    response: pairingCodeResponseSchema,
  },
  openKidView: {
    method: "POST",
    path: (p: { kidId: string }) => `${API_PREFIX}/kids/${p.kidId}/session`,
    body: z.object({}),
    response: authResponseSchema,
  },
  redeemPairingCode: {
    method: "POST",
    path: () => `${API_PREFIX}/pair`,
    body: redeemPairingCodeSchema,
    response: authResponseSchema,
  },
  listDevices: {
    method: "GET",
    path: () => `${API_PREFIX}/devices`,
    body: null,
    response: devicesResponseSchema,
  },
  removeDevice: {
    method: "DELETE",
    path: (p: { deviceId: string }) => `${API_PREFIX}/devices/${p.deviceId}`,
    body: null,
    response: z.object({ ok: z.literal(true) }),
  },
  setPushToken: {
    method: "POST",
    path: () => `${API_PREFIX}/devices/push-token`,
    body: pushTokenSchema,
    response: z.object({ ok: z.literal(true) }),
  },
} as const

export type Endpoints = typeof endpoints
export type EndpointName = keyof Endpoints
