import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mapNotification } from "@/lib/inventory";
import { requireAdmin, route } from "@/lib/validators";

// ─── GET /api/admin/notifications — admin bell feed ───

export const GET = route(async () => {
  await requireAdmin();
  const notifications = await db.notification.findMany({
    where: { role: "ADMIN" },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({
    notifications: notifications.map(mapNotification),
  });
});
