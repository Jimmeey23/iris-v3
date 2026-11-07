import { NextResponse } from "next/server";
import { withUser } from "@/lib/server/db";
import { dbError, requireSession } from "@/lib/server/auth";

/** Lookup data every screen uses: employees, departments, studios, SLA targets. */
export async function GET() {
  const auth = await requireSession();
  if ("error" in auth) return auth.error;
  try {
    const data = await withUser(auth.session.user_id, async (c) => ({
      employees: (await c.query("select * from employees where is_active order by name")).rows,
      departments: (await c.query("select * from departments where is_active order by name")).rows,
      studios: (await c.query("select * from studios where is_active order by name")).rows,
      sla: (await c.query("select * from sla_definitions order by priority")).rows,
    }));
    return NextResponse.json(data);
  } catch (err) {
    return dbError(err);
  }
}
