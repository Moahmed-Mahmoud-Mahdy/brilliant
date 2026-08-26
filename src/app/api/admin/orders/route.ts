import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ORDER_INCLUDE, mapOrder } from "@/lib/inventory";
import { ORDER_STATUSES } from "@/lib/types";
import type { OrderStatus } from "@/lib/types";
import { requireAdmin, route } from "@/lib/validators";

export const GET = route(async (request: Request) => {
  await requireAdmin();
  const url = new URL(request.url);
  const status = url.searchParams.get("status") || "";
  const search = (url.searchParams.get("search") || "").trim().toLowerCase();

  let orders = await db.order.findMany({
    orderBy: { createdAt: "desc" },
    include: ORDER_INCLUDE,
  });

  if (status && ORDER_STATUSES.includes(status as OrderStatus)) {
    orders = orders.filter((o) => o.status === status);
  }
  if (search) {
    orders = orders.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(search) ||
        o.customer.name.toLowerCase().includes(search) ||
        o.phonePrimary.includes(search) ||
        o.phoneSecondary.includes(search)
    );
  }

  return NextResponse.json({ orders: orders.map(mapOrder) });
});
