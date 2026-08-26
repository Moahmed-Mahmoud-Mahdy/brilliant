import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { round2, route } from "@/lib/validators";

// Always answers 200 — validity is expressed in the body so the checkout
// form can show the Arabic error message from `error`.
export const POST = route(async (request: Request) => {
  const body = await request.json().catch(() => ({}));
  const code =
    typeof body?.code === "string" ? body.code.trim().toUpperCase() : "";
  const subtotal = Number(body?.subtotal) > 0 ? Number(body.subtotal) : 0;

  const invalid = (error: string) =>
    NextResponse.json({
      valid: false,
      discountAmount: 0,
      percentage: 0,
      code,
      error,
    });

  if (!code) return invalid("كود الخصم غير موجود");

  const dc = await db.discountCode.findUnique({ where: { code } });
  if (!dc) return invalid("كود الخصم غير موجود");
  if (dc.expiresAt && dc.expiresAt.getTime() <= Date.now()) {
    return invalid("انتهت صلاحية كود الخصم");
  }
  if (!dc.isActive) return invalid("كود الخصم غير مفعّل");

  const discountAmount = round2((subtotal * dc.percentage) / 100);
  return NextResponse.json({
    valid: true,
    discountAmount,
    percentage: dc.percentage,
    code: dc.code,
  });
});
