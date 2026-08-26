import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { PRODUCT_INCLUDE, mapProductDetail } from "@/lib/inventory";
import { ApiError, route } from "@/lib/validators";

export const GET = route(
  async (_request: Request, ctx: { params: Promise<{ id: string }> }) => {
    const { id } = await ctx.params;
    const product = await db.product.findUnique({
      where: { id },
      include: PRODUCT_INCLUDE,
    });
    if (!product || product.status === "ARCHIVED") {
      throw new ApiError(404, "المنتج غير موجود");
    }
    return NextResponse.json({ product: mapProductDetail(product) });
  }
);
