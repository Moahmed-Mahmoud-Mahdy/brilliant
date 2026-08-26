import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/notify";
import {
  ApiError,
  optionalDateOrNull,
  requireAdmin,
  requireNumber,
  requireString,
  route,
} from "@/lib/validators";

// ─── GET /api/admin/discount-codes ───

export const GET = route(async () => {
  await requireAdmin();
  const codes = await db.discountCode.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({
    codes: codes.map((c) => ({
      id: c.id,
      code: c.code,
      percentage: c.percentage,
      expiresAt: c.expiresAt ? c.expiresAt.toISOString() : null,
      isActive: c.isActive,
    })),
  });
});

// ─── POST /api/admin/discount-codes ───

export const POST = route(async (request: Request) => {
  const admin = await requireAdmin();
  const body = await request.json().catch(() => ({}));

  const code = requireString(body?.code, "كود الخصم مطلوب").toUpperCase();
  const percentage = requireNumber(body?.percentage, "نسبة الخصم غير صحيحة");
  if (percentage < 1 || percentage > 100) {
    throw new ApiError(400, "نسبة الخصم يجب أن تكون بين 1 و 100");
  }
  const expiresAt =
    body?.expiresAt === undefined || body?.expiresAt === null
      ? null
      : optionalDateOrNull(body.expiresAt);
  const isActive = body?.isActive === undefined ? true : Boolean(body.isActive);

  const existing = await db.discountCode.findUnique({ where: { code } });
  if (existing) throw new ApiError(409, "الكود مسجل بالفعل");

  const created = await db.discountCode.create({
    data: { code, percentage, expiresAt, isActive },
  });
  await logActivity(
    admin,
    "DISCOUNT_CREATE",
    "DISCOUNT_CODE",
    created.id,
    `إنشاء كود خصم ${code} بنسبة ${percentage}%`
  );

  return NextResponse.json({
    code: {
      id: created.id,
      code: created.code,
      percentage: created.percentage,
      expiresAt: created.expiresAt ? created.expiresAt.toISOString() : null,
      isActive: created.isActive,
    },
  });
});
