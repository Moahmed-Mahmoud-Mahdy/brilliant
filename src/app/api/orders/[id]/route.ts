import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ORDER_INCLUDE, mapOrder } from "@/lib/inventory";
import { ApiError, requireCustomer, route } from "@/lib/validators";

export const GET = route(
  async (_request: Request, ctx: { params: Promise<{ id: string }> }) => {
    const customer = await requireCustomer();
    const { id } = await ctx.params;
    const order = await db.order.findUnique({
      where: { id },
      include: ORDER_INCLUDE,
    });
    if (!order) throw new ApiError(404, "الطلب غير موجود");
    if (order.customerId !== customer.id) throw new ApiError(403, "غير مصرح");
    return NextResponse.json({ order: mapOrder(order) });
  }
);
