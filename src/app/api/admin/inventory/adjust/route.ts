import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mapSkuRow } from "@/lib/inventory";
import { logActivity, notifyAllAdmins } from "@/lib/notify";
import {
  ApiError,
  requireAdmin,
  requireInt,
  requireString,
  route,
} from "@/lib/validators";

// ─── POST /api/admin/inventory/adjust — RECEIVE / ADJUSTMENT with full logging ───

export const POST = route(async (request: Request) => {
  const admin = await requireAdmin();
  const body = await request.json().catch(() => ({}));

  const skuId = requireString(body?.skuId, "المنتج مطلوب");
  const type = body?.type;
  if (type !== "RECEIVE" && type !== "ADJUSTMENT") {
    throw new ApiError(400, "نوع العملية غير صحيح");
  }
  const reason = requireString(body?.reason, "سبب التعديل إجباري");
  const quantity = requireInt(body?.quantity, "الكمية غير صحيحة");

  const sku = await db.sku.findUnique({
    where: { id: skuId },
    include: { product: true },
  });
  if (!sku) throw new ApiError(404, "المنتج غير موجود");

  const before = sku.availableQty;
  let after: number;
  if (type === "RECEIVE") {
    if (quantity <= 0) {
      throw new ApiError(400, "كمية الاستلام يجب أن تكون أكبر من صفر");
    }
    after = before + quantity;
  } else {
    after = before + quantity;
    if (after < 0) {
      throw new ApiError(400, "لا يمكن أن تقل الكمية المتاحة عن الصفر");
    }
  }

  await db.sku.update({ where: { id: sku.id }, data: { availableQty: after } });
  await db.inventoryTransaction.create({
    data: {
      skuId: sku.id,
      type,
      quantity,
      balanceBefore: before,
      balanceAfter: after,
      reason,
      adminId: admin.id,
      adminName: admin.name,
    },
  });

  const productLabel = `${sku.product.name}${sku.colorName ? ` — ${sku.colorName}` : ""}`;
  await logActivity(
    admin,
    type === "RECEIVE" ? "STOCK_RECEIVE" : "STOCK_ADJUST",
    "SKU",
    sku.id,
    type === "RECEIVE"
      ? `استلام ${quantity} قطعة — ${productLabel}`
      : `تعديل مخزون ${productLabel} بمقدار ${quantity > 0 ? "+" : ""}${quantity}`
  );

  // low-stock / out-of-stock admin alerts
  if (before > sku.lowStockThreshold && after <= sku.lowStockThreshold && after > 0) {
    await notifyAllAdmins(
      "LOW_STOCK",
      "تنبيه مخزون منخفض",
      `${productLabel}: متبقي ${after} قطعة فقط (الحد الأدنى ${sku.lowStockThreshold})`
    );
  }
  if (before > 0 && after === 0) {
    await notifyAllAdmins(
      "OUT_OF_STOCK",
      "نفاد المخزون",
      `${productLabel}: نفد من المخزون بالكامل`
    );
  }

  const fresh = await db.sku.findUnique({
    where: { id: sku.id },
    include: { product: true },
  });
  return NextResponse.json({ sku: mapSkuRow(fresh!) });
});
