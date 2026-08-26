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

// ─── GET /api/admin/zones — all zones ───

export const GET = route(async () => {
  await requireAdmin();
  const zones = await db.deliveryZone.findMany({ orderBy: { sortOrder: "asc" } });
  return NextResponse.json({
    zones: zones.map((z) => ({
      id: z.id,
      name: z.name,
      shippingFee: z.shippingFee,
      isActive: z.isActive,
    })),
  });
});

// ─── POST /api/admin/zones ───

export const POST = route(async (request: Request) => {
  const admin = await requireAdmin();
  const body = await request.json().catch(() => ({}));

  const name = requireString(body?.name, "اسم المنطقة مطلوب");
  const shippingFee = requireNumber(body?.shippingFee, "سعر التوصيل غير صحيح");
  if (shippingFee < 0) throw new ApiError(400, "سعر التوصيل غير صحيح");
  const isActive = body?.isActive === undefined ? true : Boolean(body.isActive);

  const last = await db.deliveryZone.findFirst({
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const zone = await db.deliveryZone.create({
    data: {
      name,
      shippingFee,
      isActive,
      sortOrder: (last?.sortOrder ?? 0) + 1,
    },
  });
  await logActivity(admin, "ZONE_CREATE", "ZONE", zone.id, `إنشاء منطقة «${name}» بسعر توصيل ${shippingFee} ج.م`);

  return NextResponse.json({
    zone: { id: zone.id, name: zone.name, shippingFee: zone.shippingFee },
  });
});
