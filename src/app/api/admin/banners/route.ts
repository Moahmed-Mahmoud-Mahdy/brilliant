import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/notify";
import {
  optionalString,
  requireAdmin,
  requireString,
  route,
} from "@/lib/validators";

// ─── GET /api/admin/banners — all banners ───

export const GET = route(async () => {
  await requireAdmin();
  const banners = await db.banner.findMany({ orderBy: { sortOrder: "asc" } });
  return NextResponse.json({
    banners: banners.map((b) => ({
      id: b.id,
      title: b.title,
      subtitle: b.subtitle,
      image: b.image,
      isActive: b.isActive,
      sortOrder: b.sortOrder,
    })),
  });
});

// ─── POST /api/admin/banners ───

export const POST = route(async (request: Request) => {
  const admin = await requireAdmin();
  const body = await request.json().catch(() => ({}));

  const title = requireString(body?.title, "عنوان البانر مطلوب");
  const image = requireString(body?.image, "صورة البانر مطلوبة");
  const subtitle = optionalString(body?.subtitle) || null;
  const isActive = body?.isActive === undefined ? true : Boolean(body.isActive);
  const sortOrder =
    body?.sortOrder !== undefined && Number.isFinite(Number(body.sortOrder))
      ? Math.floor(Number(body.sortOrder))
      : 0;

  const banner = await db.banner.create({
    data: { title, subtitle, image, isActive, sortOrder },
  });
  await logActivity(admin, "BANNER_CREATE", "BANNER", banner.id, `إنشاء بانر «${title}»`);

  return NextResponse.json({
    banner: {
      id: banner.id,
      title: banner.title,
      subtitle: banner.subtitle,
      image: banner.image,
    },
  });
});
