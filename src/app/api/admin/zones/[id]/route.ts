import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/notify";
import {
  ApiError,
  requireAdmin,
  requireNumber,
  requireString,
  route,
} from "@/lib/validators";

// ─── PUT /api/admin/zones/[id] ───

export const PUT = route(
  async (request: Request, ctx: { params: Promise<{ id: string }> }) => {
    const admin = await requireAdmin();
    const { id } = await ctx.params;
    const body = await request.json().catch(() => ({}));

    const zone = await db.deliveryZone.findUnique({ where: { id } });
    if (!zone) throw new ApiError(404, "المنطقة غير موجودة");

    const data: { name?: string; shippingFee?: number; isActive?: boolean; sortOrder?: number } = {};
    if (body?.name !== undefined) data.name = requireString(body.name, "اسم المنطقة مطلوب");
    if (body?.shippingFee !== undefined) {
      const fee = requireNumber(body.shippingFee, "سعر التوصيل غير صحيح");
      if (fee < 0) throw new ApiError(400, "سعر التوصيل غير صحيح");
      data.shippingFee = fee;
    }
    if (body?.isActive !== undefined) data.isActive = Boolean(body.isActive);
    if (body?.sortOrder !== undefined && Number.isFinite(Number(body.sortOrder))) {
      data.sortOrder = Math.floor(Number(body.sortOrder));
    }

    const updated = await db.deliveryZone.update({ where: { id }, data });
    await logActivity(admin, "ZONE_UPDATE", "ZONE", id, `تعديل منطقة «${zone.name}»`);
    return NextResponse.json({
      zone: { id: updated.id, name: updated.name, shippingFee: updated.shippingFee },
    });
  }
);

// ─── DELETE /api/admin/zones/[id] — only when no orders reference it ───

export const DELETE = route(
  async (_request: Request, ctx: { params: Promise<{ id: string }> }) => {
    const admin = await requireAdmin();
    const { id } = await ctx.params;
    const zone = await db.deliveryZone.findUnique({
      where: { id },
      include: { _count: { select: { orders: true } } },
    });
    if (!zone) throw new ApiError(404, "المنطقة غير موجودة");

    if (zone._count.orders > 0) {
      throw new ApiError(409, "لا يمكن حذف منطقة مرتبطة بطلبات سابقة");
    }

    await db.deliveryZone.delete({ where: { id } });
    await logActivity(admin, "ZONE_UPDATE", "ZONE", id, `حذف منطقة «${zone.name}»`);
    return NextResponse.json({});
  }
);
