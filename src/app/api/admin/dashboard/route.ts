import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ORDER_INCLUDE, mapOrder } from "@/lib/inventory";
import type { DashboardDTO, OrderStatus } from "@/lib/types";
import { ORDER_STATUSES } from "@/lib/types";
import { requireAdmin, round2, route } from "@/lib/validators";

export const GET = route(async () => {
  await requireAdmin();

  const orders = await db.order.findMany({ select: { status: true, total: true } });
  const ordersByStatus = {
    PENDING_REVIEW: 0,
    CONFIRMED: 0,
    OUT_FOR_DELIVERY: 0,
    DELIVERED: 0,
    REJECTED: 0,
    CANCELLED: 0,
  } as Record<OrderStatus, number>;
  for (const o of orders) {
    if (ORDER_STATUSES.includes(o.status as OrderStatus)) {
      ordersByStatus[o.status as OrderStatus]++;
    }
  }

  const skus = await db.sku.findMany({
    select: { availableQty: true, lowStockThreshold: true },
  });
  const lowStockCount = skus.filter(
    (s) => s.availableQty > 0 && s.availableQty <= s.lowStockThreshold
  ).length;
  const outOfStockCount = skus.filter((s) => s.availableQty === 0).length;

  const delivered = orders.filter((o) => o.status === "DELIVERED");
  const [totalProducts, totalCustomers, totalSkus, recentOrders] =
    await Promise.all([
      db.product.count(),
      db.customer.count(),
      db.sku.count(),
      db.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        include: ORDER_INCLUDE,
      }),
    ]);

  const dashboard: DashboardDTO = {
    ordersByStatus,
    newOrdersCount: ordersByStatus.PENDING_REVIEW,
    lowStockCount,
    outOfStockCount,
    deliveredSalesTotal: round2(delivered.reduce((s, o) => s + o.total, 0)),
    deliveredOrdersCount: delivered.length,
    totalProducts,
    totalCustomers,
    totalSkus,
    recentOrders: recentOrders.map(mapOrder),
  };
  return NextResponse.json({ dashboard });
});
