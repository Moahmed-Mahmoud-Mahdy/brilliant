import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/notify";
import {
  ApiError,
  optionalDateOrNull,
  requireAdmin,
  requireNumber,
  route,
} from "@/lib/validators";

function toDto(c: {
  id: string;
  code: string;
  percentage: number;
  expiresAt: Date | null;
  isActive: boolean;
}) {
  return {
    id: c.id,
    code: c.code,
    percentage: c.percentage,
    expiresAt: c.expiresAt ? c.expiresAt.toISOString() : null,
    isActive: c.isActive,
  };
}

// ─── PUT /api/admin/discount-codes/[id] ───

export const PUT = route(
  async (request: Request, ctx: { params: Promise<{ id: string }> }) => {
    const admin = await requireAdmin();
    const { id } = await ctx.params;
    const body = await request.json().catch(() => ({}));

    const code = await db.discountCode.findUnique({ where: { id } });
    if (!code) throw new ApiError(404, "كود الخصم غير موجود");

    const data: {
      code?: string;
      percentage?: number;
      expiresAt?: Date | null;
      isActive?: boolean;
    } = {};

    if (body?.code !== undefined) {
      const normalized = String(body.code).trim().toUpperCase();
      if (!normalized) throw new ApiError(400, "كود الخصم مطلوب");
      if (normalized !== code.code) {
        const existing = await db.discountCode.findUnique({
          where: { code: normalized },
        });
        if (existing) throw new ApiError(409, "الكود مسجل بالفعل");
      }
      data.code = normalized;
    }
    if (body?.percentage !== undefined) {
      const percentage = requireNumber(body.percentage, "نسبة الخصم غير صحيحة");
      if (percentage < 1 || percentage > 100) {
        throw new ApiError(400, "نسبة الخصم يجب أن تكون بين 1 و 100");
      }
      data.percentage = percentage;
    }
    if (body?.expiresAt !== undefined) {
      data.expiresAt =
        body.expiresAt === null || body.expiresAt === ""
          ? null
          : optionalDateOrNull(body.expiresAt);
    }
    if (body?.isActive !== undefined) data.isActive = Boolean(body.isActive);

    const updated = await db.discountCode.update({ where: { id }, data });
    await logActivity(
      admin,
      "DISCOUNT_UPDATE",
      "DISCOUNT_CODE",
      id,
      `تعديل كود خصم ${updated.code}`
    );
    return NextResponse.json({ code: toDto(updated) });
  }
);

// ─── DELETE /api/admin/discount-codes/[id] ───

export const DELETE = route(
  async (_request: Request, ctx: { params: Promise<{ id: string }> }) => {
    const admin = await requireAdmin();
    const { id } = await ctx.params;
    const code = await db.discountCode.findUnique({ where: { id } });
    if (!code) throw new ApiError(404, "كود الخصم غير موجود");

    await db.discountCode.delete({ where: { id } });
    await logActivity(
      admin,
      "DISCOUNT_DELETE",
      "DISCOUNT_CODE",
      id,
      `حذف كود خصم ${code.code}`
    );
    return NextResponse.json({});
  }
);
