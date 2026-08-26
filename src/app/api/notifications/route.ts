import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mapNotification } from "@/lib/inventory";
import { requireCustomer, route } from "@/lib/validators";

export const GET = route(async () => {
  const customer = await requireCustomer();
  const notifications = await db.notification.findMany({
    where: { role: "CUSTOMER", customerId: customer.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({
    notifications: notifications.map(mapNotification),
  });
});
