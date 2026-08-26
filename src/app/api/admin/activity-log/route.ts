import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mapActivityLog } from "@/lib/inventory";
import { requireAdmin, route } from "@/lib/validators";

// ─── GET /api/admin/activity-log — last 200 admin actions ───

export const GET = route(async () => {
  await requireAdmin();
  const logs = await db.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json({ logs: logs.map(mapActivityLog) });
});
