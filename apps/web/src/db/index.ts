import { env } from "cloudflare:workers"
import { drizzle } from "drizzle-orm/d1"
import * as schema from "./schema"

/** Server-only. Call inside server functions / server routes. */
export function getDb() {
  return drizzle(env.DB, { schema })
}

export type Db = ReturnType<typeof getDb>
export { schema }
