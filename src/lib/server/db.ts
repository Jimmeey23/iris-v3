import "server-only";
import { Pool, type PoolClient } from "pg";

/**
 * Neon connection for the `iris` schema.
 *
 * Every user request runs inside a transaction that:
 *   1. sets app.current_user_id (read by the RLS helper functions), and
 *   2. switches to the `iris_app` role, so row-level security is enforced.
 * The connection's own role (neondb_owner) bypasses RLS, so never query
 * iris.* for a user outside `withUser`.
 *
 * Training sandbox
 * ----------------
 * When SANDBOX_DATABASE_URL is set, an admin who has switched on the training
 * sandbox (cookie `iris_sandbox=1`, set by POST /api/sandbox) has every query
 * of their request sent to that separate database instead: same schema, same
 * triggers, same RLS, same routes, but mock tickets and no effect on the real
 * one. The cookie alone is not trusted: the session is re-checked against the
 * REAL database and must belong to an admin, otherwise the request stays on
 * the real database. Requests with no request scope (crons, scripts) always
 * use the real database. Sign-in and sessions always live in the real one.
 */

export const SANDBOX_COOKIE = "iris_sandbox";
/** Access level an admin is practising as inside the sandbox (admin | manager | executive). */
export const SANDBOX_TIER_COOKIE = "iris_sandbox_tier";
export type SandboxTier = "admin" | "manager" | "executive";
export const SANDBOX_TIERS: readonly SandboxTier[] = ["admin", "manager", "executive"];
const SESSION_COOKIE = "iris_session";

const globalForPool = globalThis as unknown as { irisPool?: Pool; irisSandboxPool?: Pool };

function createPool(connectionString: string | undefined, name: string) {
  if (!connectionString) {
    throw new Error(`${name} is not set`);
  }
  return new Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 15_000, // Neon may need a moment to wake up
    // Never let one stuck query hang a request (and every request queued behind it) forever.
    query_timeout: 25_000,
  });
}

export function getMainPool(): Pool {
  if (!globalForPool.irisPool) {
    globalForPool.irisPool = createPool(process.env.NEON_DATABASE_URL, "NEON_DATABASE_URL");
  }
  return globalForPool.irisPool;
}

export function sandboxConfigured(): boolean {
  return !!process.env.SANDBOX_DATABASE_URL && process.env.SANDBOX_DATABASE_URL !== process.env.NEON_DATABASE_URL;
}

/** The training sandbox's own pool. Only for sandbox code paths. */
export function getSandboxPool(): Pool {
  if (!sandboxConfigured()) throw new Error("SANDBOX_DATABASE_URL is not set");
  if (!globalForPool.irisSandboxPool) {
    globalForPool.irisSandboxPool = createPool(process.env.SANDBOX_DATABASE_URL, "SANDBOX_DATABASE_URL");
  }
  return globalForPool.irisSandboxPool;
}

// token -> { admin, at }: avoids a session lookup per query. Short-lived so a
// demoted admin drops out of the sandbox within a minute.
const adminCache = new Map<string, { admin: boolean; at: number }>();
const ADMIN_CACHE_MS = 60_000;

async function tokenIsAdmin(token: string): Promise<boolean> {
  const hit = adminCache.get(token);
  if (hit && Date.now() - hit.at < ADMIN_CACHE_MS) return hit.admin;
  const client = await getMainPool().connect();
  let admin = false;
  try {
    await client.query("begin; set local search_path = iris, public;");
    const row = (await client.query("select * from iris.validate_session($1)", [token])).rows[0];
    await client.query("commit");
    admin = !!row && row.role === "admin" && !row.must_change_password;
  } catch {
    await client.query("rollback").catch(() => {});
    admin = false;
  } finally {
    client.release();
  }
  if (adminCache.size > 500) adminCache.clear();
  adminCache.set(token, { admin, at: Date.now() });
  return admin;
}

/**
 * True when the current request is an admin working in the training sandbox.
 * False outside a request scope, when no sandbox is configured, or for anyone
 * who is not an admin (whatever cookies they send).
 */
