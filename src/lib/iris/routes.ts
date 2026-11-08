import type { ViewName } from "./store";

/**
 * Each view has a real, shareable URL. The page itself stays one static document:
 * next.config rewrites these paths to "/", and the client maps the path to a view.
 *   /tickets/<P57-00142 | id>  opens that ticket.
 */
export const VIEW_PATH: Record<ViewName, string> = {
  overview: "/dashboard",
  ai_assistant: "/ai",
  all_tickets: "/tickets",
  my_tickets: "/my-tickets",
  department_queue: "/department",
  escalations: "/escalations",
  trainers: "/trainers",
  equipment: "/equipment",
  radar: "/radar",
  analytics: "/analytics",
  knowledge_base: "/knowledge-base",
  templates: "/templates",
  reports: "/reports",
  momence: "/momence",
  email_templates: "/email-templates",
  settings: "/settings",
};

const PATH_VIEW = Object.fromEntries(Object.entries(VIEW_PATH).map(([v, p]) => [p.slice(1), v as ViewName]));

/** Path segments that next.config rewrites to the app (keep in sync with VIEW_PATH). */
export const ROUTE_SEGMENTS = Object.values(VIEW_PATH).map((p) => p.slice(1));

export function parseAppPath(pathname: string): { view: ViewName | null; ticket: string | null } {
  const [first, second] = pathname.replace(/^\/+|\/+$/g, "").split("/");
  if (!first) return { view: null, ticket: null };
  const view = PATH_VIEW[first] ?? null;
  const ticket = view && second ? decodeURIComponent(second) : null;
  return { view, ticket };
}

export function pathFor(view: ViewName, ticketRef?: string | null): string {
  const base = VIEW_PATH[view] ?? "/dashboard";
  return ticketRef ? `${base}/${encodeURIComponent(ticketRef)}` : base;
}
