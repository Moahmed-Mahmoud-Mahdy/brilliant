import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCustomer, route } from "@/lib/validators";

export const POST = route(async () => {
  const customer = await requireCustomer();
  await db.notification.updateMany({
    where: { role: "CUSTOMER", customerId: customer.id, isRead: false },
    data: { isRead: true },
  });
  return NextResponse.json({});
});