export async function isSandboxRequest(): Promise<boolean> {
  if (!sandboxConfigured()) return false;
  let sandboxOn = false;
  let token: string | undefined;
  try {
    const { cookies } = await import("next/headers");
    const jar = await cookies();
    sandboxOn = jar.get(SANDBOX_COOKIE)?.value === "1";
    token = jar.get(SESSION_COOKIE)?.value;
  } catch {
    return false; // no request scope (cron, script, test)
  }
  if (!sandboxOn || !token) return false;
  return tokenIsAdmin(token);
}

/**
 * The access level to apply for this request: the tier an admin picked when entering
 * the training sandbox, or null outside the sandbox (use the real role).
 */
export async function sandboxTier(): Promise<SandboxTier | null> {
  if (!(await isSandboxRequest())) return null;
  try {
    const { cookies } = await import("next/headers");
    const v = (await cookies()).get(SANDBOX_TIER_COOKIE)?.value as SandboxTier | undefined;
    return v && SANDBOX_TIERS.includes(v) ? v : "admin";
  } catch {
    return null;
  }
}

async function currentPool(): Promise<Pool> {
  return (await isSandboxRequest()) ? getSandboxPool() : getMainPool();
}

/**
 * The request's pool: the real database, or the training sandbox for an admin
 * who switched it on. `query` and `connect` are routed per request; anything
 * else is read from the real pool.
 */
export const pool: Pool = new Proxy({} as Pool, {
  get(_target, prop) {
    if (prop === "query") {
      return async (...args: unknown[]) => {
        const p = await currentPool();
        return (p.query as (...a: unknown[]) => unknown)(...args);
      };
    }
    if (prop === "connect") {
      return async () => (await currentPool()).connect();
    }
    const instance = getMainPool();
    const val = Reflect.get(instance, prop, instance);
    return typeof val === "function" ? val.bind(instance) : val;
  },
});

/**
 * `prelude` runs in the same round trip as BEGIN (multi-statement simple
 * query). The database is far away (~250ms per round trip), so each saved
 * trip matters on every request.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function inTransaction<T>(target: Pool, fn: (c: PoolClient) => Promise<T>, prelude: string) {
  const client = await target.connect();
  try {
    await client.query(`begin; ${prelude}`);
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (err) {
    await client.query("rollback").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

function userPrelude(userId: string) {
  // userId is interpolated (simple protocol can't take params), so it must be a UUID.
  if (!UUID.test(userId)) throw new Error("Invalid user id");
  return `select set_config('app.current_user_id', '${userId}', true); set local role iris_app; set local search_path = iris, public;`;
}
const SYSTEM_PRELUDE = "set local search_path = iris, public;";

/** Run queries as a signed-in user, with RLS enforced (sandbox-aware). */
export async function withUser<T>(userId: string, fn: (c: PoolClient) => Promise<T>) {
  const prelude = userPrelude(userId);
  return inTransaction(await currentPool(), fn, prelude);
}

/**
 * Run the SECURITY DEFINER auth functions (login, validate_session, ...).
 * Only for those functions - never for reading user data. Sandbox-aware.
 */
export async function asSystem<T>(fn: (c: PoolClient) => Promise<T>) {
  return inTransaction(await currentPool(), fn, SYSTEM_PRELUDE);
}

/** Always the REAL database: sign-in, sessions, passwords. Never the sandbox. */
export function withUserMain<T>(userId: string, fn: (c: PoolClient) => Promise<T>) {
  return inTransaction(getMainPool(), fn, userPrelude(userId));
}
/** Always the REAL database: sign-in, sessions, passwords. Never the sandbox. */
export function asSystemMain<T>(fn: (c: PoolClient) => Promise<T>) {
  return inTransaction(getMainPool(), fn, SYSTEM_PRELUDE);
}
/**
 * The real database's pool, ignoring the sandbox cookie. Background machinery
 * (sweeps, outbox drain) must use this: a sweep piggy-backed on a sandbox admin's
 * request would otherwise drain the sandbox outbox and skip production's.
 */
export const mainPool: Pool = new Proxy({} as Pool, {
  get(_target, prop) {
    const instance = getMainPool();
    const val = Reflect.get(instance, prop, instance);
    return typeof val === "function" ? val.bind(instance) : val;
  },
});
/** Always the sandbox database (admin sandbox tooling only). */
export function asSandboxSystem<T>(fn: (c: PoolClient) => Promise<T>) {
  return inTransaction(getSandboxPool(), fn, SYSTEM_PRELUDE);
}
