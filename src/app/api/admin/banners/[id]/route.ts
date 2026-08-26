import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/notify";
import {
  ApiError,
  optionalString,
  requireAdmin,
  route,
} from "@/lib/validators";

// ─── PUT /api/admin/banners/[id] ───

export const PUT = route(
  async (request: Request, ctx: { params: Promise<{ id: string }> }) => {
    const admin = await requireAdmin();
    const { id } = await ctx.params;
    const body = await request.json().catch(() => ({}));

    const banner = await db.banner.findUnique({ where: { id } });
    if (!banner) throw new ApiError(404, "البانر غير موجود");

    const data: {
      title?: string;
      subtitle?: string | null;
      image?: string;
      isActive?: boolean;
      sortOrder?: number;
    } = {};
    if (body?.title !== undefined) {
      const title = optionalString(body.title);
      if (!title) throw new ApiError(400, "عنوان البانر مطلوب");
      data.title = title;
    }
    if (body?.subtitle !== undefined) {
      data.subtitle = optionalString(body.subtitle) || null;
    }
    if (body?.image !== undefined) {
      const image = optionalString(body.image);
      if (!image) throw new ApiError(400, "صورة البانر مطلوبة");
      data.image = image;
    }
    if (body?.isActive !== undefined) data.isActive = Boolean(body.isActive);
    if (body?.sortOrder !== undefined && Number.isFinite(Number(body.sortOrder))) {
      data.sortOrder = Math.floor(Number(body.sortOrder));
    }

    const updated = await db.banner.update({ where: { id }, data });
    await logActivity(admin, "BANNER_UPDATE", "BANNER", id, `تعديل بانر «${banner.title}»`);
    return NextResponse.json({
      banner: {
        id: updated.id,
        title: updated.title,
        subtitle: updated.subtitle,
        image: updated.image,
      },
    });
  }
);

// ─── DELETE /api/admin/banners/[id] ───

export const DELETE = route(
  async (_request: Request, ctx: { params: Promise<{ id: string }> }) => {
    const admin = await requireAdmin();
    const { id } = await ctx.params;
    const banner = await db.banner.findUnique({ where: { id } });
    if (!banner) throw new ApiError(404, "البانر غير موجود");

    await db.banner.delete({ where: { id } });
    await logActivity(admin, "BANNER_DELETE", "BANNER", id, `حذف بانر «${banner.title}»`);
    return NextResponse.json({});
  }
);
