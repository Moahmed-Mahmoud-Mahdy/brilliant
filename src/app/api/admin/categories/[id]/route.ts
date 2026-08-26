import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/notify";
import {
  ApiError,
  optionalString,
  requireAdmin,
  requireString,
  route,
} from "@/lib/validators";

// ─── PUT /api/admin/categories/[id] ───

export const PUT = route(
  async (request: Request, ctx: { params: Promise<{ id: string }> }) => {
    const admin = await requireAdmin();
    const { id } = await ctx.params;
    const body = await request.json().catch(() => ({}));

    const category = await db.category.findUnique({ where: { id } });
    if (!category) throw new ApiError(404, "القسم غير موجود");

    const data: {
      name?: string;
      description?: string | null;
      image?: string | null;
      isActive?: boolean;
      sortOrder?: number;
    } = {};
    if (body?.name !== undefined) data.name = requireString(body.name, "اسم القسم مطلوب");
    if (body?.description !== undefined) {
      data.description = optionalString(body.description) || null;
    }
    if (body?.image !== undefined) data.image = optionalString(body.image) || null;
    if (body?.isActive !== undefined) data.isActive = Boolean(body.isActive);
    if (body?.sortOrder !== undefined && Number.isFinite(Number(body.sortOrder))) {
      data.sortOrder = Math.floor(Number(body.sortOrder));
    }

    await db.category.update({ where: { id }, data });
    await logActivity(admin, "CATEGORY_UPDATE", "CATEGORY", id, `تعديل قسم «${category.name}»`);

    const updated = await db.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });
    return NextResponse.json({
      category: {
        id: updated!.id,
        name: updated!.name,
        description: updated!.description,
        image: updated!.image,
        productCount: updated!._count.products,
      },
    });
  }
);

// ─── DELETE /api/admin/categories/[id] — only when empty ───

export const DELETE = route(
  async (_request: Request, ctx: { params: Promise<{ id: string }> }) => {
    const admin = await requireAdmin();
    const { id } = await ctx.params;
    const category = await db.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });
    if (!category) throw new ApiError(404, "القسم غير موجود");

    if (category._count.products > 0) {
      throw new ApiError(409, "لا يمكن حذف قسم يحتوي على منتجات — يمكنك تعطيله");
    }

    await db.category.delete({ where: { id } });
    await logActivity(admin, "CATEGORY_ARCHIVE", "CATEGORY", id, `حذف قسم «${category.name}»`);
    return NextResponse.json({});
  }
);
