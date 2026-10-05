import type { AuthResponse, MeResponse } from "@growbucks/core/api"
import * as SecureStore from "expo-secure-store"
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { ApiClientError, call } from "./api"

/**
 * Who is signed in on this device. A parent's phone holds one parent
 * session, plus a kid session for each kid whose view the parent opened on
 * it; a kid's iPad holds one kid session per linked sibling, and the kid
 * picks who's using it. Tokens live in the Keychain (expo-secure-store),
 * one key per person; the index holds no secrets.
 */
export interface StoredSession {
  kind: AuthResponse["kind"]
  member: AuthResponse["member"]
  family: AuthResponse["family"]
}

interface SessionState {
  status: "loading" | "signedOut" | "signedIn"
  current: (StoredSession & { token: string }) | null
  all: StoredSession[]
  signIn: (auth: AuthResponse) => Promise<void>
  switchTo: (memberId: string) => Promise<void>
  signOut: (memberId?: string) => Promise<void>
  /** Sign everyone on this device out (a parent signing out). */
  signOutAll: () => Promise<void>
  /** Re-read /me (e.g. after creating the family) and store the result. */
  refresh: () => Promise<MeResponse | null>
}

const INDEX_KEY = "gb.sessions"
const ACTIVE_KEY = "gb.active"
const tokenKey = (memberId: string) => `gb.token.${memberId}`

const Ctx = createContext<SessionState | null>(null)

async function readIndex(): Promise<StoredSession[]> {
  const raw = await SecureStore.getItemAsync(INDEX_KEY)
  try {
    return raw ? (JSON.parse(raw) as StoredSession[]) : []
  } catch {
    return []
  }
}

const writeIndex = (all: StoredSession[]) =>
  SecureStore.setItemAsync(INDEX_KEY, JSON.stringify(all))

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionState["status"]>("loading")
  const [all, setAll] = useState<StoredSession[]>([])
  const [current, setCurrent] = useState<SessionState["current"]>(null)

  const activate = useCallback(
    async (list: StoredSession[], memberId?: string | null) => {
      // With no explicit pick, never fall back into a parent's view when a
      // kid is also on this phone: getting there takes the parent's Face ID.
      const pick =
        list.find((s) => s.member.id === memberId) ??
        list.find((s) => s.kind === "kid") ??
        list[0]
      const token = pick
        ? await SecureStore.getItemAsync(tokenKey(pick.member.id))
        : null
      setAll(list)
      if (pick && token) {
        setCurrent({ ...pick, token })
        await SecureStore.setItemAsync(ACTIVE_KEY, pick.member.id)
        setStatus("signedIn")
      } else {
        setCurrent(null)
        setStatus("signedOut")
      }
    },
    []
  )

  useEffect(() => {
    ;(async () => {
      const list = await readIndex()
      await activate(list, await SecureStore.getItemAsync(ACTIVE_KEY))
    })()
  }, [activate])

  const signIn = useCallback(
    async (auth: AuthResponse) => {
      await SecureStore.setItemAsync(tokenKey(auth.member.id), auth.token)
      const entry: StoredSession = {
        kind: auth.kind,
        member: auth.member,
        family: auth.family,
      }
      // A parent sign-in replaces everything; kid sessions stack (siblings,
      // or kids whose view a parent opened on their own phone).
      const list =
        auth.kind === "parent"
          ? [entry]
          : [...all.filter((s) => s.member.id !== auth.member.id), entry]
      await writeIndex(list)
      await activate(list, auth.member.id)
    },
    [all, activate]
  )

  const switchTo = useCallback(
    (memberId: string) => activate(all, memberId),
    [all, activate]
  )

  const signOut = useCallback(
    async (memberId?: string) => {
      const id = memberId ?? current?.member.id
      if (!id) return
      const token = await SecureStore.getItemAsync(tokenKey(id))
      if (token) await call("signOut", { token, body: {} }).catch(() => {})
      await SecureStore.deleteItemAsync(tokenKey(id))
      const list = all.filter((s) => s.member.id !== id)
      await writeIndex(list)
      await activate(list, null)
    },
    [all, current, activate]
  )

  const signOutAll = useCallback(async () => {
    for (const s of all) {
      const token = await SecureStore.getItemAsync(tokenKey(s.member.id))
      if (token) await call("signOut", { token, body: {} }).catch(() => {})
      await SecureStore.deleteItemAsync(tokenKey(s.member.id))
    }
    await writeIndex([])
    await activate([], null)
  }, [all, activate])

  const refresh = useCallback(async () => {
    if (!current) return null
    try {
      const me = await call("me", { token: current.token })
      const list = all.map((s) =>
        s.member.id === me.member.id
          ? { ...s, member: me.member, family: me.family }
          : s
      )
      await writeIndex(list)
      setAll(list)
      setCurrent({ ...current, member: me.member, family: me.family })
      return me
    } catch (error) {
      // Revoked from the parent's phone: drop this person from the device.
      if (error instanceof ApiClientError && error.status === 401)
        await signOut(current.member.id)
      return null
    }
  }, [all, current, signOut])

  const value = useMemo(
    () => ({
      status,
      current,
      all,
      signIn,
      switchTo,
      signOut,
      signOutAll,
      refresh,
    }),
    [status, current, all, signIn, switchTo, signOut, signOutAll, refresh]
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useSession() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error("useSession must be used inside <SessionProvider>")
  return ctx
}
