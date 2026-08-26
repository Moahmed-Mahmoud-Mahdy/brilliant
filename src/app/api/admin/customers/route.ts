import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, round2, route } from "@/lib/validators";

// ─── GET /api/admin/customers?search= — customers with order stats ───

export const GET = route(async (request: Request) => {
  await requireAdmin();
  const url = new URL(request.url);
  const search = (url.searchParams.get("search") || "").trim().toLowerCase();

  let customers = await db.customer.findMany({
    orderBy: { createdAt: "desc" },
    include: { orders: { select: { status: true, total: true } } },
  });

  if (search) {
    customers = customers.filter(
      (c) => c.name.toLowerCase().includes(search) || c.phone.includes(search)
    );
  }

  return NextResponse.json({
    customers: customers.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      createdAt: c.createdAt.toISOString(),
      ordersCount: c.orders.length,
      deliveredCount: c.orders.filter((o) => o.status === "DELIVERED").length,
      cancelledCount: c.orders.filter((o) => o.status === "CANCELLED").length,
      rejectedCount: c.orders.filter((o) => o.status === "REJECTED").length,
      totalSpent: round2(
        c.orders.filter((o) => o.status === "DELIVERED").reduce((s, o) => s + o.total, 0)
      ),
    })),
  });
});
