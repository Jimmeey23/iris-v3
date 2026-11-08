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
 */

const globalForPool = globalThis as unknown as { irisPool?: Pool };

function createPool() {
  const connectionString = process.env.NEON_DATABASE_URL;
  if (!connectionString) {
    throw new Error("NEON_DATABASE_URL is not set");
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

function getPool(): Pool {
  if (!globalForPool.irisPool) {
    globalForPool.irisPool = createPool();
  }
  return globalForPool.irisPool;
}

export const pool: Pool = new Proxy({} as Pool, {
  get(_target, prop) {
    const instance = getPool();
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

async function inTransaction<T>(fn: (c: PoolClient) => Promise<T>, prelude: string) {
  const client = await pool.connect();
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

/** Run queries as a signed-in user, with RLS enforced. */
export function withUser<T>(userId: string, fn: (c: PoolClient) => Promise<T>) {
  // userId is interpolated (simple protocol can't take params), so it must be a UUID.
  if (!UUID.test(userId)) throw new Error("Invalid user id");
  return inTransaction(
    fn,
    `select set_config('app.current_user_id', '${userId}', true); set local role iris_app; set local search_path = iris, public;`,
  );
}

/**
 * Run the SECURITY DEFINER auth functions (login, validate_session, ...).
 * Only for those functions - never for reading user data.
 */
export function asSystem<T>(fn: (c: PoolClient) => Promise<T>) {
  return inTransaction(fn, "set local search_path = iris, public;");
}
