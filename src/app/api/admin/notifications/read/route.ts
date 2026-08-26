import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, route } from "@/lib/validators";

// ─── POST /api/admin/notifications/read — mark all admin notifications read ───

export const POST = route(async () => {
  await requireAdmin();
  await db.notification.updateMany({
    where: { role: "ADMIN", isRead: false },
    data: { isRead: true },
  });
  return NextResponse.json({});
});
