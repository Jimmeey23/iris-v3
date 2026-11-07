import { NextResponse } from "next/server";
import { withUser } from "@/lib/server/db";
import { dbError, getSession } from "@/lib/server/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ user: null }, { status: 401 });
  try {
    const data = await withUser(session.user_id, async (c) => {
      const emp = session.employee_id
        ? (await c.query("select id, name, role, title, department_code from employees where id = $1", [session.employee_id])).rows[0]
        : null;
      const prefs = (await c.query("select * from user_preferences where user_id = $1", [session.user_id])).rows[0] ?? null;
      return { emp, prefs };
    });
    return NextResponse.json({
      user: {
        userId: session.user_id,
        email: session.email,
        tier: session.role,
        mustChangePassword: session.must_change_password,
        employeeId: session.employee_id,
        name: data.emp?.name ?? session.email,
        role: data.emp?.role ?? session.role,
        departmentCode: data.emp?.department_code ?? null,
      },
      preferences: data.prefs,
    });
  } catch (err) {
    return dbError(err);
  }
}
