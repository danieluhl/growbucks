import type { AuthResponse, DeviceInfo, MeResponse } from "@growbucks/core/api"
import { newSessionToken, sha256Hex } from "@growbucks/core/pairing"
import { and, asc, eq, isNull } from "drizzle-orm"
import { type Db, getDb, schema } from "@/db"
import type { Family, Member } from "@/db/schema"
import { forbidden, unauthorized } from "./http"

const { sessions, members, devices, families } = schema

const TOUCH_EVERY_MS = 5 * 60_000

export interface SessionContext {
  db: Db
  sessionId: string
  deviceId: string
  kind: "parent" | "kid"
  member: Member
}

/** Resolve the bearer token, or null if missing/invalid/revoked. */
export async function getSession(
  request: Request
): Promise<SessionContext | null> {
  const header = request.headers.get("authorization")
  if (!header?.startsWith("Bearer ")) return null
  const db = getDb()
  const tokenHash = await sha256Hex(header.slice(7).trim())
  const row = await db
    .select({ session: sessions, member: members })
    .from(sessions)
    .innerJoin(members, eq(sessions.memberId, members.id))
    .where(and(eq(sessions.tokenHash, tokenHash), isNull(sessions.revokedAt)))
    .get()
  if (!row) return null

  const now = Date.now()
  if (
    !row.session.lastSeenAt ||
    now - row.session.lastSeenAt.getTime() > TOUCH_EVERY_MS
  ) {
    const at = new Date(now)
    await db.batch([
      db
        .update(sessions)
        .set({ lastSeenAt: at })
        .where(eq(sessions.id, row.session.id)),
      db
        .update(devices)
        .set({ lastSeenAt: at })
        .where(eq(devices.id, row.session.deviceId)),
    ])
  }

  return {
    db,
    sessionId: row.session.id,
    deviceId: row.session.deviceId,
    kind: row.session.kind,
    member: row.member,
  }
}

export async function requireSession(
  request: Request,
  kind?: "parent" | "kid"
) {
  const ctx = await getSession(request)
  if (!ctx) throw unauthorized()
  if (kind && ctx.kind !== kind)
    throw forbidden(
      kind === "parent"
        ? "Only a parent can do that."
        : "Only a kid can do that."
    )
  return ctx
}

/** Parent who already belongs to a family. */
export async function requireParentWithFamily(request: Request) {
  const ctx = await requireSession(request, "parent")
  const familyId = ctx.member.familyId
  if (!familyId) throw forbidden("Create your family first.")
  return { ...ctx, familyId }
}

export async function createDevice(
  db: Db,
  info: DeviceInfo,
  familyId: string | null
) {
  const id = crypto.randomUUID()
  await db.insert(devices).values({
    id,
    familyId,
    name: info.name,
    platform: info.platform,
    model: info.model,
    lastSeenAt: new Date(),
  })
  return id
}

/** Issue a new token. The raw token is returned once and never stored. */
export async function createSession(
  db: Db,
  opts: { memberId: string; deviceId: string; kind: "parent" | "kid" }
) {
  const token = newSessionToken()
  await db.insert(sessions).values({
    tokenHash: await sha256Hex(token),
    memberId: opts.memberId,
    deviceId: opts.deviceId,
    kind: opts.kind,
    lastSeenAt: new Date(),
  })
  return token
}

const toMember = (m: Member) => ({
  id: m.id,
  role: m.role,
  name: m.name,
  avatar: m.avatar,
})

const toFamily = (f: Family | undefined) =>
  f ? { id: f.id, name: f.name, timezone: f.timezone } : null

export async function authResponse(
  db: Db,
  token: string,
  kind: "parent" | "kid",
  member: Member
): Promise<AuthResponse> {
  const family = member.familyId
    ? await db
        .select()
        .from(families)
        .where(eq(families.id, member.familyId))
        .get()
    : undefined
  return { token, kind, member: toMember(member), family: toFamily(family) }
}

export async function meResponse(ctx: SessionContext): Promise<MeResponse> {
  const { db, member } = ctx
  const family = member.familyId
    ? await db
        .select()
        .from(families)
        .where(eq(families.id, member.familyId))
        .get()
    : undefined
  const kids =
    ctx.kind === "kid"
      ? [member]
      : member.familyId
        ? await db
            .select()
            .from(members)
            .where(
              and(
                eq(members.familyId, member.familyId),
                eq(members.role, "kid")
              )
            )
            .orderBy(asc(members.createdAt))
            .all()
        : []
  return {
    kind: ctx.kind,
    member: toMember(member),
    family: toFamily(family),
    kids: kids.map(toMember),
  }
}

export { toMember }
