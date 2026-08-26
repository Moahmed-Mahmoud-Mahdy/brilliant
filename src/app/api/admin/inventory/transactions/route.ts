import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mapInventoryTx } from "@/lib/inventory";
import { requireAdmin, route } from "@/lib/validators";

// ─── GET /api/admin/inventory/transactions?skuId= — last 200 movements ───

export const GET = route(async (request: Request) => {
  await requireAdmin();
  const url = new URL(request.url);
  const skuId = (url.searchParams.get("skuId") || "").trim();

  const transactions = await db.inventoryTransaction.findMany({
    where: skuId ? { skuId } : undefined,
    include: { sku: { include: { product: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json({
    transactions: transactions.map(mapInventoryTx),
  });
});
