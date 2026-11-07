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
  });
}

export const pool = globalForPool.irisPool ?? createPool();
if (process.env.NODE_ENV !== "production") globalForPool.irisPool = pool;

async function inTransaction<T>(fn: (c: PoolClient) => Promise<T>, setup: (c: PoolClient) => Promise<void>) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await setup(client);
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
  return inTransaction(fn, async (c) => {
    await c.query("select set_config('app.current_user_id', $1, true)", [userId]);
    await c.query("set local role iris_app");
    await c.query("set local search_path = iris, public");
  });
}

/**
 * Run the SECURITY DEFINER auth functions (login, validate_session, ...).
 * Only for those functions — never for reading user data.
 */
export function asSystem<T>(fn: (c: PoolClient) => Promise<T>) {
  return inTransaction(fn, async (c) => {
    await c.query("set local search_path = iris, public");
  });
}
