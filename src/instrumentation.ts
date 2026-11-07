/**
 * Structured error logging for every uncaught server error, ported from iris-ai-v2's
 * instrumentation.ts (minus Sentry — add a DSN-shaped sink here if it is ever needed).
 *
 * Next.js calls onRequestError for Server Components, Route Handlers, Server Actions
 * and middleware. One JSON line per error goes to the server logs, carrying the digest
 * the error page shows — so a user's screenshot can be matched to a log line:
 *   { source: "onRequestError", message, digest, path, method, routeType, commit }
 */
export async function register(): Promise<void> {
  // No SDK to initialise: logs are the sink. Kept as the hook point for a future
  // error-reporting provider.
}

export async function onRequestError(
  error: unknown,
  request: { path: string; method: string; headers: Record<string, string | undefined> },
  context: { routeType: string; routePath?: string },
): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  const digest = typeof (error as { digest?: unknown })?.digest === "string" ? (error as { digest: string }).digest : undefined;
  console.log(
    JSON.stringify({
      source: "onRequestError",
      message: message.slice(0, 500),
      digest,
      path: request.path,
      method: request.method,
      routeType: context.routeType,
      routePath: context.routePath,
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
      at: new Date().toISOString(),
    }),
  );
}
