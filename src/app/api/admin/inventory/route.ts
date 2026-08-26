import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mapSkuRow } from "@/lib/inventory";
import { requireAdmin, route } from "@/lib/validators";

// ─── GET /api/admin/inventory?lowStock=true — SKU stock rows ───

export const GET = route(async (request: Request) => {
  await requireAdmin();
  const url = new URL(request.url);
  const lowStock = url.searchParams.get("lowStock") === "true";

  const skus = await db.sku.findMany({
    where: { product: { status: "ACTIVE" } },
    include: { product: true },
    orderBy: [{ product: { name: "asc" } }, { skuCode: "asc" }],
  });

  let rows = skus.map(mapSkuRow);
  if (lowStock) {
    rows = rows.filter((r) => r.isLow || r.isOut);
  }
  return NextResponse.json({ skus: rows });
});
