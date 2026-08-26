import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ORDER_INCLUDE, productImages } from "@/lib/inventory";
import type { CartItem } from "@/lib/types";
import { ApiError, requireCustomer, round2, route } from "@/lib/validators";

// ─── POST /api/orders/[id]/reorder — re-add an old order's items to the cart ───

export const POST = route(
  async (_request: Request, ctx: { params: Promise<{ id: string }> }) => {
    const customer = await requireCustomer();
    const { id } = await ctx.params;
    const order = await db.order.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!order) throw new ApiError(404, "الطلب غير موجود");
    if (order.customerId !== customer.id) throw new ApiError(403, "غير مصرح");

    const skuIds = order.items.map((i) => i.skuId);
    const skus = skuIds.length
      ? await db.sku.findMany({
          where: { id: { in: skuIds } },
          include: { product: true },
        })
      : [];
    const skuMap = new Map(skus.map((s) => [s.id, s]));

    const added: { skuId: string; quantity: number }[] = [];
    const unavailable: { productName: string; colorName: string | null }[] = [];
    const cartItems: CartItem[] = [];

    for (const item of order.items) {
      const sku = skuMap.get(item.skuId);
      if (sku && sku.product.status === "ACTIVE" && sku.availableQty > 0) {
        const qty = Math.min(item.quantity, sku.availableQty);
        added.push({ skuId: sku.id, quantity: qty });
        cartItems.push({
          skuId: sku.id,
          productId: sku.productId,
          name: sku.product.name,
          image: productImages(sku.product)[0] ?? null,
          colorName: sku.colorName,
          colorHex: sku.colorHex,
          unitPrice: round2(sku.product.salePrice ?? sku.product.price),
          basePrice: sku.product.price,
          quantity: qty,
          maxQuantity: sku.availableQty,
        });
      } else {
        unavailable.push({
          productName: item.productName,
          colorName: item.colorName,
        });
      }
    }

    return NextResponse.json({ added, unavailable, cartItems });
  }
);
